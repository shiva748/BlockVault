import React, { useState } from "react";
import { useSelector } from "react-redux";
import {
  createEncryptionMessage,
  signMessageWithMetaMask,
  decryptFileWithMetaMask,
} from "../utils/metamaskEncryption";
import "./Decrypt.css";

const DecryptFile = ({ cid, encryptionMessage, fileHash, fileName }) => {
  const account = useSelector((state) => state.account);
  const [inputFileHash, setInputFileHash] = useState(fileHash || "");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [outputURL, setOutputURL] = useState(null);
  const [signing, setSigning] = useState(false);
  const [fileType, setFileType] = useState("");
  const [decryptedFileName, setDecryptedFileName] = useState("");

  const startDecryption = async () => {
    try {
      setErrorMsg("");
      setOutputURL(null);

      if (!account.accountId) {
        return setErrorMsg("Please connect your MetaMask wallet first");
      }
      if (!cid) {
        return setErrorMsg("Missing CID");
      }

      // Determine which file hash to use
      const hashToUse = fileHash || inputFileHash;
      if (!hashToUse) {
        return setErrorMsg("Please provide the file hash used during encryption");
      }

      setLoading(true);

      // Create the same encryption message (must match encryption message exactly)
      const message = encryptionMessage || createEncryptionMessage(hashToUse);

      // Request MetaMask signature
      setSigning(true);
      setErrorMsg("Please sign the message in MetaMask to decrypt your file...");
      
      const signature = await signMessageWithMetaMask(message);
      setSigning(false);

      // Fetch encrypted file from IPFS
      setErrorMsg("Fetching encrypted file from IPFS...");
      const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
      if (!res.ok) throw new Error("Failed to fetch file from IPFS");
      
      const blob = await res.blob();
      const encryptedBuf = new Uint8Array(await blob.arrayBuffer());

      // encryptedBuf = salt(16) || iv(12) || ciphertext...
      if (encryptedBuf.length < 16 + 12) {
        throw new Error("Encrypted file too short / corrupted");
      }

      const salt = encryptedBuf.slice(0, 16);
      const iv = encryptedBuf.slice(16, 28);
      const ciphertext = encryptedBuf.slice(28);

      // Decrypt using MetaMask signature
      setErrorMsg("Decrypting file...");
      const decryptedBytes = await decryptFileWithMetaMask(
        ciphertext,
        signature,
        salt,
        iv
      );

      // Determine file type and name
      let finalFileName = fileName || "decrypted-file";
      let detectedType = "";
      
      // Try to detect file type from first bytes
      const firstBytes = decryptedBytes.slice(0, 4);
      const hex = Array.from(firstBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Common file signatures
      if (hex.startsWith('ffd8ff')) {
        detectedType = 'image/jpeg';
        if (!finalFileName.endsWith('.jpg') && !finalFileName.endsWith('.jpeg')) {
          finalFileName = finalFileName.replace(/\.[^/.]+$/, '') + '.jpg';
        }
      } else if (hex.startsWith('89504e47')) {
        detectedType = 'image/png';
        if (!finalFileName.endsWith('.png')) {
          finalFileName = finalFileName.replace(/\.[^/.]+$/, '') + '.png';
        }
      } else if (hex.startsWith('47494638')) {
        detectedType = 'image/gif';
        if (!finalFileName.endsWith('.gif')) {
          finalFileName = finalFileName.replace(/\.[^/.]+$/, '') + '.gif';
        }
      } else if (hex.startsWith('25504446')) {
        detectedType = 'application/pdf';
        if (!finalFileName.endsWith('.pdf')) {
          finalFileName = finalFileName.replace(/\.[^/.]+$/, '') + '.pdf';
        }
      } else if (hex.startsWith('504b0304')) {
        detectedType = 'application/zip';
        if (!finalFileName.endsWith('.zip')) {
          finalFileName = finalFileName.replace(/\.[^/.]+$/, '') + '.zip';
        }
      }

      const fileBlob = new Blob([decryptedBytes], { type: detectedType || 'application/octet-stream' });
      const url = URL.createObjectURL(fileBlob);
      setOutputURL(url);
      setFileType(detectedType);
      setDecryptedFileName(finalFileName);
      setErrorMsg(""); // Clear any previous errors
    } catch (err) {
      console.error(err);
      if (err.code === 4001) {
        setErrorMsg("Decryption cancelled: You rejected the signature request");
      } else {
        setErrorMsg("Decryption failed: " + (err.message || String(err)));
      }
    } finally {
      setLoading(false);
      setSigning(false);
    }
  };

  return (
    <div className="upload-wrapper">
      <div className="upload-box">
        <div className="decrypt-header">
          <h1 className="upload-heading">🔓 Decrypt File</h1>
          <p className="decrypt-subtitle">
            Sign the same message with MetaMask that was used during encryption to decrypt your file.
          </p>
        </div>

        {!fileHash && (
          <div className="input-group">
            <label className="input-label">
              File Hash (from encryption):
            </label>
            <input
              type="text"
              className="hash-input"
              placeholder="Enter the file hash used during encryption"
              value={inputFileHash}
              onChange={(e) => setInputFileHash(e.target.value)}
            />
            <p className="input-hint">
              💡 This is the SHA-256 hash of your file. Save it when you encrypt.
            </p>
          </div>
        )}

        {encryptionMessage && (
          <div className="message-box">
            <strong className="message-label">Encryption Message:</strong>
            <pre className="message-text">
              {encryptionMessage}
            </pre>
          </div>
        )}

        {!account.accountId && (
          <p className="error-msg" style={{ marginBottom: 16 }}>
            Please connect your MetaMask wallet to decrypt files.
          </p>
        )}

        <button
          className="upload-action"
          onClick={startDecryption}
          disabled={loading || !account.accountId || (!fileHash && !inputFileHash)}
        >
          {loading
            ? signing
              ? "Waiting for signature..."
              : "Decrypting..."
            : "Decrypt with MetaMask"}
        </button>

        {errorMsg && <p className="error-msg">{errorMsg}</p>}

        {outputURL && (
          <div className="cid-box success-box">
            <div className="success-header">
              <span className="success-icon">✅</span>
              <h4>File Decrypted Successfully!</h4>
            </div>

            {/* File Preview */}
            {fileType.startsWith('image/') ? (
              <div className="file-preview">
                <img
                  src={outputURL}
                  alt="Decrypted"
                  className="preview-image"
                />
              </div>
            ) : fileType === 'application/pdf' ? (
              <div className="file-preview">
                <div className="file-icon">📄</div>
                <p className="file-type-label">PDF Document</p>
              </div>
            ) : (
              <div className="file-preview">
                <div className="file-icon">📎</div>
                <p className="file-type-label">{decryptedFileName}</p>
              </div>
            )}

            <div className="download-section">
              <a 
                className="view-btn download-btn" 
                href={outputURL} 
                download={decryptedFileName}
              >
                <span>⬇️</span> Download {decryptedFileName}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DecryptFile;
