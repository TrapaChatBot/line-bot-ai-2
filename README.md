# line-bot-ai-2

LINE bot แอดมินร้านสกินแคร์ ตอบลูกค้าด้วย Gemini โดยใช้ข้อมูลจาก Google Sheet (CSV) เป็น FAQ

## โครงสร้าง

- `api/webhook.js` รับ webhook จาก LINE (ตรวจ signature, ตอบกลับ)
- `lib/prompt.js` prompt ตามบรีฟ (role, constraints, output_format, faq, question)
- `lib/faq.js` ดึง CSV จาก Google Sheet และแคช 5 นาที
- `lib/gemini.js` เรียก Gemini
- `vercel.json` ตั้ง `"framework": null` กัน Vercel เดา framework ผิด

## Environment variables

ดู `.env.example` แล้วตั้งค่าใน Vercel (Project Settings > Environment Variables)

## Deploy

1. Push ขึ้น GitHub แล้ว import เข้า Vercel
2. ตั้ง environment variables
3. ตั้ง Webhook URL ใน LINE Developers เป็น `https://<โปรเจกต์>.vercel.app/api/webhook` แล้วเปิด Use webhook
