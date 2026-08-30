/**
 * Planted build rules. Every feature in FortyFit Ops must obey these.
 * A loop is one job that repeats until a verifier says stop.
 * A graph is how several loops hand work to each other.
 */

export const LOOP_RULES = [
  "Every loop names one job, one observe, one act, one verifier.",
  "A loop may not invent a new path across the studio. It only works inside its node.",
  "Stop conditions live in code: max attempts, empty observation, or a hard fail.",
  "Verify after act. Never mark success from the intention to send or save.",
  "On fail, recover with a structured verdict, not a retry vibe.",
] as const;

export const GRAPH_RULES = [
  "Nodes do one job. If a node starts doing two jobs, split it.",
  "Edges are the only legal routes. No hidden jumps between features.",
  "Shared state is explicit: remaining sessions, reminder ids, appointment id.",
  "Human review is a first-class node, not a toast message.",
  "WordPress, the calendar UI, and OpenWA are adapters. They are not the graph.",
] as const;

export const STUDIO_GRAPH_NAME = "fortyfit.ops";

export const PROGRAMS = [
  "Fat Loss",
  "Fat Loss Starter",
  "Personal Training Pemula",
  "Strength Foundation",
] as const;

export const CONDITIONS = [
  "Obesitas",
  "Overweight",
  "Pemula",
  "Postur",
  "Cedera",
] as const;

export const GOALS = [
  "Mulai dari nol",
  "Turun lemak",
  "Bangun kekuatan",
  "Perbaiki postur",
] as const;

export const DEFAULT_THRESHOLD = 2;
export const MAX_DISPATCH_ATTEMPTS = 3;
export const STUDIO_TIMEZONE = "Asia/Makassar";
