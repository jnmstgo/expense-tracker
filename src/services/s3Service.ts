export async function uploadReceiptToS3(file: File): Promise<string> {
  try {
    const res = await fetch('/api/upload-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    });

    if (!res.ok) {
      console.warn('Backend upload-receipt endpoint failed, using local Blob URL fallback...');
      return URL.createObjectURL(file);
    }

    const data = await res.json() as { fallbackLocal?: boolean; uploadUrl?: string; fileUrl?: string; reason?: string };

    if (data.fallbackLocal) {
      console.info('AWS S3 not configured on server, using local Blob URL fallback:', data.reason);
      return URL.createObjectURL(file);
    }

    if (!data.uploadUrl || !data.fileUrl) {
      console.warn('S3 presign response missing URL properties, using local Blob URL fallback...');
      return URL.createObjectURL(file);
    }

    // Upload file directly to S3
    const s3Res = await fetch(data.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });

    if (s3Res.ok) {
      return data.fileUrl;
    }

    console.error('Failed to upload file binary directly to AWS S3, using local Blob URL fallback...');
    return URL.createObjectURL(file);
  } catch (err) {
    console.warn('S3 upload pipeline encountered error, using local Blob URL fallback...', err);
    return URL.createObjectURL(file);
  }
}
