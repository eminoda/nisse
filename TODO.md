# nisse — Codex Implementation TODO

> 本文档是 Codex 的开发执行清单。
>
> 不要一次性实现整个项目。
>
> 必须按照 Phase 顺序推进，每完成一个 Phase 都应保证项目能够正常运行、测试和提交。

---

# 0. Codex 全局开发规则

在执行任何任务前，遵守以下原则。

- [ ] 项目名称统一使用小写 `nisse`
- [ ] 使用 TypeScript
- [ ] Monorepo 使用 pnpm workspace + Turborepo
- [ ] Vue 项目必须使用 Vue 官方初始化工具创建
- [ ] Tauri 使用当前最新稳定版本官方初始化方式
- [ ] Windows 为第一优先平台
- [ ] 不为了 macOS/Linux 兼容提前引入复杂实现
- [ ] 不使用已经废弃的 Tauri / Vue / Vercel AI SDK API
- [ ] 引入依赖前确认当前官方推荐方式
- [ ] 避免大而全实现
- [ ] 每个任务完成后确保 lint/typecheck/build 可通过
- [ ] 每个独立能力需要有基本测试
- [ ] 所有 Secret 禁止明文提交到 Git
- [ ] `.env` 不提交
- [ ] 提供 `.env.example`
- [ ] 每个 MCP 必须独立 README
- [ ] 每个 MCP 必须独立 AGENT.md
- [ ] MCP Tool 与具体 Service 实现解耦
- [ ] 所有外部系统访问优先使用 API
- [ ] 有副作用 Tool 必须经过 Runtime Approval Policy
- [ ] Chrome Extension 不直接获取 LLM Key、密码、Token

---

# Phase 1 — Monorepo Foundation

目标：

建立可以持续扩展的 nisse Monorepo。

## 1.1 初始化 Repository

- [x] 初始化 Git Repository
- [x] 初始化 pnpm workspace
- [x] 初始化 Turborepo
- [x] 创建根目录 `package.json`
- [x] 创建 `pnpm-workspace.yaml`
- [x] 创建 `turbo.json`
- [x] 配置统一 TypeScript
- [x] 配置统一 lint
- [x] 配置统一 format
- [x] 配置 `.gitignore`
- [x] 配置 `.editorconfig`
- [x] 创建 `.env.example`

预期目录：

```text
nisse/
├─ apps/
├─ packages/
├─ mcp/
├─ package.json
├─ pnpm-workspace.yaml
├─ turbo.json
└─ README.md
```

## 验收

- [x] `pnpm install` 成功
- [x] `pnpm build` 能运行 Turborepo Pipeline
- [x] `pnpm typecheck` 可执行
- [x] `pnpm lint` 可执行

---

# Phase 2 — Chrome Extension

目标：

建立 nisse 的主交互界面。

## 2.1 初始化 Vue 3

- [x] 使用 Vue 官方初始化工具创建项目
- [x] 位置：`apps/extension`
- [x] Vue 3
- [x] TypeScript
- [x] Manifest V3
- [x] 支持 Extension Popup 或 Side Panel

优先考虑 Chrome Side Panel 作为主 Chat UI。

## 2.2 基础 UI

实现：

- [x] Header
- [x] Runtime Status
- [x] Chat Message List
- [x] User Message
- [x] Assistant Message
- [x] Chat Input
- [x] Send Button
- [x] Loading State
- [x] Error State

暂时不连接真正 Agent。

使用 Mock 数据。

## 2.3 页面结构

预留：

```text
Chat
Notifications
Automation
Connections
Settings
```

第一版重点完成：

```text
Chat
Connections
```

## 验收

- [x] Extension 可以在 Chrome 加载
- [x] Side Panel / Popup 能正常打开
- [x] 可以发送 Mock Message
- [x] 能显示 Mock Assistant Response

---

# Phase 3 — Desktop Tauri Host

目标：

建立后台常驻 Desktop Host。

## 3.1 初始化 Tauri

- [x] 使用官方 `create-tauri-app`
- [x] 使用当前最新稳定 Tauri
- [x] UI 使用 Vue 3
- [x] 目录：`apps/desktop`

Desktop UI 不建设完整 Chat。

只实现：

```text
nisse Runtime

Status: Running

Extension: Connected / Disconnected

Agent: Ready / Not configured

[Settings]
[Logs]
```

## 3.2 System Tray

