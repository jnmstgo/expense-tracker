import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  res.setHeader('Access-Control-Allow-Origin', process.env.VITE_APP_URL ?? '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY environment variable not set' });
  }

  const { image, mimeType } = req.body as { image?: string; mimeType?: string };

  if (!image || !mimeType) {
    return res.status(400).json({ error: 'Missing image or mimeType in request body' });
  }

  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif'];
  if (!allowedMimeTypes.includes(mimeType)) {
    return res.status(400).json({ error: `Unsupported image type: ${mimeType}` });
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType, data: image } },
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
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        }),
      }
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error('Gemini API error:', errBody);
      return res.status(502).json({ error: 'Gemini API request failed', detail: errBody });
    }

    const geminiData = await geminiRes.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
      error?: { message: string };
    };

    if (geminiData.error) {
      return res.status(502).json({ error: geminiData.error.message });
    }

    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Strip any accidental markdown code fences
    const cleaned = rawText
      .replace(/^```jsons*/i, '')
      .replace(/^```s*/i, '')
      .replace(/s*```$/i, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse Gemini output:', rawText);
      return res.status(422).json({
        error: 'Could not parse receipt data from image',
        raw: rawText,
      });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('OCR handler error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Internal server error',
    });
  }
}
