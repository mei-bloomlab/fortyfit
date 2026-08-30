import { MAX_DISPATCH_ATTEMPTS } from "@/lib/engineering/rules";

export type LoopName =
  | "session_balance"
  | "reminder_dispatch"
  | "attendance"
  | "workout_log";

export type LoopDecision<TPayload = unknown> =
  | { kind: "stop"; reason: string }
  | { kind: "act"; action: string; payload: TPayload };

export type LoopVerdict = {
  ok: boolean;
  reason: string;
  route: string;
};

export type LoopTick<TObs = unknown, TAct = unknown> = {
  name: LoopName;
  observed: TObs;
  decision: string;
  action?: TAct;
  verdict: LoopVerdict;
  attempt: number;
};

export type LoopContract<TObs, TAct, TPayload = unknown> = {
  name: LoopName;
  maxAttempts?: number;
  observe: () => Promise<TObs>;
  decide: (obs: TObs) => LoopDecision<TPayload>;
  act: (payload: TPayload, obs: TObs) => Promise<TAct>;
  verify: (obs: TObs, act: TAct) => LoopVerdict;
};

export async function runLoop<TObs, TAct, TPayload>(
  contract: LoopContract<TObs, TAct, TPayload>,
): Promise<LoopTick<TObs, TAct>[]> {
  const ticks: LoopTick<TObs, TAct>[] = [];
  const maxAttempts = contract.maxAttempts ?? MAX_DISPATCH_ATTEMPTS;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const observed = await contract.observe();
    const decision = contract.decide(observed);

    if (decision.kind === "stop") {
      ticks.push({
        name: contract.name,
        observed,
        decision: "stop",
        verdict: { ok: true, reason: decision.reason, route: "END" },
        attempt,
      });
      break;
    }

    const action = await contract.act(decision.payload, observed);
    const verdict = contract.verify(observed, action);
    ticks.push({
      name: contract.name,
      observed,
      decision: decision.action,
      action,
      verdict,
      attempt,
    });

    if (verdict.ok || verdict.route !== contract.name) {
      break;
    }
  }

  return ticks;
}
