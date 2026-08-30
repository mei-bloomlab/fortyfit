import { STUDIO_GRAPH_NAME } from "@/lib/engineering/rules";
import type { LoopName, LoopTick } from "@/lib/engineering/loop";

export type GraphNodeId =
  | "scan_balance"
  | "enqueue_reminder"
  | "dispatch_wa"
  | "human_review"
  | "complete_session"
  | "log_workout";

export type GraphEdge = {
  from: GraphNodeId | "START";
  to: GraphNodeId | "END";
  when: string;
};

export type GraphTrace = {
  node: GraphNodeId | "START" | "END";
  when: string;
  ticks?: LoopTick[];
  note?: string;
};

export type OpsState = {
  trigger: "scan" | "dispatch" | "complete_session" | "log_workout";
  threshold: number;
  customerId?: string;
  appointmentId?: string;
  packId?: string;
  remaining?: number;
  reminderIds: string[];
  traces: GraphTrace[];
};

export const FORTYFIT_OPS_GRAPH: {
  name: string;
  nodes: { id: GraphNodeId; job: string; loop?: LoopName; kind: "loop" | "deterministic" | "human" }[];
  edges: GraphEdge[];
} = {
  name: STUDIO_GRAPH_NAME,
  nodes: [
    {
      id: "scan_balance",
      job: "Hitung sisa sesi tiap paket aktif",
      loop: "session_balance",
      kind: "loop",
    },
    {
      id: "enqueue_reminder",
      job: "Buat antrian WA jika sisa sesi di bawah ambang",
      kind: "deterministic",
    },
    {
      id: "dispatch_wa",
      job: "Kirim reminder lewat OpenWA, verify, retry",
      loop: "reminder_dispatch",
      kind: "loop",
    },
    {
      id: "human_review",
      job: "Coach putuskan kirim ulang atau skip",
      kind: "human",
    },
    {
      id: "complete_session",
      job: "Tandai janji selesai dan potong 1 sesi",
      loop: "attendance",
      kind: "loop",
    },
    {
      id: "log_workout",
      job: "Catat latihan apa di tanggal berapa",
      loop: "workout_log",
      kind: "loop",
    },
  ],
  edges: [
    { from: "START", to: "scan_balance", when: "scan" },
    { from: "START", to: "dispatch_wa", when: "dispatch" },
    { from: "START", to: "complete_session", when: "complete_session" },
    { from: "START", to: "log_workout", when: "log_workout" },
    { from: "scan_balance", to: "enqueue_reminder", when: "low_sessions" },
    { from: "scan_balance", to: "END", when: "healthy" },
    { from: "enqueue_reminder", to: "dispatch_wa", when: "queued" },
    { from: "enqueue_reminder", to: "END", when: "already_queued" },
    { from: "dispatch_wa", to: "END", when: "sent" },
    { from: "dispatch_wa", to: "dispatch_wa", when: "retry" },
    { from: "dispatch_wa", to: "human_review", when: "exhausted" },
    { from: "dispatch_wa", to: "END", when: "idle" },
    { from: "complete_session", to: "log_workout", when: "needs_log" },
    { from: "complete_session", to: "scan_balance", when: "logged" },
    { from: "log_workout", to: "scan_balance", when: "saved" },
    { from: "human_review", to: "dispatch_wa", when: "retry" },
    { from: "human_review", to: "END", when: "skip" },
  ],
};

export function startState(
  trigger: OpsState["trigger"],
  extras: Partial<OpsState> = {},
): OpsState {
  return {
    trigger,
    threshold: extras.threshold ?? 3,
    reminderIds: extras.reminderIds ?? [],
    traces: [{ node: "START", when: trigger }],
    ...extras,
  };
}

export function appendTrace(state: OpsState, trace: GraphTrace): OpsState {
  return { ...state, traces: [...state.traces, trace] };
}
