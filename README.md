# twitsh

CLI tool for the [twit.sh](https://twit.sh) X/Twitter API — access Twitter/X data via x402 (Base) or MPP (Tempo) micropayments. Pay per request in USDC — no API keys, no monthly subscriptions.

All available endpoints are documented at **[twit.sh](https://twit.sh)**.

## Quick start

```bash
# 1. Create your wallet
npx twitsh start

# 2. Check your mode (default: x402 on Base)
npx twitsh mode

# 3. Fund it — send USDC to the printed address on the chain for your mode
#    x402: send USDC on Base
#    mpp:  send USDC on Tempo (no gas needed on either chain)

# 4. Check your balance
npx twitsh balance

# 5. See available endpoints (URLs reflect current mode)
npx twitsh endpoints

# 6. Fetch data
npx twitsh fetch "https://x402.twit.sh/users/by/username?username=elonmusk"
```

## Commands

| Command | Description |
|---|---|
| `npx twitsh start` | Create wallet, print address for funding |
| `npx twitsh balance` | Show wallet address and USDC balance |
| `npx twitsh mode [x402\|mpp]` | Show or set payment mode |
| `npx twitsh endpoints` | List all available endpoints with descriptions and prices |
| `npx twitsh fetch <url>` | Fetch an endpoint — payment handled automatically |
| `npx twitsh login` | Connect your X account (required for write endpoints) |
| `npx twitsh logout` | Disconnect your X account |
| `npx twitsh whoami` | Show which X account is connected |

## Payment modes

twitsh supports two payment protocols. Switch anytime with `npx twitsh mode`:

| Mode | Chain | Base URL | Fund with |
|---|---|---|---|
| `x402` (default) | Base | `https://x402.twit.sh` | USDC on Base |
| `mpp` | Tempo | `https://mpp.twit.sh` | USDC on Tempo |

Both modes use the same wallet address. No ETH or gas tokens needed on either chain.

```bash
npx twitsh mode x402   # switch to x402 (Base)
npx twitsh mode mpp    # switch to MPP (Tempo)
```

## Fetching data

Always run `npx twitsh endpoints` first to discover available routes. The URLs in the output already reflect your current mode.

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

Calls cost $0.0025–$0.01 USDC per request. No subscription, no rate limits beyond your balance.

- **x402 mode**: pay on Base — send USDC on Base to your wallet address
- **mpp mode**: pay on Tempo — send USDC on Tempo to your wallet address

Run `npx twitsh balance` to see your address and current network.

## Storage

All data is stored in `~/.twitsh/`:

| File | Contents |
|---|---|
| `wallet.json` | EVM wallet (keep the private key secret) |
| `config.json` | Current payment mode (x402 or mpp) |
| `credentials.json` | Encrypted X session credentials |
| `openapi-x402.json` | Cached endpoint list for x402 mode (refreshed hourly) |
| `openapi-mpp.json` | Cached endpoint list for MPP mode (refreshed hourly) |

## For AI agents

See `skill.md` for instructions on how to use twitsh as an AI agent skill.
