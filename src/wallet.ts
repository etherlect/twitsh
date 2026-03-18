import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "fs"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { getAddress } from "viem"
import type { LocalAccount } from "viem"
import { CONFIG_DIR, WALLET_FILE } from "./config.js"

export type Wallet = {
  account: LocalAccount
  address: `0x${string}`
  privateKey: `0x${string}`
}

type StoredWallet = {
  privateKey: `0x${string}`
  address: `0x${string}`
  createdAt: string
}

function normalizePrivateKey(raw: string, source: string): `0x${string}` {
  const key = raw.trim()
  if (!/^(0x)?[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error(
      `Invalid private key in ${source}.\n` +
        `Expected a 64-character hex string, with or without a 0x prefix (e.g. 0xabc123...)\n` +
        `Got: "${key.slice(0, 10)}..." (${key.length} chars)`,
    )
  }
  return (key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`
}

export function walletExists(): boolean {
  return existsSync(WALLET_FILE)
}

export function getWallet(): Wallet {
  mkdirSync(CONFIG_DIR, { recursive: true })

  // Env var override — never touch disk
  if (process.env.TWITSH_PRIVATE_KEY) {
    const pk = normalizePrivateKey(process.env.TWITSH_PRIVATE_KEY, "TWITSH_PRIVATE_KEY env var")
    const account = privateKeyToAccount(pk)
    return { account, address: account.address, privateKey: pk }
  }

  // Load existing wallet
  if (existsSync(WALLET_FILE)) {
    const raw = readFileSync(WALLET_FILE, "utf-8")
    const stored: StoredWallet = JSON.parse(raw)
    const pk = normalizePrivateKey(stored.privateKey, WALLET_FILE)
    const account = privateKeyToAccount(pk)
    return { account, address: account.address, privateKey: pk }
  }

  // Generate new wallet
  const privateKey = generatePrivateKey()
  const account = privateKeyToAccount(privateKey)
  const stored: StoredWallet = {
    privateKey,
    address: getAddress(account.address),
    createdAt: new Date().toISOString(),
  }
  writeFileSync(WALLET_FILE, JSON.stringify(stored, null, 2), "utf-8")
  chmodSync(WALLET_FILE, 0o600)
  return { account, address: account.address, privateKey }
}