- [x] 增加 Tray Icon
- [x] Show
- [x] Hide
- [x] Quit

关闭窗口时：

```text
隐藏窗口
而不是退出 Runtime
```

## 3.3 Background Runtime Lifecycle

预留：

```text
Tauri
   ↓
Node Sidecar
```

Tauri 负责：

- [ ] 启动 Sidecar
- [ ] Sidecar health check
- [ ] Sidecar crash restart
- [ ] App quit 时关闭 Sidecar

## 3.4 Auto Start

Windows：

- [x] 增加开机启动能力
- [x] Settings 可开关

## 验收

- [x] Windows 启动 Tauri
- [x] 关闭窗口后仍保留 Tray
- [x] Tray 可退出应用
- [x] Runtime 状态可查看

---

# Phase 4 — Node Runtime Sidecar

目标：

建立真正运行 Agent 和 MCP 的 Node Runtime。

建议目录：

```text
packages/runtime/
```

或者生成独立可执行 Sidecar Package。

## 4.1 HTTP Server

选择轻量 Node Server Framework。

可以优先考虑：

```text
Hono
```

实现：

```text
GET /api/runtime/status
```

返回：

```json
{
  "status": "running",
  "version": "..."
}
```

## 4.2 Security

Server：

- [x] 只监听 `127.0.0.1`
- [x] 不监听 `0.0.0.0`
- [x] 实现 local runtime token
- [x] Authorization Bearer Token
- [x] Origin 白名单
- [x] 禁止 `Access-Control-Allow-Origin: *`

## 4.3 Runtime Token

首次启动：

- [x] 生成随机 token
- [x] 安全持久化
- [ ] Extension 使用配对机制获取授权

MVP 可以先实现开发模式固定 pairing flow，但禁止直接在源码硬编码生产 Token。

## 验收

- [x] Browser fetch 可以访问 Runtime
- [x] 无 Token 请求返回 401
- [x] 非法 Origin 被拒绝
- [x] `/status` 正常工作

---

# Phase 5 — Extension ↔ Runtime

目标：

打通第一个真实前后台闭环。

## 5.1 Runtime Client

- [x] Extension 创建统一 `RuntimeClient`

```text
RuntimeClient
```

例如：

```ts
runtime.getStatus()
runtime.chat()
runtime.approve()
```

禁止页面到处直接写 `fetch()`。

## 5.2 Runtime Status

- [x] Extension Header 显示 Runtime 状态

```text
nisse ● Connected
```

或：

```text
nisse ○ Desktop Offline
```

## 5.3 SSE

- [x] 实现 Runtime SSE endpoint

建议：

```text
GET /api/events
```

支持事件：

```text
message.delta
message.completed
tool.started
tool.completed
tool.failed
approval.required
notification.created
```

## 验收

- [x] Extension 能检测 Desktop Runtime
- [x] Desktop Offline 时有明确提示
- [x] SSE 可以持续收到测试事件

---

# Phase 6 — Model Provider System

目标：

实现可扩展 LLM Provider。

目录：

```text
packages/agent/
```

## 6.1 Provider Interface

定义：

```ts
interface ModelProvider {
  id: string
  createModel(config: ModelConfig): LanguageModel
}
```

以及：

```ts
interface ModelConfig {
  provider: string
  endpoint?: string
  model: string
  apiKey: SecretRef
}
```

## 6.2 DeepSeek Provider

第一版实现：

```text
DeepSeekProvider
```

支持：

- [x] API Key
- [x] Endpoint
- [x] Model
- [x] Test Connection

不要在 Agent 内写 DeepSeek-specific 判断。

## 6.3 Provider Registry

建立：

```text
ProviderRegistry
```

- [x] ProviderRegistry

未来可注册：

```text
OpenAI
Qwen
OpenAI Compatible
```

## 6.4 Settings UI

Extension → Connections → AI。

实现：

```text
Provider
Endpoint
API Key
Model

[Test Connection]

[Save]
```

API Key input：

```text
password type
```

保存后不重新显示完整 API Key。

## 验收

- [ ] DeepSeek 可以通过真实 API 连通
- [ ] 错误 Key 能展示明确错误
- [ ] Agent 代码不依赖 DeepSeek 实现细节

---

# Phase 7 — Secret Store

目标：

安全保存 Secret。

Secret 包括：

```text
LLM API Key
ZenTao Password
Jenkins Token
GitLab Token
WeCom credential
```

