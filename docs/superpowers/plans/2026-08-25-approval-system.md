# Approval System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a generic in-memory approval flow that blocks write actions until the user approves them.

**Architecture:** Runtime owns an `ApprovalStore` with injected actions and exposes approval endpoints plus SSE notifications. Extension renders pending approvals in Chat and calls the endpoints; tests use a Mock write action.

**Tech Stack:** TypeScript, Hono, Vue 3, Node test runner.

---

### Task 1: Approval Store

**Files:** Create `packages/runtime/src/approvals/store.ts`, `packages/runtime/src/approvals/index.ts`; test `packages/runtime/test/approval.test.mjs`.

- [ ] Write failing tests for pending creation, approve execution, reject, expiry, and duplicate resolution.
- [ ] Run the focused test and observe the expected missing-module failure.
- [ ] Implement the minimal store with 5-minute expiry and status transitions.
- [ ] Run the focused test and verify all cases pass.

### Task 2: Runtime API and events

**Files:** Modify `packages/runtime/src/app.ts`; test `packages/runtime/test/approval-api.test.mjs`.

- [ ] Write failing tests for authenticated approve/reject endpoints and `approval.required`/`approval.resolved` events.
- [ ] Implement app-level store injection, JSON-safe approval summaries, and endpoint handling.
- [ ] Run Runtime tests and verify they pass without regressions.

### Task 3: Extension Approval Card

**Files:** Modify `apps/extension/src/runtime/client.ts`, `apps/extension/src/components/ChatView.vue`, `apps/extension/src/styles/main.css`; create `apps/extension/src/components/ApprovalCard.vue`.

- [ ] Add RuntimeClient approve/reject methods and approval event parsing.
- [ ] Render pending approval cards with confirm/cancel actions and result state.
- [ ] Run extension typecheck/build and verify the UI compiles.

### Task 4: Verification and TODO

**Files:** Modify `TODO.md`.

- [ ] Run build, typecheck, lint, Runtime tests, and extension build.
- [ ] Mark only completed Phase 13 items; leave real LLM/ZenTao end-to-end approval unchecked.
- [ ] Run `git diff --check`; do not commit.
