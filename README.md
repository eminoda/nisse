# nisse

> **Browser-first interaction, desktop-powered execution.**

`nisse` 是一个面向个人工作场景的本地 AI Agent。

名字来自北欧民间传说中的 **Nisse** ——一种居住在人们身边、默默帮助完成日常事务的家宅小精灵。

`nisse` 希望成为工作环境中的 AI 小精灵：

- 理解用户的自然语言指令
- 连接日常工作系统
- 查询和处理工作信息
- 执行重复操作
- 持续监听工作状态变化
- 自动执行工作流
- 在需要时主动通知用户

与传统桌面 AI 助手不同，`nisse` 采用：

**Chrome Extension 作为主要交互入口，Desktop Runtime 作为后台能力中心。**

用户通常不需要频繁打开桌面软件。

启动并配置一次 `nisse Desktop` 后，它可以常驻后台运行。用户日常直接通过 Chrome Extension 与 Agent 交互。

---

## Why nisse

现代工作越来越离不开浏览器。

开发、测试、项目管理、CI/CD、OA、文档、内部系统等大量工作已经发生在浏览器中。

因此 `nisse` 不希望用户：

```text
正在浏览器工作
        ↓
切换到 AI Desktop
        ↓
输入问题
        ↓
再切回浏览器
```

而希望：

```text
浏览器
   │
   ├── 当前工作页面
   │
   └── nisse Extension
            │
            ↓
        AI Agent
            │
            ↓
       自动完成工作
```

Chrome Extension 天然具备丰富 UI 能力，同时可以理解当前浏览器上下文。

Desktop Runtime 则负责提供浏览器无法安全、稳定完成的能力：

- LLM
- Agent Runtime
- MCP
- 本地文件
- Git
- Scheduler
- Workflow
- Credential
- 后台任务
- 系统通知
- 外部系统连接

因此 `nisse` 的核心设计理念是：

> **nisse lives in your browser, but works through your computer.**

---

# Product Architecture

```text
┌───────────────────────────────────────────────┐
│              Chrome Extension                 │
│                    Vue 3                      │
│                                               │
│  Chatbot                                      │
│  Approval                                     │
│  Notifications                                │
│  Connections                                  │
│  Automation                                   │
│  Runtime Status                               │
└───────────────────┬───────────────────────────┘
                    │
              HTTP REST + SSE
                    │
                    ▼
┌───────────────────────────────────────────────┐
│                nisse Desktop                  │
│              Tauri latest stable              │
│                                               │
│  Tauri Host                                   │
│  ├─ System Tray                               │
│  ├─ Auto Start                                │
│  ├─ Runtime Lifecycle                         │
│  └─ OS Secret Storage                         │
│                                               │
│                    │                          │
│                    ▼                          │
│           Node Runtime Sidecar                │
│                                               │
│  ├─ Local HTTP Server                         │
│  ├─ Vercel AI SDK Agent                      │
│  ├─ Model Provider Adapter                    │
│  ├─ MCP Manager                              │
│  ├─ Connection Manager                       │
│  ├─ Workflow Engine                          │
│  ├─ Watch Manager                            │
│  ├─ Scheduler                                │
│  ├─ Notification Manager                     │
│  └─ Event Bus                                │
└───────────────────┬───────────────────────────┘
                    │
        ┌───────────┼───────────┬───────────┐
        ▼           ▼           ▼           ▼
   ZenTao MCP   Jenkins MCP  GitLab MCP  Local Git MCP
```

---

# Core Concepts

`nisse` 不把所有事情都交给 LLM。

不同模块承担不同职责。

## Agent

Agent 负责理解：

> **用户想做什么？**

例如：

```text
“看看我现在还有哪些 Bug”
```

Agent 判断需要调用：

```text
zentao.get_my_bugs
```

Agent 基于 **Vercel AI SDK** 实现。

---

## MCP

MCP 提供：

> **nisse 实际能够做什么？**

例如：

```text
ZenTao MCP
├─ get_my_bugs
├─ get_bug_detail
└─ resolve_bug

Jenkins MCP
├─ list_jobs
├─ get_job_parameters
├─ trigger_build
└─ get_build_status
```

MCP 应优先暴露业务语义，而不是浏览器操作语义。

