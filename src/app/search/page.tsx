import Link from "next/link";
import {
  Bell,
  Bot,
  ChevronDown,
  Database,
  ExternalLink,
  FileSearch,
  Gauge,
  Globe2,
  Home,
  Library,
  Network,
  RadioTower,
  Search,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  UserCircle
} from "lucide-react";
import { retrieveDocuments } from "@/lib/rag";
import { compactDate } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: Gauge },
  { label: "Entity Explorer", href: "/entities", icon: Network },
  { label: "Source Library", href: "/sources", icon: Database },
  { label: "Evidence Search", href: "/search?q=latest%20NALCO%20announcements", icon: FileSearch, active: true },
  { label: "Data Sources", href: "/sources/status", icon: RadioTower },
  { label: "Demo", href: "/demo", icon: Sparkles }
];

function sourceIcon(sourceName: string) {
  const normalized = sourceName.toLowerCase();
  if (normalized.includes("policy") || normalized.includes("government")) return ShieldAlert;
  if (normalized.includes("commodity") || normalized.includes("rss")) return RadioTower;
  if (normalized.includes("investor") || normalized.includes("official")) return Home;
  return Globe2;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const query = params.q || "";
  const results = query.trim() ? await retrieveDocuments(query, 10) : [];
  const shownResults = results.slice(0, 6);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a0c10] text-[#dde3e7] antialiased selection:bg-[#00d1ff] selection:text-[#003543]">
      <div className="fixed left-0 top-0 z-[60] h-0.5 w-full bg-gradient-to-r from-[#00d1ff] via-[#a4e6ff] to-transparent shadow-[0_0_12px_rgba(0,209,255,0.5)]" />

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-[#3c494e]/30 bg-[#0e1417]/80 px-4 backdrop-blur-xl md:left-[280px] md:px-6">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link className="rounded-lg p-2 text-[#bbc9cf] transition hover:bg-[#2f3639]/80 hover:text-[#a4e6ff] md:hidden" href="/dashboard" aria-label="Open dashboard">
              <Library size={22} />
            </Link>
            <Link href="/" className="hidden truncate text-2xl font-bold tracking-normal text-[#a4e6ff] transition hover:text-[#b7eaff] md:block">
              NALCO Intelligence
            </Link>
            <div className="hidden items-center gap-2 rounded-full border border-[#3c494e]/30 bg-[#242b2e]/50 px-3 py-1 md:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4cd6ff] opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#4cd6ff]" />
              </span>
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#4cd6ff]">Live</span>
            </div>
          </div>

          <form action="/search" className="hidden min-w-[240px] max-w-md flex-1 items-center rounded-lg border border-[#3c494e]/40 bg-[#242b2e]/50 px-3 py-1.5 transition focus-within:border-[#00d1ff]/60 focus-within:shadow-[0_0_18px_rgba(0,209,255,0.15)] lg:flex">
            <Search size={18} className="text-[#bbc9cf]" />
            <input
              className="ml-2 w-full border-0 bg-transparent py-0 text-sm text-[#dde3e7] outline-none placeholder:text-[#bbc9cf]/60 focus:ring-0"
              name="q"
              defaultValue={query}
              placeholder="Cmd+K to search evidence..."
            />
          </form>

          <div className="flex items-center gap-1">
            <Link className="rounded-full p-2 text-[#bbc9cf] transition hover:bg-[#2f3639]/80 hover:text-[#a4e6ff]" href="/sources/status" aria-label="Data source status">
              <RadioTower size={21} />
            </Link>
            <Link className="relative rounded-full p-2 text-[#bbc9cf] transition hover:bg-[#2f3639]/80 hover:text-[#a4e6ff]" href="/sources" aria-label="Notifications">
              <Bell size={21} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#ffb4ab] shadow-[0_0_8px_rgba(255,180,171,0.6)]" />
            </Link>
            <Link className="rounded-full p-2 text-[#bbc9cf] transition hover:bg-[#2f3639]/80 hover:text-[#a4e6ff]" href="/dashboard" aria-label="User profile">
              <UserCircle size={22} />
            </Link>
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 top-0 z-40 hidden w-[280px] flex-col border-r border-[#3c494e]/20 bg-[#161d1f]/90 px-3 py-6 shadow-[4px_0_24px_rgba(0,0,0,0.2)] backdrop-blur-xl md:flex">
        <Link className="mb-8 flex items-center gap-3 px-3" href="/">
          <span className="grid h-10 w-10 place-items-center rounded-lg border border-[#a4e6ff]/30 bg-[#a4e6ff]/10 text-[#a4e6ff] transition hover:bg-[#a4e6ff]/20">
            <Bot size={23} />
          </span>
          <span>
            <span className="block text-lg font-black leading-6 tracking-normal text-[#a4e6ff]">NALCO</span>
            <span className="block font-mono text-[11px] uppercase tracking-widest text-[#bbc9cf]">Enterprise Terminal</span>
          </span>
        </Link>

        <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className={
                  item.active
                    ? "flex translate-x-1 items-center gap-3 rounded-lg border-l-4 border-[#4cd6ff] bg-[#a4e6ff]/10 px-3 py-2.5 font-mono text-[13px] font-bold text-[#a4e6ff] shadow-[inset_0_0_20px_rgba(164,230,255,0.05)]"
                    : "flex items-center gap-3 rounded-lg px-3 py-2.5 font-mono text-[13px] text-[#bbc9cf] opacity-75 transition hover:bg-[#242b2e] hover:text-[#dde3e7] hover:opacity-100"
                }
                href={item.href}
                key={item.label}
              >
                <Icon size={19} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-4 border-t border-[#3c494e]/20 pt-4">
          <Link className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-mono text-[13px] text-[#bbc9cf] opacity-75 transition hover:bg-[#242b2e] hover:text-[#dde3e7]" href="/sources/status">
            <Settings size={19} />
            Settings
          </Link>
        </div>
      </nav>

      <main className="relative mx-auto min-h-screen w-full max-w-[1440px] px-4 pb-24 pt-24 md:ml-[280px] md:px-6 md:pt-28">
        <div className="pointer-events-none absolute left-1/2 top-20 h-[300px] w-[min(600px,90vw)] -translate-x-1/2 rounded-full bg-[#00d1ff]/5 blur-[120px]" />
        <section className="relative z-10 mx-auto max-w-4xl">
          <div className="nalco-fade-in-up mb-10">
            <h1 className="text-[40px] font-bold leading-[48px] tracking-normal text-[#dde3e7]">Evidence Search</h1>
            <p className="mt-2 max-w-3xl text-lg leading-7 text-[#bbc9cf]">
              Hybrid keyword and vector-style retrieval over normalized NALCO evidence, synced with the same documents used by the assistant.
            </p>
          </div>

          <form action="/search" className="nalco-fade-in-up nalco-stagger-1 mb-8 flex flex-col gap-2 rounded-xl border border-[#859399]/15 bg-[#161d1f]/60 p-1 shadow-[0_0_30px_rgba(0,0,0,0.18)] backdrop-blur-xl transition focus-within:border-[#4cd6ff]/60 focus-within:shadow-[0_0_22px_rgba(0,209,255,0.22)] sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bbc9cf]" size={22} />
              <input
                className="h-14 w-full rounded-lg border-0 bg-[#161d1f]/50 py-4 pl-12 pr-4 text-lg text-[#dde3e7] outline-none placeholder:text-[#bbc9cf]/60 focus:bg-[#242b2e]/80 focus:ring-0"
                defaultValue={query}
                name="q"
                placeholder="Enter query to search evidence base..."
              />
            </div>
            <button className="inline-flex h-14 items-center justify-center gap-2 rounded-lg border border-[#00d1ff]/30 bg-[#00d1ff]/10 px-6 font-mono text-[13px] font-bold uppercase tracking-wider text-[#00d1ff] transition hover:scale-[1.01] hover:bg-[#00d1ff]/20 hover:shadow-[0_0_20px_rgba(0,209,255,0.3)] active:scale-[0.98]">
              Search
            </button>
          </form>

          <div className="nalco-fade-in-up nalco-stagger-2 mb-6 flex flex-wrap items-center gap-3 text-sm text-[#bbc9cf]">
            <span className="font-mono">
              {query.trim() ? (
                <>
                  Found <span className="font-semibold text-[#dde3e7]">{results.length}</span> results for query
                </>
              ) : (
                "Search filings, entities, commodities, policy signals, or market risks."
              )}
            </span>
            <span className="hidden h-4 w-px bg-[#3c494e]/50 sm:block" />
            <span className="inline-flex items-center gap-1 rounded border border-[#3c494e]/30 bg-[#242b2e] px-2 py-1 font-mono text-xs">
              <SlidersHorizontal size={14} />
              Hybrid Search
            </span>
            <span className="inline-flex items-center gap-1 rounded border border-[#3c494e]/30 bg-[#242b2e] px-2 py-1 font-mono text-xs">
              <ChevronDown size={14} />
              Relevance
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {!query.trim() && (
              <div className="rounded-xl border border-[#859399]/15 bg-[#161d1f]/60 p-6 text-[#bbc9cf] backdrop-blur-xl">
                Try a query such as <span className="text-[#dde3e7]">latest NALCO announcements</span>, <span className="text-[#dde3e7]">aluminium market risk</span>, or <span className="text-[#dde3e7]">Damanjodi Angul assets</span>.
              </div>
            )}
            {query.trim() && shownResults.length === 0 && (
              <div className="rounded-xl border border-[#859399]/15 bg-[#161d1f]/60 p-6 text-[#bbc9cf] backdrop-blur-xl">
                I could not find enough verified evidence for this search. Try a source-backed NALCO topic such as recent announcements, filings, aluminium market context, entity mapping, or policy risks.
              </div>
            )}
            {shownResults.map((item, index) => {
              const Icon = sourceIcon(item.doc.sourceName);
              return (
                <article
                  className="group relative overflow-hidden rounded-xl border border-[#859399]/15 bg-[#161d1f]/45 p-6 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.6)] backdrop-blur-lg transition duration-300 hover:-translate-y-1 hover:border-[#4cd6ff]/40 hover:bg-[#161d1f]/80 hover:shadow-[0_12px_34px_-12px_rgba(0,0,0,0.7),inset_0_0_20px_rgba(0,209,255,0.08)]"
                  key={item.doc.id}
                  style={{ animationDelay: `${index * 75}ms` }}
                >
                  <div className="pointer-events-none absolute -inset-px bg-gradient-to-r from-transparent via-[#00d1ff]/10 to-transparent opacity-0 blur-md transition duration-500 group-hover:opacity-100" />
                  <div className="relative z-10 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <Link href={`/sources/${item.doc.id}`} className="text-2xl font-semibold leading-8 tracking-normal text-[#b7eaff] transition hover:text-[#a4e6ff]">
                        {item.doc.title}
                      </Link>
                      <a className="shrink-0 rounded-full p-2 text-[#bbc9cf] transition hover:bg-[#2f3639]/80 hover:text-[#a4e6ff]" href={item.doc.url} target="_blank" rel="noreferrer" aria-label="Open original source">
                        <ExternalLink size={18} />
                      </a>
                    </div>
                    <p className="text-base leading-7 text-[#bbc9cf] transition group-hover:text-[#dde3e7]">{item.doc.summary}</p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-4 border-t border-[#3c494e]/25 pt-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded border border-[#3c494e]/30 bg-[#333a3d]/50 px-2 py-0.5 font-mono text-xs text-[#bbc9cf]">
                          <Icon size={14} />
                          {item.doc.sourceName}
                        </span>
                        <span className="rounded border border-[#ffba49]/20 bg-[#ffd59c]/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#ffd59c]">
                          {compactDate(item.doc.publishedAt || item.doc.fetchedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="text-[#bbc9cf]">Retrieval Score</span>
                        <span className={index === 0 ? "rounded border border-[#00d1ff]/40 bg-[#242b2e] px-2 py-0.5 font-bold text-[#00d1ff] shadow-[0_0_12px_rgba(0,209,255,0.25)]" : "rounded border border-[#3c494e]/40 bg-[#242b2e] px-2 py-0.5 text-[#bbc9cf]"}>
                          {item.score.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-8 flex justify-center">
            <Link className="inline-flex items-center gap-2 rounded-lg border border-[#3c494e]/30 bg-[#1a2123] px-4 py-2 font-mono text-xs uppercase tracking-wider text-[#bbc9cf] transition hover:-translate-y-0.5 hover:border-[#a4e6ff]/50 hover:bg-[#242b2e] hover:text-[#a4e6ff]" href="/sources">
              <ChevronDown size={16} />
              Open Source Library
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
