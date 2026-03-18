import { loadEndpoints, isCacheStale, fetchAndCache, loadEndpointsFromCache } from "../openapi.js"
import { existsSync } from "fs"
import { OPENAPI_FILE, OPENAPI_META } from "../config.js"
import { readFileSync } from "fs"

function getCachedAt(): string | null {
  try {
    const meta = JSON.parse(readFileSync(OPENAPI_META, "utf-8")) as { fetchedAt: string }
    return meta.fetchedAt
  } catch {
    return null
  }
}

export async function endpointsCommand(): Promise<void> {
  // Always refresh if stale — endpoints is an explicit request for up-to-date info
  let endpoints
  if (isCacheStale() || !existsSync(OPENAPI_FILE)) {
    endpoints = await fetchAndCache()
  } else {
    endpoints = loadEndpointsFromCache()
  }

  const cachedAt = getCachedAt()

  console.log(
    JSON.stringify(
      {
        origin: "https://x402.twit.sh",
        cachedAt,
        count: endpoints.length,
        endpoints,
        usage: 'npx twitsh fetch "https://x402.twit.sh/<path>?param=value"',
      },
      null,
      2,
    ),
  )
}
