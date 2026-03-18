import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "fs"
import { CREDENTIALS_FILE } from "./config.js"

export type TwitterCredentials = {
  authToken: string
  ct0: string
  username?: string
}

type StoredCredentials = {
  walletAddress: string
  iv: string
  tag: string
  data: string
  username?: string
  savedAt: string
}

function deriveKey(walletPrivateKey: string): Buffer {
  // SHA-256 of the private key → 32-byte AES-256 key
  return createHash("sha256").update(walletPrivateKey).digest()
}

export function saveCredentials(creds: TwitterCredentials, walletAddress: string, walletPrivateKey: string): void {
  const key = deriveKey(walletPrivateKey)
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const plain = JSON.stringify({ authToken: creds.authToken, ct0: creds.ct0 })
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  const stored: StoredCredentials = {
    walletAddress,
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    data: encrypted.toString("hex"),
    username: creds.username,
    savedAt: new Date().toISOString(),
  }
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(stored, null, 2), "utf-8")
}

export type LoadCredentialsResult =
  | { ok: true; creds: TwitterCredentials }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "wallet_mismatch"; storedAddress: string; currentAddress: string }
  | { ok: false; reason: "decrypt_failed" }

export function loadCredentials(walletAddress: string, walletPrivateKey: string): LoadCredentialsResult {
  if (!existsSync(CREDENTIALS_FILE)) {
    return { ok: false, reason: "not_found" }
  }

  let stored: StoredCredentials
  try {
    stored = JSON.parse(readFileSync(CREDENTIALS_FILE, "utf-8")) as StoredCredentials
  } catch {
    return { ok: false, reason: "decrypt_failed" }
  }

  // Detect wallet change before attempting decryption
  if (stored.walletAddress !== walletAddress) {
    return {
      ok: false,
      reason: "wallet_mismatch",
      storedAddress: stored.walletAddress,
      currentAddress: walletAddress,
    }
  }

  try {
    const key = deriveKey(walletPrivateKey)
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(stored.iv, "hex"))
    decipher.setAuthTag(Buffer.from(stored.tag, "hex"))
    const plain = decipher.update(Buffer.from(stored.data, "hex")) + decipher.final("utf8")
    const { authToken, ct0 } = JSON.parse(plain) as { authToken: string; ct0: string }
    return { ok: true, creds: { authToken, ct0, username: stored.username } }
  } catch {
    return { ok: false, reason: "decrypt_failed" }
  }
}

export function credentialsExist(): boolean {
  return existsSync(CREDENTIALS_FILE)
}

export function clearCredentials(): void {
  if (existsSync(CREDENTIALS_FILE)) {
    unlinkSync(CREDENTIALS_FILE)
  }
}

export function getStoredUsername(): string | undefined {
  if (!existsSync(CREDENTIALS_FILE)) return undefined
  try {
    const stored = JSON.parse(readFileSync(CREDENTIALS_FILE, "utf-8")) as StoredCredentials
    return stored.username
  } catch {
    return undefined
  }
}
