/** Capas padrão (gradientes suaves) para viagens sem imagem, escolhidas de forma estável pelo id. */
const GRADIENTS = [
  'linear-gradient(135deg, #2b4c46 0%, #6d9a8c 100%)',
  'linear-gradient(135deg, #3a4a6b 0%, #8ea4c8 100%)',
  'linear-gradient(135deg, #7a4b3a 0%, #d6a07e 100%)',
  'linear-gradient(135deg, #4b3f63 0%, #a796c4 100%)',
  'linear-gradient(135deg, #2f5566 0%, #86b5c2 100%)',
  'linear-gradient(135deg, #5d5a3c 0%, #bdb88a 100%)',
];

export function coverBackground(id: string, image: string | null): string {
  if (image) return `url("${image}") center / cover no-repeat`;
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}
