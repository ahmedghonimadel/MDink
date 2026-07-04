export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function fileInputToDataUrl(file: File | undefined, maxMb = 4) {
  if (!file) return "";
  if (file.size > maxMb * 1024 * 1024) {
    throw new Error(`Maximum file size is ${maxMb}MB. Use an external URL for larger files.`);
  }
  return readFileAsDataUrl(file);
}
