export function isValidAmount(value: string): boolean {
  const n = parseFloat(value);
  return !isNaN(n) && n > 0 && n < 1_000_000;
}

export function isValidImageFile(file: File): { valid: boolean; error?: string } {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
  if (!allowed.includes(file.type)) {
    return { valid: false, error: 'Please upload a JPEG, PNG, or WebP image.' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'Image must be smaller than 10 MB.' };
  }
  return { valid: true };
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
