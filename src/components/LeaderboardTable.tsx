'use client';

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CHAINS } from '@/constants/chains';
// Import the loading animation component
import LoadingAnimation from '@/components/LoadingAnimation';

interface LeaderboardRow {
  attester: string;
  label_count: number;
  unique_attestations: number;
}

interface EnsNames {
  [key: string]: string | null;
}

const ETH_NODE_URL = 'https://rpc.mevblocker.io/fast';

async function fetchLeaderboard(
  options: { limit?: number; order?: 'tags' | 'attestations'; chainId?: string } = {},
  signal?: AbortSignal
) {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  if (options.order) params.set('order', options.order);
  if (options.chainId) params.set('chainId', options.chainId);

  const query = params.toString();
  const response = await fetch(query ? `/api/leaderboard?${query}` : '/api/leaderboard', {
    headers: {
      Accept: 'application/json'
    },
    signal,
    cache: 'no-store'
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Leaderboard request failed (${response.status})`);
  }

  return (await response.json()) as { count: number; results: LeaderboardRow[] };
}

const LeaderboardTable: React.FC = () => {
  const [data, setData] = useState<LeaderboardRow[]>([]);
  const [ensNames, setEnsNames] = useState<EnsNames>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<'tags' | 'attestations'>('tags');
  const [chainFilter, setChainFilter] = useState<string>('');

  useEffect(() => {
    const controller = new AbortController();

    const loadLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const { results } = await fetchLeaderboard(
          {
            limit: 20,
            order,
            chainId: chainFilter || undefined
          },
          controller.signal
        );

        setData(results);
        setEnsNames({});
        await resolveEnsNames(results, controller.signal);
      } catch (err) {
        if ((err instanceof DOMException && err.name === 'AbortError') || controller.signal.aborted) {
          return;
        }
        console.error('Error fetching leaderboard:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadLeaderboard();

    return () => {
      controller.abort();
    };
  }, [order, chainFilter]);

  const resolveEnsNames = async (attesters: LeaderboardRow[], signal?: AbortSignal) => {
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

      if (!signal?.aborted) {
        setEnsNames(ensMap);
      }
    } catch (err) {
      console.error('Error resolving ENS names:', err);
    }
  };

  const maxCount = data.length ? Math.max(...data.map(item => item.label_count)) : 0;

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
      <div className="flex flex-col gap-6 mb-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Top Labellers</h2>
          <p className="text-sm text-gray-500 mt-1">
            Ranked by total tags contributed. Use the filters to switch sorting or scope by chain.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <label className="flex flex-col text-xs font-medium text-gray-600">
            Order By
            <select
              value={order}
              onChange={(event) => setOrder(event.target.value as 'tags' | 'attestations')}
              className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <option value="tags">Total Tags</option>
              <option value="attestations">Unique Attestations</option>
            </select>
          </label>
          <label className="flex flex-col text-xs font-medium text-gray-600">
            Chain
            <select
              value={chainFilter}
              onChange={(event) => setChainFilter(event.target.value)}
              className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <option value="">All Chains</option>
              {CHAINS.map(chain => (
                <option key={chain.caip2} value={chain.caip2}>
                  {chain.name}
                </option>
              ))}
            </select>
          </label>
          <a 
            href="https://base.easscan.org/schema/view/0xb763e62d940bed6f527dd82418e146a904e62a297b8fa765c9b3e1f0bc6fdd68" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="px-5 py-2.5 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 text-white rounded-xl hover:opacity-90 transition-opacity duration-200 text-sm font-semibold text-center"
          >
            Schema on EAS
          </a>
        </div>
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
                      {item.label_count.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {item.unique_attestations.toLocaleString()} unique attestations
                    </span>
                    <div className="w-60 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${maxCount ? (item.label_count / maxCount) * 100 : 0}%`
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

export default LeaderboardTable;
