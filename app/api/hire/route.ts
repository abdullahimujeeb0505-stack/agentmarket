import { NextRequest, NextResponse } from "next/server";
import { storeOnZeroG } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const { agentName, task } = await req.json();

  const output = await runAgent(agentName, task);

  const stored = await storeOnZeroG(
    JSON.stringify({ agentName, task, output, timestamp: new Date().toISOString() }),
    `agentmarket-${agentName}-${Date.now()}.json`
  );

  return NextResponse.json({
    success: true,
    output,
    storedOn: "0G Storage",
    rootHash: stored.rootHash,
    txHash: stored.txHash,
    storageUrl: stored.url,
    timestamp: new Date().toISOString(),
  });
}

async function runAgent(agentName: string, task: string) {
  const prompts: Record<string, string> = {
    "Thread Writer": `Write a 5-tweet X thread about: ${task}. Make it punchy for Web3 audience. Number each tweet.`,
    "Research Agent": `Research and summarize: ${task}. Give 5 key facts and insights.`,
    "Contract Auditor": `You are a smart contract security expert. Audit this for vulnerabilities: ${task}`,
    "Alpha Researcher": `Find alpha and opportunities related to: ${task}. Be specific and actionable.`,
    "Community Analyst": `Analyze sentiment and trends around: ${task}. Give a score and summary.`,
    "Wallet Risk Scanner": `Assess risk for this wallet or contract: ${task}. Rate LOW/MEDIUM/HIGH.`,
    "Code Generator": `Generate clean Solidity code for: ${task}`,
    "Travel Planner": `Plan a detailed trip for: ${task}. Include places, budget and tips.`,
    "Data Analyst": `Analyze this and give insights: ${task}`,
  };

  const prompt = prompts[agentName] || `Complete this task: ${task}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Agent completed task.";
}
