# @nisse/mcp-zentao

ZenTao RESTful API v2.0 MCP server for nisse.

## Connection

Configure the connection through the Extension `Connections` page:

- API 地址：ZenTao instance URL, for example `https://zentao.example.com`
- 账号：ZenTao account name
- 密码：ZenTao password

The service calls `POST /api.php/v2/users/login` and keeps the returned API token in Runtime memory. The token and password are never included in tool output.

## Tools

- `get_my_bugs`: traverses projects and returns bugs assigned to the configured account. Supports `projectId`, `status` (`all`/`unresolved`), and `pageSize`.
- `get_bug_detail`: reads a bug by positive integer `bugId`.
- `resolve_bug`: resolves a bug using ZenTao's documented resolution values. This is a write operation and is marked as requiring approval; Phase 13 supplies the Runtime approval interceptor.

## Local development

```powershell
pnpm --filter @nisse/mcp-zentao build
pnpm --filter @nisse/mcp-zentao test
```

For direct stdio execution, set `ZENTAO_ENDPOINT`, `ZENTAO_ACCOUNT`, and `ZENTAO_PASSWORD` before running `pnpm --filter @nisse/mcp-zentao start`.
