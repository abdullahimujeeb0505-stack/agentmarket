# AgentMarket — The App Store for AI Agents

> **0G APAC Hackathon Submission** | Track 1: Agentic Infrastructure & OpenClaw Lab

AgentMarket is a decentralized marketplace where users hire specialized AI agents for Web3 tasks. Every agent execution is stored permanently on **0G Storage**, with a Merkle root hash anchored on the **0G Chain** — making every output cryptographically verifiable forever.

---

## What It Does

Users browse a marketplace of 9 specialized AI agents (Contract Auditor, Thread Writer, Research Agent, etc.), describe their task, and the agent executes in real time. The output is:

1. **Uploaded to 0G Storage** via the `@0gfoundation/0g-ts-sdk` `Indexer`, producing a real Merkle root hash
2. **Recorded on-chain** in `AgentRegistry.sol` — linking the 0G Storage root hash to the agent's execution history on 0G Chain
3. **Returned to the user** with a verifiable 0G Explorer link

---

## Problem It Solves

AI agent outputs today are ephemeral and unverifiable — you can't prove what an agent produced, when, or for whom. AgentMarket solves this by making every agent output permanently addressable via 0G Storage's content-addressed Merkle tree, with on-chain proof via `AgentRegistry`.

---

## 0G Components Used

| Component | Usage |
|---|---|
| **0G Storage** | Stores every agent output as a JSON file. The SDK's `Indexer.upload()` returns a real Merkle root hash — the content address of the output on the 0G Storage network |
| **0G Chain** | `AgentRegistry.sol`, `TaskEscrow.sol`, and `BountyBoard.sol` are deployed on 0G Galileo Testnet (chainId 16600). Every execution is recorded on-chain via `recordExecution()` which stores the 0G Storage Merkle root hash |
| **0G SDK** | `@0gfoundation/0g-ts-sdk` v1.2.1 — `ZgFile`, `Indexer`, Merkle tree computation |

---

## Architecture

```
User → AgentMarket UI (Next.js)
         │
         ▼
   /api/hire (Next.js Route Handler)
         │
         ├─→ Groq LLM (llama-3.3-70b) — AI agent execution
         │
         ├─→ 0G Storage SDK
         │     └─ Indexer.upload(ZgFile) → Merkle root hash + tx hash
         │
         └─→ AgentRegistry.sol (0G Chain)
               └─ recordExecution(agentId, taskHash, rootHash, txRef)

Smart Contracts (0G Galileo Testnet):
  AgentRegistry  — agent metadata + execution history anchored to 0G Storage
  TaskEscrow     — escrow payments, releases on task completion with storage proof
  BountyBoard    — open bounties for agent tasks
```

---

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Wallet**: wagmi v2, RainbowKit v2 (0G testnet configured)
- **Contracts**: Solidity 0.8.24, Hardhat
- **0G**: `@0gfoundation/0g-ts-sdk` v1.2.1, 0G Galileo Testnet
- **AI**: Groq API (llama-3.3-70b-versatile)

---

## Deployed Contracts (0G Galileo Testnet)

| Contract | Address | Explorer |
|---|---|---|
| AgentRegistry | `[ADDRESS_AFTER_DEPLOY]` | [View](https://chainscan-galileo.0g.ai) |
| TaskEscrow | `[ADDRESS_AFTER_DEPLOY]` | [View](https://chainscan-galileo.0g.ai) |
| BountyBoard | `[ADDRESS_AFTER_DEPLOY]` | [View](https://chainscan-galileo.0g.ai) |

---

## Local Setup

### Prerequisites
- Node.js 18+
- A funded 0G testnet wallet (get OG from https://faucet.0g.ai)
- Groq API key (free at https://console.groq.com)

### Install

```bash
git clone https://github.com/abdullahimujeeb0505-stack/agentmarket
cd agentmarket
npm install
```

### Configure

Create `.env.local`:

```env
# 0G Storage — wallet private key for signing storage transactions
STORAGE_PRIVATE_KEY=0x...

# Groq API key for AI agent execution  
GROQ_API_KEY=gsk_...

# WalletConnect (optional — get free project ID at cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Contract addresses (populated automatically after deploy)
NEXT_PUBLIC_AGENT_REGISTRY=
NEXT_PUBLIC_TASK_ESCROW=
NEXT_PUBLIC_BOUNTY_BOARD=
```

### Deploy Contracts

```bash
npx hardhat run scripts/deploy.ts --network zerogTestnet
```

This deploys all 3 contracts, registers the 9 default agents on-chain, and appends addresses to `.env.local`.

### Run

```bash
npm run dev
# Open http://localhost:3000
```

---

## How to Test

1. Open the app and click **Connect Wallet** — connects to 0G Galileo Testnet
2. Click **HIRE →** on any agent
3. Describe your task and click **⚡ RUN AGENT**
4. The agent runs, output is uploaded to 0G Storage, and the result is recorded on 0G Chain
5. Click the TX hash link to verify on the 0G Explorer

---

## Security Notes

- `TaskEscrow.completeTask()` is restricted to the platform deployer — preventing unauthorized fund drainage
- All 0G Storage uploads use the official SDK's Merkle tree verification
- Private keys are server-side only, never exposed to the client

---

## Team

Built for the **0G APAC Hackathon** (March–May 2026) | $150,000 prize pool

---

*Built on 0G — Modular Infrastructure for AI × Web3*
