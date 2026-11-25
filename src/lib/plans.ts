import "server-only";
import { all } from "./db";
import { resolveFeatures, type Features } from "./features";

export interface PlanRow {
  id: string;
  name: string;
  price: string;
  description: string;
  features: Features;
  is_default: boolean;
  sort: number;
  users?: number;
}

const g = globalThis as unknown as { __godaPlans?: { at: number; rows: PlanRow[] } };

export async function getPlans(fresh = false): Promise<PlanRow[]> {
  if (!fresh && g.__godaPlans && Date.now() - g.__godaPlans.at < 30_000) return g.__godaPlans.rows;
  const rows = await all<PlanRow & { features: string }>("SELECT * FROM plans ORDER BY sort, created_at");
  const parsed = rows.map((r) => ({ ...r, features: JSON.parse(r.features || "{}") as Features, is_default: !!r.is_default }));
  g.__godaPlans = { at: Date.now(), rows: parsed };
  return parsed;
}

export const invalidatePlans = () => (g.__godaPlans = undefined);

export async function defaultPlanId() {
  const p = await getPlans();
  return (p.find((x) => x.is_default) ?? p[0])?.id ?? "free";
}

export async function featuresFor(user: { role: string; plan: string; features: string }) {
  const plans = await getPlans();
  const plan = plans.find((p) => p.id === user.plan) ?? plans.find((p) => p.is_default);
  return resolveFeatures(user, plan);
}
