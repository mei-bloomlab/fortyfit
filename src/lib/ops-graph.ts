import { prisma } from "@/lib/db";
import {
  appendTrace,
  startState,
  type GraphTrace,
  type OpsState,
} from "@/lib/engineering/graph";
import { DEFAULT_THRESHOLD, STUDIO_GRAPH_NAME } from "@/lib/engineering/rules";
import { runAttendanceLoop } from "@/lib/loops/attendance";
import { runReminderDispatchLoop } from "@/lib/loops/reminder-dispatch";
import {
  notifyAdminOnRemainingDrop,
  runSessionBalanceLoop,
} from "@/lib/loops/session-balance";
import { runWorkoutLogLoop, type WorkoutInput } from "@/lib/loops/workout-log";

async function persistRun(state: OpsState) {
  await prisma.graphRun.create({
    data: {
      graph: STUDIO_GRAPH_NAME,
      trigger: state.trigger,
      tracesJson: JSON.stringify(state.traces),
    },
  });
}

function lastRoute(ticks: { verdict: { route: string } }[]): string {
  return ticks.at(-1)?.verdict.route ?? "END";
}

export async function runOpsGraph(input: {
  trigger: OpsState["trigger"];
  appointmentId?: string;
  workout?: WorkoutInput;
}): Promise<OpsState> {
  const settings = await prisma.studioSettings.upsert({
    where: { id: "fortyfit" },
    update: {},
    create: { id: "fortyfit", reminderThreshold: DEFAULT_THRESHOLD },
  });

  let state = startState(input.trigger, {
    threshold: settings.reminderThreshold,
    appointmentId: input.appointmentId,
  });

  if (input.trigger === "complete_session" && input.appointmentId) {
    const ticks = await runAttendanceLoop(input.appointmentId);
    state = appendTrace(state, {
      node: "complete_session",
      when: lastRoute(ticks),
      ticks,
    });
    const route = lastRoute(ticks);
    if (route === "log_workout" && input.workout) {
      const workoutTicks = await runWorkoutLogLoop(input.workout);
      state = appendTrace(state, {
        node: "log_workout",
        when: lastRoute(workoutTicks),
        ticks: workoutTicks,
      });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: input.appointmentId },
      select: { packId: true },
    });
    if (appointment?.packId && settings.autoNotifyAdmin) {
      const notice = await notifyAdminOnRemainingDrop(appointment.packId);
      if (notice.createdId) {
        state = {
          ...appendTrace(state, {
            node: "enqueue_reminder",
            when: "queued",
            note: notice.reason,
          }),
          reminderIds: [...state.reminderIds, notice.createdId],
        };
      }
    }
  }

  if (input.trigger === "log_workout" && input.workout) {
    const ticks = await runWorkoutLogLoop(input.workout);
    state = appendTrace(state, {
      node: "log_workout",
      when: lastRoute(ticks),
      ticks,
    });
  }

  const shouldScan =
    input.trigger === "scan" ||
    (settings.autoNotifyAdmin && input.trigger === "complete_session");

  if (shouldScan) {
    const ticks = await runSessionBalanceLoop(settings.reminderThreshold);
    const route = lastRoute(ticks);
    state = appendTrace(state, { node: "scan_balance", when: route, ticks });

    if (route === "enqueue_reminder") {
      const created =
        ticks.at(-1)?.action &&
        typeof ticks.at(-1)?.action === "object" &&
        ticks.at(-1)?.action !== null &&
        "createdIds" in (ticks.at(-1)?.action as object)
          ? (ticks.at(-1)?.action as { createdIds: string[] }).createdIds
          : [];
      state = {
        ...appendTrace(state, {
          node: "enqueue_reminder",
          when: created.length > 0 ? "queued" : "already_queued",
          note: `${created.length} reminder masuk antrian`,
        }),
        reminderIds: [...new Set([...state.reminderIds, ...created])],
      };
    }
  }

  if (input.trigger === "dispatch" || state.reminderIds.length > 0) {
    const ticks = await runReminderDispatchLoop();
    state = appendTrace(state, {
      node: "dispatch_wa",
      when: lastRoute(ticks),
      ticks,
    });
  }

  state = appendTrace(state, { node: "END", when: "done" } satisfies GraphTrace);
  await persistRun(state);
  return state;
}

export async function listRecentGraphRuns(take = 8) {
  const rows = await prisma.graphRun.findMany({
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map((row) => ({
    ...row,
    traces: JSON.parse(row.tracesJson) as GraphTrace[],
  }));
}
