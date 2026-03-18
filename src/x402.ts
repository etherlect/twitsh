import { x402Client, x402HTTPClient } from "@x402/core/client"
import { toClientEvmSigner } from "@x402/evm"
import { registerExactEvmScheme } from "@x402/evm/exact/client"
import { createPublicClient, http, formatUnits } from "viem"
import { base } from "viem/chains"
import { USDC_ADDRESS } from "./config.js"
import type { Wallet } from "./wallet.js"

const USDC_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const

export type PaymentInfo = {
  price: string
  txHash: string | null
  network: "base"
}

export type FetchOptions = {
  method?: string
  body?: string
  headers?: Record<string, string>
}

function tokenToUsd(amount: string): number {
  return Number(formatUnits(BigInt(amount), 6))
}

export async function getUsdcBalance(address: `0x${string}`): Promise<number> {
  const publicClient = createPublicClient({ chain: base, transport: http() })
  const raw = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: [address],
  })
  return Number(formatUnits(raw as bigint, 6))
}

export async function executeX402Fetch(
  url: string,
  options: FetchOptions,
  wallet: Wallet,
): Promise<{ data: unknown; paymentInfo: PaymentInfo | null }> {
  const { method = "GET", body, headers = {} } = options

  const buildInit = (extra: Record<string, string> = {}): RequestInit => ({
    method,
    headers: { "Content-Type": "application/json", ...headers, ...extra },
    ...(body ? { body } : {}),
  })

  // Initial probe request
  const probeResponse = await fetch(url, buildInit())

  if (probeResponse.status !== 402) {
    if (!probeResponse.ok) {
      const text = await probeResponse.text()
      throw new Error(`Request failed: ${probeResponse.status} ${probeResponse.statusText}\n${text}`)
    }
    const data = await probeResponse.json()
    return { data, paymentInfo: null }
  }

  // Parse the Payment-Required header (try body first, fall back to headers only)
  const probeClient = new x402HTTPClient(new x402Client())
  let body402: unknown
  try {
    body402 = await probeResponse.json()
  } catch {
    // no JSON body — rely on headers alone
  }

  let paymentRequired: ReturnType<typeof probeClient.getPaymentRequiredResponse>
  try {
    paymentRequired = probeClient.getPaymentRequiredResponse(
      (name) => probeResponse.headers.get(name),
      body402,
    )
  } catch (e) {
    throw new Error(
      `Failed to parse Payment-Required header: ${e instanceof Error ? e.message : String(e)}`,
    )
  }

  const accepts = (paymentRequired as { accepts?: unknown[] }).accepts
  if (!accepts?.length) {
    throw new Error("No payment requirements found in 402 response")
  }

  // Find the Base (eip155:8453) requirement
  const accept = accepts.find((r: unknown) => (r as { network: string }).network === "eip155:8453") as
    | { network: string; amount: string }
    | undefined

  if (!accept) {
    throw new Error("No Base (eip155:8453) payment option available for this endpoint")
  }

  const amount = tokenToUsd(accept.amount)

  // Check balance before paying
  const balance = await getUsdcBalance(wallet.address)
  if (balance < amount) {
    throw new Error(
      `Insufficient balance: need $${amount} USDC, have $${balance.toFixed(6)} USDC on Base.\n` +
        `Send USDC on Base to: ${wallet.address}\nNo ETH needed for gas.`,
    )
  }

  // Build payment client and sign payload
  const publicClient = createPublicClient({ chain: base, transport: http() })
  const signer = toClientEvmSigner(wallet.account, publicClient)
  const paymentClient = new x402Client()
  registerExactEvmScheme(paymentClient, { signer })
  const httpClient = new x402HTTPClient(paymentClient)

  const paymentPayload = await httpClient.createPaymentPayload(paymentRequired)
  const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload)

  // Retry with payment headers
  const paidResponse = await fetch(
    url,
    buildInit({
      ...paymentHeaders,
      "Access-Control-Expose-Headers": "PAYMENT-RESPONSE,X-PAYMENT-RESPONSE",
    }),
  )

  // Parse settlement for tx hash
  let txHash: string | null = null
  try {
    const settlement = httpClient.getPaymentSettleResponse((name) => paidResponse.headers.get(name))
    txHash = (settlement as { transaction?: string }).transaction ?? null
  } catch {
    // settlement header absent or malformed — non-fatal
  }

  if (!paidResponse.ok) {
    const text = await paidResponse.text()
    throw new Error(
      `Request failed after payment: ${paidResponse.status} ${paidResponse.statusText}\n${text}`,
    )
  }

  const data = await paidResponse.json()
  return {
    data,
    paymentInfo: {
      price: `$${amount.toFixed(4)}`,
      txHash,
      network: "base",
    },
  }
}
