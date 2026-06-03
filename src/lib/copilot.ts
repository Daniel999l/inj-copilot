import type { ChatMessage, PortfolioFacts } from './types';

const LLM_KEY = process.env.LLM_API_KEY || '';
const LLM_BASE = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';

export function llmConfigured(): boolean {
  return LLM_KEY.length > 0;
}

function factSheet(facts: PortfolioFacts): string {
  const lines: string[] = [];
  lines.push(`Wallet: ${facts.address}`);
  lines.push(
    facts.totalValueUsd != null
      ? `Estimated total value: $${facts.totalValueUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
      : 'Estimated total value: unavailable (some assets could not be priced)',
  );
  if (facts.assets.length) {
    lines.push('Holdings:');
    for (const a of facts.assets.slice(0, 25)) {
      const usd = a.valueUsd != null ? `$${a.valueUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : 'unpriced';
      const pct = a.allocationPct != null ? ` (${a.allocationPct.toFixed(1)}% of value)` : '';
      lines.push(`  - ${a.symbol}: ${a.amount.toLocaleString('en-US', { maximumFractionDigits: 6 })} = ${usd}${pct}`);
    }
  } else {
    lines.push('Holdings: none found');
  }
  lines.push(
    `Staking: ${facts.staking.stakedInj.toLocaleString('en-US', { maximumFractionDigits: 4 })} INJ delegated; ${facts.staking.rewardsInj.toLocaleString('en-US', { maximumFractionDigits: 4 })} INJ unclaimed rewards`,
  );
  if (facts.positions.length) {
    lines.push('Open perpetual positions:');
    for (const p of facts.positions) {
      const d = p.liquidationDistancePct != null ? `${p.liquidationDistancePct.toFixed(1)}% from liquidation` : 'liquidation distance unknown';
      lines.push(`  - ${p.ticker} ${p.direction}: ${d}`);
    }
  }
  if (facts.flags.length) {
    lines.push('Detected signals:');
    for (const f of facts.flags) lines.push(`  - [${f.level}] ${f.text}`);
  }
  return lines.join('\n');
}

function systemPrompt(facts: PortfolioFacts): string {
  return [
    'You are an experienced on-chain derivatives and DeFi risk analyst embedded in an Injective wallet dashboard. You give sharp, direct, useful analysis — like a seasoned desk risk manager talking to a peer.',
    '',
    'Rules:',
    '- Ground every number in the FACTS block below. Never invent balances, prices, tickers, or values not present there. If it is not in FACTS, say so.',
    '- Be direct and opinionated about risk. If a position is dangerous, say it is dangerous and exactly why. Lead with the most important risk.',
    '- Give concrete, actionable reads: what cuts liquidation risk (add margin, trim size, lower leverage), what concentration means for drawdowns, when capital is an idle drag. Talk tradeoffs like a professional.',
    '',
    'CRITICAL — stablecoins: USDC, USDT, DAI, USDe, WUSDM, aUSD, FDUSD and similar are pegged to ~$1. They are NOT volatile. NEVER describe a large stablecoin balance as price-fluctuation risk, market exposure, volatility, or a source of drawdowns — that is wrong and makes you look broken. A high stablecoin allocation is the OPPOSITE: dry powder sitting out of the market, i.e. the wallet is mostly de-risked / in cash. The only real downsides to mention for stables are (a) opportunity cost / yield drag — it earns nothing idle, and (b) depeg tail-risk — rare loss-of-peg events. If most of the portfolio is in a stablecoin, say it is mostly in cash and de-risked, not "highly exposed."',
    '',
    '- Short paragraphs. No filler, no reflex disclaimers, no repeated warnings.',
    '- You analyze public on-chain data and are not the user\'s fiduciary. Mention this only if genuinely relevant, never as a reflex.',
    '- No emojis. Not sycophantic.',
    '',
    'FACTS:',
    factSheet(facts),
  ].join('\n');
}

/** Deterministic answer used when no LLM key is configured. */
export function ruleBasedReply(facts: PortfolioFacts): string {
  const lines: string[] = [];
  lines.push(facts.summary || 'Portfolio loaded.');
  lines.push('');
  if (facts.flags.length) {
    lines.push('What stands out:');
    for (const f of facts.flags) lines.push(`• ${f.text}`);
  }
  lines.push('');
  lines.push('(Deterministic analysis — set LLM_API_KEY to ask follow-up questions in natural language. Not financial advice.)');
  return lines.join('\n');
}

export async function runCopilot(facts: PortfolioFacts, history: ChatMessage[]): Promise<string> {
  if (!llmConfigured()) {
    return ruleBasedReply(facts);
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt(facts) },
    ...history.slice(-12),
  ];

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`${LLM_BASE}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LLM_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages,
        temperature: 0.4,
        max_tokens: 700,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`LLM provider returned ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('LLM response had no content');
    return content.trim();
  } finally {
    clearTimeout(t);
  }
}
