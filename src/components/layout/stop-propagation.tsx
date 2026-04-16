'use client';

/**
 * A wrapper that stops click events from propagating to parent elements.
 * Useful when placing interactive elements (like dialogs) inside a Link.
 */
export function StopPropagation({ children }: { children: React.ReactNode }) {
  return (
    <div onClick={(e) => e.preventDefault()} onKeyDown={(e) => e.stopPropagation()}>
      {children}
    </div>
  );
}
