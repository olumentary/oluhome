import { Link2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShareDialog } from '@/components/share/share-dialog';
import { ActiveSharesTable } from '@/components/share/active-shares-table';
import { getActiveShares } from '@/app/(dashboard)/items/share-actions';

export default async function SettingsPage() {
  const shares = await getActiveShares();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and share links.
        </p>
      </div>

      {/* Active Shares */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <Link2 className="size-5 text-muted-foreground" />
            <CardTitle className="text-base">Active Share Links</CardTitle>
          </div>
          <ShareDialog
            scope="collection"
            scopeId="collection"
            scopeLabel="Entire Collection"
          />
        </CardHeader>
        <CardContent>
          <ActiveSharesTable shares={shares} />
        </CardContent>
      </Card>
    </div>
  );
}
