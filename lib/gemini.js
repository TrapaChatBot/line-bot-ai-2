import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { requireEnv } from './env.js';
import { getFaq } from './faq.js';
import {
  FALLBACK_REPLY,
  buildSystemInstruction,
  buildUserContent,
  stripMarkdown,
} from './prompt.js';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
// ใช้เมื่อโมเดลหลักโดนจำกัด/ล่ม/ช้าเกินไป (503, 429, 5xx, timeout)
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.6-flash';
// เวลาต่อหนึ่งครั้ง: สองครั้งรวมกันต้องไม่เกิน maxDuration ใน vercel.json
const ATTEMPT_TIMEOUT_MS = Number(process.env.GEMINI_ATTEMPT_TIMEOUT_MS) || 14_000;
const RETRY_DELAY_MS = 1_000;
// โมเดล Gemini 3 คิดนานโดยค่าเริ่มต้น ลดลงเพื่อให้ตอบแชตทัน (MINIMAL | LOW | MEDIUM | HIGH | off)
const THINKING = (process.env.GEMINI_THINKING_LEVEL || 'LOW').toUpperCase();

const isRetryable = (err) =>
  err?.status === 429 ||
  err?.status >= 500 ||
  err?.name === 'AbortError' ||
  err?.name === 'TimeoutError';
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
    ...(THINKING !== 'OFF' && { thinkingConfig: { thinkingLevel: ThinkingLevel[THINKING] } }),
  };

  // ลองโมเดลหลักก่อน ถ้าล้มเหลวแบบชั่วคราวให้สลับไปโมเดลสำรอง
  const attempts = [MODEL, FALLBACK_MODEL];
  let lastError;

  for (const [i, model] of attempts.entries()) {
    const attemptStart = Date.now();
    try {
      const response = await ai.models.generateContent({
        model,
        contents: buildUserContent(question),
        config: { ...config, abortSignal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS) },
      });
      console.log(
        `answer ok model=${model} attempt=${i + 1} thinking=${THINKING} faqChars=${faq.length} faqMs=${faqMs} geminiMs=${Date.now() - attemptStart} totalMs=${Date.now() - startedAt}`,
      );
      return stripMarkdown(response.text ?? '') || FALLBACK_REPLY;
    } catch (err) {
      lastError = err;
      console.error(
        `gemini attempt ${i + 1} failed model=${model} status=${err?.status} ms=${Date.now() - attemptStart}:`,
        err?.message,
      );
      if (!isRetryable(err)) throw err;
      if (i < attempts.length - 1) await sleep(RETRY_DELAY_MS);
    }
  }

  throw lastError;
}
