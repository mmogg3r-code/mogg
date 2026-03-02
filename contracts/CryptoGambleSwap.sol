// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal Ownable implementation to keep this contract self-contained.
abstract contract Ownable {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(address initialOwner) {
        require(initialOwner != address(0), "owner=0");
        _owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    modifier onlyOwner() {
        require(msg.sender == _owner, "not owner");
        _;
    }

    function owner() public view returns (address) {
        return _owner;
    }
}

/// @notice Minimal ERC20 implementation for the house token.
contract HouseToken is Ownable {
    string public constant name = "House Gamble Token";
    string public constant symbol = "HGT";
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(address owner_) Ownable(owner_) {}

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "allowance");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
            emit Approval(from, msg.sender, allowance[from][msg.sender]);
        }
        _transfer(from, to, amount);
        return true;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "to=0");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        require(from != address(0), "from=0");
        uint256 bal = balanceOf[from];
        require(bal >= amount, "balance");
        unchecked {
            balanceOf[from] = bal - amount;
            totalSupply -= amount;
        }
        emit Transfer(from, address(0), amount);
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "to=0");
        uint256 bal = balanceOf[from];
        require(bal >= amount, "balance");
        unchecked {
            balanceOf[from] = bal - amount;
            balanceOf[to] += amount;
        }
        emit Transfer(from, to, amount);
    }
}

contract CryptoGambleSwap is Ownable {
    HouseToken public immutable token;

    uint256 public tokenPriceWei = 1e14; // 0.0001 ETH per token unit (1e18 decimals)
    uint16 public houseFeeBps = 200; // 2%

    event TokensPurchased(address indexed buyer, uint256 ethIn, uint256 tokenOut);
    event TokensSold(address indexed seller, uint256 tokenIn, uint256 ethOut);
    event CoinFlipPlayed(address indexed player, uint256 wager, bool choseHeads, bool won, uint256 payout);

    constructor() Ownable(msg.sender) {
        token = new HouseToken(address(this));
    }

    function setTokenPriceWei(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "price=0");
        tokenPriceWei = newPrice;
    }

    function setHouseFeeBps(uint16 newFeeBps) external onlyOwner {
        require(newFeeBps <= 2000, "fee too high");
        houseFeeBps = newFeeBps;
    }

    function buyTokens() external payable {
        require(msg.value > 0, "no eth");

        uint256 tokenAmount = (msg.value * 1e18) / tokenPriceWei;
        require(tokenAmount > 0, "too little eth");

        token.mint(msg.sender, tokenAmount);
        emit TokensPurchased(msg.sender, msg.value, tokenAmount);
    }

    function sellTokens(uint256 tokenAmount) external {
        require(tokenAmount > 0, "amount=0");

        uint256 ethOut = (tokenAmount * tokenPriceWei) / 1e18;
        require(address(this).balance >= ethOut, "insufficient house eth");

        token.burn(msg.sender, tokenAmount);
        (bool ok,) = msg.sender.call{value: ethOut}("");
        require(ok, "eth transfer failed");

        emit TokensSold(msg.sender, tokenAmount, ethOut);
    }

    function playCoinFlip(bool betOnHeads) external payable returns (bool won) {
        require(msg.value > 0, "no wager");

        uint256 fee = (msg.value * houseFeeBps) / 10_000;
        uint256 netWager = msg.value - fee;
        uint256 potentialPayout = netWager * 2;

        require(address(this).balance >= potentialPayout, "house underfunded");

        won = _flip();
        if (won == betOnHeads) {
            (bool ok,) = msg.sender.call{value: potentialPayout}("");
            require(ok, "payout failed");
            emit CoinFlipPlayed(msg.sender, msg.value, betOnHeads, true, potentialPayout);
        } else {
            emit CoinFlipPlayed(msg.sender, msg.value, betOnHeads, false, 0);
        }
    }

    function _flip() internal view returns (bool) {
        // NOTE: Pseudo-randomness only, not secure for production use.
        uint256 entropy = uint256(
            keccak256(
                abi.encodePacked(block.prevrandao, block.timestamp, block.number, msg.sender)
            )
        );
        return (entropy % 2) == 0;
    }

    function emergencyWithdrawETH(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "insufficient eth");
        (bool ok,) = owner().call{value: amount}("");
        require(ok, "withdraw failed");
    }

    function emergencyWithdrawToken(address erc20, uint256 amount) external onlyOwner {
        require(erc20 != address(token), "cannot drain house token");
        (bool ok, bytes memory data) = erc20.call(
            abi.encodeWithSignature("transfer(address,uint256)", owner(), amount)
        );
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "token rescue failed");
    }

    function getContractEthBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getTokenBalance(address account) external view returns (uint256) {
        return token.balanceOf(account);
    }

    receive() external payable {}
}
