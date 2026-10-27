/**
 * Lê uma imagem escolhida pelo usuário e devolve uma versão reduzida em JPEG (data URL).
 * Reduzir é importante porque o localStorage tem ~5 MB no total.
 * Ao migrar para a nuvem, este é o ponto para trocar por upload em um storage de arquivos.
 */
export async function compressImage(file: File, maxWidth = 1400, quality = 0.78): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Selecione um arquivo de imagem.');
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, maxWidth / img.naturalWidth);
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível processar a imagem.');
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível abrir a imagem.'));
    img.src = src;
  });
}
