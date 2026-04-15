"use client";
import { useState, useEffect, useRef } from "react";

const agents = [
  { id: 1, name: "Contract Auditor", desc: "Scans Solidity contracts for vulnerabilities, reentrancy, and exploits.", price: "0.05", category: "builders", runs: 892, badge: "🔐", color: "#ff6b35" },
  { id: 2, name: "Wallet Risk Scanner", desc: "Analyzes wallet history, approvals, and on-chain risk exposure.", price: "0.03", category: "builders", runs: 1204, badge: "🛡️", color: "#00d4ff" },
  { id: 3, name: "Code Generator", desc: "Generates Solidity boilerplate, ERC20/721 contracts and deployment scripts.", price: "0.04", category: "builders", runs: 670, badge: "⚙️", color: "#a855f7" },
  { id: 4, name: "Thread Writer", desc: "Researches Web3 topics and writes viral X threads with hooks.", price: "0.02", category: "creators", runs: 2341, badge: "✍️", color: "#f0c040" },
  { id: 5, name: "NFT Copywriter", desc: "Writes mint-day descriptions, Discord announcements, and lore.", price: "0.02", category: "creators", runs: 987, badge: "🎨", color: "#ff4fa3" },
  { id: 6, name: "DAO Proposal Writer", desc: "Structures governance proposals with rationale, quorum, and voting options.", price: "0.03", category: "creators", runs: 456, badge: "📜", color: "#22d3a5" },
  { id: 7, name: "Research Agent", desc: "Deep-dives any Web3 protocol — tokenomics, team, risks, moat.", price: "0.04", category: "general", runs: 3102, badge: "🔭", color: "#60a5fa" },
  { id: 8, name: "Crypto Tax Helper", desc: "Explains tax implications of DeFi, staking, and NFT trades.", price: "0.03", category: "general", runs: 789, badge: "📊", color: "#fb923c" },
  { id: 9, name: "Airdrop Hunter", desc: "Identifies live airdrop opportunities and checklists to qualify.", price: "0.01", category: "general", runs: 5670, badge: "🪂", color: "#4ade80" },
];

const TABS = ["all", "builders", "creators", "general"];

