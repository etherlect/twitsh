import { getWallet, walletExists } from "../wallet.js"
import { fetchAndCache } from "../openapi.js"
import { getUsdcBalance } from "../x402.js"

export async function startCommand(): Promise<void> {
  if (walletExists()) {
    const wallet = getWallet()
    const balance = await getUsdcBalance(wallet.address).catch(() => null)
    console.log(
      JSON.stringify(
        {
          status: "already_initialized",
          message: "Wallet already exists at ~/.twitsh/wallet.json — no changes made.",
          address: wallet.address,
          balance: balance !== null ? `${balance.toFixed(6)} USDC` : "unavailable",
          network: "Base",
        },
        null,
        2,
      ),
    )
    return
  }

  // Create wallet
  const wallet = getWallet()

  // Pre-warm openapi cache
  try {
    await fetchAndCache()
  } catch {
    // non-fatal — user can still run `twitsh endpoints` later
  }

  console.log(
    JSON.stringify(
      {
        status: "initialized",
        message: "Wallet created. Default mode: x402 (USDC on Base). Run `npx twitsh mode mpp` to switch to MPP/Tempo.",
        address: wallet.address,
        walletFile: `${process.env.HOME ?? "~"}/.twitsh/wallet.json`,
        network: "Base (x402 default) / Tempo (mpp)",
        note: "No gas needed on either chain — USDC only.",
        next: [
          "Send USDC on Base to your address above (x402 mode default)",
          "Run `twitsh balance` to confirm funds",
          "Run `twitsh endpoints` to see available routes",
          "Run `twitsh mode mpp` to switch to MPP/Tempo mode",
        ],
      },
      null,
      2,
    ),
  )
}