推荐：

```text
resolve_bug()
trigger_build()
```

而不是：

```text
click()
input()
open_page()
```

即使底层最终通过 API 或 Playwright 执行，Agent 看到的仍然应该是稳定的业务能力。

---

## Tool Guide / Skill

每个 MCP 除代码外，应提供一份 Agent 使用说明。

例如：

```text
mcp/zentao/
├─ README.md
└─ AGENT.md
```

`README.md` 给开发者阅读：

- MCP 是什么
- 如何配置
- 如何启动
- 支持哪些 Tools
- 如何测试

`AGENT.md` 给 Agent / Tool Registry 使用：

- 什么场景使用该 MCP
- 每个 Tool 适用于什么情况
- 调用顺序
- 业务规则
- 风险约束
- 写操作是否需要确认

因此：

```text
Skill / Guide = Know How
MCP           = Can Do
```

---

## Workflow

Workflow 负责：

> **一件事情应该按照什么确定步骤执行？**

例如 GitLab 自动合并并发布：

```text
GitLab Commit
     ↓
检查分支规则
     ↓
创建 Merge Request
     ↓
检查 CI
     ↓
Merge
     ↓
Jenkins Trigger
     ↓
等待 Build
     ↓
Notification
```

已经配置好的 Workflow 不应该每次重新让 LLM 自由规划。

原则：

> **AI 创建或选择自动化，Workflow 确定性执行自动化。**

---

## Watcher

Watcher 负责：

> **持续关注什么变化？**

例如：

- 每 10 分钟检查新的 ZenTao Bug
- Jenkins Build 是否完成
- GitLab 是否出现新提交
- Merge Request 状态是否变化

---

## Notification

Notification 负责：

> **结果应该通知到哪里？**

通知渠道与具体 MCP 解耦。

```text
Notification Manager
├─ Browser Notification
├─ Extension Inbox
├─ WeCom
└─ Future
   ├─ Feishu
   ├─ Slack
   └─ Email
```

MCP 只产生事件：

```text
zentao.new_bug
jenkins.build_success
jenkins.build_failed
gitlab.merge_completed
```

Notification Manager 决定如何触达用户。

---

# Interaction Model

`nisse` 支持三种工作方式。

## Query

用户主动询问信息。

```text
用户
“看看我有哪些 Bug”

↓

Agent

↓

ZenTao MCP

↓

get_my_bugs
```

---

## Action

用户要求执行操作。

```text
“把 #1024 Bug 解决掉”
```

Agent：

```text
get_bug_detail
      ↓
准备 resolve_bug
      ↓
Approval Required
      ↓
Chrome Extension
      ↓
用户确认
      ↓
resolve_bug
```

有副作用的写操作默认需要确认。

例如：

- 修改 Bug
- Jenkins 发布
- GitLab Merge
- 删除数据
- 修改生产环境状态

---

## Automation

无需用户每次主动输入。

例如：

```text
每天 09:00
    ↓
扫描昨天 Git Commit
    ↓
Agent 总结
    ↓
企业微信推送
```

或者：

```text
每 10 分钟
    ↓
查询我的 Bug
    ↓
发现新增 Bug
    ↓
通知用户
```

---

# Monorepo

项目采用：

- pnpm
- Turborepo
- TypeScript
- Vue 3

建议目录：

```text
nisse/
├─ apps/
│  ├─ extension/
│  │
│  └─ desktop/
│
├─ packages/
│  ├─ agent/
│  ├─ runtime/
│  ├─ connections/
│  ├─ workflow/
│  ├─ notification/
│  ├─ shared/
│  └─ ui/
│
├─ mcp/
│  ├─ zentao/
│  ├─ jenkins/
│  ├─ gitlab/
│  └─ git/
│
├─ turbo.json
├─ pnpm-workspace.yaml
├─ package.json
└─ README.md
```

---

# Chrome Extension

Chrome Extension 是 `nisse` 的主要 UI。

采用：

- Vue 3
- TypeScript
- Chrome Extension Manifest V3

Vue 项目必须优先使用 Vue 官方 CLI / 官方初始化工具创建，不手工拼装一个非标准 Vue 工程。

主要模块：

