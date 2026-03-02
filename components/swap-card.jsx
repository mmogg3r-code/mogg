"use client";

import { useMemo, useState } from "react";
import { parseUnits, formatUnits, BrowserProvider, Contract } from "ethers";
import { TOKENS } from "@/lib/tokens";

const UNISWAP_V2_SEPOLIA_ROUTER = "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3";
const ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] memory path) external view returns (uint[] memory amounts)",
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)"
];

export default function SwapCard() {
  const [wallet, setWallet] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [amountIn, setAmountIn] = useState("0.01");
  const [selectedOut, setSelectedOut] = useState(TOKENS[1]);
  const [quote, setQuote] = useState("-");
  const [status, setStatus] = useState("Connect wallet to start.");
  const [loading, setLoading] = useState(false);

  const invalidNetwork = !!wallet && chainId !== 11155111;
  const path = useMemo(() => [TOKENS[0].address, selectedOut.address], [selectedOut.address]);

  const getEthereum = () => window.ethereum;

  const connectWallet = async () => {
    const ethereum = getEthereum();
    if (!ethereum) {
      setStatus("No injected wallet found. Install MetaMask.");
      return;
    }

    try {
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const chain = await ethereum.request({ method: "eth_chainId" });
      setWallet(accounts[0]);
      setChainId(Number.parseInt(chain, 16));
      setStatus("Wallet connected.");
    } catch (error) {
      setStatus(`Wallet connection failed: ${error.message}`);
    }
  };

  const switchToSepolia = async () => {
    const ethereum = getEthereum();
    if (!ethereum) return;
    await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xaa36a7" }] });
    setChainId(11155111);
  };

  const getProvider = async () => {
    const ethereum = getEthereum();
    if (!ethereum) throw new Error("Wallet provider not found.");
    return new BrowserProvider(ethereum);
  };

  const handleQuote = async () => {
    setLoading(true);
    try {
      const provider = await getProvider();
      const router = new Contract(UNISWAP_V2_SEPOLIA_ROUTER, ROUTER_ABI, provider);
      const weiAmount = parseUnits(amountIn, 18);
      const amounts = await router.getAmountsOut(weiAmount, path);
      setQuote(`${formatUnits(amounts[1], selectedOut.decimals)} ${selectedOut.symbol}`);
      setStatus("Quote refreshed.");
    } catch (error) {
      setStatus(`Quote failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const provider = await getProvider();
      const signer = await provider.getSigner();
      const router = new Contract(UNISWAP_V2_SEPOLIA_ROUTER, ROUTER_ABI, signer);
      const recipient = wallet || (await signer.getAddress());

      const weiAmount = parseUnits(amountIn, 18);
      const amounts = await router.getAmountsOut(weiAmount, path);
      const minOut = (amounts[1] * 98n) / 100n;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

      const tx = await router.swapExactETHForTokens(minOut, path, recipient, deadline, { value: weiAmount });
      setStatus(`Swap submitted: ${tx.hash}`);
      await tx.wait();
      setStatus("Swap confirmed on Sepolia ✅");
    } catch (error) {
      setStatus(`Swap failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="cardHeader">
        <h1>SepoliaSwap</h1>
        <button onClick={connectWallet}>{wallet ? "Connected" : "Connect Wallet"}</button>
      </div>

      <p className="hint">ETH ➜ Token swaps on Sepolia testnet.</p>
      {wallet ? <p className="hint">Wallet: {wallet}</p> : null}
      {invalidNetwork ? (
        <p className="error">
          Wrong network. <button onClick={switchToSepolia}>Switch to Sepolia</button>
        </p>
      ) : null}

      <form onSubmit={handleSwap} className="swapForm">
        <label>
          From (ETH)
          <input type="number" step="0.0001" min="0" value={amountIn} onChange={(e) => setAmountIn(e.target.value)} required />
        </label>

        <label>
          To token
          <select value={selectedOut.address} onChange={(e) => setSelectedOut(TOKENS.find((t) => t.address === e.target.value) || TOKENS[1])}>
            {TOKENS.filter((token) => token.symbol !== "WETH").map((token) => (
              <option key={token.address} value={token.address}>{token.symbol}</option>
            ))}
          </select>
        </label>

        <div className="quote">Estimated output: {quote}</div>

        <div className="actions">
          <button type="button" onClick={handleQuote} disabled={loading || invalidNetwork || !wallet}>Get Quote</button>
          <button type="submit" disabled={loading || invalidNetwork || !wallet}>Swap</button>
        </div>
      </form>

      <p className="status">{status}</p>
    </div>
  );
}
