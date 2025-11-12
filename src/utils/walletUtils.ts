/**
 * Reusable wallet utility functions
 * Extracted from WalletConnectEnhanced for shared use across components
 */

/**
 * Format an Ethereum address to shortened display format
 * @param address - Full Ethereum address
 * @returns Formatted address (e.g., "0x1234...5678")
 */
export const formatAddress = (address: string | undefined): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Check if a wallet is a Coinbase Smart Wallet based on connector name
 * @param walletName - The connector name from Dynamic Labs
 * @returns boolean indicating if it's a Coinbase Smart Wallet
 */
export const isCoinbaseSmartWallet = (walletName: string | undefined | null): boolean => {
  if (!walletName) return false;
  const normalized = walletName.toLowerCase();
  return (
    walletName === 'Coinbase' ||
    walletName === 'Coinbase Smart Wallet' ||
    walletName === 'coinbase_smart_wallet' ||
    normalized === 'coinbase'
  );
};

/**
 * Get explorer URL for an address on a specific chain
 * @param address - Ethereum address
 * @param chainId - Chain ID (defaults to Base: 8453)
 * @returns Explorer URL
 */
export const getExplorerUrl = (address: string, chainId: number = 8453): string => {
  const explorerUrls: Record<number, string> = {
    8453: `https://basescan.org/address/${address}`, // Base
    1: `https://etherscan.io/address/${address}`, // Ethereum
    42161: `https://arbiscan.io/address/${address}`, // Arbitrum
    10: `https://optimistic.etherscan.io/address/${address}`, // Optimism
    59144: `https://lineascan.build/address/${address}`, // Linea
  };
  
  return explorerUrls[chainId] || explorerUrls[8453];
};

/**
 * Check if wallet balance is sufficient for fees
 * @param balance - Wallet balance (string or number)
 * @param threshold - Minimum balance threshold in ETH (default: 0.001)
 * @returns boolean indicating if balance is sufficient
 */
export const hasSufficientBalance = (
  balance: string | number | undefined | null,
  threshold: number = 0.001
): boolean => {
  if (!balance) return false;
  
  let balanceNum: number;
  if (typeof balance === 'string') {
    balanceNum = parseFloat(balance);
  } else {
    balanceNum = Number(balance);
  }
  
  return !isNaN(balanceNum) && balanceNum >= threshold;
};

