export function buildPrompt(defaultCurrency: string = 'USD'): string {
  return `You are a receipt parser. Extract data from this receipt image and return ONLY a valid JSON object — no markdown, no explanation, no code blocks. Use this exact schema:
{
  "merchant": "store or restaurant name",
  "date": "YYYY-MM-DD",
  "total": 0.00,
  "currency": "${defaultCurrency}",
  "address": "store address, street, city or null if not found",
  "items": [
    { "name": "item description", "price": 0.00 }
  ],
  "confidence": 0.95
}
If you cannot read a field, use null. The confidence field should be 0.0-1.0 based on image quality.
Crucial currency instruction: The user's active currency is '${defaultCurrency}'. You MUST return the currency as '${defaultCurrency}' unless you are 100% sure the receipt shows a different currency (for example, if the receipt explicitly lists another currency symbol or name like EUR, and it's different from '${defaultCurrency}'). If the receipt uses '$' and the user's active currency is ARS, you MUST assume it is ARS. Never assume '$' means USD if defaultCurrency is ARS.`;
}

export function cleanGeminiOutput(text: string): string {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}
