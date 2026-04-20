import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { sanitizeAnalysisResult } from "@/lib/validation/analysis";
import { env } from "@/lib/env";
import { requireUser } from "@/lib/auth/require-user";
import { checkRateLimit, recordFailedAttempt } from "@/lib/auth/rate-limit";
import { getRateLimitConfig } from "@/lib/auth/rate-limit-config";
import {
  consumeAnalyzeQuota,
  getAnalyzeQuotaRetryAfterSeconds,
} from "@/lib/auth/analyze-quota";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const IP_RATE_LIMIT_WINDOW_MS = 60_000;

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: NextRequest) {
  const rateLimits = await getRateLimitConfig();
  const ip = getClientIp(request);
  const ipKey = `analyze:ip:${ip}`;
  const status = checkRateLimit(ipKey, rateLimits.analyzeIpPerMinute, IP_RATE_LIMIT_WINDOW_MS);
  if (status.limited) {
    return NextResponse.json(
      { error: `Too many requests. Please try again in ${status.retryAfterSeconds} seconds.` },
      {
        status: 429,
        headers: { "Retry-After": String(status.retryAfterSeconds) },
      }
    );
  }
  recordFailedAttempt(ipKey, IP_RATE_LIMIT_WINDOW_MS);

  const { user, errorResponse } = await requireUser();
  if (errorResponse) {
    return errorResponse;
  }
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const imageFiles = formData.getAll("image") as File[];

    if (!imageFiles || imageFiles.length === 0) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }
    if (imageFiles.length > 3) {
      return NextResponse.json({ error: "You can upload at most 3 images" }, { status: 400 });
    }
    for (const image of imageFiles) {
      if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
        return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
      }
      if (image.size > MAX_IMAGE_SIZE_BYTES) {
        return NextResponse.json({ error: "Image too large (max 5MB)" }, { status: 400 });
      }
    }

    const quota = await consumeAnalyzeQuota(user.id, rateLimits.analyzeUserPerDay);
    if (!quota.allowed) {
      const retryAfterSeconds = getAnalyzeQuotaRetryAfterSeconds();
      return NextResponse.json(
        {
          error: `Daily analysis limit reached (max ${rateLimits.analyzeUserPerDay} per day).`,
          limit: rateLimits.analyzeUserPerDay,
          used: quota.used,
          remaining: quota.remaining,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds) },
        }
      );
    }

    // 将所有图片转换为 base64
    const imageParts = await Promise.all(
      imageFiles.map(async (image) => {
        const bytes = await image.arrayBuffer();
        const base64 = Buffer.from(bytes).toString("base64");
        return {
          inlineData: {
            mimeType: image.type,
            data: base64,
          },
        };
      })
    );

    if (!env.GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: "AI analysis is not available (GOOGLE_API_KEY not configured)." },
        { status: 503 }
      );
    }

    // 调用 Gemini
    const model = new GoogleGenerativeAI(env.GOOGLE_API_KEY).getGenerativeModel({ model: "gemini-2.5-flash" });

    const multiImageNote =
      imageFiles.length > 1
        ? "The following are multiple images of the same cat food ingredient label (the user may have split the photo because the label was long). Please combine ingredients from all images into a single analysis.\n\n"
        : "";

    const result = await model.generateContent([
      ...imageParts,
      `${multiImageNote}You are a professional cat food ingredient analyst. Please analyze ${imageFiles.length > 1 ? "these" : "this"} cat food ingredient label image${imageFiles.length > 1 ? "s" : ""} and return the result as pure JSON.

IMPORTANT TRANSLATION REQUIREMENTS:
- Regardless of what language the label uses (Chinese, German, Japanese, French, etc.), all ingredient names must be written in English
- For example: 鸡肉/Huhn → Chicken, 大米/Reis → Rice, 牛肉/Rind → Beef
- Make sure the ingredients array and the ingredient field in analysis are in English

IMPORTANT FORMAT REQUIREMENTS:
- Return JSON data directly, do not use markdown code blocks
- Do not add any other explanatory text, comments, or extra content
- Make sure the return value is valid pure JSON

JSON format:
{
  "ingredients": ["ingredient1", "ingredient2", ...],
  "analysis": [
    {
      "ingredient": "Ingredient name (English)",
      "category": "protein|carbohydrate|fat|additive|vitamin|other",
      "healthImpact": "good|neutral|bad",
      "description": "Briefly explain this ingredient's role and impact, in English"
    }
  ],
  "overallScore": 7.5,
  "recommendation": "Quality judgment and purchase decision, in English, as bullet points",
  "summary": "Overall summary of this cat food's characteristics, in English"
}

Analysis points:
- ingredients: List every identifiable ingredient from the image(s), all translated to English
- analysis: Provide detailed analysis of each major ingredient
  - ingredient: ingredient name, must be in English
  - category options: protein, carbohydrate, fat, additive, vitamin, other
  - healthImpact options: good, neutral, bad
  - description: Explain the nutritional value or potential concerns in English
- overallScore: Overall score from 1 to 10, can be a decimal
- recommendation: Must give a "quality judgment + purchase decision" using the following structure, referencing the identified ingredients:
  1) Conclusion: Recommended / Buy with caution / Not recommended (pick exactly one)
  2) Suitable for: e.g. kittens, adult cats, cats with sensitive stomachs, weight-control cats (list at least 1-2 groups)
  3) Risks: e.g. possible allergens, gastrointestinal irritation, high carbohydrate content (at least 1 point)
  4) How to buy: Actionable advice, for example
     - Start with a small bag and trial feed for 5-7 days
     - Transition old-to-new food 7:3 -> 5:5 -> 3:7 gradually
     - Cats allergic to chicken/grains should avoid this product
     - Stop feeding and consult a vet if loose stools or vomiting persist for 48 hours
  The output should read like a "decision tool", not a generic good/bad review
- summary: One-sentence summary of the overall quality of this cat food, in English

Please make sure the return value is valid JSON and all ingredient names and text are in English.`,
    ]);

    const response = await result.response;
    const text = response.text();

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          console.error("Failed to parse extracted JSON:", text);
        }
      }
    }

    const sanitized = sanitizeAnalysisResult(parsed);
    if (!sanitized) {
      console.error("Invalid AI response shape. rawText:", text);
      return NextResponse.json(
        { error: "Invalid AI response shape", rawText: text },
        { status: 500 }
      );
    }
    return NextResponse.json({
      analysis: sanitized,
      quota: {
        limit: rateLimits.analyzeUserPerDay,
        used: quota.used,
        remaining: quota.remaining,
      },
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500 }
    );
  }
}
