'use client';
/* New page.tsx content replaced per user request */
'use client';

import { useEffect, useRef, useState } from 'react';
import Copilot from '@/components/Copilot';
import { SAMPLE_PORTFOLIO } from '@/lib/sample';
import { fmtNum, fmtUsd, fmtPct, shorten } from '@/lib/format';
import type { PortfolioResponse } from '@/lib/types';

const ADDR_RE = /^inj1[0-9a-z]{38}$/;

function liqClass(pct: number | null) {
  if (pct == null) return '';
  if (pct < 10) return 'risk-high';
  if (pct < 20) return 'risk-med';
  return 'risk-low';
}

function flagStyle(level: string) {
  switch (level) {
    case 'risk': return { box: 'bg-error-container/10 border border-error/20', icon: 'report', label: 'CRITICAL', color: 'text-error' };
    case 'warn': return { box: 'bg-surface-container-highest/30 border border-white/10', icon: 'warning', label: 'WARNING', color: 'text-[#ffc4a0]' };
    case 'info': return { box: 'bg-surface-container-highest/20 border border-white/5', icon: 'info', label: 'INFO', color: 'text-on-surface-variant' };
    case 'good': return { box: 'bg-primary/10 border border-primary/20', icon: 'check_circle', label: 'HEALTHY', color: 'text-primary' };
    default:     return { box: 'border border-white/5', icon: 'info', label: 'INFO', color: 'text-on-surface-variant' };
  }
}

