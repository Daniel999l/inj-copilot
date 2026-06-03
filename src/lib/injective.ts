import { bech32 } from 'bech32';
import { denomInfo } from './denoms';
import type {
  Asset,
  Flag,
  PortfolioFacts,
  PortfolioMetrics,
  PortfolioResponse,
  Position,
  StakingInfo,
} from './types';

// ── Config ────────────────────────────────────────────────────────────────
const LCD = (process.env.INJ_LCD_URL || 'https://injective-rest.publicnode.com').replace(/\/$/, '');
const INDEXER = (process.env.INJ_INDEXER_URL || 'https://sentry.exchange.grpc-web.injective.network').replace(/\/$/, '');
const CG_BASE = (process.env.COINGECKO_BASE_URL || 'https://api.coingecko.com/api/v3').replace(/\/$/, '');
const CG_KEY = process.env.COINGECKO_API_KEY || '';

const RISK_THRESHOLD_PCT = 15; // perp positions closer than this to liquidation are flagged
const CONCENTRATION_PCT = 50; // single-asset concentration warning

// ── Helpers ─────────────────────────────────────────────────────────────────
async function getJson(url: string, opts: RequestInit = {}, timeoutMs = 12000): Promise<any> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...opts,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(opts.headers || {}) },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function toNum(v: any): number {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isFinite(n) ? n : 0;
}

/** read a field that may be camelCase or snake_case */
function pick(obj: any, ...keys: string[]): any {
  for (const k of keys) if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  return undefined;
}

export function isInjectiveAddress(addr: string): boolean {
  return typeof addr === 'string' && /^inj1[0-9a-z]{38}$/.test(addr.trim());
}

/** inj1... bech32 address -> default subaccount id (0x + 40 hex + 24 zeros) */
export function defaultSubaccountId(address: string): string {
  const decoded = bech32.decode(address);
  const bytes = Buffer.from(bech32.fromWords(decoded.words));
  const hex = bytes.toString('hex').padStart(40, '0');
  return `0x${hex}${'0'.repeat(24)}`;
}

// ── On-chain reads ────────────────────────────────────────────────────────
async function fetchInjectivePortfolio(address: string) {
  const data = await getJson(`${INDEXER}/api/exchange/portfolio/v2/portfolio/${address}`, {}, 14000);
  const p = data?.portfolio || {};
  return {
    bankBalances: (p.bankBalances || []) as Array<{ denom: string; amount: string }>,
    subaccounts: (p.subaccounts || []) as Array<{ denom: string; deposit: { totalBalance: string } }>,
    positionsWithUPNL: (p.positionsWithUPNL || []) as Array<{ position: any; unrealizedPNL: string }> ,
  };
}

function mergeBalances(raw: Awaited<ReturnType<typeof fetchInjectivePortfolio>>) {
  const totals = new Map<string, number>();
  for (const b of raw.bankBalances) totals.set(b.denom, (totals.get(b.denom) || 0) + toNum(b.amount));
  for (const s of raw.subaccounts) {
    const tb = toNum(s.deposit?.totalBalance || '0');
    if (tb > 0) totals.set(s.denom, (totals.get(s.denom) || 0) + tb);
  }
  return Array.from(totals.entries()).map(([denom, amount]) => ({ denom, amount: amount.toFixed(0) }));
}

function parsePositions(list: Array<{ position: any; unrealizedPNL: string }>): Position[] {
  const Q = 1e6; // USDC quote scaling for prices and margin
  return list
    .map(p => {
      const pos = p.position || p;

      // markPrice is returned ALREADY in human USD by the indexer
      const mkHuman = toNum(pick(pos, 'markPrice', 'mark_price'));
      // entryPrice and liquidationPrice are in raw chain units — divide by Q
      const lqHuman = toNum(pick(pos, 'liquidationPrice', 'liquidation_price')) / Q;
      const enHuman = toNum(pick(pos, 'entryPrice', 'entry_price')) / Q;
      // margin is raw chain units — divide by Q
      const marginUsd = toNum(pick(pos, 'margin')) / Q;
      // unrealizedPNL is already in human USD — no division
      const upnl = toNum(pick(p, 'unrealizedPNL', 'unrealizedPnl'));

      // Both mkHuman and lqHuman are now in USD — distance is real
      let dist: number | null = null;
      if (mkHuman > 0 && lqHuman > 0) {
        const d = Math.abs(mkHuman - lqHuman) / mkHuman * 100;
        if (d > 0 && d <= 200) dist = d;
      }

      return {
        ticker: pick(pos, 'ticker') || 'Unknown',
        marketId: pick(pos, 'marketId', 'market_id') || '',
        direction: ((pick(pos, 'direction') || '') + '').toLowerCase() || 'unknown',
        size: toNum(pick(pos, 'quantity')),
        entryPrice: enHuman > 0 ? enHuman : null,
        markPrice: mkHuman > 0 ? mkHuman : null,
        liquidationPrice: lqHuman > 0 ? lqHuman : null,
        liquidationDistancePct: dist,
        unrealizedPnl: upnl,
        marginUsd,
      };
    })
    .filter(p => Math.abs(p.size) > 0 && p.marginUsd >= 1)
    .sort((a, b) => b.marginUsd - a.marginUsd);
}

