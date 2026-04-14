// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TaskEscrow {
    enum TaskStatus { Pending, Completed, Refunded }

    struct Task {
        uint256 id;
        uint256 agentId;
        address user;
        address agentOwner;
        uint256 amount;
        TaskStatus status;
        string outputHash;
        uint256 timestamp;
    }

    mapping(uint256 => Task) public tasks;
    uint256 public taskCount;
    address public platform;
    uint256 public platformFee = 15;

    event TaskCreated(uint256 indexed id, uint256 agentId, address user);
    event TaskCompleted(uint256 indexed id, string outputHash);
    event TaskRefunded(uint256 indexed id);

    constructor() {
        platform = msg.sender;
    }

    function createTask(uint256 _agentId, address _agentOwner) external payable returns (uint256) {
        require(msg.value > 0, "Payment required");
        taskCount++;
        tasks[taskCount] = Task({
            id: taskCount,
            agentId: _agentId,
            user: msg.sender,
            agentOwner: _agentOwner,
            amount: msg.value,
            status: TaskStatus.Pending,
            outputHash: "",
            timestamp: block.timestamp
        });
        emit TaskCreated(taskCount, _agentId, msg.sender);
        return taskCount;
    }

    function completeTask(uint256 _taskId, string memory _outputHash) external {
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.Pending, "Not pending");
        task.status = TaskStatus.Completed;
        task.outputHash = _outputHash;

        uint256 fee = (task.amount * platformFee) / 100;
        uint256 ownerAmount = task.amount - fee;

        payable(task.agentOwner).transfer(ownerAmount);
        payable(platform).transfer(fee);

        emit TaskCompleted(_taskId, _outputHash);
    }

    function refundTask(uint256 _taskId) external {
        Task storage task = tasks[_taskId];
        require(task.user == msg.sender, "Not user");
        require(task.status == TaskStatus.Pending, "Not pending");
        task.status = TaskStatus.Refunded;
        payable(task.user).transfer(task.amount);
        emit TaskRefunded(_taskId);
    }
}
