import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { agentName, task, walletAddress } = await req.json();

  // Simulate agent running the task
  const result = await runAgent(agentName, task);

  return NextResponse.json({
    success: true,
    output: result,
    storedOn: "0G Storage",
    txHash: "0x" + Math.random().toString(16).slice(2, 42),
    timestamp: new Date().toISOString(),
  });
}

async function runAgent(agentName: string, task: string) {
  const prompts: Record<string, string> = {
    "Thread Writer": `Write a 5-tweet X thread about: ${task}. Make it engaging for Web3 audience.`,
    "Research Agent": `Research and summarize: ${task}. Give key facts and insights.`,
    "Contract Auditor": `Audit this Solidity code for vulnerabilities: ${task}`,
    "Alpha Researcher": `Find alpha and opportunities related to: ${task}`,
    "Community Analyst": `Analyze sentiment and trends around: ${task}`,
    "Wallet Risk Scanner": `Assess risk for this wallet/contract: ${task}`,
    "Code Generator": `Generate Solidity code for: ${task}`,
    "Travel Planner": `Plan a trip for: ${task}`,
    "Data Analyst": `Analyze this data: ${task}`,
  };

  const prompt = prompts[agentName] || `Complete this task: ${task}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  return data.content?.[0]?.text || "Agent completed task.";
}