async function fetchBankBalances(address: string): Promise<Array<{ denom: string; amount: string }>> {
  const data = await getJson(`${LCD}/cosmos/bank/v1beta1/balances/${address}?pagination.limit=300`);
  return Array.isArray(data?.balances) ? data.balances : [];
}

async function fetchStaking(address: string): Promise<{ staked: number; validators: number }> {
  const data = await getJson(`${LCD}/cosmos/staking/v1beta1/delegations/${address}?pagination.limit=300`);
  const list = Array.isArray(data?.delegation_responses) ? data.delegation_responses : [];
  let staked = 0;
  for (const d of list) staked += toNum(pick(d?.balance, 'amount'));
  return { staked: staked / 1e18, validators: list.length };
}

async function fetchRewards(address: string): Promise<number> {
  const data = await getJson(`${LCD}/cosmos/distribution/v1beta1/delegators/${address}/rewards`);
  const total = Array.isArray(data?.total) ? data.total : [];
  const inj = total.find((t: any) => (t?.denom || '').toLowerCase() === 'inj');
  return inj ? toNum(inj.amount) / 1e18 : 0;
}

async function fetchPrices(ids: string[]): Promise<Record<string, number>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return {};
  const headers: Record<string, string> = {};
  if (CG_KEY) headers['x-cg-demo-api-key'] = CG_KEY;
  const url = `${CG_BASE}/simple/price?ids=${unique.join(',')}&vs_currencies=usd`;
  const data = await getJson(url, { headers }, 8000);
  const out: Record<string, number> = {};
  for (const id of unique) if (data?.[id]?.usd != null) out[id] = toNum(data[id].usd);
  return out;
}

// ── Derivation: metrics, flags, summary ─────────────────────────────────────
function computeMetrics(assets: Asset[], staking: StakingInfo, positions: Position[]): PortfolioMetrics {
  const assetValue = assets.reduce((s, a) => s + (a.valueUsd || 0), 0);
  const stakedValue = staking.stakedValueUsd || 0;
  const totalValue = assetValue + stakedValue;
  const pricedValue = assets.reduce((s, a) => s + (a.valueUsd || 0), 0) + stakedValue;
  // crude estimate of how much of the wallet we could actually price
  const unpriceable = assets.some((a) => a.valueUsd == null);

  let largest: { symbol: string; pct: number } | null = null;
  for (const a of assets) {
    if (a.allocationPct != null && (!largest || a.allocationPct > largest.pct)) {
      largest = { symbol: a.symbol, pct: a.allocationPct };
    }
  }
  if (staking.stakedValueUsd && totalValue > 0) {
    const stakePct = (stakedValue / totalValue) * 100;
    if (!largest || stakePct > largest.pct) largest = { symbol: 'INJ (staked)', pct: stakePct };
  }

  const liqDistances = positions
    .map((p) => p.liquidationDistancePct)
    .filter((v): v is number => v != null);
  const minLiq = liqDistances.length ? Math.min(...liqDistances) : null;
  const atRisk = liqDistances.filter((v) => v < RISK_THRESHOLD_PCT).length;

  return {
    totalValueUsd: totalValue > 0 ? totalValue : (assets.length || staking.stakedInj ? totalValue : null),
    pricedAssetShare: unpriceable ? 0.5 : 1,
    assetCount: assets.length,
    largestHolding: largest,
    stakedRatioPct: totalValue > 0 ? (stakedValue / totalValue) * 100 : null,
    minLiquidationDistancePct: minLiq,
    atRiskPositions: atRisk,
  };
}