export default function AgentMarket() {
  const [tab, setTab] = useState("all");
  const [hiring, setHiring] = useState<typeof agents[0] | null>(null);
  const [task, setTask] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ output: string; txHash: string; rootHash?: string } | null>(null);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [tutorStep, setTutorStep] = useState(0);
  const [statsCounted, setStatsCounted] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const filtered = tab === "all" ? agents : agents.filter(a => a.category === tab);

  const tutorSteps = [
    { title: "Welcome to AgentMarket 🦉", msg: "I'm Ori — your cyberpunk owl guide. AgentMarket is the App Store for AI Agents, powered by 0G blockchain. Let me show you around." },
    { title: "Pick Your Agent 🎯", msg: "Browse agents by category — Builders for devs, Creators for content, General for everything else. Each agent is minted as an NFT on-chain." },
    { title: "Hire & Run 💸", msg: "Click Hire on any agent, describe your task, and the agent executes in real time. Output is verified and stored permanently on 0G Storage." },
    { title: "Your Output is On-Chain 🔗", msg: "Every result gets a Merkle root hash and transaction hash on 0G — fully verifiable, forever accessible. You own your data." },
    { title: "You're Ready 🚀", msg: "That's it! Go hire your first agent. The future of work is autonomous." },
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const pts = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
    }));
    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,212,255,${p.opacity})`;
        ctx.fill();
      });
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(0,212,255,${0.08*(1-dist/120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animRef.current = requestAnimationFrame(draw);
    }
    draw();
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", resize); };
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting && !statsCounted) setStatsCounted(true); }, { threshold: 0.5 });
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, [statsCounted]);

  const hire = async () => {
    if (!task.trim() || !hiring) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/hire", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agentName: hiring.name, task }) });
      setResult(await res.json());
    } catch {
      setResult({ output: "Agent encountered an error. Try again.", txHash: "0x" + Math.random().toString(16).slice(2, 42) });
    }
    setLoading(false);
  };

  return (
    <>
     <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Inter:wght@300;400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--cyan:#00d4ff;--purple:#a855f7;--orange:#ff6b35;--pink:#ff4fa3;--green:#22d3a5;--bg:#040810;--surface:rgba(255,255,255,0.03);--border:rgba(0,212,255,0.15);--text:#e2e8f0;--muted:#64748b}
        html{scroll-behavior:smooth}
        body{background:var(--bg);color:var(--text);font-family:'Inter',sans-serif;overflow-x:hidden;min-height:100vh}
        .canvas-bg{position:fixed;inset:0;z-index:0;pointer-events:none}
        .gradient-orb{position:fixed;border-radius:50%;filter:blur(120px);pointer-events:none;z-index:0}
        .orb-1{width:600px;height:600px;background:rgba(168,85,247,0.08);top:-200px;right:-200px}
        .orb-2{width:400px;height:400px;background:rgba(0,212,255,0.06);bottom:100px;left:-100px}
        .app{position:relative;z-index:1;max-width:1400px;margin:0 auto;padding:0 24px}
        nav{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);position:sticky;top:0;z-index:100;background:rgba(4,8,16,0.85);backdrop-filter:blur(20px);max-width:1400px;margin:0 auto;padding:20px 24px}
        .logo{font-family:'Orbitron',sans-serif;font-size:22px;font-weight:900;background:linear-gradient(135deg,var(--cyan),var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:2px}
        .logo span{font-weight:400;opacity:0.6}
        .nav-right{display:flex;align-items:center;gap:12px}
        .btn-ghost{background:none;border:1px solid var(--border);color:var(--muted);padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;transition:all 0.2s;font-family:'Share Tech Mono',monospace}
        .btn-ghost:hover{border-color:var(--cyan);color:var(--cyan)}
        .btn-primary{background:linear-gradient(135deg,var(--cyan),var(--purple));border:none;color:#000;padding:9px 20px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Orbitron',sans-serif;letter-spacing:1px}
        .hero{padding:100px 0 80px;text-align:center}
        .hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);border-radius:100px;padding:6px 16px;font-size:12px;color:var(--cyan);font-family:'Share Tech Mono',monospace;margin-bottom:28px;animation:pulse-border 3s ease-in-out infinite}
        @keyframes pulse-border{0%,100%{border-color:rgba(0,212,255,0.2)}50%{border-color:rgba(0,212,255,0.6);box-shadow:0 0 20px rgba(0,212,255,0.1)}}
        .badge-dot{width:6px;height:6px;border-radius:50%;background:var(--cyan);animation:blink 1.5s ease-in-out infinite}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
        .hero h1{font-family:'Orbitron',sans-serif;font-size:clamp(36px,7vw,84px);font-weight:900;line-height:1.05;letter-spacing:-1px;margin-bottom:24px}
        .hero h1 .line1{display:block;color:var(--text)}
        .hero h1 .line2{display:block;background:linear-gradient(135deg,var(--cyan) 0%,var(--purple) 50%,var(--pink) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .hero-sub{font-size:18px;color:var(--muted);max-width:560px;margin:0 auto 40px;line-height:1.7;font-weight:300}
        .hero-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
        .btn-large{padding:14px 32px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;transition:all 0.25s;font-family:'Orbitron',sans-serif;letter-spacing:1px}
        .btn-large.primary{background:linear-gradient(135deg,var(--cyan),var(--purple));border:none;color:#000}
        .btn-large.primary:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,212,255,0.35)}
        .btn-large.secondary{background:none;border:1px solid var(--border);color:var(--text)}
        .btn-large.secondary:hover{border-color:var(--purple);color:var(--purple)}
        .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);border:1px solid var(--border);border-radius:16px;overflow:hidden;margin:60px 0}
        .stat{background:var(--surface);padding:28px;text-align:center;backdrop-filter:blur(10px);transition:background 0.3s}
        .stat:hover{background:rgba(0,212,255,0.05)}
        .stat-num{font-family:'Orbitron',sans-serif;font-size:32px;font-weight:900;background:linear-gradient(135deg,var(--cyan),var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent;display:block}
        .stat-label{font-size:12px;color:var(--muted);margin-top:4px;font-family:'Share Tech Mono',monospace;text-transform:uppercase;letter-spacing:1px}
        .section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:16px}
        .section-title{font-family:'Orbitron',sans-serif;font-size:20px;font-weight:700;color:var(--text)}
        .tabs{display:flex;gap:4px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:12px;padding:4px}
        .tab{padding:8px 18px;border-radius:8px;font-size:13px;cursor:pointer;transition:all 0.2s;font-family:'Share Tech Mono',monospace;border:none;background:none;color:var(--muted);text-transform:capitalize}
        .tab.active{background:linear-gradient(135deg,var(--cyan),var(--purple));color:#000;font-weight:700}
        .tab:not(.active):hover{color:var(--cyan)}
        .agent-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px;margin-bottom:80px}
        .agent-card{background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:16px;padding:24px;cursor:pointer;transition:all 0.3s;position:relative;overflow:hidden;backdrop-filter:blur(10px);animation:fadeUp 0.4s ease both}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .agent-card::before{content:'';position:absolute;inset:0;border-radius:16px;opacity:0;transition:opacity 0.3s;background:radial-gradient(circle at var(--mx,50%) var(--my,50%),rgba(0,212,255,0.08) 0%,transparent 70%)}
        .agent-card:hover{border-color:rgba(0,212,255,0.4);transform:translateY(-4px);box-shadow:0 20px 40px rgba(0,0,0,0.4)}
        .agent-card:hover::before{opacity:1}
        .card-glow{position:absolute;top:-1px;left:-1px;right:-1px;height:2px;border-radius:16px 16px 0 0;opacity:0;transition:opacity 0.3s}
        .agent-card:hover .card-glow{opacity:1}
        .card-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px}
        .agent-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;border:1px solid rgba(255,255,255,0.1)}
        .agent-price{font-family:'Orbitron',monospace;font-size:13px;font-weight:700;color:var(--cyan);background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);padding:4px 10px;border-radius:8px}
        .agent-name{font-family:'Orbitron',sans-serif;font-size:16px;font-weight:700;color:var(--text);margin-bottom:8px;letter-spacing:0.5px}
        .agent-desc{font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:20px}
        .card-footer{display:flex;align-items:center;justify-content:space-between}
        .runs{font-size:12px;color:var(--muted);font-family:'Share Tech Mono',monospace}
        .runs span{color:var(--green)}
        .hire-btn{padding:8px 20px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.2s;font-family:'Orbitron',sans-serif;letter-spacing:1px;border:1px solid rgba(0,212,255,0.3);background:rgba(0,212,255,0.08);color:var(--cyan)}
        .hire-btn:hover{background:linear-gradient(135deg,var(--cyan),var(--purple));color:#000;border-color:transparent;box-shadow:0 4px 15px rgba(0,212,255,0.3)}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.2s ease}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .modal{background:rgba(8,14,28,0.95);border:1px solid rgba(0,212,255,0.25);border-radius:20px;padding:32px;width:100%;max-width:560px;animation:slideUp 0.25s ease;position:relative;overflow:hidden}
        @keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        .modal::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--cyan),var(--purple),transparent)}
        .modal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
        .modal-title{font-family:'Orbitron',sans-serif;font-size:20px;font-weight:900;color:var(--text)}
        .close-btn{background:none;border:1px solid var(--border);color:var(--muted);width:32px;height:32px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;transition:all 0.2s}
        .close-btn:hover{border-color:var(--pink);color:var(--pink)}
        .agent-info-bar{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:24px}
        .task-label{font-size:13px;color:var(--muted);margin-bottom:8px;font-family:'Share Tech Mono',monospace;text-transform:uppercase;letter-spacing:1px}
        .task-input{width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:12px;padding:14px 16px;color:var(--text);font-family:'Share Tech Mono',monospace;font-size:14px;resize:none;height:100px;transition:border-color 0.2s;margin-bottom:16px}
        .task-input:focus{outline:none;border-color:var(--cyan);box-shadow:0 0 0 3px rgba(0,212,255,0.08)}
        .task-input::placeholder{color:#374151}
        .run-btn{width:100%;padding:14px;background:linear-gradient(135deg,var(--cyan),var(--purple));border:none;border-radius:12px;color:#000;font-family:'Orbitron',sans-serif;font-size:14px;font-weight:900;letter-spacing:2px;cursor:pointer;transition:all 0.25s;display:flex;align-items:center;justify-content:center;gap:8px}
        .run-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 25px rgba(0,212,255,0.3)}
        .run-btn:disabled{opacity:0.5;cursor:not-allowed}
        .spinner{width:16px;height:16px;border:2px solid rgba(0,0,0,0.3);border-top-color:#000;border-radius:50%;animation:spin 0.6s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .result-box{margin-top:20px;background:rgba(0,212,255,0.04);border:1px solid rgba(0,212,255,0.2);border-radius:12px;padding:16px;animation:fadeUp 0.3s ease}
        .result-label{font-size:11px;color:var(--cyan);font-family:'Share Tech Mono',monospace;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:6px}
        .result-text{font-size:13px;color:var(--text);line-height:1.7;white-space:pre-wrap;margin-bottom:14px}
        .tx-row{display:flex;flex-direction:column;gap:6px}
        .tx-item{display:flex;align-items:center;gap:8px;font-family:'Share Tech Mono',monospace;font-size:11px}
        .tx-key{color:var(--muted);min-width:70px}
        .tx-val{color:var(--green);word-break:break-all}
        .tutor-fab{position:fixed;bottom:28px;right:28px;z-index:500;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,var(--cyan),var(--purple));border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:28px;box-shadow:0 8px 25px rgba(0,212,255,0.35);transition:all 0.25s;animation:float 3s ease-in-out infinite}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        .tutor-panel{position:fixed;bottom:100px;right:28px;z-index:500;width:340px;background:rgba(8,14,28,0.97);border:1px solid rgba(0,212,255,0.25);border-radius:20px;padding:24px;animation:slideUp 0.25s ease;overflow:hidden}
        .tutor-panel::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--cyan),var(--purple),transparent)}
        .tutor-owl{font-size:40px;text-align:center;margin-bottom:12px}
        .tutor-title{font-family:'Orbitron',sans-serif;font-size:14px;font-weight:700;color:var(--cyan);margin-bottom:10px}
        .tutor-msg{font-size:13px;color:var(--muted);line-height:1.7;margin-bottom:20px}
        .tutor-nav{display:flex;align-items:center;justify-content:space-between}
        .tutor-dots{display:flex;gap:6px}
        .tutor-dot{width:6px;height:6px;border-radius:50%;background:var(--border);transition:background 0.2s}
        .tutor-dot.active{background:var(--cyan)}
        .tutor-next{padding:8px 18px;background:linear-gradient(135deg,var(--cyan),var(--purple));border:none;border-radius:8px;color:#000;font-family:'Orbitron',sans-serif;font-size:11px;font-weight:700;cursor:pointer;transition:all 0.2s;letter-spacing:1px}
        footer{border-top:1px solid var(--border);padding:40px 0;text-align:center}
        .footer-logo{font-family:'Orbitron',sans-serif;font-size:18px;font-weight:900;background:linear-gradient(135deg,var(--cyan),var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
        .footer-text{font-size:12px;color:var(--muted);font-family:'Share Tech Mono',monospace}
        .chain-badges{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:16px;flex-wrap:wrap}
        .chain-badge{font-size:11px;padding:4px 10px;border-radius:6px;font-family:'Share Tech Mono',monospace;border:1px solid var(--border);color:var(--muted)}
        @media(max-width:768px){.stats{grid-template-columns:repeat(2,1fr)}.hero h1{font-size:40px}.hero-sub{font-size:15px}nav{padding:16px}.tutor-panel{width:calc(100vw - 48px);right:24px}}
      `}</style>
      <canvas ref={canvasRef} className="canvas-bg" />
      <div className="gradient-orb orb-1" />
      <div className="gradient-orb orb-2" />

      <nav>
        <div className="logo">AGENT<span>MARKET</span></div>
        <div className="nav-right">
          <button className="btn-ghost">Docs</button>
          <button className="btn-ghost">Bounties</button>
          <button className="btn-primary">Connect Wallet</button>
        </div>
      </nav>

      <div className="app">
        <section className="hero">
          <div className="hero-badge">
            <span className="badge-dot" />
            LIVE ON 0G BLOCKCHAIN · 3 CONTRACTS DEPLOYED
          </div>
          <h1>
            <span className="line1">THE APP STORE FOR</span>
            <span className="line2">AI AGENTS</span>
          </h1>
          <p className="hero-sub">Hire specialized AI agents for any Web3 task. Every job stored on 0G, every output verifiable on-chain.</p>
          <div className="hero-actions">
            <button className="btn-large primary" onClick={() => document.getElementById('agents')?.scrollIntoView({ behavior: 'smooth' })}>Browse Agents</button>
            <button className="btn-large secondary" onClick={() => setTutorOpen(true)}>🦉 How It Works</button>
          </div>
        </section>

        <div className="stats" ref={statsRef}>
          {[{ num: "16,115", label: "Tasks Completed" }, { num: "9", label: "Active Agents" }, { num: "3", label: "Contracts on 0G" }, { num: "$0G", label: "Powered By" }].map((s, i) => (
            <div className="stat" key={i}><span className="stat-num">{s.num}</span><span className="stat-label">{s.label}</span></div>
          ))}
        </div>

        <section id="agents">
          <div className="section-header">
            <div className="section-title">Available Agents</div>
            <div className="tabs">
              {TABS.map(t => <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>)}
            </div>
          </div>
          <div className="agent-grid">
            {filtered.map((agent, i) => (
              <div key={agent.id} className="agent-card" style={{ animationDelay: `${i * 0.07}s` }}
                onMouseMove={e => {
                  const el = e.currentTarget, rect = el.getBoundingClientRect();
                  el.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
                  el.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`);
                }}>
                <div className="card-glow" style={{ background: `linear-gradient(90deg,transparent,${agent.color},transparent)` }} />
                <div className="card-top">
                  <div className="agent-icon" style={{ background: `${agent.color}18`, borderColor: `${agent.color}30` }}>{agent.badge}</div>
                  <span className="agent-price">{agent.price} OG</span>
                </div>
                <div className="agent-name">{agent.name}</div>
                <div className="agent-desc">{agent.desc}</div>
                <div className="card-footer">
                  <span className="runs"><span>{agent.runs.toLocaleString()}</span> runs</span>
                  <button className="hire-btn" onClick={() => { setHiring(agent); setTask(""); setResult(null); }}>HIRE →</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer>
          <div className="footer-logo">AGENTMARKET</div>
          <div className="footer-text">Built for the 0G APAC Hackathon · $150K Prize Pool</div>
          <div className="chain-badges">
            <span className="chain-badge">AgentRegistry: 0xD2663...52bf</span>
            <span className="chain-badge">TaskEscrow: 0x10ddf...EE2</span>
            <span className="chain-badge">BountyBoard: 0xDc62...ac2</span>
          </div>
        </footer>
      </div>

      {hiring && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setHiring(null); setResult(null); } }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Hire Agent</div>
              <button className="close-btn" onClick={() => { setHiring(null); setResult(null); }}>×</button>
            </div>
            <div className="agent-info-bar">
              <div style={{ fontSize: 28 }}>{hiring.badge}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Orbitron', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{hiring.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'Share Tech Mono' }}>{hiring.price} OG · {hiring.runs.toLocaleString()} runs</div>
              </div>
              <span className="agent-price">{hiring.price} OG</span>
            </div>
            <div className="task-label">Describe Your Task</div>
            <textarea className="task-input"
              placeholder={`e.g. "${hiring.category === 'builders' ? 'Audit this ERC20 for reentrancy' : hiring.category === 'creators' ? 'Write a thread about 0G blockchain' : 'Research Solana DeFi protocols'}"`}
              value={task} onChange={e => setTask(e.target.value)} />
            <button className="run-btn" onClick={hire} disabled={loading || !task.trim()}>
              {loading ? <><div className="spinner" /> EXECUTING...</> : <>⚡ RUN AGENT</>}
            </button>
            {result && (
              <div className="result-box">
                <div className="result-label"><span style={{ color: 'var(--green)' }}>●</span> AGENT OUTPUT</div>
                <div className="result-text">{result.output}</div>
                <div className="tx-row">
                  <div className="tx-item"><span className="tx-key">TX_HASH</span><span className="tx-val">{result.txHash?.slice(0, 30)}...</span></div>
                  {result.rootHash && <div className="tx-item"><span className="tx-key">0G_ROOT</span><span className="tx-val">{result.rootHash?.slice(0, 30)}...</span></div>}
                  <div className="tx-item"><span className="tx-key">STORED_ON</span><span className="tx-val">0G Storage · Galileo Testnet</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <button className="tutor-fab" onClick={() => { setTutorOpen(!tutorOpen); setTutorStep(0); }}>🦉</button>

      {tutorOpen && (
        <div className="tutor-panel">
          <div className="tutor-owl">🦉</div>
          <div className="tutor-title">{tutorSteps[tutorStep].title}</div>
          <div className="tutor-msg">{tutorSteps[tutorStep].msg}</div>
          <div className="tutor-nav">
            <div className="tutor-dots">{tutorSteps.map((_, i) => <div key={i} className={`tutor-dot ${i === tutorStep ? 'active' : ''}`} />)}</div>
            <button className="tutor-next" onClick={() => { if (tutorStep < tutorSteps.length - 1) setTutorStep(tutorStep + 1); else setTutorOpen(false); }}>
              {tutorStep < tutorSteps.length - 1 ? 'NEXT →' : 'LFG 🚀'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
