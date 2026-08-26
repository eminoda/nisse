# 通用 Approval System 设计

## 范围

实现 Runtime 内存版 Approval Store、审批 API、SSE 事件和 Extension 确认卡片。用 Mock 写操作验证流程，不接入 DeepSeek 或真实 ZenTao 写操作。

## 流程

写 Tool 请求执行时先创建 Pending Approval，并发送 `approval.required` 事件。用户确认后才执行注入的 action；拒绝、过期或重复处理都不能执行 action。

Approval 记录包含 `approvalId`、`tool`、`arguments`、`summary`、`expiresAt` 和状态。默认有效期 5 分钟，Runtime 重启后记录丢失。

## API/UI

- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/reject`
- SSE 事件：`approval.required`、`approval.resolved`

Extension 在 Chat 中显示工具名、摘要和参数，并提供确认/取消按钮。处理结果更新卡片状态。

## 测试

测试创建、批准执行、拒绝不执行、过期不执行、重复处理和 API 鉴权；Extension 测试审批卡片渲染和按钮事件。
