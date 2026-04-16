"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { parseEther, formatEther } from "viem";
import { WalletButton } from "./components/WalletButton";

// ── Contract config ──────────────────────────────────────────────────────────
const TASK_ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_TASK_ESCROW ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
const AGENT_REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_AGENT_REGISTRY ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;

const TASK_ESCROW_ABI = [
  {
    name: "createTask",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "_agentId", type: "uint256" },
      { name: "_agentOwner", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const REGISTRY_ABI = [
  {
    name: "agentCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ── Agents ───────────────────────────────────────────────────────────────────
const PLATFORM_WALLET = "0x0000000000000000000000000000000000000001" as `0x${string}`; // Replace with your deployer address after deploy

const agents = [
  { id: 1, name: "Contract Auditor",    desc: "Scans Solidity contracts for vulnerabilities, reentrancy, and exploits.", price: "0.05", category: "builders", runs: 892,  badge: "🔐", color: "#ff6b35" },
  { id: 2, name: "Wallet Risk Scanner", desc: "Analyzes wallet history, approvals, and on-chain risk exposure.",         price: "0.03", category: "builders", runs: 1204, badge: "🛡️", color: "#00d4ff" },
  { id: 3, name: "Code Generator",      desc: "Generates Solidity boilerplate, ERC20/721 contracts and deployment scripts.", price: "0.04", category: "builders", runs: 670, badge: "⚙️", color: "#a855f7" },
  { id: 4, name: "Thread Writer",       desc: "Researches Web3 topics and writes viral X threads with hooks.",           price: "0.02", category: "creators", runs: 2341, badge: "✍️", color: "#f0c040" },
  { id: 5, name: "NFT Copywriter",      desc: "Writes mint-day descriptions, Discord announcements, and lore.",          price: "0.02", category: "creators", runs: 987,  badge: "🎨", color: "#ff4fa3" },
  { id: 6, name: "DAO Proposal Writer", desc: "Structures governance proposals with rationale, quorum, and voting options.", price: "0.03", category: "creators", runs: 456, badge: "📜", color: "#22d3a5" },
  { id: 7, name: "Research Agent",      desc: "Deep-dives any Web3 protocol — tokenomics, team, risks, moat.",           price: "0.04", category: "general",  runs: 3102, badge: "🔭", color: "#60a5fa" },
  { id: 8, name: "Crypto Tax Helper",   desc: "Explains tax implications of DeFi, staking, and NFT trades.",             price: "0.03", category: "general",  runs: 789,  badge: "📊", color: "#fb923c" },
  { id: 9, name: "Airdrop Hunter",      desc: "Identifies live airdrop opportunities and checklists to qualify.",         price: "0.01", category: "general",  runs: 5670, badge: "🪂", color: "#4ade80" },
];

const TABS = ["all", "builders", "creators", "general"];

type ExecutionStage = "idle" | "paying" | "confirming" | "executing" | "storing" | "complete" | "error";

interface HireResult {
  output: string;
  txHash: string;
  rootHash?: string;
  registryTx?: string;
  explorerUrl?: string;
  verified?: boolean;
}

// ── Typewriter hook ──────────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 8) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    if (!text) return;
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return displayed;
}

// ── Main component ───────────────────────────────────────────────────────────
export default function AgentMarket() {
  const [tab, setTab] = useState("all");
  const [hiring, setHiring] = useState<typeof agents[0] | null>(null);
  const [task, setTask] = useState("");
  const [stage, setStage] = useState<ExecutionStage>("idle");
  const [stageMsg, setStageMsg] = useState("");
  const [result, setResult] = useState<HireResult | null>(null);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [tutorStep, setTutorStep] = useState(0);
  const [paymentTxHash, setPaymentTxHash] = useState<`0x${string}` | undefined>();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  // ── Wallet state ────────────────────────────────────────────────────────────
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { data: balance } = useBalance({ address, watch: true } as any);

  // ── Contract writes ─────────────────────────────────────────────────────────
  const { writeContractAsync } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({
    hash: paymentTxHash,
  });

  // ── Live stats from contract ────────────────────────────────────────────────
  const { data: onChainAgentCount } = useReadContract({
    address: AGENT_REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "agentCount",
  });

  const filtered = tab === "all" ? agents : agents.filter(a => a.category === tab);
  const typewriterOutput = useTypewriter(result?.output ?? "", 6);

  // ── Balance check ───────────────────────────────────────────────────────────
  const getBalanceStatus = useCallback((agent: typeof agents[0]) => {
    if (!isConnected) return { ok: false, reason: "not_connected" };
    if (!balance) return { ok: true, reason: "ok" }; // unknown, allow attempt
    const required = parseEther(agent.price);
    const available = balance.value;
    if (available < required) {
      const shortfall = formatEther(required - available);
      return { ok: false, reason: "insufficient", shortfall };
    }
    return { ok: true, reason: "ok" };
  }, [isConnected, balance]);

  // ── Canvas particle background ──────────────────────────────────────────────
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
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(0,212,255,${0.08 * (1 - dist / 120)})`;
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

  // ── Hire flow ───────────────────────────────────────────────────────────────
  const hire = async () => {
    if (!task.trim() || !hiring) return;

    // Guard: must be connected
    if (!isConnected || !address) {
      openConnectModal?.();
      return;
    }

    // Guard: balance check
    const balStatus = getBalanceStatus(hiring);
    if (!balStatus.ok && balStatus.reason === "insufficient") {
      setStage("error");
      setStageMsg(`Insufficient balance. You need ${hiring.price} OG but are short ${(balStatus as any).shortfall} OG. Get testnet OG at faucet.0g.ai`);
      return;
    }

    setResult(null);
    setStage("paying");
    setStageMsg(`Sending ${hiring.price} OG to TaskEscrow...`);

    try {
      // ── Step 1: On-chain payment via TaskEscrow ──────────────────────────
      let taskId: string | null = null;
      try {
        const txHash = await writeContractAsync({
          address: TASK_ESCROW_ADDRESS,
          abi: TASK_ESCROW_ABI,
          functionName: "createTask",
          args: [BigInt(hiring.id), PLATFORM_WALLET],
          value: parseEther(hiring.price),
        });
        setPaymentTxHash(txHash);
        setStage("confirming");
        setStageMsg("Confirming payment on 0G Chain...");
        taskId = txHash;
      } catch (payErr: any) {
        // If contracts not deployed yet, skip payment but continue with AI
        console.warn("Payment skipped (contracts not deployed):", payErr?.message);
        setStage("executing");
        setStageMsg("Payment skipped — running agent...");
      }

      // ── Step 2: Execute AI agent ─────────────────────────────────────────
      setStage("executing");
      setStageMsg(`${hiring.name} is working on your task...`);

      const res = await fetch("/api/hire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentName: hiring.name,
          agentId: hiring.id,
          task,
          userAddress: address,
          taskId,
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      // ── Step 3: Storing on 0G ────────────────────────────────────────────
      setStage("storing");
      setStageMsg("Storing output on 0G Storage...");

      const data = await res.json();

      if (!data.success && !data.output) {
        throw new Error(data.error ?? "Agent failed");
      }

      // ── Step 4: Complete ─────────────────────────────────────────────────
      setStage("complete");
      setStageMsg("Done! Output stored on 0G permanently.");
      setResult({
        output: data.output,
        txHash: data.txHash,
        rootHash: data.rootHash,
        registryTx: data.registryTx,
        explorerUrl: data.explorerUrl,
        verified: data.verified,
      });

    } catch (err: any) {
      setStage("error");
      const msg = err?.message ?? String(err);
      if (msg.includes("User rejected") || msg.includes("user rejected")) {
        setStageMsg("Transaction cancelled by user.");
      } else if (msg.includes("insufficient funds")) {
        setStageMsg(`Insufficient OG balance. You need ${hiring.price} OG. Get testnet OG at faucet.0g.ai`);
      } else {
        setStageMsg(`Error: ${msg.slice(0, 120)}`);
      }
    }
  };

  const closeModal = () => {
    setHiring(null);
    setResult(null);
    setStage("idle");
    setStageMsg("");
    setPaymentTxHash(undefined);
    setTask("");
  };

  const openHire = (agent: typeof agents[0]) => {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }
    setHiring(agent);
    setTask("");
    setResult(null);
    setStage("idle");
    setStageMsg("");
  };

  const isRunning = ["paying", "confirming", "executing", "storing"].includes(stage);

  // ── Stage UI ────────────────────────────────────────────────────────────────
  const stageConfig: Record<ExecutionStage, { icon: string; color: string; label: string }> = {
    idle:       { icon: "", color: "var(--muted)", label: "" },
    paying:     { icon: "💸", color: "#f0c040",   label: "PAYING" },
    confirming: { icon: "⏳", color: "#a855f7",   label: "CONFIRMING" },
    executing:  { icon: "⚡", color: "var(--cyan)", label: "EXECUTING" },
    storing:    { icon: "📦", color: "#22d3a5",   label: "STORING ON 0G" },
    complete:   { icon: "✅", color: "#4ade80",   label: "COMPLETE" },
    error:      { icon: "❌", color: "#ff4fa3",   label: "ERROR" },
  };

  // ── Tutor steps ─────────────────────────────────────────────────────────────
  const tutorSteps = [
    { title: "Welcome to AgentMarket 🦉", msg: "I'm Ori — your cyberpunk owl guide. AgentMarket is the App Store for AI Agents, powered by 0G blockchain!", action: "walk",      stickPos: null,          bubble: "Hello!" },
    { title: "Connect Your Wallet 🔗",    msg: "First, connect your wallet to 0G Galileo Testnet. Get free OG from faucet.0g.ai to pay for agents.", action: "point",     stickPos: "stick-up",    bubble: "Connect!" },
    { title: "Pick Your Agent 🎯",        msg: "Browse agents by category — Builders, Creators, General. Each run costs a tiny amount of OG.", action: "point",     stickPos: "stick-down",  bubble: "Look here!" },
    { title: "Hire & Run 💸",            msg: "Click HIRE → your wallet signs a payment to TaskEscrow → agent runs → output stored on 0G Storage.", action: "point",     stickPos: "stick-left",  bubble: "Click HIRE!" },
    { title: "On-Chain Proof 🔗",         msg: "Every result gets a Merkle root hash on 0G — cryptographically verifiable forever. You own your data.", action: "think",     stickPos: null,          bubble: "Thinking..." },
    { title: "You're Ready! 🚀",          msg: "That's it! Go hire your first agent. The future of work is autonomous. LFG!", action: "celebrate", stickPos: "stick-up",  bubble: "LFG!! 🚀" },
  ];

  const contractsDeployed = TASK_ESCROW_ADDRESS !== "0x0000000000000000000000000000000000000000";

  // ── Render ──────────────────────────────────────────────────────────────────
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
        .insufficient-badge{font-size:10px;padding:2px 8px;border-radius:4px;background:rgba(255,79,163,0.15);border:1px solid rgba(255,79,163,0.3);color:var(--pink);font-family:'Share Tech Mono',monospace;margin-top:6px;display:inline-block}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.2s ease}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .modal{background:rgba(8,14,28,0.95);border:1px solid rgba(0,212,255,0.25);border-radius:20px;padding:32px;width:100%;max-width:580px;animation:slideUp 0.25s ease;position:relative;overflow:hidden;max-height:90vh;overflow-y:auto}
        @keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        .modal::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--cyan),var(--purple),transparent)}
        .modal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
        .modal-title{font-family:'Orbitron',sans-serif;font-size:20px;font-weight:900;color:var(--text)}
        .close-btn{background:none;border:1px solid var(--border);color:var(--muted);width:32px;height:32px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;transition:all 0.2s;flex-shrink:0}
        .close-btn:hover{border-color:var(--pink);color:var(--pink)}
        .agent-info-bar{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:16px}
        .balance-bar{display:flex;align-items:center;justify-content:space-between;background:rgba(0,212,255,0.04);border:1px solid rgba(0,212,255,0.12);border-radius:10px;padding:10px 14px;margin-bottom:16px;font-family:'Share Tech Mono',monospace;font-size:12px}
        .balance-ok{color:var(--green)}
        .balance-low{color:var(--pink)}
        .balance-label{color:var(--muted)}
        .task-label{font-size:13px;color:var(--muted);margin-bottom:8px;font-family:'Share Tech Mono',monospace;text-transform:uppercase;letter-spacing:1px}
        .task-input{width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:12px;padding:14px 16px;color:var(--text);font-family:'Share Tech Mono',monospace;font-size:14px;resize:none;height:100px;transition:border-color 0.2s;margin-bottom:16px}
        .task-input:focus{outline:none;border-color:var(--cyan);box-shadow:0 0 0 3px rgba(0,212,255,0.08)}
        .task-input::placeholder{color:#374151}
        .task-input:disabled{opacity:0.5}
        .run-btn{width:100%;padding:14px;background:linear-gradient(135deg,var(--cyan),var(--purple));border:none;border-radius:12px;color:#000;font-family:'Orbitron',sans-serif;font-size:14px;font-weight:900;letter-spacing:2px;cursor:pointer;transition:all 0.25s;display:flex;align-items:center;justify-content:center;gap:8px}
        .run-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 25px rgba(0,212,255,0.3)}
        .run-btn:disabled{opacity:0.5;cursor:not-allowed}
        .run-btn.insufficient{background:linear-gradient(135deg,#ff4fa3,#ff6b35)}
        .spinner{width:16px;height:16px;border:2px solid rgba(0,0,0,0.3);border-top-color:#000;border-radius:50%;animation:spin 0.6s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .stage-bar{margin-top:16px;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:10px}
        .stage-icon{font-size:18px}
        .stage-info{flex:1}
        .stage-label{font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:2px}
        .stage-msg{font-size:12px;color:var(--muted)}
        .stage-pulse{width:8px;height:8px;border-radius:50%;flex-shrink:0;animation:blink 1s ease-in-out infinite}
        .progress-steps{display:flex;gap:4px;margin-top:12px}
        .progress-step{flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,0.06);transition:background 0.4s}
        .progress-step.done{background:var(--cyan)}
        .progress-step.active{background:linear-gradient(90deg,var(--cyan),var(--purple));animation:shimmer 1s ease-in-out infinite}
        @keyframes shimmer{0%,100%{opacity:1}50%{opacity:0.5}}
        .result-box{margin-top:16px;background:rgba(0,212,255,0.04);border:1px solid rgba(0,212,255,0.2);border-radius:12px;padding:16px;animation:fadeUp 0.3s ease}
        .result-label{font-size:11px;color:var(--cyan);font-family:'Share Tech Mono',monospace;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:6px}
        .result-text{font-size:13px;color:var(--text);line-height:1.7;white-space:pre-wrap;margin-bottom:14px;max-height:300px;overflow-y:auto}
        .tx-row{display:flex;flex-direction:column;gap:6px}
        .tx-item{display:flex;align-items:flex-start;gap:8px;font-family:'Share Tech Mono',monospace;font-size:11px}
        .tx-key{color:var(--muted);min-width:80px;flex-shrink:0}
        .tx-val{color:var(--green);word-break:break-all}
        .tx-link{color:var(--cyan);text-decoration:none;word-break:break-all}
        .tx-link:hover{text-decoration:underline}
        .verified-badge{display:inline-flex;align-items:center;gap:4px;background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.3);color:#4ade80;padding:3px 8px;border-radius:6px;font-size:10px;font-family:'Share Tech Mono',monospace;letter-spacing:1px}
        .error-box{margin-top:16px;background:rgba(255,79,163,0.06);border:1px solid rgba(255,79,163,0.25);border-radius:12px;padding:14px 16px;font-size:13px;color:var(--pink);font-family:'Share Tech Mono',monospace;line-height:1.6}
        .faucet-link{color:var(--cyan);text-decoration:none}
        .faucet-link:hover{text-decoration:underline}
        .tutor-fab{position:fixed;bottom:28px;right:28px;z-index:500;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,var(--cyan),var(--purple));border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:28px;box-shadow:0 8px 25px rgba(0,212,255,0.35);transition:all 0.25s;animation:float 3s ease-in-out infinite}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        .tutor-panel{position:fixed;bottom:100px;right:28px;z-index:500;width:340px;background:rgba(8,14,28,0.97);border:1px solid rgba(0,212,255,0.25);border-radius:20px;padding:24px;animation:slideUp 0.25s ease;overflow:hidden}
        .tutor-panel::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--cyan),var(--purple),transparent)}
        .tutor-title{font-family:'Orbitron',sans-serif;font-size:14px;font-weight:700;color:var(--cyan);margin-bottom:10px}
        .tutor-msg{font-size:13px;color:var(--muted);line-height:1.7;margin-bottom:20px}
        .tutor-nav{display:flex;align-items:center;justify-content:space-between}
        .tutor-dots{display:flex;gap:6px}
        .tutor-dot{width:6px;height:6px;border-radius:50%;background:var(--border);transition:background 0.2s}
        .tutor-dot.active{background:var(--cyan)}
        .tutor-next{padding:8px 18px;background:linear-gradient(135deg,var(--cyan),var(--purple));border:none;border-radius:8px;color:#000;font-family:'Orbitron',sans-serif;font-size:11px;font-weight:700;cursor:pointer;letter-spacing:1px}
        footer{border-top:1px solid var(--border);padding:40px 0;text-align:center}
        .footer-logo{font-family:'Orbitron',sans-serif;font-size:18px;font-weight:900;background:linear-gradient(135deg,var(--cyan),var(--purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
        .footer-text{font-size:12px;color:var(--muted);font-family:'Share Tech Mono',monospace}
        .chain-badges{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:16px;flex-wrap:wrap}
        .chain-badge{font-size:11px;padding:4px 10px;border-radius:6px;font-family:'Share Tech Mono',monospace;border:1px solid var(--border);color:var(--muted);text-decoration:none;transition:all 0.2s}
        .chain-badge:hover{border-color:var(--cyan);color:var(--cyan)}
        @keyframes owlWalk{0%{transform:translateX(0) scaleX(1)}25%{transform:translateX(30px) scaleX(1)}50%{transform:translateX(30px) scaleX(-1)}75%{transform:translateX(0) scaleX(-1)}100%{transform:translateX(0) scaleX(1)}}
        @keyframes owlPoint{0%,100%{transform:rotate(0deg) translateY(0)}30%{transform:rotate(-20deg) translateY(-8px)}60%{transform:rotate(15deg) translateY(-4px)}}
        @keyframes owlCelebrate{0%,100%{transform:translateY(0) rotate(0)}25%{transform:translateY(-15px) rotate(-10deg)}50%{transform:translateY(-20px) rotate(10deg)}75%{transform:translateY(-10px) rotate(-5deg)}}
        @keyframes owlThink{0%,100%{transform:rotate(0deg)}50%{transform:rotate(15deg)}}
        .owl-container{position:relative;height:90px;display:flex;align-items:center;justify-content:center;margin-bottom:8px;overflow:visible}
        .owl-body{font-size:48px;display:inline-block;position:relative;cursor:pointer;filter:drop-shadow(0 0 12px rgba(0,212,255,0.6))}
        .owl-body.walk{animation:owlWalk 2s ease-in-out infinite}
        .owl-body.point{animation:owlPoint 1s ease-in-out infinite}
        .owl-body.celebrate{animation:owlCelebrate 0.6s ease-in-out infinite}
        .owl-body.think{animation:owlThink 1.5s ease-in-out infinite}
        .speech-bubble{position:absolute;background:rgba(0,212,255,0.15);border:1px solid rgba(0,212,255,0.4);border-radius:12px;padding:4px 10px;font-size:11px;color:var(--cyan);font-family:'Share Tech Mono',monospace;white-space:nowrap;top:-28px;left:50%;transform:translateX(-50%);animation:blink 2s ease-in-out infinite}
        @media(max-width:768px){.stats{grid-template-columns:repeat(2,1fr)}.hero h1{font-size:40px}.hero-sub{font-size:15px}nav{padding:16px}.tutor-panel{width:calc(100vw - 48px);right:24px}.modal{padding:20px}}
      `}</style>

      <canvas ref={canvasRef} className="canvas-bg" />
      <div className="gradient-orb orb-1" />
      <div className="gradient-orb orb-2" />

      {/* NAV */}
      <nav>
        <div className="logo">AGENT<span>MARKET</span></div>
        <div className="nav-right">
          <button className="btn-ghost">Docs</button>
          <button className="btn-ghost" onClick={() => setTutorOpen(true)}>🦉 Guide</button>
          <WalletButton />
        </div>
      </nav>

      <div className="app">
        {/* HERO */}
        <section className="hero">
          <div className="hero-badge">
            <span className="badge-dot" />
            {contractsDeployed ? "LIVE ON 0G BLOCKCHAIN · 3 CONTRACTS DEPLOYED" : "DEPLOYING TO 0G BLOCKCHAIN"}
          </div>
          <h1>
            <span className="line1">THE APP STORE FOR</span>
            <span className="line2">AI AGENTS</span>
          </h1>
          <p className="hero-sub">
            Hire specialized AI agents for any Web3 task. Every job stored on 0G, every output verifiable on-chain.
          </p>
          <div className="hero-actions">
            <button className="btn-large primary" onClick={() => document.getElementById("agents")?.scrollIntoView({ behavior: "smooth" })}>
              Browse Agents
            </button>
            <button className="btn-large secondary" onClick={() => { setTutorOpen(true); setTutorStep(0); }}>
              🦉 How It Works
            </button>
          </div>
        </section>

        {/* STATS */}
        <div className="stats">
          {[
            { num: "16,115+", label: "Tasks Completed" },
            { num: onChainAgentCount ? String(onChainAgentCount) : "9", label: "Agents On-Chain" },
            { num: "3", label: "Contracts on 0G" },
            { num: balance ? `${parseFloat(formatEther(balance.value)).toFixed(3)} OG` : "0G", label: isConnected ? "Your Balance" : "Powered By" },
          ].map((s, i) => (
            <div className="stat" key={i}>
              <span className="stat-num">{s.num}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* AGENTS */}
        <section id="agents">
          <div className="section-header">
            <div className="section-title">Available Agents</div>
            <div className="tabs">
              {TABS.map(t => (
                <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>
              ))}
            </div>
          </div>

          <div className="agent-grid">
            {filtered.map((agent, i) => {
              const bs = getBalanceStatus(agent);
              return (
                <div
                  key={agent.id}
                  className="agent-card"
                  style={{ animationDelay: `${i * 0.07}s` }}
                  onMouseMove={e => {
                    const el = e.currentTarget, rect = el.getBoundingClientRect();
                    el.style.setProperty("--mx", `${((e.clientX - rect.left) / rect.width) * 100}%`);
                    el.style.setProperty("--my", `${((e.clientY - rect.top) / rect.height) * 100}%`);
                  }}
                >
                  <div className="card-glow" style={{ background: `linear-gradient(90deg,transparent,${agent.color},transparent)` }} />
                  <div className="card-top">
                    <div className="agent-icon" style={{ background: `${agent.color}18`, borderColor: `${agent.color}30` }}>{agent.badge}</div>
                    <span className="agent-price">{agent.price} OG</span>
                  </div>
                  <div className="agent-name">{agent.name}</div>
                  <div className="agent-desc">{agent.desc}</div>
                  <div className="card-footer">
                    <div>
                      <span className="runs"><span>{agent.runs.toLocaleString()}</span> runs</span>
                      {isConnected && !bs.ok && bs.reason === "insufficient" && (
                        <div className="insufficient-badge">⚠ Insufficient OG</div>
                      )}
                    </div>
                    <button
                      className="hire-btn"
                      onClick={() => openHire(agent)}
                    >
                      {!isConnected ? "CONNECT →" : "HIRE →"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* FOOTER */}
        <footer>
          <div className="footer-logo">AGENTMARKET</div>
          <div className="footer-text">Built for the 0G APAC Hackathon · $150K Prize Pool</div>
          <div className="chain-badges">
            {process.env.NEXT_PUBLIC_AGENT_REGISTRY && (
              <a className="chain-badge" href={`https://chainscan-galileo.0g.ai/address/${process.env.NEXT_PUBLIC_AGENT_REGISTRY}`} target="_blank" rel="noopener noreferrer">
                AgentRegistry: {process.env.NEXT_PUBLIC_AGENT_REGISTRY?.slice(0, 8)}...
              </a>
            )}
            {process.env.NEXT_PUBLIC_TASK_ESCROW && (
              <a className="chain-badge" href={`https://chainscan-galileo.0g.ai/address/${process.env.NEXT_PUBLIC_TASK_ESCROW}`} target="_blank" rel="noopener noreferrer">
                TaskEscrow: {process.env.NEXT_PUBLIC_TASK_ESCROW?.slice(0, 8)}...
              </a>
            )}
            {process.env.NEXT_PUBLIC_BOUNTY_BOARD && (
              <a className="chain-badge" href={`https://chainscan-galileo.0g.ai/address/${process.env.NEXT_PUBLIC_BOUNTY_BOARD}`} target="_blank" rel="noopener noreferrer">
                BountyBoard: {process.env.NEXT_PUBLIC_BOUNTY_BOARD?.slice(0, 8)}...
              </a>
            )}
            {!contractsDeployed && (
              <span className="chain-badge">Deploy contracts to see addresses</span>
            )}
          </div>
        </footer>
      </div>

      {/* HIRE MODAL */}
      {hiring && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Hire Agent</div>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>

            {/* Agent info */}
            <div className="agent-info-bar">
              <div style={{ fontSize: 28 }}>{hiring.badge}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "Orbitron", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{hiring.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "Share Tech Mono" }}>{hiring.price} OG · {hiring.runs.toLocaleString()} runs</div>
              </div>
              <span className="agent-price">{hiring.price} OG</span>
            </div>

            {/* Live balance display */}
            {isConnected && balance && (() => {
              const required = parseEther(hiring.price);
              const available = balance.value;
              const hasFunds = available >= required;
              return (
                <div className="balance-bar">
                  <span className="balance-label">YOUR BALANCE</span>
                  <span className={hasFunds ? "balance-ok" : "balance-low"}>
                    {parseFloat(formatEther(available)).toFixed(4)} OG
                    {hasFunds ? " ✓" : ` (need ${hiring.price} OG)`}
                  </span>
                </div>
              );
            })()}

            {/* Task input */}
            <div className="task-label">Describe Your Task</div>
            <textarea
              className="task-input"
              placeholder={`e.g. "${hiring.category === "builders" ? "Audit this ERC20 for reentrancy: [paste code]" : hiring.category === "creators" ? "Write a thread about why 0G is the future of AI storage" : "Research the top 3 DeFi protocols on 0G chain"}"`}
              value={task}
              onChange={e => setTask(e.target.value)}
              disabled={isRunning}
            />

            {/* Run button */}
            {(() => {
              const bs = getBalanceStatus(hiring);
              const noFunds = isConnected && !bs.ok && bs.reason === "insufficient";
              return (
                <button
                  className={`run-btn ${noFunds ? "insufficient" : ""}`}
                  onClick={noFunds ? () => window.open("https://faucet.0g.ai", "_blank") : hire}
                  disabled={isRunning || (!noFunds && !task.trim())}
                >
                  {isRunning ? (
                    <><div className="spinner" /> {stageConfig[stage].label}...</>
                  ) : noFunds ? (
                    <>⚠️ GET OG FROM FAUCET</>
                  ) : (
                    <>⚡ RUN AGENT — {hiring.price} OG</>
                  )}
                </button>
              );
            })()}

            {/* Execution stage tracker */}
            {stage !== "idle" && stage !== "error" && (
              <div className="stage-bar">
                <span className="stage-icon">{stageConfig[stage].icon}</span>
                <div className="stage-info">
                  <div className="stage-label" style={{ color: stageConfig[stage].color }}>{stageConfig[stage].label}</div>
                  <div className="stage-msg">{stageMsg}</div>
                </div>
                {isRunning && <div className="stage-pulse" style={{ background: stageConfig[stage].color }} />}
              </div>
            )}

            {/* Progress bar */}
            {stage !== "idle" && (
              <div className="progress-steps">
                {["paying", "confirming", "executing", "storing", "complete"].map((s, i) => {
                  const stageOrder = ["paying", "confirming", "executing", "storing", "complete", "error"];
                  const currentIdx = stageOrder.indexOf(stage);
                  const stepIdx = i;
                  return (
                    <div
                      key={s}
                      className={`progress-step ${stepIdx < currentIdx ? "done" : stepIdx === currentIdx && stage !== "error" ? "active" : ""}`}
                    />
                  );
                })}
              </div>
            )}

            {/* Error */}
            {stage === "error" && (
              <div className="error-box">
                ❌ {stageMsg}
                {stageMsg.includes("faucet") && (
                  <><br /><br /><a href="https://faucet.0g.ai" target="_blank" rel="noopener noreferrer" className="faucet-link">→ Get testnet OG at faucet.0g.ai</a></>
                )}
              </div>
            )}

            {/* Result */}
            {result && stage === "complete" && (
              <div className="result-box">
                <div className="result-label">
                  <span style={{ color: "var(--green)" }}>●</span> AGENT OUTPUT
                  {result.verified && <span className="verified-badge">✓ 0G VERIFIED</span>}
                </div>
                <div className="result-text">{typewriterOutput}</div>
                <div className="tx-row">
                  <div className="tx-item">
                    <span className="tx-key">0G_ROOT</span>
                    <span className="tx-val">{result.rootHash?.slice(0, 34)}...</span>
                  </div>
                  <div className="tx-item">
                    <span className="tx-key">TX_HASH</span>
                    <a
                      href={result.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tx-link"
                    >
                      {result.txHash?.slice(0, 30)}... ↗
                    </a>
                  </div>
                  {result.registryTx && (
                    <div className="tx-item">
                      <span className="tx-key">REGISTRY</span>
                      <a
                        href={`https://chainscan-galileo.0g.ai/tx/${result.registryTx}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tx-link"
                      >
                        {result.registryTx.slice(0, 30)}... ↗
                      </a>
                    </div>
                  )}
                  <div className="tx-item">
                    <span className="tx-key">NETWORK</span>
                    <span className="tx-val">0G Storage · Galileo Testnet</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TUTOR BOT */}
      <button className="tutor-fab" onClick={() => { setTutorOpen(!tutorOpen); setTutorStep(0); }}>🦉</button>

      {tutorOpen && (() => {
        const s = tutorSteps[tutorStep];
        return (
          <div className="tutor-panel">
            <div className="owl-container">
              <div className={`owl-body ${s.action}`}>
                {s.bubble && <div className="speech-bubble">{s.bubble}</div>}
                🦉
              </div>
            </div>
            <div className="tutor-title">{s.title}</div>
            <div className="tutor-msg">{s.msg}</div>
            <div className="tutor-nav">
              <div className="tutor-dots">
                {tutorSteps.map((_, i) => (
                  <div key={i} className={`tutor-dot ${i === tutorStep ? "active" : ""}`} />
                ))}
              </div>
              <button
                className="tutor-next"
                onClick={() => { if (tutorStep < tutorSteps.length - 1) setTutorStep(tutorStep + 1); else setTutorOpen(false); }}
              >
                {tutorStep < tutorSteps.length - 1 ? "NEXT →" : "LFG 🚀"}
              </button>
            </div>
          </div>
        );
      })()}
    </>
  );
}
