'use client';

import React, { useState } from 'react';
import { Attestation } from '@/services/attestationService';

interface Tag {
  id: string;
  name: string;
  category: string;
  rawValue: unknown;
}

interface ParsedAttestation {
  attester: string;
  timeCreated: number;
  txid: string;
  isOffchain: boolean;
  tags: Tag[];
  chainId?: string;
}

interface AttestationListProps {
  attestations: Attestation[];
  onSelectAttestation: (attestation: ParsedAttestation) => void;
}

const AttestationList: React.FC<AttestationListProps> = ({ 
  attestations, 
  onSelectAttestation
}) => {
  const [expandedAttestation, setExpandedAttestation] = useState<string | null>(null);

  // Format timestamp to readable date
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format short address for display
  const formatShortAddress = (address: string): string => {
    if (!address) return '';
    const addr = address.startsWith('0x') ? address : `0x${address}`;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const BASE_FIELDS = new Set([
    'attester',
    'expirationTime',
    'id',
    'ipfsHash',
    'isOffchain',
    'recipient',
    'refUID',
    'revocable',
    'revocationTime',
    'revoked',
    'time',
    'timeCreated',
    'txid',
    'schema_info',
    'uid',
    'time_iso',
    'tags_json',
    'chain_id',
    '_parsing_error'
  ]);

  // Parse tags from attestation data
  const parseTagsFromAttestation = (attestation: Attestation): Tag[] => {
    const tags: Tag[] = [];
    const tagsJson = attestation.tags_json as Record<string, unknown> | null | undefined;

    const formatValue = (value: unknown) => {
      if (value === null) return 'null';
      if (Array.isArray(value)) return value.map(item => String(item)).join(', ');
      if (typeof value === 'object') return JSON.stringify(value);
      if (typeof value === 'string') {
        return value.length > 20 ? `${value.slice(0, 20)}...` : value;
      }
      return String(value);
    };

    if (tagsJson && typeof tagsJson === 'object' && !Array.isArray(tagsJson)) {
      Object.entries(tagsJson).forEach(([key, value]) => {
        tags.push({
          id: `${attestation.txid || attestation.timeCreated}-${key}`,
          name: `${key}: ${formatValue(value)}`,
          category: 'Contract Tag',
          rawValue: value
        });
      });
      return tags;
    }

    Object.entries(attestation).forEach(([key, value]) => {
      if (BASE_FIELDS.has(key)) return;
      tags.push({
        id: `${attestation.txid || attestation.timeCreated}-${key}`,
        name: `${key}: ${formatValue(value)}`,
        category: 'Attestation Field',
        rawValue: value
      });
    });

    return tags;
  };

  // Parse attestations
  const parsedAttestations = attestations.map(attestation => {
    const tags = parseTagsFromAttestation(attestation);
    return {
      attester: attestation.attester,
      timeCreated: Number(attestation.timeCreated),
      txid: attestation.txid,
      isOffchain: attestation.isOffchain,
      tags,
      chainId: attestation.chain_id || undefined
    };
  });

  // Toggle expansion of an attestation
  const toggleExpand = (id: string) => {
    if (expandedAttestation === id) {
      setExpandedAttestation(null);
    } else {
      setExpandedAttestation(id);
    }
  };

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-1">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-xs font-serif uppercase tracking-wide text-gray-700">
          Existing Attestations
        </h3>
        <span className="text-xs text-gray-500 italic">
          {attestations.length} found
        </span>
      </div>
      
      <div className="divide-y divide-dashed divide-gray-200">
        {parsedAttestations.length > 0 ? (
          parsedAttestations.map((attestation) => (
            <div 
              key={attestation.txid} 
              className="pt-2 pb-2 first:pt-0"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 font-mono">
                      {formatShortAddress(attestation.attester)}
                    </span>
                    {attestation.isOffchain && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                        Offchain
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500 font-serif">
                  {formatTimestamp(attestation.timeCreated)}
                </div>
              </div>
              
              {/* Tags preview - show just a few */}
              <div className="flex flex-wrap gap-1 mb-1.5">
                {attestation.tags.slice(0, 3).map((tag) => (
                  <span 
                    key={tag.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-indigo-50 text-indigo-700 border border-indigo-100"
                  >
                    {tag.name}
                  </span>
                ))}
                {attestation.tags.length > 3 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-gray-50 text-gray-500 cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleExpand(attestation.txid)}
                  >
                    +{attestation.tags.length - 3} more
                  </span>
                )}
              </div>
              
              {/* Expanded view */}
              {expandedAttestation === attestation.txid && (
                <div className="mt-2 pt-2 border-t border-dotted border-gray-200">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {attestation.tags.map((tag) => (
                      <span 
                        key={tag.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-indigo-50 text-indigo-700 border border-indigo-100"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Action buttons */}
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => toggleExpand(attestation.txid)}
                  className="px-2 py-0.5 text-xs text-gray-600 hover:text-gray-800 flex items-center"
                >
                  {expandedAttestation === attestation.txid ? (
                    <>
                      <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      Less
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      More
                    </>
                  )}
                </button>
                <button
                  onClick={() => onSelectAttestation(attestation)}
                  className="px-2 py-0.5 text-xs bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100 hover:bg-indigo-100 flex items-center"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit/Confirm
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-4 text-center text-sm text-gray-500 italic">
            No attestations found for this contract.
          </div>
        )}
      </div>
      
      <div className="pt-2 border-t border-gray-200">
        <div className="text-xs text-gray-600 italic">
          <p>Do you have additional information about this contract?</p>
          <p>Help the community by providing your own attestation.</p>
        </div>
      </div>
    </div>
  );
};

export default AttestationList; 
