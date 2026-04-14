// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BountyBoard {
    enum BountyStatus { Open, Claimed, Completed }

    struct Bounty {
        uint256 id;
        address poster;
        string title;
        string description;
        uint256 reward;
        BountyStatus status;
        address claimer;
        string outputHash;
        uint256 deadline;
    }

    mapping(uint256 => Bounty) public bounties;
    uint256 public bountyCount;

    event BountyPosted(uint256 indexed id, address poster, uint256 reward);
    event BountyClaimed(uint256 indexed id, address claimer);
    event BountyCompleted(uint256 indexed id, string outputHash);

    function postBounty(
        string memory _title,
        string memory _description,
        uint256 _deadline
    ) external payable returns (uint256) {
        require(msg.value > 0, "Reward required");
        bountyCount++;
        bounties[bountyCount] = Bounty({
            id: bountyCount,
            poster: msg.sender,
            title: _title,
            description: _description,
            reward: msg.value,
            status: BountyStatus.Open,
            claimer: address(0),
            outputHash: "",
            deadline: _deadline
        });
        emit BountyPosted(bountyCount, msg.sender, msg.value);
        return bountyCount;
    }

    function claimBounty(uint256 _id) external {
        Bounty storage bounty = bounties[_id];
        require(bounty.status == BountyStatus.Open, "Not open");
        require(block.timestamp < bounty.deadline, "Expired");
        bounty.status = BountyStatus.Claimed;
        bounty.claimer = msg.sender;
        emit BountyClaimed(_id, msg.sender);
    }

    function completeBounty(uint256 _id, string memory _outputHash) external {
        Bounty storage bounty = bounties[_id];
        require(bounty.poster == msg.sender, "Not poster");
        require(bounty.status == BountyStatus.Claimed, "Not claimed");
        bounty.status = BountyStatus.Completed;
        bounty.outputHash = _outputHash;
        payable(bounty.claimer).transfer(bounty.reward);
        emit BountyCompleted(_id, _outputHash);
    }
}
