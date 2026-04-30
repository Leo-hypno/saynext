import fs from "node:fs";
import path from "node:path";

const outDir = path.join(process.cwd(), "apps/desktop/src-tauri/icons");
const pngFile = path.join(outDir, "icon.png");
const icoFile = path.join(outDir, "icon.ico");

if (!fs.existsSync(pngFile)) {
  throw new Error(`Missing ${path.relative(process.cwd(), pngFile)}`);
}

const png = fs.readFileSync(pngFile);
const { width, height } = readPngSize(png);

if (width !== 256 || height !== 256) {
  throw new Error(`Expected icon.png to be 256x256, got ${width}x${height}`);
}

fs.writeFileSync(icoFile, icoFromPng(png, width, height));
console.log(`Wrote ${path.relative(process.cwd(), icoFile)}`);

function readPngSize(png) {
  const signature = "89504e470d0a1a0a";
  if (png.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("icon.png is not a PNG file");
  }

  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20)
  };
}

function icoFromPng(png, width, height) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const directory = Buffer.alloc(16);
  directory[0] = width >= 256 ? 0 : width;
  directory[1] = height >= 256 ? 0 : height;
  directory[2] = 0;
  directory[3] = 0;
  directory.writeUInt16LE(1, 4);
  directory.writeUInt16LE(32, 6);
  directory.writeUInt32LE(png.length, 8);
  directory.writeUInt32LE(header.length + directory.length, 12);

  return Buffer.concat([header, directory, png]);
}
