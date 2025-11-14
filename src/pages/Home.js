import React from "react";
import ConnectWalletButton from "../components/connectWallet";
import "./Home.css";

const Home = () => {
  return (
    <div className="hero">
      <div className="hero-content">

        <h1 className="hero-title">Block Vault 🔐</h1>

        <p className="hero-subtitle">
          Store files securely on <span>IPFS</span> and record metadata on the <span>blockchain</span>.  
          Experience true decentralization in a beautifully crafted vault.
        </p>

        <ConnectWalletButton />

        <p className="hero-footer">
          Ethers.js • Sepolia Testnet • IPFS • React
        </p>

      </div>
    </div>
  );
};

export default Home;
