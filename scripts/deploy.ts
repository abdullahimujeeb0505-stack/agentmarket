import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Deploying AgentMarket contracts to 0G Galileo Testnet...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "OG\n");

  if (balance === 0n) {
    throw new Error(
      "Deployer has no balance. Get testnet OG from https://faucet.0g.ai"
    );
  }

  // ── 1. AgentRegistry ──────────────────────────────────────────────────────
  console.log("Deploying AgentRegistry...");
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const registry = await AgentRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("✅ AgentRegistry:", registryAddr);

  // ── 2. TaskEscrow ─────────────────────────────────────────────────────────
  console.log("Deploying TaskEscrow...");
  const TaskEscrow = await ethers.getContractFactory("TaskEscrow");
  const escrow = await TaskEscrow.deploy();
  await escrow.waitForDeployment();
  const escrowAddr = await escrow.getAddress();
  console.log("✅ TaskEscrow:", escrowAddr);

  // ── 3. BountyBoard ────────────────────────────────────────────────────────
  console.log("Deploying BountyBoard...");
  const BountyBoard = await ethers.getContractFactory("BountyBoard");
  const bountyBoard = await BountyBoard.deploy();
  await bountyBoard.waitForDeployment();
  const bountyAddr = await bountyBoard.getAddress();
  console.log("✅ BountyBoard:", bountyAddr);

  // ── Seed: Register the 9 default agents on-chain ─────────────────────────
  console.log("\n📋 Registering default agents on AgentRegistry...");

  const agents = [
    { name: "Contract Auditor",   category: "builders", price: ethers.parseEther("0.05") },
    { name: "Wallet Risk Scanner",category: "builders", price: ethers.parseEther("0.03") },
    { name: "Code Generator",     category: "builders", price: ethers.parseEther("0.04") },
    { name: "Thread Writer",      category: "creators", price: ethers.parseEther("0.02") },
    { name: "NFT Copywriter",     category: "creators", price: ethers.parseEther("0.02") },
    { name: "DAO Proposal Writer",category: "creators", price: ethers.parseEther("0.03") },
    { name: "Research Agent",     category: "general",  price: ethers.parseEther("0.04") },
    { name: "Crypto Tax Helper",  category: "general",  price: ethers.parseEther("0.03") },
    { name: "Airdrop Hunter",     category: "general",  price: ethers.parseEther("0.01") },
  ];

  const agentIds: number[] = [];
  for (const agent of agents) {
    // metadataHash is a placeholder — replace with real 0G root after uploading metadata JSON
    const tx = await (registry as any).registerAgent(
      agent.name,
      agent.category,
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      agent.price
    );
    const receipt = await tx.wait();
    const event = receipt?.logs
      ?.map((l: any) => {
        try { return registry.interface.parseLog(l); } catch { return null; }
      })
      .find((e: any) => e?.name === "AgentRegistered");

    const id = event?.args?.id?.toString() ?? "?";
    agentIds.push(Number(id));
    console.log(`  ✅ ${agent.name} → id=${id}`);
  }

  // ── Write deployment addresses to .env.local and deployments.json ─────────
  const deployments = {
    network: "0G Galileo Testnet",
    chainId: 16600,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      AgentRegistry: registryAddr,
      TaskEscrow: escrowAddr,
      BountyBoard: bountyAddr,
    },
    agentIds,
    explorerBase: "https://chainscan-galileo.0g.ai",
  };

  fs.writeFileSync(
    path.join(__dirname, "../deployments.json"),
    JSON.stringify(deployments, null, 2)
  );
  console.log("\n📄 Saved deployments.json");

  // Append to .env.local
  const envLines = [
    `\n# Deployed ${new Date().toISOString()}`,
    `NEXT_PUBLIC_AGENT_REGISTRY=${registryAddr}`,
    `NEXT_PUBLIC_TASK_ESCROW=${escrowAddr}`,
    `NEXT_PUBLIC_BOUNTY_BOARD=${bountyAddr}`,
  ].join("\n");

  fs.appendFileSync(path.join(__dirname, "../.env.local"), envLines);
  console.log("📝 Contract addresses appended to .env.local\n");

  // ── Final summary ──────────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════════");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  AgentRegistry : ${registryAddr}`);
  console.log(`  TaskEscrow    : ${escrowAddr}`);
  console.log(`  BountyBoard   : ${bountyAddr}`);
  console.log(`  Explorer      : https://chainscan-galileo.0g.ai`);
  console.log("═══════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
