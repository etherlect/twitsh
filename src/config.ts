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
