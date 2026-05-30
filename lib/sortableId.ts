/**
 * Generate a stable, unique id for a form list row.
 *
 * dnd-kit identifies sortable items by a stable `id` rather than array index,
 * so every reorderable row needs one assigned when it first appears (on load
 * or when the user adds a row).
 */
export const newSortableId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
