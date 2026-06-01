import { useRef, useState } from 'react';
import type { ReceiptData } from '@/types';
import { scanReceiptWithAI } from '@/services/geminiOcr';
import { isValidImageFile } from '@/utils/validators';

interface Props {
  onScanned: (data: ReceiptData) => void;
  onError: (msg: string) => void;
}

export default function ReceiptScanner({ onScanned, onError }: Props) {
  const [isScanning, setIsScanning] = useState(false);
  const [preview, setPreview]       = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const validation = isValidImageFile(file);
    if (!validation.valid) { onError(validation.error!); return; }

    const url = URL.createObjectURL(file);
    setPreview(url);
    setIsScanning(true);

    try {
      const data = await scanReceiptWithAI(file);
      onScanned(data);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to scan receipt');
    } finally {
      setIsScanning(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center cursor-pointer
                   hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all"
      >
        {preview ? (
          <div className="relative">
            <img src={preview} alt="Receipt" className="max-h-40 mx-auto rounded-lg object-contain" />
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl mb-2 animate-pulse-soft">🔍</div>
                  <p className="text-xs text-white/80">Scanning with Gemini AI...</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-3xl mb-2">📸</p>
            <p className="text-sm text-white/60">Drop receipt here or click to upload</p>
            <p className="text-xs text-white/30 mt-1">JPEG, PNG, WebP · Max 10 MB</p>
          </div>
        )}
      </div>

      {isScanning && (
        <p className="text-xs text-indigo-300 text-center animate-pulse-soft">
          AI is extracting data from your receipt…
        </p>
      )}
    </div>
  );
}
