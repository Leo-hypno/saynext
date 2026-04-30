import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const size = 256;
const stride = size * 4 + 1;
const outDir = path.join(process.cwd(), "apps/desktop/src-tauri/icons");
const outFile = path.join(outDir, "icon.png");
const icoFile = path.join(outDir, "icon.ico");

fs.mkdirSync(outDir, { recursive: true });

const raw = Buffer.alloc(stride * size);

for (let y = 0; y < size; y += 1) {
  raw[y * stride] = 0;
}

paintBackground();
paintBubble();
paintPromptMark();
paintCursor();
paintHighlight();

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr(size, size)),
  chunk("IDAT", zlib.deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0))
]);

fs.writeFileSync(outFile, png);
console.log(`Wrote ${path.relative(process.cwd(), outFile)}`);

fs.writeFileSync(icoFile, icoFromPng(png, size, size));
console.log(`Wrote ${path.relative(process.cwd(), icoFile)}`);

function paintBackground() {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const alpha = roundedRectCoverage(x, y, 24, 24, 208, 208, 54);
      if (alpha <= 0) continue;

      const vertical = y / (size - 1);
      const radial = clamp(1 - Math.hypot(x - 76, y - 54) / 210, 0, 1);
      const rim = clamp(Math.hypot(x - 128, y - 128) / 174, 0, 1);
      const color = mixRgb(
        mixRgb([11, 22, 38], [15, 96, 116], radial * 0.58),
        [6, 12, 24],
        vertical * 0.42 + rim * 0.16
      );

      setPixel(x, y, color, alpha);
    }
  }

  strokeRoundedRect(30, 30, 196, 196, 48, [255, 255, 255], 38, 2);
  strokeRoundedRect(35, 35, 186, 186, 42, [0, 0, 0], 26, 3);
}

function paintBubble() {
  const shadowOffset = 8;
  fillRoundedRect(54, 68 + shadowOffset, 150, 104, 30, [0, 0, 0], 58);

  for (let y = 64; y < 174; y += 1) {
    for (let x = 50; x < 208; x += 1) {
      const body = roundedRectCoverage(x, y, 50, 64, 154, 102, 30);
      const tail = triangleCoverage(x, y, [85, 158], [106, 158], [75, 190]);
      const alpha = Math.max(body, tail);
      if (alpha <= 0) continue;

      const t = clamp((x - 50) / 158, 0, 1);
      const yTone = clamp((y - 64) / 110, 0, 1);
      const color = mixRgb(
        mixRgb([246, 250, 255], [204, 239, 232], t),
        [178, 219, 255],
        yTone * 0.2
      );
      blendPixel(x, y, color, Math.round(alpha * 0.96));
    }
  }

  strokeRoundedRect(50, 64, 154, 102, 30, [255, 255, 255], 130, 2);
}

function paintPromptMark() {
  drawRoundLine(87, 99, 125, 128, 13, [10, 50, 75], 235);
  drawRoundLine(125, 128, 87, 157, 13, [10, 50, 75], 235);
  drawRoundLine(136, 157, 166, 157, 13, [10, 50, 75], 235);

  drawRoundLine(89, 100, 124, 127, 7, [70, 221, 206], 210);
  drawRoundLine(124, 129, 91, 154, 7, [70, 221, 206], 190);
}

function paintCursor() {
  fillRoundedRect(177, 101, 12, 58, 6, [255, 197, 78], 255);
  fillRoundedRect(179, 103, 8, 54, 4, [255, 235, 158], 128);
}

function paintHighlight() {
  fillCircle(190, 67, 13, [255, 214, 98], 255);
  fillCircle(190, 67, 6, [255, 246, 196], 210);
  drawRoundLine(190, 45, 190, 53, 3, [255, 226, 132], 210);
  drawRoundLine(190, 81, 190, 89, 3, [255, 226, 132], 210);
  drawRoundLine(168, 67, 176, 67, 3, [255, 226, 132], 210);
  drawRoundLine(204, 67, 212, 67, 3, [255, 226, 132], 210);
}

function fillRoundedRect(x, y, width, height, radius, color, alpha) {
  for (let py = Math.floor(y - 1); py <= Math.ceil(y + height + 1); py += 1) {
    for (let px = Math.floor(x - 1); px <= Math.ceil(x + width + 1); px += 1) {
      const coverage = roundedRectCoverage(px, py, x, y, width, height, radius);
      if (coverage > 0) blendPixel(px, py, color, Math.round(alpha * coverage));
    }
  }
}

