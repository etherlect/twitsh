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
        message: "Wallet created. Send USDC on Base to the address below to use paid endpoints.",
        address: wallet.address,
        walletFile: `${process.env.HOME ?? "~"}/.twitsh/wallet.json`,
        network: "Base",
        note: "No ETH needed for gas — USDC only.",
        next: [
          "Send USDC on Base to your address above",
          "Run `twitsh balance` to confirm funds",
          "Run `twitsh endpoints` to see available routes",
        ],
      },
      null,
      2,
    ),
  )
}
