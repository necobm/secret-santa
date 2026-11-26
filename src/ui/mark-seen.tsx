"use client";

import { useEffect } from "react";

/**
 * Marks the Assignment as Seen when it is really shown in a browser.
 * Done on the client so that neither Next's prefetching nor link previews
 * (WhatsApp, etc.) count as Seen.
 */
export function MarkSeen({ action }: { action: () => Promise<void> }) {
  useEffect(() => {
    void action();
  }, [action]);
  return null;
}
