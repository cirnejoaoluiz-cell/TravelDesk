import type { Food } from './types';

/** Base inicial: valores por 100 g, cozido. */
export const DEFAULT_FOODS: Food[] = [
  { id: 'frango', name: 'Frango grelhado', kcal100: 160, prot100: 32 },
  { id: 'tilapia', name: 'Tilápia', kcal100: 130, prot100: 26 },
  { id: 'file-magro', name: 'Filé magro', kcal100: 220, prot100: 32 },
  { id: 'lombo', name: 'Lombo de porco', kcal100: 210, prot100: 35 },
  { id: 'hamburguer', name: 'Hambúrguer caseiro (patinho)', kcal100: 230, prot100: 26 },
  { id: 'arroz', name: 'Arroz', kcal100: 128, prot100: 2.5 },
  { id: 'feijao', name: 'Feijão', kcal100: 76, prot100: 4.8 },
  { id: 'macarrao', name: 'Macarrão', kcal100: 150, prot100: 5 },
  { id: 'molho-tomate', name: 'Molho de tomate', kcal100: 40, prot100: 1.5 },
  { id: 'macaxeira', name: 'Macaxeira', kcal100: 125, prot100: 0.6 },
  { id: 'batata-doce', name: 'Batata doce', kcal100: 77, prot100: 1.3 },
  { id: 'queijo-coalho', name: 'Queijo coalho', kcal100: 330, prot100: 23 },
  { id: 'azeite', name: 'Azeite', kcal100: 884, prot100: 0, portions: [{ label: '1 col. chá', grams: 5 }] },
  { id: 'salada', name: 'Salada', kcal100: 20, prot100: 1 },
];
