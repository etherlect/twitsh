import { getWallet } from "../wallet.js"
import { loadCredentials, credentialsExist } from "../credentials.js"

export function whoamiCommand(): void {
  if (!credentialsExist()) {
    console.log(
      JSON.stringify(
        { status: "not_connected", message: "No X account connected. Run `twitsh login` to connect." },
        null,
        2,
      ),
    )
    return
  }

  const wallet = getWallet()
  const result = loadCredentials(wallet.address, wallet.privateKey)

  if (!result.ok) {
    if (result.reason === "wallet_mismatch") {
      console.log(
        JSON.stringify(
          {
            status: "wallet_mismatch",
            error:
              `Credentials were encrypted with a different wallet (${result.storedAddress}).\n` +
              `Current wallet is ${result.currentAddress}.\n` +
              `Run \`twitsh login\` again to re-connect your X account.`,
            code: "WALLET_MISMATCH",
          },
          null,
          2,
        ),
      )
      return
    }
    console.log(
      JSON.stringify(
        { status: "error", error: "Failed to read credentials. Run `twitsh login` again.", code: "DECRYPT_FAILED" },
        null,
        2,
      ),
    )
    return
  }

  const { creds } = result
  console.log(
    JSON.stringify(
      {
        status: "connected",
        username: creds.username ?? null,
        display: creds.username ? `@${creds.username}` : "Connected (username unknown)",
      },
      null,
      2,
    ),
  )
}
