// Espelha PROJECT_COLOR_PALETTE em backend/app/models.py - sincronia manual,
// sem codegen. Mantenha as duas listas idênticas se precisar alterar.
export const PROJECT_COLOR_PALETTE = [
  '#3b82f6', // blue (accent do app)
  '#10b981', // green (status online)
  '#f59e0b', // amber (status warning)
  '#ef4444', // red (status offline)
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#f97316', // orange
];

export function projectInitials(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
