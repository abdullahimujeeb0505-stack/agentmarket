import { ethers } from "hardhat";

async function main() {
  console.log("Deploying to 0G testnet...");

  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const registry = await AgentRegistry.deploy();
  await registry.waitForDeployment();
  console.log("AgentRegistry:", await registry.getAddress());

  const TaskEscrow = await ethers.getContractFactory("TaskEscrow");
  const escrow = await TaskEscrow.deploy();
  await escrow.waitForDeployment();
  console.log("TaskEscrow:", await escrow.getAddress());

  const BountyBoard = await ethers.getContractFactory("BountyBoard");
  const bounty = await BountyBoard.deploy();
  await bounty.waitForDeployment();
  console.log("BountyBoard:", await bounty.getAddress());

  console.log("All contracts deployed!");
}

main().catch(console.error);