function strokeRoundedRect(x, y, width, height, radius, color, alpha, lineWidth) {
  for (let py = Math.floor(y - lineWidth); py <= Math.ceil(y + height + lineWidth); py += 1) {
    for (let px = Math.floor(x - lineWidth); px <= Math.ceil(x + width + lineWidth); px += 1) {
      const outer = roundedRectCoverage(px, py, x, y, width, height, radius);
      const inner = roundedRectCoverage(
        px,
        py,
        x + lineWidth,
        y + lineWidth,
        width - lineWidth * 2,
        height - lineWidth * 2,
        Math.max(0, radius - lineWidth)
      );
      const coverage = Math.max(0, outer - inner);
      if (coverage > 0) blendPixel(px, py, color, Math.round(alpha * coverage));
    }
  }
}

function drawRoundLine(x1, y1, x2, y2, width, color, alpha) {
  const radius = width / 2;
  const minX = Math.floor(Math.min(x1, x2) - radius - 1);
  const maxX = Math.ceil(Math.max(x1, x2) + radius + 1);
  const minY = Math.floor(Math.min(y1, y2) - radius - 1);
  const maxY = Math.ceil(Math.max(y1, y2) + radius + 1);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const t = lengthSq === 0 ? 0 : clamp(((x - x1) * dx + (y - y1) * dy) / lengthSq, 0, 1);
      const px = x1 + t * dx;
      const py = y1 + t * dy;
      const coverage = clamp(radius + 0.5 - Math.hypot(x - px, y - py), 0, 1);
      if (coverage > 0) blendPixel(x, y, color, Math.round(alpha * coverage));
    }
  }
}

function fillCircle(cx, cy, radius, color, alpha) {
  for (let y = Math.floor(cy - radius - 1); y <= Math.ceil(cy + radius + 1); y += 1) {
    for (let x = Math.floor(cx - radius - 1); x <= Math.ceil(cx + radius + 1); x += 1) {
      const coverage = clamp(radius + 0.5 - Math.hypot(x - cx, y - cy), 0, 1);
      if (coverage > 0) blendPixel(x, y, color, Math.round(alpha * coverage));
    }
  }
}

function roundedRectCoverage(px, py, x, y, width, height, radius) {
  const cx = clamp(px, x + radius, x + width - radius);
  const cy = clamp(py, y + radius, y + height - radius);
  return clamp(radius + 0.5 - Math.hypot(px - cx, py - cy), 0, 1);
}

function triangleCoverage(px, py, a, b, c) {
  const area = edge(a, b, c);
  const w1 = edge(b, c, [px, py]) / area;
  const w2 = edge(c, a, [px, py]) / area;
  const w3 = edge(a, b, [px, py]) / area;
  const inside = w1 >= 0 && w2 >= 0 && w3 >= 0 || w1 <= 0 && w2 <= 0 && w3 <= 0;
  if (!inside) return 0;

  const distance = Math.min(
    distanceToSegment(px, py, a[0], a[1], b[0], b[1]),
    distanceToSegment(px, py, b[0], b[1], c[0], c[1]),
    distanceToSegment(px, py, c[0], c[1], a[0], a[1])
  );
  return clamp(distance + 0.5, 0, 1);
}

function edge(a, b, c) {
  return (c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0]);
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : clamp(((px - x1) * dx + (py - y1) * dy) / lengthSq, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function setPixel(x, y, color, alpha) {
  if (x < 0 || x >= size || y < 0 || y >= size) return;
  const offset = y * stride + 1 + x * 4;
  raw[offset] = color[0];
  raw[offset + 1] = color[1];
  raw[offset + 2] = color[2];
  raw[offset + 3] = alpha;
}

function blendPixel(x, y, color, alpha) {
  if (x < 0 || x >= size || y < 0 || y >= size || alpha <= 0) return;
  const offset = y * stride + 1 + x * 4;
  const sourceAlpha = alpha / 255;
  const targetAlpha = raw[offset + 3] / 255;
  const outAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);

  if (outAlpha <= 0) return;

  raw[offset] = Math.round((color[0] * sourceAlpha + raw[offset] * targetAlpha * (1 - sourceAlpha)) / outAlpha);
  raw[offset + 1] = Math.round((color[1] * sourceAlpha + raw[offset + 1] * targetAlpha * (1 - sourceAlpha)) / outAlpha);
  raw[offset + 2] = Math.round((color[2] * sourceAlpha + raw[offset + 2] * targetAlpha * (1 - sourceAlpha)) / outAlpha);
  raw[offset + 3] = Math.round(outAlpha * 255);
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

function mixRgb(a, b, amount) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * amount),
    Math.round(a[1] + (b[1] - a[1]) * amount),
    Math.round(a[2] + (b[2] - a[2]) * amount)
  ];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
