// Domain types shared between the data layer, API routes, and UI.

export interface Asset {
  denom: string;
  symbol: string;
  amount: number; // human-readable (already scaled by decimals)
  rawAmount: string; // base units as returned by the chain
  decimals: number;
  priceUsd: number | null;
  valueUsd: number | null;
  allocationPct: number | null; // share of total portfolio value
}

export interface StakingInfo {
  stakedInj: number; // total INJ delegated (human-readable)
  rewardsInj: number; // pending staking rewards in INJ (human-readable)
  stakedValueUsd: number | null;
  validatorCount: number;
}

export interface Position {
  ticker: string;
  marketId: string;
  direction: 'long' | 'short' | string;
  size: number; // contract quantity as returned
  entryPrice: number | null; // best-effort human price (≈)
  markPrice: number | null; // best-effort human price (≈)
  liquidationPrice: number | null; // best-effort human price (≈)
  // Distance from mark price to liquidation price, in percent.
  // This ratio is scale-invariant, so it is reliable even when the
  // absolute price scaling is approximate.
  liquidationDistancePct: number | null;
  unrealizedPnl: number | null;
  marginUsd: number;
}

export type FlagLevel = 'good' | 'info' | 'warn' | 'risk';

export interface Flag {
  level: FlagLevel;
  text: string;
}

export interface PortfolioMetrics {
  totalValueUsd: number | null;
  pricedAssetShare: number; // fraction of value that we could price (0..1)
  assetCount: number;
  largestHolding: { symbol: string; pct: number } | null;
  stakedRatioPct: number | null; // staked value / total value
  minLiquidationDistancePct: number | null;
  atRiskPositions: number;
}

// Compact, model-friendly facts handed to the AI copilot.
export interface PortfolioFacts {
  address: string;
  totalValueUsd: number | null;
  pricedAssetShare: number;
  assets: Array<{
    symbol: string;
    amount: number;
    valueUsd: number | null;
    allocationPct: number | null;
  }>;
  staking: { stakedInj: number; rewardsInj: number; stakedValueUsd: number | null };
  positions: Array<{
    ticker: string;
    direction: string;
    liquidationDistancePct: number | null;
    unrealizedPnl?: number | null;
    marginUsd?: number | null;
  }>;
  flags: Flag[];
  summary: string;
}

export interface PortfolioResponse {
  address: string;
  generatedAt: string;
  assets: Asset[];
  staking: StakingInfo;
  positions: Position[];
  positionsAvailable: boolean;
  positionsNote: string | null;
  metrics: PortfolioMetrics;
  flags: Flag[];
  summary: string;
  facts: PortfolioFacts;
  warnings: string[];
  isSample?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
