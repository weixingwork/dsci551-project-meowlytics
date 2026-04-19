import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { IngredientKnowledge } from "@/lib/knowledge/types";
import {
  searchIngredientFromDB,
  saveAIGeneratedIngredient,
  updateAIGeneratedIngredient,
} from "@/lib/knowledge/db-search";
import { isValidNewIngredientKnowledge } from "@/lib/knowledge/validation";
import { env } from "@/lib/env";

const AI_MODEL = "gemini-2.0-flash";

function getGenAIClient(): GoogleGenerativeAI {
  return new GoogleGenerativeAI(env.GOOGLE_API_KEY);
}

/**
 * 调用 Gemini AI 生成配料信息
 */
async function generateIngredientWithAI(
  ingredientName: string
): Promise<Omit<IngredientKnowledge, "id" | "source" | "lastUpdated">> {
  const model = getGenAIClient().getGenerativeModel({
    model: AI_MODEL,
  });

  const prompt = `Please analyze this cat food ingredient: "${ingredientName}"

CRITICAL FORMAT REQUIREMENTS:
- Return only a pure JSON object, nothing else
- Do not use markdown code blocks (no \`\`\`json)
- Do not add comments (no // or /* */)
- Do not add any explanatory text
- The JSON must be standard valid JSON

Example response format (follow strictly):
{"name":"Chicken","nameEn":"Chicken","aliases":["Chicken breast","Chicken meal"],"category":"protein","healthImpact":"good","description":"High-quality animal protein","benefits":["Provides protein","Easy to digest"],"concerns":["Possible allergen"],"suitableFor":["Adult cats","Kittens"],"notSuitableFor":["Cats allergic to chicken"]}

Field requirements:
- name: The standard English name of the ingredient
- nameEn: The English name of the ingredient (same as name)
- aliases: An array of 3-5 common aliases
- category: One of protein, carbohydrate, fat, additive, vitamin, mineral, fiber, other
- healthImpact: One of good, neutral, bad
- description: Short description in English, 50-100 words
- benefits: An array of 3-5 benefits
- concerns: An array of 2-4 concerns
- suitableFor: An array of cat types this suits
- notSuitableFor: An array of cat types this does not suit (use ["None"] if none)

Based on feline nutrition knowledge, return pure JSON that strictly matches this format. All text must be in English.`;

  const result = await model.generateContent(prompt);
  let responseText = result.response.text();

  // Clean up response text
  // Remove markdown code blocks
  responseText = responseText.replace(/```json\s*/g, "").replace(/```\s*/g, "");
  // Remove any text before first { and after last }
  const firstBrace = responseText.indexOf("{");
  const lastBrace = responseText.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    responseText = responseText.substring(firstBrace, lastBrace + 1);
  }

  // Parse the JSON response
  const ingredientData = JSON.parse(responseText);

  return ingredientData;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { ingredientName?: unknown };
    const ingredientName =
      typeof body.ingredientName === "string" ? body.ingredientName.trim() : "";

    if (!ingredientName) {
      return NextResponse.json({ error: "Ingredient name cannot be empty" }, { status: 400 });
    }

    // 1. 从数据库搜索配料
    const searchResult = await searchIngredientFromDB(ingredientName);

    // 2. 如果找到了知识库数据，直接返回
    if (searchResult && searchResult.ingredient.source === "knowledge_base") {
      return NextResponse.json(searchResult.ingredient);
    }

    // 3. 如果找到了 AI 生成数据且未过期，直接返回
    if (searchResult && !searchResult.needsRefresh) {
      return NextResponse.json(searchResult.ingredient);
    }

    // 4. 如果找到了 AI 生成数据但已过期，重新调用 AI 生成并更新
    if (searchResult && searchResult.needsRefresh) {
      try {
        const aiData = await generateIngredientWithAI(ingredientName);
        if (!isValidNewIngredientKnowledge(aiData)) {
          throw new Error("Invalid AI ingredient response shape");
        }
        const updatedIngredient = await updateAIGeneratedIngredient(
          searchResult.ingredient.id,
          aiData
        );
        return NextResponse.json(updatedIngredient);
      } catch (error) {
        console.error("Error refreshing AI data:", error);
        // 如果更新失败，返回旧数据
        return NextResponse.json(searchResult.ingredient);
      }
    }

    // 5. 未找到，调用 AI 生成并保存到数据库
    try {
      const aiData = await generateIngredientWithAI(ingredientName);
      if (!isValidNewIngredientKnowledge(aiData)) {
        throw new Error("Invalid AI ingredient response shape");
      }
      const newIngredient = await saveAIGeneratedIngredient(aiData);
      return NextResponse.json(newIngredient);
    } catch (error) {
      console.error("Error generating AI data:", error);
      return NextResponse.json(
        { error: "AI service is temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Error querying ingredient:", error);
    return NextResponse.json(
      { error: "Failed to look up ingredient info. Please try again later." },
      { status: 500 }
    );
  }
}
