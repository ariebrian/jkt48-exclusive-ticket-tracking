const CATEGORY_LABELS: Record<string, string> = {
  DIGITAL_PHOTOBOOK: 'Video Call',
  PHOTOCARD: 'Meet and Greet',
  TWO_SHOT: '2Shot',
};

// Falls back to the raw category (or a generic label) for any category
// code not yet in the mapping, so an unrecognized value never disappears.
export function getCategoryLabel(category: string | null | undefined): string {
  if (!category) return 'Event';
  return CATEGORY_LABELS[category] ?? category;
}
