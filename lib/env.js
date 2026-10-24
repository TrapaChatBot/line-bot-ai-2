const REQUIRED = [
  'LINE_CHANNEL_SECRET',
  'LINE_CHANNEL_ACCESS_TOKEN',
  'GEMINI_API_KEY',
  'SHEET_CSV_URL',
];

// log เฉพาะว่ามีค่าหรือไม่ และชื่อตัวแปรที่คล้ายกัน (ไม่ log ค่า) เพื่อหา env ที่ขาดหรือพิมพ์ชื่อผิด
export function logEnvStatus() {
  const present = Object.fromEntries(
    REQUIRED.map((name) => [name, Boolean(process.env[name]?.trim())]),
  );
  const similar = Object.keys(process.env).filter((name) =>
    /GEMINI|GOOGLE|LINE_|SHEET/i.test(name),
  );
  console.log('env status:', JSON.stringify({ present, similar }));
}

export function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set`);
  return value;
}
