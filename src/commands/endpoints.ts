import { loadEndpoints, isCacheStale, fetchAndCache, loadEndpointsFromCache } from "../openapi.js"
import { existsSync } from "fs"
import { getOpenapiFile, getOpenapiMeta, getApiOrigin } from "../config.js"
import { readFileSync } from "fs"

function getCachedAt(): string | null {
  try {
    const meta = JSON.parse(readFileSync(getOpenapiMeta(), "utf-8")) as { fetchedAt: string }
    return meta.fetchedAt
  } catch {
    return null
  }
}

export async function endpointsCommand(): Promise<void> {
  // Always refresh if stale — endpoints is an explicit request for up-to-date info
  let endpoints
  if (isCacheStale() || !existsSync(getOpenapiFile())) {
    endpoints = await fetchAndCache()
  } else {
    endpoints = loadEndpointsFromCache()
  }

  const cachedAt = getCachedAt()
  const origin = getApiOrigin()

  console.log(
    JSON.stringify(
      {
        origin,
        cachedAt,
        count: endpoints.length,
        endpoints,
        usage: `npx twitsh fetch "${origin}/<path>?param=value"`,
      },
      null,
      2,
    ),
  )
}