## 7.1 Secret API

抽象：

```ts
secretStore.set(key, value)
secretStore.get(key)
secretStore.delete(key)
```

## 7.2 Tauri / OS Integration

Windows 优先使用系统安全存储能力。

普通 config 只保存：

```text
secretRef
```

例如：

```json
{
  "apiKey": {
    "secretRef": "llm/deepseek/default/apiKey"
  }
}
```

## 验收

- [x] Secret 不进入普通配置文件
- [x] Secret 不返回 Chrome Extension
- [x] Secret 不出现在日志中

---

# Phase 8 — Agent MVP

目标：

真正跑通：

```text
Extension → Runtime → LLM → Extension
```

## 8.1 Vercel AI SDK

- [x] 使用当前最新稳定 Vercel AI SDK。

- [x] 实现 Agent Runtime。

## 8.2 Chat API

- [x] 实现：

```text
POST /api/chat
```

输入：

```json
{
  "conversationId": "...",
  "message": "hello"
}
```

通过 SSE Streaming 输出。

## 8.3 Conversation

MVP：

- [x] 创建 conversationId
- [x] 保存当前会话基本消息
- [x] Runtime 重启后可允许丢失早期实验数据

先不要构建复杂 Memory System。

## 验收

用户在 Extension：

```text
你好
```

可以看到 DeepSeek Streaming Response。

---

# Phase 9 — Mock Tool Calling

目标：

在引入真正 MCP 前验证 Tool Call。

## 9.1 创建 Mock Tool

- [x] 创建 `get_current_work_status` Mock Tool，返回 `bugs: 3`、`builds: 1`

例如：

```text
get_current_work_status
```

返回：

```json
{
  "bugs": 3,
  "builds": 1
}
```

## 9.2 Tool UI

- [x] Extension 展示工具调用中的“正在查询工作状态...”和完成后的“✓ 查询完成”

Extension 展示：

```text
正在查询工作状态...

✓ 查询完成
```

## 验收

自然语言：

```text
看看我当前工作状态
```

LLM 能主动选择 Mock Tool。

---

# Phase 10 — MCP Manager

目标：

建立 nisse 的 MCP 基础设施。

## 10.1 MCP Client

使用当前官方 TypeScript MCP SDK。

- [x] 引入官方 MCP TypeScript SDK

支持：

```text
stdio
Streamable HTTP
```

## 10.2 MCP Registry

配置：

```ts
{
  id,
  name,
  transport,
  command?,
  args?,
  url?
}
```

- [x] 实现 MCP Server Registry 与配置校验

## 10.3 stdio

支持：

```text
spawn MCP Server
```

例如：

```text
node dist/index.js
```

- [x] 支持通过 stdio 启动 MCP Server

## 10.4 Tool Discovery

实现：

```text
connect
↓
listTools
↓
Tool Adapter
↓
Vercel AI SDK Tools
```

- [x] 实现 connect → listTools → Tool Adapter 流程

## 10.5 Tool Adapter

完成：

```text
MCP Tool
↓
AI SDK Tool
```

保留：

- name
- description
- inputSchema

execute：

```text
MCP Client.callTool()
```

- [x] 保留工具名称、描述、inputSchema，并转为 AI SDK Tool

## 10.6 Lifecycle

实现：

```text
start
stop
restart
health
```

- [x] 实现 start、stop、restart、health 生命周期管理

## 验收

- [x] 一个独立 Demo MCP 可以 stdio 启动
- [x] Agent 可以发现 Tool
- [x] Agent 可以调用 Tool
- [x] MCP 崩溃后 Runtime 有错误信息

---

# Phase 11 — Connection Manager

目标：

统一管理业务系统配置。

## 11.1 Connection Model

定义：

```ts
Connection {
  id
  type
  name
  config
  secrets
  status
}
```

- [x] 定义 Connection Model 与状态类型

## 11.2 Dynamic Schema

支持 MCP 声明：

```text
ConnectionSchema
```

Field 类型至少：

```text
text
password
url
select
number
boolean
```

- [x] 支持 text、password、url、select、number、boolean 字段

## 11.3 Dynamic UI

Extension 根据 Schema 自动生成 Connection Form。

- [x] Extension 根据 Connection Schema 动态生成表单

## 11.4 Test Connection

统一能力：

```text
Test Connection
```

