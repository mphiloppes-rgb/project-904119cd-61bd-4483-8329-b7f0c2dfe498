// Helper: build full display label "Name — Brand · Model"
import type { Product } from "./store";

export function fullProductLabel(p: Pick<Product, 'name' | 'brand' | 'model'>): string {
  const parts: string[] = [p.name];
  const tail: string[] = [];
  if (p.brand) tail.push(p.brand);
  if (p.model) tail.push(p.model);
  if (tail.length > 0) return `${p.name} — ${tail.join(' · ')}`;
  return parts.join('');
}

export function fullProductLabelById(productId: string, products: Array<Pick<Product, 'id' | 'name' | 'brand' | 'model'>>, fallback?: string): string {
  const p = products.find(x => x.id === productId);
  if (!p) return fallback || '—';
  return fullProductLabel(p);
}
