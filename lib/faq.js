const TTL_MS = 5 * 60 * 1000;

let cache = { text: '', fetchedAt: 0 };

// ดึง CSV ที่ publish จาก Google Sheet (File > Share > Publish to web > CSV)
export async function getFaq() {
  const url = process.env.SHEET_CSV_URL;
  if (!url) throw new Error('SHEET_CSV_URL is not set');

  if (cache.text && Date.now() - cache.fetchedAt < TTL_MS) return cache.text;

  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
    cache = { text: (await res.text()).trim(), fetchedAt: Date.now() };
  } catch (err) {
    // ถ้า Sheet ล่มชั่วคราว ใช้ข้อมูลเก่าที่แคชไว้ต่อ
    if (!cache.text) throw err;
    console.error('FAQ refresh failed, using stale cache:', err.message);
  }
  return cache.text;
}