- [x] Runtime 提供统一保存与 Test Connection API

## 验收

- [x] 新增一个 Mock Connection Schema 时，不修改 Connections UI 代码即可自动生成表单。

---

# Phase 12 — ZenTao MCP

目标：

实现第一个真实业务 MCP。

目录：

```text
mcp/zentao/
```

推荐：

```text
src/
├─ index.ts
├─ tools/
├─ services/
└─ schemas/

README.md
AGENT.md
```

## 12.1 Connection

需要：

```text
endpoint
username
password
```

## 12.2 Service

实现：

```text
ZenTaoService
```

所有 API 调用放 Service。

## 12.3 get_my_bugs

实现 Tool：

```text
get_my_bugs
```

支持：

- [ ] 当前用户
- [ ] 分页
- [ ] 状态过滤
- [ ] 项目过滤

## 12.4 get_bug_detail

实现：

```text
get_bug_detail
```

输入：

```text
bugId
```

## 12.5 resolve_bug

实现：

```text
resolve_bug
```

必须根据实际 ZenTao API 所需字段设计 Schema。

不要臆造不存在的 API 参数。

## 12.6 Risk Metadata

```text
get_my_bugs
read

get_bug_detail
read

resolve_bug
write
approval required
```

## 12.7 AGENT.md

描述：

- 什么情况使用 ZenTao
- Tool 语义
- 推荐调用顺序
- resolve_bug 风险
- 不确定 Bug 时先查询详情

## 验收

Chat：

```text
看看我还有哪些 Bug
```

可以返回真实数据。

---

# Phase 13 — Approval System

目标：

阻止 LLM 自主执行有副作用动作。

## 13.1 Approval Middleware

Tool 执行前检查：

```text
risk
approval
```

## 13.2 Pending Approval

Runtime 创建：

```text
approvalId
tool
arguments
summary
expiresAt
```

## 13.3 Extension Approval Card

例如：

```text
解决 Bug #1024

Bug:
登录页面报错

Resolution:
Fixed

[取消]
[确认解决]
```

## 13.4 API

```text
POST /api/approvals/:id/approve
POST /api/approvals/:id/reject
```

## 验收

LLM 调用 `resolve_bug` 时，没有用户确认不能真正访问写 API。

---

# Phase 14 — Scheduler + Watch Manager

目标：

提供统一后台监听能力。

不要在各 MCP 内写散乱的 `setInterval()`。

## 14.1 Scheduler

支持：

```text
interval
daily
manual
```

## 14.2 Watch Definition

定义：

```ts
Watch {
  id
  source
  schedule
  query
  snapshot
  enabled
}
```

## 14.3 Snapshot

提供简单持久化。

## 14.4 Diff

提供：

```text
previous
current
diff
```

## 验收

Demo Watch 每 1 分钟可以检测 Mock 数据变化并产生 Event。

---

# Phase 15 — Event Bus

目标：

解耦 MCP、Watcher、Notification。

统一 Event：

```ts
{
  id,
  type,
  source,
  timestamp,
  data
}
```

示例：

```text
zentao.new_bug
jenkins.build_success
jenkins.build_failed
gitlab.push
```

## 验收

Watcher 可以 Publish，Notification 可以 Subscribe。

---

# Phase 16 — Notification Manager

目标：

统一通知出口。

## 16.1 Channel Interface

定义：

```ts
interface NotificationChannel {
  id: string
  send(notification): Promise<void>
}
```

## 16.2 Browser / Extension

先实现：

```text
Extension Inbox
Browser Notification
```

## 16.3 Notification Rules

支持：

```text
event type
↓
channel list
```

例如：

```text
zentao.new_bug
→ browser
→ wecom
```

---

# Phase 17 — ZenTao New Bug Watch

目标：

完成第一个后台自动化。

## 17.1 Configuration

Extension：

```text
ZenTao Notifications

Enable New Bug Watch

Interval:
10 minutes

Channels:
Browser
WeCom
```

## 17.2 Runtime

```text
Scheduler
↓
get_my_bugs
↓
Snapshot Diff
↓
New Bug
↓
zentao.new_bug
```

## 验收

模拟新 Bug 后可以收到浏览器通知。

---

# Phase 18 — Jenkins MCP

目录：

```text
mcp/jenkins/
```

## 18.1 Connection

```text
endpoint
username
token
```

## 18.2 list_jobs

实现：

