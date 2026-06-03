# Injective Analyzer

AI-powered portfolio copilot for Injective wallets. Paste any `inj1...` address to see live holdings, staking, perpetual positions, liquidation risk, and chat with an AI analyst grounded in real on-chain data.

## How It Works

**Paste a wallet address** → app fetches live data from Injective's LCD and Indexer → displays:
- **Asset Holdings**: All tokens across bank + 100+ trading subaccounts, USD allocation, price sourced from CoinGecko
- **Staking**: INJ staked, validators, unclaimed rewards
- **Perpetual Positions**: 21+ open derivatives, unrealized PnL, liquidation distance (% to liquidation price)
- **Risk Signals**: Concentration, liquidation proximity, idle rewards
- **AI Copilot**: Ask questions about risk, allocation, positions — responds with data from this wallet only, never invents numbers

## AI Integration

The copilot uses an LLM (configurable via `LLM_BASE_URL` and `LLM_MODEL` in `.env.local`) to analyze your portfolio in natural language. It receives:
- Holdings breakdown (symbol, amount, USD value, allocation %)
- Staking details
- Perp positions with entry/mark/liquidation prices and PnL
- Deterministic risk flags (concentration, liquidation proximity, idle rewards)

The LLM is instructed to ground every statement in this data — it never invents numbers or prices. Default: Groq `llama-3.3-70b-versatile` (free tier, 100K tokens/day).

## Injective Integration

- **LCD endpoint**: `/cosmos/bank/v1beta1/balances`, `/cosmos/staking/v1beta1/delegations` (staking)
- **Indexer (grpc-web)**: `/api/exchange/portfolio/v2/portfolio/{address}` (all subaccount balances + perp positions with unrealized PnL)
- **Token metadata**: 20+ denoms mapped (INJ, USDC, WETH, WUSDM, USDe, ENA, aUSD, IBC tokens)
- **Pricing**: CoinGecko API (free tier, ~50 req/min)

The challenge: Injective splits funds across the bank module + ~100 trading subaccounts. Different fields store numbers at different scales (raw chain units vs. human-readable). The app resolves these via token decimals and denom metadata.

## What's Shown, What's Not

**Shown:**
- Liquid holdings (bank + all subaccounts), USD values
- Staking + claimable rewards
- Open perpetual positions, liquidation risk
- AI copilot (read-only analysis)

**Not included (out of scope):**
- Sending funds, claiming rewards, closing positions
- Connecting wallet / signing transactions
- Historical P&L or trade history
- Some IBC tokens (unpriced — shown as "—")

## Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Data**: Injective LCD + Indexer (grpc-web), CoinGecko API
- **LLM**: Groq (llama-3.3-70b-versatile, default; any OpenAI-compatible endpoint works)
- **Key dependencies**: `bech32` (subaccount derivation), `ethers.js` (not used yet; for future on-chain signing)

## Running Locally

```bash
npm install
npm run dev
# Open http://localhost:3000
```

Create `.env.local`:

LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_API_KEY=gsk_your_groq_key_here
LLM_MODEL=llama-3.3-70b-versatile

Grab a free Groq key: https://console.groq.com/keys

## Deployment

Push to GitHub, connect repo to Vercel. Vercel auto-deploys on `main` push. Set env vars in Vercel dashboard (same as `.env.local`).

## Known Limitations

- **Partial pricing**: IBC tokens bridged to Injective show as "—" (no price data available)
- **Live drift**: Wallet is a trading bot; balances shift between snapshots
- **No on-chain actions**: Read-only; cannot send, trade, or claim on behalf of user

## License

MIT