```text
Extension
├─ Chat
├─ Tool Progress
├─ Approval
├─ Notifications
├─ Settings
├─ Connections
├─ Automation
└─ Runtime Status
```

第一阶段不在 Desktop 中重复建设完整 Chat UI。

---

# Desktop Runtime

Desktop 基于最新稳定版本 Tauri。

Windows 为第一优先支持平台。

架构保持未来支持：

- macOS
- Linux

但 MVP 不为了跨平台兼容牺牲 Windows 开发效率。

Desktop 主要承担：

```text
Tauri Host
├─ Tray
├─ Auto Start
├─ Sidecar Lifecycle
├─ Secret Storage
└─ Basic Settings Window

Node Sidecar
├─ HTTP Server
├─ Agent
├─ MCP
├─ Workflow
├─ Watcher
├─ Scheduler
├─ Notification
└─ Connections
```

---

# Local Communication

Chrome Extension 与 Desktop Runtime 第一阶段采用：

```text
HTTP REST
+
SSE
```

普通请求：

```text
HTTP
```

例如：

```text
GET  /api/runtime/status
GET  /api/connections
POST /api/chat
POST /api/approvals/:id
```

Agent Streaming 与 Runtime Event：

```text
SSE
```

事件包括：

```text
message.delta
message.completed

tool.started
tool.completed
tool.failed

approval.required

notification.created

workflow.started
workflow.completed
workflow.failed
```

未来如有必要可增加 WebSocket。

Native Messaging 暂不作为 MVP 主通信方案。

---

# Local Runtime Security

本地 Runtime 只能绑定：

```text
127.0.0.1
```

禁止默认：

```text
0.0.0.0
```

Extension 与 Runtime 之间必须有本地认证机制。

例如安装后生成：

```text
localRuntimeToken
```

Extension 请求：

```text
Authorization: Bearer <token>
```

Runtime 还需要限制允许的 Extension Origin。

禁止：

```text
Access-Control-Allow-Origin: *
```

Secret 不允许暴露给 Chrome Extension。

---

# LLM Provider

Agent 基于 Vercel AI SDK。

采用 Provider Adapter，不在 Agent 内部写死 DeepSeek、OpenAI 等逻辑。

```text
ModelProvider
├─ DeepSeekProvider
├─ OpenAIProvider
├─ QwenProvider
└─ OpenAICompatibleProvider
```

第一阶段优先实现：

**DeepSeek**

用户配置：

```text
Provider
API Key
Endpoint
Model
```

例如：

```text
Provider: DeepSeek
API Key:  sk-************
Endpoint: https://...
Model:    deepseek-...
```

统一接口示意：

```ts
interface ModelProvider {
  id: string

  createModel(config: ModelConfig): LanguageModel
}

interface ModelConfig {
  provider: string
  endpoint?: string
  model: string
  apiKey: SecretRef
}
```

Agent 只依赖 `LanguageModel`。

Agent 内部禁止：

```ts
if (provider === 'deepseek') {
  // ...
}
```

---

# Connection System

用户不应该理解 MCP 的账号配置。

产品层统一称为：

**Connections**

例如：

```text
Settings

AI Models
├─ DeepSeek
└─ OpenAI

Connections
├─ ZenTao
├─ Jenkins
├─ GitLab
└─ WeCom
```

每个连接应支持：

- Config
- Secret
- Test Connection
- Connection Status

---

# Secret Storage

以下数据属于 Secret：

- LLM API Key
- ZenTao Password
- Jenkins Token
- GitLab Token
- WeCom Secret / Webhook credential

不得直接明文写入普通 JSON 配置。

普通配置：

```text
endpoint
username
model
connection name
```

可以正常持久化。

Secret 应使用 Tauri / OS 安全存储能力。

Chrome Extension 永远不直接读取 Secret。

---

# Dynamic Connection Schema

MCP 可以声明其需要哪些连接参数。

例如 ZenTao：

```ts
{
  type: 'zentao',

  fields: [
    {
      key: 'endpoint',
      type: 'url',
      required: true
    },
    {
      key: 'username',
      type: 'text',
      required: true
    },
    {
      key: 'password',
      type: 'password',
      secret: true,
      required: true
    }
  ]
}
```

Jenkins：

