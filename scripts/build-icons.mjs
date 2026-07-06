/**
 * PWAアイコン生成（依存ライブラリなし）
 * 雪だるまモチーフをラスタライズし、zlibで最小構成のPNGを書き出す。
 *   node scripts/build-icons.mjs
 * 本格的なアートへの差し替えは docs/HANDOFF.md §5。
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256).map((_, n) => {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      return c;
    });
  }
  let c = -1;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // 行頭にフィルタ種別0を挿入
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** 雪だるまアイコンを描く（ピクセル手描き） */
function drawIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  const set = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
  };
  const c = size / 2;
  const inCircle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // 背景: 夜空（角丸）
      const corner = size * 0.18;
      const inRound =
        (x > corner || y > corner || inCircle(x, y, corner, corner, corner)) &&
        (size - x > corner || y > corner || inCircle(x, y, size - corner, corner, corner)) &&
        (x > corner || size - y > corner || inCircle(x, y, corner, size - corner, corner)) &&
        (size - x > corner || size - y > corner || inCircle(x, y, size - corner, size - corner, corner));
      if (!inRound) { set(x, y, 0, 0, 0, 0); continue; }
      set(x, y, 30, 41, 90);
      // 雪原
      if (y > size * 0.78) set(x, y, 226, 232, 240);
      // 月
      if (inCircle(x, y, size * 0.78, size * 0.2, size * 0.08)) set(x, y, 254, 243, 199);
      // 雪だるま: 体
      if (inCircle(x, y, c, size * 0.62, size * 0.24)) set(x, y, 255, 255, 255);
      // 頭
      if (inCircle(x, y, c, size * 0.36, size * 0.17)) set(x, y, 255, 255, 255);
      // 目
      if (inCircle(x, y, c - size * 0.06, size * 0.33, size * 0.018)) set(x, y, 51, 65, 85);
      if (inCircle(x, y, c + size * 0.06, size * 0.33, size * 0.018)) set(x, y, 51, 65, 85);
      // 鼻
      if (inCircle(x, y, c, size * 0.39, size * 0.022)) set(x, y, 251, 146, 60);
    }
  }
  return encodePng(size, size, px);
}

for (const size of [192, 512]) {
  writeFileSync(join(OUT, `icon-${size}.png`), drawIcon(size));
  console.log(`icon-${size}.png`);
}

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="18" fill="#1e295a"/>
  <rect y="78" width="100" height="22" fill="#e2e8f0"/>
  <circle cx="78" cy="20" r="8" fill="#fef3c7"/>
  <circle cx="50" cy="62" r="24" fill="#fff"/>
  <circle cx="50" cy="36" r="17" fill="#fff"/>
  <circle cx="44" cy="33" r="1.8" fill="#334155"/>
  <circle cx="56" cy="33" r="1.8" fill="#334155"/>
  <circle cx="50" cy="39" r="2.2" fill="#fb923c"/>
</svg>`;
writeFileSync(join(OUT, 'favicon.svg'), favicon);
console.log('favicon.svg');
