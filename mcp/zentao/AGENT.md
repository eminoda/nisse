# ZenTao Agent Guide

Use this MCP when the user asks about ZenTao projects or Bugs.

## Recommended call order

1. Use `get_my_bugs` for a broad status request.
2. Use `get_bug_detail` before discussing or changing a specific Bug.
3. Use `resolve_bug` only after the user explicitly asks to resolve it and Runtime approval is available.

## Tool semantics

- `get_my_bugs` is read-only. It queries projects, then project Bug lists, and filters `assignedTo` by the configured account.
- `get_bug_detail` is read-only and should be used to confirm the target Bug before any write.
- `resolve_bug` changes remote state. Explain the chosen resolution and preserve the user's requested comment/build/date. Never invent undocumented ZenTao fields.

If the target Bug or its intended resolution is uncertain, query its detail first and ask the user rather than guessing.
