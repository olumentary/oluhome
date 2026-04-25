'use client';

import { useState } from 'react';
import {
  Armchair,
  BookOpen,
  Clock,
  CupSoda,
  Frame,
  Lamp,
  Medal,
  RectangleHorizontal,
  Shirt,
  Wine,
  Gem,
  Crown,
  Palette,
  Camera,
  Music,
  Feather,
  Flower2,
  Globe,
  MapPin,
  Scroll,
  Star,
  Shapes,
  Box,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const ICONS: { name: string; icon: LucideIcon }[] = [
  { name: 'armchair', icon: Armchair },
  { name: 'book-open', icon: BookOpen },
  { name: 'clock', icon: Clock },
  { name: 'cup-soda', icon: CupSoda },
  { name: 'frame', icon: Frame },
  { name: 'lamp', icon: Lamp },
  { name: 'medal', icon: Medal },
  { name: 'rectangle-horizontal', icon: RectangleHorizontal },
  { name: 'shirt', icon: Shirt },
  { name: 'wine', icon: Wine },
  { name: 'gem', icon: Gem },
  { name: 'crown', icon: Crown },
  { name: 'palette', icon: Palette },
  { name: 'camera', icon: Camera },
  { name: 'music', icon: Music },
  { name: 'feather', icon: Feather },
  { name: 'flower-2', icon: Flower2 },
  { name: 'globe', icon: Globe },
  { name: 'map-pin', icon: MapPin },
  { name: 'scroll', icon: Scroll },
  { name: 'star', icon: Star },
  { name: 'shapes', icon: Shapes },
  { name: 'box', icon: Box },
];

function getIcon(name: string): LucideIcon {
  return ICONS.find((i) => i.name === name)?.icon ?? Shapes;
}

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const SelectedIcon = getIcon(value);
  const filtered = filter
    ? ICONS.filter((i) => i.name.includes(filter.toLowerCase()))
    : ICONS;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          <SelectedIcon className="size-4" />
          <span className="flex-1 text-left text-sm">
            {value || 'Choose icon...'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-3" align="start">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter icons..."
          className="mb-2 h-8 text-sm"
        />
        <div className="grid max-h-48 grid-cols-6 gap-1 overflow-y-auto">
          {filtered.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  onChange(item.name);
                  setOpen(false);
                }}
                className={cn(
                  'flex items-center justify-center rounded-md p-2 hover:bg-accent',
                  value === item.name && 'bg-primary/10 text-primary',
                )}
                title={item.name}
              >
                <Icon className="size-4" />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { getIcon };
