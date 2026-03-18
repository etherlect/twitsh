import { getWallet } from "../wallet.js"
import { saveCredentials, credentialsExist, getStoredUsername } from "../credentials.js"

const LOGIN_TIMEOUT_SECONDS = 180

export async function loginCommand(): Promise<void> {
  const wallet = getWallet()

  if (credentialsExist()) {
    const existing = getStoredUsername()
    const who = existing ? `@${existing}` : "an X account"
    console.error(`Already connected as ${who}. Run \`twitsh logout\` first to switch accounts.`)
  }

  const { chromium } = await import("playwright")

  console.error("Opening browser — log in to x.com to continue...")

  const browser = await chromium.launch({
    headless: false,
    channel: "chrome",
    args: ["--disable-blink-features=AutomationControlled"],
  })

  const ctx = await browser.newContext()
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined })
  })

  const page = await ctx.newPage()
  await page.goto("https://x.com")

  let authToken: string | undefined
  let ct0: string | undefined
  let username: string | undefined

  for (let i = 0; i < LOGIN_TIMEOUT_SECONDS; i++) {
    const cookies = await ctx.cookies("https://x.com")
    const tokenCookie = cookies.find((c) => c.name === "auth_token")
    const ct0Cookie   = cookies.find((c) => c.name === "ct0")

    if (tokenCookie && ct0Cookie) {
      authToken = tokenCookie.value
      ct0 = ct0Cookie.value
      try {
        await page.waitForSelector('a[data-testid="AppTabBar_Profile_Link"]', { timeout: 15_000 })
        const handle = await page.$eval(
          'a[data-testid="AppTabBar_Profile_Link"]',
          (el) => el.getAttribute("href"),
        )
        username = handle?.replace(/^\//, "") || undefined
      } catch {
        // username is optional
      }
      break
    }

    await page.waitForTimeout(1000)
  }

  await browser.close()

  if (!authToken || !ct0) {
    console.error(
      JSON.stringify({
        error: `Timed out after ${LOGIN_TIMEOUT_SECONDS}s waiting for login. Please try again.`,
        code: "LOGIN_TIMEOUT",
      }),
    )
    process.exit(1)
  }

  saveCredentials({ authToken, ct0, username }, wallet.address, wallet.privateKey)

  const who = username ? `@${username}` : "your X account"
  console.log(
    JSON.stringify({
      status: "connected",
      message: `Connected ${who} successfully.`,
      username: username ?? null,
      credentialsFile: `${process.env.HOME ?? "~"}/.twitsh/credentials.json`,
    }, null, 2),
  )
}
