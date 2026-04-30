import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const outDir = path.join(process.cwd(), "apps/desktop/src-tauri/icons");
const pngFile = path.join(outDir, "icon.png");
const icoFile = path.join(outDir, "icon.ico");

if (!fs.existsSync(pngFile)) {
  throw new Error(`Missing ${path.relative(process.cwd(), pngFile)}`);
}

const sourcePng = fs.readFileSync(pngFile);
const iconPng = ensureRgbaPng(sourcePng);
const { width, height } = readPngMeta(iconPng);

if (width !== 256 || height !== 256) {
  throw new Error(`Expected icon.png to be 256x256, got ${width}x${height}`);
}

fs.writeFileSync(pngFile, iconPng);
fs.writeFileSync(icoFile, icoFromPng(iconPng, width, height));
console.log(`Wrote ${path.relative(process.cwd(), pngFile)}`);
console.log(`Wrote ${path.relative(process.cwd(), icoFile)}`);

function ensureRgbaPng(png) {
  const meta = readPngMeta(png);

  if (meta.colorType === 6) return png;
  if (meta.colorType !== 2 || meta.bitDepth !== 8 || meta.interlace !== 0) {
    throw new Error("icon.png must be an 8-bit RGB or RGBA non-interlaced PNG");
  }

  const imageData = Buffer.concat(meta.idatChunks);
  const inflated = zlib.inflateSync(imageData);
  const sourceStride = meta.width * 3;
  const targetStride = meta.width * 4;
  const unfiltered = unfilterPng(inflated, meta.width, meta.height, 3);
  const raw = Buffer.alloc((targetStride + 1) * meta.height);

  for (let y = 0; y < meta.height; y += 1) {
    const sourceRow = y * sourceStride;
    const targetRow = y * (targetStride + 1);
    raw[targetRow] = 0;

    for (let x = 0; x < meta.width; x += 1) {
      const sourceOffset = sourceRow + x * 3;
      const targetOffset = targetRow + 1 + x * 4;
      raw[targetOffset] = unfiltered[sourceOffset];
      raw[targetOffset + 1] = unfiltered[sourceOffset + 1];
      raw[targetOffset + 2] = unfiltered[sourceOffset + 2];
      raw[targetOffset + 3] = 255;
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr(meta.width, meta.height)),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function unfilterPng(data, width, height, bytesPerPixel) {
  const stride = width * bytesPerPixel;
  const output = Buffer.alloc(stride * height);
  let inputOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = data[inputOffset];
    inputOffset += 1;
    const rowOffset = y * stride;
    const previousRowOffset = (y - 1) * stride;

    for (let x = 0; x < stride; x += 1) {
      const raw = data[inputOffset + x];
      const left = x >= bytesPerPixel ? output[rowOffset + x - bytesPerPixel] : 0;
      const up = y > 0 ? output[previousRowOffset + x] : 0;
      const upLeft =
        y > 0 && x >= bytesPerPixel
          ? output[previousRowOffset + x - bytesPerPixel]
          : 0;

      output[rowOffset + x] = (raw + filterValue(filter, left, up, upLeft)) & 0xff;
    }

    inputOffset += stride;
  }

  return output;
}

function filterValue(filter, left, up, upLeft) {
  if (filter === 0) return 0;
  if (filter === 1) return left;
  if (filter === 2) return up;
  if (filter === 3) return Math.floor((left + up) / 2);
  if (filter === 4) return paeth(left, up, upLeft);
  throw new Error(`Unsupported PNG filter ${filter}`);
}

function paeth(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);

  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
  if (upDistance <= upLeftDistance) return up;
  return upLeft;
}

function readPngMeta(png) {
  const signature = "89504e470d0a1a0a";
  if (png.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("icon.png is not a PNG file");
  }

  const idatChunks = [];
  let offset = 8;
  let meta = null;

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    const data = png.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      meta = {
        bitDepth: data[8],
        colorType: data[9],
        height: data.readUInt32BE(4),
        idatChunks,
        interlace: data[12],
        width: data.readUInt32BE(0)
      };
    }

    if (type === "IDAT") {
      idatChunks.push(data);
    }

    if (type === "IEND") break;
    offset += length + 12;
  }

  if (!meta) throw new Error("PNG is missing IHDR");
  return meta;
}

function ihdr(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;
  data[9] = 6;
  data[10] = 0;
  data[11] = 0;
  data[12] = 0;
  return data;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
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

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}
