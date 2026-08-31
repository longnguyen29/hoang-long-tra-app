import { buildRadarRecipeRecords, buildStarterRecords } from "@/lib/house-recipes";

async function loadAvailableTeas(admin) {
  const { data, error } = await admin.from("catalog_products")
    .select("id,name,kind,line,available,price")
    .eq("kind", "tea")
    .eq("available", true);
  if (error) throw error;
  return (data || []).filter((item) => item.line !== "sample");
}

export async function createHouseStarterRecipes(admin, { triggeredBy = "" } = {}) {
  const products = await loadAvailableTeas(admin);
  const records = buildStarterRecords(products, triggeredBy);
  const recipeIds = records.map((item) => item.recipe.id);
  const { data: existing, error: existingError } = recipeIds.length
    ? await admin.from("recipes").select("id").in("id", recipeIds)
    : { data: [], error: null };
  if (existingError) throw existingError;
  const existingIds = new Set((existing || []).map((item) => item.id));

  if (records.length) {
    const { error: recipeError } = await admin.from("recipes")
      .upsert(records.map((item) => item.recipe), { onConflict: "id", ignoreDuplicates: true });
    if (recipeError) throw recipeError;
    const { error: versionError } = await admin.from("recipe_versions")
      .upsert(records.map((item) => item.version), { onConflict: "id", ignoreDuplicates: true });
    if (versionError) throw versionError;
  }

  return {
    createdCount: records.filter((item) => !existingIds.has(item.recipe.id)).length,
    existingCount: records.filter((item) => existingIds.has(item.recipe.id)).length,
    recipeIds,
  };
}

export async function promoteRadarConceptWithFormula(admin, conceptId, { triggeredBy = "" } = {}) {
  const { data: concept, error: conceptError } = await admin.from("recipe_radar_concepts").select("*").eq("id", conceptId).single();
  if (conceptError || !concept) throw conceptError || new Error("concept_not_found");
  const [{ data: signal }, products] = await Promise.all([
    admin.from("recipe_radar_signals").select("url").eq("concept_key", concept.canonical_key).order("published_at", { ascending: false }).limit(1).maybeSingle(),
    loadAvailableTeas(admin),
  ]);
  const records = buildRadarRecipeRecords(concept, products, triggeredBy, signal?.url || "");

  const { data: existingVersion, error: versionLookupError } = await admin.from("recipe_versions")
    .select("id").eq("id", records.version.id).maybeSingle();
  if (versionLookupError) throw versionLookupError;

  if (concept.promoted_recipe_id) {
    const { data: existingRecipe, error: recipeLookupError } = await admin.from("recipes")
      .select("id,product_id,status").eq("id", concept.promoted_recipe_id).maybeSingle();
    if (recipeLookupError) throw recipeLookupError;
    if (existingRecipe && (!existingRecipe.product_id || existingRecipe.status === "draft")) {
      const { error: updateError } = await admin.from("recipes").update({
        product_id: existingRecipe.product_id || records.recipe.product_id,
        status: existingRecipe.status === "draft" ? "testing" : existingRecipe.status,
        target_cost_per_serving: records.recipe.target_cost_per_serving,
        target_sell_price: records.recipe.target_sell_price,
        notes: records.recipe.notes,
        updated_at: new Date().toISOString(),
      }).eq("id", existingRecipe.id);
      if (updateError) throw updateError;
    }
    if (!existingRecipe) {
      const { error: recreateError } = await admin.from("recipes").insert(records.recipe);
      if (recreateError) throw recreateError;
    }
  } else {
    const { error: recipeError } = await admin.from("recipes").upsert(records.recipe, { onConflict: "id", ignoreDuplicates: true });
    if (recipeError) throw recipeError;
  }

  if (!existingVersion) {
    const { error: versionError } = await admin.from("recipe_versions").insert(records.version);
    if (versionError) throw versionError;
  }
  const { error: conceptUpdateError } = await admin.from("recipe_radar_concepts").update({
    stage: "testing", promoted_recipe_id: records.recipe.id, updated_at: new Date().toISOString(),
  }).eq("id", concept.id);
  if (conceptUpdateError) throw conceptUpdateError;

  return { recipeId: records.recipe.id, recommendation: records.recommendation, versionCreated: !existingVersion };
}