const STABLE_SYMBOLS = new Set(['USDC', 'USDT', 'DAI', 'USDE', 'WUSDM', 'AUSD', 'FDUSD', 'USDM', 'USDC.E', 'FRAX', 'LUSD']);

function buildFlags(assets: Asset[], staking: StakingInfo, positions: Position[], metrics: PortfolioMetrics): Flag[] {
  const flags: Flag[] = [];

  if (metrics.largestHolding && metrics.largestHolding.pct >= CONCENTRATION_PCT) {
    const sym = metrics.largestHolding.symbol.toUpperCase();
    const isStable = STABLE_SYMBOLS.has(sym);

    if (isStable) {
      flags.push({
        level: 'info',
        text: `${metrics.largestHolding.pct.toFixed(0)}% sits in ${metrics.largestHolding.symbol} — a stablecoin. Portfolio is mostly de-risked / in cash. Real costs: opportunity cost (earning nothing idle) and depeg tail-risk, not price volatility.`,
      });
    } else {
      flags.push({
        level: 'warn',
        text: `Concentrated: ${metrics.largestHolding.pct.toFixed(0)}% of value sits in ${metrics.largestHolding.symbol}. A single-asset move drives most of the swings here.`,
      });
    }
  }

  for (const p of positions) {
    if (p.liquidationDistancePct != null && p.liquidationDistancePct < RISK_THRESHOLD_PCT) {
      flags.push({
        level: 'risk',
        text: `${p.ticker} ${p.direction} is only ${p.liquidationDistancePct.toFixed(1)}% from its liquidation price. Small adverse move could close it.`,
      });
    }
  }

  if (staking.rewardsInj > 0.01) {
    flags.push({
      level: 'info',
      text: `${staking.rewardsInj.toFixed(3)} INJ in unclaimed staking rewards is sitting idle — it isn't compounding until claimed and re-staked.`,
    });
  }

  if (staking.stakedInj > 0 && metrics.stakedRatioPct != null && metrics.stakedRatioPct > 70) {
    flags.push({
      level: 'info',
      text: `${metrics.stakedRatioPct.toFixed(0)}% of value is staked INJ. Staked INJ has an unbonding period (~21 days) before it's liquid.`,
    });
  }

  if (flags.length === 0) {
    flags.push({ level: 'good', text: 'No concentration or liquidation-proximity risks detected in the readable data.' });
  }
  return flags;
}

function buildSummary(address: string, assets: Asset[], staking: StakingInfo, positions: Position[], metrics: PortfolioMetrics): string {
  const parts: string[] = [];
  if (metrics.totalValueUsd != null && metrics.totalValueUsd > 0) {
    parts.push(`This wallet holds roughly $${metrics.totalValueUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} across ${metrics.assetCount} token${metrics.assetCount === 1 ? '' : 's'}.`);
  } else if (assets.length) {
    parts.push(`This wallet holds ${assets.length} token${assets.length === 1 ? '' : 's'} (USD value unavailable for some).`);
  } else {
    parts.push('No spot token balances were found for this wallet.');
  }
  if (metrics.largestHolding) {
    parts.push(`The largest position is ${metrics.largestHolding.symbol} at ${metrics.largestHolding.pct.toFixed(0)}% of value.`);
  }
  if (staking.stakedInj > 0) {
    parts.push(`${staking.stakedInj.toLocaleString('en-US', { maximumFractionDigits: 2 })} INJ is staked across ${staking.validatorCount} validator${staking.validatorCount === 1 ? '' : 's'}.`);
  }
  if (positions.length) {
    const risky = positions.filter((p) => p.liquidationDistancePct != null && p.liquidationDistancePct < RISK_THRESHOLD_PCT);
    parts.push(`${positions.length} open perp position${positions.length === 1 ? '' : 's'}${risky.length ? `, ${risky.length} close to liquidation` : ''}.`);
  }
  return parts.join(' ');
}

function buildFacts(address: string, assets: Asset[], staking: StakingInfo, positions: Position[], metrics: PortfolioMetrics, flags: Flag[], summary: string): PortfolioFacts {
  return {
    address,
    totalValueUsd: metrics.totalValueUsd,
    pricedAssetShare: metrics.pricedAssetShare,
    assets: assets.map((a) => ({ symbol: a.symbol, amount: a.amount, valueUsd: a.valueUsd, allocationPct: a.allocationPct })),
    staking: { stakedInj: staking.stakedInj, rewardsInj: staking.rewardsInj, stakedValueUsd: staking.stakedValueUsd },
    positions: positions.map((p) => ({ ticker: p.ticker, direction: p.direction, liquidationDistancePct: p.liquidationDistancePct })),
    flags,
    summary,
  };
}

