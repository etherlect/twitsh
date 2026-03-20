import { Mppx, tempo } from "mppx/client"
import { privateKeyToAccount } from "viem/accounts"
import { createPublicClient, http, formatUnits } from "viem"
import { USDC_TEMPO } from "./config.js"
import type { Wallet } from "./wallet.js"
import type { PaymentInfo, FetchOptions } from "./x402.js"

const TEMPO_CHAIN = {
  id: 4217,
  name: "Tempo",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.tempo.xyz"] } },
} as const

const USDC_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const

export async function getUsdcBalanceTempo(address: `0x${string}`): Promise<number> {
  const publicClient = createPublicClient({ chain: TEMPO_CHAIN, transport: http() })
  const raw = await publicClient.readContract({
    address: USDC_TEMPO,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: [address],
  })
  return Number(formatUnits(raw as bigint, 6))
}

export async function executeMppFetch(
  url: string,
  options: FetchOptions,
  wallet: Wallet,
): Promise<{ data: unknown; paymentInfo: PaymentInfo | null }> {
  const { method = "GET", body, headers = {} } = options

  const balance = await getUsdcBalanceTempo(wallet.address)
  if (balance === 0) {
    throw new Error(
      `Insufficient balance: no USDC on Tempo.\n` +
        `Send USDC on Tempo to: ${wallet.address}\nNo gas needed — server sponsors fees.`,
    )
  }

  const account = privateKeyToAccount(wallet.privateKey as `0x${string}`)
  const mppxClient = await Mppx.create({ methods: [tempo({ account })], polyfill: false })

  const fetchInit: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    ...(body ? { body } : {}),
  }

  const response = await mppxClient.fetch(url, fetchInit)

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Request failed: ${response.status} ${response.statusText}\n${text}`)
  }

  const data = await response.json()
  return {
    data,
    paymentInfo: {
      price: "~$0.0025",
      txHash: null,
      network: "tempo",
    },
  }
}
