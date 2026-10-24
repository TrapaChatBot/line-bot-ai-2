import { requireEnv } from './env.js';

const TTL_MS = 5 * 60 * 1000;

let cache = { text: '', fetchedAt: 0 };

// SHEET_CSV_URL รับได้หลายชีต คั่นด้วย , หรือขึ้นบรรทัดใหม่
// ใส่ชื่อชีตนำหน้าได้ เช่น ปัญหาผิว|https://docs.google.com/.../pub?gid=123&single=true&output=csv
function parseSources(raw) {
  return raw
    .split(/[\n,]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const i = part.indexOf('|');
      return i === -1
        ? { name: '', url: part }
        : { name: part.slice(0, i).trim(), url: part.slice(i + 1).trim() };
    });
}

async function fetchSheet({ name, url }, index) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status} (${name || `sheet ${index + 1}`})`);
  const csv = (await res.text()).trim();
  return `## ${name || `ชีต ${index + 1}`}\n${csv}`;
}

// ดึง CSV ที่ publish จาก Google Sheet (File > Share > Publish to web > CSV)
export async function getFaq() {
  const sources = parseSources(requireEnv('SHEET_CSV_URL'));

  if (cache.text && Date.now() - cache.fetchedAt < TTL_MS) return cache.text;

  try {
    // แท็บเดียวที่พัง (ถูกลบ/เลิก publish) ไม่ควรทำให้บอททั้งตัวตอบไม่ได้
    const results = await Promise.allSettled(sources.map(fetchSheet));
    const parts = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    for (const r of results) {
      if (r.status === 'rejected') console.error('skipped sheet:', r.reason.message);
    }
    if (!parts.length) throw results[0].reason;
    cache = { text: parts.join('\n\n'), fetchedAt: Date.now() };
  } catch (err) {
    // ถ้า Sheet ล่มชั่วคราว ใช้ข้อมูลเก่าที่แคชไว้ต่อ
    if (!cache.text) throw err;
    console.error('FAQ refresh failed, using stale cache:', err.message);
  }
  return cache.text;
}
