import { flag } from 'flags/next';

export const aiEnabled = flag<boolean>({
  key: 'ai-enabled',
  description: 'Global kill switch for AI analysis features',
  defaultValue: false,
  decide() {
    return false;
  },
});

export const aiBetaAccess = flag<boolean>({
  key: 'ai-beta-access',
  description: 'User-targeted AI access (admin plan always true)',
  defaultValue: false,
  async decide() {
    const { auth } = await import('@/auth');
    const session = await auth();
    if (session?.user?.plan === 'admin') return true;
    return false;
  },
});

export const registrationOpen = flag<boolean>({
  key: 'registration-open',
  description: 'Controls public registration page visibility',
  defaultValue: false,
  decide() {
    return false;
  },
});

export const subscriptionsEnabled = flag<boolean>({
  key: 'subscriptions-enabled',
  description: 'Enables plan limit enforcement and billing UI',
  defaultValue: false,
  decide() {
    return false;
  },
});
