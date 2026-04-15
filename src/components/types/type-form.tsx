'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldSchemaBuilder } from './field-schema-builder';
import { IconPicker } from './icon-picker';
import {
  createItemType,
  updateItemType,
  type TypeActionState,
} from '@/app/(dashboard)/types/actions';
import { toast } from 'sonner';
import type { FieldSchema } from '@/types';

function nameToSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/--+/g, '-');
}

interface TypeFormProps {
  id?: string;
  initialValues?: {
    name: string;
    slug: string;
    description: string;
    icon: string;
    fieldSchema: FieldSchema;
  };
}

export function TypeForm({ id, initialValues }: TypeFormProps) {
  const isEditing = !!id;
  const router = useRouter();
  const action = isEditing ? updateItemType : createItemType;
  const [state, formAction, pending] = useActionState<TypeActionState | null, FormData>(
    action,
    null,
  );

  const [name, setName] = useState(initialValues?.name ?? '');
  const [slug, setSlug] = useState(initialValues?.slug ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [icon, setIcon] = useState(initialValues?.icon ?? '');
  const [fieldSchema, setFieldSchema] = useState<FieldSchema>(
    initialValues?.fieldSchema ?? { fields: [] },
  );
  const [slugTouched, setSlugTouched] = useState(isEditing);

  // Auto-generate slug from name
  function handleNameChange(val: string) {
    setName(val);
    if (!slugTouched) {
      setSlug(nameToSlug(val));
    }
  }

  // Navigate on success
  useEffect(() => {
    if (state?.success && state.id) {
      toast.success(isEditing ? 'Type updated' : 'Type created');
      router.push('/types');
    }
  }, [state, isEditing, router]);

  function handleSubmit(formData: FormData) {
    const payload = {
      name,
      slug,
      description,
      icon,
      fieldSchema,
    };
    formData.set('json', JSON.stringify(payload));
    if (id) formData.set('id', id);
    formAction(formData);
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {state?.error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="type-name">Name</Label>
              <Input
                id="type-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Furniture"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type-slug">Slug</Label>
              <Input
                id="type-slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
                placeholder="e.g. furniture"
                className="font-mono text-sm"
                required
              />
              <p className="text-xs text-muted-foreground">
                URL-safe identifier
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="type-description">Description</Label>
            <Textarea
              id="type-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What kind of items does this type cover?"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Icon</Label>
            <IconPicker value={icon} onChange={setIcon} />
          </div>
        </CardContent>
      </Card>

      {/* Field Schema Builder */}
      <Card>
        <CardHeader>
          <CardTitle>Field Schema</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldSchemaBuilder value={fieldSchema} onChange={setFieldSchema} />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending
            ? isEditing
              ? 'Saving...'
              : 'Creating...'
            : isEditing
              ? 'Save Changes'
              : 'Create Type'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
