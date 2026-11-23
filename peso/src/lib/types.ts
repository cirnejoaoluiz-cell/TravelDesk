export type Sex = 'M' | 'F';

export interface Profile {
  sex: Sex;
  age: number;
  heightCm: number;
  /** Peso no início do plano (kg). */
  startWeightKg: number;
  goalLossKg: number;
  weeks: number;
  /** Início do plano (YYYY-MM-DD). */
  startDate: string;
}

export interface Portion {
  label: string;
  grams: number;
}

export interface Food {
  id: string;
  name: string;
  kcal100: number;
  prot100: number;
  portions?: Portion[];
}

export type MealType = 'almoco' | 'jantar' | 'extra';

export interface MealItem {
  id: string;
  foodId: string;
  /** Copiados no lançamento, para o histórico não mudar se o alimento for editado. */
  name: string;
  grams: number;
  kcal: number;
  prot: number;
}

export interface Meal {
  id: string;
  date: string;
  type: MealType;
  items: MealItem[];
  favoriteName?: string;
}

export interface Favorite {
  id: string;
  name: string;
  type: MealType;
  items: { foodId: string; grams: number }[];
}

export interface Segment {
  speed: number;
  minutes: number;
}

export type WorkoutKind = 'musculacao' | 'esteira' | 'futebol';

export interface Workout {
  id: string;
  date: string;
  kind: WorkoutKind;
  minutes: number;
  segments?: Segment[];
  km?: number;
  kcal: number;
  /** Peso usado no cálculo. */
  weightKg: number;
}

export interface WeighIn {
  id: string;
  date: string;
  kg: number;
}

export interface FreeDay {
  /** Estimativa de kcal consumidas; ausente = deixado em branco. */
  estimateKcal?: number;
}

export interface AppData {
  version: 1;
  profile: Profile | null;
  foods: Food[];
  meals: Meal[];
  favorites: Favorite[];
  workouts: Workout[];
  weighIns: WeighIn[];
  freeDays: Record<string, FreeDay>;
}
