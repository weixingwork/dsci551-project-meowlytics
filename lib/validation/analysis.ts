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

export function isValidAnalysisResult(data: unknown): data is AnalysisResult {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.ingredients)) return false;
  if (!Array.isArray(obj.analysis)) return false;
  if (typeof obj.overallScore !== "number") return false;
  if (typeof obj.recommendation !== "string") return false;
  if (typeof obj.summary !== "string") return false;

  for (const item of obj.ingredients) {
    if (typeof item !== "string") return false;
  }

  for (const item of obj.analysis) {
    if (!item || typeof item !== "object") return false;
    const analysisItem = item as Record<string, unknown>;

    if (typeof analysisItem.ingredient !== "string") return false;
    if (typeof analysisItem.category !== "string") return false;
    if (!ALLOWED_CATEGORIES.has(analysisItem.category)) return false;
    if (typeof analysisItem.healthImpact !== "string") return false;
    if (!ALLOWED_HEALTH_IMPACTS.has(analysisItem.healthImpact)) return false;
    if (typeof analysisItem.description !== "string") return false;
  }

  return true;
}
