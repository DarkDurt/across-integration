'use client'

import dynamic from 'next/dynamic'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Loader2, Wallet } from "lucide-react"
import React from 'react'
import { ethers } from 'ethers'
import { initiateBridgeDeposit, checkAllowance, approveToken } from '@/functions/bridgeFunctions';

const tokens = [
  { symbol: 'USDC', name: 'USD Coin' },
]

const TokenBridgeClient = dynamic(() => Promise.resolve(BridgeComponent), { ssr: false })

function BridgeComponent() {
  const [amount, setAmount] = React.useState('')
  const [selectedToken, setSelectedToken] = React.useState('')
  const [bridging, setBridging] = React.useState(false)
  const [approving, setApproving] = React.useState(false)
  const [bridgeComplete, setBridgeComplete] = React.useState(false)
  const [walletConnected, setWalletConnected] = React.useState(false)
  const [account, setAccount] = React.useState('')
  const [hasAllowance, setHasAllowance] = React.useState(false)
  const tokenAddress = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" // USDC on Ethereum

  const handleBridge = async (e) => {
    e.preventDefault()
    if (!amount || !selectedToken) return

    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const signer = await provider.getSigner()
    const amountInWei = ethers.utils.parseUnits(amount, 6) // Assuming USDC has 6 decimals
  
    if (!hasAllowance) {
      setApproving(true)
      try {
        const approvalTx = await approveToken(signer, tokenAddress, amountInWei)
        console.log("Approval transaction hash:", approvalTx)
        setHasAllowance(true)
      } catch (error) {
        console.error("Approval failed:", error)
      } finally {
        setApproving(false)
      }
    } else {
      setBridging(true)
      try {
        const txHash = await initiateBridgeDeposit(signer, tokenAddress, amountInWei)
        console.log("Bridge transaction hash:", txHash)
        setBridgeComplete(true)
      } catch (error) {
        console.error("Bridge failed:", error)
      } finally {
        setBridging(false)
      }
    }
  }

  const handleConnectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' })
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const signer = provider.getSigner()
        const address = await signer.getAddress()
        setAccount(address)
        setWalletConnected(true)

        // Check allowance after connecting wallet
        const amountInWei = ethers.utils.parseUnits(amount || '0', 6)
        const allowance = await checkAllowance(signer, tokenAddress, amountInWei)
        setHasAllowance(allowance)
      } catch (error) {
        console.error('Error connecting to wallet:', error)
      }
    } else {
      console.log('Please install MetaMask!')
    }
  }

  React.useEffect(() => {
    const checkAllowanceEffect = async () => {
      if (walletConnected && amount) {
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const signer = provider.getSigner()
        const amountInWei = ethers.utils.parseUnits(amount, 6)
        const allowance = await checkAllowance(signer, tokenAddress, amountInWei)
        setHasAllowance(allowance)
      }
    }
    checkAllowanceEffect()
  }, [walletConnected, amount])

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Bridge Tokens</CardTitle>
          <Button 
            variant="outline" 
            onClick={handleConnectWallet}
            disabled={walletConnected}
          >
            {walletConnected ? (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                {account.slice(0, 6)}...{account.slice(-4)}
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet
              </>
            )}
          </Button>
        </div>
        <CardDescription>Transfer tokens from Ethereum to Optimism</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleBridge} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="token">Select Token</Label>
            <Select value={selectedToken} onValueChange={setSelectedToken} required>
              <SelectTrigger id="token">
                <SelectValue placeholder="Select token" />
              </SelectTrigger>
              <SelectContent>
                {tokens.map((token) => (
                  <SelectItem key={token.symbol} value={token.symbol}>
                    {token.name} ({token.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={bridging || approving || bridgeComplete || !walletConnected || !amount || !selectedToken}
          >
            {bridging ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Bridging...
              </>
            ) : approving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Approving...
              </>
            ) : !hasAllowance ? (
              <>
                Approve
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Bridge to Optimism
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        {bridgeComplete && (
          <p className="text-sm text-green-600 font-medium">
            Bridge complete! Tokens transferred to Optimism.
          </p>
        )}
      </CardFooter>
    </Card>
  )
}

export default function Bridge() {
  return <TokenBridgeClient />
}