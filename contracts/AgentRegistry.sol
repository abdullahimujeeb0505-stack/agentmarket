// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AgentRegistry {
    struct Agent {
        uint256 id;
        string name;
        string category;
        string description;
        uint256 pricePerTask;
        address owner;
        uint256 totalRuns;
        uint256 rating;
        bool active;
        string metadataHash;
    }

    mapping(uint256 => Agent) public agents;
    mapping(address => uint256[]) public ownerAgents;
    uint256 public agentCount;
    address public platform;

    event AgentRegistered(uint256 indexed id, string name, address owner);
    event AgentUpdated(uint256 indexed id);
    event AgentDeactivated(uint256 indexed id);

    constructor() {
        platform = msg.sender;
    }

    function registerAgent(
        string memory _name,
        string memory _category,
        string memory _description,
        uint256 _pricePerTask,
        string memory _metadataHash
    ) external returns (uint256) {
        agentCount++;
        agents[agentCount] = Agent({
            id: agentCount,
            name: _name,
            category: _category,
            description: _description,
            pricePerTask: _pricePerTask,
            owner: msg.sender,
            totalRuns: 0,
            rating: 100,
            active: true,
            metadataHash: _metadataHash
        });
        ownerAgents[msg.sender].push(agentCount);
        emit AgentRegistered(agentCount, _name, msg.sender);
        return agentCount;
    }

    function incrementRuns(uint256 _agentId) external {
        agents[_agentId].totalRuns++;
    }

    function getAgent(uint256 _id) external view returns (Agent memory) {
        return agents[_id];
    }

    function getOwnerAgents(address _owner) external view returns (uint256[] memory) {
        return ownerAgents[_owner];
    }

    function deactivateAgent(uint256 _id) external {
        require(agents[_id].owner == msg.sender, "Not owner");
        agents[_id].active = false;
        emit AgentDeactivated(_id);
    }
}
