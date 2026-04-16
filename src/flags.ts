import { flag, dedupe } from 'flags/next';
import { vercelAdapter } from '@flags-sdk/vercel';

// ---------------------------------------------------------------------------
// Identify — provides user context for per-user targeting in the dashboard
// ---------------------------------------------------------------------------

const identify = dedupe(async () => {
  const { auth } = await import('@/auth');
  const session = await auth();
  if (!session?.user) return {};
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      plan: session.user.plan,
      role: session.user.role,
    },
  };
});

// Use Vercel adapter when FLAGS env var is present (Vercel deployments).
// When missing (local dev / CI), flags fall back to decide() which returns
// the defaultValue. Set FLAGS locally via `vercel env pull` to use dashboard values.
const useVercel = !!process.env.FLAGS;

// ---------------------------------------------------------------------------
// Flags — managed from Vercel project dashboard
// ---------------------------------------------------------------------------

export const aiEnabled = flag<boolean>({
  key: 'ai-enabled',
  description: 'Global kill switch for AI analysis features',
  defaultValue: false,
  identify,
  ...(useVercel ? { adapter: vercelAdapter() } : { decide: () => false }),
  options: [
    { value: true, label: 'Enabled' },
    { value: false, label: 'Disabled' },
  ],
});

export const aiBetaAccess = flag<boolean>({
  key: 'ai-beta-access',
  description: 'User-targeted AI access (use dashboard targeting rules)',
  defaultValue: false,
  identify,
  ...(useVercel ? { adapter: vercelAdapter() } : { decide: () => false }),
  options: [
    { value: true, label: 'Enabled' },
    { value: false, label: 'Disabled' },
  ],
});

export const registrationOpen = flag<boolean>({
  key: 'registration-open',
  description: 'Controls public registration page visibility',
  defaultValue: false,
  identify,
  ...(useVercel ? { adapter: vercelAdapter() } : { decide: () => false }),
  options: [
    { value: true, label: 'Open' },
    { value: false, label: 'Closed' },
  ],
});

export const subscriptionsEnabled = flag<boolean>({
  key: 'subscriptions-enabled',
  description: 'Enables plan limit enforcement and billing UI',
  defaultValue: false,
  identify,
  ...(useVercel ? { adapter: vercelAdapter() } : { decide: () => false }),
  options: [
    { value: true, label: 'Enabled' },
    { value: false, label: 'Disabled' },
  ],
});
