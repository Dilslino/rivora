// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RivoraEscrow
 * @notice Escrow contract for Rivora battle royale giveaway platform
 * @dev Handles deposits, withdrawals, and prize distribution with platform fees
 */
contract RivoraEscrow is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Platform fee in basis points (500 = 5%)
    uint256 public platformFeeBps = 500;
    
    // Withdrawal fee in basis points (200 = 2%)
    uint256 public withdrawalFeeBps = 200;
    
    // Treasury address for collected fees
    address public treasury;

    // Room data structure
    struct Room {
        address host;
        address token;      // address(0) for ETH
        uint256 amount;     // Total prize amount (after platform fee deduction)
        uint256 platformFee; // Fee taken at creation
        address winner;
        bool claimed;
        bool cancelled;
        uint256 createdAt;
    }

    // roomId => Room
    mapping(bytes32 => Room) public rooms;

    // Events
    event RoomCreated(
        bytes32 indexed roomId,
        address indexed host,
        address token,
        uint256 amount,
        uint256 platformFee
    );
    
    event WinnerSet(
        bytes32 indexed roomId,
        address indexed winner
    );
    
    event RewardClaimed(
        bytes32 indexed roomId,
        address indexed winner,
        uint256 amount,
        uint256 withdrawalFee
    );
    
    event RoomCancelled(
        bytes32 indexed roomId,
        address indexed host,
        uint256 refundAmount
    );

    event FeesUpdated(uint256 platformFeeBps, uint256 withdrawalFeeBps);
    event TreasuryUpdated(address newTreasury);

    constructor(address _treasury) {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }

    /**
     * @notice Create a new room with ETH prize
     * @param roomId Unique identifier for the room
     */
    function createRoomETH(bytes32 roomId) external payable nonReentrant {
        require(msg.value > 0, "Must send ETH");
        require(rooms[roomId].host == address(0), "Room exists");

        uint256 fee = (msg.value * platformFeeBps) / 10000;
        uint256 prizeAmount = msg.value - fee;

        rooms[roomId] = Room({
            host: msg.sender,
            token: address(0),
            amount: prizeAmount,
            platformFee: fee,
            winner: address(0),
            claimed: false,
            cancelled: false,
            createdAt: block.timestamp
        });

        // Transfer fee to treasury
        if (fee > 0) {
            (bool success, ) = treasury.call{value: fee}("");
            require(success, "Fee transfer failed");
        }

        emit RoomCreated(roomId, msg.sender, address(0), prizeAmount, fee);
    }

    /**
     * @notice Create a new room with ERC20 token prize
     * @param roomId Unique identifier for the room
     * @param token ERC20 token address
     * @param amount Total amount to deposit
     */
    function createRoomToken(
        bytes32 roomId,
        address token,
        uint256 amount
    ) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(token != address(0), "Invalid token");
        require(rooms[roomId].host == address(0), "Room exists");

        uint256 fee = (amount * platformFeeBps) / 10000;
        uint256 prizeAmount = amount - fee;

        // Transfer tokens from sender
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        rooms[roomId] = Room({
            host: msg.sender,
            token: token,
            amount: prizeAmount,
            platformFee: fee,
            winner: address(0),
            claimed: false,
            cancelled: false,
            createdAt: block.timestamp
        });

        // Transfer fee to treasury
        if (fee > 0) {
            IERC20(token).safeTransfer(treasury, fee);
        }

        emit RoomCreated(roomId, msg.sender, token, prizeAmount, fee);
    }

    /**
     * @notice Set the winner of a room (only host or owner can call)
     * @param roomId Room identifier
     * @param winner Winner's address
     */
    function setWinner(bytes32 roomId, address winner) external {
        Room storage room = rooms[roomId];
        require(room.host != address(0), "Room not found");
        require(!room.cancelled, "Room cancelled");
        require(room.winner == address(0), "Winner already set");
        require(winner != address(0), "Invalid winner");
        require(
            msg.sender == room.host || msg.sender == owner(),
            "Not authorized"
        );

        room.winner = winner;
        emit WinnerSet(roomId, winner);
    }

    /**
     * @notice Claim reward as the winner
     * @param roomId Room identifier
     */
    function claimReward(bytes32 roomId) external nonReentrant {
        Room storage room = rooms[roomId];
        require(room.host != address(0), "Room not found");
        require(!room.cancelled, "Room cancelled");
        require(!room.claimed, "Already claimed");
        require(room.winner == msg.sender, "Not the winner");

        room.claimed = true;

        uint256 withdrawFee = (room.amount * withdrawalFeeBps) / 10000;
        uint256 payout = room.amount - withdrawFee;

        if (room.token == address(0)) {
            // ETH payout
            if (withdrawFee > 0) {
                (bool feeSuccess, ) = treasury.call{value: withdrawFee}("");
                require(feeSuccess, "Fee transfer failed");
            }
            (bool success, ) = msg.sender.call{value: payout}("");
            require(success, "Payout failed");
        } else {
            // Token payout
            if (withdrawFee > 0) {
                IERC20(room.token).safeTransfer(treasury, withdrawFee);
            }
            IERC20(room.token).safeTransfer(msg.sender, payout);
        }

        emit RewardClaimed(roomId, msg.sender, payout, withdrawFee);
    }

    /**
     * @notice Cancel a room and refund the host (only if no winner set)
     * @param roomId Room identifier
     */
    function cancelRoom(bytes32 roomId) external nonReentrant {
        Room storage room = rooms[roomId];
        require(room.host != address(0), "Room not found");
        require(!room.cancelled, "Already cancelled");
        require(!room.claimed, "Already claimed");
        require(room.winner == address(0), "Winner already set");
        require(
            msg.sender == room.host || msg.sender == owner(),
            "Not authorized"
        );

        room.cancelled = true;

        // Refund the prize amount (platform fee is not refunded)
        if (room.token == address(0)) {
            (bool success, ) = room.host.call{value: room.amount}("");
            require(success, "Refund failed");
        } else {
            IERC20(room.token).safeTransfer(room.host, room.amount);
        }

        emit RoomCancelled(roomId, room.host, room.amount);
    }

    /**
     * @notice Get room balance
     * @param roomId Room identifier
     */
    function getRoomBalance(bytes32 roomId) external view returns (uint256) {
        Room storage room = rooms[roomId];
        if (room.claimed || room.cancelled) {
            return 0;
        }
        return room.amount;
    }

    /**
     * @notice Get room details
     * @param roomId Room identifier
     */
    function getRoom(bytes32 roomId) external view returns (
        address host,
        address token,
        uint256 amount,
        address winner,
        bool claimed,
        bool cancelled
    ) {
        Room storage room = rooms[roomId];
        return (
            room.host,
            room.token,
            room.amount,
            room.winner,
            room.claimed,
            room.cancelled
        );
    }

    // Admin functions

    /**
     * @notice Update platform fees
     * @param _platformFeeBps New platform fee in basis points
     * @param _withdrawalFeeBps New withdrawal fee in basis points
     */
    function updateFees(
        uint256 _platformFeeBps,
        uint256 _withdrawalFeeBps
    ) external onlyOwner {
        require(_platformFeeBps <= 1000, "Platform fee too high"); // Max 10%
        require(_withdrawalFeeBps <= 500, "Withdrawal fee too high"); // Max 5%
        
        platformFeeBps = _platformFeeBps;
        withdrawalFeeBps = _withdrawalFeeBps;
        
        emit FeesUpdated(_platformFeeBps, _withdrawalFeeBps);
    }

    /**
     * @notice Update treasury address
     * @param _treasury New treasury address
     */
    function updateTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    /**
     * @notice Emergency withdraw (only owner, for stuck funds)
     * @param token Token address (address(0) for ETH)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(
        address token,
        uint256 amount
    ) external onlyOwner {
        if (token == address(0)) {
            (bool success, ) = treasury.call{value: amount}("");
            require(success, "Transfer failed");
        } else {
            IERC20(token).safeTransfer(treasury, amount);
        }
    }

    // Allow contract to receive ETH
    receive() external payable {}
}
