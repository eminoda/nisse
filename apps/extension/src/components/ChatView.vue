<script setup lang="ts">
import ChatComposer from "./ChatComposer.vue";
import ChatMessageList from "./ChatMessageList.vue";
import { useMockChat } from "../composables/useMockChat";
import { useApprovals } from "../composables/useApprovals";
import ApprovalCard from "./ApprovalCard.vue";

const { messages, isSending, errorMessage, toolStatus, sendMessage } = useMockChat();
const { approvals, approve, reject } = useApprovals();

function toolLabel(toolName: string) {
  const labels: Record<string, string> = {
    get_current_work_status: "查询当前工作状态",
    get_my_bugs: "查询禅道 Bug 列表",
    get_bug_detail: "查询禅道 Bug 详情",
  };
  return labels[toolName] ?? toolName;
}
</script>

<template>
  <section class="chat-view" aria-label="聊天">
    <ChatMessageList :messages="messages" :is-sending="isSending" />
    <ApprovalCard
      v-for="approval in approvals"
      :key="approval.approvalId"
      :approval="approval"
      @approve="approve"
      @reject="reject"
    />
    <div v-if="toolStatus" class="tool-progress" :class="`tool-progress--${toolStatus.state}`">
      <span class="tool-progress-icon" aria-hidden="true">
        {{ toolStatus.state === "running" ? "◌" : toolStatus.state === "completed" ? "✓" : "!" }}
      </span>
      <span class="tool-progress-copy">
        <strong>{{ toolLabel(toolStatus.toolName) }}</strong>
        <small>{{ toolStatus.state === "running" ? "执行中" : toolStatus.state === "completed" ? "已完成" : "执行失败" }}</small>
      </span>
    </div>
    <p v-if="errorMessage" class="chat-error" role="alert">{{ errorMessage }}</p>
    <div class="composer-wrap">
      <ChatComposer @send="sendMessage" />
    </div>
  </section>
</template>

<style scoped>
.chat-view {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.composer-wrap {
  background: var(--color-surface);
  padding: 12px 22px 18px;
}

.chat-error {
  background: rgba(239, 111, 111, 0.12);
  color: #f09a9a;
  font-size: 12px;
  margin: 0 22px 10px;
  padding: 8px 10px;
}

.tool-progress {
  align-items: center;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  display: flex;
  gap: 9px;
  margin: 0 22px 10px;
  padding: 8px 10px;
}
.tool-progress-icon {
  align-items: center;
  background: var(--color-accent-soft);
  border-radius: 7px;
  color: var(--color-accent);
  display: flex;
  flex: 0 0 24px;
  font-size: 14px;
  height: 24px;
  justify-content: center;
}
.tool-progress-copy {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.tool-progress-copy strong {
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 600;
}
.tool-progress-copy small {
  color: var(--color-muted);
  font-size: 10px;
}
.tool-progress--completed .tool-progress-icon {
  color: var(--color-success);
}
.tool-progress--failed .tool-progress-icon {
  background: rgba(210, 80, 80, 0.12);
  color: #c94d5a;
}
</style>
