import type { ReceiptData } from '@/types';

export async function scanReceiptWithAI(
  file: File
): Promise<ReceiptData> {
  const base64 = await fileToBase64(file);

  const res = await fetch('/api/gemini-ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64, mimeType: file.type }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `OCR API error ${res.status}`);
  }

  const data = (await res.json()) as ReceiptData;
  return data;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
