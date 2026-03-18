import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { CONFIG_DIR, OPENAPI_FILE, OPENAPI_META, OPENAPI_URL, API_ORIGIN, CACHE_TTL_MS } from "./config.js"

export type EndpointParam = {
  name: string
  in: "query" | "path" | "header" | "cookie"
  required: boolean
  description: string
  example?: string
  schema: { type: string; format?: string }
}

export type EndpointBodyProperty = {
  type: string
  description: string
  required: boolean
}

export type Endpoint = {
  operationId: string
  method: string
  path: string
  url: string
  summary: string
  description: string
  price: string
  parameters: EndpointParam[]
  requestBody?: {
    required: boolean
    properties: Record<string, EndpointBodyProperty>
  }
}

function normalizeEndpoints(spec: Record<string, unknown>): Endpoint[] {
  const endpoints: Endpoint[] = []
  const paths = (spec.paths ?? {}) as Record<string, Record<string, unknown>>

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (!["get", "post", "delete", "put", "patch"].includes(method)) continue

      const op = operation as Record<string, unknown>
      const paymentInfo = op["x-payment-info"] as Record<string, string> | undefined
      const price = paymentInfo?.price ?? "unknown"

      const rawParams = (op.parameters ?? []) as Array<Record<string, unknown>>
      const parameters: EndpointParam[] = rawParams.map((p) => {
        const schema = (p.schema ?? {}) as Record<string, unknown>
        return {
          name: p.name as string,
          in: p.in as EndpointParam["in"],
          required: (p.required as boolean) ?? false,
          description: (p.description as string) ?? "",
          example: (schema.example ?? p.example) as string | undefined,
          schema: {
            type: (schema.type as string) ?? "string",
            format: schema.format as string | undefined,
          },
        }
      })

      let requestBody: Endpoint["requestBody"] = undefined
      const rawBody = op.requestBody as Record<string, unknown> | undefined
      if (rawBody) {
        const content = rawBody.content as Record<string, unknown> | undefined
        const jsonContent = content?.["application/json"] as Record<string, unknown> | undefined
        const schema = (jsonContent?.schema ?? {}) as Record<string, unknown>
        const requiredFields = (schema.required ?? []) as string[]
        const rawProps = (schema.properties ?? {}) as Record<string, Record<string, unknown>>
        const properties: Record<string, EndpointBodyProperty> = {}
        for (const [key, val] of Object.entries(rawProps)) {
          properties[key] = {
            type: (val.type as string) ?? "string",
            description: (val.description as string) ?? "",
            required: requiredFields.includes(key),
          }
        }
        requestBody = {
          required: (rawBody.required as boolean) ?? false,
          properties,
        }
      }

      endpoints.push({
        operationId: (op.operationId as string) ?? `${method}_${path.replace(/\//g, "_")}`,
        method: method.toUpperCase(),
        path,
        url: `${API_ORIGIN}${path}`,
        summary: (op.summary as string) ?? "",
        description: (op.description as string) ?? "",
        price,
        parameters,
        requestBody,
      })
    }
  }

  return endpoints
}

export function isCacheStale(): boolean {
  if (!existsSync(OPENAPI_META)) return true
  try {
    const meta = JSON.parse(readFileSync(OPENAPI_META, "utf-8")) as { fetchedAt: string }
    const age = Date.now() - new Date(meta.fetchedAt).getTime()
    return age > CACHE_TTL_MS
  } catch {
    return true
  }
}

export async function fetchAndCache(): Promise<Endpoint[]> {
  mkdirSync(CONFIG_DIR, { recursive: true })
  const response = await fetch(OPENAPI_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch OpenAPI spec: ${response.status} ${response.statusText}`)
  }
  const spec = (await response.json()) as Record<string, unknown>
  const endpoints = normalizeEndpoints(spec)
  writeFileSync(OPENAPI_FILE, JSON.stringify(endpoints, null, 2), "utf-8")
  writeFileSync(OPENAPI_META, JSON.stringify({ fetchedAt: new Date().toISOString() }, null, 2), "utf-8")
  return endpoints
}

export function loadEndpointsFromCache(): Endpoint[] {
  const raw = readFileSync(OPENAPI_FILE, "utf-8")
  return JSON.parse(raw) as Endpoint[]
}

export async function loadEndpoints(): Promise<Endpoint[]> {
  if (!isCacheStale() && existsSync(OPENAPI_FILE)) {
    return loadEndpointsFromCache()
  }
  return fetchAndCache()
}

export function refreshInBackground(): void {
  fetchAndCache().catch(() => {
    // silent — background refresh, don't interrupt the current command
  })
}
