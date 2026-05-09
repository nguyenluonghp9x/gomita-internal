import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac/permissions";
import { countUnreadNotifications } from "@/server/services/notification-service";

export const dynamic = "force-dynamic";

const POLL_MIN = 5000;
const POLL_MAX = 60000;

function pollIntervalMs(): number {
  const raw = Number(process.env.NOTIFICATION_SSE_POLL_MS);
  if (!Number.isFinite(raw)) return 10_000;
  return Math.min(POLL_MAX, Math.max(POLL_MIN, Math.floor(raw)));
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  if (!(await hasPermission(userId, "notifications.view"))) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  const intervalMs = pollIntervalMs();
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let pollTimer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      let lastCount: number | null = null;

      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        const count = await countUnreadNotifications(userId);
        lastCount = count;
        send({ type: "connected", count });
      } catch {
        send({ type: "error", message: "initial_failed" });
        controller.close();
        return;
      }

      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"));
      }, 25_000);

      pollTimer = setInterval(async () => {
        try {
          const c = await countUnreadNotifications(userId);
          if (c !== lastCount) {
            lastCount = c;
            send({ type: "unread", count: c });
          }
        } catch {
          send({ type: "error", message: "poll_failed" });
        }
      }, intervalMs);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (pollTimer) clearInterval(pollTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
