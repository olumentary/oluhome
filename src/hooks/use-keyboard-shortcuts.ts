import { useEffect } from 'react';

interface ShortcutConfig {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  handler: (e: KeyboardEvent) => void;
  enabled?: boolean;
}

/**
 * Register multiple keyboard shortcuts. Cleans up on unmount.
 * By default shortcuts with meta/ctrl are enabled; plain keys (like Escape)
 * are only triggered when no input/textarea is focused.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue;

        const metaMatch = shortcut.meta
          ? e.metaKey || e.ctrlKey
          : !e.metaKey && !e.ctrlKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : true;

        if (e.key === shortcut.key && metaMatch && shiftMatch) {
          // For shortcuts without meta/ctrl, skip if user is typing
          if (!shortcut.meta && !shortcut.ctrl && isInput) continue;

          e.preventDefault();
          shortcut.handler(e);
          return;
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
