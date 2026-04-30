import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error("Usage: npm run version:set -- 0.1.1");
  console.error("Version must be SemVer, for example 0.1.1 or 0.2.0-beta.1.");
  process.exit(1);
}

const root = process.cwd();
const files = [
  "package.json",
  "apps/desktop/package.json",
  "apps/desktop/src-tauri/tauri.conf.json"
];

for (const relativePath of files) {
  const fullPath = path.join(root, relativePath);
  const json = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  json.version = version;
  fs.writeFileSync(fullPath, `${JSON.stringify(json, null, 2)}\n`);
  console.log(`Updated ${relativePath} to ${version}`);
}

const lockfilePath = path.join(root, "package-lock.json");

if (fs.existsSync(lockfilePath)) {
  const lockfile = JSON.parse(fs.readFileSync(lockfilePath, "utf8"));
  lockfile.version = version;

  if (lockfile.packages?.[""]) {
    lockfile.packages[""].version = version;
  }

  if (lockfile.packages?.["apps/desktop"]) {
    lockfile.packages["apps/desktop"].version = version;
  }

  fs.writeFileSync(lockfilePath, `${JSON.stringify(lockfile, null, 2)}\n`);
  console.log(`Updated package-lock.json to ${version}`);
}