```text
list_jobs
```

## 18.3 get_job

实现：

```text
get_job
```

## 18.4 get_job_parameters

必须从 Jenkins 获取真实参数定义。

不要让 LLM 猜：

```text
branch
env
version
```

## 18.5 trigger_build

参数：

```text
job
parameters
```

Risk：

```text
write
approval required
```

## 18.6 get_build_status

输入：

```text
job
buildId
```

## 18.7 README + AGENT

完成：

```text
README.md
AGENT.md
```

## 验收

Chat：

```text
帮我发布 xxx 项目
```

可以：

```text
找到 Job
↓
读取参数
↓
Extension 让用户确认
↓
执行 Jenkins
```

---

# Phase 19 — Jenkins Build Watch

## 19.1 trigger_build Result

保存：

```text
queueId
buildId
```

## 19.2 Watch

持续检查：

```text
QUEUED
RUNNING
SUCCESS
FAILURE
ABORTED
```

## 19.3 Event

生成：

```text
jenkins.build_success
jenkins.build_failed
```

## 19.4 Notification

通过 Notification Rules 推送。

## 验收

发布后用户可以关闭 Chat，构建完成仍能收到通知。

---

# Phase 20 — WeCom Channel

目标：

增加企业微信通知。

## 20.1 Connection

根据实际采用的企业微信机器人 API 设计参数。

不要臆造字段。

优先支持企业微信机器人 Webhook 模式。

## 20.2 Test Notification

Connection UI：

```text
[Test Notification]
```

## 20.3 Notification Channel

实现：

```text
WeComNotificationChannel
```

## 验收

可以把：

```text
ZenTao New Bug
Jenkins Build Result
```

推送到企业微信。

---

# Phase 21 — GitLab MCP

目录：

```text
mcp/gitlab/
```

## 21.1 Connection

根据 GitLab API：

```text
endpoint
token
```

## 21.2 Read Tools

实现：

```text
list_projects
list_branches
get_commits
list_merge_requests
get_merge_request
```

## 21.3 Write Tools

实现：

```text
create_merge_request
merge_merge_request
```

Write Tool：

```text
approval required
```

## 验收

Agent 可以：

```text
查询项目
查询分支
查看 Commit
查询 MR
```

---

# Phase 22 — Workflow Engine MVP

目标：

支持确定性跨 MCP 编排。

## 22.1 Workflow Definition

第一版先采用结构化 TypeScript / JSON DSL。

至少：

```text
id
name
trigger
steps
conditions
onSuccess
onFailure
```

## 22.2 Step Types

支持：

```text
tool
condition
approval
notification
```

不要第一版制作可视化 Workflow Editor。

## 22.3 Workflow Executor

支持：

```text
RUNNING
WAITING_APPROVAL
SUCCESS
FAILED
```

## 验收

使用 Mock Tool 完成一个 3-Step Workflow。

---

# Phase 23 — GitLab Merge Workflow

目标：

实现：

```text
Commit
↓
Merge Strategy
↓
Jenkins
```

## 23.1 Merge Rules

支持配置：

```text
feature/* → develop
develop → release
release → main
```

## 23.2 Safety

第一版默认保守：

```text
Pipeline passed
No conflict
Explicit configuration
```

Production merge 建议仍保留 Approval。

## 23.3 Jenkins Integration

Merge Success：

```text
↓
trigger_build
```

## 验收

在测试 GitLab Project 验证完整 Workflow。

---

# Phase 24 — Local Git MCP

目录：

```text
mcp/git/
```

## 24.1 Repository Configuration

Extension Settings：

```text
Code Directories
```

允许：

```text
D:/workspace
D:/company
```

## 24.2 scan_repositories

递归发现 Git Repository。

需要合理限制递归深度和忽略目录。

## 24.3 get_commits

支持：

```text
repo
from
to
author
```

## 24.4 get_changed_files

## 24.5 get_diff_summary

不要默认发送整个 diff。

提供结构化摘要。

## 24.6 get_repo_status

## 验收

可以扫描本机多个项目并获取昨天当前作者提交。

---

# Phase 25 — Daily Work Summary

目标：

实现典型“工作小精灵”场景。

## 25.1 Automation Config

Extension：

```text
Daily Work Summary

Enabled

Run at
09:00

Directories
...

Author
...

Send via
WeCom
```

## 25.2 Data Pipeline

