import { ethers } from "ethers";
import store from "../redux/store";

// Contract ABI - Update this after deployment
const BLOCKVAULT_ABI = [
  "function uploadFileMetadata(string memory _cid, string memory _fileHash, string memory _fileName, uint256 _fileSize) external",
  "function getFileMetadata(string memory _fileHash) external view returns (tuple(string cid, string fileHash, address owner, uint256 timestamp, string fileName, uint256 fileSize))",
  "function getUserFiles(address _user) external view returns (string[] memory)",
  "function getUserFileCount(address _user) external view returns (uint256)",
  "function fileExists(string memory _fileHash) external view returns (bool)",
  "function totalFiles() external view returns (uint256)",
  "event FileUploaded(string indexed fileHash, string cid, address indexed owner, uint256 timestamp, string fileName, uint256 fileSize)"
];

// Contract address - UPDATE THIS AFTER DEPLOYMENT
// Get this from Remix after deploying the contract
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || "";

/**
 * Get the BlockVault contract instance
 */
export async function getBlockVaultContract() {
  if (!window.ethereum) {
    throw new Error("MetaMask not found. Please install MetaMask.");
  }

  if (!CONTRACT_ADDRESS) {
    throw new Error("Contract address not set. Please set REACT_APP_CONTRACT_ADDRESS in .env file");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const state = store.getState();
  const activeAccount = state?.account?.accountId;
  const signer = activeAccount
    ? await provider.getSigner(activeAccount)
    : await provider.getSigner();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, BLOCKVAULT_ABI, signer);
  
  return contract;
}

/**
 * Upload file metadata to blockchain
 */
export async function uploadFileMetadata(cid, fileHash, fileName, fileSize) {
  try {
    const contract = await getBlockVaultContract();
    
    // Ethers v6 automatically handles number to BigNumber conversion
    // File size is passed as-is (uint256 in contract)
    
    // Call the contract function
    const tx = await contract.uploadFileMetadata(
      cid,
      fileHash,
      fileName,
      fileSize
    );
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    
    return {
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error("Error uploading metadata to blockchain:", error);
    throw error;
  }
}

/**
 * Get file metadata from blockchain
 */
export async function getFileMetadata(fileHash) {
  try {
    const contract = await getBlockVaultContract();
    const metadata = await contract.getFileMetadata(fileHash);
    
    return {
      cid: metadata.cid,
      fileHash: metadata.fileHash,
      owner: metadata.owner,
      timestamp: Number(metadata.timestamp),
      fileName: metadata.fileName,
      fileSize: Number(metadata.fileSize)
    };
  } catch (error) {
    console.error("Error fetching metadata from blockchain:", error);
    throw error;
  }
}

/**
 * Get all files for a user
 */
export async function getUserFiles(userAddress) {
  try {
    const contract = await getBlockVaultContract();
    const fileHashes = await contract.getUserFiles(userAddress);
    return fileHashes;
  } catch (error) {
    console.error("Error fetching user files:", error);
    throw error;
  }
}

/**
 * Get user file count
 */
export async function getUserFileCount(userAddress) {
  try {
    const contract = await getBlockVaultContract();
    const count = await contract.getUserFileCount(userAddress);
    return Number(count);
  } catch (error) {
    console.error("Error fetching user file count:", error);
    throw error;
  }
}

/**
 * Check if file exists
 */
export async function fileExists(fileHash) {
  try {
    const contract = await getBlockVaultContract();
    const exists = await contract.fileExists(fileHash);
    return exists;
  } catch (error) {
    console.error("Error checking file existence:", error);
    return false;
  }
}

/**
 * Get total files count
 */
export async function getTotalFiles() {
  try {
    const contract = await getBlockVaultContract();
    const total = await contract.totalFiles();
    return Number(total);
  } catch (error) {
    console.error("Error fetching total files:", error);
    throw error;
  }
}

/**
 * Listen for FileUploaded events
 */
export async function listenForFileUploads(callback) {
  try {
    const contract = await getBlockVaultContract();
    
    contract.on("FileUploaded", (fileHash, cid, owner, timestamp, fileName, fileSize, event) => {
      callback({
        fileHash,
        cid,
        owner,
        timestamp: Number(timestamp),
        fileName,
        fileSize: Number(fileSize),
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber
      });
    });
    
    return () => {
      contract.removeAllListeners("FileUploaded");
    };
  } catch (error) {
    console.error("Error setting up event listener:", error);
    throw error;
  }
}

