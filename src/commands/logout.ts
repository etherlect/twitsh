import { clearCredentials, credentialsExist, getStoredUsername } from "../credentials.js"

export function logoutCommand(): void {
  if (!credentialsExist()) {
    console.log(JSON.stringify({ status: "not_connected", message: "No X account connected." }, null, 2))
    return
  }

  const username = getStoredUsername()
  clearCredentials()

  const who = username ? `@${username}` : "X account"
  console.log(
    JSON.stringify(
      {
        status: "disconnected",
        message: `Disconnected ${who}. Credentials cleared from ~/.twitsh/credentials.json.`,
      },
      null,
      2,
    ),
  )
}
