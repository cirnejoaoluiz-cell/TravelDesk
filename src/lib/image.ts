/** Tamanho máximo do data URL (o banco do claude.ai aceita documentos de até 256 KiB). */
const MAX_LENGTH = 190_000;

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
    let width = maxWidth;
    let q = quality;
    // Reduz qualidade e tamanho até caber no limite.
    for (let attempt = 0; attempt < 8; attempt++) {
      const result = render(img, width, q);
      if (result.length <= MAX_LENGTH) return result;
      if (q > 0.6) q -= 0.08;
      else width = Math.round(width * 0.8);
    }
    throw new Error('Não foi possível reduzir esta imagem. Tente outra.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function render(img: HTMLImageElement, maxWidth: number, quality: number): string {
  const scale = Math.min(1, maxWidth / img.naturalWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível processar a imagem.');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível abrir a imagem.'));
    img.src = src;
  });
}
