import React, { useState } from "react";
import { useSelector } from "react-redux";
import "./Upload.css";
import DecryptFile from "../components/Decrypt";
import {
  hashFile,
  createEncryptionMessage,
  signMessageWithMetaMask,
  encryptFileWithMetaMask,
  bufToBase64,
} from "../utils/metamaskEncryption";
import { uploadFileMetadata } from "../utils/blockchain";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// -------------------------------
// Upload encrypted blob to Pinata
// -------------------------------
async function uploadToPinata(salt, iv, ciphertext, fileName) {
  const JWT = process.env.REACT_APP_PINATA_JWT;
  if (!JWT) throw new Error("Pinata JWT missing in .env");

  // Bundle file: salt(16) || iv(12) || ciphertext
  const blob = new Blob([salt, iv, ciphertext], {
    type: "application/octet-stream",
  });

  const form = new FormData();
  form.append("file", blob, fileName + ".encrypted");

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${JWT}` },
    body: form,
  });

  const json = await res.json();

  if (!json.IpfsHash) throw new Error("Upload failed: " + JSON.stringify(json));

  return json.IpfsHash;
}

// =====================================================================
// MAIN UPLOAD COMPONENT
// =====================================================================
const Upload = () => {
  const account = useSelector((state) => state.account);
  const [file, setFile] = useState(null);
  const [cid, setCid] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showDecrypt, setShowDecrypt] = useState(false);
  const [encryptionMessage, setEncryptionMessage] = useState(""); // Store message for decryption
  const [fileHash, setFileHash] = useState(""); // Store file hash for decryption
  const [fileName, setFileName] = useState(""); // Store original filename
  const [txHash, setTxHash] = useState(""); // Store blockchain transaction hash

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setFile(f || null);
    setCid("");
    setErr("");
    setSuccessMsg("");
    setShowDecrypt(false);
    setEncryptionMessage("");
    setFileHash("");
    setFileName("");
    setTxHash("");

    if (!f) return;
    if (f.size > MAX_SIZE) {
      setErr("File must be under 10MB");
      setFile(null);
    }
  };

  const handleEncryptUpload = async () => {
    try {
      if (!account.accountId) {
        return setErr("Please connect your MetaMask wallet first");
      }
      if (!file) return setErr("Choose a file first");

      setErr("");
      setLoading(true);

      // Read file buffer
      const fileBuffer = await file.arrayBuffer();

      // Compute file hash
      const hash = await hashFile(fileBuffer);
      setFileHash(hash);
      setFileName(file.name); // Store original filename

      // Create encryption message (deterministic - uses file hash only)
      const message = createEncryptionMessage(hash);
      setEncryptionMessage(message);

      // Request MetaMask signature
      setLoading(true);
      setErr("Please sign the message in MetaMask to encrypt your file...");
      
      const signature = await signMessageWithMetaMask(message);

      // Generate salt for key derivation
      const salt = crypto.getRandomValues(new Uint8Array(16));

      // Encrypt file using signature
      const { iv, ciphertext } = await encryptFileWithMetaMask(
        fileBuffer,
        signature,
        salt
      );

      // Upload encrypted blob to IPFS
      setErr("Uploading encrypted file to IPFS...");
      const fileCid = await uploadToPinata(salt, iv, ciphertext, file.name);

      // Store metadata on blockchain
      setErr("Storing metadata on Sepolia blockchain...");
      try {
        const blockchainResult = await uploadFileMetadata(
          fileCid,
          hash,
          file.name,
          file.size
        );
        setTxHash(blockchainResult.transactionHash);
        setErr(""); // Clear any previous errors
      } catch (blockchainError) {
        console.error("Blockchain upload error:", blockchainError);
        // Don't fail the entire upload if blockchain fails
        // File is already on IPFS, user can retry blockchain upload later
        if (blockchainError.code === 4001) {
          setErr("Blockchain upload cancelled. File is on IPFS but metadata not stored on-chain.");
        } else {
          setErr(`IPFS upload successful! Blockchain upload failed: ${blockchainError.message || "Unknown error"}`);
        }
      }

      setCid(fileCid);
    } catch (e) {
      console.error(e);
      if (e.code === 4001) {
        setErr("Encryption cancelled: You rejected the signature request");
      } else {
        setErr(e.message || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-wrapper">
      <div className="upload-box">

        <h1 className="upload-heading">Secure File Upload</h1>
        <p className="upload-text">
          Your file is encrypted locally using <span>MetaMask signatures</span> and <span>AES-256-GCM</span>.  
          You'll need to sign a message with MetaMask to encrypt your file.
        </p>

        {!account.accountId && (
          <p className="error-msg" style={{ marginBottom: 20 }}>
            Please connect your MetaMask wallet to encrypt files.
          </p>
        )}

        {/* FILE SELECTOR */}
        <div className="file-drop">
          <label className="drop-label">
            <input type="file" onChange={handleFileChange} />
            <div className="drop-content">
              <div className="drop-icon">🔒📁</div>
              <p className="drop-title">{file ? file.name : "Choose file"}</p>
              <p className="drop-subtitle">Max size 10MB</p>
            </div>
          </label>
        </div>

        {err && <p className="error-msg">{err}</p>}
        {successMsg && <p className="success-msg">{successMsg}</p>}

        {/* ENCRYPT + UPLOAD BTN */}
        <button
          className="upload-action"
          onClick={handleEncryptUpload}
          disabled={loading || !account.accountId}
        >
          {loading ? (err.includes("sign") ? "Waiting for signature..." : "Encrypting & Uploading...") : "Encrypt & Upload with MetaMask"}
        </button>

        {/* AFTER UPLOAD */}
        {cid && (
          <div className="cid-box success-box">
            <div className="success-header">
              <span className="success-icon">✅</span>
              <h3>File Encrypted & Uploaded!</h3>
            </div>
            
            <div className="info-section">
              <div className="info-item">
                <label>IPFS CID:</label>
                <div className="copyable-text">
                  <code className="cid-text">{cid}</code>
                  <button 
                    className="copy-btn-small" 
                    onClick={() => {
                      navigator.clipboard.writeText(cid);
                      setSuccessMsg("CID copied to clipboard!");
                      setTimeout(() => setSuccessMsg(""), 2000);
                    }}
                    title="Copy CID"
                  >
                    📋
                  </button>
                </div>
              </div>

              <div className="info-item">
                <label>File Hash:</label>
                <div className="copyable-text">
                  <code className="hash-text">{fileHash}</code>
                  <button 
                    className="copy-btn-small" 
                    onClick={() => {
                      navigator.clipboard.writeText(fileHash);
                      setSuccessMsg("File hash copied to clipboard!");
                      setTimeout(() => setSuccessMsg(""), 2000);
                    }}
                    title="Copy Hash"
                  >
                    📋
                  </button>
                </div>
              </div>

              {txHash && (
                <div className="info-item">
                  <label>Blockchain TX:</label>
                  <div className="copyable-text">
                    <code className="tx-text">
                      <a 
                        href={`https://sepolia.etherscan.io/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tx-link"
                      >
                        {txHash.slice(0, 10)}...{txHash.slice(-8)}
                      </a>
                    </code>
                    <button 
                      className="copy-btn-small" 
                      onClick={() => {
                        navigator.clipboard.writeText(txHash);
                        setSuccessMsg("Transaction hash copied!");
                        setTimeout(() => setSuccessMsg(""), 2000);
                      }}
                      title="Copy TX Hash"
                    >
                      📋
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="warning-box">
              <span className="warning-icon">⚠️</span>
              <p>
                {txHash 
                  ? "Metadata stored on Sepolia blockchain! Save the CID and File Hash to decrypt later."
                  : "Save the CID and File Hash to decrypt your file later! (Metadata not stored on blockchain)"}
              </p>
            </div>

            <button className="view-btn" onClick={() => setShowDecrypt(true)}>
              🔓 Decrypt File Now
            </button>
          </div>
        )}

        {/* SHOW DECRYPT COMPONENT */}
        {showDecrypt && (
          <DecryptFile 
            cid={cid} 
            encryptionMessage={encryptionMessage}
            fileHash={fileHash}
            fileName={fileName}
          />
        )}

      </div>
    </div>
  );
};

export default Upload;
