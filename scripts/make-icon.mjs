import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const size = 256;
const outDir = path.join(process.cwd(), "apps/desktop/src-tauri/icons");
const outFile = path.join(outDir, "icon.png");

fs.mkdirSync(outDir, { recursive: true });

const raw = Buffer.alloc((size * 4 + 1) * size);

for (let y = 0; y < size; y += 1) {
  const row = y * (size * 4 + 1);
  raw[row] = 0;

  for (let x = 0; x < size; x += 1) {
    const offset = row + 1 + x * 4;
    const radius = roundedRectAlpha(x, y, size, 48);
    const shade = Math.round(235 - y * 0.28);

    raw[offset] = 31;
    raw[offset + 1] = 111;
    raw[offset + 2] = Math.min(255, shade);
    raw[offset + 3] = radius;
  }
}

drawChevron(raw, size);

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr(size, size)),
  chunk("IDAT", zlib.deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0))
]);

fs.writeFileSync(outFile, png);
console.log(`Wrote ${path.relative(process.cwd(), outFile)}`);

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

function roundedRectAlpha(x, y, width, radius) {
  const left = radius;
  const right = width - radius - 1;
  const top = radius;
  const bottom = width - radius - 1;
  const cx = Math.max(left, Math.min(x, right));
  const cy = Math.max(top, Math.min(y, bottom));
  const distance = Math.hypot(x - cx, y - cy);
  return distance <= radius ? 255 : 0;
}

function drawChevron(buffer, width) {
  for (let y = 78; y < 178; y += 1) {
    for (let x = 84; x < 174; x += 1) {
      const upper = Math.abs(y - (x - 8)) < 13;
      const lower = Math.abs(y - (248 - x)) < 13;
      if (!upper && !lower) continue;

      const offset = y * (width * 4 + 1) + 1 + x * 4;
      buffer[offset] = 255;
      buffer[offset + 1] = 255;
      buffer[offset + 2] = 255;
      buffer[offset + 3] = 255;
    }
  }
}

