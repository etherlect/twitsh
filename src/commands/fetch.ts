import { getWallet } from "../wallet.js"
import { isCacheStale, refreshInBackground, loadEndpoints } from "../openapi.js"
import { executeX402Fetch } from "../x402.js"
import { executeMppFetch } from "../mpp.js"
import { getMode } from "../config.js"
import { loadCredentials, credentialsExist } from "../credentials.js"
import type { Endpoint } from "../openapi.js"

type FetchArgs = {
  url: string
  method?: string
  body?: string
  header?: string[]
}

function parseHeaders(rawHeaders: string[] = []): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const h of rawHeaders) {
    const idx = h.indexOf(":")
    if (idx === -1) continue
    const key = h.slice(0, idx).trim()
    const value = h.slice(idx + 1).trim()
    if (key) headers[key] = value
  }
  return headers
}

function endpointNeedsAuth(endpoint: Endpoint): { inBody: boolean; inQuery: boolean } {
  const allParams = [
    ...endpoint.parameters.map((p) => ({ name: p.name, location: p.in })),
    ...Object.entries(endpoint.requestBody?.properties ?? {}).map(([name]) => ({
      name,
      location: "body" as const,
    })),
  ]
  const authFields = ["auth_token", "ct0"]
  const inQuery = allParams.some((p) => authFields.includes(p.name) && p.location === "query")
  const inBody = allParams.some((p) => authFields.includes(p.name) && p.location === "body")
  return { inBody, inQuery }
}

function matchEndpoint(endpoints: Endpoint[], url: string, method: string): Endpoint | undefined {
  const parsed = new URL(url)
  const path = parsed.pathname
  const m = method.toUpperCase()
  return endpoints.find((e) => e.path === path && e.method === m)
}

function injectIntoQuery(url: string, authToken: string, ct0: string): string {
  const parsed = new URL(url)
  parsed.searchParams.set("auth_token", authToken)
  parsed.searchParams.set("ct0", ct0)
  return parsed.toString()
}

function injectIntoBody(body: string | undefined, authToken: string, ct0: string): string {
  const parsed = body ? (JSON.parse(body) as Record<string, unknown>) : {}
  parsed.auth_token = authToken
  parsed.ct0 = ct0
  return JSON.stringify(parsed)
}

export async function fetchCommand(args: FetchArgs): Promise<void> {
  const wallet = getWallet()
  const method = (args.method ?? "GET").toUpperCase()

  // Refresh openapi cache in background if stale — don't block fetch
  if (isCacheStale()) {
    refreshInBackground()
  }

  // Load endpoints to check if this one needs auth
  let endpoints: Endpoint[] = []
  try {
    endpoints = await loadEndpoints()
  } catch {
    // non-fatal — we'll just skip auth detection if cache is unavailable
  }

  let url = args.url
  let body = args.body
  const headers = parseHeaders(args.header)

  const matched = matchEndpoint(endpoints, url, method)
  if (matched) {
    const { inBody, inQuery } = endpointNeedsAuth(matched)

    if (inBody || inQuery) {
      // Endpoint requires X credentials
      if (!credentialsExist()) {
        console.error(
          JSON.stringify(
            {
              error: "This endpoint requires a connected X account. Run `twitsh login` first.",
              code: "AUTH_REQUIRED",
            },
            null,
            2,
          ),
        )
        process.exit(1)
      }

      const credsResult = loadCredentials(wallet.address, wallet.privateKey)

      if (!credsResult.ok) {
        if (credsResult.reason === "wallet_mismatch") {
          console.error(
            JSON.stringify(
              {
                error:
                  `X credentials were encrypted with a different wallet (${credsResult.storedAddress}).\n` +
                  `Current wallet is ${credsResult.currentAddress}.\n` +
                  `Run \`twitsh login\` again to re-connect your X account.`,
                code: "WALLET_MISMATCH",
              },
              null,
              2,
            ),
          )
        } else {
          console.error(
            JSON.stringify(
              {
                error: "Failed to decrypt X credentials. Run `twitsh login` again.",
                code: "DECRYPT_FAILED",
              },
              null,
              2,
            ),
          )
        }
        process.exit(1)
      }

      const { authToken, ct0 } = credsResult.creds

      // Inject silently — never logged, never in terminal history
      if (inQuery) {
        url = injectIntoQuery(url, authToken, ct0)
      }
      if (inBody) {
        body = injectIntoBody(body, authToken, ct0)
      }
    }
  }

  const mode = getMode()
  let result: Awaited<ReturnType<typeof executeX402Fetch>>
  try {
    result = mode === "mpp"
      ? await executeMppFetch(url, { method, body, headers }, wallet)
      : await executeX402Fetch(url, { method, body, headers }, wallet)
  } catch (e) {
    console.error(
      JSON.stringify(
        {
          error: e instanceof Error ? e.message : String(e),
          code: "FETCH_ERROR",
        },
        null,
        2,
      ),
    )
    process.exit(1)
  }

  const { data, paymentInfo } = result

  if (paymentInfo) {
    const txNote = paymentInfo.txHash ? ` (tx: ${paymentInfo.txHash})` : ""
    const networkLabel = paymentInfo.network === "tempo" ? "Tempo" : "Base"
    console.error(`# Paid ${paymentInfo.price} on ${networkLabel}${txNote}`)
  }

  console.log(JSON.stringify(data, null, 2))
}
