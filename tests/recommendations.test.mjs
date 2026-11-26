import test from "node:test";
import assert from "node:assert/strict";
import { runSchema, isProcessing, toolLabels } from "../src/features/recommendations/schema.ts";
const id = "00000000-0000-4000-8000-000000000001";
const run = { id, produce_batch_id: id, status: "queued", approval: "pending", revision: 0, created_at: "2026-11-16T01:00:00Z", updated_at: "2026-11-16T01:00:00Z", constraints: { produce_batch_id: id }, mode: "mock", selected_tools: [], tool_outcomes: [], decision_summaries: [], missing_inputs: [], warnings: [], comparison: null, recommendation: null, steps: 0 };
test("processing and paused states control polling without treating missing input as failure", () => {
  assert.equal(isProcessing("queued"), true);
  assert.equal(isProcessing("running"), true);
  for (const status of ["needs_input", "completed", "failed"]) assert.equal(isProcessing(status), false);
  assert.equal(runSchema.parse({ ...run, status: "needs_input", missing_inputs: ["Enter capacity"] }).missing_inputs[0], "Enter capacity");
});
test("run schema retains exact tool-derived net and approval", () => {
  const parsed = runSchema.parse({ ...run, status: "completed", approval: "accepted", recommendation: { market_id: "dambulla-dec", market_name: "Dambulla", expected_net_proceeds_lkr: "1000000000000000.01", explanation: "Verified scenario only." } });
  assert.equal(parsed.recommendation.expected_net_proceeds_lkr, "1000000000000000.01");
  assert.equal(parsed.approval, "accepted");
  for (const invalid of [{ approval: "sold" }, { selected_tools: ["make_payment"] }, { status: "selling" }, { revision: -1 }]) assert.equal(runSchema.safeParse({ ...run, ...invalid }).success, false);
});
test("only actual typed tool traces are displayed", () => {
  const parsed = runSchema.parse({ ...run, selected_tools: ["market_comparison"], tool_outcomes: [{ tool: "market_comparison", status: "failed", attempt: 2, summary: "Tool unavailable", completed_at: run.created_at }] });
  assert.equal(parsed.tool_outcomes[0].attempt, 2);
  assert.match(toolLabels.market_comparison, /Calculate/);
});
