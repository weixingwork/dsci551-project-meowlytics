import { IngredientKnowledge } from "./types";

type NewIngredientKnowledge = Omit<IngredientKnowledge, "id" | "source" | "lastUpdated">;

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

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function isValidNewIngredientKnowledge(data: unknown): data is NewIngredientKnowledge {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj.name !== "string") return false;
  if (typeof obj.nameEn !== "string") return false;
  if (!isStringArray(obj.aliases)) return false;
  if (typeof obj.category !== "string") return false;
  if (!ALLOWED_CATEGORIES.has(obj.category)) return false;
  if (typeof obj.healthImpact !== "string") return false;
  if (!ALLOWED_HEALTH_IMPACTS.has(obj.healthImpact)) return false;
  if (typeof obj.description !== "string") return false;
  if (!isStringArray(obj.benefits)) return false;
  if (!isStringArray(obj.concerns)) return false;
  if (!isStringArray(obj.suitableFor)) return false;
  if (!isStringArray(obj.notSuitableFor)) return false;

  return true;
}
