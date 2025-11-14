import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { getUserFiles, getFileMetadata } from "../utils/blockchain";
import DecryptFile from "../components/Decrypt";
import "./MyFiles.css";

const MyFiles = () => {
  const account = useSelector((state) => state.account);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [showDecrypt, setShowDecrypt] = useState(false);

  useEffect(() => {
    if (account.accountId) {
      loadUserFiles();
    }
  }, [account.accountId]);

  const loadUserFiles = async () => {
    if (!account.accountId) {
      setError("Please connect your wallet first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Get all file hashes for the user
      const fileHashes = await getUserFiles(account.accountId);

      if (fileHashes.length === 0) {
        setFiles([]);
        setError("No files found. Upload your first file to get started!");
        setLoading(false);
        return;
      }

      // Fetch metadata for each file
      const filesData = await Promise.all(
        fileHashes.map(async (hash) => {
          try {
            const metadata = await getFileMetadata(hash);
            return {
              ...metadata,
              fileHash: hash,
            };
          } catch (err) {
            console.error(`Error fetching metadata for ${hash}:`, err);
            return null;
          }
        })
      );

      // Filter out null values and sort by timestamp (newest first)
      const validFiles = filesData
        .filter((file) => file !== null)
        .sort((a, b) => b.timestamp - a.timestamp);

      setFiles(validFiles);
    } catch (err) {
      console.error("Error loading user files:", err);
      setError(err.message || "Failed to load files. Make sure you're on Sepolia testnet.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewFile = (file) => {
    setSelectedFile(file);
    setShowDecrypt(true);
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "🖼️";
    if (["pdf"].includes(ext)) return "📄";
    if (["zip", "rar", "7z"].includes(ext)) return "📦";
    if (["txt", "md"].includes(ext)) return "📝";
    if (["mp4", "avi", "mov"].includes(ext)) return "🎬";
    if (["mp3", "wav"].includes(ext)) return "🎵";
    return "📎";
  };

  if (!account.accountId) {
    return (
      <div className="myfiles-wrapper">
        <div className="myfiles-box">
          <h1 className="myfiles-heading">My Files</h1>
          <p className="myfiles-error">
            Please connect your MetaMask wallet to view your files.
          </p>
        </div>
      </div>
    );
  }

  if (showDecrypt && selectedFile) {
    return (
      <div className="myfiles-wrapper">
        <div className="myfiles-box">
          <button
            className="back-btn"
            onClick={() => {
              setShowDecrypt(false);
              setSelectedFile(null);
            }}
          >
            ← Back to My Files
          </button>
          <DecryptFile
            cid={selectedFile.cid}
            fileHash={selectedFile.fileHash}
            fileName={selectedFile.fileName}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="myfiles-wrapper">
      <div className="myfiles-box">
        <div className="myfiles-header">
          <h1 className="myfiles-heading">📁 My Files</h1>
          <button className="refresh-btn" onClick={loadUserFiles} disabled={loading}>
            {loading ? "⏳" : "🔄"} Refresh
          </button>
        </div>

        {loading && files.length === 0 && (
          <div className="loading-state">
            <div className="loader-large"></div>
            <p>Loading your files from blockchain...</p>
          </div>
        )}

        {error && !loading && (
          <div className="error-state">
            <p className="error-text">{error}</p>
            {error.includes("No files found") && (
              <button className="upload-link-btn" onClick={() => window.location.href = "/"}>
                Upload Your First File
              </button>
            )}
          </div>
        )}

        {!loading && files.length > 0 && (
          <>
            <div className="files-stats">
              <span className="stat-item">
                <strong>{files.length}</strong> {files.length === 1 ? "file" : "files"}
              </span>
              <span className="stat-item">
                Total Size: <strong>{formatFileSize(files.reduce((sum, f) => sum + f.fileSize, 0))}</strong>
              </span>
            </div>

            <div className="files-grid">
              {files.map((file, index) => (
                <div key={file.fileHash} className="file-card">
                  <div className="file-card-header">
                    <span className="file-icon-large">{getFileIcon(file.fileName)}</span>
                    <div className="file-card-info">
                      <h3 className="file-name" title={file.fileName}>
                        {file.fileName}
                      </h3>
                      <p className="file-meta">
                        {formatFileSize(file.fileSize)} • {formatDate(file.timestamp)}
                      </p>
                    </div>
                  </div>

                  <div className="file-card-details">
                    <div className="detail-row">
                      <span className="detail-label">CID:</span>
                      <code className="detail-value" title={file.cid}>
                        {file.cid.slice(0, 20)}...
                      </code>
                      <button
                        className="copy-btn-tiny"
                        onClick={() => {
                          navigator.clipboard.writeText(file.cid);
                          setError("CID copied!");
                          setTimeout(() => setError(""), 2000);
                        }}
                        title="Copy CID"
                      >
                        📋
                      </button>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Hash:</span>
                      <code className="detail-value" title={file.fileHash}>
                        {file.fileHash.slice(0, 20)}...
                      </code>
                      <button
                        className="copy-btn-tiny"
                        onClick={() => {
                          navigator.clipboard.writeText(file.fileHash);
                          setError("Hash copied!");
                          setTimeout(() => setError(""), 2000);
                        }}
                        title="Copy Hash"
                      >
                        📋
                      </button>
                    </div>
                  </div>

                  <button
                    className="view-file-btn"
                    onClick={() => handleViewFile(file)}
                  >
                    🔓 Decrypt & View
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {error && error.includes("copied") && (
          <div className="success-toast">{error}</div>
        )}
      </div>
    </div>
  );
};

export default MyFiles;

