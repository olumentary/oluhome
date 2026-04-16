import {
  Link2,
  User,
  Settings2,
  Shield,
  Download,
  CreditCard,
} from 'lucide-react';
import Link from 'next/link';
import { requireAuth } from '@/lib/auth-helpers';
import { subscriptionsEnabled } from '@/flags';
import { getPlanLimits } from '@/lib/plans';
import { getCurrentUsage } from '@/lib/usage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShareDialog } from '@/components/share/share-dialog';
import { ActiveSharesTable } from '@/components/share/active-shares-table';
import { getActiveShares } from '@/app/(dashboard)/items/share-actions';
import { ProfileSection } from './profile-section';
import { PreferencesSection } from './preferences-section';
import { ExportSection } from './export-section';
import { DangerZone } from './danger-zone';
import { SubscriptionSection } from './subscription-section';

export default async function SettingsPage() {
  const user = await requireAuth();
  const [shares, showSubscriptions] = await Promise.all([
    getActiveShares(),
    subscriptionsEnabled(),
  ]);

  // Load subscription data if flag is on
  let planLimits = null;
  let usage = null;
  if (showSubscriptions) {
    [planLimits, usage] = await Promise.all([
      getPlanLimits(user.plan),
      getCurrentUsage(user.id),
    ]);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, preferences, and data.
        </p>
      </div>

      {/* Profile */}
      <ProfileSection userName={user.name} userEmail={user.email} />

      {/* Preferences */}
      <PreferencesSection />

      {/* Subscription (conditional on flag) */}
      {showSubscriptions && planLimits && usage && (
        <SubscriptionSection
          plan={user.plan}
          planLimits={planLimits}
          usage={usage}
        />
      )}

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

      {/* Data Export */}
      <ExportSection />

      {/* Danger Zone */}
      <DangerZone />
    </div>
  );
}
