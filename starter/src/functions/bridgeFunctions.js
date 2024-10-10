import axios from 'axios';
import { ethers } from 'ethers';

// for ETH chain
const spokePoolAddress = "0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5"; // Ethereum SpokePool

const erc20ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function allowance(address owner, address spender) public view returns (uint256)"
];

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