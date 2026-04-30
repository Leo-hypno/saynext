import type { Category, RescuePrompt } from "../types";

export const recentCategoryId = "recent";
export const favoritesCategoryId = "favorites";
export const customCategoryId = "custom";

export function buildCategoryIds(categories: Category[]) {
  return [
    ...categories.map((category) => category.id),
    recentCategoryId,
    favoritesCategoryId,
    customCategoryId
  ];
}

export function getVisiblePrompts({
  activeCategory,
  categories,
  favorites,
  prompts,
  recentIds
}: {
  activeCategory: string;
  categories: Category[];
  favorites: Set<string>;
  prompts: RescuePrompt[];
  recentIds: string[];
}) {
  if (activeCategory === recentCategoryId) {
    return recentIds
      .map((id) => prompts.find((prompt) => prompt.id === id))
      .filter((prompt): prompt is RescuePrompt => Boolean(prompt));
  }

  if (activeCategory === favoritesCategoryId) {
    return prompts.filter((prompt) => favorites.has(prompt.id));
  }

  if (activeCategory === customCategoryId) {
    return prompts.filter((prompt) => prompt.source === "custom");
  }

  const fallbackCategory = categories[0]?.id ?? "";
  return sortPrompts(
    prompts.filter((prompt) => prompt.category === (activeCategory || fallbackCategory)),
    favorites
  );
}

function sortPrompts(prompts: RescuePrompt[], favorites: Set<string>) {
  return [...prompts].sort((a, b) => {
    const favoriteDelta = Number(favorites.has(b.id)) - Number(favorites.has(a.id));
    if (favoriteDelta !== 0) return favoriteDelta;
    return 0;
  });
}
