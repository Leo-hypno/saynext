import type { Category, RescuePrompt } from "../types";
import { searchPrompts } from "./search";

export const recentCategoryId = "recent";
export const favoritesCategoryId = "favorites";

export function buildCategoryIds(categories: Category[]) {
  return [recentCategoryId, favoritesCategoryId, ...categories.map((category) => category.id)];
}

export function getVisiblePrompts({
  activeCategory,
  categories,
  favorites,
  prompts,
  query,
  recentIds
}: {
  activeCategory: string;
  categories: Category[];
  favorites: Set<string>;
  prompts: RescuePrompt[];
  query: string;
  recentIds: string[];
}) {
  const normalizedQuery = query.trim();
  if (normalizedQuery) {
    return sortPrompts(searchPrompts(prompts, query, "all"), favorites);
  }

  if (activeCategory === recentCategoryId) {
    return recentIds
      .map((id) => prompts.find((prompt) => prompt.id === id))
      .filter((prompt): prompt is RescuePrompt => Boolean(prompt));
  }

  if (activeCategory === favoritesCategoryId) {
    return prompts.filter((prompt) => favorites.has(prompt.id));
  }

  const fallbackCategory = categories[0]?.id ?? "";
  return sortPrompts(searchPrompts(prompts, query, activeCategory || fallbackCategory), favorites);
}

function sortPrompts(prompts: RescuePrompt[], favorites: Set<string>) {
  return [...prompts].sort((a, b) => {
    const favoriteDelta = Number(favorites.has(b.id)) - Number(favorites.has(a.id));
    if (favoriteDelta !== 0) return favoriteDelta;
    return 0;
  });
}
