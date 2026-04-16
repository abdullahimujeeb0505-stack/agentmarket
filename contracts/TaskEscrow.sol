// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title TaskEscrow
 * @notice Escrow contract for agent tasks. The output's 0G Storage Merkle root
 *         hash is stored on-chain when a task is completed, making every
 *         result verifiable via the 0G Explorer.
 */
contract TaskEscrow {
    enum TaskStatus { Pending, Completed, Refunded, Disputed }

    struct Task {
        uint256 id;
        uint256 agentId;
        address user;
        address agentOwner;
        uint256 amount;
        TaskStatus status;
        string outputRootHash;  // 0G Storage Merkle root — the real proof
        string storageTxRef;    // 0G chain tx hash
        uint256 timestamp;
        uint256 completedAt;
    }

    mapping(uint256 => Task) public tasks;
    uint256 public taskCount;
    address public platform;
    uint256 public platformFee = 15; // basis points (1.5%)

    event TaskCreated(uint256 indexed id, uint256 agentId, address indexed user, uint256 amount);
    event TaskCompleted(uint256 indexed id, string outputRootHash, string storageTxRef);
    event TaskRefunded(uint256 indexed id, address indexed user);
    event TaskDisputed(uint256 indexed id);

    modifier onlyPlatform() {
        require(msg.sender == platform, "Not platform");
        _;
    }

    constructor() {
        platform = msg.sender;
    }

    /**
     * @notice Create a new escrow task
     * @param _agentId ID from AgentRegistry
     * @param _agentOwner Address of the agent owner to pay on completion
     */
    function createTask(uint256 _agentId, address _agentOwner)
        external
        payable
        returns (uint256)
    {
        require(msg.value > 0, "Payment required");
        require(_agentOwner != address(0), "Invalid agent owner");

        taskCount++;
        tasks[taskCount] = Task({
            id: taskCount,
            agentId: _agentId,
            user: msg.sender,
            agentOwner: _agentOwner,
            amount: msg.value,
            status: TaskStatus.Pending,
            outputRootHash: "",
            storageTxRef: "",
            timestamp: block.timestamp,
            completedAt: 0
        });

        emit TaskCreated(taskCount, _agentId, msg.sender, msg.value);
        return taskCount;
    }

    /**
     * @notice Complete a task and release payment.
     *         Only the PLATFORM can call this — fixes the original security bug
     *         where anyone could drain escrow funds.
     * @param _taskId Task to complete
     * @param _outputRootHash Merkle root from 0G Storage SDK upload
     * @param _storageTxRef 0G chain transaction hash of the storage upload
     */
    function completeTask(
        uint256 _taskId,
        string memory _outputRootHash,
        string memory _storageTxRef
    ) external onlyPlatform {
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.Pending, "Not pending");
        require(bytes(_outputRootHash).length > 0, "Root hash required");

        task.status = TaskStatus.Completed;
        task.outputRootHash = _outputRootHash;
        task.storageTxRef = _storageTxRef;
        task.completedAt = block.timestamp;

        uint256 fee = (task.amount * platformFee) / 1000;
        uint256 ownerAmount = task.amount - fee;

        payable(task.agentOwner).transfer(ownerAmount);
        payable(platform).transfer(fee);

        emit TaskCompleted(_taskId, _outputRootHash, _storageTxRef);
    }

    /**
     * @notice User can refund their task if still pending
     */
    function refundTask(uint256 _taskId) external {
        Task storage task = tasks[_taskId];
        require(task.user == msg.sender, "Not task owner");
        require(task.status == TaskStatus.Pending, "Not pending");

        task.status = TaskStatus.Refunded;
        payable(task.user).transfer(task.amount);

        emit TaskRefunded(_taskId, task.user);
    }

    /**
     * @notice Get task details
     */
    function getTask(uint256 _taskId) external view returns (Task memory) {
        return tasks[_taskId];
    }

    /**
     * @notice Update platform fee (owner only)
     */
    function setPlatformFee(uint256 _fee) external onlyPlatform {
        require(_fee <= 100, "Max 10%");
        platformFee = _fee;
    }
}
