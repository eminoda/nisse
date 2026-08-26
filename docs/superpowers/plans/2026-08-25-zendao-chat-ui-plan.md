# ZenTao Chat and Extension UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make chat responses readable and truthful, expose ZenTao bug list/detail tools through the Agent, and improve the extension’s theme, composer, and tool status UI.

**Architecture:** The runtime will construct a ZenTao service from the configured ZenTao connection and inject it into Agent tools. The Agent will expose status, bug-list, and bug-detail tools; status will report ZenTao bug data only and will not invent Jenkins/build data. The extension will render assistant Markdown through a small safe renderer, use CSS variables for light/dark themes, and show tool execution as an icon/name/status row.

**Tech Stack:** TypeScript, Vercel AI SDK, Zod, Vue 3, CSS custom properties, Node test runner.

---

### Task 1: Agent ZenTao tool contract

**Files:**
- Modify: `packages/agent/src/tools/mock-work-status.ts`
- Modify: `packages/agent/src/runtime.ts`
- Modify: `packages/agent/src/index.ts`
- Test: `packages/agent/test/mock-tool.test.mjs`

- [ ] **Step 1: Write failing tests** for status without `builds`, bug list returning structured bugs, bug detail requiring a positive ID, and tool descriptions containing ZenTao intent.
- [ ] **Step 2: Run `pnpm --filter @nisse/agent test` and confirm the new assertions fail against the fixed mock-only tools.
- [ ] **Step 3: Add an injected `ZenTaoToolGateway` interface and register `get_my_bugs` and `get_bug_detail`; make `get_current_work_status` return ZenTao bug count and no build count.
- [ ] **Step 4: Run the Agent tests and confirm all pass.

### Task 2: Runtime ZenTao connection injection

**Files:**
- Modify: `packages/runtime/src/config.ts`
- Modify: `packages/runtime/src/connections/manager.ts`
- Test: `packages/runtime/test/config.test.mjs`

- [ ] **Step 1: Write a failing test proving the configured ZenTao connection is converted to a service gateway for Agent tools.
- [ ] **Step 2: Run the focused Runtime test and confirm it fails because Agent only receives the model configuration.
- [ ] **Step 3: Implement the gateway using the existing ZenTao service and connection fields; preserve the existing connection form and secret handling.
- [ ] **Step 4: Run Runtime tests and confirm ZenTao tool calls use the configured endpoint/account.

### Task 3: Safe Markdown message rendering

**Files:**
- Modify: `apps/extension/src/components/ChatMessageList.vue`
- Modify: `apps/extension/src/styles/main.css`
- Test: `apps/extension/src/components/ChatMessageList.test.ts` (or the existing extension test location)

- [ ] **Step 1: Write a failing rendering test for bold text, unordered lists, fenced code, and escaped raw HTML.
- [ ] **Step 2: Run the focused Extension test and confirm the current plain-text rendering fails.
- [ ] **Step 3: Implement a small allowlisted Markdown renderer without injecting arbitrary HTML; render assistant messages as HTML and user messages as plain text.
- [ ] **Step 4: Run the focused rendering test and confirm it passes.

### Task 4: Extension theme and interaction polish

**Files:**
- Modify: `apps/extension/src/App.vue`
- Modify: `apps/extension/src/components/ChatComposer.vue`
- Modify: `apps/extension/src/components/ChatView.vue`
- Modify: `apps/extension/src/composables/useMockChat.ts`
- Modify: `apps/extension/src/styles/main.css`
- Test: `apps/extension/src/components/ChatView.test.ts` (or the existing extension test location)

- [ ] **Step 1: Write failing UI tests for light theme default, theme toggle, vertically aligned send button, and tool status containing icon plus tool name.
- [ ] **Step 2: Run the focused Extension test and confirm the current UI fails these assertions.
- [ ] **Step 3: Add a theme button in the top-right with `light` as the initial state and persisted preference; use semantic CSS variables for both themes.
- [ ] **Step 4: Align composer text/button with a single flex row and replace the plain `✓ 查询完成` line with a compact tool status card showing icon, human-readable tool name, and state.
- [ ] **Step 5: Run the focused Extension test and confirm it passes.

### Task 5: Full verification

**Files:** None.

- [ ] **Step 1: Run `pnpm --filter @nisse/agent test`.
- [ ] **Step 2: Run `pnpm --filter @nisse/runtime test`.
- [ ] **Step 3: Run `pnpm build`, `pnpm typecheck`, `pnpm lint`, and `git diff --check`.
- [ ] **Step 4: Run one local chat request for status, bug list, and bug detail; verify no build count appears and tool completion events are emitted.
