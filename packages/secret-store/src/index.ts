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
