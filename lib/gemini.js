import { GoogleGenAI } from '@google/genai';
import { requireEnv } from './env.js';
import { getFaq } from './faq.js';
import {
  FALLBACK_REPLY,
  buildSystemInstruction,
  buildUserContent,
  stripMarkdown,
} from './prompt.js';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
// ใช้เมื่อโมเดลหลักโดนจำกัด/ล่มชั่วคราว (503, 429, 5xx)
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.6-flash';
// ต้องสั้นกว่า maxDuration ใน vercel.json เพื่อให้ยังเหลือเวลาตอบ fallback กลับไปหาลูกค้า
const TOTAL_BUDGET_MS = 22_000;
const RETRY_DELAY_MS = 1_000;

const isRetryable = (err) => err?.status === 429 || err?.status >= 500;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function answer(question) {
  const ai = new GoogleGenAI({ apiKey: requireEnv('GEMINI_API_KEY') });
  const startedAt = Date.now();
  const faq = await getFaq();
  const faqMs = Date.now() - startedAt;

  const config = {
    systemInstruction: buildSystemInstruction({
      shopName: process.env.SHOP_NAME || 'ร้านของเรา',
      faq,
    }),
    temperature: 0.3,
  };

  // ลองโมเดลหลักสองครั้ง แล้วสลับไปโมเดลสำรอง ภายในงบเวลารวม
  const attempts = [MODEL, MODEL, FALLBACK_MODEL];
  let lastError;

  for (const [i, model] of attempts.entries()) {
    const remaining = TOTAL_BUDGET_MS - (Date.now() - startedAt);
    if (remaining <= 0) break;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: buildUserContent(question),
        config: { ...config, abortSignal: AbortSignal.timeout(remaining) },
      });
      console.log(
        `answer ok model=${model} attempt=${i + 1} faqChars=${faq.length} faqMs=${faqMs} totalMs=${Date.now() - startedAt}`,
      );
      return stripMarkdown(response.text ?? '') || FALLBACK_REPLY;
    } catch (err) {
      lastError = err;
      console.error(`gemini attempt ${i + 1} failed model=${model} status=${err?.status}:`, err?.message);
      if (!isRetryable(err) && err?.name !== 'TimeoutError') throw err;
      await sleep(RETRY_DELAY_MS);
    }
  }

  throw lastError ?? new Error('Gemini time budget exhausted');
}
