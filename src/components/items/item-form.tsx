'use client';

import { useActionState, useEffect, useState, useCallback, useTransition, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  createItem,
  updateItem,
  type ItemActionState,
} from '@/app/(dashboard)/items/actions';
import { searchVendors, createVendor } from '@/app/(dashboard)/vendors/actions';
import { toast } from 'sonner';
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import type { CollectionItemType, FieldSchema, FieldDefinition, CustomFieldValues } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VendorOption {
  id: string;
  name: string;
  businessName: string | null;
  type: string | null;
}

interface ItemFormProps {
  id?: string;
  itemTypes: CollectionItemType[];
  existingRooms: string[];
  initialVendorId?: string;
  initialVendorLabel?: string;
  initialValues?: {
    itemTypeId: string;
    title: string;
    description: string;
    period: string;
    style: string;
    originCountry: string;
    originRegion: string;
    makerAttribution: string;
    materials: string[];
    condition: string;
    conditionNotes: string;
    height: string;
    width: string;
    depth: string;
    diameter: string;
    weight: string;
    room: string;
    positionInRoom: string;
    customFields: CustomFieldValues;
    provenanceNarrative: string;
    provenanceReferences: string;
    notes: string;
    tags: string[];
    status: string;
  };
}

const CONDITIONS = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'very_good', label: 'Very Good' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'sold', label: 'Sold' },
  { value: 'gifted', label: 'Gifted' },
  { value: 'stored', label: 'Stored' },
  { value: 'on_loan', label: 'On Loan' },
];

// ---------------------------------------------------------------------------
// Tag Input sub-component
// ---------------------------------------------------------------------------

function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState('');

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = input.trim();
      if (trimmed && !value.includes(trimmed)) {
        onChange([...value, trimmed]);
      }
      setInput('');
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-3 py-1.5 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
      {value.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 py-0.5 text-xs">
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : ''}
        className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dynamic field renderer
// ---------------------------------------------------------------------------

