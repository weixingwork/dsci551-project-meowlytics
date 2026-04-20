import { AnalysisResult } from "@/app/(main)/types";

const ALLOWED_CATEGORIES = new Set([
  "protein",
  "carbohydrate",
  "fat",
  "additive",
  "vitamin",
  "mineral",
  "fiber",
  "other",
]);

const ALLOWED_HEALTH_IMPACTS = new Set(["good", "neutral", "bad"]);

function coerceCategory(raw: unknown): string {
  if (typeof raw !== "string") return "other";
  const lower = raw.toLowerCase().trim();
  if (ALLOWED_CATEGORIES.has(lower)) return lower;
  if (lower.includes("protein") || lower.includes("meat")) return "protein";
  if (lower.includes("carb") || lower.includes("grain") || lower.includes("starch")) return "carbohydrate";
  if (lower.includes("fat") || lower.includes("oil") || lower.includes("lipid")) return "fat";
  if (lower.includes("vitamin")) return "vitamin";
  if (lower.includes("mineral") || lower.includes("ash")) return "mineral";
  if (lower.includes("fiber") || lower.includes("fibre")) return "fiber";
  if (lower.includes("preservative") || lower.includes("additive") || lower.includes("flavor")) return "additive";
  return "other";
}

function coerceHealthImpact(raw: unknown): string {
  if (typeof raw !== "string") return "neutral";
  const lower = raw.toLowerCase().trim();
  if (ALLOWED_HEALTH_IMPACTS.has(lower)) return lower;
  if (lower.includes("good") || lower.includes("positive") || lower.includes("benefit")) return "good";
  if (lower.includes("bad") || lower.includes("negative") || lower.includes("harm") || lower.includes("concern")) return "bad";
  return "neutral";
}

export function sanitizeAnalysisResult(data: unknown): AnalysisResult | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;

  const ingredientsRaw = Array.isArray(obj.ingredients) ? obj.ingredients : [];
  const analysisRaw = Array.isArray(obj.analysis) ? obj.analysis : [];

  const ingredients = ingredientsRaw
    .map((item) => (typeof item === "string" ? item : String(item ?? "")))
    .filter(Boolean);

  const analysis = analysisRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const a = item as Record<string, unknown>;
      const ingredient = typeof a.ingredient === "string" ? a.ingredient : String(a.ingredient ?? "");
      if (!ingredient) return null;
      return {
        ingredient,
        category: coerceCategory(a.category),
        healthImpact: coerceHealthImpact(a.healthImpact),
        description: typeof a.description === "string" ? a.description : String(a.description ?? ""),
      };
    })
    .filter((x): x is AnalysisResult["analysis"][number] => x !== null);

  if (ingredients.length === 0 || analysis.length === 0) return null;

  const rawScore = obj.overallScore;
  let overallScore: number;
  if (typeof rawScore === "number" && Number.isFinite(rawScore)) {
    overallScore = rawScore;
  } else if (typeof rawScore === "string") {
    const parsed = parseFloat(rawScore);
    overallScore = Number.isFinite(parsed) ? parsed : 5;
  } else {
    overallScore = 5;
  }
  overallScore = Math.max(0, Math.min(10, overallScore));

  const recommendation = typeof obj.recommendation === "string"
    ? obj.recommendation
    : Array.isArray(obj.recommendation)
      ? (obj.recommendation as unknown[]).map(String).join("\n")
      : String(obj.recommendation ?? "");

  const summary = typeof obj.summary === "string" ? obj.summary : String(obj.summary ?? "");

  if (!recommendation || !summary) return null;

  return { ingredients, analysis, overallScore, recommendation, summary };
}

export function isValidAnalysisResult(data: unknown): data is AnalysisResult {
  return sanitizeAnalysisResult(data) !== null;
}
