import { NextResponse } from 'next/server';
import { runCopilot, ruleBasedReply, llmConfigured } from '@/lib/copilot';
import type { ChatMessage, PortfolioFacts } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let facts: PortfolioFacts | null = null;
  let messages: ChatMessage[] = [];
  try {
    const body = await req.json();
    facts = body?.facts ?? null;
    messages = Array.isArray(body?.messages) ? body.messages : [];
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!facts) {
    return NextResponse.json({ error: 'Analyze a wallet first.' }, { status: 400 });
  }

  try {
    const reply = await runCopilot(facts, messages);
    return NextResponse.json({ role: 'assistant', content: reply, llm: llmConfigured() });
  } catch (err: any) {
    // Fail soft: fall back to the deterministic summary so the user still gets value.
    const reply = `${ruleBasedReply(facts)}\n\n(Note: the AI provider call failed — ${err?.message || 'unknown error'}.)`;
    return NextResponse.json({ role: 'assistant', content: reply, llm: false });
  }
}
