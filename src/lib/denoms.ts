// Maps Injective denoms to display metadata. This is intentionally a
// small, curated set covering the most common assets; unknown denoms
// degrade gracefully to a shortened label. Extending this map is a
// natural "good first contribution" for the project.

export interface DenomInfo {
  symbol: string;
  decimals: number;
  coingeckoId?: string;
  stable?: boolean;
}

// Keyed by LOWERCASED denom so lookups are case-insensitive (Peggy
// denoms preserve the checksummed ETH address casing on-chain).
const DENOMS: Record<string, DenomInfo> = {
  inj: { symbol: 'INJ', decimals: 18, coingeckoId: 'injective-protocol' },

  // Peggy (Ethereum-bridged) assets
  'peggy0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT', decimals: 6, stable: true },
  'peggy0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC', decimals: 6, stable: true },
  'peggy0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { symbol: 'WETH', decimals: 18, coingeckoId: 'ethereum' },
  'peggy0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': { symbol: 'WBTC', decimals: 8, coingeckoId: 'wrapped-bitcoin' },
  'peggy0x6b175474e89094c44da98b954eedeac495271d0f': { symbol: 'DAI', decimals: 18, stable: true },
  'peggy0x514910771af9ca656af840dff83e8264ecf986ca': { symbol: 'LINK', decimals: 18, coingeckoId: 'chainlink' },
  'peggy0x57e114b691db790c35207b2e685d4a43181e6061': { symbol: 'ENA', decimals: 18, coingeckoId: 'ethena' },
  'peggy0x4c9edd5852cd905f086c759e8383e09bff1e68b3': { symbol: 'USDe', decimals: 18, stable: true },
  'peggy0x57f5e098cad7a3d1eed53991d4d66c45c9af7812': { symbol: 'WUSDM', decimals: 18, coingeckoId: 'wrapped-usdm' },
  'ausd': { symbol: 'aUSD', decimals: 6, stable: true },
  'erc20:0xa00c59ff5a080d2b954d0c75e46e22a0c371235a': { symbol: 'USDC', decimals: 6, stable: true },

  // IBC / common Cosmos assets (denoms vary by channel; symbols are best-effort)
  'ibc/c4cff46fd6de35ca4cf4ce031e643c8fdc9ba711b39c7cefb9d4ef3d8b9bbc8d': { symbol: 'ATOM', decimals: 6, coingeckoId: 'cosmos' },
};

function pretty(denom: string): string {
  if (denom.startsWith('peggy0x')) {
    const addr = denom.slice('peggy'.length);
    return `peggy:${addr.slice(0, 6)}…${addr.slice(-4)}`;
  }
  if (denom.startsWith('factory/')) {
    const parts = denom.split('/');
    return parts[parts.length - 1].slice(0, 12);
  }
  if (denom.startsWith('ibc/')) {
    return `ibc:${denom.slice(4, 10)}…`;
  }
  return denom.length > 14 ? `${denom.slice(0, 12)}…` : denom;
}

export function denomInfo(denom: string): DenomInfo {
  const key = denom.toLowerCase();
  if (DENOMS[key]) return DENOMS[key];
  // Heuristic: many factory stablecoins encode the symbol in the path.
  const lower = key;
  if (/usd[ce]?|usdt|usdc|dai/.test(lower) && lower.includes('factory')) {
    return { symbol: pretty(denom), decimals: 6, stable: true };
  }
  return { symbol: pretty(denom), decimals: 18 };
}
