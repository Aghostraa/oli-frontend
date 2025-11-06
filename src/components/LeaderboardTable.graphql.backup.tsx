'use client';

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { gql } from '@apollo/client';
import client from '@/lib/apollo-client';
// Import the loading animation component
import LoadingAnimation from '@/components/LoadingAnimation';

interface Attestation {
  attester: string;
  _count: {
    _all: number;
  };
}

interface EnsNames {
  [key: string]: string | null;
}

const ETH_NODE_URL="https://rpc.mevblocker.io/fast"

const ATTESTATION_QUERY = gql`
  query GroupByAttestation($by: [AttestationScalarFieldEnum!]!, $where: AttestationWhereInput, $orderBy: [AttestationOrderByWithAggregationInput!], $take: Int) {
    groupByAttestation(by: $by, where: $where, orderBy: $orderBy, take: $take) {
      attester
      _count {
        _all
      }
    }
  }
`;

const LeaderboardTableBackup: React.FC = () => {
  const [data, setData] = useState<Attestation[]>([]);
  const [ensNames, setEnsNames] = useState<EnsNames>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: queryData } = await client.query({
          query: ATTESTATION_QUERY,
          variables: {
            by: ["attester"],
            where: {
              schemaId: {
                equals: "0xb763e62d940bed6f527dd82418e146a904e62a297b8fa765c9b3e1f0bc6fdd68"
              },
              revoked: {
                equals: false
              }
            },
            orderBy: [
              {
                _count: {
                  attester: "desc"
                }
              }
            ],
            take: 50
          }
        });

        setData(queryData.groupByAttestation);
        resolveEnsNames(queryData.groupByAttestation);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      }
    };

    fetchData();
  }, []);

  const resolveEnsNames = async (attesters: Attestation[]) => {
    try {
        const provider = new ethers.JsonRpcProvider(ETH_NODE_URL);
      
      const ensPromises = attesters.map(async (item) => {
        try {
          const name = await provider.lookupAddress(item.attester);
          return [item.attester, name] as [string, string | null];
        } catch (err) {
          console.warn(`Failed to resolve ENS for ${item.attester}:`, err);
          return [item.attester, null] as [string, null];
        }
      });

      const resolvedNames = await Promise.all(ensPromises);
      const ensMap = Object.fromEntries(resolvedNames);
      
      setEnsNames(ensMap);
    } catch (err) {
      console.error('Error resolving ENS names:', err);
    } finally {
      setLoading(false);
    }
  };

  const maxCount = Math.max(...data.map(item => item._count._all));

  const truncateAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) return <LoadingAnimation />;

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-red-500">Error: {error}</div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.05)] relative">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Top Labellers</h2>
        <a 
          href="https://base.easscan.org/schema/view/0xb763e62d940bed6f527dd82418e146a904e62a297b8fa765c9b3e1f0bc6fdd68" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="px-5 py-2.5 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-opacity duration-200 text-sm font-semibold"
        >
          Schema on EAS
        </a>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="py-4 px-6 text-left text-sm font-semibold text-gray-600">Rank</th>
              <th className="py-4 px-6 text-left text-sm font-semibold text-gray-600">Attester</th>
              <th className="py-4 px-6 text-right text-sm font-semibold text-gray-600"># Attestations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((item, index) => (
              <tr 
                key={item.attester} 
                className="group hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                onClick={() => window.open(`https://base.easscan.org/address/${item.attester}`, '_blank')}
              >
                <td className="py-4 px-6">
                  <div className="flex items-center">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium
                      ${index === 0 ? 'bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                      {index + 1}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  {ensNames[item.attester] ? (
                    <div>
                      <div className="font-medium text-gray-900">{ensNames[item.attester]}</div>
                      <div className="text-sm text-gray-500 font-mono mt-0.5">{truncateAddress(item.attester)}</div>
                    </div>
                  ) : (
                    <div className="font-mono text-gray-900">{truncateAddress(item.attester)}</div>
                  )}
                </td>
                <td className="py-4 px-6">
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-semibold text-gray-900">
                      {item._count._all.toLocaleString()}
                    </span>
                    <div className="w-60 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${(item._count._all / maxCount) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaderboardTableBackup;