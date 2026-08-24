import { computed, onMounted, readonly, shallowRef } from "vue";
import type { ConnectionInput, ConnectionSchema, ConnectionSummary } from "@nisse/shared";
import { runtimeClient } from "../runtime/client";

export function useConnections() {
  const _schemas = shallowRef<ConnectionSchema[]>([]);
  const _connections = shallowRef<ConnectionSummary[]>([]);
  const selectedType = shallowRef<string>();
  const isLoading = shallowRef(false);
  const errorMessage = shallowRef<string | null>(null);
  const selectedSchema = computed(() =>
    _schemas.value.find((schema) => schema.type === selectedType.value),
  );

  async function load() {
    if (!runtimeClient.hasToken) {
      errorMessage.value = "连接 Desktop Runtime 后可管理业务连接。";
      return;
    }
    isLoading.value = true;
    errorMessage.value = null;
    try {
      const [schemas, connections] = await Promise.all([
        runtimeClient.getConnectionSchemas(),
        runtimeClient.getConnections(),
      ]);
      _schemas.value = schemas;
      _connections.value = connections;
      selectedType.value = selectedType.value ?? schemas[0]?.type;
    } catch {
      errorMessage.value = "连接配置加载失败，请检查 Runtime。";
    } finally {
      isLoading.value = false;
    }
  }

  async function save(input: ConnectionInput) {
    const saved = await runtimeClient.saveConnection(input);
    _connections.value = [
      ..._connections.value.filter((connection) => connection.id !== saved.id),
      saved,
    ];
    return saved;
  }

  async function test(id: string) {
    const tested = await runtimeClient.testConnection(id);
    _connections.value = _connections.value.map((connection) =>
      connection.id === tested.id ? tested : connection,
    );
    return tested;
  }

  onMounted(load);

  return {
    schemas: readonly(_schemas),
    connections: readonly(_connections),
    selectedType,
    selectedSchema,
    isLoading: readonly(isLoading),
    errorMessage: readonly(errorMessage),
    save,
    test,
  };
}
