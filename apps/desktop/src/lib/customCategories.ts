import type { Category, CustomCategory } from "../types";

export const createCategoryOptionValue = "__saynext_create_custom_category__";
export const maxCustomCategoryNameLength = 16;

type NormalizeCustomCategoriesOptions = {
  reservedIds?: Set<string>;
};

export function buildCategorySections(
  builtInCategories: Category[],
  customCategories: CustomCategory[]
) {
  return {
    builtIn: builtInCategories,
    custom: customCategories.map(({ id, name }) => ({ id, name }))
  };
}

export function normalizeCustomCategoryName(value: string) {
  return value.trim();
}

export function normalizeCustomCategories(
  value: unknown,
  fallbackLocale: string,
  options?: NormalizeCustomCategoriesOptions
): CustomCategory[] {
  return normalizeCustomCategoriesWithRemap(value, fallbackLocale, options).categories;
}

export function normalizeCustomCategoriesWithRemap(
  value: unknown,
  fallbackLocale: string,
  options?: NormalizeCustomCategoriesOptions
) {
  if (!Array.isArray(value)) {
    return {
      categories: [],
      categoryIdMap: new Map<string, string>()
    };
  }

  const reservedIds = options?.reservedIds ?? new Set<string>();
  const usedIds = new Set<string>(reservedIds);
  const usedNamesByLocale = new Map<string, Set<string>>();
  const categories: CustomCategory[] = [];
  const categoryIdMap = new Map<string, string>();

  for (const item of value) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof (item as { id?: unknown }).id !== "string" ||
      typeof (item as { name?: unknown }).name !== "string"
    ) {
      continue;
    }

    const rawCategory = item as {
      createdAt?: unknown;
      id: string;
      locale?: unknown;
      name: string;
    };
    const id = rawCategory.id.trim();
    const locale =
      typeof rawCategory.locale === "string" && rawCategory.locale.trim().length > 0
        ? rawCategory.locale.trim()
        : fallbackLocale;
    const name = normalizeCustomCategoryName(rawCategory.name);

    if (!id || !name || name.length > maxCustomCategoryNameLength || categoryIdMap.has(id)) {
      continue;
    }

    const nameKey = name.toLocaleLowerCase();
    const usedNames = usedNamesByLocale.get(locale) ?? new Set<string>();
    if (usedNames.has(nameKey)) {
      const existingCategory = categories.find(
        (category) =>
          category.locale === locale && category.name.toLocaleLowerCase() === nameKey
      );
      if (existingCategory) {
        categoryIdMap.set(id, existingCategory.id);
      }
      continue;
    }

    const finalId = usedIds.has(id) ? createCustomCategoryId(usedIds) : id;
    usedNames.add(nameKey);
    usedNamesByLocale.set(locale, usedNames);
    usedIds.add(finalId);
    categoryIdMap.set(id, finalId);

    categories.push({
      createdAt:
        typeof rawCategory.createdAt === "string" && rawCategory.createdAt.trim().length > 0
          ? rawCategory.createdAt
          : new Date().toISOString(),
      id: finalId,
      locale,
      name
    });
  }

  return {
    categories: categories.sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    categoryIdMap
  };
}

export function customCategoriesEqual(left: CustomCategory[], right: CustomCategory[]) {
  if (left.length !== right.length) return false;

  return left.every((category, index) => {
    const other = right[index];
    return (
      other &&
      category.createdAt === other.createdAt &&
      category.id === other.id &&
      category.locale === other.locale &&
      category.name === other.name
    );
  });
}

export function createCustomCategory(name: string, locale: string, existingIds = new Set<string>()) {
  return {
    createdAt: new Date().toISOString(),
    id: createCustomCategoryId(existingIds),
    locale,
    name: normalizeCustomCategoryName(name)
  } satisfies CustomCategory;
}

export function createCustomCategoryId(existingIds = new Set<string>()) {
  let id = "";
  do {
    id = `custom-category-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  } while (existingIds.has(id));
  return id;
}

export function hasDuplicateCustomCategoryName(
  categories: CustomCategory[],
  locale: string,
  name: string,
  excludeId?: string | null
) {
  const nextName = normalizeCustomCategoryName(name).toLocaleLowerCase();
  return categories.some((category) => {
    if (category.locale !== locale) return false;
    if (excludeId && category.id === excludeId) return false;
    return category.name.toLocaleLowerCase() === nextName;
  });
}

export function mergeCustomCategoriesForImport(
  current: CustomCategory[],
  imported: CustomCategory[]
) {
  const currentById = new Map(current.map((category) => [category.id, category]));
  const currentByLocaleName = new Map(
    current.map((category) => [toLocaleNameKey(category.locale, category.name), category])
  );
  const importedCategoryIdMap = new Map<string, string>();
  const usedIds = new Set(current.map((category) => category.id));

  for (const category of imported) {
    const existingByName = currentByLocaleName.get(toLocaleNameKey(category.locale, category.name));
    if (existingByName) {
      importedCategoryIdMap.set(category.id, existingByName.id);
      continue;
    }

    const existingById = currentById.get(category.id);
    const nextCategory =
      existingById && !sameCategory(existingById, category)
        ? { ...category, id: createCustomCategoryId(usedIds) }
        : category;

    importedCategoryIdMap.set(category.id, nextCategory.id);
    currentById.set(nextCategory.id, nextCategory);
    currentByLocaleName.set(toLocaleNameKey(nextCategory.locale, nextCategory.name), nextCategory);
    usedIds.add(nextCategory.id);
  }

  return {
    categories: [...currentById.values()].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt)
    ),
    importedCategoryIdMap
  };
}

export function readStoredCustomCategories(key: string, fallbackLocale: string) {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return normalizeCustomCategories(value, fallbackLocale);
  } catch {
    return [];
  }
}

function toLocaleNameKey(locale: string, name: string) {
  return `${locale}::${normalizeCustomCategoryName(name).toLocaleLowerCase()}`;
}

function sameCategory(left: CustomCategory, right: CustomCategory) {
  return (
    left.id === right.id &&
    left.locale === right.locale &&
    normalizeCustomCategoryName(left.name) === normalizeCustomCategoryName(right.name)
  );
}