export default function Home() {
  const [address, setAddress] = useState('');
  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const [rightMaxHeight, setRightMaxHeight] = useState<number | null>(null);

  useEffect(() => {
    function updateHeight() {
      const next = leftColumnRef.current?.offsetHeight ?? null;
      setRightMaxHeight(next);
    }
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [data]);

  async function analyze(addr: string) {
    const a = addr.trim();
    if (!ADDR_RE.test(a)) { setError('Enter a valid inj1 address (42 chars).'); return; }
    setError(null); setLoading(true); setData(null);
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: a }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Error ${res.status}`);
      setData(json);
    } catch (err: any) {
      setError(err?.message || 'Request failed.');
    } finally {
      setLoading(false);
    }
  }

  function loadSample() {
    setError(null); setLoading(false); setAddress('');
    setData({ ...SAMPLE_PORTFOLIO, generatedAt: new Date().toISOString() });
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-surface font-sans text-sm">

      {/* Topbar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-8 bg-surface/80 backdrop-blur-md border-b border-white/10">
        <span className="font-bold text-xl tracking-tight text-primary">INJECTIVE ANALYZER</span>
        <span className="font-mono text-[11px] text-on-surface-variant border border-white/10 rounded-full px-3 py-1 uppercase tracking-widest">Injective · AI</span>
      </header>

      <main className="flex-1 w-full max-w-[1600px] mx-auto pt-24 pb-16 px-8">

        {/* Address bar */}
        <section className="mb-6">
          <div className="glass-panel rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-grow w-full">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
              <input
                className="w-full bg-surface-container-lowest border border-white/10 rounded-lg pl-11 pr-4 py-2.5 font-mono text-sm text-primary placeholder-outline focus:border-primary outline-none transition-colors"
                placeholder="inj1…"
                value={address}
                spellCheck={false}
                onChange={e => setAddress(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && analyze(address)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto shrink-0">
              <button
                onClick={() => analyze(address)}
                disabled={loading}
                className="flex-1 md:flex-none bg-primary text-on-primary font-bold text-sm px-6 py-2.5 rounded-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Analyzing…' : 'Analyze'}
              </button>
              <button
                onClick={loadSample}
                className="flex-1 md:flex-none border border-white/10 bg-surface-container text-on-surface font-bold text-sm px-6 py-2.5 rounded-lg hover:bg-surface-variant transition-colors"
              >
                Load Sample
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-3 bg-error-container/20 border border-error/30 text-[#ffb4ab] rounded-lg px-4 py-2.5 text-sm">{error}</div>
          )}
          {data?.isSample && (
            <div className="mt-3 flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary rounded-lg px-4 py-2.5 text-sm">
              <span className="material-symbols-outlined text-[16px]">info</span>
              Sample data — not a real wallet. Paste a real inj1 address to analyze live on-chain state.
            </div>
          )}
          {(data?.warnings?.length ?? 0) > 0 && (
            <p className="mt-2 font-mono text-xs text-[#ffc4a0]">⚠ {data!.warnings.join(' · ')}</p>
          )}
        </section>

        {/* Empty state */}
        {!data && !loading && (
          <div className="glass-panel rounded-xl p-16 text-center">
            <p className="font-mono text-sm text-on-surface-variant mb-2">// no wallet loaded</p>
            <p className="text-on-surface-variant">Paste an address above or hit <strong className="text-primary">Load Sample</strong> to see it work instantly.</p>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              {['token balances + USD allocation','staking & idle rewards','perp liquidation distance','AI copilot Q&A'].map(f => (
                <span key={f} className="font-mono text-[11px] text-on-surface-variant border border-outline-variant rounded-lg px-3 py-2">› {f}</span>
              ))}
            </div>
          </div>
        )}

        {/* Skeleton */}
        {loading && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="glass-panel rounded-xl h-28 animate-pulse bg-surface-container" />)}
            </div>
            <div className="glass-panel rounded-xl h-64 animate-pulse bg-surface-container" />
          </div>
        )}

        {/* Main content */}
        {data && (
          <>
            {/* Summary strip */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="glass-panel rounded-xl p-6">
                <p className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider mb-1">Est. Value</p>
                <p className="text-2xl font-bold text-primary">{fmtUsd(data.metrics.totalValueUsd)}</p>
                {data.metrics.pricedAssetShare < 1 && <p className="mt-1 font-mono text-[11px] text-outline">partial pricing</p>}
              </div>
              <div className="glass-panel rounded-xl p-6">
                <p className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider mb-1">Assets</p>
                <p className="text-2xl font-bold text-on-surface">{data.metrics.assetCount}</p>
                {data.metrics.largestHolding && (
                  <p className="mt-1 font-mono text-[11px] text-outline">top {fmtPct(data.metrics.largestHolding.pct, 0)}</p>
                )}
              </div>
              <div className="glass-panel rounded-xl p-6">
                <p className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider mb-1">Staked INJ</p>
                <p className="text-2xl font-bold text-on-surface">{fmtNum(data.staking.stakedInj, 2)}</p>
                <p className="mt-1 font-mono text-[11px] text-outline">{data.staking.validatorCount} validator{data.staking.validatorCount !== 1 ? 's' : ''}</p>
              </div>
              <div className={`glass-panel rounded-xl p-6 ${data.metrics.atRiskPositions > 0 ? 'border-l-4 border-error/60' : ''}`}>
                <p className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider mb-1">Perp Risk</p>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold text-on-surface">{data.positions.length} pos</p>
                  {data.metrics.atRiskPositions > 0
                    ? <span className="risk-high text-[10px] font-bold uppercase px-2 py-0.5 rounded">{data.metrics.atRiskPositions} at risk</span>
                    : data.positions.length > 0
                      ? <span className="risk-good text-[10px] font-bold uppercase px-2 py-0.5 rounded">OK</span>
                      : null}
                </div>
                {data.metrics.minLiquidationDistancePct != null && (
                  <p className="mt-1 font-mono text-[11px] text-error">min {fmtPct(data.metrics.minLiquidationDistancePct)} to liq</p>
                )}
              </div>
            </section>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">

              {/* Left col */}
              <div className="lg:col-span-3 space-y-6" ref={leftColumnRef}>

                {/* Holdings */}
                <div className="glass-panel rounded-xl overflow-hidden flex flex-col min-h-0">
                  <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                    <h4 className="text-base font-semibold">Asset Holdings</h4>
                    <span className="font-mono text-[11px] text-outline">{shorten(data.address, 9, 6)}</span>
                  </div>
                  <div className="overflow-x-auto flex-1 min-h-0 max-h-[34rem] overflow-y-auto scroll-panel">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-surface-container-high/40">
                          {['Asset','Balance','Value (USD)','Allocation'].map(h => (
                            <th key={h} className="px-6 py-2 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data.assets.filter(a => a.amount > 0).map(a => (
                          <tr key={a.denom} className="hover:bg-surface-container/60 transition-colors">
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                  <span className="font-mono text-primary text-[10px] font-bold">{a.symbol.slice(0,3).toUpperCase()}</span>
                                </div>
                                <span className="font-bold text-on-surface">{a.symbol}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 font-mono text-sm text-on-surface">{fmtNum(a.amount, 4)}</td>
                            <td className="px-6 py-3 font-mono text-sm text-on-surface">{fmtUsd(a.valueUsd)}</td>
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-3 min-w-[120px]">
                                <div className="flex-1 bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${Math.min(100, a.allocationPct || 0)}%` }} />
                                </div>
                                <span className="font-mono text-[11px] text-on-surface-variant w-12 text-right">{fmtPct(a.allocationPct)}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Staking + Risk signals */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="glass-panel rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-semibold">Staking</h4>
                      <span className="material-symbols-outlined text-primary text-[20px]">account_balance_wallet</span>
                    </div>
                    <div className="space-y-2.5 max-h-[16rem] overflow-y-auto pr-1 scroll-panel">
                      {[
                        { label: 'Staked INJ', value: fmtNum(data.staking.stakedInj, 2), highlight: false },
                        { label: 'Unclaimed Rewards', value: `${fmtNum(data.staking.rewardsInj, 4)} INJ`, highlight: true },
                        { label: 'Validators', value: `${data.staking.validatorCount} active`, highlight: false },
                      ].map(row => (
                        <div key={row.label} className="flex justify-between items-center p-3 bg-surface-container-low rounded-lg border border-white/5">
                          <span className="font-mono text-sm text-on-surface-variant">{row.label}</span>
                          <span className={`font-bold font-mono text-sm ${row.highlight ? 'text-primary' : 'text-on-surface'}`}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="glass-panel rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-semibold">Risk Signals</h4>
                      <span className="material-symbols-outlined text-error text-[20px]">warning</span>
                    </div>
                    <div className="space-y-2 max-h-[27rem] overflow-y-auto pr-1 scroll-panel">
                      {data.flags.map((f, i) => {
                        const s = flagStyle(f.level);
                        return (
                          <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${s.box}`}>
                            <span className={`material-symbols-outlined text-[16px] shrink-0 mt-0.5 ${s.color}`}>{s.icon}</span>
                            <div>
                              <p className={`font-bold text-[10px] uppercase tracking-wider mb-0.5 ${s.color}`}>{s.label}</p>
                              <p className="text-[12px] text-on-surface leading-relaxed">{f.text}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Perp positions */}
                <div className="glass-panel rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                    <h4 className="text-base font-semibold">Perpetual Positions</h4>
                    <span className="font-mono text-[11px] text-outline">liquidation watch</span>
                  </div>
                  {data.positions.length === 0 ? (
                    <p className="px-6 py-4 font-mono text-sm text-on-surface-variant">{data.positionsNote || 'No open positions.'}</p>
                  ) : (
                    <div className="overflow-x-auto min-h-0 max-h-[32rem] overflow-y-auto scroll-panel">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-surface-container-high/40">
                            {['Market','Side','Unr. PnL','Liq. Price ≈','To Liquidation'].map(h => (
                              <th key={h} className="px-6 py-2 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {data.positions.map((p, i) => (
                            <tr key={p.marketId || i} className="hover:bg-surface-container/60 transition-colors">
                              <td className="px-6 py-3 font-bold text-on-surface text-sm whitespace-nowrap">{p.ticker}</td>
                              <td className="px-6 py-3">
                                <span className={`font-bold text-sm ${p.direction === 'long' ? 'text-primary' : 'text-error'}`}>
                                  {p.direction.toUpperCase()}
                                </span>
                              </td>
                              <td className={`px-6 py-3 font-mono text-sm ${
                                p.unrealizedPnl == null ? 'text-on-surface-variant'
                                : p.unrealizedPnl >= 0 ? 'text-primary' : 'text-error'
                              }`}>
                                {p.unrealizedPnl != null
                                  ? (p.unrealizedPnl >= 0 ? '+' : '') + fmtUsd(p.unrealizedPnl)
                                  : '—'}
                              </td>
                              <td className="px-6 py-3 font-mono text-sm text-on-surface">{fmtUsd(p.liquidationPrice)}</td>
                              <td className="px-6 py-3">
                                {p.liquidationDistancePct != null ? (
                                  <span className={`${liqClass(p.liquidationDistancePct)} px-3 py-1 rounded-lg font-mono text-[11px] font-bold whitespace-nowrap`}>
                                    {fmtPct(p.liquidationDistancePct, 1)}{p.liquidationDistancePct < 10 ? ' ⚠' : ''}
                                  </span>
                                ) : (
                                  <span className="font-mono text-sm text-on-surface-variant">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Right col — Copilot */}
              <aside
                className="lg:col-span-1 min-h-0 overflow-hidden max-h-[633px]"
                style={rightMaxHeight ? { maxHeight: `${Math.min(rightMaxHeight, 633)}px` } : undefined}
              >
                <div className="h-full">
                  <Copilot facts={data.facts} />
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-surface-container-lowest py-6 px-8">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between gap-3">
          <div>
            <p className="font-mono text-sm font-bold text-on-surface">INJECTIVE ANALYZER</p>
            <p className="font-mono text-[11px] text-outline mt-1 max-w-md leading-relaxed">
              Read-only analytics tool, not a financial advisor. USD values are estimates and may be incomplete. Never asks for or handles private keys or funds.
            </p>
          </div>
          <p className="font-mono text-[11px] text-outline self-end">data: Injective LCD · Indexer · prices: CoinGecko</p>
        </div>
      </footer>
    </div>
  );
}
