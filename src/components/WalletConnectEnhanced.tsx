import React, { useState, useRef, useEffect } from 'react';
import { 
  Wallet, 
  LogOut, 
  ChevronDown, 
  Copy, 
  ExternalLink, 
  Settings,
  Shield,
  CheckCircle,
  AlertCircle,
  Zap,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { useDynamicContext, useWalletOptions, useUserWallets, useSwitchWallet } from '@dynamic-labs/sdk-react-core';
import { formatAddress, isCoinbaseSmartWallet, getExplorerUrl } from '@/utils/walletUtils';

const WalletConnectEnhanced = () => {
  const { 
    setShowAuthFlow, 
    primaryWallet, 
    handleLogOut,
    setShowDynamicUserProfile,
    user 
  } = useDynamicContext();
  const { selectWalletOption } = useWalletOptions();
  const userWallets = useUserWallets();
  const switchWallet = useSwitchWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasEnoughFees, setHasEnoughFees] = useState<boolean | null>(null);
  const [isCheckingFees, setIsCheckingFees] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Get wallet info from the primary wallet
  const address = primaryWallet?.address;
  const walletName = primaryWallet?.connector?.name;

  // Check if it's Coinbase Smart Wallet for gas sponsorship
  const isCoinbase = isCoinbaseSmartWallet(walletName);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset fee checking state when closing
        setHasEnoughFees(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Check if wallet has enough fees for attestation (>$1 worth of ETH on Base)
  useEffect(() => {
    const checkFees = async () => {
      if (primaryWallet && isOpen && hasEnoughFees === null && !isCoinbase) {
        setIsCheckingFees(true);
        try {
          const walletBalance = await primaryWallet.getBalance();
          
          // Debug logging
          if (process.env.NODE_ENV === 'development') {
            console.log('Fee check debug:', {
              walletBalance,
              balanceType: typeof walletBalance,
              chainId: primaryWallet.chain,
              walletName: primaryWallet.connector?.name
            });
          }
          
          if (walletBalance) {
            // Handle both string and number formats, convert to number
            let balanceNum: number;
            if (typeof walletBalance === 'string') {
              balanceNum = parseFloat(walletBalance);
            } else {
              balanceNum = Number(walletBalance);
            }
            
            // Check if it's >= 0.001 ETH (more conservative estimate for ~$2-3)
            const hasEnough = balanceNum >= 0.001;
            
            // Debug logging
            if (process.env.NODE_ENV === 'development') {
              console.log('Balance check:', {
                originalBalance: walletBalance,
                parsedBalance: balanceNum,
                threshold: 0.001,
                hasEnough,
                isNaN: isNaN(balanceNum)
              });
            }
            
            setHasEnoughFees(isNaN(balanceNum) ? false : hasEnough);
          } else {
            setHasEnoughFees(false);
          }
        } catch (error) {
          console.error('Failed to check fees:', error);
          setHasEnoughFees(false);
        } finally {
          setIsCheckingFees(false);
        }
      }
    };

    checkFees();
  }, [primaryWallet, isOpen, hasEnoughFees, isCoinbase]);

  const copyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  const openInExplorer = () => {
    if (!address) return;
    const explorerUrl = getExplorerUrl(address, 8453); // Base chain
    window.open(explorerUrl, '_blank');
  };

  const handleConnect = () => {
    setShowAuthFlow(true);
  };

  const handleDisconnect = async () => {
    try {
      await handleLogOut();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const openUserProfile = () => {
    setShowDynamicUserProfile(true);
    setIsOpen(false);
  };

  const refreshFeeCheck = () => {
    setHasEnoughFees(null);
  };

  const connectToCoinbase = async () => {
    try {
      setIsOpen(false); // Close the dropdown
      
      // Check if user already has a Coinbase wallet connected
      const coinbaseWallet = userWallets.find(wallet => {
        const name = wallet.connector?.name;
        return (
          name === 'Coinbase' || 
          name === 'Coinbase Smart Wallet' ||
          name === 'coinbase_smart_wallet' ||
          name?.toLowerCase() === 'coinbase'
        );
      });
      
      if (coinbaseWallet) {
        // User already has Coinbase wallet connected, just switch to it
        console.log('Switching to existing Coinbase wallet');
        await switchWallet(coinbaseWallet.id);
      } else {
        // No Coinbase wallet connected, open the connection flow
        console.log('Connecting new Coinbase wallet');
        await selectWalletOption('coinbase');
      }
    } catch (error) {
      console.error('Failed to connect/switch to Coinbase:', error);
    }
  };


  // Show connect button if wallet not connected
  if (!primaryWallet || !address) {
    return (
      <button
        onClick={handleConnect}
        className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 via-purple-600 to-indigo-600 text-white hover:from-blue-600 hover:via-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
      >
        <Wallet className="w-5 h-5" />
        <span className="text-sm font-semibold">Connect Wallet</span>
      </button>
    );
  }

  // Connected state - enhanced UI
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 via-purple-600 to-indigo-600 text-white hover:from-blue-600 hover:via-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
      >
        <div className="flex items-center gap-2">
          {isCoinbase ? (
            <Shield className="w-5 h-5" />
          ) : (
            <Wallet className="w-5 h-5" />
          )}
          <span className="text-sm font-semibold">{formatAddress(address)}</span>
        </div>
        <ChevronDown className="w-4 h-4 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl bg-white ring-1 ring-gray-900/10 z-50 border border-gray-100 backdrop-blur-sm">
          <div className="p-0">
            
            {/* Header with wallet info */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-t-2xl border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    {isCoinbase ? 'Smart Wallet' : 'Connected Wallet'}
                  </div>
                  <div className="text-base font-semibold text-gray-900 mt-1 flex items-center gap-2">
                    {isCoinbase ? (
                      <>
                        <Shield className="w-5 h-5 text-blue-600" />
                        <span>Coinbase Smart Wallet</span>
                      </>
                    ) : walletName?.toLowerCase().includes('metamask') ? (
                      <>
                        <span className="text-lg">🦊</span>
                        <span>MetaMask</span>
                      </>
                    ) : (
                      <>
                        <Wallet className="w-5 h-5 text-gray-600" />
                        <span>{walletName || 'Unknown Wallet'}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Fee Status Section */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Transaction Fees</div>
                {!isCoinbase && (
                  <button
                    onClick={refreshFeeCheck}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Refresh balance check"
                  >
                    <RefreshCw className="w-3 h-3 text-gray-400" />
                  </button>
                )}
              </div>
              
              {isCoinbase ? (
                /* Coinbase Smart Wallet - Gas Sponsored */
                <div className="flex items-center gap-3">
                  <div className="bg-green-50 p-3 rounded-xl">
                    <Zap className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-green-700">Fees Sponsored</div>
                    <div className="text-xs text-green-600">Gas-free attestations on Base</div>
                  </div>
                </div>
              ) : (
                /* Regular Wallets - Fee Check */
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${
                      isCheckingFees ? 'bg-gray-50' : 
                      hasEnoughFees ? 'bg-green-50' : 'bg-amber-50'
                    }`}>
                      {isCheckingFees ? (
                        <div className="animate-spin w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                      ) : hasEnoughFees ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-amber-600" />
                      )}
                    </div>
                    <div>
                      <div className={`text-sm font-semibold ${
                        isCheckingFees ? 'text-gray-500' : 
                        hasEnoughFees ? 'text-green-700' : 'text-amber-700'
                      }`}>
                        {isCheckingFees ? 'Checking fees...' : 
                         hasEnoughFees ? 'Ready for attestations' : 'Low balance for fees'}
                      </div>
                      <div className={`text-xs ${
                        isCheckingFees ? 'text-gray-400' : 
                        hasEnoughFees ? 'text-green-600' : 'text-amber-600'
                      }`}>
                        {isCheckingFees ? 'Verifying wallet balance on Base' : 
                         hasEnoughFees ? 'Sufficient ETH for Base attestations' : 'Add ETH to Base or use gas-free option'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Coinbase Smart Wallet Promotion - Show for everyone except Coinbase users */}
                  <div className="pt-2">
                    <button 
                      onClick={connectToCoinbase}
                      className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl border border-blue-200 transition-all duration-200 hover:scale-105"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <Shield className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-semibold text-blue-700">Want Sponsored Fees?</div>
                          <div className="text-xs text-blue-600">Connect Coinbase Smart Wallet</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>


            {/* Quick Actions */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">Quick Actions</div>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={copyAddress}
                  className="flex flex-col items-center p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 hover:scale-105"
                >
                  <Copy className="w-5 h-5 text-gray-600 mb-1" />
                  <span className="text-xs font-medium text-gray-600">
                    {copied ? 'Copied!' : 'Copy'}
                  </span>
                </button>
                
                <button
                  onClick={openInExplorer}
                  className="flex flex-col items-center p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 hover:scale-105"
                >
                  <ExternalLink className="w-5 h-5 text-gray-600 mb-1" />
                  <span className="text-xs font-medium text-gray-600">Explorer</span>
                </button>

                <button 
                  onClick={openUserProfile}
                  className="flex flex-col items-center p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 hover:scale-105"
                >
                  <Settings className="w-5 h-5 text-gray-600 mb-1" />
                  <span className="text-xs font-medium text-gray-600">Profile</span>
                </button>
              </div>
            </div>

            {/* Address Display */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Address</div>
              <div className="font-mono text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg break-all border border-gray-200">
                {address}
              </div>
            </div>

            {/* User Info */}
            {user && (
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">User</div>
                <div className="text-sm font-medium text-gray-900">
                  {user.email || user.alias || 'Anonymous User'}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="px-6 py-5 space-y-3">
              <button
                onClick={openUserProfile}
                className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-105"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Account
              </button>
              
              <button
                onClick={handleDisconnect}
                className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 hover:scale-105"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Disconnect Wallet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletConnectEnhanced;
