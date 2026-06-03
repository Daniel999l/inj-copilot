import type { PortfolioResponse } from './types';

// A realistic, clearly-labeled sample used by the "Load sample" button so the
// dashboard and copilot are demonstrable instantly — no funded wallet or live
// network required. This is NOT real on-chain data.
export const SAMPLE_PORTFOLIO: PortfolioResponse = {
  address: 'inj1samplexxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  generatedAt: new Date().toISOString(),
  isSample: true,
  assets: [
    { denom: 'inj', symbol: 'INJ', amount: 142.5, rawAmount: '142500000000000000000', decimals: 18, priceUsd: 24.8, valueUsd: 3534, allocationPct: 41.3 },
    { denom: 'peggy0xdac17f958d2ee523a2206206994597c13d831ec7', symbol: 'USDT', amount: 2600, rawAmount: '2600000000', decimals: 6, priceUsd: 1, valueUsd: 2600, allocationPct: 30.4 },
    { denom: 'peggy0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', symbol: 'WETH', amount: 0.45, rawAmount: '450000000000000000', decimals: 18, priceUsd: 3200, valueUsd: 1440, allocationPct: 16.8 },
    { denom: 'peggy0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', symbol: 'WBTC', amount: 0.011, rawAmount: '1100000', decimals: 8, priceUsd: 68000, valueUsd: 748, allocationPct: 8.7 },
  ],
  staking: { stakedInj: 95.2, rewardsInj: 1.84, stakedValueUsd: 2361, validatorCount: 3 },
  positions: [
    { ticker: 'INJ/USDT PERP', marketId: '0x0611780ba69656949525013d947713300f56c37b6175e02f26bffa495c3208fe', direction: 'long', size: 60, entryPrice: 23.1, markPrice: 24.8, liquidationPrice: 21.4, liquidationDistancePct: 13.7, unrealizedPnl: 102.4, marginUsd: 420 },
    { ticker: 'BTC/USDT PERP', marketId: '0x4ca0f92fc28be0c9761326016b5a1a2177dd6375558365116b5bdda9abc229ce', direction: 'short', size: 0.05, entryPrice: 67500, markPrice: 68000, liquidationPrice: 74200, liquidationDistancePct: 9.1, unrealizedPnl: -38.7, marginUsd: 280 },
  ],
  positionsAvailable: true,
  positionsNote: null,
  metrics: {
    totalValueUsd: 8520,
    pricedAssetShare: 1,
    assetCount: 4,
    largestHolding: { symbol: 'INJ', pct: 41.3 },
    stakedRatioPct: 21.7,
    minLiquidationDistancePct: 9.1,
    atRiskPositions: 2,
  },
  flags: [
    { level: 'warn', text: 'Concentrated: INJ (spot + staked) is the dominant exposure. A single-asset move drives most of the swings here.' },
    { level: 'risk', text: 'BTC/USDT PERP short is only 9.1% from its liquidation price. A small adverse move could close it.' },
    { level: 'risk', text: 'INJ/USDT PERP long is only 13.7% from its liquidation price. A small adverse move could close it.' },
    { level: 'info', text: '1.84 INJ in unclaimed staking rewards is sitting idle — it isn\'t compounding until claimed and re-staked.' },
  ],
  summary:
    'This wallet holds roughly $8,520 across 4 tokens. The largest position is INJ at 41% of value. 95.2 INJ is staked across 3 validators. 2 open perp positions, 2 close to liquidation.',
  facts: {
    address: 'inj1samplexxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    totalValueUsd: 8520,
    pricedAssetShare: 1,
    assets: [
      { symbol: 'INJ', amount: 142.5, valueUsd: 3534, allocationPct: 41.3 },
      { symbol: 'USDT', amount: 2600, valueUsd: 2600, allocationPct: 30.4 },
      { symbol: 'WETH', amount: 0.45, valueUsd: 1440, allocationPct: 16.8 },
      { symbol: 'WBTC', amount: 0.011, valueUsd: 748, allocationPct: 8.7 },
    ],
    staking: { stakedInj: 95.2, rewardsInj: 1.84, stakedValueUsd: 2361 },
    positions: [
      { ticker: 'INJ/USDT PERP', direction: 'long', liquidationDistancePct: 13.7, unrealizedPnl: 102.4, marginUsd: 420 },
      { ticker: 'BTC/USDT PERP', direction: 'short', liquidationDistancePct: 9.1, unrealizedPnl: -38.7, marginUsd: 280 },
    ],
    flags: [
      { level: 'warn', text: 'Concentrated: INJ is the dominant exposure.' },
      { level: 'risk', text: 'BTC/USDT PERP short is only 9.1% from liquidation.' },
      { level: 'risk', text: 'INJ/USDT PERP long is only 13.7% from liquidation.' },
      { level: 'info', text: '1.84 INJ in unclaimed staking rewards is idle.' },
    ],
    summary:
      'This wallet holds roughly $8,520 across 4 tokens. The largest position is INJ at 41% of value. 95.2 INJ is staked across 3 validators. 2 open perp positions, 2 close to liquidation.',
  },
  warnings: [],
};
