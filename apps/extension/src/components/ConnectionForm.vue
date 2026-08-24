<script setup lang="ts">
import { reactive, shallowRef } from "vue";
import type { ConnectionInput, ConnectionSchema } from "@nisse/shared";

const props = defineProps<{ schema: ConnectionSchema }>();
const emit = defineEmits<{ save: [input: ConnectionInput] }>();
const config = reactive<Record<string, unknown>>({});
const secrets = reactive<Record<string, string>>({});
const name = shallowRef("");
const isSaving = shallowRef(false);

function valueFor(fieldKey: string, type: string) {
  return type === "password" ? (secrets[fieldKey] ?? "") : (config[fieldKey] ?? "");
}

async function submit() {
  isSaving.value = true;
  try {
    emit("save", {
      type: props.schema.type,
      name: name.value || props.schema.name,
      config: { ...config },
      secrets: { ...secrets },
    });
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <form class="connection-form" @submit.prevent="submit">
    <div class="form-heading">
      <h3>{{ schema.name }}</h3>
      <p>{{ schema.description }}</p>
    </div>
    <label class="field"
      ><span>Name</span><input v-model="name" type="text" :placeholder="schema.name"
    /></label>
    <label v-for="field in schema.fields" :key="field.key" class="field">
      <span>{{ field.label }}<em v-if="field.required"> *</em></span>
      <select
        v-if="field.type === 'select'"
        :value="valueFor(field.key, field.type)"
        @change="config[field.key] = ($event.target as HTMLSelectElement).value"
      >
        <option value="">请选择</option>
        <option v-for="option in field.options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <input
        v-else-if="field.type === 'boolean'"
        type="checkbox"
        :checked="Boolean(config[field.key])"
        @change="config[field.key] = ($event.target as HTMLInputElement).checked"
      />
      <input
        v-else
        :value="valueFor(field.key, field.type)"
        :type="field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'"
        :placeholder="field.placeholder"
        @input="
          field.type === 'password'
            ? (secrets[field.key] = ($event.target as HTMLInputElement).value)
            : (config[field.key] = ($event.target as HTMLInputElement).value)
        "
      />
    </label>
    <button class="save-button" type="submit" :disabled="isSaving">
      {{ isSaving ? "保存中..." : "保存连接" }}
    </button>
  </form>
</template>

<style scoped>
.connection-form {
  display: grid;
  gap: 12px;
}
.form-heading h3 {
  color: var(--color-text);
  font-size: 14px;
  margin: 0 0 4px;
}
.form-heading p {
  color: var(--color-muted);
  font-size: 11px;
  margin: 0;
}
.field {
  display: grid;
  gap: 5px;
}
.field span {
  color: var(--color-text-secondary);
  font-size: 11px;
}
.field em {
  color: var(--color-accent);
  font-style: normal;
}
.field input,
.field select {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font: inherit;
  font-size: 12px;
  padding: 9px 10px;
}
.field input[type="checkbox"] {
  accent-color: var(--color-accent);
  justify-self: start;
}
.save-button {
  background: var(--color-accent);
  border: 0;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  padding: 10px;
}
.save-button:disabled {
  cursor: wait;
  opacity: 0.6;
}
</style>