// ── Orchestrator ────────────────────────────────────────────────────────────
export async function getPortfolio(address: string): Promise<PortfolioResponse> {
  const warnings: string[] = [];

  // Balances + staking + rewards in parallel; tolerate individual failures.
  const [portfolioR, stakingR, rewardsR] = await Promise.allSettled([
    fetchInjectivePortfolio(address),
    fetchStaking(address),
    fetchRewards(address),
  ]);

  let rawBalances: Array<{ denom: string; amount: string }> = [];
  let positions: Position[] = [];
  let positionsAvailable = true;
  let positionsNote: string | null = null;

  if (portfolioR.status === 'fulfilled') {
    rawBalances = mergeBalances(portfolioR.value);
    positions = parsePositions(portfolioR.value.positionsWithUPNL);
    if (!positions.length) positionsNote = 'No open perpetual positions.';
  } else {
    warnings.push('Indexer portfolio endpoint unavailable — showing bank-only balances (trading account may be missing). Verify INJ_INDEXER_URL.');
    positionsAvailable = false;
    positionsNote = 'Positions unavailable (indexer offline).';
    try {
      rawBalances = await fetchBankBalances(address);
    } catch {
      warnings.push('Could not load balances.');
    }
  }

  const balances = rawBalances;
  const stakingRaw = stakingR.status === 'fulfilled' ? stakingR.value : { staked: 0, validators: 0 };
  if (stakingR.status === 'rejected') warnings.push('Could not load staking delegations.');

  const rewardsInj = rewardsR.status === 'fulfilled' ? rewardsR.value : 0;

  // Build provisional assets (no prices yet).
  const provisional = balances
    .map((b) => {
      const info = denomInfo(b.denom);
      const amount = toNum(b.amount) / Math.pow(10, info.decimals);
      return { denom: b.denom, info, amount, raw: b.amount };
    })
    .filter((a) => a.amount > 0);

  // Collect price ids (always include INJ for staking valuation).
  const ids = ['injective-protocol'];
  for (const a of provisional) if (a.info.coingeckoId) ids.push(a.info.coingeckoId);

  let prices: Record<string, number> = {};
  try {
    prices = await fetchPrices(ids);
  } catch {
    warnings.push('Price feed unavailable — showing token amounts; USD values are partial.');
  }
  const injPrice = prices['injective-protocol'] ?? null;

  // Finalize assets with prices.
  const assetsNoAlloc: Asset[] = provisional.map((a) => {
    let priceUsd: number | null = null;
    if (a.info.stable) priceUsd = 1;
    else if (a.info.coingeckoId && prices[a.info.coingeckoId] != null) priceUsd = prices[a.info.coingeckoId];
    const valueUsd = priceUsd != null ? a.amount * priceUsd : null;
    return {
      denom: a.denom,
      symbol: a.info.symbol,
      amount: a.amount,
      rawAmount: a.raw,
      decimals: a.info.decimals,
      priceUsd,
      valueUsd,
      allocationPct: null,
    };
  });

  const staking: StakingInfo = {
    stakedInj: stakingRaw.staked,
    rewardsInj,
    stakedValueUsd: injPrice != null ? stakingRaw.staked * injPrice : null,
    validatorCount: stakingRaw.validators,
  };

  // Total + allocations.
  const totalValue =
    assetsNoAlloc.reduce((s, a) => s + (a.valueUsd || 0), 0) + (staking.stakedValueUsd || 0);
  const assets = assetsNoAlloc
    .map((a) => ({ ...a, allocationPct: totalValue > 0 && a.valueUsd != null ? (a.valueUsd / totalValue) * 100 : null }))
    .sort((x, y) => (y.valueUsd || 0) - (x.valueUsd || 0) || y.amount - x.amount);

  const metrics = computeMetrics(assets, staking, positions);
  const flags = buildFlags(assets, staking, positions, metrics);
  const summary = buildSummary(address, assets, staking, positions, metrics);
  const facts = buildFacts(address, assets, staking, positions, metrics, flags, summary);

  return {
    address,
    generatedAt: new Date().toISOString(),
    assets,
    staking,
    positions,
    positionsAvailable,
    positionsNote,
    metrics,
    flags,
    summary,
    facts,
    warnings,
  };
}
