import { NextRequest, NextResponse } from "next/server";
import { IngredientKnowledge } from "@/lib/knowledge/types";
import { upsertIngredients } from "@/lib/knowledge/db-search";
import { requireUser } from "@/lib/auth/require-user";
import { isAdminUser } from "@/lib/auth/admin";

/**
 * 批量上传配料数据到数据库
 * POST /api/knowledge/upload
 * 需要管理员账号登录（邮箱在 ADMIN_EMAILS 中）
 *
 * 请求体格式：
 * {
 *   "ingredients": [
 *     {
 *       "name": "鸡肉",
 *       "nameEn": "Chicken",
 *       "aliases": ["鸡胸肉", "鸡肉粉"],
 *       "category": "protein",
 *       "healthImpact": "good",
 *       "description": "优质动物蛋白来源...",
 *       "benefits": ["提供优质蛋白", "易消化"],
 *       "concerns": ["可能引起过敏"],
 *       "suitableFor": ["成猫", "幼猫"],
 *       "notSuitableFor": ["对鸡肉过敏的猫"],
 *       "source": "knowledge_base"
 *     }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireUser();
  if (errorResponse) {
    return errorResponse;
  }
  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }
  if (!isAdminUser(user)) {
    return NextResponse.json(
      { error: "You do not have permission to perform this action" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { ingredients } = body;

    if (!ingredients || !Array.isArray(ingredients)) {
      return NextResponse.json(
        { error: "Request body must include an 'ingredients' array" },
        { status: 400 }
      );
    }

    if (ingredients.length === 0) {
      return NextResponse.json(
        { error: "ingredients array cannot be empty" },
        { status: 400 }
      );
    }

    // 验证每个配料的必需字段
    const requiredFields = [
      "name",
      "nameEn",
      "aliases",
      "category",
      "healthImpact",
      "description",
      "benefits",
      "concerns",
      "suitableFor",
      "notSuitableFor",
    ];

    const validCategories = [
      "protein",
      "carbohydrate",
      "fat",
      "additive",
      "vitamin",
      "mineral",
      "fiber",
      "other",
    ];
    const validHealthImpacts = ["good", "neutral", "bad"];
    const validSources = ["knowledge_base", "ai_generated"];

    const errors: string[] = [];

    for (let i = 0; i < ingredients.length; i++) {
      const ingredient = ingredients[i];

      // 检查必需字段
      for (const field of requiredFields) {
        if (!(field in ingredient)) {
          errors.push(`Ingredient ${i + 1}: missing required field "${field}"`);
        }
      }

      // 验证 category
      if (ingredient.category && !validCategories.includes(ingredient.category)) {
        errors.push(
          `Ingredient ${i + 1}: category must be one of ${validCategories.join(", ")}`
        );
      }

      // 验证 healthImpact
      if (
        ingredient.healthImpact &&
        !validHealthImpacts.includes(ingredient.healthImpact)
      ) {
        errors.push(
          `Ingredient ${i + 1}: healthImpact must be one of ${validHealthImpacts.join(", ")}`
        );
      }

      // 验证 source（如果提供）
      if (ingredient.source && !validSources.includes(ingredient.source)) {
        errors.push(
          `Ingredient ${i + 1}: source must be one of ${validSources.join(", ")}`
        );
      }

      // 验证数组字段
      const arrayFields = [
        "aliases",
        "benefits",
        "concerns",
        "suitableFor",
        "notSuitableFor",
      ];
      for (const field of arrayFields) {
        if (ingredient[field] && !Array.isArray(ingredient[field])) {
          errors.push(`Ingredient ${i + 1}: ${field} must be an array`);
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "Data validation failed",
          details: errors,
        },
        { status: 400 }
      );
    }

    // 为没有 source 的配料设置默认值
    const processedIngredients = ingredients.map(
      (ing: Partial<IngredientKnowledge>) => ({
        ...ing,
        source: ing.source || "knowledge_base",
      })
    );

    // 批量插入或更新
    const result = await upsertIngredients(
      processedIngredients as Array<
        Omit<IngredientKnowledge, "id" | "lastUpdated"> & { id?: string }
      >
    );

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${ingredients.length} ingredient record(s)`,
      created: result.created,
      updated: result.updated,
    });
  } catch (error) {
    console.error("Error uploading ingredients:", error);
    return NextResponse.json(
      { error: "Failed to upload ingredient data. Please try again later." },
      { status: 500 }
    );
  }
}
