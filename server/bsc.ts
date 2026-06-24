import { readDb, writeDb, addSystemLog } from "./db.js";

const BSC_RPC_URLS = [
  "https://bsc-dataseed.binance.org",
  "https://bsc-rpc.publicnode.com",
  "https://binance.llamarpc.com"
];

// BSC USDT contract address
const BSC_USDT_CONTRACT = "0x55d398326f99059ff775485246999027b3197955".toLowerCase();

async function callRpc(method: string, params: any[]): Promise<any> {
  let lastError = null;
  for (const url of BSC_RPC_URLS) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method,
          params
        }),
      });
      if (!response.ok) continue;
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
      }
      return data.result;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("All BSC RPC nodes failed");
}

export interface VerificationResult {
  success: boolean;
  message: string;
  amount?: number;
  token?: "USDT" | "BNB";
  fromAddress?: string;
  blockNumber?: number;
}

/**
 * Verifies a transaction hash on Binance Smart Chain
 */
export async function verifyBscTransaction(
  txnHash: string,
  expectedReceiver: string
): Promise<VerificationResult> {
  const hash = txnHash.trim().toLowerCase();
  if (!/^0x([A-Fa-f0-9]{64})$/.test(hash)) {
    return { success: false, message: "Invalid transaction hash format. Must be a 64-character hex starting with 0x." };
  }

  // Support UI-testing simulation if the transaction hash is a special local test hash
  if (hash === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    return {
      success: true,
      message: "[Simulation] Simulated 10.00 USDT test transfer verified successfully.",
      amount: 10.00,
      token: "USDT",
      fromAddress: "0xTestUserWalletAddressDemo",
      blockNumber: 38291040
    };
  }
  if (hash === "0x1111111111111111111111111111111111111111111111111111111111111111") {
    return {
      success: true,
      message: "[Simulation] Simulated 25.00 USDT test transfer verified successfully.",
      amount: 25.00,
      token: "USDT",
      fromAddress: "0xTestUserWalletAddressDemo",
      blockNumber: 38291041
    };
  }

  try {
    addSystemLog("info", `Looking up transaction hash: ${hash} on BSC RPC`);

    // Fetch transaction details
    const tx = await callRpc("eth_getTransactionByHash", [hash]);
    if (!tx) {
      return { success: false, message: "Transaction not found on Binance Smart Chain mainnet. Double check the hash or try a mock hash." };
    }

    // Fetch receipt (for status)
    const receipt = await callRpc("eth_getTransactionReceipt", [hash]);
    if (!receipt) {
      return { success: false, message: "Transaction receipt not generated yet. It might be pending." };
    }

    // Verify status is success
    const status = receipt.status;
    if (status !== "0x1" && status !== 1) {
      return { success: false, message: "Transaction failed on the blockchain (reverted)." };
    }

    // Fetch current block for confirmations
    const currentBlockHex = await callRpc("eth_blockNumber", []);
    const currentBlock = parseInt(currentBlockHex, 16);
    const txBlock = parseInt(tx.blockNumber, 16);
    const confirmations = currentBlock - txBlock + 1;

    if (confirmations < 3) {
      return {
        success: false,
        message: `Transaction verified, but has only ${confirmations}/3 confirmations. Please wait a few seconds and try again.`,
      };
    }

    const txTo = (tx.to || "").toLowerCase();
    const receiverLower = expectedReceiver.toLowerCase();

    // Check if it's Native BNB transfer
    if (txTo === receiverLower) {
      const weiValue = BigInt(tx.value);
      // BNB decimals = 18
      const bnbValue = Number(weiValue) / 1e18;
      if (bnbValue === 0) {
        return { success: false, message: "Transaction has 0 BNB value." };
      }

      addSystemLog("info", `Verified BNB transfer of ${bnbValue} BNB to ${expectedReceiver} with ${confirmations} confirmations.`);
      return {
        success: true,
        message: `Native BNB transaction verified! Received ${bnbValue.toFixed(4)} BNB.`,
        amount: bnbValue * 300, // Approximate exchange rate or direct credit
        token: "BNB",
        fromAddress: tx.from,
        blockNumber: txBlock,
      };
    }

    // Check if it's BEP-20 USDT transfer (routing to USDT contract)
    if (txTo === BSC_USDT_CONTRACT) {
      const input = tx.input;
      if (!input || !input.startsWith("0xa9059cbb")) {
        return { success: false, message: "Not a token transfer function call on the USDT contract." };
      }

      // ERC20 transfer(address,uint256) inputs:
      // MethodID (0xa9059cbb) - 4 bytes
      // Param 1: recipient address - 32 bytes (padded)
      // Param 2: amount - 32 bytes (padded)
      const recipientHex = input.slice(10, 74);
      const amountHex = input.slice(74, 138);

      const recipientAddress = "0x" + recipientHex.slice(24).toLowerCase();
      const amountValue = BigInt("0x" + amountHex);
      // BSC USDT has 18 decimals
      const usdtValue = Number(amountValue) / 1e18;

      if (recipientAddress !== receiverLower) {
        return {
          success: false,
          message: `USDT transaction is valid, but the receiver address (${recipientAddress}) is not our registered wallet (${receiverLower}).`,
        };
      }

      addSystemLog("info", `Verified BEP-20 USDT transfer of ${usdtValue} USDT to ${expectedReceiver} with ${confirmations} confirmations.`);
      return {
        success: true,
        message: `BEP-20 USDT transaction verified! Received ${usdtValue.toFixed(2)} USDT.`,
        amount: usdtValue,
        token: "USDT",
        fromAddress: tx.from,
        blockNumber: txBlock,
      };
    }

    return {
      success: false,
      message: `Transaction sent to ${txTo}, which is neither our wallet address nor the BSC USDT token contract.`,
    };
  } catch (error: any) {
    console.error("BSC transaction verification error:", error);
    addSystemLog("error", `BSC Verification Error: ${error.message || error}`);
    return {
      success: false,
      message: `Error querying blockchain: ${error.message || "Unknown connection error"}.`,
    };
  }
}
