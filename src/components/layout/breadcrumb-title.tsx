'use client';

import { useLayoutEffect, useEffect } from 'react';
import { useBreadcrumbs } from '@/contexts/breadcrumb-context';

// useLayoutEffect fires before browser paint (prevents UUID flash on navigation).
// Fall back to useEffect on the server to avoid SSR warnings.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface BreadcrumbTitleProps {
  segment: string;
  title: string;
}

export function BreadcrumbTitle({ segment, title }: BreadcrumbTitleProps) {
  const { setTitle } = useBreadcrumbs();

  useIsomorphicLayoutEffect(() => {
    setTitle(segment, title);
  }, [segment, title, setTitle]);

  return null;
}
