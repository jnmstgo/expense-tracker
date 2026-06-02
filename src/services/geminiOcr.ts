import type { ReceiptData } from '@/types';

const PROMPT = `You are a receipt parser. Extract data from this receipt image and return ONLY a valid JSON object — no markdown, no explanation, no code blocks. Use this exact schema:
{
  "merchant": "store or restaurant name",
  "date": "YYYY-MM-DD",
  "total": 0.00,
  "currency": "USD",
  "items": [
    { "name": "item description", "price": 0.00 }
  ],
  "confidence": 0.95
}
If you cannot read a field, use null. The confidence field should be 0.0-1.0 based on image quality.`;

export async function scanReceiptWithAI(
  file: File
): Promise<ReceiptData> {
  const base64 = await fileToBase64(file);

  // 1. Try the serverless backend first
  try {
    const res = await fetch('/api/gemini-ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, mimeType: file.type }),
    });

    if (res.ok) {
      return (await res.json()) as ReceiptData;
    }
    console.warn(`Backend OCR endpoint returned status ${res.status}, trying direct client fallback...`);
  } catch (e) {
    console.warn('Backend OCR endpoint connection failed, trying direct client fallback...', e);
  }

  // 2. Direct client fallback (essential for preview, dev, and static hosting without backend)
  const clientApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!clientApiKey) {
    throw new Error('No se pudo establecer conexión con el backend OCR, y no hay una clave VITE_GEMINI_API_KEY configurada.');
  }

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${clientApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType: file.type, data: base64 } },
            { text: PROMPT },
          ],
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      }),
    }
  );

  if (!geminiRes.ok) {
    const errBody = await geminiRes.text();
    console.error('Direct Gemini API error:', errBody);
    throw new Error('Error al procesar el ticket con Gemini directamente en el navegador');
  }

  const geminiData = await geminiRes.json() as any;
  const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned) as ReceiptData;
  } catch {
    console.error('Failed to parse Gemini output directly:', rawText);
    throw new Error('No se pudo interpretar el formato del ticket devuelto por la IA');
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
