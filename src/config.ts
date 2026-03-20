import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { homedir } from "os"
import { join } from "path"

export const CONFIG_DIR    = join(homedir(), ".twitsh")
export const WALLET_FILE   = join(CONFIG_DIR, "wallet.json")
export const OPENAPI_FILE  = join(CONFIG_DIR, "openapi.json")
export const OPENAPI_META  = join(CONFIG_DIR, "openapi-meta.json")

export const OPENAPI_URL   = "https://x402.twit.sh/openapi.json"
export const API_ORIGIN    = "https://x402.twit.sh"
export const CACHE_TTL_MS  = 60 * 60 * 1000 // 1 hour

export const CREDENTIALS_FILE = join(CONFIG_DIR, "credentials.json")
export const CONFIG_FILE      = join(CONFIG_DIR, "config.json")

export const USDC_ADDRESS  = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`
export const LOW_BALANCE_THRESHOLD = 0.50

export const MPP_API_ORIGIN  = "https://mpp.twit.sh"
export const MPP_OPENAPI_URL = "https://mpp.twit.sh/openapi.json"
export const USDC_TEMPO      = "0x20C000000000000000000000b9537d11c60E8b50" as `0x${string}`

export type Mode = "x402" | "mpp"

export function getMode(): Mode {
  try {
    if (existsSync(CONFIG_FILE)) {
      const cfg = JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) as { mode?: string }
      if (cfg.mode === "mpp") return "mpp"
    }
  } catch {
    // fall through to default
  }
  return "x402"
}

export function setMode(mode: Mode): void {
  mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(CONFIG_FILE, JSON.stringify({ mode }, null, 2), "utf-8")
}

export function getApiOrigin(): string {
  return getMode() === "mpp" ? MPP_API_ORIGIN : API_ORIGIN
}

export function getOpenapiUrl(): string {
  return getMode() === "mpp" ? MPP_OPENAPI_URL : OPENAPI_URL
}

export function getOpenapiFile(): string {
  return getMode() === "mpp"
    ? join(CONFIG_DIR, "openapi-mpp.json")
    : join(CONFIG_DIR, "openapi-x402.json")
}

export function getOpenapiMeta(): string {
  return getMode() === "mpp"
    ? join(CONFIG_DIR, "openapi-mpp-meta.json")
    : join(CONFIG_DIR, "openapi-x402-meta.json")
}
