# ZenTao MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ZenTao endpoint/account/password configuration and a stdio MCP server exposing `get_my_bugs`, `get_bug_detail`, and `resolve_bug`.

**Architecture:** Register a dynamic ZenTao Connection Schema in the existing runtime Connection Manager. Keep credentials in the existing Secret Store and inject a `ZenTaoService` into focused MCP tools; the service performs login and authenticated API calls while tools return structured MCP content and risk metadata.

**Tech Stack:** TypeScript, Node.js, `@modelcontextprotocol/sdk`, existing `@nisse/runtime` connection/secret abstractions, Node test runner.

---

### Task 1: Add ZenTao connection schema and secret-aware runtime configuration

**Files:**
- Inspect/Modify: `packages/runtime/src/connections/manager.ts`, `packages/runtime/src/connections/index.ts`, `packages/runtime/src/app.ts`
- Inspect/Modify: `packages/shared/src/connection.ts`
- Test: `packages/runtime/test/zentao-connection.test.mjs`

- [ ] **Step 1: Write failing tests** for a ZenTao schema with URL/account/password fields, password marked secret, and validation of required endpoint/account/password.
- [ ] **Step 2: Run the focused test** and verify it fails because the ZenTao schema is not registered.
- [ ] **Step 3: Implement the schema and registration** using the existing dynamic connection model without adding a ZenTao-specific UI component.
- [ ] **Step 4: Run the focused test** and verify it passes.

### Task 2: Implement the ZenTao HTTP service

**Files:**
- Create: `mcp/zentao/src/services/zentao-service.ts`
- Create: `mcp/zentao/src/services/types.ts`
- Modify: `mcp/zentao/package.json`, `mcp/zentao/tsconfig.json`
- Test: `mcp/zentao/test/zentao-service.test.mjs`

- [ ] **Step 1: Write failing tests** covering `POST /api.php/v2/users/login`, the `token` header on authenticated requests, URL normalization, ZenTao `status=fail`, non-2xx responses, invalid JSON, and request body serialization.
- [ ] **Step 2: Run the focused service tests** and verify they fail because the service does not exist.
- [ ] **Step 3: Implement minimal `ZenTaoService`** with injected `fetch`, endpoint normalization, login, `listProjects`, `listProjectBugs`, `getBugDetail`, and `resolveBug` methods. Do not log or return credentials/tokens.
- [ ] **Step 4: Run the focused service tests** and verify they pass.

### Task 3: Implement read-only MCP tools

**Files:**
- Create: `mcp/zentao/src/tools/get-my-bugs.ts`
- Create: `mcp/zentao/src/tools/get-bug-detail.ts`
- Test: `mcp/zentao/test/tools.test.mjs`

- [ ] **Step 1: Write failing tests** for project traversal, optional project filtering, `all/unresolved` browse type, page size bounds, `assignedTo` filtering, and positive integer bug ID validation.
- [ ] **Step 2: Run the focused tool tests** and verify they fail because the tools do not exist.
- [ ] **Step 3: Implement the tools** with injected service dependencies and stable JSON text content; include a filtering note when account context is missing.
- [ ] **Step 4: Run the focused tool tests** and verify they pass.

### Task 4: Implement resolve tool metadata and MCP server entrypoint

**Files:**
- Create: `mcp/zentao/src/tools/resolve-bug.ts`
- Create: `mcp/zentao/src/index.ts`
- Create: `mcp/zentao/README.md`
- Create: `mcp/zentao/AGENT.md`
- Test: `mcp/zentao/test/resolve-tool.test.mjs`, `mcp/zentao/test/server.test.mjs`

- [ ] **Step 1: Write failing tests** for the documented resolution enum, optional resolve fields, exact PUT payload, and `risk=write`/`approvalRequired=true` metadata.
- [ ] **Step 2: Run the focused tests** and verify they fail because the write tool/server are not implemented.
- [ ] **Step 3: Implement the resolve tool and stdio MCP server** with the three tools, descriptions, input schemas, and service construction from environment-provided connection values.
- [ ] **Step 4: Add README and AGENT guidance** describing connection fields, tool semantics, safe call order, and resolve risk.
- [ ] **Step 5: Run the focused tests** and verify they pass.

### Task 5: Integrate, verify, and update TODO

**Files:**
- Modify: `pnpm-workspace.yaml` or package metadata only if required by workspace discovery
- Modify: `TODO.md`
- Test: workspace build/typecheck/lint and all relevant package tests

- [ ] **Step 1: Build the new MCP package** and run its complete test suite.
- [ ] **Step 2: Run root `pnpm build`, `pnpm typecheck`, and `pnpm lint`** and fix only issues caused by this feature.
- [ ] **Step 3: Run the existing runtime and connection tests** to catch regressions.
- [ ] **Step 4: Mark only completed Phase 12 items in `TODO.md`**, leaving real-user API verification unchecked until credentials are supplied.
- [ ] **Step 5: Run `git diff --check` and inspect status**; do not commit unless explicitly requested.
