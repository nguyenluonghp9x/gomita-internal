"use client";

import { useEffect, useState } from "react";

type SsePayload = {
  type?: string;
  count?: number;
};

export function useNotificationUnreadStream(initialCount: number) {
  const [liveUnread, setLiveUnread] = useState(initialCount);

  useEffect(() => {
    const es = new EventSource("/api/notifications/stream");
    const onMessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(String(e.data)) as SsePayload;
        if (
          (data.type === "connected" || data.type === "unread") &&
          typeof data.count === "number"
        ) {
          setLiveUnread(data.count);
        }
      } catch {
        /* ignore malformed */
      }
    };
    es.addEventListener("message", onMessage);
    return () => {
      es.removeEventListener("message", onMessage);
      es.close();
    };
  }, []);

  return liveUnread;
}
