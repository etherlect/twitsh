import { getWallet } from "../wallet.js"
import { getUsdcBalance } from "../x402.js"
import { getUsdcBalanceTempo } from "../mpp.js"
import { LOW_BALANCE_THRESHOLD, getMode } from "../config.js"

export async function balanceCommand(): Promise<void> {
  const wallet = getWallet()
  const mode = getMode()

  const balance = mode === "mpp"
    ? await getUsdcBalanceTempo(wallet.address)
    : await getUsdcBalance(wallet.address)

  const network = mode === "mpp" ? "Tempo" : "Base"

  if (balance > 0 && balance < LOW_BALANCE_THRESHOLD) {
    console.error(
      `⚠ Low balance: ${balance.toFixed(6)} USDC remaining at ${wallet.address} — send USDC on ${network} to refill soon`,
    )
  }

  const output: Record<string, string> = {
    address: wallet.address,
    balance: balance.toFixed(6),
    currency: "USDC",
    network,
  }

  if (mode === "mpp") {
    output.note = "No gas needed — server sponsors Tempo fees"
  }

  if (balance === 0) {
    output.warning = `Send USDC on ${network} to ${wallet.address} to use paid endpoints`
  }

  console.log(JSON.stringify(output, null, 2))
}