```ts
{
  type: 'jenkins',

  fields: [
    {
      key: 'endpoint',
      type: 'url',
      required: true
    },
    {
      key: 'username',
      type: 'text',
      required: true
    },
    {
      key: 'token',
      type: 'password',
      secret: true,
      required: true
    }
  ]
}
```

nisse 根据 Schema 自动生成 Connection UI。

目标是未来增加新 MCP 时，不需要重新编写一整套设置页面。

---

# MCP Manager

Desktop Runtime 内置 MCP Client / Manager。

支持：

```text
stdio
Streamable HTTP
```

本地 MCP：

```text
Desktop Runtime
      ↓
spawn
      ↓
node entry.js
      ↓
stdio
      ↓
MCP Server
```

远程 MCP：

```text
Desktop Runtime
      ↓
Streamable HTTP
      ↓
Remote MCP Server
```

MCP Manager 负责：

```text
connect
listTools
callTool
health
restart
disconnect
```

然后将 MCP Tools 转换为 Vercel AI SDK Tools。

---

# ZenTao MCP

第一阶段实现：

## `get_my_bugs`

查询当前用户负责的 Bug。

支持基本过滤：

- 状态
- 项目
- 时间范围
- 分页

---

## `get_bug_detail`

输入：

```text
bugId
```

返回 Bug 完整信息。

---

## `resolve_bug`

解决 Bug。

根据 ZenTao API 实际要求提供：

- bugId
- resolution
- comment
- 必需业务参数

属于写操作。

默认：

```text
approval = required
```

---

# ZenTao Watcher

支持：

```text
New Bug Watch
```

用户配置：

```text
Enabled

Interval
10 minutes

Notify via
Browser
WeCom
```

Runtime：

```text
Scheduler
   ↓
get_my_bugs
   ↓
Snapshot Diff
   ↓
发现新的 Bug
   ↓
zentao.new_bug
   ↓
Notification Manager
```

---

# Jenkins MCP

第一阶段实现：

## `list_jobs`

查询可访问 Jenkins Job / Pipeline。

---

## `get_job`

查询某 Job 基本信息。

---

## `get_job_parameters`

查询参数化 Pipeline 的参数定义。

Agent 不允许猜测 Jenkins 参数。

---

## `trigger_build`

按照参数执行 Pipeline。

属于写操作。

默认：

```text
approval = required
```

---

## `get_build_status`

根据：

```text
job
buildId
```

查询执行状态。

---

# Jenkins Build Watch

`trigger_build` 后由 Runtime 创建 Build Watch。

```text
QUEUED
  ↓
RUNNING
  ↓
SUCCESS / FAILURE
```

完成后生成：

```text
jenkins.build_success
```

或：

```text
jenkins.build_failed
```

再通过 Notification Manager 通知。

---

# GitLab MCP

目标能力：

```text
Read
├─ list_projects
├─ list_branches
├─ get_commits
├─ list_merge_requests
└─ get_merge_request

Write
├─ create_merge_request
└─ merge_merge_request
```

长期目标包括：

**监听代码提交并执行自动化分支编排。**

例如：

```text
feature/*
    ↓
develop
    ↓
release
    ↓
main
```

Workflow 可以配置：

```text
Pipeline must pass
No merge conflicts
Require latest branch
Manual approval
```

Merge 完成后可调用 Jenkins MCP：

```text
GitLab
   ↓
Merge
   ↓
Jenkins
   ↓
Deploy
```

这属于 Workflow，而不是 GitLab MCP 内部逻辑。

---

# Local Git MCP

支持配置本地代码目录：

```text
D:/workspace/company-a
D:/workspace/company-b
```

能力：

```text
scan_repositories
get_commits
get_commits_by_author
get_changed_files
get_diff_summary
get_repo_status
```

---

# Daily Work Summary

可以配置每天自动生成昨日工作总结。

```text
Scheduler
   ↓
扫描代码目录
   ↓
找到昨天当前用户提交
   ↓
Git MCP
   ↓
Commit + Diff Stats
   ↓
Agent
   ↓
生成工作总结
   ↓
Notification Manager
   ↓
WeCom
```

默认优先提供：

```text
commit message
changed files
additions / deletions
```

只有 Commit Message 无法表达实际工作内容时，才进一步读取 Diff Summary。

