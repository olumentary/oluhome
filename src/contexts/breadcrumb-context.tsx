'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

interface BreadcrumbContextValue {
  titles: Record<string, string>;
  setTitle: (segment: string, title: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  titles: {},
  setTitle: () => {},
});

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [titles, setTitles] = useState<Record<string, string>>({});

  const setTitle = useCallback((segment: string, title: string) => {
    setTitles((prev) => {
      if (prev[segment] === title) return prev;
      return { ...prev, [segment]: title };
    });
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ titles, setTitle }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbs() {
  return useContext(BreadcrumbContext);
}
