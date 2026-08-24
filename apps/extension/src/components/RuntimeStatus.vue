<script setup lang="ts">
defineProps<{
  connected: boolean;
}>();
</script>

<template>
  <div class="runtime-status" :class="{ 'runtime-status--offline': !connected }">
    <span class="status-dot" aria-hidden="true"></span>
    <span>{{ connected ? "Desktop Connected" : "Desktop Offline" }}</span>
  </div>
</template>

<style scoped>
.runtime-status {
  align-items: center;
  color: var(--color-success);
  display: inline-flex;
  font-size: 12px;
  gap: 7px;
}

.runtime-status--offline {
  color: var(--color-muted);
}

.status-dot {
  background: currentColor;
  border-radius: 50%;
  box-shadow: 0 0 0 4px color-mix(in srgb, currentColor 12%, transparent);
  height: 7px;
  width: 7px;
}
</style>
