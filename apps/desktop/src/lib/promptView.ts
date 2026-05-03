import type { Category, RescuePrompt } from "../types";

export const recentCategoryId = "recent";
export const favoritesCategoryId = "favorites";
export const customCategoryId = "custom";

export function buildCategoryIds(topLevelCategoryIds: string[] = [], fallbackCategoryId?: string) {
  const ids = new Set(topLevelCategoryIds);

  if (ids.size === 0 && fallbackCategoryId) {
    ids.add(fallbackCategoryId);
  }

  ids.add(recentCategoryId);
  ids.add(favoritesCategoryId);
  ids.add(customCategoryId);

  return [...ids];
}

function sortFavoritesFirst(prompts: RescuePrompt[], favorites: Set<string>) {
  return prompts
    .map((prompt, index) => ({ prompt, index }))
    .sort((left, right) => {
      const leftFavorite = favorites.has(left.prompt.id);
      const rightFavorite = favorites.has(right.prompt.id);

      if (leftFavorite === rightFavorite) {
        return left.index - right.index;
      }

      return leftFavorite ? -1 : 1;
    })
    .map(({ prompt }) => prompt);
}

export function getVisiblePrompts({
  activeCategory,
  categories,
  categoryGroups = {},
  favorites,
  prompts,
  recentIds
}: {
  activeCategory: string;
  categories: Category[];
  categoryGroups?: Record<string, string[]>;
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
    return sortFavoritesFirst(
      prompts.filter((prompt) => prompt.source === "custom"),
      favorites
    );
  }

  const groupCategoryIds = categoryGroups[activeCategory];
  if (groupCategoryIds?.length) {
    return sortFavoritesFirst(
      prompts.filter((prompt) => groupCategoryIds.includes(prompt.category)),
      favorites
    );
  }

  const fallbackCategory = categories[0]?.id ?? "";
  return sortFavoritesFirst(
    prompts.filter((prompt) => prompt.category === (activeCategory || fallbackCategory)),
    favorites
  );
}
