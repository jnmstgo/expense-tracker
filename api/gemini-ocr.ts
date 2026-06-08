import { buildPrompt, cleanGeminiOutput } from '../src/utils/ocrPrompt';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const headers = {
  'Access-Control-Allow-Origin': process.env.VITE_APP_URL ?? '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function handler(event: any) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!GEMINI_API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'GEMINI_API_KEY environment variable not set' }) };
  }

  let body: any = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { image, mimeType, defaultCurrency } = body;

  if (!image || !mimeType) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing image or mimeType in request body' }) };
  }

  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif'];
  if (!allowedMimeTypes.includes(mimeType)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: `Unsupported image type: ${mimeType}` }) };
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
              { text: buildPrompt(defaultCurrency) },
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
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Gemini API request failed', detail: errBody }) };
    }

    const geminiData = await geminiRes.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
      error?: { message: string };
    };

    if (geminiData.error) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: geminiData.error.message }) };
    }

    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const cleaned = cleanGeminiOutput(rawText);

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse Gemini output:', rawText);
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({
          error: 'Could not parse receipt data from image',
          raw: rawText,
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(parsed),
    };
  } catch (err) {
    console.error('OCR handler error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: err instanceof Error ? err.message : 'Internal server error',
      }),
    };
  }
}
