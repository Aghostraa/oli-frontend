'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchAttestationsByContract, Attestation } from '@/services/attestationService';
import LoadingAnimation from '@/components/LoadingAnimation';
import SearchContractCard from '@/components/SearchContractCard';
import { CHAINS } from '@/constants/chains';

// Helper function to normalize and validate chain parameter
const normalizeChain = (chainParam: string): string | null => {
  if (!chainParam) return null;
  
  const param = chainParam.toLowerCase().trim();
  
  // Check numeric chain IDs
  const numericChainId = parseInt(param);
  if (!isNaN(numericChainId)) {
    const chain = CHAINS.find(c => c.id === numericChainId.toString());
    return chain ? chain.caip2 : null;
  }
  
  // Check CAIP-2 format (eip155:xxx)
  if (param.startsWith('eip155:')) {
    const chainId = param.split(':')[1];
    const chain = CHAINS.find(c => c.id === chainId);
    return chain ? chain.caip2 : null;
  }
  
  // Check chain names and aliases
  const normalizedParam = param.replace(/[\s_-]/g, '').toLowerCase();
  
  // Direct name matches
  const directMatch = CHAINS.find(c => {
    const chainName = c.name.replace(/[\s_-]/g, '').toLowerCase();
    const chainShortName = c.shortName.replace(/[\s_-]/g, '').toLowerCase();
    const chainId = c.id.replace(/[\s_-]/g, '').toLowerCase();
    
    return chainName === normalizedParam || 
           chainShortName === normalizedParam || 
           chainId === normalizedParam;
  });
  
  if (directMatch) return directMatch.caip2;
  
  // Alias matches
  const aliasMap: Record<string, string> = {
    'eth': 'eip155:1',
    'mainnet': 'eip155:1',
    'ethereum': 'eip155:1',
    'arbitrum': 'eip155:42161',
    'arb': 'eip155:42161',
    'optimism': 'eip155:10',
    'op': 'eip155:10',
    'base': 'eip155:8453',
    'polygon': 'eip155:137',
    'matic': 'eip155:137',
    'avalanche': 'eip155:43114',
    'avax': 'eip155:43114'
  };
  
  return aliasMap[normalizedParam] || null;
};

// Helper function to validate Ethereum address
const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

function SearchContent() {
  const searchParams = useSearchParams();
  
  const [contractAddress, setContractAddress] = useState('');
  const [selectedChain, setSelectedChain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchContractAttestations = React.useCallback(async (address?: string) => {
    const targetAddress = address || contractAddress.trim();
    
    if (!targetAddress) {
      setError('Please enter an address');
      return;
    }

    if (!isValidAddress(targetAddress)) {
      setError('Please enter a valid Ethereum address (0x...)');
      return;
    }

    setIsLoading(true);
    setError('');
    setHasSearched(true);
    
    try {
      const rawAttestations = await fetchAttestationsByContract(targetAddress);
      
      if (rawAttestations.length === 0) {
        setError('No attestations found for this address');
        setAttestations([]);
      } else {
        setAttestations(rawAttestations);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred while fetching data');
      setAttestations([]);
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress]);

  // Initialize from URL parameters
  useEffect(() => {
    if (!searchParams) {
      return;
    }

    const addressParam = searchParams.get('address') || searchParams.get('contract');
    const chainParam = searchParams.get('chain') || searchParams.get('chainId');
    
    if (addressParam) {
      const trimmedAddress = addressParam.trim();
      setContractAddress(trimmedAddress);
      
      // Auto-search if we have a valid address
      if (isValidAddress(trimmedAddress)) {
        setIsLoading(true);
        setHasSearched(true);
        fetchContractAttestations(trimmedAddress);
      }
    }
    
    if (chainParam) {
      const normalizedChain = normalizeChain(chainParam);
      if (normalizedChain) {
        setSelectedChain(normalizedChain);
      } else {
        console.warn(`Invalid chain parameter: ${chainParam}`);
      }
    }
  }, [searchParams, fetchContractAttestations]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContractAddress(e.target.value);
    // Clear previous results when input changes
    if (attestations.length > 0) {
      setAttestations([]);
      setError('');
      setHasSearched(false);
    }
  };



  const handleAttest = () => {
    const attestUrl = new URL('/attest', window.location.origin);
    attestUrl.searchParams.set('address', contractAddress.trim());
    if (selectedChain) {
      attestUrl.searchParams.set('chain', selectedChain);
    }
    window.open(attestUrl.toString(), '_blank');
  };

  const handleSelectAttestation = (attestation: any) => {
    const attestUrl = new URL('/attest', window.location.origin);
    attestUrl.searchParams.set('address', contractAddress.trim());
    if (selectedChain) {
      attestUrl.searchParams.set('chain', selectedChain);
    }
    // Could add the attestation ID for editing
    attestUrl.searchParams.set('edit', attestation.txid);
    window.open(attestUrl.toString(), '_blank');
  };

  // Group attestations by unique address (in case we have multiple for the same address)
  const groupedAttestations: Record<string, Attestation[]> = {};
  attestations.forEach(attestation => {
    const key = contractAddress.trim().toLowerCase();
    if (!groupedAttestations[key]) {
      groupedAttestations[key] = [];
    }
    groupedAttestations[key].push(attestation);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Header and search form */}
        <div className="bg-white p-6 rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.05)]">
          <div className="mb-4">
            <h1 className="text-2xl font-bold mb-2 text-gray-900">Search Address Labels</h1>
            <p className="text-sm text-gray-500">
              Enter an address to view all attested labels and metadata. 
              URL parameters are supported for direct linking.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter address (0x...)"
              value={contractAddress}
              onChange={handleAddressChange}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button 
              onClick={() => fetchContractAttestations()}
              disabled={isLoading}
              className="px-4 py-2 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <span className="flex items-center">
                <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </span>
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}
        </div>

        {/* Loading state */}
        {isLoading && <LoadingAnimation />}

        {/* Results */}
        {!isLoading && hasSearched && (
          <>
            {attestations.length > 0 ? (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Address Found with Attestations
                  </h2>
                  <p className="text-gray-600">
                    {attestations.length} attestation{attestations.length !== 1 ? 's' : ''} found for this address
                  </p>
                </div>

                {Object.entries(groupedAttestations).map(([address, addressAttestations]) => (
                  <SearchContractCard
                    key={address}
                    address={contractAddress.trim()}
                    attestations={addressAttestations}
                    onAttest={handleAttest}
                    onSelectAttestation={handleSelectAttestation}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-yellow-800 mb-2">No Attestations Found</h3>
                  <p className="text-yellow-700 mb-4">
                    This address doesn&apos;t have any attestations yet. Be the first to contribute!
                  </p>
                  <button
                    onClick={handleAttest}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                  >
                    Create First Attestation
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingAnimation />}>
      <SearchContent />
    </Suspense>
  );
}
