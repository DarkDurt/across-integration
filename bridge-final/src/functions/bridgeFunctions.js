import axios from 'axios';
import { ethers } from 'ethers';

// for ETH chain
const spokePoolAddress = "0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5"; // Ethereum SpokePool
const spokePoolABI = [
    "function depositV3(address depositor, address recipient, address inputToken, address outputToken, uint256 inputAmount, uint256 outputAmount, uint256 destinationChainId, address exclusiveRelayer, uint32 quoteTimestamp, uint32 fillDeadline, uint32 exclusivityDeadline, bytes calldata message) external",
];

const erc20ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function allowance(address owner, address spender) public view returns (uint256)"
];

const originChainId = 1 // ETH chain id
const destinationChainId = 10 // OPTIMISM chain id

// step 1: Request a Quote
export async function fetchBridgeQuote(tokenAddress, amount, originChainId, destinationChainId) {
  try {
    const quoteResponse = await axios.get("https://app.across.to/api/suggested-fees", {
      params: {
        token: tokenAddress,
        originChainId,
        destinationChainId,
        amount: amount.toString(),
      },
    });

    return quoteResponse.data;
  } catch (error) {
    console.error("Error fetching bridge quote:", error);
    throw error;
  }
}

// step 2: Initiating a Deposit (User Intent)
export async function initiateBridgeDeposit(signer, tokenAddress, amount) {
  const quoteData = await fetchBridgeQuote(tokenAddress, amount, originChainId, destinationChainId) 
  const spokePool = new ethers.Contract(spokePoolAddress, spokePoolABI, signer);

  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  
  // The outputAmount is set as the inputAmount - relay fees.
  // totalRelayFee.total is returned by the Across API suggested-fees
  // endpoint.
  const outputAmount = amount.sub(ethers.BigNumber.from(quoteData.totalRelayFee.total));
  const fillDeadline = Math.round(Date.now() / 1000) + 18000; // 5 hours from now

  // No message will be executed post-fill on the destination chain.
  const message = "0x";
  const userAddress = await signer.getAddress();

  try {
    // Initiate the deposit
    const tx = await spokePool.depositV3(
      userAddress,
      userAddress,
      tokenAddress,
      ZERO_ADDRESS,
      amount,
      outputAmount,
      destinationChainId,
      quoteData.exclusiveRelayer,
      quoteData.timestamp,
      fillDeadline,
      quoteData.exclusivityDeadline,
      message,
      {
        gasLimit: 500000,
      }
    );

    console.log("Deposit transaction sent:", tx.hash);

    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    console.log("Deposit transaction confirmed:", receipt.transactionHash);

    return receipt.transactionHash;
  } catch (error) {
    console.error("Error initiating bridge deposit:", error);
    throw error;
  }
}

export async function checkAllowance(signer, tokenAddress, amount) {
  const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, signer);
  const allowance = await tokenContract.allowance(signer.getAddress(), spokePoolAddress);
  return allowance.gte(amount);
}

export async function approveToken(signer, tokenAddress, amount) {
  const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, signer);
  const tx = await tokenContract.approve(spokePoolAddress, amount);
  await tx.wait();
  return tx.hash;
}