"use client";
import { useState } from "react";

const agents = [
  { id: 1, name: "Contract Auditor", desc: "Scans Solidity contracts for vulnerabilities, reentrancy, and exploits.", price: "0.05", category: "builders", runs: 892, badge: "🔐" },
  { id: 2, name: "Wallet Risk Scanner", desc: "Analyzes wallet history, approvals, and on-chain risk exposure.", price: "0.03", category: "builders", runs: 1204, badge: "🛡️" },
  { id: 3, name: "Code Generator", desc: "Generates Solidity boilerplate, ERC20/721 contracts and deployment scripts.", price: "0.04", category: "builders", runs: 670, badge: "⚙️" },
  { id: 4, name: "Thread Writer", desc: "Researches Web3 topics and writes viral X threads in your voice.", price: "0.02", category: "creators", runs: 2310, badge: "✍️" },
  { id: 5, name: "Community Analyst", desc: "Analyzes Discord and Twitter sentiment, tracks narratives and trends.", price: "0.025", category: "creators", runs: 1560, badge: "📊" },
  { id: 6, name: "Alpha Researcher", desc: "Deep-dives into protocols, tokenomics and surfaces early opportunities.", price: "0.035", category: "creators", runs: 980, badge: "🔍" },
  { id: 7, name: "Research Agent", desc: "Searches, summarizes and synthesizes information on any topic.", price: "0.01", category: "general", runs: 3200, badge: "🧠" },
  { id: 8, name: "Travel Planner", desc: "Plans trips, finds deals and builds full itineraries on demand.", price: "0.015", category: "general", runs: 740, badge: "✈️" },
  { id: 9, name: "Data Analyst", desc: "Uploads CSVs, detects patterns and generates visual insights.", price: "0.02", category: "general", runs: 1100, badge: "📈" },
];

const tabs = [
  { id: "all", label: "All Agents" },
  { id: "builders", label: "🔨 Builders" },
  { id: "creators", label: "🎨 Creators" },
  { id: "general", label: "🌍 General" },
];

const stats = [
  { label: "Agents Live", value: "9" },
  { label: "Tasks Completed", value: "12.6K" },
  { label: "0G Storage Used", value: "4.2 GB" },
  { label: "Verified Users", value: "523" },
];

type Agent = typeof agents[0];
type Result = { output: string; txHash: string; timestamp: string } | null;

