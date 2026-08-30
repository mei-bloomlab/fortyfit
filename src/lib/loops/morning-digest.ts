import { prisma } from "@/lib/db";
import { DEFAULT_THRESHOLD, STUDIO_TIMEZONE } from "@/lib/engineering/rules";
import {
  formatDigestDateLabel,
  isDigestDue,
  normalizeDigestTime,
  zonedClock,
} from "@/lib/openwa/digest";
import { MORNING_DIGEST_KIND, buildMorningDigestMessage } from "@/lib/openwa/messages";
import { observeSessionBalance } from "@/lib/loops/session-balance";

export async function enqueueMorningDigestIfDue(now = new Date()): Promise<{
  createdId?: string;
  skipped: boolean;
  reason: string;
  localDate?: string;
}> {
  const settings = await prisma.studioSettings.upsert({
    where: { id: "fortyfit" },
    update: {},
    create: { id: "fortyfit", reminderThreshold: DEFAULT_THRESHOLD },
  });

  const timeZone = settings.timezone || STUDIO_TIMEZONE;
  const clockTime = normalizeDigestTime(settings.morningDigestTime);
  const clock = zonedClock(now, timeZone);

  if (!settings.morningDigestEnabled) {
    return { skipped: true, reason: "Ringkasan pagi sedang mati" };
  }
  if (
    !isDigestDue({
      now,
      timeZone,
      clockTime,
      lastSentOn: settings.lastMorningDigestOn,
    })
  ) {
    return {
      skipped: true,
      reason:
        settings.lastMorningDigestOn === clock.date
          ? `Ringkasan pagi ${clock.date} sudah dicatat`
          : `Belum jam ${clockTime} ${timeZone}`,
      localDate: clock.date,
    };
  }

  const claimed = await prisma.studioSettings.updateMany({
    where: {
      id: "fortyfit",
      OR: [{ lastMorningDigestOn: null }, { lastMorningDigestOn: { not: clock.date } }],
    },
    data: { lastMorningDigestOn: clock.date },
  });
  if (claimed.count === 0) {
    return {
      skipped: true,
      reason: `Ringkasan pagi ${clock.date} sudah dicatat`,
      localDate: clock.date,
    };
  }

  const observation = await observeSessionBalance(settings.reminderThreshold);
  const reminder = await prisma.reminder.create({
    data: {
      kind: MORNING_DIGEST_KIND,
      channel: "whatsapp",
      payload: buildMorningDigestMessage({
        dateLabel: formatDigestDateLabel(now, timeZone),
        threshold: settings.reminderThreshold,
        customers: observation.lowPacks.map((pack) => ({
          name: pack.customerName,
          phone: pack.phone,
          program: pack.program,
          remaining: pack.remaining,
        })),
      }),
    },
  });

  return {
    createdId: reminder.id,
    skipped: false,
    reason: `Ringkasan pagi ${clock.date} masuk antrian`,
    localDate: clock.date,
  };
}
