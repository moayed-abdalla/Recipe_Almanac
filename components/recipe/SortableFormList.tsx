'use client';

import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * Renders a single row's contents. The provided `handle` node must be placed
 * where the drag grip should live; only that node activates dragging.
 */
type RenderItem<T> = (
  item: T,
  index: number,
  handle: React.ReactNode
) => React.ReactNode;

interface SortableFormListProps<T extends { id: string }> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: RenderItem<T>;
  /** Class applied to each row wrapper (the element that slides). */
  itemClassName?: string;
  /** Extra classes for the grip button (e.g. top margin to align with a textarea). */
  gripClassName?: string;
  /** Accessible label for the grip, given the row index. */
  gripLabel?: (index: number) => string;
}

const GRIP_BASE =
  'cursor-grab active:cursor-grabbing touch-none select-none text-base-content/50 hover:text-base-content flex-shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary inline-flex items-center justify-center min-h-10 min-w-10 text-lg';

const measuring = {
  droppable: { strategy: MeasuringStrategy.Always },
};

function SortableRow<T extends { id: string }>({
  item,
  index,
  renderItem,
  itemClassName,
  gripClassName,
  gripLabel,
}: {
  item: T;
  index: number;
  renderItem: RenderItem<T>;
  itemClassName?: string;
  gripClassName?: string;
  gripLabel?: (index: number) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className={`${GRIP_BASE} ${gripClassName ?? ''}`}
      aria-label={gripLabel ? gripLabel(index) : 'Reorder'}
      {...attributes}
      {...listeners}
    >
      ⋮⋮
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${itemClassName ?? ''} ${isDragging ? 'opacity-40' : ''}`}
    >
      {renderItem(item, index, handle)}
    </div>
  );
}

export function SortableFormList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  itemClassName,
  gripClassName,
  gripLabel,
}: SortableFormListProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(arrayMove(items, oldIndex, newIndex));
      }
    }
  };

  const activeIndex = activeId ? items.findIndex((i) => i.id === activeId) : -1;
  const activeItem = activeIndex !== -1 ? items[activeIndex] : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      measuring={measuring}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {items.map((item, index) => (
          <SortableRow
            key={item.id}
            item={item}
            index={index}
            renderItem={renderItem}
            itemClassName={itemClassName}
            gripClassName={gripClassName}
            gripLabel={gripLabel}
          />
        ))}
      </SortableContext>

      <DragOverlay>
        {activeItem ? (
          <div className={`${itemClassName ?? ''} sortable-overlay pointer-events-none`}>
            {renderItem(
              activeItem,
              activeIndex,
              <span className={`${GRIP_BASE} ${gripClassName ?? ''}`} aria-hidden="true">
                ⋮⋮
              </span>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
