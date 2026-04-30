import type { RescuePrompt } from "../types";

export function searchPrompts(
  prompts: RescuePrompt[],
  query: string,
  category: string
) {
  const normalizedQuery = query.trim().toLowerCase();

  return prompts
    .filter((prompt) => category === "all" || prompt.category === category)
    .filter((prompt) => {
      if (!normalizedQuery) return true;

      const haystack = [
        prompt.title,
        prompt.text,
        prompt.category,
        ...prompt.tags
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
}

