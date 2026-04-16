import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { storeOnZeroG } from "@/lib/storage";

const EVM_RPC = "https://evmrpc-testnet.0g.ai";

// AgentRegistry ABI — just the recordExecution function
const REGISTRY_ABI = [
  "function recordExecution(uint256 _agentId, string memory _taskHash, string memory _outputRootHash, string memory _txRef) external",
];

export async function POST(req: NextRequest) {
  try {
    const { agentName, agentId, task, userAddress } = await req.json();

    if (!task?.trim()) {
      return NextResponse.json({ error: "Task is required" }, { status: 400 });
    }

    // ── 1. Run the AI agent ──────────────────────────────────────────────────
    const output = await runAgent(agentName, task);

    // ── 2. Store output on 0G Storage ────────────────────────────────────────
    const payload = JSON.stringify({
      agentName,
      agentId,
      task,
      output,
      user: userAddress ?? "anonymous",
      timestamp: new Date().toISOString(),
      version: "1.0",
    });

    const stored = await storeOnZeroG(
      payload,
      `${agentName.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.json`
    );

    // ── 3. Record execution on AgentRegistry contract ────────────────────────
    let registryTxHash: string | null = null;
    try {
      const registryAddress = process.env.NEXT_PUBLIC_AGENT_REGISTRY;
      const privateKey = process.env.STORAGE_PRIVATE_KEY;

      if (registryAddress && privateKey && agentId) {
        const provider = new ethers.JsonRpcProvider(EVM_RPC);
        const signer = new ethers.Wallet(privateKey, provider);
        const registry = new ethers.Contract(registryAddress, REGISTRY_ABI, signer);

        const taskHash = ethers.keccak256(ethers.toUtf8Bytes(task));

        const tx = await registry.recordExecution(
          agentId,
          taskHash,
          stored.rootHash,
          stored.txHash
        );
        await tx.wait();
        registryTxHash = tx.hash;
      }
    } catch (registryErr) {
      // Non-fatal — storage proof still valid even if registry tx fails
      console.warn("Registry record warning:", registryErr);
    }

    // ── 4. Return full verifiable result ─────────────────────────────────────
    return NextResponse.json({
      success: true,
      output,
      storedOn: "0G Galileo Testnet",
      rootHash: stored.rootHash,
      txHash: stored.txHash,
      registryTx: registryTxHash,
      storageUrl: stored.url,
      explorerUrl: `https://chainscan-galileo.0g.ai/tx/${stored.txHash}`,
      timestamp: new Date().toISOString(),
      verified: stored.success,
    });
  } catch (error) {
    console.error("Hire API error:", error);
    return NextResponse.json(
      { error: "Agent execution failed", details: String(error) },
      { status: 500 }
    );
  }
}

// ── Agent prompt engine ──────────────────────────────────────────────────────

async function runAgent(agentName: string, task: string): Promise<string> {
  const systemPrompts: Record<string, string> = {
    "Contract Auditor": `You are an expert smart contract security auditor specializing in Solidity vulnerabilities. 
Analyze for: reentrancy, integer overflow/underflow, access control issues, front-running, gas griefing, and logic bugs.
Format your response with: SEVERITY LEVEL, VULNERABILITIES FOUND, and RECOMMENDATIONS.`,

    "Wallet Risk Scanner": `You are a blockchain security analyst. Assess wallet and contract risk.
Evaluate: transaction patterns, approval risks, protocol exposure, and rugpull indicators.
Return: RISK LEVEL (LOW/MEDIUM/HIGH/CRITICAL), KEY FINDINGS, and PROTECTIVE ACTIONS.`,

    "Code Generator": `You are an expert Solidity and Web3 developer. Generate clean, production-ready code.
Follow: OpenZeppelin standards, gas optimization patterns, NatSpec documentation.
Include: complete implementation, deployment notes, and security considerations.`,

    "Thread Writer": `You are a viral Web3 content strategist who writes high-engagement X (Twitter) threads.
Style: punchy hooks, data-driven insights, bold claims backed by facts.
Format: numbered tweets (1/) through (5/), each under 280 chars, end with a CTA.`,

    "NFT Copywriter": `You are a Web3 creative copywriter specializing in NFT projects and digital culture.
Write: compelling, atmospheric copy that builds narrative and FOMO.
Tone: mysterious yet accessible, culturally relevant, collector-focused.`,

    "DAO Proposal Writer": `You are a governance specialist who writes clear, compelling DAO proposals.
Structure: Abstract, Motivation, Specification, Implementation, Voting Options.
Style: precise, unbiased, actionable with clear success metrics.`,

    "Research Agent": `You are a deep Web3 analyst and researcher with expertise in DeFi, tokenomics, and protocols.
Analyze: fundamentals, team, tokenomics, competitive moat, risks, and opportunities.
Output: executive summary, 5 key insights, risk matrix, and investment thesis.`,

    "Crypto Tax Helper": `You are a cryptocurrency tax expert familiar with international crypto tax law.
Explain: tax treatment of DeFi yields, staking rewards, NFT trades, and token swaps.
Note: always recommend consulting a licensed tax professional for specific advice.`,

    "Airdrop Hunter": `You are a professional airdrop hunter with deep knowledge of Web3 ecosystems.
Research: current live opportunities, eligibility criteria, and farming strategies.
Output: ranked list of opportunities with estimated value, effort, and action checklist.`,
  };

  const system = systemPrompts[agentName] ??
    "You are a helpful Web3 AI assistant. Complete the user's task thoroughly and accurately.";

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: system },
        { role: "user", content: task },
      ],
      max_tokens: 1500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "Agent completed task.";
}
