import { notFound } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { validateShareToken } from '@/lib/share';

interface SharedLayoutProps {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}

export default async function SharedLayout({
  children,
  params,
}: SharedLayoutProps) {
  const { token } = await params;
  const validated = await validateShareToken(token);

  if (!validated) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SharedHeader ownerName={null} />
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="max-w-md text-center space-y-4">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
              <AlertTriangle className="size-8 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">
              Link Expired or Unavailable
            </h1>
            <p className="text-sm text-muted-foreground">
              This shared link has expired or is no longer available. Contact the
              collection owner for a new link.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Check if expiring within 7 days
  const expiringWarning =
    validated.expiresAt &&
    validated.expiresAt.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SharedHeader ownerName={validated.ownerName} />
      {expiringWarning && (
        <div className="border-b border-warning/20 bg-warning/5 px-4 py-2 text-center text-sm text-warning">
          This shared link expires on{' '}
          {new Date(validated.expiresAt!).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>
      )}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
      <footer className="border-t px-4 py-4 text-center text-xs text-muted-foreground">
        Powered by Curiolu
      </footer>
    </div>
  );
}

function SharedHeader({ ownerName }: { ownerName: string | null }) {
  return (
    <header className="border-b bg-surface px-4 py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <span className="text-lg font-bold tracking-tight text-foreground">
          Curiolu
        </span>
        {ownerName && (
          <span className="text-sm text-muted-foreground">
            Shared by {ownerName}
          </span>
        )}
      </div>
    </header>
  );
}
