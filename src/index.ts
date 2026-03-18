#!/usr/bin/env node
import yargs from "yargs"
import { hideBin } from "yargs/helpers"

const cli = yargs(hideBin(process.argv))
  .scriptName("twitsh")
  .usage("$0 <command> [options]")

  .command("start", "Initialize wallet and show setup instructions", () => {}, async () => {
    const { startCommand } = await import("./commands/start.js")
    await startCommand()
  })

  .command("balance", "Show wallet address and USDC balance on Base", () => {}, async () => {
    const { balanceCommand } = await import("./commands/balance.js")
    await balanceCommand()
  })

  .command("endpoints", "List all available API endpoints with descriptions and prices", () => {}, async () => {
    const { endpointsCommand } = await import("./commands/endpoints.js")
    await endpointsCommand()
  })

  .command(
    "fetch <url>",
    "Fetch a twitsh endpoint with automatic x402 payment and credential injection",
    (y) =>
      y
        .positional("url", {
          type: "string",
          description: "Full endpoint URL (e.g. https://x402.twit.sh/users/by/username?username=elonmusk)",
          demandOption: true,
        })
        .option("method", {
          alias: "m",
          type: "string",
          description: "HTTP method (default: GET)",
          choices: ["GET", "POST", "DELETE", "PUT", "PATCH"],
          default: "GET",
        })
        .option("body", {
          alias: "b",
          type: "string",
          description: "Request body as JSON string (for POST/PUT)",
        })
        .option("header", {
          alias: "H",
          type: "string",
          array: true,
          description: 'Additional headers in "Key: Value" format',
        }),
    async (args) => {
      const { fetchCommand } = await import("./commands/fetch.js")
      await fetchCommand({
        url: args.url as string,
        method: args.method,
        body: args.body,
        header: args.header,
      })
    },
  )

  .command("login", "Connect your X account via browser (required for POST/DELETE endpoints)", () => {}, async () => {
    const { loginCommand } = await import("./commands/login.js")
    await loginCommand()
  })

  .command("logout", "Disconnect your X account and clear stored credentials", () => {}, async () => {
    const { logoutCommand } = await import("./commands/logout.js")
    logoutCommand()
  })

  .command("whoami", "Show which X account is currently connected", () => {}, async () => {
    const { whoamiCommand } = await import("./commands/whoami.js")
    whoamiCommand()
  })

  .demandCommand(1, "Please specify a command. Run `twitsh help` for usage.")
  .help()
  .alias("help", "h")
  .version()
  .strict()

void cli.parseAsync().catch((err: Error) => {
  console.error(JSON.stringify({ error: err.message, code: "CLI_ERROR" }))
  process.exit(1)
})
