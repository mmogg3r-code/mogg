'use client';

import { useMemo, useState } from 'react';
import { ethers } from 'ethers';

const contractAbi = [
  'function buyTokens() external payable',
  'function sellTokens(uint256 tokenAmount) external',
  'function playCoinFlip(bool betOnHeads) external payable returns (bool won)',
  'function token() external view returns (address)',
  'function tokenPriceWei() external view returns (uint256)',
  'function houseFeeBps() external view returns (uint16)',
  'function getContractEthBalance() external view returns (uint256)',
  'function getTokenBalance(address account) external view returns (uint256)',
  'function emergencyWithdrawETH(uint256 amount) external',
  'function emergencyWithdrawToken(address erc20, uint256 amount) external',
  'function owner() external view returns (address)'
];

const deployedAddress = '0x98719d465A56242d98589085E5D608D80d10b631';

export default function HomePage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [contractAddress, setContractAddress] = useState(deployedAddress);
  const [buyEth, setBuyEth] = useState('0.01');
  const [sellAmount, setSellAmount] = useState('10');
  const [betAmount, setBetAmount] = useState('0.005');
  const [betHeads, setBetHeads] = useState(true);
  const [withdrawEthAmount, setWithdrawEthAmount] = useState('0.01');
  const [rescueTokenAddress, setRescueTokenAddress] = useState('0x0000000000000000000000000000000000000000');
  const [rescueTokenAmount, setRescueTokenAmount] = useState('1');
  const [status, setStatus] = useState('Connect wallet and click Refresh Stats.');
  const [balances, setBalances] = useState({
    token: '0',
    contractEth: '0',
    tokenPriceWei: '0',
    houseFeeBps: '0',
    tokenAddress: '0x0000000000000000000000000000000000000000',
    owner: '0x0000000000000000000000000000000000000000'
  });

  const hasEthereum = typeof window !== 'undefined' && window.ethereum;

  const contract = useMemo(() => {
    if (!hasEthereum || !ethers.isAddress(contractAddress)) return null;
    const provider = new ethers.BrowserProvider(window.ethereum);
    return new ethers.Contract(contractAddress, contractAbi, provider);
  }, [contractAddress, hasEthereum]);

  const isOwner = walletAddress && balances.owner && walletAddress.toLowerCase() === balances.owner.toLowerCase();

  async function connectWallet() {
    try {
      if (!hasEthereum) throw new Error('No injected wallet found. Install MetaMask.');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      setWalletAddress(accounts[0] || '');
      setStatus('Wallet connected.');
    } catch (error) {
      setStatus(`Connect failed: ${error.message}`);
    }
  }

  async function withSigner() {
    if (!hasEthereum) throw new Error('No injected wallet found.');
    if (!ethers.isAddress(contractAddress)) throw new Error('Enter a valid deployed contract address.');

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(contractAddress, contractAbi, signer);
  }

  async function refreshStats() {
    try {
      if (!contract || !walletAddress) throw new Error('Set contract address and connect wallet first.');
      const [token, tokenPriceWei, houseFeeBps, contractEth, userTokenBalance, owner] = await Promise.all([
        contract.token(),
        contract.tokenPriceWei(),
        contract.houseFeeBps(),
        contract.getContractEthBalance(),
        contract.getTokenBalance(walletAddress),
        contract.owner()
      ]);

      setBalances({
        tokenAddress: token,
        tokenPriceWei: tokenPriceWei.toString(),
        houseFeeBps: houseFeeBps.toString(),
        contractEth: ethers.formatEther(contractEth),
        token: ethers.formatUnits(userTokenBalance, 18),
        owner
      });

      setStatus('Stats refreshed.');
    } catch (error) {
      setStatus(`Refresh failed: ${error.message}`);
    }
  }

  async function buyTokens() {
    try {
      const c = await withSigner();
      const tx = await c.buyTokens({ value: ethers.parseEther(buyEth || '0') });
      await tx.wait();
      setStatus('Buy succeeded.');
      await refreshStats();
    } catch (error) {
      setStatus(`Buy failed: ${error.message}`);
    }
  }

  async function sellTokens() {
    try {
      const c = await withSigner();
      const tx = await c.sellTokens(ethers.parseUnits(sellAmount || '0', 18));
      await tx.wait();
      setStatus('Sell succeeded.');
      await refreshStats();
    } catch (error) {
      setStatus(`Sell failed: ${error.message}`);
    }
  }

  async function play() {
    try {
      const c = await withSigner();
      const tx = await c.playCoinFlip(betHeads, { value: ethers.parseEther(betAmount || '0') });
      const receipt = await tx.wait();
      setStatus(`Bet settled in tx ${receipt.hash}.`);
      await refreshStats();
    } catch (error) {
      setStatus(`Bet failed: ${error.message}`);
    }
  }

  async function emergencyWithdrawETH() {
    try {
      const c = await withSigner();
      const tx = await c.emergencyWithdrawETH(ethers.parseEther(withdrawEthAmount || '0'));
      await tx.wait();
      setStatus('Admin ETH withdraw succeeded.');
      await refreshStats();
    } catch (error) {
      setStatus(`Admin ETH withdraw failed: ${error.message}`);
    }
  }

  async function emergencyWithdrawToken() {
    try {
      const c = await withSigner();
      const tx = await c.emergencyWithdrawToken(
        rescueTokenAddress,
        ethers.parseUnits(rescueTokenAmount || '0', 18)
      );
      await tx.wait();
      setStatus('Admin token rescue succeeded.');
      await refreshStats();
    } catch (error) {
      setStatus(`Admin token rescue failed: ${error.message}`);
    }
  }

  return (
    <main className="container">
      <h1>Crypto Gambling + Token Swap DApp</h1>

      <section className="card">
        <button onClick={connectWallet}>Connect Wallet</button>
        <p><strong>Wallet:</strong> {walletAddress || 'Not connected'}</p>

        <label>Contract Address</label>
        <input value={contractAddress} onChange={(e) => setContractAddress(e.target.value.trim())} />
        <small className="hint">Default set to deployed contract: {deployedAddress}</small>
        <br />
        <button onClick={refreshStats}>Refresh Stats</button>
      </section>

      <section className="grid">
        <div className="card">
          <h2>Buy Tokens</h2>
          <label>ETH to spend</label>
          <input value={buyEth} onChange={(e) => setBuyEth(e.target.value)} />
          <button onClick={buyTokens}>Buy</button>
        </div>

        <div className="card">
          <h2>Sell Tokens</h2>
          <label>Token amount</label>
          <input value={sellAmount} onChange={(e) => setSellAmount(e.target.value)} />
          <button onClick={sellTokens}>Sell</button>
        </div>

        <div className="card">
          <h2>Coin Flip Bet</h2>
          <label>ETH bet amount</label>
          <input value={betAmount} onChange={(e) => setBetAmount(e.target.value)} />
          <div className="row">
            <button onClick={() => setBetHeads(true)} className={betHeads ? 'active' : ''}>Heads</button>
            <button onClick={() => setBetHeads(false)} className={!betHeads ? 'active' : ''}>Tails</button>
          </div>
          <button onClick={play}>Play</button>
        </div>
      </section>

      <section className="card">
        <h2>Admin / Unstuck Controls</h2>
        <p><strong>Contract Owner:</strong> {balances.owner}</p>
        <p><strong>Connected Wallet is Owner:</strong> {isOwner ? 'Yes' : 'No'}</p>

        <label>Emergency ETH Withdraw (owner only)</label>
        <input value={withdrawEthAmount} onChange={(e) => setWithdrawEthAmount(e.target.value)} />
        <button onClick={emergencyWithdrawETH}>Withdraw ETH</button>

        <label>Rescue ERC20 Address (owner only)</label>
        <input value={rescueTokenAddress} onChange={(e) => setRescueTokenAddress(e.target.value.trim())} />

        <label>Rescue ERC20 Amount (18 decimals expected)</label>
        <input value={rescueTokenAmount} onChange={(e) => setRescueTokenAmount(e.target.value)} />
        <button onClick={emergencyWithdrawToken}>Rescue ERC20</button>
      </section>

      <section className="card">
        <h2>Contract Stats</h2>
        <p><strong>Token:</strong> {balances.tokenAddress}</p>
        <p><strong>Token Price (wei):</strong> {balances.tokenPriceWei}</p>
        <p><strong>House Fee (bps):</strong> {balances.houseFeeBps}</p>
        <p><strong>Contract ETH:</strong> {balances.contractEth}</p>
        <p><strong>Your Token Balance:</strong> {balances.token}</p>
      </section>

      <section className="card">
        <h2>Status</h2>
        <p>{status}</p>
      </section>
    </main>
  );
}
