import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { PlanFeature } from '@/types';

const featureLabels: Record<PlanFeature, { title: string; description: string }> = {
  items: {
    title: 'More Collection Items',
    description: 'Upgrade to catalog more items in your collection.',
  },
  photos: {
    title: 'More Photos Per Item',
    description: 'Upgrade to add more photos to each item.',
  },
  storage: {
    title: 'More Storage',
    description: 'Upgrade for additional photo storage space.',
  },
  custom_types: {
    title: 'Custom Item Types',
    description: 'Upgrade to create more custom item types.',
  },
  ai_analyses: {
    title: 'AI Analysis',
    description: 'Upgrade to Pro for more AI-powered analyses each month.',
  },
  pdf_exports: {
    title: 'PDF Exports',
    description: 'Upgrade for unlimited PDF exports of your catalog.',
  },
  share_links: {
    title: 'Share Links',
    description: 'Upgrade to share your collection with others.',
  },
  batch_pdf: {
    title: 'Batch PDF Export',
    description: 'Upgrade to export multiple items as a single PDF.',
  },
  analytics: {
    title: 'Collection Analytics',
    description: 'Upgrade to unlock insights about your collection.',
  },
};

export function UpgradePrompt({ feature }: { feature: PlanFeature }) {
  const info = featureLabels[feature];

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-base">
          Unlock {info.title}
        </CardTitle>
        <CardDescription>{info.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild size="sm">
          <Link href="/settings/billing">Upgrade to Pro</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
