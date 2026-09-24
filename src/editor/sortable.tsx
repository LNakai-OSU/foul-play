import { useState, type CSSProperties, type ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type Announcements,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

export interface HandleProps {
  handle: ReactNode;
  isDragging: boolean;
}

function SortableItem<T extends { id: string }>({
  item,
  index,
  label,
  children,
}: {
  item: T;
  index: number;
  label: string;
  children: (item: T, index: number, h: HandleProps) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style: CSSProperties = { transform: CSS.Transform.toString(transform), transition, position: 'relative', zIndex: isDragging ? 10 : undefined };
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className="icon-btn icon-btn--sm drag-handle state-layer"
      aria-label={`Reorder ${label}. Press space to lift, arrow keys to move, space to drop.`}
      title="Drag to reorder (or focus and press Space, then use arrow keys)"
      {...attributes}
      {...listeners}
    >
      <GripVertical />
    </button>
  );
  return (
    <div ref={setNodeRef} style={style} data-sortable-id={item.id}>
      {children(item, index, { handle, isDragging })}
    </div>
  );
}

/** Vertical drag-and-drop list (pointer + keyboard accessible). */
export function SortableList<T extends { id: string }>({
  items,
  onMove,
  itemLabel,
  children,
  className,
}: {
  items: T[];
  onMove: (from: number, to: number) => void;
  itemLabel: (item: T, index: number) => string;
  children: (item: T, index: number, h: HandleProps) => ReactNode;
  className?: string;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const [, setActive] = useState<string | null>(null);
  const nameOf = (id: string | number) => {
    const i = items.findIndex((x) => x.id === id);
    return i >= 0 ? itemLabel(items[i] as T, i) : 'item';
  };
  const posOf = (id: string | number) => items.findIndex((x) => x.id === id) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}, position ${posOf(active.id)} of ${items.length}.`,
    onDragOver: ({ active, over }) => (over ? `${nameOf(active.id)} is over position ${posOf(over.id)} of ${items.length}.` : undefined),
    onDragEnd: ({ active, over }) => (over ? `${nameOf(active.id)} dropped at position ${posOf(over.id)} of ${items.length}.` : `${nameOf(active.id)} dropped.`),
    onDragCancel: ({ active }) => `Reordering ${nameOf(active.id)} cancelled.`,
  };
  const end = (e: DragEndEvent) => {
    setActive(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((x) => x.id === active.id);
    const to = items.findIndex((x) => x.id === over.id);
    if (from >= 0 && to >= 0) onMove(from, to);
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e: DragStartEvent) => setActive(String(e.active.id))} onDragEnd={end} onDragCancel={() => setActive(null)} accessibility={{ announcements }}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {items.map((item, i) => (
            <SortableItem key={item.id} item={item} index={i} label={itemLabel(item, i)}>
              {children}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
