# twitsh

CLI tool to fetch Twitter/X data via x402 micropayments. Pay per request in USDC on Base — no API keys, no monthly subscriptions.

## Quick start

```bash
# 1. Create your wallet
npx twitsh start

# 2. Fund it — send USDC on Base to the printed address (no ETH needed for gas)

# 3. Check your balance
npx twitsh balance

# 4. Fetch data
npx twitsh fetch "https://x402.twit.sh/users/by/username?username=elonmusk"
```

## Commands

| Command | Description |
|---|---|
| `npx twitsh start` | Create wallet, print address for funding |
| `npx twitsh balance` | Show wallet address and USDC balance |
| `npx twitsh endpoints` | List all available endpoints with descriptions and prices |
| `npx twitsh fetch <url>` | Fetch an endpoint — payment handled automatically |
| `npx twitsh login` | Connect your X account (required for write endpoints) |
| `npx twitsh logout` | Disconnect your X account |
| `npx twitsh whoami` | Show which X account is connected |

## Fetching data

Always run `npx twitsh endpoints` first to discover available routes and their descriptions.

```bash
# Get a user's profile and follower count
npx twitsh fetch "https://x402.twit.sh/users/by/username?username=elonmusk"

# Search tweets
npx twitsh fetch "https://x402.twit.sh/tweets/search?words=bitcoin&since=2025-01-01"

# Get a user's tweets
npx twitsh fetch "https://x402.twit.sh/tweets/user?username=elonmusk"
```

Response JSON is printed to stdout. Payment confirmation goes to stderr.

## Write endpoints (POST/DELETE)

Some endpoints (post tweet, like, retweet, follow) require a connected X account:

```bash
# Connect once — opens a browser, log in to x.com
npx twitsh login

# Post a tweet
npx twitsh fetch "https://x402.twit.sh/tweets" --method POST --body '{"text":"hello"}'

# Like a tweet
npx twitsh fetch "https://x402.twit.sh/tweets/like?id=1234567890" --method POST

# Unlike
npx twitsh fetch "https://x402.twit.sh/tweets/like?id=1234567890" --method DELETE
```

Credentials are encrypted with your wallet key and stored at `~/.twitsh/credentials.json`. They are never exposed to the terminal or any AI agent — injected silently per request.

## Pricing

Calls cost $0.0025–$0.01 USDC per request, paid on Base. No subscription, no rate limits beyond your balance.

Send USDC on Base to your wallet address (`npx twitsh balance` to see it). No ETH needed for gas.

## Storage

All data is stored in `~/.twitsh/`:

| File | Contents |
|---|---|
| `wallet.json` | EVM wallet (keep the private key secret) |
| `credentials.json` | Encrypted X session credentials |
| `openapi.json` | Cached endpoint list (refreshed hourly) |

## For AI agents

See `skill.md` for instructions on how to use twitsh as an AI agent skill.
