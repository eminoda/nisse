import { randomBytes } from "node:crypto";

const pairingAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function createPairingCode() {
  const bytes = randomBytes(8);
  const value = Array.from(bytes, (byte) => pairingAlphabet[byte % pairingAlphabet.length]).join("");
  return `${value.slice(0, 4)}-${value.slice(4)}`;
}

export class PairingManager {
  readonly code: string;
  private used = false;

  constructor(private readonly token: string, code = createPairingCode()) {
    this.code = code;
  }

  exchange(input: string) {
    if (this.used || input.trim().toUpperCase() !== this.code) {
      throw new Error("invalid_or_used_pairing_code");
    }
    this.used = true;
    return { token: this.token };
  }

  isSessionToken(input: string) {
    return input.length > 0 && input === this.token;
  }
}
