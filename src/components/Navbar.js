import React, { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { logout, setActiveAccount, setAccounts } from "../redux/reducers/accountSlice";
import "./Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const account = useSelector((state) => state.account);
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const disconnect = () => {
    dispatch(logout());
    navigate("/");
    setDropdownOpen(false);
  };

  const handleAccountSwitch = (accountAddress) => {
    dispatch(setActiveAccount(accountAddress));
    setDropdownOpen(false);
  };

  const refreshAccounts = async () => {
    if (!window.ethereum) return;
    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts && accounts.length > 0) {
        dispatch(setAccounts(accounts));
      }
    } catch (err) {
      console.error("Error refreshing accounts:", err);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <nav className="navbar fade-down">
      <div className="nav-left">
        <Link to="/" className="nav-logo">
          <span className="nav-logo-text">BlockVault</span>
        </Link>
        {account.accountId && (
          <div className="nav-links">
            <Link 
              to="/" 
              className={`nav-link ${location.pathname === "/" || location.pathname === "/upload" ? "active" : ""}`}
            >
              Upload
            </Link>
            <Link 
              to="/my-files" 
              className={`nav-link ${location.pathname === "/my-files" ? "active" : ""}`}
            >
              My Files
            </Link>
          </div>
        )}
      </div>

      {account.accountId && (
        <div className="nav-right">
          {/* Account Switcher Dropdown - Always show if accounts array exists */}
          {account.accounts && account.accounts.length > 0 && (
            <div className="account-switcher" ref={dropdownRef}>
              <button
                className="account-switcher-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <span className="account-display">
                  {account.accountId.slice(0, 6)}...{account.accountId.slice(-4)}
                </span>
                <span className="dropdown-arrow">{dropdownOpen ? "▲" : "▼"}</span>
              </button>

              {dropdownOpen && (
                <div className="account-dropdown">
                  <div className="dropdown-header">
                    <span>Switch Account</span>
                    <span className="account-count">{account.accounts.length} {account.accounts.length === 1 ? 'account' : 'accounts'}</span>
                  </div>
                  <div className="dropdown-list">
                    {account.accounts.map((acc) => (
                      <button
                        key={acc}
                        className={`account-item ${acc === account.accountId ? "active" : ""}`}
                        onClick={() => handleAccountSwitch(acc)}
                      >
                        <span className="account-address">
                          {acc.slice(0, 6)}...{acc.slice(-4)}
                        </span>
                        {acc === account.accountId && (
                          <span className="active-indicator">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="dropdown-footer">
                    {account.accounts.length === 1 ? (
                      <p className="footer-text">💡 Connect more accounts in MetaMask to switch between them</p>
                    ) : (
                      <button 
                        className="refresh-accounts-btn"
                        onClick={refreshAccounts}
                        title="Refresh accounts from MetaMask"
                      >
                        🔄 Refresh Accounts
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fallback: Single Account Display (if accounts array is empty) */}
          {(!account.accounts || account.accounts.length === 0) && (
            <span className="nav-wallet">
              {account.accountId.slice(0, 6)}...{account.accountId.slice(-4)}
            </span>
          )}

          <button className="nav-disconnect" onClick={disconnect}>
            Disconnect
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
