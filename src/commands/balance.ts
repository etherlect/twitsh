import { getWallet } from "../wallet.js"
import { getUsdcBalance } from "../x402.js"
import { LOW_BALANCE_THRESHOLD } from "../config.js"

export async function balanceCommand(): Promise<void> {
  const wallet = getWallet()
  const balance = await getUsdcBalance(wallet.address)

  // Warn to stderr if low — does not interrupt current task
  if (balance > 0 && balance < LOW_BALANCE_THRESHOLD) {
    console.error(
      `⚠ Low balance: ${balance.toFixed(6)} USDC remaining at ${wallet.address} — send USDC on Base to refill soon`,
    )
  }

  console.log(
    JSON.stringify(
      {
        address: wallet.address,
        balance: balance.toFixed(6),
        currency: "USDC",
        network: "Base",
      },
      null,
      2,
    ),
  )
}
