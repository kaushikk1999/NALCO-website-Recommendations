"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, ChevronDown, ExternalLink, Paperclip, Send, Sparkles } from "lucide-react";
import type { ChatAnswer } from "@/lib/types";

type Message = { role: "user" | "assistant"; text: string; result?: ChatAnswer };
type StreamEvent = { event: string; data: string };

const prompts = ["Latest NALCO News", "Recent Filings", "Aluminium Market", "Entity Map", "Risk Summary"];
const unavailableAnswer = [
  "I could not complete that response from the available sources.",
  "",
  "Please try again, or ask for a source-backed NALCO topic such as recent announcements, filings, aluminium market context, entity mapping, or policy risks."
].join("\n");

function shouldShowMetadata(result?: ChatAnswer) {
  return Boolean(result && (result.confidence > 0 || result.citations.length > 0 || result.entities.length > 0 || result.liveRefreshStatus));
}

function liveRefreshLabel(result: ChatAnswer) {
  if (result.liveRefreshStatus === "failed") return "Live refresh failed";
  if (result.liveRefreshStatus === "completed_with_warnings") return "Live refresh completed with warnings";
  if (result.liveRefreshStatus === "completed") return "Live sources refreshed";
  return null;
}

function inlineMarkdown(text: string, keyPrefix: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong className="font-semibold text-slate-50" key={`${keyPrefix}-strong-${partIndex}`}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${keyPrefix}-text-${partIndex}`}>{part}</span>;
  });
}

function FormattedMessage({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-3 text-base leading-relaxed">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div className="h-1" key={`spacer-${index}`} />;
        if (trimmed.startsWith("### ")) {
          return (
            <h3 className="text-lg font-semibold leading-7 text-slate-50" key={`h3-${index}`}>
              {inlineMarkdown(trimmed.slice(4), `h3-${index}`)}
            </h3>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2 className="text-xl font-semibold leading-8 text-slate-50" key={`h2-${index}`}>
              {inlineMarkdown(trimmed.slice(3), `h2-${index}`)}
            </h2>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h2 className="text-xl font-semibold leading-8 text-slate-50" key={`h1-${index}`}>
              {inlineMarkdown(trimmed.slice(2), `h1-${index}`)}
            </h2>
          );
        }
        const bullet = trimmed.match(/^[-*]\s+(.*)$/);
        if (bullet) {
          return (
            <div className="flex gap-3 pl-1" key={`bullet-${index}`}>
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00d1ff]" />
              <p className="min-w-0 flex-1">{inlineMarkdown(bullet[1], `bullet-${index}`)}</p>
            </div>
          );
        }
        return <p key={`p-${index}`}>{inlineMarkdown(trimmed, `p-${index}`)}</p>;
      })}
    </div>
  );
}

function parseStreamEvents(buffer: string) {
  const chunks = buffer.split("\n\n");
  const remainder = chunks.pop() || "";
  const events = chunks
    .map((chunk): StreamEvent | null => {
      const event = chunk.match(/^event:\s*(.+)$/m)?.[1]?.trim();
      const data = chunk.match(/^data:\s*(.+)$/m)?.[1]?.trim();
      return event && data ? { event, data } : null;
    })
    .filter((event): event is StreamEvent => Boolean(event));
  return { events, remainder };
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("Fetching latest sources...");
  const chatRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hi, I’m your NALCO Intelligence Assistant. Ask me about filings, news, aluminium prices, entities, or policy updates."
    }
  ]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  useEffect(() => {
    if (!loading) return;
    const formattingTimer = window.setTimeout(() => setLoadingStep("Formatting response with Ollama..."), 4500);
    return () => window.clearTimeout(formattingTimer);
  }, [loading]);

  async function ask(question: string) {
    if (!question.trim()) return;
    setInput("");
    setLoadingStep("Fetching latest sources...");
    setLoading(true);
    setMessages((current) => [...current, { role: "user", text: question }, { role: "assistant", text: "" }]);

    function updateAssistant(updater: (message: Message) => Message) {
      setMessages((current) => current.map((message, index) => (index === current.length - 1 && message.role === "assistant" ? updater(message) : message)));
    }

    async function fallbackToJson() {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question })
      });
      const result = await response.json();
      updateAssistant(() => ({ role: "assistant", text: result.answer || unavailableAnswer, result }));
    }

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question })
      });
      if (!response.ok || !response.body) throw new Error("Streaming chat failed");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let receivedDelta = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parsed = parseStreamEvents(buffer);
        buffer = parsed.remainder;
        for (const event of parsed.events) {
          if (event.event === "status") {
            const data = JSON.parse(event.data) as { message?: string };
            if (data.message) setLoadingStep(data.message);
          }
          if (event.event === "delta") {
            const data = JSON.parse(event.data) as { text?: string };
            if (data.text) {
              receivedDelta = true;
              updateAssistant((message) => ({ ...message, text: `${message.text}${data.text}` }));
            }
          }
          if (event.event === "metadata") {
            const result = JSON.parse(event.data) as ChatAnswer;
            updateAssistant((message) => ({ ...message, text: message.text || result.answer || unavailableAnswer, result }));
          }
          if (event.event === "error") throw new Error("Streaming chat failed");
        }
      }

      if (!receivedDelta) await fallbackToJson();
    } catch {
      try {
        await fallbackToJson();
      } catch {
        updateAssistant(() => ({ role: "assistant", text: unavailableAnswer }));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05080a]/70 p-3 backdrop-blur-sm sm:p-5">
          <main className="nalco-chat-shell relative flex h-[min(880px,calc(100vh-2rem))] w-full max-w-5xl flex-col overflow-hidden border-x border-white/5 bg-[#0e1417] text-slate-200 shadow-2xl sm:rounded-2xl">
            <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[min(800px,110vw)] -translate-x-1/2 bg-[#00d1ff]/5 blur-[120px]" />

            <header className="nalco-chat-header sticky top-0 z-20 flex items-center justify-between px-4 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-4">
                <div className="nalco-chat-heartbeat flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#00d1ff]/30 bg-[#00d1ff]/10 text-[#00d1ff] shadow-[0_0_15px_rgba(0,209,255,0.2)]">
                  <Bot size={24} />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-semibold leading-none tracking-normal text-white">NALCO Intelligence Assistant</h1>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00d1ff] opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00d1ff] shadow-[0_0_8px_#00d1ff]" />
                    </span>
                    <p className="truncate text-[10px] font-medium uppercase tracking-widest text-slate-400">System Live • Grounded citations</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-400 transition-all duration-200 hover:rotate-180 hover:bg-white/5 hover:text-white"
                aria-label="Collapse chat"
                title="Collapse chat"
              >
                <ChevronDown size={20} />
              </button>
            </header>

            <section ref={chatRef} className="scrollbar-thin relative z-10 flex-1 space-y-6 overflow-y-auto p-4 scroll-smooth sm:p-6">
              {messages.map((message, index) => {
                const isUser = message.role === "user";
                return (
                  <div
                    key={`${message.role}-${index}`}
                    className={`nalco-chat-fade flex max-w-[88%] flex-col gap-2 ${isUser ? "ml-auto items-end" : "mr-auto items-start"}`}
                    style={{ animationDelay: `${Math.min(index * 80, 360)}ms` }}
                  >
                    <span className={`text-[10px] uppercase tracking-tight text-slate-500 ${isUser ? "mr-1" : "ml-1"}`}>
                      {isUser ? "You" : "AI Assistant"} • Just now
                    </span>
                    <div
                      className={
                        isUser
                          ? "rounded-2xl rounded-tr-none border border-[#00d1ff]/30 bg-[#00d1ff]/20 p-5 text-white shadow-sm transition-all duration-300 hover:border-[#00d1ff]/50"
                          : "nalco-chat-glass rounded-2xl rounded-tl-none p-5 text-slate-200 shadow-sm transition-colors duration-300 hover:border-[#00d1ff]/20"
                      }
                    >
                      {isUser ? <p className="whitespace-pre-wrap text-base leading-relaxed">{message.text}</p> : <FormattedMessage text={message.text} />}
                      {shouldShowMetadata(message.result) && message.result && (
                        <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                          <div className="flex flex-wrap gap-2">
                            {message.result.confidence > 0 && (
                              <span className="rounded-full border border-[#00d1ff]/20 bg-[#00d1ff]/10 px-3 py-1 text-xs font-semibold text-[#8eeaff]">
                                Confidence {Math.round(message.result.confidence * 100)}%
                              </span>
                            )}
                            {message.result.evidenceDateRange && (
                              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                                {message.result.evidenceDateRange}
                              </span>
                            )}
                            {liveRefreshLabel(message.result) && (
                              <span
                                className={
                                  message.result.liveRefreshStatus === "failed"
                                    ? "rounded-full border border-[#ffb4ab]/20 bg-[#ffb4ab]/10 px-3 py-1 text-xs font-semibold text-[#ffdad6]"
                                    : "rounded-full border border-[#4cd6ff]/20 bg-[#4cd6ff]/10 px-3 py-1 text-xs font-semibold text-[#8eeaff]"
                                }
                              >
                                {liveRefreshLabel(message.result)}
                                {typeof message.result.liveFetchedCount === "number" ? ` • ${message.result.liveFetchedCount} fetched` : ""}
                              </span>
                            )}
                          </div>
                          {message.result.liveRefreshErrors && message.result.liveRefreshErrors.length > 0 && (
                            <p className="text-xs leading-5 text-[#ffdad6]/80">
                              Live source warning: {message.result.liveRefreshErrors[0]}
                            </p>
                          )}
                          {message.result.entities.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {message.result.entities.slice(0, 6).map((entity) => (
                                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300" key={`${index}-${entity.type}-${entity.text}`}>
                                  {entity.text}
                                </span>
                              ))}
                            </div>
                          )}
                          {message.result.citations.length > 0 && (
                            <div className="space-y-2">
                              {message.result.citations.map((citation, citationIndex) => (
                                <a
                                  key={citation.id}
                                  href={citation.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-start gap-2 rounded-xl border border-white/10 bg-[#0e1417]/50 p-3 text-xs text-slate-300 transition hover:border-[#00d1ff]/40 hover:bg-[#00d1ff]/5 hover:text-white"
                                >
                                  <span className="font-bold text-[#00d1ff]">[{citationIndex + 1}]</span>
                                  <span className="flex-1">
                                    {citation.title}
                                    <br />
                                    <span className="text-slate-500">{citation.sourceName}</span>
                                  </span>
                                  <ExternalLink size={13} className="mt-0.5 shrink-0" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {loading && (
                <div className="nalco-chat-fade mr-auto flex max-w-[88%] flex-col gap-2">
                  <div className="nalco-chat-glass rounded-2xl rounded-tl-none p-5 text-sm text-slate-200">
                    <Sparkles className="mr-2 inline animate-pulse text-[#00d1ff]" size={16} />
                    {loadingStep}
                  </div>
                  <span className="ml-1 text-[10px] uppercase tracking-tight text-slate-500">AI Assistant • Just now</span>
                </div>
              )}
            </section>

            <footer className="relative z-10 bg-gradient-to-t from-[#0e1417] via-[#0e1417]/95 to-transparent p-4 pt-2 sm:p-6 sm:pt-2">
              <div className="mb-6 flex flex-wrap gap-2">
                {prompts.map((prompt, index) => (
                  <button
                    key={prompt}
                    onClick={() => ask(prompt)}
                    disabled={loading}
                    className="nalco-chat-chip nalco-chat-glass rounded-full border border-white/10 px-4 py-2 text-xs font-medium text-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ animationDelay: `${0.2 + index * 0.08}s` }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <form
                className="nalco-chat-input flex items-center gap-3 rounded-2xl border border-white/10 p-2 pl-4 sm:pl-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  ask(input);
                }}
              >
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  className="flex-1 border-none bg-transparent py-3 text-sm text-slate-100 outline-none transition-opacity placeholder:text-slate-500 focus:ring-0 focus:placeholder:opacity-50"
                  placeholder="Ask about NALCO..."
                  aria-label="Message Nalco AI"
                />
                <div className="flex items-center gap-2 pr-1">
                  <button
                    className="rounded-lg p-2 text-slate-500 transition-all duration-200 hover:scale-110 hover:text-[#00d1ff] active:scale-95"
                    title="Attach Document"
                    aria-label="Attach Document"
                    type="button"
                  >
                    <Paperclip size={20} />
                  </button>
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00d1ff] text-[#0e1417] shadow-[0_0_20px_rgba(0,209,255,0.25)] transition-all hover:scale-110 hover:bg-white active:scale-90 disabled:cursor-not-allowed disabled:opacity-60"
                    title="Send Message"
                    aria-label="Send"
                    disabled={loading}
                    type="submit"
                  >
                    <Send className="translate-x-0.5" size={20} strokeWidth={2.5} />
                  </button>
                </div>
              </form>

              <div className="mt-4 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">Secure Enterprise Environment</p>
              </div>
            </footer>
          </main>
        </div>
      )}
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#00d1ff] text-[#0e1417] shadow-[0_0_28px_rgba(0,209,255,0.35)] transition hover:scale-105 hover:bg-white"
        aria-label="Open NALCO assistant"
      >
        <Bot size={25} />
      </button>
    </div>
  );
}
