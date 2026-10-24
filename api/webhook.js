import { messagingApi, validateSignature } from '@line/bot-sdk';
import { answer } from '../lib/gemini.js';
import { FALLBACK_REPLY } from '../lib/prompt.js';

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

async function handleEvent(event) {
  if (event.type !== 'message' || !event.replyToken) return;

  let text = FALLBACK_REPLY;
  if (event.message.type === 'text') {
    try {
      text = await answer(event.message.text);
    } catch (err) {
      console.error('answer failed:', err);
    }
  }

  await client.replyMessage({
    replyToken: event.replyToken,
    messages: [{ type: 'text', text: text.slice(0, 5000) }],
  });
}

export async function POST(request) {
  const body = await request.text();
  const signature = request.headers.get('x-line-signature') ?? '';

  if (!validateSignature(body, process.env.LINE_CHANNEL_SECRET ?? '', signature)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const { events = [] } = JSON.parse(body);
  await Promise.all(
    events.map((event) =>
      handleEvent(event).catch((err) => console.error('handleEvent failed:', err)),
    ),
  );

  return new Response('OK');
}

export function GET() {
  return new Response('LINE bot is running');
}
