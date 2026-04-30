import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const packsDir = path.join(root, "packs");
const reservedCategoryIds = new Set(["recent"]);
const errors = [];

for (const file of findJsonFiles(packsDir)) {
  validatePack(file);
}

if (errors.length > 0) {
  console.error("Prompt pack validation failed:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Prompt pack validation passed.");

function validatePack(file) {
  const relativePath = path.relative(root, file);
  let pack;

  try {
    pack = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    errors.push(`${relativePath}: invalid JSON (${error.message})`);
    return;
  }

  requireString(pack, "id", relativePath);
  requireString(pack, "name", relativePath);
  requireString(pack, "description", relativePath);
  requireString(pack, "locale", relativePath);
  requireString(pack, "version", relativePath);
  requireString(pack, "author", relativePath);

  if (!Array.isArray(pack.categories) || pack.categories.length === 0) {
    errors.push(`${relativePath}: categories must be a non-empty array`);
    return;
  }

  if (!Array.isArray(pack.prompts) || pack.prompts.length === 0) {
    errors.push(`${relativePath}: prompts must be a non-empty array`);
    return;
  }

  const categoryIds = new Set();
  const promptIds = new Set();

  for (const [index, category] of pack.categories.entries()) {
    const label = `${relativePath}: categories[${index}]`;
    requireString(category, "id", label);
    requireString(category, "name", label);

    if (category.id) {
      if (reservedCategoryIds.has(category.id)) {
        errors.push(`${label}: "${category.id}" is reserved by the app`);
      }

      if (categoryIds.has(category.id)) {
        errors.push(`${label}: duplicate category id "${category.id}"`);
      }
      categoryIds.add(category.id);
    }
  }

  for (const [index, prompt] of pack.prompts.entries()) {
    const label = `${relativePath}: prompts[${index}]`;
    requireString(prompt, "id", label);
    requireString(prompt, "category", label);
    requireString(prompt, "title", label);
    requireString(prompt, "text", label);

    if (prompt.id) {
      if (promptIds.has(prompt.id)) {
        errors.push(`${label}: duplicate prompt id "${prompt.id}"`);
      }
      promptIds.add(prompt.id);
    }

    if (prompt.category && !categoryIds.has(prompt.category)) {
      errors.push(`${label}: unknown category "${prompt.category}"`);
    }

    if (!Array.isArray(prompt.tags)) {
      errors.push(`${label}: tags must be an array`);
    } else {
      for (const tag of prompt.tags) {
        if (typeof tag !== "string" || tag.trim().length === 0) {
          errors.push(`${label}: tags must contain only non-empty strings`);
        }
      }
    }
  }
}

function requireString(value, key, label) {
  if (typeof value?.[key] !== "string" || value[key].trim().length === 0) {
    errors.push(`${label}: ${key} must be a non-empty string`);
  }
}

function findJsonFiles(dir) {
  const files = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(fullPath);
    }
  }

  return files;
}
