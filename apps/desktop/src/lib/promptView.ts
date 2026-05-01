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
    return sortFavoritesFirst(
      prompts.filter((prompt) => prompt.source === "custom"),
      favorites
    );
  }

  const fallbackCategory = categories[0]?.id ?? "";
  return sortFavoritesFirst(
    prompts.filter((prompt) => prompt.category === (activeCategory || fallbackCategory)),
    favorites
  );
}
