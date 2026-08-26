<script setup lang="ts">
import { shallowRef } from "vue";
import type { ApprovalSummary } from "../runtime/client";

const props = defineProps<{ approval: ApprovalSummary }>();
const emit = defineEmits<{ approve: [id: string]; reject: [id: string] }>();
const isProcessing = shallowRef(false);

async function resolve(action: "approve" | "reject") {
  if (props.approval.status !== "pending" || isProcessing.value) return;
  isProcessing.value = true;
  try {
    if (action === "approve") emit("approve", props.approval.approvalId);
    else emit("reject", props.approval.approvalId);
  } finally {
    isProcessing.value = false;
  }
}
</script>

<template>
  <article class="approval-card" :class="`approval-card--${approval.status}`">
    <div class="approval-heading">
      <span class="approval-label">需要确认</span>
      <span class="approval-tool">{{ approval.tool }}</span>
    </div>
    <p class="approval-summary">{{ approval.summary }}</p>
    <pre v-if="Object.keys(approval.arguments).length">{{ JSON.stringify(approval.arguments, null, 2) }}</pre>
    <div v-if="approval.status === 'pending'" class="approval-actions">
      <button type="button" :disabled="isProcessing" @click="resolve('reject')">取消</button>
      <button type="button" class="approval-confirm" :disabled="isProcessing" @click="resolve('approve')">
        {{ isProcessing ? "处理中..." : "确认执行" }}
      </button>
    </div>
    <p v-else class="approval-result">{{ approval.status === "approved" ? "已确认执行" : approval.status === "rejected" ? "已取消" : approval.status }}</p>
  </article>
</template>

<style scoped>
.approval-card {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border-strong);
  border-radius: 12px;
  margin: 0 22px 12px;
  padding: 12px;
}
.approval-card--approved { border-color: var(--color-success); }
.approval-heading { display: flex; justify-content: space-between; gap: 8px; }
.approval-label { color: #f2bf74; font-size: 11px; font-weight: 700; }
.approval-tool { color: var(--color-muted); font-size: 10px; }
.approval-summary { color: var(--color-text); font-size: 13px; line-height: 1.45; margin: 9px 0; }
pre { background: var(--color-surface); border-radius: 7px; color: var(--color-text-secondary); font-size: 10px; margin: 0 0 10px; max-height: 120px; overflow: auto; padding: 8px; white-space: pre-wrap; }
.approval-actions { display: flex; gap: 8px; justify-content: flex-end; }
.approval-actions button { background: transparent; border: 1px solid var(--color-border); border-radius: 7px; color: var(--color-text-secondary); cursor: pointer; font-size: 11px; padding: 7px 10px; }
.approval-actions .approval-confirm { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-surface); }
.approval-actions button:disabled { cursor: wait; opacity: 0.6; }
.approval-result { color: var(--color-muted); font-size: 11px; margin: 0; }
</style>