避免默认将大量源代码发送给 LLM。

---

# Notifications

Notification Manager 负责统一消息触达。

第一阶段支持：

```text
Browser
WeCom
```

每个 Watch / Workflow 都可以选择：

```text
Notify via:
[✓] Browser
[✓] WeCom
```

例如：

```text
ZenTao New Bug
→ Browser + WeCom

Jenkins Success
→ WeCom

Daily Work Summary
→ WeCom
```

未来可以扩展：

```text
Feishu
Slack
Email
```

---

# Risk Model

Tool 在进入 Agent Tool Registry 时，可以附加 nisse 自定义 metadata：

```ts
type ToolRisk = 'read' | 'write' | 'dangerous'
```

例如：

```text
get_my_bugs
risk = read

get_bug_detail
risk = read

resolve_bug
risk = write
approval = required

trigger_build
risk = write
approval = required

merge_merge_request
risk = write
approval = required
```

LLM 无权绕过 Runtime Approval Policy。

---

# Development Principles

## 1. Deterministic First

需要理解时使用 LLM。

需要稳定执行时使用代码和 Workflow。

---

## 2. MCP is an Adapter

MCP Tool 不应该承载全部业务实现。

推荐：

```text
MCP Tool
   ↓
Service
   ↓
External API
```

例如：

```text
resolve_bug
   ↓
ZenTaoService.resolveBug()
   ↓
ZenTao API
```

---

## 3. API First

访问业务系统优先：

```text
Official API
```

其次：

```text
HTTP Reverse Engineering
```

最后才考虑：

```text
Playwright
```

避免把浏览器自动化作为所有业务能力的默认实现。

---

## 4. Browser UI First

所有日常交互优先放在 Extension：

- Chat
- Confirmation
- Notifications
- Automation
- Connections

Desktop UI 只保留：

- Runtime Status
- System Settings
- Troubleshooting
- Logs
- Startup Settings

---

## 5. Windows First

第一阶段优先保证：

```text
Windows
```

架构保持跨平台，但不要为未验证的 macOS/Linux 使用场景增加 MVP 技术债。

---

# MVP

MVP 不追求一次实现所有自动化。

第一阶段目标是验证完整闭环：

```text
Extension
   ↓
Desktop Runtime
   ↓
Agent
   ↓
MCP
   ↓
真实系统
   ↓
Result
   ↓
Extension
```

建议首个完整场景：

```text
“看看我有哪些 Bug”
```

完整链路：

```text
Chrome Extension
      ↓
POST /api/chat
      ↓
Vercel AI SDK
      ↓
Tool Selection
      ↓
ZenTao MCP
      ↓
get_my_bugs
      ↓
ZenTao API
      ↓
Structured Result
      ↓
LLM Summary
      ↓
SSE
      ↓
Extension
```

验证这条链路以后，再逐步增加写操作、Watcher 和 Workflow。

---

# Roadmap

## Phase 1 — Foundation

- Monorepo
- Vue Extension
- Tauri Desktop
- Node Runtime
- HTTP + SSE
- DeepSeek
- Agent
- Mock Tool

## Phase 2 — MCP

- MCP Manager
- ZenTao MCP
- Jenkins MCP
- Connection Manager
- Secret Store

## Phase 3 — Background Automation

- Scheduler
- Watch Manager
- Event Bus
- Notification Manager
- Browser Notification
- WeCom

## Phase 4 — Workflow

- GitLab MCP
- Workflow Engine
- Merge Strategy
- Jenkins integration

## Phase 5 — Personal Work Intelligence

- Local Git MCP
- Daily Work Summary
- Agent summarization
- Scheduled IM push

---

# Vision

`nisse` 最终不是一个单纯的 Chatbot。

它应该逐渐成为一个：

> **常驻本机、存在于浏览器旁边、理解用户工作意图、连接日常工作系统，并能持续自动执行任务的个人 AI 工作精灵。**

它既可以回答：

```text
我今天还有哪些 Bug？
```

也可以执行：

```text
把这个 Bug 解决掉。
```

还可以长期自动完成：

```text
有新 Bug 时提醒我。

代码合并后自动发布测试环境。

每天早上总结昨天的代码提交并推送企业微信。
```

这就是 `nisse`。