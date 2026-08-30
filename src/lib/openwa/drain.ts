import { OPENWA_DRAIN_INTERVAL_MS } from "@/lib/engineering/rules";
import { enqueueMorningDigestIfDue } from "@/lib/loops/morning-digest";
import { dispatchPendingRemindersFromSidecar } from "@/lib/loops/reminder-dispatch";

export async function runOpenWaDrainTick(now = new Date()) {
  const digest = await enqueueMorningDigestIfDue(now);
  const dispatch = await dispatchPendingRemindersFromSidecar();
  return { digest, dispatch };
}

export function startOpenWaDrain(intervalMs = OPENWA_DRAIN_INTERVAL_MS) {
  const tick = async () => {
    try {
      const result = await runOpenWaDrainTick();
      if (!result.digest.skipped) {
        console.log(`[openwa-drain] ${result.digest.reason}`);
      }
      const { sent, failed, exhausted, deferred } = result.dispatch;
      if (sent.length || failed.length || exhausted.length) {
        console.log(
          `[openwa-drain] terkirim ${sent.length}, gagal ${failed.length}, habis percobaan ${exhausted.length}, nunggu sidecar ${deferred.length}`,
        );
      } else if (deferred.length > 0) {
        console.log(
          `[openwa-drain] ${deferred.length} antrian menunggu OpenWA siap (scan QR).`,
        );
      }
    } catch (error) {
      console.error(
        "[openwa-drain]",
        error instanceof Error ? error.message : error,
      );
    }
  };

  void tick();
  return setInterval(() => {
    void tick();
  }, intervalMs);
}
