const zlib=require('zlib');
const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
function readChunks(buf) {
if (!buf.slice(0, 8).equals(SIG)) throw new Error('Kein PNG (Signatur)');
const chunks = [];
let off = 8;
while (off < buf.length) {
const len = buf.readUInt32BE(off);
const type = buf.toString('ascii', off + 4, off + 8);
const data = buf.slice(off + 8, off + 8 + len);
chunks.push({ type, data });
off += 12 + len;
}
return chunks;
}
function paeth(a, b, c) {
const p = a + b - c;
const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
if (pa <= pb && pa <= pc) return a;
if (pb <= pc) return b;
return c;
}
function decodePNG(buf) {
const chunks = readChunks(buf);
const ihdr = chunks.find(c => c.type === 'IHDR');
if (!ihdr) throw new Error('IHDR fehlt');
const width = ihdr.data.readUInt32BE(0);
const height = ihdr.data.readUInt32BE(4);
const bitDepth = ihdr.data.readUInt8(8);
const colorType = ihdr.data.readUInt8(9);
const interlace = ihdr.data.readUInt8(12);
if (bitDepth !== 8) throw new Error('Nur 8-bit unterstuetzt, ist ' + bitDepth);
if (interlace !== 0) throw new Error('Interlaced PNG nicht unterstuetzt');
const chMap = { 0: 1, 2: 3, 4: 2, 6: 4 };
const channels = chMap[colorType];
if (!channels) throw new Error('Colortype ' + colorType + ' nicht unterstuetzt');
const idat = Buffer.concat(chunks.filter(c => c.type === 'IDAT').map(c => c.data));
const raw = zlib.inflateSync(idat);
const bpp = channels;
const stride = width * bpp;
const pixels = Buffer.alloc(height * stride);
let pos = 0;
for (let y = 0; y < height; y++) {
const filter = raw[pos++];
const row = raw.slice(pos, pos + stride); pos += stride;
const out = pixels.slice(y * stride, y * stride + stride);
for (let x = 0; x < stride; x++) {
const a = x >= bpp ? out[x - bpp] : 0;
const b = y > 0 ? pixels[(y - 1) * stride + x] : 0;
const c = (x >= bpp && y > 0) ? pixels[(y - 1) * stride + x - bpp] : 0;
let v = row[x];
switch (filter) {
case 0: break;
case 1: v = (v + a) & 255; break;
case 2: v = (v + b) & 255; break;
case 3: v = (v + ((a + b) >> 1)) & 255; break;
case 4: v = (v + paeth(a, b, c)) & 255; break;
default: throw new Error('Filter ' + filter + ' unbekannt');
}
out[x] = v;
}
}
return { width, height, channels, pixels };
}
function encodePNG(width, height, channels, pixels) {
const colorType = channels === 4 ? 6 : channels === 3 ? 2 : channels === 2 ? 4 : 0;
const stride = width * channels;
const raw = Buffer.alloc(height * (stride + 1));
for (let y = 0; y < height; y++) {
raw[y * (stride + 1)] = 0;
pixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
}
const idat = zlib.deflateSync(raw, { level: 9 });
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr.writeUInt8(8, 8);
ihdr.writeUInt8(colorType, 9);
ihdr.writeUInt8(0, 10);
ihdr.writeUInt8(0, 11);
ihdr.writeUInt8(0, 12);
const out = [SIG];
const chunk = (type, data) => {
const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
const tb = Buffer.from(type, 'ascii');
const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([tb, data])) >>> 0, 0);
return Buffer.concat([len, tb, data, crc]);
};
out.push(chunk('IHDR', ihdr));
out.push(chunk('IDAT', idat));
out.push(chunk('IEND', Buffer.alloc(0)));
return Buffer.concat(out);
}
const CRC_TABLE = (() => {
const t = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
let c = n;
for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
t[n] = c >>> 0;
}
return t;
})();
function crc32(buf) {
let c = 0xFFFFFFFF;
for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8);
return (c ^ 0xFFFFFFFF) >>> 0;
}
function composite(baseBuf, badgeBuf, x, y) {
const base = decodePNG(baseBuf);
const badge = decodePNG(badgeBuf);
const bc = base.channels, wc = badge.channels;
for (let j = 0; j < badge.height; j++) {
const by = y + j;
if (by < 0 || by >= base.height) continue;
for (let i = 0; i < badge.width; i++) {
const bx = x + i;
if (bx < 0 || bx >= base.width) continue;
const sp = (j * badge.width + i) * wc;
const dp = (by * base.width + bx) * bc;
let r, g, b, a = 255;
if (wc >= 3) { r = badge.pixels[sp]; g = badge.pixels[sp + 1]; b = badge.pixels[sp + 2]; if (wc === 4) a = badge.pixels[sp + 3]; }
else { r = g = b = badge.pixels[sp]; if (wc === 2) a = badge.pixels[sp + 1]; }
if (a === 0) continue;
if (a === 255) {
base.pixels[dp] = r; base.pixels[dp + 1] = g; base.pixels[dp + 2] = b;
} else {
const ia = 255 - a;
base.pixels[dp] = (r * a + base.pixels[dp] * ia) / 255 | 0;
base.pixels[dp + 1] = (g * a + base.pixels[dp + 1] * ia) / 255 | 0;
base.pixels[dp + 2] = (b * a + base.pixels[dp + 2] * ia) / 255 | 0;
}
if (bc === 4) base.pixels[dp + 3] = 255;
}
}
return encodePNG(base.width, base.height, bc, base.pixels);
}
const PLACEMENTS=[['img_1x1',836,834,'kapa_visual_1x1.png'],['img_4x5',631,834,'kapa_visual_4x5.png'],['img_9x16',388,834,'kapa_visual_9x16.png'],['img_191x1',836,346,'kapa_visual_191x1.png']];
const items=$input.all();const results=[];
for(let i=0;i<items.length;i++){const logoBuf=await this.helpers.getBinaryDataBuffer(i,'logo');const binary=Object.assign({},items[i].binary);
for(const [key,X,Y,fn] of PLACEMENTS){const baseBuf=await this.helpers.getBinaryDataBuffer(i,key);const outBuf=composite(baseBuf,logoBuf,X,Y);binary[key]=await this.helpers.prepareBinaryData(outBuf,fn,'image/png');}
delete binary.logo;delete binary.data;results.push({json:{},binary});}
return results;
