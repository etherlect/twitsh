# twitsh — X/Twitter Data API

Access Twitter/X data via x402 micropayments. Calls cost $0.0025–$0.01 USDC on Base.

## Triggers

Use this skill when the user wants to:

- Look up Twitter/X users, tweets, followers, or any X data
- Post, like, retweet, follow, or take any action on X/Twitter
- Set up twitsh, onboard, or get started with X/Twitter data access
- Use paid X/Twitter API endpoints with micropayments
- Install or add the twitsh skill

## Help

    npx twitsh help

Run this any time to see all available commands.

## Installation (run once, first time only)

    npx twitsh start

This creates a wallet at ~/.twitsh/wallet.json and prints your wallet address.
If the wallet already exists, it will say so — do not run start again.

After running start, show the user:
- Their full wallet address (e.g. 0x742d35Cc6634C0532925a3b8D4C9E9B5e9F2D4a1)
- That they need to send USDC on Base to that address to use paid endpoints
- That no ETH is needed for gas — USDC only
- Wait for them to confirm before proceeding with any fetch calls

## Before every task involving X/Twitter data

Always run this first to get the current endpoint list with descriptions and prices:

    npx twitsh endpoints

Read the `description` field of each endpoint to choose the right one for the task.
Do not guess endpoint URLs — always derive them from the endpoints output.

Example: user asks "how many followers does elonmusk have?"
→ read endpoints output
→ getUserByUsername description says "Returns full profile data including follower counts"
→ fetch: https://x402.twit.sh/users/by/username?username=elonmusk
→ read: response.data

## Check balance before fetching

    npx twitsh balance

Returns full wallet address and USDC balance.

If balance is 0:
- Show the user their full wallet address
- Tell them to send USDC on Base to that address
- Note: no ETH needed for gas — USDC only
- Do not attempt fetch calls until the user confirms they have funded the wallet

If balance is above 0 but below $0.50:
- Continue with the current task
- Print a warning alongside the results:
  "⚠ Low balance: X.XX USDC remaining at <full address> — send USDC on Base to refill soon"
- Do not block or interrupt the task

## POST and DELETE endpoints require X account login

Some endpoints (like posting tweets, liking, retweeting, following) require a connected X account.
Before using any POST or DELETE endpoint, check if the user is logged in:

    npx twitsh whoami

If not connected, ask the user to run:

    npx twitsh login

This opens Chrome and asks them to log in to x.com. Once logged in, credentials are saved
encrypted to ~/.twitsh/credentials.json. The AI agent never sees or handles these credentials —
twitsh injects them automatically before each authenticated request.

If whoami shows a wallet mismatch error, ask the user to run `twitsh login` again.

## Fetch data

    npx twitsh fetch "https://x402.twit.sh/users/by/username?username=elonmusk"
    npx twitsh fetch "https://x402.twit.sh/tweets/search?words=bitcoin&since=2025-01-01"
    npx twitsh fetch "https://x402.twit.sh/tweets/user?username=elonmusk"

For POST endpoints (credentials injected automatically — do not include auth_token or ct0):

    npx twitsh fetch "https://x402.twit.sh/tweets" --method POST --body '{"text":"hello"}'

For DELETE endpoints (credentials injected automatically):

    npx twitsh fetch "https://x402.twit.sh/tweets/like?id=1234567890" --method DELETE

## Notes
- Response body → stdout (JSON — parse this for data)
- Payment confirmation → stderr (ignore for data extraction)
- Never truncate wallet addresses — always show them in full
- Never pass auth_token or ct0 manually — twitsh handles injection automatically