export default function Home() {
  const [active, setActive] = useState("all");
  const [modal, setModal] = useState<Agent | null>(null);
  const [task, setTask] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result>(null);

  const filtered = active === "all" ? agents : agents.filter(a => a.category === active);

  async function hireAgent() {
    if (!task.trim() || !modal) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/hire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName: modal.name, task }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ output: "Agent failed. Try again.", txHash: "", timestamp: "" });
    }
    setLoading(false);
  }

  function openModal(agent: Agent) {
    setModal(agent);
    setTask("");
    setResult(null);
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* NAV */}
      <nav className="border-b border-zinc-800 px-6 py-4 flex justify-between items-center sticky top-0 bg-[#0a0a0a]/95 backdrop-blur z-50">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-xl font-bold">Agent</span>
            <span className="text-xl font-bold text-purple-400">Market</span>
          </div>
          <span className="text-xs bg-purple-900/50 text-purple-300 border border-purple-800 px-2 py-0.5 rounded-full">0G Powered</span>
        </div>
        <button className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg transition font-medium">
          Connect Wallet
        </button>
      </nav>

      {/* HERO */}
      <section className="px-6 py-20 text-center max-w-4xl mx-auto">
        <div className="inline-block bg-purple-900/30 border border-purple-800 text-purple-300 text-xs px-3 py-1 rounded-full mb-6">
          The App Store for AI Agents
        </div>
        <h1 className="text-5xl font-bold mb-5 leading-tight">
          Hire AI Agents.<br />
          <span className="text-purple-400">Pay on-chain. Own the output.</span>
        </h1>
        <p className="text-zinc-400 text-lg mb-10 max-w-2xl mx-auto">
          The first agent economy for builders, creators, and everyday users — powered by 0G Storage, Compute, Agent ID, and on-chain micropayments.
        </p>
        <div className="flex gap-3 justify-center flex-wrap mb-12">
          {["0G Storage", "0G Compute", "Agent ID", "0G Chain"].map(b => (
            <div key={b} className="bg-zinc-900 border border-zinc-700 hover:border-purple-600 transition rounded-xl px-4 py-2 text-sm text-purple-300 font-medium">{b}</div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-zinc-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* AGENTS */}
      <section className="px-6 pb-24 max-w-6xl mx-auto">
        <div className="flex gap-2 mb-8 flex-wrap">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActive(t.id)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition ${active === t.id ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(agent => (
            <div key={agent.id} className="bg-zinc-900 border border-zinc-800 hover:border-purple-700 transition rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="text-3xl">{agent.badge}</span>
                  <span className="text-xs text-zinc-500">{agent.runs.toLocaleString()} runs</span>
                </div>
                <h3 className="font-semibold text-white mb-1">{agent.name}</h3>
                <p className="text-zinc-400 text-sm mb-4 leading-relaxed">{agent.desc}</p>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-zinc-800">
                <span className="text-white font-bold text-sm">{agent.price} USDC<span className="text-zinc-500 font-normal"> / task</span></span>
                <button onClick={() => openModal(agent)}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-sm px-4 py-1.5 rounded-lg transition font-medium">
                  Hire
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HIRE MODAL */}
      {modal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto" onClick={() => { setModal(null); setResult(null); }}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-lg w-full my-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-3xl">{modal.badge}</span>
                <h2 className="text-lg font-bold mt-1">{modal.name}</h2>
                <p className="text-zinc-400 text-sm">{modal.desc}</p>
              </div>
              <button onClick={() => { setModal(null); setResult(null); }} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>

            <div className="bg-zinc-800 rounded-xl p-3 mb-4 text-xs grid grid-cols-2 gap-2">
              <div><span className="text-zinc-500">Price</span><br /><span className="text-white font-medium">{modal.price} USDC / task</span></div>
              <div><span className="text-zinc-500">Compute</span><br /><span className="text-purple-400">0G Network</span></div>
              <div><span className="text-zinc-500">Storage</span><br /><span className="text-purple-400">0G Storage</span></div>
              <div><span className="text-zinc-500">Identity</span><br /><span className="text-purple-400">Agent ID</span></div>
            </div>

            {!result ? (
              <>
                <textarea
                  value={task}
                  onChange={e => setTask(e.target.value)}
                  placeholder={`Describe your task for ${modal.name}...`}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm text-white placeholder-zinc-500 resize-none h-28 mb-4 focus:outline-none focus:border-purple-600"
                />
                <div className="flex gap-3">
                  <button onClick={() => setModal(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-xl text-sm transition">Cancel</button>
                  <button onClick={hireAgent} disabled={loading || !task.trim()}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition">
                    {loading ? "Agent running..." : `Hire for ${modal.price} USDC`}
                  </button>
                </div>
              </>
            ) : (
              <div>
                <div className="bg-zinc-800 rounded-xl p-4 mb-4">
                  <div className="text-xs text-purple-400 font-medium mb-2">✓ Agent Output</div>
                  <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{result.output}</p>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-3 mb-4 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-zinc-500">Stored on</span><span className="text-purple-400">0G Storage ✓</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Tx Hash</span><span className="text-zinc-400 font-mono truncate ml-4">{result.txHash}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">Timestamp</span><span className="text-zinc-400">{new Date(result.timestamp).toLocaleTimeString()}</span></div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setResult(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-xl text-sm transition">New Task</button>
                  <button onClick={() => setModal(null)} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-xl text-sm font-medium transition">Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="border-t border-zinc-800 px-6 py-8 text-center text-zinc-600 text-sm">
        AgentMarket · Built on 0G Network · 0G APAC Hackathon 2026
      </footer>
    </main>
  );
}
