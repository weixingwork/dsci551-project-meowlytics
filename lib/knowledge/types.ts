export interface IngredientKnowledge {
  id: string;
  name: string;                    // Chinese name
  nameEn: string;                  // English name
  aliases: string[];               // Alternative names for matching
  category: "protein" | "carbohydrate" | "fat" | "additive" | "vitamin" | "mineral" | "fiber" | "other";
  healthImpact: "good" | "neutral" | "bad";
  description: string;             // Brief description in Chinese
  benefits: string[];              // List of benefits
  concerns: string[];              // List of concerns/warnings
  suitableFor: string[];           // Suitable for which cats
  notSuitableFor: string[];        // Not suitable for which cats
  source: "knowledge_base" | "ai_generated";
  lastUpdated: string;
}

export type IngredientCategory = "protein" | "carbohydrate" | "fat" | "additive" | "vitamin" | "mineral" | "fiber" | "other";
export type HealthImpact = "good" | "neutral" | "bad";
