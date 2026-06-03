'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChatMessage, PortfolioFacts } from '@/lib/types';

const SUGGESTED = [
  'Biggest risks here?',
  'Explain my perp positions',
  'How concentrated am I?',
  'What should I watch?',
];

export default function Copilot({ facts }: { facts: PortfolioFacts }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [llmOn, setLlmOn] = useState<boolean | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimeout = useRef<number | null>(null);

  useEffect(() => { setMessages([]); setLlmOn(null); }, [facts.address]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      if (scrollTimeout.current) window.clearTimeout(scrollTimeout.current);
    };
  }, []);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    const next = [...messages, { role: 'user' as const, content: q }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facts, messages: next }),
      });
      const data = await res.json();
      setLlmOn(Boolean(data?.llm));
      setMessages([...next, { role: 'assistant', content: data?.content || 'No response.' }]);
    } catch (err: any) {
      setMessages([...next, { role: 'assistant', content: `Request failed: ${err?.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-panel rounded-xl flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface-container-high border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">smart_toy</span>
          <span className="font-mono font-bold text-sm text-on-surface uppercase tracking-wider">AI Copilot</span>
        </div>
        <div className="flex items-center gap-1.5">
          {llmOn === null ? (
            <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest">ask anything</span>
          ) : llmOn ? (
            <>
              <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
              <span className="font-mono text-[10px] font-bold text-[#10b981] uppercase tracking-widest">Live Model</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-[#ffb020]" />
              <span className="font-mono text-[10px] font-bold text-[#ffb020] uppercase tracking-widest">Deterministic</span>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        className={`flex-1 overflow-y-auto p-4 space-y-3 min-h-0 copilot-scroll${isScrolling ? ' scrolling' : ''}`}
        ref={scrollRef}
        onScroll={() => {
          setIsScrolling(true);
          if (scrollTimeout.current) window.clearTimeout(scrollTimeout.current);
          scrollTimeout.current = window.setTimeout(() => setIsScrolling(false), 650);
        }}
      >
        {messages.length === 0 && (
          <div className="bg-surface-container-low p-3 rounded-lg rounded-tl-none border border-white/5">
            <p className="font-mono text-[10px] text-primary uppercase mb-1">copilot</p>
            <p className="text-[12px] text-on-surface leading-relaxed">
              I've read this wallet's on-chain data. Ask me about its risk, allocation, staking, or positions — I only answer from the numbers shown on the left. Not financial advice.
            </p>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] bg-primary/10 border border-primary/20 p-3 rounded-lg rounded-tr-none">
                <p className="font-mono text-[10px] text-on-surface-variant uppercase mb-1">you</p>
                <p className="text-[12px] text-on-surface">{m.content}</p>
              </div>
            </div>
          ) : (
            <div key={i} className="bg-surface-container-low p-3 rounded-lg rounded-tl-none border border-white/5">
              <p className="font-mono text-[10px] text-primary uppercase mb-1">copilot</p>
              <p className="text-[12px] text-on-surface leading-relaxed whitespace-pre-wrap">{m.content}</p>
            </div>
          )
        )}
        {loading && (
          <div className="bg-surface-container-low p-3 rounded-lg rounded-tl-none border border-white/5">
            <p className="font-mono text-[10px] text-primary uppercase mb-2">copilot</p>
            <div className="flex gap-1">
              {[0, 150, 300].map(d => (
                <div key={d} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Suggested chips — only on empty state */}
      {messages.length === 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5 shrink-0">
          {SUGGESTED.map(s => (
            <button
              key={s}
              onClick={() => send(s)}
              className="bg-surface-container-highest border border-white/5 px-2.5 py-1 rounded text-[10px] text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 bg-surface-container-lowest border-t border-white/5 shrink-0">
        <div className="flex gap-2">
          <input
            className="flex-1 bg-surface-container border border-white/10 rounded-lg px-3 py-2 text-[12px] text-on-surface placeholder-outline outline-none focus:border-primary transition-colors"
            placeholder="Ask about this portfolio…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <span className="material-symbols-outlined text-on-primary text-[20px]">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
