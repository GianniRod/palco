// Achica una foto en el navegador hasta que pese lo que acepta el servidor.
export async function photoToDataUrl(file: File) {
  const bitmap = await createImageBitmap(file);
  try {
    for (const [maxWidth, quality] of [[1800, 0.82], [1400, 0.75], [1000, 0.7]]) {
      const scale = Math.min(1, maxWidth / bitmap.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (dataUrl.length <= 1_100_000) return dataUrl;
    }
    throw new Error("Imagen demasiado pesada");
  } finally {
    bitmap.close();
  }
}
