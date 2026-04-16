// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AgentRegistry
 * @notice On-chain registry for AI agents. Each agent's metadata and
 *         execution history are anchored to 0G Storage via Merkle root hashes,
 *         making every output permanently verifiable.
 */
contract AgentRegistry {
    struct Agent {
        uint256 id;
        address owner;
        string name;
        string category;        // "builders" | "creators" | "general"
        string metadataHash;    // 0G Storage root hash of agent metadata JSON
        uint256 priceWei;
        uint256 totalRuns;
        uint256 totalEarned;
        bool active;
        uint256 createdAt;
    }

    struct ExecutionRecord {
        uint256 agentId;
        address user;
        string taskHash;        // keccak256 of task input
        string outputRootHash;  // 0G Storage Merkle root of output
        string txRef;           // 0G chain tx hash
        uint256 timestamp;
    }

    mapping(uint256 => Agent) public agents;
    mapping(uint256 => ExecutionRecord[]) public agentHistory;
    mapping(address => uint256[]) public ownerAgents;

    uint256 public agentCount;
    address public owner;

    event AgentRegistered(uint256 indexed id, address indexed owner, string name);
    event AgentExecuted(
        uint256 indexed agentId,
        address indexed user,
        string outputRootHash,
        string txRef
    );
    event AgentUpdated(uint256 indexed id, bool active);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAgentOwner(uint256 _agentId) {
        require(agents[_agentId].owner == msg.sender, "Not agent owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Register a new AI agent on-chain
     * @param _name Human-readable agent name
     * @param _category Agent category
     * @param _metadataHash 0G Storage root hash of full agent metadata JSON
     * @param _priceWei Cost per execution in wei
     */
    function registerAgent(
        string memory _name,
        string memory _category,
        string memory _metadataHash,
        uint256 _priceWei
    ) external returns (uint256) {
        agentCount++;
        agents[agentCount] = Agent({
            id: agentCount,
            owner: msg.sender,
            name: _name,
            category: _category,
            metadataHash: _metadataHash,
            priceWei: _priceWei,
            totalRuns: 0,
            totalEarned: 0,
            active: true,
            createdAt: block.timestamp
        });
        ownerAgents[msg.sender].push(agentCount);
        emit AgentRegistered(agentCount, msg.sender, _name);
        return agentCount;
    }

    /**
     * @notice Record an agent execution — anchors 0G Storage root hash on-chain
     * @param _agentId The agent that was run
     * @param _taskHash Hash of the task input
     * @param _outputRootHash The Merkle root returned by 0G Storage SDK after upload
     * @param _txRef The 0G chain transaction hash of the storage upload
     */
    function recordExecution(
        uint256 _agentId,
        string memory _taskHash,
        string memory _outputRootHash,
        string memory _txRef
    ) external {
        require(agents[_agentId].active, "Agent not active");

        agentHistory[_agentId].push(ExecutionRecord({
            agentId: _agentId,
            user: msg.sender,
            taskHash: _taskHash,
            outputRootHash: _outputRootHash,
            txRef: _txRef,
            timestamp: block.timestamp
        }));

        agents[_agentId].totalRuns++;

        emit AgentExecuted(_agentId, msg.sender, _outputRootHash, _txRef);
    }

    /**
     * @notice Get full execution history for an agent
     */
    function getHistory(uint256 _agentId)
        external
        view
        returns (ExecutionRecord[] memory)
    {
        return agentHistory[_agentId];
    }

    /**
     * @notice Get all agents owned by an address
     */
    function getOwnerAgents(address _owner)
        external
        view
        returns (uint256[] memory)
    {
        return ownerAgents[_owner];
    }

    /**
     * @notice Toggle agent active status
     */
    function setAgentActive(uint256 _agentId, bool _active)
        external
        onlyAgentOwner(_agentId)
    {
        agents[_agentId].active = _active;
        emit AgentUpdated(_agentId, _active);
    }
}
