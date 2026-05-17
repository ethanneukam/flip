import { ItemCondition } from '../types/models';

export type RawAiResponse = {
  title?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  model?: string;
  condition?: string;
  confidence?: number;
  estimatedPrice?: number;
};

export type NormalizedAiItem = {
  title: string;
  description: string;
  category: string;
  subcategory: string | undefined;
  brand: string | undefined;
  model: string | undefined;
  condition: ItemCondition;
  aiConfidence: number;
  estimatedPrice: number | undefined;
};

const VALID_CONDITIONS: ItemCondition[] = ['mint', 'excellent', 'good', 'fair', 'poor'];

const KNOWN_CATEGORIES = [
  'sneakers',
  'electronics',
  'collectibles',
  'clothing',
  'accessories',
  'home',
  'sports',
  'toys',
  'books',
  'automotive',
  'other',
] as const;

function normalizeCondition(raw: string | undefined): ItemCondition {
  if (!raw) return 'good';
  const lower = raw.toLowerCase().trim();
  if (VALID_CONDITIONS.includes(lower as ItemCondition)) {
    return lower as ItemCondition;
  }
  if (lower.includes('new') || lower.includes('sealed')) return 'mint';
  if (lower.includes('like new') || lower.includes('great')) return 'excellent';
  if (lower.includes('used') || lower.includes('worn')) return 'fair';
  if (lower.includes('damaged') || lower.includes('broken')) return 'poor';
  return 'good';
}

function normalizeCategory(raw: string | undefined): string {
  if (!raw) return 'other';
  const lower = raw.toLowerCase().trim();
  const match = KNOWN_CATEGORIES.find(c => lower.includes(c));
  return match ?? 'other';
}

function normalizeConfidence(raw: number | undefined): number {
  if (raw === undefined || raw === null) return 50;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function normalizeAiResponse(raw: RawAiResponse): NormalizedAiItem {
  return {
    title: (raw.title ?? 'Unknown Item').trim(),
    description: (raw.description ?? '').trim(),
    category: normalizeCategory(raw.category),
    subcategory: raw.subcategory?.trim() || undefined,
    brand: raw.brand?.trim() || undefined,
    model: raw.model?.trim() || undefined,
    condition: normalizeCondition(raw.condition),
    aiConfidence: normalizeConfidence(raw.confidence),
    estimatedPrice: raw.estimatedPrice != null && raw.estimatedPrice > 0
      ? raw.estimatedPrice
      : undefined,
  };
}
