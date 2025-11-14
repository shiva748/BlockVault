import { useSelector, useDispatch } from "react-redux";
import { setAccounts, setActiveAccount, logout } from "../redux/reducers/accountSlice";
import { useState, useEffect, useCallback } from "react";

const ConnectWalletButton = () => {
  const dispatch = useDispatch();
  const account = useSelector((state) => state.account);
  const [loading, setLoading] = useState(false);
  const accountsList = account.accounts || [];

  const handleAccountsChanged = useCallback((accounts) => {
    if (!accounts || accounts.length === 0) {
      dispatch(logout());
      return;
    }
    dispatch(setAccounts(accounts));
  }, [dispatch]);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        setLoading(true); // start loading

        // Request accounts - this will prompt user to connect if not already connected
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        
        // Also try to get all accounts (some wallets support this)
        // This ensures we get all authorized accounts, not just the first one
        let allAccounts = accounts;
        try {
          // Some wallets might support getting all accounts
          const walletAccounts = await window.ethereum.request({ 
            method: "eth_accounts" 
          });
          if (walletAccounts && walletAccounts.length > accounts.length) {
            allAccounts = walletAccounts;
          }
        } catch (e) {
          // If that fails, just use the accounts from requestAccounts
          console.log("Using accounts from eth_requestAccounts");
        }

        dispatch(setAccounts(allAccounts));
      } catch (err) {
        console.error("Error connecting wallet:", err);
      } finally {
        setLoading(false); // end loading
      }
    } else {
      alert("MetaMask not found. Please install it from https://metamask.io");
    }
  };

  return (
    <div className="connect-wallet-wrapper">
      <button
        onClick={connectWallet}
        className="connect-btn"
        disabled={loading} // disable button during loading
      >
        {loading ? (
          <div className="loader"></div>
        ) : account.accountId ? (
          `Connected: ${account.accountId.slice(0, 6)}...${account.accountId.slice(-4)}`
        ) : (
          "Connect Wallet"
        )}
      </button>

      {account.accountId && accountsList.length > 1 && (
        <div className="account-switcher">
          <label htmlFor="account-select">Active Account</label>
          <select
            id="account-select"
            className="account-select"
            value={account.accountId}
            onChange={(e) => {
              const newAccount = e.target.value;
              dispatch(setActiveAccount(newAccount));
            }}
          >
            {accountsList.map((acct) => (
              <option key={acct} value={acct}>
                {acct.slice(0, 6)}...{acct.slice(-4)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default ConnectWalletButton;