```text
Scheduler
↓
Git MCP
↓
Yesterday Commits
↓
Aggregate
↓
Agent
↓
Summary
↓
Notification
```

## 25.3 Prompt Strategy

Agent 应优先根据：

```text
repository
commit message
changed files
diff stats
```

总结。

只有 Commit Message 信息不足时才调用 Diff Summary。

## 25.4 Privacy

不要默认把完整源码发送到 LLM。

## 验收

每天可以自动生成类似：

```text
昨日工作：

1. cert-admin
   修复证书申请状态刷新问题。

2. ras-web
   完成 RA 统计页面开发。
```

并推送企业微信。

---

# Phase 26 — Extension Notifications

目标：

完善浏览器侧通知体验。

增加：

```text
Notification Inbox
Unread Count
Mark As Read
Open Detail
```

通知类型：

```text
Bug
Build
Workflow
Summary
System
```

---

# Phase 27 — Runtime Observability

增加：

```text
Runtime Logs
MCP Status
Connection Status
Watcher Status
Workflow History
```

Desktop Settings 可以查看。

Secret 必须脱敏。

---

# Phase 28 — Production Packaging

Windows 优先。

## 28.1 Sidecar Packaging

确保：

```text
用户无需安装 Node.js
```

## 28.2 Installer

生成 Windows Installer。

## 28.3 First Run

首次启动：

```text
Initialize
↓
Generate Runtime Token
↓
Configure Auto Start
↓
Connect Extension
```

## 28.4 Recovery

Runtime 崩溃：

```text
Tauri 自动恢复 Sidecar
```

---

# Phase 29 — Documentation

确保以下文档存在：

```text
README.md
docs/architecture.md
docs/security.md
docs/mcp-development.md
docs/workflow.md
```

每个 MCP：

```text
README.md
AGENT.md
```

---

# MCP Development Template

以后每增加一个 MCP，统一按照：

```text
mcp/<name>/
├─ src/
│  ├─ index.ts
│  ├─ tools/
│  ├─ services/
│  └─ schemas/
│
├─ README.md
├─ AGENT.md
├─ package.json
└─ tsconfig.json
```

开发步骤：

- [ ] 明确 Connection Schema
- [ ] 实现 Service
- [ ] 编写 Tool Schema
- [ ] 编写 Tool Description
- [ ] 实现 Tool
- [ ] 定义 Risk Metadata
- [ ] 编写测试
- [ ] Inspector 验证
- [ ] 编写 README
- [ ] 编写 AGENT.md
- [ ] 注册到 MCP Manager
- [ ] 验证 Agent Tool Calling

---

# Codex 执行策略

Codex 不允许一次执行：

```text
“完成 nisse”
```

推荐每次只执行一个阶段，例如：

```text
请严格按照 TODO.md 完成 Phase 1。
不要提前实现其他 Phase。
完成后运行测试并汇报：
1. 修改文件
2. 技术决策
3. 执行命令
4. 测试结果
5. 尚未完成的问题
```

下一轮：

```text
继续完成 Phase 2。
以 README.md 和 TODO.md 为架构约束。
不要修改已经确定的架构，除非发现明确技术问题。
```

---

# MVP Definition of Done

第一版真正 MVP 不要求完成全部 Phase。

达到以下闭环即可定义为：

**nisse MVP v0.1**

```text
Chrome Extension
        ↓
HTTP + SSE
        ↓
Tauri Desktop
        ↓
Node Runtime
        ↓
Vercel AI SDK
        ↓
DeepSeek
        ↓
MCP Manager
        ↓
ZenTao MCP
        ↓
真实 Bug 数据
        ↓
Agent
        ↓
Chrome Extension
```

并完成第二条写操作链路：

```text
用户要求解决 Bug
        ↓
Agent
        ↓
resolve_bug
        ↓
Approval
        ↓
Extension
        ↓
用户确认
        ↓
ZenTao API
```

当这两个闭环稳定以后，再进入 Jenkins、Watcher、Workflow、GitLab 和日报能力。

---

# Final Engineering Principle

整个项目始终遵循：

```text
Agent
= 理解和决策

MCP
= 标准能力

Workflow
= 确定性编排

Watcher
= 持续感知

Notification
= 主动触达

Connection
= 外部系统配置

Secret Store
= 敏感凭证
```

不要把这些职责重新混回一个大型 Agent 或大型 MCP 中。
