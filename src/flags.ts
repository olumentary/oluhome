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
// When missing (local dev, Docker, CI), flags read from OLUHOME_* env vars,
// falling back to the defaultValue. This lets self-hosters enable/disable
// features by setting env vars instead of managing a Vercel dashboard.
const useVercel = !!process.env.FLAGS;

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return fallback;
}

// ---------------------------------------------------------------------------
// Flags — managed from Vercel project dashboard (Vercel) or via env (self-host)
// ---------------------------------------------------------------------------

export const aiEnabled = flag<boolean>({
  key: 'ai-enabled',
  description: 'Global kill switch for AI analysis features',
  defaultValue: false,
  identify,
  ...(useVercel
    ? { adapter: vercelAdapter() }
    : { decide: () => envBool('OLUHOME_AI_ENABLED', false) }),
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
  ...(useVercel
    ? { adapter: vercelAdapter() }
    : { decide: () => envBool('OLUHOME_AI_BETA_ACCESS', false) }),
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
  ...(useVercel
    ? { adapter: vercelAdapter() }
    : { decide: () => envBool('OLUHOME_REGISTRATION_OPEN', false) }),
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
  ...(useVercel
    ? { adapter: vercelAdapter() }
    : { decide: () => envBool('OLUHOME_SUBSCRIPTIONS_ENABLED', false) }),
  options: [
    { value: true, label: 'Enabled' },
    { value: false, label: 'Disabled' },
  ],
});
