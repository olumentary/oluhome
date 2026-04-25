import { requireAuth } from '@/lib/auth-helpers';
import { ItemsListClient } from '@/components/items/items-list-client';
import { getItems, getItemTypes, getRooms } from './actions';

export default async function ItemsPage() {
  await requireAuth();

  const [initialData, itemTypes, rooms] = await Promise.all([
    getItems({ limit: 24 }),
    getItemTypes(),
    getRooms(),
  ]);

  return (
    <ItemsListClient
      initialData={initialData}
      itemTypes={itemTypes.map((t) => ({ id: t.id, name: t.name }))}
      rooms={rooms}
    />
  );
}
