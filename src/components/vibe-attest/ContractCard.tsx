'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { UnlabeledContract } from '@/types/unlabeledContracts';
import { CHAINS } from '@/constants/chains';
import { fetchAttestationsByContract, Attestation } from '@/services/attestationService';
import AttestationList from './AttestationList';
import { resolveEnsName, getEnscribeUrl, EnsState } from '@/utils/ens';

// Cache for storing attestation results during the session
const attestationCache: Record<string, Attestation[]> = {};

interface ParsedAttestation {
  attester: string;
  timeCreated: number;
  txid: string;
  isOffchain: boolean;
  tags: any[];
  chainId?: string;
}

interface ContractCardProps {
  contract: UnlabeledContract;
  onSelect: () => void;
  onSelectWithAttestation?: (attestation: ParsedAttestation) => void;
}

const ContractCard: React.FC<ContractCardProps> = ({ contract, onSelect, onSelectWithAttestation }) => {
  const [copied, setCopied] = useState(false);
  const [isCheckingAttestations, setIsCheckingAttestations] = useState(false);
  const [hasAttestations, setHasAttestations] = useState(false);
  const [attestationCount, setAttestationCount] = useState(0);
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [showAttestationList, setShowAttestationList] = useState(false);
  const [hasBeenInView, setHasBeenInView] = useState(false);
  const [ensState, setEnsState] = useState<EnsState>({
    resolution: null,
    loading: false,
    error: null
  });
  const ensResolution = ensState.resolution;
  const ensName = ensResolution?.name || null;
  
  const cardRef = useRef<HTMLDivElement>(null);

  // Format full address for display
  function formatFullAddress(address: string): string {
    if (!address) return '';
    return address.startsWith('0x') ? address : `0x${address}`;
  }

  const fullAddress = formatFullAddress(contract.address);
  
  // Get chain metadata
  const getChainMetadata = (chainId: string) => {
    return CHAINS.find(chain => chain.id === chainId);
  };

  const chainMetadata = getChainMetadata(contract.chain);

  // Format transaction count with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  // Format address for shorter display
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const formatShortAddress = (address: string): string => {
    if (!address) return '';
    const addr = address.startsWith('0x') ? address : `0x${address}`;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Format ETH value with 4 decimal places
  const formatEth = (value: number): string => {
    return value.toFixed(4);
  };

  // Get explorer URL based on chain
  const getExplorerUrl = (chain: string, address: string): string => {
    const addr = formatFullAddress(address);
    const chainMapping: Record<string, string> = {
      arbitrum: 'https://arbiscan.io/address/',
      polygon_zkevm: 'https://zkevm.polygonscan.com/address/',
      optimism: 'https://optimistic.etherscan.io/address/',
      zksync_era: 'https://explorer.zksync.io/address/',
      base: 'https://basescan.org/address/',
      zora: 'https://explorer.zora.energy/address/',
      linea: 'https://lineascan.build/address/',
      scroll: 'https://scrollscan.com/address/',
      mantle: 'https://explorer.mantle.xyz/address/',
      mode: 'https://explorer.mode.network/address/',
      taiko: 'https://explorer.taiko.xyz/address/',
      swell: 'https://explorer.swell.explorer/address/'
    };
    
    const baseUrl = chainMapping[chain] || 'https://etherscan.io/address/';
    return `${baseUrl}${addr}`;
  };

  // Get GitHub search URL
  const getGithubSearchUrl = (address: string): string => {
    const addr = formatFullAddress(address);
    return `https://github.com/search?q=${addr}&type=code`;
  };

  // Get Google search URL
  const getGoogleSearchUrl = (address: string): string => {
    const addr = formatFullAddress(address);
    return `https://www.google.com/search?q=${addr}`;
  };

  // Generate roman numerals for visual decoration
  const generateRomanNumeral = (n: number): string => {
    if (n <= 0) return '';
    const lookup: Record<string, number> = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
    let roman = '';
    for (const i in lookup) {
      while (n >= lookup[i]) {
        roman += i;
        n -= lookup[i];
      }
    }
    return roman;
  };

  // Get chain name formatted for display
  const getFormattedChainName = useCallback((chain: string): string => {
    return chainMetadata?.name || chain.toUpperCase().replace('_', ' ');
  }, [chainMetadata]);

  // Check for existing attestations
  const checkAttestations = useCallback(async (forceCheck: boolean = false) => {
    // If already checking, don't trigger again
    if (isCheckingAttestations) return;
    
    // Check cache first (unless force check is requested)
    if (!forceCheck && attestationCache[fullAddress]) {
      const cachedAttestations = attestationCache[fullAddress];
      setAttestations(cachedAttestations);
      setHasAttestations(cachedAttestations.length > 0);
      setAttestationCount(cachedAttestations.length);
      if (cachedAttestations.length > 0) {
        setShowAttestationList(true);
      }
      return;
    }
    
    setIsCheckingAttestations(true);
    try {
      // Clear previous attestations when forcing a check to show the loading state
      if (forceCheck) {
        setAttestations([]);
      }
      
      const fetchedAttestations = await fetchAttestationsByContract(
        fullAddress, 
        forceCheck ? { timestamp: Date.now() } : undefined
      );
      
      // Cache the results
      attestationCache[fullAddress] = fetchedAttestations;
      
      setAttestations(fetchedAttestations);
      setHasAttestations(fetchedAttestations.length > 0);
      setAttestationCount(fetchedAttestations.length);
      if (fetchedAttestations.length > 0) {
        setShowAttestationList(true);
      }
    } catch (error) {
      console.error('Error checking attestations:', error);
    } finally {
      setIsCheckingAttestations(false);
    }
  }, [fullAddress, isCheckingAttestations]);

  // Setup Intersection Observer to detect when card is in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasBeenInView) {
          setHasBeenInView(true);
          // Auto-check for attestations when the card comes into view
          if (!isCheckingAttestations && attestations.length === 0) {
            checkAttestations(false); // Use cache if available for automatic checks
          }
        }
      },
      {
        root: null, // Use viewport as root
        rootMargin: '0px',
        threshold: 0.5, // Trigger when at least 50% of the card is visible
      }
    );

    const currentCardRef = cardRef.current;
    if (currentCardRef) {
      observer.observe(currentCardRef);
    }

    return () => {
      if (currentCardRef) {
        observer.unobserve(currentCardRef);
      }
    };
  }, [hasBeenInView, isCheckingAttestations, attestations.length, checkAttestations]);

  useEffect(() => {
    const fetchEnsName = async () => {
      setEnsState(prev => ({ ...prev, loading: true, error: null }));
      
      try {
        const chainName = getFormattedChainName(contract.chain).toLowerCase();
        const resolution = await resolveEnsName(fullAddress, chainName);
        setEnsState({
          resolution,
          loading: false,
          error: null
        });
      } catch (error) {
        console.error('ENS resolution failed:', error);
        setEnsState({
          resolution: null,
          loading: false,
          error: error instanceof Error ? error.message : 'ENS resolution failed'
        });
      }
    };

    fetchEnsName();
  }, [contract.chain, fullAddress, getFormattedChainName]);

  // Handle a selected attestation for editing/confirming
  const handleSelectAttestation = (attestation: ParsedAttestation) => {
    if (onSelectWithAttestation) {
      onSelectWithAttestation(attestation);
    } else {
      // Fallback to regular attestation process if the parent doesn't handle this
      onSelect();
    }
  };

  // Get chain logo SVG
  const ChainLogo = () => {
    if (!chainMetadata || !chainMetadata.logo) return null;
    return (
      <svg
        width={chainMetadata.logo.width}
        height={chainMetadata.logo.height || chainMetadata.logo.width}
        viewBox={`0 0 ${chainMetadata.logo.width} ${chainMetadata.logo.height || chainMetadata.logo.width}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="inline-block"
        dangerouslySetInnerHTML={{ __html: chainMetadata.logo.body }}
      />
    );
  };

  // Get gradient colors for the chain
  const getSubtleGradient = (variant: 'header' | 'accent' = 'header') => {
    if (!chainMetadata) {
      return 'linear-gradient(to right, rgba(96, 165, 250, 0.9), rgba(147, 51, 234, 0.8), rgba(236, 72, 153, 0.9))';
    }
    
    const [color1, color2] = chainMetadata.colors.dark;
    const baseColor1 = color1;
    const baseColor2 = color2 || color1;

    // Convert hex color to rgba
    const hexToRgba = (hex: string, opacity: number) => {
      const cleanHex = hex.replace('#', '');
      const r = parseInt(cleanHex.substring(0, 2), 16);
      const g = parseInt(cleanHex.substring(2, 4), 16);
      const b = parseInt(cleanHex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    if (variant === 'header') {
      // More subtle gradient for the document header
      return `linear-gradient(135deg, 
        ${hexToRgba(baseColor1, 0.85)}, 
        ${hexToRgba(baseColor2 || baseColor1, 0.75)} 50%,
        ${hexToRgba(baseColor1, 0.85)} 100%
      )`;
    }
    
    // For accents (badges, underlines)
    return `linear-gradient(to right,
      ${hexToRgba(baseColor1, 0.6)},
      ${hexToRgba(baseColor2, 0.8)},
      ${hexToRgba(baseColor1, 0.6)}
    )`;
  };

  return (
    <div 
      ref={cardRef}
      className="contract-card bg-white border border-gray-200 rounded-xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.05)] hover:shadow-lg transition-all duration-200"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23e2e8f0' fill-opacity='0.08'%3E%3Cpath opacity='.5' d='M96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9zm-1 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9z'/%3E%3Cpath d='M6 5V0H5v5H0v1h5v94h1V6h94V5H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}
    >

      {/* Document header */}
      <div 
        className="px-4 py-2 flex justify-between items-center backdrop-blur-sm"
        style={{
          background: getSubtleGradient('header')
        }}
      >
        <div className="flex items-center space-x-2">
          <span className="font-serif text-white text-xs tracking-wider">CONTRACT №</span>
          <span className="text-white text-xs font-medium">{generateRomanNumeral(Math.floor(contract.txCount / 1000) + 1)}</span>
          {hasBeenInView && (
            <span className="ml-1 h-1.5 w-1.5 rounded-full bg-green-400 shadow-sm" title="Auto-checked for attestations"></span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-white font-serif italic">{getFormattedChainName(contract.chain)}</div>
          {ensName && (
            <span className="text-white bg-white/20 rounded-md px-2 py-1 text-xs flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" rx="4" fill="currentColor" fillOpacity="0.3"/>
                <path d="M10 12L6 16L10 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 12L26 16L22 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18 10L14 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Enscribed by Enscribe
            </span>
          )}
          <button
            onClick={() => checkAttestations(true)}
            disabled={isCheckingAttestations}
            className="text-white bg-white/20 hover:bg-white/30 rounded-md px-2 py-1 text-xs flex items-center gap-1 transition-all duration-200"
            title={hasAttestations ? "Check again for attestations" : "Check for existing attestations"}
          >
            {isCheckingAttestations ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Checking...</span>
              </>
            ) : hasAttestations ? (
              <>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh ({attestationCount})</span>
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Check Attestations</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Contract title area */}
      <div className="pt-5 px-6 pb-3">
        <div className="flex justify-between items-center">
          <h3 className="text-center text-gray-800 font-serif text-lg tracking-tight leading-snug flex items-center">
            <span className="mr-2 w-5 h-5 flex items-center justify-center">
              <ChainLogo />
            </span>
            <span className="relative">
              {hasAttestations ? 'Partially Identified Contract' : 'Unidentified Smart Contract'}
              <span 
                className="absolute -bottom-1 left-0 right-0 h-0.5"
                style={{
                  background: getSubtleGradient('accent')
                }}
              ></span>
            </span>
          </h3>
          <div 
            className="text-white rounded-full px-2 py-0.5 text-xs font-medium backdrop-blur-sm"
            style={{
              background: getSubtleGradient('accent')
            }}
          >
            Active {contract.dayRange}d
          </div>
        </div>

        {/* Decorative line with seal */}
        <div className="flex items-center mt-3 mb-4">
          <div className="h-px bg-gray-200 flex-grow"></div>
          <div className="relative rounded-full bg-white border-2 border-gray-200 h-8 w-8 flex items-center justify-center mx-2 text-gray-600 text-xs font-serif overflow-hidden shadow-sm">
            <div className="absolute inset-0 bg-gray-50 opacity-50"></div>
            <span className="relative z-10">UC</span>
          </div>
          <div className="h-px bg-gray-200 flex-grow"></div>
        </div>
      </div>

      {/* Contract body */}
      <div className="px-6 pb-4 text-sm">
        <div className="space-y-4">
          {/* Preamble text */}
          <div className="text-xs text-gray-600 font-serif leading-relaxed mb-4">
            {hasAttestations ? (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-md mb-3">
                <div className="flex items-center justify-between text-blue-700 mb-1">
                  <div className="flex items-center font-medium">
                    <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    This contract has {attestationCount} existing attestation{attestationCount !== 1 ? 's' : ''}
                  </div>
                  <button 
                    onClick={() => setShowAttestationList(!showAttestationList)}
                    className="text-blue-600 hover:text-blue-800 text-xs flex items-center"
                  >
                    {showAttestationList ? 'Hide details' : 'View details'}
                    <svg className="w-3.5 h-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d={showAttestationList ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} 
                      />
                    </svg>
                  </button>
                </div>
                <p className="text-blue-600 text-xs">
                  While this contract has received some attestations, it still requires additional verification. 
                  More attestations increase the reliability of this information. Please help verify this contract.
                </p>
                
                {/* Attestation list */}
                {showAttestationList && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <AttestationList 
                      attestations={attestations}
                      onSelectAttestation={handleSelectAttestation}
                    />
                  </div>
                )}
              </div>
            ) : (
              <>
                This unidentified smart contract on the {getFormattedChainName(contract.chain)} blockchain requires 
                attestation to verify its purpose and characteristics. Help the community by providing accurate metadata.
              </>
            )}
          </div>

          {/* Address section with notary style */}
          <div className="font-mono mb-5 flex items-center">
            <div className="bg-white border border-gray-200 rounded px-2 py-1 text-gray-800 flex-grow flex items-center justify-between">
              <div className="flex items-center">
                <a
                  href={getEnscribeUrl(fullAddress, contract.chain, ensName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="select-all"
                >
                  {ensName || fullAddress}
                </a>
                {ensState.loading && (
                  <div className="ml-2 w-4 h-4 rounded-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center animate-pulse">
                    <div className="absolute inset-0 w-4 h-4 rounded-full border-2 border-transparent border-t-white border-r-white animate-spin"></div>
                  </div>
                )}
                {ensResolution?.method === 'primary' && (
                  <div className="ml-2" title="Reverse Resolved ENS - Verified by owner">
                    <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {ensResolution?.method === 'l2' && (
                  <div className="ml-2" title="Chain-specific ENS resolution">
                    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {ensResolution?.method === 'subgraph' && (
                  <div className="ml-2" title="Forward Resolved ENS - Less secure">
                    <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-3a1 1 0 001 1h.01a1 1 0 100-2H10a1 1 0 00-1 1z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex items-center">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(fullAddress);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  title="Copy address"
                >
                  {copied ? (
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  )}
                </button>
                {(ensName && (ensResolution?.method === 'subgraph')) && (
                  <a 
                    href={getEnscribeUrl(fullAddress, contract.chain, ensName, ensResolution?.method)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group relative inline-flex items-center py-1.5 px-2 text-xs font-medium border border-blue-200 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-all duration-300 shadow-sm hover:shadow-md ml-2 hover:w-auto w-8 overflow-hidden origin-right"
                  >
                    <svg width="14" height="14" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1 flex-shrink-0">
                      <rect width="32" height="32" rx="6" fill="currentColor" fillOpacity="0.15"/>
                      <path d="M10 12L6 16L10 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 12L26 16L22 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M18 10L14 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Assign ENS via Enscribe
                    </span>
                  </a>
                )}
                {!ensName && (
                  <a 
                    href={getEnscribeUrl(fullAddress, contract.chain, ensName, ensResolution?.method)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group relative inline-flex items-center py-1.5 px-2 text-xs font-medium border border-gray-200 rounded-lg text-gray-700 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-all duration-300 shadow-sm hover:shadow-md ml-2 hover:w-auto w-8 overflow-hidden origin-right"
                  >
                    <svg width="14" height="14" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1 flex-shrink-0">
                      <rect width="32" height="32" rx="6" fill="currentColor" fillOpacity="0.15"/>
                      <path d="M10 12L6 16L10 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 12L26 16L22 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M18 10L14 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Assign ENS via Enscribe
                    </span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Contract metrics style layout */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-2.5">
              <div className="text-gray-700 text-xs uppercase font-serif mb-1">Transaction Count</div>
              <div className="font-medium text-gray-900 flex items-center">
                <svg className="w-3.5 h-3.5 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                {formatNumber(contract.txCount)}
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-2.5">
              <div className="text-gray-700 text-xs uppercase font-serif mb-1">Total Gas Used</div>
              <div className="font-medium text-gray-900 flex items-center">
                <svg className="w-3.5 h-3.5 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                {formatEth(contract.gasFeesEth)} ETH
              </div>
            </div>
          </div>

          {/* Attestation needed section */}
          <div className="text-xs font-serif text-gray-500 italic border-l-2 border-gray-200 pl-3 py-1">
            {hasAttestations ? (
              <>
                Additional attestations are needed to fully verify this contract. Your participation will help:
                <ul className="mt-2 list-disc list-inside space-y-1 text-gray-600">
                  <li>Strengthen consensus on the contract&apos;s purpose and functionality</li>
                  <li>Confirm existing attestation data</li>
                  <li>Provide additional context or metadata</li>
                  <li>Build a more comprehensive view of this contract</li>
                </ul>
              </>
            ) : (
              <>
                This contract requires proper identification and classification. Your attestation will help:
                <ul className="mt-2 list-disc list-inside space-y-1 text-gray-600">
                  <li>Identify the contract&apos;s purpose and functionality</li>
                  <li>Verify its ownership and project affiliation</li>
                  <li>Categorize its usage type</li>
                  <li>Improve blockchain transparency</li>
                </ul>
              </>
            )}
          </div>
        </div>

        {/* Actions area */}
        <div className="mt-5 pt-3 border-t border-dashed border-gray-200">
          <div className="flex justify-between">
            {/* Research buttons */}
            <div className="flex space-x-2">
              <a 
                href={getExplorerUrl(contract.chain, contract.address)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-gray-50 hover:bg-gray-100 text-gray-700 px-2 py-1 rounded border border-gray-200 text-xs flex items-center transition-colors"
              >
                <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 6H6C4.89543 6 4 6.89543 4 8V18C4 19.1046 4.89543 20 6 20H16C17.1046 20 18 19.1046 18 18V14M14 4H20M20 4V10M20 4L10 14" />
                </svg>
                View on Explorer
              </a>
              <a 
                href={getGithubSearchUrl(contract.address)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-gray-50 hover:bg-gray-100 text-gray-700 px-2 py-1 rounded border border-gray-200 text-xs flex items-center transition-colors"
              >
                <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12C2 16.418 4.865 20.166 8.839 21.489C9.339 21.578 9.5 21.281 9.5 21.014C9.5 20.775 9.492 20.074 9.489 19.241C6.726 19.859 6.139 17.785 6.139 17.785C5.685 16.705 5.028 16.41 5.028 16.41C4.132 15.869 5.097 15.882 5.097 15.882C6.094 15.954 6.624 16.827 6.624 16.827C7.521 18.228 8.97 17.84 9.52 17.58C9.616 16.93 9.89 16.519 10.193 16.291C7.976 16.059 5.636 15.266 5.636 11.319C5.636 10.249 6.01 9.373 6.644 8.694C6.534 8.44 6.201 7.539 6.745 6.158C6.745 6.158 7.59 5.886 9.489 7.182C10.297 6.95 11.15 6.834 12 6.83C12.85 6.834 13.706 6.95 14.516 7.182C16.413 5.886 17.256 6.158 17.256 6.158C17.802 7.539 17.468 8.44 17.356 8.694C17.992 9.373 18.364 10.249 18.364 11.319C18.364 15.28 16.019 16.054 13.794 16.283C14.174 16.571 14.523 17.137 14.523 18.008C14.523 19.262 14.509 20.682 14.509 21.013C14.509 21.284 14.67 21.582 15.178 21.487C19.138 20.161 22 16.417 22 12C22 6.477 17.523 2 12 2Z"/>
                </svg>
                Find Source Code
              </a>
              <a 
                href={getGoogleSearchUrl(contract.address)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-gray-50 hover:bg-gray-100 text-gray-700 px-2 py-1 rounded border border-gray-200 text-xs flex items-center transition-colors"
              >
                Find on Google
              </a>
              
            </div>

            {/* Attestation button */}
            <div className="flex items-center">
              <button
                onClick={() => {
                  if (onSelectWithAttestation) {
                    onSelectWithAttestation({
                      attester: '',
                      timeCreated: Date.now(),
                      txid: '',
                      isOffchain: false,
                      tags: [],
                      chainId: contract.chain
                    });
                  } else {
                    onSelect();
                  }
                }}
                className="relative group overflow-hidden bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-white px-4 py-1.5 rounded-xl text-sm font-serif flex items-center transition-all duration-300 hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <span className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity"></span>
                <svg className="w-3.5 h-3.5 mr-1.5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="relative z-10">Provide Attestation</span>
              </button>
            </div>
          </div>
        </div>

        {/* Decorative footer */}
        <div className="mt-4 pt-3 border-t border-dotted border-gray-200 flex justify-between items-center">
          <div className="text-gray-500 font-serif text-xs italic">
            {hasAttestations ? 'Partially Identified' : 'Needs Identification'}
          </div>
          <div className="font-serif text-xs text-gray-700 flex items-center">
            <span className="mr-1">Contract ID:</span>
            <span className="font-mono bg-gray-50 px-1 py-0.5 border border-gray-100 rounded">
              {contract.chain.charAt(0).toUpperCase()}{contract.address.slice(-6)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractCard;
