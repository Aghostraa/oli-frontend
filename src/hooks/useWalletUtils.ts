import { useEffect, useState } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { formatAddress, isCoinbaseSmartWallet, hasSufficientBalance } from '@/utils/walletUtils';

/**
 * Hook for wallet utilities extracted from WalletConnectEnhanced
 * Provides reusable wallet state and utilities
 */
export const useWalletUtils = () => {
  const { primaryWallet } = useDynamicContext();
  const [balance, setBalance] = useState<string | number | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [hasEnoughFees, setHasEnoughFees] = useState<boolean | null>(null);

  const address = primaryWallet?.address;
  const walletName = primaryWallet?.connector?.name;
  const isCoinbase = isCoinbaseSmartWallet(walletName);

  // Check wallet balance for fee estimation
  useEffect(() => {
    const checkBalance = async () => {
      if (!primaryWallet || isCoinbase) {
        setHasEnoughFees(null);
        return;
      }

      setIsCheckingBalance(true);
      try {
        const walletBalance = await primaryWallet.getBalance();
        setBalance(walletBalance ?? null);
        
        if (walletBalance) {
          const sufficient = hasSufficientBalance(walletBalance, 0.001);
          setHasEnoughFees(sufficient);
        } else {
          setHasEnoughFees(false);
        }
      } catch (error) {
        console.error('Failed to check balance:', error);
        setHasEnoughFees(false);
      } finally {
        setIsCheckingBalance(false);
      }
    };

    checkBalance();
  }, [primaryWallet, isCoinbase]);

  const refreshBalance = () => {
    setBalance(null);
    setHasEnoughFees(null);
  };

  return {
    address,
    walletName,
    isCoinbaseSmartWallet: isCoinbase,
    formattedAddress: formatAddress(address),
    balance,
    isCheckingBalance,
    hasEnoughFees,
    refreshBalance,
    primaryWallet,
  };
};

