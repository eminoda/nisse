<script setup lang="ts">
import { shallowRef } from "vue";
import type { ConnectionInput } from "@nisse/shared";
import ConnectionForm from "./ConnectionForm.vue";
import { useConnections } from "../composables/useConnections";

const { schemas, connections, selectedType, selectedSchema, isLoading, errorMessage, save, test } =
  useConnections();
const actionMessage = shallowRef<string | null>(null);

async function saveConnection(input: ConnectionInput) {
  try {
    await save(input);
    actionMessage.value = "连接已保存。";
  } catch {
    actionMessage.value = "保存失败，请检查必填字段。";
  }
}

async function testConnection(id: string) {
  try {
    await test(id);
    actionMessage.value = "连接测试成功。";
  } catch {
    actionMessage.value = "连接测试失败。";
  }
}
</script>

<template>
  <section class="connections-view" aria-label="Connections">
    <div class="section-heading">
      <p class="eyebrow">SETTINGS</p>
      <h2>Connections</h2>
      <p>配置 nisse 访问工作系统所需的连接。</p>
    </div>
    <p v-if="isLoading" class="notice">正在加载连接配置...</p>
    <p v-if="errorMessage" class="notice">{{ errorMessage }}</p>
    <div v-if="schemas.length" class="connection-layout">
      <div class="schema-list">
        <button
          v-for="schema in schemas"
          :key="schema.type"
          class="schema-card"
          :class="{ 'schema-card--active': selectedType === schema.type }"
          type="button"
          @click="selectedType = schema.type"
        >
          <span class="connection-icon" aria-hidden="true">◈</span>
          <span class="connection-copy"
            ><strong>{{ schema.name }}</strong
            ><small>{{ schema.description }}</small></span
          >
        </button>
      </div>
      <ConnectionForm v-if="selectedSchema" :schema="selectedSchema" @save="saveConnection" />
    </div>
    <div v-if="connections.length" class="saved-list">
      <h3>Saved connections</h3>
      <article v-for="connection in connections" :key="connection.id" class="saved-card">
        <div>
          <strong>{{ connection.name }}</strong
          ><small>{{ connection.status }}</small>
        </div>
        <button type="button" @click="testConnection(connection.id)">Test Connection</button>
      </article>
    </div>
    <p v-if="actionMessage" class="notice notice--success">{{ actionMessage }}</p>
  </section>
</template>

<style scoped>
.connections-view {
  overflow-y: auto;
  padding: 32px 22px;
}
.section-heading {
  margin-bottom: 26px;
}
.eyebrow {
  color: var(--color-accent);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  margin: 0 0 9px;
}
.section-heading h2 {
  color: var(--color-text);
  font-size: 24px;
  letter-spacing: -0.04em;
  margin: 0 0 8px;
}
.section-heading > p:last-child {
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
}
.notice {
  color: var(--color-muted);
  font-size: 12px;
  line-height: 1.5;
}
.notice--success {
  color: var(--color-accent);
}
.connection-layout {
  display: grid;
  gap: 18px;
}
.schema-list {
  display: grid;
  gap: 8px;
}
.schema-card,
.saved-card {
  align-items: center;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  color: inherit;
  display: flex;
  gap: 10px;
  padding: 12px;
  text-align: left;
}
.schema-card {
  cursor: pointer;
  width: 100%;
}
.schema-card--active {
  border-color: var(--color-accent);
}
.connection-icon {
  align-items: center;
  background: var(--color-accent-soft);
  border-radius: 8px;
  color: var(--color-accent);
  display: flex;
  flex: 0 0 30px;
  height: 30px;
  justify-content: center;
}
.connection-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.connection-copy strong,
.saved-card strong {
  color: var(--color-text);
  font-size: 12px;
}
.connection-copy small,
.saved-card small {
  color: var(--color-muted);
  font-size: 10px;
}
.saved-list {
  display: grid;
  gap: 8px;
  margin-top: 24px;
}
.saved-list h3 {
  color: var(--color-text-secondary);
  font-size: 11px;
  margin: 0;
}
.saved-card {
  justify-content: space-between;
}
.saved-card > div {
  display: grid;
  gap: 3px;
}
.saved-card button {
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 7px;
  color: var(--color-accent);
  cursor: pointer;
  font: inherit;
  font-size: 10px;
  padding: 6px 8px;
}
</style>