function DynamicField({
  field,
  value,
  onChange,
}: {
  field: FieldDefinition;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}) {
  switch (field.type) {
    case 'text':
    case 'url':
      return (
        <div className="space-y-1.5">
          <Label htmlFor={`custom-${field.key}`}>
            {field.label}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <Input
            id={`custom-${field.key}`}
            type={field.type === 'url' ? 'url' : 'text'}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(field.key, e.target.value || undefined)}
            placeholder={field.type === 'url' ? 'https://...' : undefined}
          />
          {field.unit && (
            <p className="text-xs text-muted-foreground">{field.unit}</p>
          )}
        </div>
      );

    case 'textarea':
      return (
        <div className="space-y-1.5">
          <Label htmlFor={`custom-${field.key}`}>
            {field.label}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <Textarea
            id={`custom-${field.key}`}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(field.key, e.target.value || undefined)}
            rows={3}
          />
        </div>
      );

    case 'number':
      return (
        <div className="space-y-1.5">
          <Label htmlFor={`custom-${field.key}`}>
            {field.label}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id={`custom-${field.key}`}
              type="number"
              step="any"
              min={field.min}
              max={field.max}
              value={value != null ? String(value) : ''}
              onChange={(e) =>
                onChange(
                  field.key,
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
            />
            {field.unit && (
              <span className="text-sm text-muted-foreground">{field.unit}</span>
            )}
          </div>
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center gap-3 py-2">
          <Switch
            id={`custom-${field.key}`}
            checked={(value as boolean) ?? false}
            onCheckedChange={(checked) => onChange(field.key, checked)}
          />
          <Label htmlFor={`custom-${field.key}`} className="cursor-pointer">
            {field.label}
          </Label>
        </div>
      );

    case 'select':
      return (
        <div className="space-y-1.5">
          <Label>
            {field.label}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <Select
            value={(value as string) ?? ''}
            onValueChange={(v) => onChange(field.key, v || undefined)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case 'multi_select':
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {field.options?.map((opt) => {
              const selected = Array.isArray(value) ? value.includes(opt) : false;
              return (
                <label
                  key={opt}
                  className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
                >
                  <Checkbox
                    checked={selected}
                    onCheckedChange={(checked) => {
                      const current = Array.isArray(value) ? value : [];
                      onChange(
                        field.key,
                        checked
                          ? [...current, opt]
                          : current.filter((v: string) => v !== opt),
                      );
                    }}
                  />
                  {opt}
                </label>
              );
            })}
          </div>
        </div>
      );

    case 'date':
      return (
        <div className="space-y-1.5">
          <Label htmlFor={`custom-${field.key}`}>
            {field.label}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>
          <Input
            id={`custom-${field.key}`}
            type="date"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(field.key, e.target.value || undefined)}
          />
        </div>
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Main ItemForm component
// ---------------------------------------------------------------------------

export function ItemForm({ id, itemTypes, existingRooms, initialVendorId, initialVendorLabel, initialValues }: ItemFormProps) {
  const isEditing = !!id;
  const router = useRouter();
  const action = isEditing ? updateItem : createItem;
  const [state, formAction, pending] = useActionState<ItemActionState | null, FormData>(
    action,
    null,
  );

  // Vendor selector state
  const [vendorId, setVendorId] = useState(initialVendorId ?? '');
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorOptions, setVendorOptions] = useState<VendorOption[]>([]);
  const [vendorOpen, setVendorOpen] = useState(false);
  const [selectedVendorLabel, setSelectedVendorLabel] = useState(initialVendorLabel ?? '');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddPending, setQuickAddPending] = useState(false);
  const [, startVendorSearch] = useTransition();

  // Load vendor options on mount and when searching
  const handleVendorSearch = useCallback(
    (query: string) => {
      setVendorSearch(query);
      startVendorSearch(async () => {
        const results = await searchVendors(query);
        setVendorOptions(results);
      });
    },
    [startVendorSearch],
  );

  useEffect(() => {
    startVendorSearch(async () => {
      const results = await searchVendors('');
      setVendorOptions(results);
    });
  }, [startVendorSearch]);

  // Base fields state
  const [itemTypeId, setItemTypeId] = useState(initialValues?.itemTypeId ?? '');
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [period, setPeriod] = useState(initialValues?.period ?? '');
  const [style, setStyle] = useState(initialValues?.style ?? '');
  const [originCountry, setOriginCountry] = useState(initialValues?.originCountry ?? '');
  const [originRegion, setOriginRegion] = useState(initialValues?.originRegion ?? '');
  const [makerAttribution, setMakerAttribution] = useState(initialValues?.makerAttribution ?? '');
  const [materials, setMaterials] = useState<string[]>(initialValues?.materials ?? []);
  const [condition, setCondition] = useState(initialValues?.condition ?? '');
  const [conditionNotes, setConditionNotes] = useState(initialValues?.conditionNotes ?? '');
  const [height, setHeight] = useState(initialValues?.height ?? '');
  const [width, setWidth] = useState(initialValues?.width ?? '');
  const [depth, setDepth] = useState(initialValues?.depth ?? '');
  const [diameter, setDiameter] = useState(initialValues?.diameter ?? '');
  const [weight, setWeight] = useState(initialValues?.weight ?? '');
  const [room, setRoom] = useState(initialValues?.room ?? '');
  const [positionInRoom, setPositionInRoom] = useState(initialValues?.positionInRoom ?? '');
  const [customFields, setCustomFields] = useState<CustomFieldValues>(
    initialValues?.customFields ?? {},
  );
  const [provenanceNarrative, setProvenanceNarrative] = useState(
    initialValues?.provenanceNarrative ?? '',
  );
  const [provenanceReferences, setProvenanceReferences] = useState(
    initialValues?.provenanceReferences ?? '',
  );
  const [notes, setNotes] = useState(initialValues?.notes ?? '');
  const [tags, setTags] = useState<string[]>(initialValues?.tags ?? []);
  const [status, setStatus] = useState(initialValues?.status ?? 'active');

  // Derive current type's field schema
  const selectedType = itemTypes.find((t) => t.id === itemTypeId);
  const fieldSchema = selectedType?.fieldSchema as FieldSchema | null;

  // Group custom fields by their "group" property
  const fieldGroups = fieldSchema?.fields
    ? Object.entries(
        fieldSchema.fields.reduce<Record<string, FieldDefinition[]>>(
          (acc, field) => {
            const group = field.group || 'General';
            if (!acc[group]) acc[group] = [];
            acc[group].push(field);
            return acc;
          },
          {},
        ),
      )
    : [];

  // Reset custom fields when type changes
  const handleTypeChange = useCallback(
    (newTypeId: string) => {
      setItemTypeId(newTypeId);
      setCustomFields({});
    },
    [],
  );

  const handleCustomFieldChange = useCallback(
    (key: string, value: unknown) => {
      setCustomFields((prev) => ({ ...prev, [key]: value as CustomFieldValues[string] }));
    },
    [],
  );

  // Quick-add vendor: create with just a name, then select it
  async function handleQuickAddVendor() {
    const trimmed = quickAddName.trim();
    if (!trimmed) return;
    setQuickAddPending(true);
    try {
      const fd = new FormData();
      fd.set('json', JSON.stringify({ name: trimmed }));
      const result = await createVendor(null, fd);
      if (result.error) {
        toast.error(result.error);
      } else if (result.id) {
        setVendorId(result.id);
        setSelectedVendorLabel(trimmed);
        setQuickAddOpen(false);
        toast.success('Vendor added');
        // Refresh vendor options
        const results = await searchVendors('');
        setVendorOptions(results);
      }
    } catch {
      toast.error('Failed to create vendor');
    }
    setQuickAddPending(false);
  }

  // Navigate on success
  useEffect(() => {
    if (state?.success && state.id) {
      toast.success(isEditing ? 'Item updated' : 'Item created');
      router.push(`/items/${state.id}`);
    }
  }, [state, isEditing, router]);

  function handleSubmit(formData: FormData) {
    const payload = {
      itemTypeId,
      title,
      description: description || undefined,
      period: period || undefined,
      style: style || undefined,
      originCountry: originCountry || undefined,
      originRegion: originRegion || undefined,
      makerAttribution: makerAttribution || undefined,
      materials: materials.length ? materials : undefined,
      condition: condition || undefined,
      conditionNotes: conditionNotes || undefined,
      height: height ? Number(height) : undefined,
      width: width ? Number(width) : undefined,
      depth: depth ? Number(depth) : undefined,
      diameter: diameter ? Number(diameter) : undefined,
      weight: weight ? Number(weight) : undefined,
      room: room || undefined,
      positionInRoom: positionInRoom || undefined,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
      provenanceNarrative: provenanceNarrative || undefined,
      provenanceReferences: provenanceReferences || undefined,
      notes: notes || undefined,
      tags: tags.length ? tags : undefined,
      status: status || undefined,
    };
    formData.set('json', JSON.stringify(payload));
    if (id) formData.set('id', id);
    formData.set('vendorId', vendorId);
    formAction(formData);
  }

  // Sections that are open by default
  const defaultOpen = isEditing
    ? ['core']
    : ['core', 'materials', 'dimensions', 'custom', 'location', 'provenance', 'notes', 'status'];

  return (
    <form action={handleSubmit} className="space-y-6">
      {state?.error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-4">
        {/* Section 1 — Core Identity */}
        <AccordionItem value="core" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="text-base font-semibold">
            Core Identity
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-6">
            <div className="space-y-1.5">
              <Label htmlFor="item-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="item-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chippendale Highboy"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="item-description">Description</Label>
              <Textarea
                id="item-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the item..."
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Item Type <span className="text-destructive">*</span>
              </Label>
              <Select value={itemTypeId} onValueChange={handleTypeChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an item type" />
                </SelectTrigger>
                <SelectContent>
                  {itemTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="item-period">Period</Label>
                <Input
                  id="item-period"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder="e.g. Georgian, Art Deco"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item-style">Style</Label>
                <Input
                  id="item-style"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  placeholder="e.g. Chippendale, Queen Anne"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item-origin-country">Origin Country</Label>
                <Input
                  id="item-origin-country"
                  value={originCountry}
                  onChange={(e) => setOriginCountry(e.target.value)}
                  placeholder="e.g. England, France"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item-origin-region">Origin Region</Label>
                <Input
                  id="item-origin-region"
                  value={originRegion}
                  onChange={(e) => setOriginRegion(e.target.value)}
                  placeholder="e.g. Philadelphia, Provence"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="item-maker">Maker / Attribution</Label>
              <Input
                id="item-maker"
                value={makerAttribution}
                onChange={(e) => setMakerAttribution(e.target.value)}
                placeholder="e.g. Thomas Chippendale, attributed to..."
              />
            </div>

            {/* Vendor selector */}
            <div className="space-y-1.5">
              <Label>Vendor / Source</Label>
              <div className="flex gap-2">
                <Popover open={vendorOpen} onOpenChange={setVendorOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={vendorOpen}
                      className="flex-1 justify-between font-normal"
                      type="button"
                    >
                      {selectedVendorLabel || 'Select vendor...'}
                      <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search vendors..."
                        value={vendorSearch}
                        onValueChange={handleVendorSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No vendors found.</CommandEmpty>
                        <CommandGroup>
                          {vendorId && (
                            <CommandItem
                              value=""
                              onSelect={() => {
                                setVendorId('');
                                setSelectedVendorLabel('');
                                setVendorOpen(false);
                              }}
                            >
                              <X className="mr-2 size-4 text-muted-foreground" />
                              Clear selection
                            </CommandItem>
                          )}
                          {vendorOptions.map((v) => {
                            const label = v.businessName
                              ? `${v.name} (${v.businessName})`
                              : v.name;
                            return (
                              <CommandItem
                                key={v.id}
                                value={v.id}
                                onSelect={() => {
                                  setVendorId(v.id);
                                  setSelectedVendorLabel(label);
                                  setVendorOpen(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 size-4 ${
                                    vendorId === v.id
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  }`}
                                />
                                {label}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setQuickAddName('');
                    setQuickAddOpen(true);
                  }}
                  title="Add new vendor"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Optionally link this item to a vendor. Details can be added later.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 2 — Materials & Condition */}
        <AccordionItem value="materials" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="text-base font-semibold">
            Materials & Condition
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-6">
            <div className="space-y-1.5">
              <Label>Materials</Label>
              <TagInput
                value={materials}
                onChange={setMaterials}
                placeholder="Type a material and press Enter"
              />
              {fieldSchema?.default_materials && fieldSchema.default_materials.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-xs text-muted-foreground">Suggestions:</span>
                  {fieldSchema.default_materials
                    .filter((m) => !materials.includes(m))
                    .map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMaterials([...materials, m])}
                        className="rounded-full border bg-background px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                      >
                        + {m}
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Condition</Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="item-condition-notes">Condition Notes</Label>
              <Textarea
                id="item-condition-notes"
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
                placeholder="Describe any damage, repairs, or condition details..."
                rows={3}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 3 — Overall Dimensions */}
        <AccordionItem value="dimensions" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="text-base font-semibold">
            Overall Dimensions
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="item-height">Height</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="item-height"
                    type="number"
                    step="0.01"
                    min="0"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="0.00"
                  />
                  <span className="text-sm text-muted-foreground">in.</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item-width">Width</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="item-width"
                    type="number"
                    step="0.01"
                    min="0"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    placeholder="0.00"
                  />
                  <span className="text-sm text-muted-foreground">in.</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item-depth">Depth</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="item-depth"
                    type="number"
                    step="0.01"
                    min="0"
                    value={depth}
                    onChange={(e) => setDepth(e.target.value)}
                    placeholder="0.00"
                  />
                  <span className="text-sm text-muted-foreground">in.</span>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="item-diameter">Diameter</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="item-diameter"
                    type="number"
                    step="0.01"
                    min="0"
                    value={diameter}
                    onChange={(e) => setDiameter(e.target.value)}
                    placeholder="0.00"
                  />
                  <span className="text-sm text-muted-foreground">in.</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item-weight">Weight</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="item-weight"
                    type="number"
                    step="0.01"
                    min="0"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="0.00"
                  />
                  <span className="text-sm text-muted-foreground">lbs.</span>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 4 — Custom Fields (dynamic) */}
        {fieldGroups.length > 0 && (
          <AccordionItem value="custom" className="rounded-lg border bg-card px-4">
            <AccordionTrigger className="text-base font-semibold">
              {selectedType?.name} Details
            </AccordionTrigger>
            <AccordionContent className="space-y-6 pb-6">
              {fieldGroups.map(([groupName, fields]) => (
                <div key={groupName}>
                  {fieldGroups.length > 1 && (
                    <h4 className="mb-3 text-sm font-semibold text-muted-foreground">
                      {groupName}
                    </h4>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {fields.map((field) => {
                      const isWide =
                        field.type === 'textarea' ||
                        field.type === 'multi_select';
                      return (
                        <div
                          key={field.key}
                          className={isWide ? 'sm:col-span-2' : ''}
                        >
                          <DynamicField
                            field={field}
                            value={customFields[field.key]}
                            onChange={handleCustomFieldChange}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Section 5 — Location */}
        <AccordionItem value="location" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="text-base font-semibold">
            Location
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="item-room">Room</Label>
                <Input
                  id="item-room"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="e.g. Living Room, Library"
                  list="room-list"
                />
                <datalist id="room-list">
                  {existingRooms.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item-position">Position in Room</Label>
                <Input
                  id="item-position"
                  value={positionInRoom}
                  onChange={(e) => setPositionInRoom(e.target.value)}
                  placeholder="e.g. North wall, by the window"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 6 — Provenance */}
        <AccordionItem value="provenance" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="text-base font-semibold">
            Provenance
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-6">
            <div className="space-y-1.5">
              <Label htmlFor="item-provenance">Provenance Narrative</Label>
              <Textarea
                id="item-provenance"
                value={provenanceNarrative}
                onChange={(e) => setProvenanceNarrative(e.target.value)}
                placeholder="Describe the ownership history, exhibition history, publication references..."
                rows={5}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-prov-refs">Provenance References</Label>
              <Textarea
                id="item-prov-refs"
                value={provenanceReferences}
                onChange={(e) => setProvenanceReferences(e.target.value)}
                placeholder="Auction catalogues, books, dealer invoices..."
                rows={3}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 7 — Notes & Tags */}
        <AccordionItem value="notes" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="text-base font-semibold">
            Notes & Tags
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-6">
            <div className="space-y-1.5">
              <Label htmlFor="item-notes">Notes</Label>
              <Textarea
                id="item-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tags</Label>
              <TagInput
                value={tags}
                onChange={setTags}
                placeholder="Type a tag and press Enter"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 8 — Status */}
        <AccordionItem value="status" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="text-base font-semibold">
            Status
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-6">
            <div className="space-y-1.5">
              <Label>Item Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending
            ? isEditing
              ? 'Saving...'
              : 'Creating...'
            : isEditing
              ? 'Save Changes'
              : 'Create Item'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      {/* Quick-add vendor dialog */}
      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Quick Add Vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="quick-vendor-name">Name *</Label>
            <Input
              id="quick-vendor-name"
              value={quickAddName}
              onChange={(e) => setQuickAddName(e.target.value)}
              placeholder="Vendor or seller name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (quickAddName.trim()) {
                    handleQuickAddVendor();
                  }
                }
              }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              You can fill in contact details and other info later from the Vendors page.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQuickAddOpen(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleQuickAddVendor}
              disabled={!quickAddName.trim() || quickAddPending}
              type="button"
            >
              {quickAddPending ? 'Adding...' : 'Add Vendor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
