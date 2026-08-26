# ZenTao MCP 与连接设置设计

## 范围

本阶段实现 ZenTao 的连接配置和首批 MCP 能力，不建设独立的 ZenTao 业务工作台。Extension 继续以 Chat 为主要交互入口，Connections 页面提供 ZenTao 连接设置。

## 用户体验

在 `Connections` 页面新增 ZenTao 连接表单：

- API 地址（url）
- 账号（text）
- 密码（password）
- 保存
- Test Connection

密码保存到 Secret Store，不写入普通配置、不回显完整值、不进入日志。用户填写的 API 地址应为 ZenTao 实例地址；Service 统一补齐 `/api.php/v2`，避免调用方重复拼接路径。

## 连接与认证

Connection 的业务配置保存 endpoint 和 account，password 只保存为 secret reference。Runtime 从 Secret Store 读取密码，调用 `POST /users/login` 获取 Token，并在后续请求的 `token` 请求头中使用 Token。Token 只存在 Runtime 内存，不返回给 Extension，也不写日志。

`Test Connection` 通过登录接口验证地址和凭据，并返回不包含密码、Token 的成功或失败信息。HTTP 非 2xx、ZenTao `status=fail`、无效 JSON 和超时都转换为稳定的用户可读错误。

## MCP 包结构

新增独立包：

```text
mcp/zentao/
├─ src/
│  ├─ index.ts
│  ├─ services/zentao-service.ts
│  ├─ tools/get-my-bugs.ts
│  ├─ tools/get-bug-detail.ts
│  └─ tools/resolve-bug.ts
├─ README.md
├─ AGENT.md
├─ package.json
└─ tsconfig.json
```

`ZenTaoService` 负责认证、请求、响应解析和 API 错误处理；MCP Tools 只负责输入校验、调用 Service 和结构化输出，不直接调用 `fetch`。

## Tools

### `get_my_bugs`

ZenTao API 没有单独的跨项目“我的 Bug”接口。Tool 先调用 `GET /projects`，再对项目调用 `GET /projects/:projectID/bugs`，使用文档定义的 `browseType`、`orderBy`、`recPerPage`、`pageID` 参数。

Connection 中的 account 用于按返回字段 `assignedTo` 过滤。由于接口分页按项目返回，首版限制单次查询的项目数和每个项目的页数，避免无界请求；结果包含项目来源和过滤说明。

支持参数：

- `pageSize`：每个项目的页大小，限制在 1-1000
- `status`：`all` 或 `unresolved`
- `projectId`：可选的项目过滤

### `get_bug_detail`

调用 `GET /bugs/:bugID`，输入为正整数 `bugId`，返回 ZenTao 的 Bug 详情。

### `resolve_bug`

调用 `PUT /bugs/:bugID/resolve`。只暴露 API 文档明确支持的字段：

- `bugId`
- `resolution`：`fixed`、`notrepro`、`bydesign`、`duplicate`、`external`、`postponed`、`willnotfix`、`tostory`
- `resolvedDate`
- `resolvedBuild`
- `assignedTo`
- `comment`

该 Tool 的风险元数据为 `write` 和 `approval required`。本阶段先声明元数据；真正的 Runtime Approval 拦截属于 Phase 13。

## Runtime 集成

ZenTao Connection Schema 注册到现有 Connection Manager，使 Connections UI 无需为 ZenTao 编写专用表单组件。保存和 Test Connection 继续走现有统一 API。MCP Server 通过 stdio 接入现有 McpManager，使用 Connection Manager 提供的已解析配置和 Secret Store 适配层。

## 测试策略

- Connection Schema 能生成 API 地址、账号、密码字段，并将密码标记为 secret。
- Service 测试登录请求路径、请求体、Token 请求头和错误转换。
- Bug Tool 测试项目遍历、`assignedTo` 过滤、分页参数和无效 Bug ID。
- Resolve Tool 测试完整请求体和风险元数据。
- stdio smoke test 验证 MCP 能启动并发现三个 Tool。
- 完成后运行 workspace 的 build、typecheck、lint 和相关测试。

## 明确不包含

- ZenTao 独立 Bug 列表/详情工作台
- 浏览器直接访问 ZenTao
- Token 返回给 Extension
- Phase 13 之前的 Approval UI 和拦截执行
- 其他 ZenTao 业务（项目、任务、需求等）
