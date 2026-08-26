export interface SecretStore {
  set(key: string, value: string): Promise<void>;
  get(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
}

export function assertSecretKey(key: string) {
  if (!/^[a-zA-Z0-9/_-]+$/.test(key) || key.length > 200) {
    throw new Error("Invalid secret key");
  }
}

export class InMemorySecretStore implements SecretStore {
  private readonly values = new Map<string, string>();

  async set(key: string, value: string) {
    assertSecretKey(key);
    this.values.set(key, value);
  }

  async get(key: string) {
    assertSecretKey(key);
    return this.values.get(key) ?? null;
  }

  async delete(key: string) {
    assertSecretKey(key);
    this.values.delete(key);
  }
}

/** Development adapter for secrets supplied through the process environment. */
export class EnvironmentSecretStore implements SecretStore {
  constructor(private readonly environment: Record<string, string | undefined> = process.env) {}

  async set(_key: string, _value: string) {
    throw new Error("Environment secret store is read-only");
  }

  async get(key: string) {
    assertSecretKey(key);
    if (!key.startsWith("env/")) {
      throw new Error("Unsupported environment secret reference");
    }
    const environmentKey = key.slice("env/".length);
    if (!environmentKey || !/^[A-Z0-9_]+$/.test(environmentKey)) {
      throw new Error("Invalid environment secret reference");
    }
    return this.environment[environmentKey] ?? null;
  }

  async delete(_key: string) {
    throw new Error("Environment secret store is read-only");
  }
}
