import { GoogleGenAI } from '@google/genai';
import { getFaq } from './faq.js';
import {
  FALLBACK_REPLY,
  buildSystemInstruction,
  buildUserContent,
  stripMarkdown,
} from './prompt.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export async function answer(question) {
  const faq = await getFaq();

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: buildUserContent(question),
    config: {
      systemInstruction: buildSystemInstruction({
        shopName: process.env.SHOP_NAME || 'ร้านของเรา',
        faq,
      }),
      temperature: 0.3,
    },
  });

  const text = stripMarkdown(response.text ?? '');
  return text || FALLBACK_REPLY;
}
