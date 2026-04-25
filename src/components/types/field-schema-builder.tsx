'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  Asterisk,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FieldDialog } from './field-dialog';
import { MeasurementPresets } from './measurement-presets';
import { DefaultMaterials } from './default-materials';
import { FieldPreview } from './field-preview';
import type { FieldDefinition, FieldSchema, FieldType } from '@/types';

const FIELD_TYPE_COLORS: Record<FieldType, string> = {
  text: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  textarea: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  number: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  boolean: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  select: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  multi_select: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  date: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  url: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
};

interface FieldSchemaBuilderProps {
  value: FieldSchema;
  onChange: (value: FieldSchema) => void;
}

export function FieldSchemaBuilder({ value, onChange }: FieldSchemaBuilderProps) {
  const [editingField, setEditingField] = useState<FieldDefinition | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [dialogOpen, setDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const fields = value.fields ?? [];
  const existingGroups = [...new Set(fields.map((f) => f.group).filter(Boolean))];

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex((f) => f.key === active.id);
    const newIndex = fields.findIndex((f) => f.key === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onChange({ ...value, fields: arrayMove(fields, oldIndex, newIndex) });
  }

  function handleAddField() {
    setEditingField(null);
    setEditingIndex(-1);
    setDialogOpen(true);
  }

  function handleEditField(field: FieldDefinition, index: number) {
    setEditingField(field);
    setEditingIndex(index);
    setDialogOpen(true);
  }

  function handleDeleteField(index: number) {
    const next = [...fields];
    next.splice(index, 1);
    onChange({ ...value, fields: next });
  }

  const handleSaveField = useCallback(
    (field: FieldDefinition) => {
      const next = [...fields];
      if (editingIndex >= 0) {
        next[editingIndex] = field;
      } else {
        next.push(field);
      }
      onChange({ ...value, fields: next });
      setDialogOpen(false);
    },
    [fields, editingIndex, onChange, value],
  );

  return (
    <div className="space-y-6">
      {/* Fields list */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Custom Fields</h3>
          <Button size="sm" variant="outline" onClick={handleAddField}>
            <Plus className="size-3" />
            Add Field
          </Button>
        </div>

        {fields.length > 0 ? (
          <div className="mt-3 rounded-lg border">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={fields.map((f) => f.key)}
                strategy={verticalListSortingStrategy}
              >
                {fields.map((field, index) => (
                  <SortableFieldRow
                    key={field.key}
                    field={field}
                    index={index}
                    onEdit={() => handleEditField(field, index)}
                    onDelete={() => handleDeleteField(index)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No custom fields defined. Add fields to create the item form.
            </p>
          </div>
        )}
      </div>

      <Separator />

      {/* Measurement Presets */}
      <MeasurementPresets
        value={value.measurement_presets ?? []}
        onChange={(presets) =>
          onChange({ ...value, measurement_presets: presets })
        }
      />

      <Separator />

      {/* Default Materials */}
      <DefaultMaterials
        value={value.default_materials ?? []}
        onChange={(materials) =>
          onChange({ ...value, default_materials: materials })
        }
      />

      <Separator />

      {/* Live Preview */}
      <FieldPreview fields={fields} />

      {/* Field Dialog */}
      <FieldDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        field={editingField}
        existingGroups={existingGroups}
        existingKeys={fields.filter((_, i) => i !== editingIndex).map((f) => f.key)}
        onSave={handleSaveField}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable Field Row
// ---------------------------------------------------------------------------

interface SortableFieldRowProps {
  field: FieldDefinition;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableFieldRow({ field, onEdit, onDelete }: SortableFieldRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 border-b px-3 py-2 last:border-b-0 hover:bg-muted/50"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{field.label}</span>
          {field.required && (
            <Asterisk className="size-3 text-destructive" />
          )}
        </div>
        <span className="text-xs text-muted-foreground">{field.key}</span>
      </div>

      <Badge
        variant="secondary"
        className={`text-[10px] ${FIELD_TYPE_COLORS[field.type]}`}
      >
        {field.type.replace('_', ' ')}
      </Badge>

      {field.group && field.group !== 'General' && (
        <Badge variant="outline" className="text-[10px]">
          {field.group}
        </Badge>
      )}

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onEdit}
          className="text-muted-foreground hover:text-foreground"
        >
          <Pencil className="size-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
    </div>
  );
}
