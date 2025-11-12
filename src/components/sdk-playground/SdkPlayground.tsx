'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { OLIClient, NETWORKS, type TagDefinitions, type ValueSets, type LabelInput, WriteClient } from '@openlabels/sdk';
import type { TypedDataSigner } from '@openlabels/sdk';
import { PlaygroundCard, ResultViewer } from './PlaygroundCard';

type ExampleStatus = 'idle' | 'loading' | 'success' | 'error';

interface ExampleState {
  status: ExampleStatus;
  data?: unknown;
  error?: string | null;
}

const SAMPLE_ADDRESS = '0x4200000000000000000000000000000000000006';
const SAMPLE_ATTESTER = '0x7f794E825380d1F16D8bf009E4608c3015882d37';

const NETWORK_OPTIONS = Object.keys(NETWORKS) as Array<keyof typeof NETWORKS>;

const defaultExampleState: ExampleState = { status: 'idle' };

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return 'Unknown error';
  }
}

const safeSerialize = (value: unknown) => {
  if (value === undefined) {
    return undefined;
  }
  if (value instanceof Map) {
    return Object.fromEntries(value.entries());
  }
  if (Array.isArray(value)) {
    return value.map(safeSerialize);
  }
  if (value && typeof value === 'object') {
    return JSON.parse(
      JSON.stringify(value, (_key, val) => {
        if (typeof val === 'bigint') {
          return val.toString();
        }
        return val;
      })
    );
  }
  return value;
};

const playgroundSigner = (address: string): TypedDataSigner => {
  const padded = address || '0x1111111111111111111111111111111111111111';
  return {
    async signTypedData() {
      return `0x${'11'.repeat(65)}`;
    },
    async getAddress() {
      return padded;
    }
  };
};

export const SdkPlayground: React.FC = () => {
  const clientRef = useRef<OLIClient | null>(null);
  const [clientStatus, setClientStatus] = useState<ExampleStatus>('idle');
  const [clientError, setClientError] = useState<string | null>(null);
  const resolveProxyBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin.replace(/\/$/, '')}/api/sdk-proxy/`;
    }
    const fallbackOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    return `${fallbackOrigin.replace(/\/$/, '')}/api/sdk-proxy/`;
  };

  const [apiKey, setApiKey] = useState('');
  const [proxyBaseUrl, setProxyBaseUrl] = useState(resolveProxyBaseUrl);
  useEffect(() => {
    setProxyBaseUrl(resolveProxyBaseUrl());
  }, []);
  const [network, setNetwork] = useState<keyof typeof NETWORKS>('BASE');
  const [minConfidence, setMinConfidence] = useState(0.4);
  const [enableCache, setEnableCache] = useState(true);
  const [autoRank, setAutoRank] = useState(true);
  const [tagDefinitions, setTagDefinitions] = useState<TagDefinitions | null>(null);
  const [tagFilter, setTagFilter] = useState('');
  const [valueSets, setValueSets] = useState<ValueSets | null>(null);
  const [addressInput, setAddressInput] = useState(SAMPLE_ADDRESS);
  const [chainIdInput, setChainIdInput] = useState('eip155:8453');
  const [tagKey, setTagKey] = useState('contract_name');
  const [tagValue, setTagValue] = useState('friend.tech');
  const [enrichmentAddress, setEnrichmentAddress] = useState(SAMPLE_ADDRESS);
  const [fallbackName, setFallbackName] = useState('Unnamed');
  const [trustSource, setTrustSource] = useState(SAMPLE_ATTESTER);
  const [trustTarget, setTrustTarget] = useState('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
  const [trustLimit, setTrustLimit] = useState(50);
  const [labelLimit, setLabelLimit] = useState(5);
  const [attestationLimit, setAttestationLimit] = useState(10);
const [labelJson, setLabelJson] = useState(
    JSON.stringify(
      {
        address: SAMPLE_ADDRESS,
        chainId: 'eip155:8453',
        tags: { contract_name: 'Example Contract', usage_category: 'defi' }
      },
      null,
      2
    )
  );
const [writeAddress, setWriteAddress] = useState('0x8ba1f109551bd432803012645ac136ddd64dba72');
const [exampleStates, setExampleStates] = useState<Record<string, ExampleState>>({});
const [memoAttester, setMemoAttester] = useState(SAMPLE_ATTESTER);
const [memoRecipient, setMemoRecipient] = useState(SAMPLE_ADDRESS);
const [memoNotes, setMemoNotes] = useState('Consistent DeFi coverage & responsive on Discord.');
const [animatedAddressTarget, setAnimatedAddressTarget] = useState(SAMPLE_ADDRESS);
const [animatedLabelDisplay, setAnimatedLabelDisplay] = useState({
  name: '',
  project: '',
  category: ''
});
const [trustSlider, setTrustSlider] = useState(0.82);
const [trustListAttester, setTrustListAttester] = useState<string>(SAMPLE_ATTESTER);
const [trustListCacheTtl, setTrustListCacheTtl] = useState(10 * 60 * 1000);
const [trustListMinConfidence, setTrustListMinConfidence] = useState(0.5);
const [desiredTagsInput, setDesiredTagsInput] = useState('contract_name,owner_project,usage_category');
const [bestLabelAddress, setBestLabelAddress] = useState(SAMPLE_ADDRESS);

  const updateExampleState = (key: string, next: Partial<ExampleState>) => {
    setExampleStates(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? defaultExampleState),
        ...next
      }
    }));
  };

  const ensureClient = () => {
    if (!clientRef.current) {
      throw new Error('Initialize the SDK first');
    }
    return clientRef.current;
  };

  const runExample = async (key: string, runner: (client: OLIClient) => Promise<unknown>) => {
    updateExampleState(key, { status: 'loading', error: null });
    try {
      const client = ensureClient();
      const data = await runner(client);
      updateExampleState(key, { status: 'success', data: safeSerialize(data) });
    } catch (error) {
      updateExampleState(key, { status: 'error', error: formatError(error) });
    }
  };

  const initializeClient = async () => {
    setClientStatus('loading');
    setClientError(null);
    try {
      const normalizedProxy = proxyBaseUrl.endsWith('/') ? proxyBaseUrl : `${proxyBaseUrl}/`;
      const attesterSettings: Record<string, unknown> = {};
      if (trustListAttester) {
        attesterSettings.trustListAttester = trustListAttester;
      }
      if (trustListCacheTtl > 0) {
        attesterSettings.trustListCacheTtlMs = trustListCacheTtl;
      }
      if (trustListMinConfidence > 0) {
        attesterSettings.trustListMinConfidence = trustListMinConfidence;
      }
      const client = new OLIClient({
        network,
        autoRank,
        filters: {
          minConfidence: minConfidence > 0 ? minConfidence : undefined
        },
        attesters: attesterSettings,
        api: {
          baseUrl: normalizedProxy,
          apiKey: apiKey || undefined,
          enableCache,
          cacheTtl: 30_000,
          staleWhileRevalidate: 15_000
        }
      });

      type CreateUrlFn = (path: string, query?: Record<string, unknown>) => URL;
      const restClient = client.api as Record<string, unknown>;
      const proxied = restClient as { createUrl?: CreateUrlFn };
      const originalCreateUrl =
        typeof proxied.createUrl === 'function' ? proxied.createUrl.bind(restClient) : null;
      if (originalCreateUrl) {
        proxied.createUrl = (path: string, query?: Record<string, unknown>) => {
          const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
          return originalCreateUrl(normalizedPath, query);
        };
      }
      await client.init();
      clientRef.current = client;
      setClientStatus('success');
    } catch (error) {
      setClientStatus('error');
      setClientError(formatError(error));
      clientRef.current = null;
    }
  };

  const resetClient = () => {
    clientRef.current = null;
    setClientStatus('idle');
    setClientError(null);
    setExampleStates({});
    setTagDefinitions(null);
    setValueSets(null);
  };

  const filteredTags = useMemo(() => {
    if (!tagDefinitions) return [];
    const entries = Object.entries(tagDefinitions);
    if (!tagFilter) return entries.slice(0, 10);
    return entries
      .filter(([key, value]) => {
        const needle = tagFilter.toLowerCase();
        return key.toLowerCase().includes(needle) || value.display_name?.toLowerCase().includes(needle);
      })
      .slice(0, 10);
  }, [tagDefinitions, tagFilter]);

  const getExampleState = (key: string) => exampleStates[key] ?? defaultExampleState;
  const parseDesiredTags = () =>
    desiredTagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);

  const handleLabelValidation = async () => {
    try {
      const parsed = JSON.parse(labelJson) as LabelInput;
      await runExample('validator', async client => {
        client.validator.validateLabel(parsed.address, parsed.chainId, parsed.tags, parsed.refUID, { autoFix: true });
        return { status: 'valid', tags: parsed.tags };
      });
    } catch (error) {
      updateExampleState('validator', { status: 'error', error: formatError(error) });
    }
  };

  const handlePayloadBuild = async () => {
    try {
      const parsed = JSON.parse(labelJson) as LabelInput;
      await runExample('write', async client => {
        const signer = playgroundSigner(writeAddress);
        const writeClient = new WriteClient(client, client.api, signer, {
          chainId: parsed.chainId?.split(':')[1] ?? '8453'
        });
        const payload = await (writeClient as unknown as { buildLabelPayload(input: LabelInput): Promise<any> }).buildLabelPayload(parsed);
        return {
          uid: payload.sig.uid,
          signer: payload.signer,
          domain: payload.sig.domain,
          preview: payload.sig.message
        };
      });
    } catch (error) {
      updateExampleState('write', { status: 'error', error: formatError(error) });
    }
  };

  const handleTrustAwareBestLabel = async () => {
    await runExample('trustBestLabel', async client => {
      const desiredTags = parseDesiredTags();
      const best = await client.api.getBestLabelForAddress(bestLabelAddress, { desiredTags });
      const summary = await client.api.getAddressSummary(bestLabelAddress, { desiredTags });
      const display = await client.api.getDisplayName(bestLabelAddress, {
        desiredTags,
        fallback: 'unlabeled'
      });
      const valid = await client.api.getValidLabelsForAddress(bestLabelAddress, { desiredTags });
      return {
        best,
        summary,
        display,
        valid,
        desiredTags
      };
    });
  };

  const handleTrustMemoCompose = async () => {
    await runExample('trustMemo', async client => {
      if (memoAttester) {
        client.trust.setSourceAddress(memoAttester);
        await client.trust.refresh({ sourceAddress: memoAttester, limit: 100 });
      }
      const summary = memoRecipient ? await client.api.getAddressSummary(memoRecipient) : null;
      const attestationData = memoRecipient
        ? await client.api.getAttestations({ recipient: memoRecipient, limit: 3, order: 'desc' })
        : { attestations: [], count: 0 };
      const confidence = memoAttester ? client.trust.getConfidence(memoAttester) : -1;
      return {
        summary,
        confidence,
        attestations: attestationData.attestations
      };
    });
  };

  const handleAnimatedLabel = async () => {
    await runExample('animatedLabel', async client => {
      if (!animatedAddressTarget) {
        throw new Error('Provide an address to reveal.');
      }
      const summary = await client.api.getAddressSummary(animatedAddressTarget);
      return summary;
    });
  };

  const handleTrustVote = async () => {
    await runExample('trustSubmission', async client => {
      const signer = playgroundSigner(writeAddress);
      const writeClient = new WriteClient(client, client.api, signer);
      const input: TrustListInput = {
        ownerName: memoAttester || 'observer.eth',
        attesters: [
          { address: memoAttester, confidence: trustSlider },
          { address: memoRecipient, confidence: Math.max(trustSlider - 0.15, 0) }
        ],
        attestations: [
          {
            recipient: memoRecipient,
            trust_memo: memoNotes,
            chain_id: chainIdInput || 'eip155:8453'
          }
        ]
      };
      const payload = await (
        writeClient as unknown as { buildTrustListPayload(input: TrustListInput): Promise<unknown> }
      ).buildTrustListPayload(input);
      return { input, payload };
    });
  };

  const trustBestLabelState = getExampleState('trustBestLabel');
  const trustMemoState = getExampleState('trustMemo');
  const animatedLabelState = exampleStates['animatedLabel'] ?? defaultExampleState;
  const trustSubmissionState = getExampleState('trustSubmission');
  const trustBestLabelData = trustBestLabelState.data as
    | {
        best: Record<string, unknown> | null;
        summary: LabelSummary | null;
        display: string;
        valid: Array<Record<string, unknown>>;
        desiredTags: string[];
      }
    | undefined;
  const trustMemoData = trustMemoState.data as
    | {
        summary: LabelSummary | null;
        confidence: number;
        attestations: Array<Record<string, unknown>>;
      }
    | undefined;
  const trustSubmissionData = trustSubmissionState.data as
    | {
        input: TrustListInput;
        payload: unknown;
      }
    | undefined;

  useEffect(() => {
    if (animatedLabelState.status !== 'success' || !animatedLabelState.data) {
      return;
    }
    const summary = animatedLabelState.data as LabelSummary | null;
    if (!summary) {
      setAnimatedLabelDisplay({
        name: '',
        project: '',
        category: ''
      });
      return;
    }
    const targetName = summary.name ?? animatedAddressTarget;
    setAnimatedLabelDisplay({
      name: '',
      project: summary.project ?? '—',
      category: summary.category ?? '—'
    });

    let index = 0;
    const interval = setInterval(() => {
      index += 1;
      setAnimatedLabelDisplay(prev => ({
        ...prev,
        name: targetName.slice(0, index)
      }));
      if (index >= targetName.length) {
        clearInterval(interval);
      }
    }, 60);

    return () => clearInterval(interval);
  }, [animatedLabelState, animatedAddressTarget]);

  const trustBestLabelCode = `const desiredTags = ['contract_name', 'owner_project'];
const best = await client.api.getBestLabelForAddress(address, { desiredTags });
const display = await client.api.getDisplayName(address, { desiredTags, fallback: 'anon' });
const summary = await client.api.getAddressSummary(address, { desiredTags });
const valid = await client.api.getValidLabelsForAddress(address, { desiredTags });
return { best, display, summary, valid };`;

  const trustMemoCode = `const composeTrustedMemo = async (client: OLIClient, attester: string, recipient: string) => {
  client.trust.setSourceAddress(attester);
  await client.trust.refresh({ sourceAddress: attester, limit: 100 });
  const summary = await client.api.getAddressSummary(recipient);
  const recent = await client.api.getAttestations({ recipient, limit: 3, order: 'desc' });
  return {
    confidence: client.trust.getConfidence(attester),
    summary,
    recent: recent.attestations
  };
};`;

  const animatedLabelCode = `const revealLabel = async (client: OLIClient, address: string) => {
  const summary = await client.api.getAddressSummary(address);
  const label = summary?.name ?? address;
  return label.split('').reduce((frames, _, index) => {
    frames.push(label.slice(0, index + 1));
    return frames;
  }, [] as string[]);
};`;

  const trustVoteCode = `const buildTrustMemo = async (
  client: OLIClient,
  signer: TypedDataSigner,
  ownerName: string,
  attesterAddress: string,
  confidence: number,
  notes: string
) => {
  const writeClient = new WriteClient(client, client.api, signer);
  const input: TrustListInput = {
    ownerName,
    attesters: [{ address: attesterAddress, confidence }],
    attestations: [{ trust_memo: notes }]
  };
  return writeClient.buildTrustListPayload(input);
};`;

  return (
    <div className="space-y-10">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 text-slate-100 shadow-xl">
        <p className="text-sm uppercase tracking-[0.3em] text-indigo-200">SDK Playground</p>
        <h1 className="mt-4 text-4xl font-bold">Experiment with the Open Labels TypeScript SDK</h1>
        <p className="mt-3 max-w-3xl text-base text-slate-200">
          Load the locally linked <code>@openlabels/sdk</code>, explore every major module, and run live queries without
          touching the production UI. Each card pairs runnable inputs with short explanations so you can build and test
          integrations safely.
        </p>
      </div>

      <PlaygroundCard
        id="setup"
        title="1. Configure & initialise the client"
        description="Creates an isolated OLIClient instance that powers every other example on this page."
        actions={
          <>
            <button
              onClick={initializeClient}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500"
            >
              Initialize SDK
            </button>
            <button
              onClick={resetClient}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset
            </button>
          </>
        }
        badge="core"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col text-sm font-medium text-slate-700">
            API key (optional)
            <input
              type="password"
              value={apiKey}
              onChange={event => setApiKey(event.target.value)}
              className="mt-2 rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none"
              placeholder="NEXT_PUBLIC_OLI_API_KEY"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Network
            <select
              value={network}
              onChange={event => setNetwork(event.target.value as keyof typeof NETWORKS)}
              className="mt-2 rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none"
            >
              {NETWORK_OPTIONS.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Minimum confidence filter
            <input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={minConfidence}
              onChange={event => setMinConfidence(Number(event.target.value))}
              className="mt-2 rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Trust list attester
            <input
              value={trustListAttester}
              onChange={event => setTrustListAttester(event.target.value)}
              className="mt-2 rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-indigo-400 focus:outline-none"
              placeholder="0x… (attester publishing trust lists)"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Trust cache TTL (ms)
            <input
              type="number"
              min="0"
              value={trustListCacheTtl}
              onChange={event => setTrustListCacheTtl(Number(event.target.value))}
              className="mt-2 rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Trust min confidence
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={trustListMinConfidence}
              onChange={event => setTrustListMinConfidence(Number(event.target.value))}
              className="mt-2 rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={enableCache} onChange={event => setEnableCache(event.target.checked)} />
            Enable REST response cache
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={autoRank} onChange={event => setAutoRank(event.target.checked)} />
            Auto-rank labels client-side
          </label>
        </div>
        <ResultViewer label="INIT STATUS" status={clientStatus} error={clientError} />
        <div className="rounded-2xl bg-slate-900/90 p-4 text-xs text-slate-200">
          <pre>
{`const oli = new OLIClient({
  network: '${network}',
  autoRank: ${autoRank},
  filters: { minConfidence: ${minConfidence || 'undefined'} },
  attesters: {
    trustListAttester: '${trustListAttester || '<set-attester>'}',
    trustListCacheTtlMs: ${trustListCacheTtl || 'undefined'},
    trustListMinConfidence: ${trustListMinConfidence || 'undefined'}
  },
  api: {
    baseUrl: '${proxyBaseUrl}',
    apiKey: process.env.NEXT_PUBLIC_OLI_API_KEY
  }
});
await oli.init(); // use client.api.createUrl = (path) => path.replace(/^\\//, '')`}
          </pre>
        </div>
      </PlaygroundCard>

      <PlaygroundCard
        id="data"
        title="2. Fetch tag metadata"
        description="The DataFetcher keeps the SDK in sync with the canonical tag schema. Use it to inspect tags and value sets directly from GitHub."
        badge="fetcher"
        actions={
          <>
            <button
              onClick={() =>
                runExample('tags', async client => {
                  const tags = await client.fetcher.getOLITags();
                  setTagDefinitions(tags);
                  return {
                    total: Object.keys(tags).length,
                    sample: Object.keys(tags)
                      .slice(0, 5)
                      .map(tagId => ({ tag_id: tagId, ...tags[tagId] }))
                  };
                })
              }
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-700"
            >
              Load tag definitions
            </button>
            <button
              onClick={() =>
                runExample('valueSets', async client => {
                  if (!client.tagDefinitions || Object.keys(client.tagDefinitions).length === 0) {
                    await client.init();
                  }
                  const sets = await client.fetcher.getOLIValueSets();
                  setValueSets(sets);
                  return {
                    total: Object.keys(sets).length,
                    sample: Object.entries(sets)
                      .slice(0, 5)
                      .map(([tag_id, values]) => ({ tag_id, sample: values.slice(0, 5) }))
                  };
                })
              }
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Load value sets
            </button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Quick filter
            <input
              type="search"
              value={tagFilter}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setTagFilter(event.target.value)}
              className="mt-2 rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none"
              placeholder="contract_name, usage_category, owner_project..."
            />
          </label>
          <p className="text-xs text-slate-500">
            Tip: definitions come straight from <code>1_label_schema/tags/tag_definitions.yml</code>. Refresh whenever you
            pull new changes in the linked SDK.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Tag ID</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Type</th>
              </tr>
            </thead>
            <tbody>
              {filteredTags.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-slate-500" colSpan={3}>
                    {tagDefinitions ? 'No matches' : 'Load tag definitions to preview them here.'}
                  </td>
                </tr>
              )}
              {filteredTags.map(([tagId, meta]) => (
                <tr key={tagId} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-mono text-xs text-indigo-600">{tagId}</td>
                  <td className="px-4 py-2">{meta.display_name ?? meta.name}</td>
                  <td className="px-4 py-2 text-slate-500">{meta.schema?.type ?? 'string'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {valueSets && (
          <p className="text-xs text-slate-500">
            Value sets loaded for {Object.keys(valueSets).length} tags. Use them to build dropdowns or validate user input.
          </p>
        )}
        <ResultViewer label="TAG DEFINITIONS" {...getExampleState('tags')} />
        <ResultViewer label="VALUE SETS" {...getExampleState('valueSets')} />
      </PlaygroundCard>

      <PlaygroundCard
        id="rest"
        title="3. Query addresses & attestations"
        description="Use the REST client for production-grade lookups. Requires an API key for private rate limits."
        badge="rest"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Address / recipient
            <input
              value={addressInput}
              onChange={event => setAddressInput(event.target.value)}
              className="mt-2 rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Chain ID (CAIP-2)
            <input
              value={chainIdInput}
              onChange={event => setChainIdInput(event.target.value)}
              className="mt-2 rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-indigo-400 focus:outline-none"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Tag key
            <input
              value={tagKey}
              onChange={event => setTagKey(event.target.value)}
              className="mt-2 rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Tag value
            <input
              value={tagValue}
              onChange={event => setTagValue(event.target.value)}
              className="mt-2 rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Result limits
            <div className="mt-2 flex gap-2">
              <input
                type="number"
                value={labelLimit}
                onChange={event => setLabelLimit(Number(event.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none"
                placeholder="Labels"
              />
              <input
                type="number"
                value={attestationLimit}
                onChange={event => setAttestationLimit(Number(event.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none"
                placeholder="Attestations"
              />
            </div>
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500"
            onClick={() =>
              runExample('getLabels', async client => {
                const response = await client.api.getLabels({
                  address: addressInput,
                  chain_id: chainIdInput || undefined,
                  limit: labelLimit
                });
                return response;
              })
            }
          >
            Get labels
          </button>
          <button
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-700"
            onClick={() =>
              runExample('searchByTag', async client => {
                const response = await client.api.searchAddressesByTag({
                  tag_id: tagKey || undefined,
                  tag_value: tagValue || undefined,
                  limit: attestationLimit
                });
                return response;
              })
            }
          >
            Search by tag
          </button>
          <button
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() =>
              runExample('attestations', async client => {
                const response = await client.api.getAttestations({
                  recipient: addressInput || undefined,
                  limit: attestationLimit,
                  order: 'desc',
                  chain_id: chainIdInput || undefined
                });
                return response;
              })
            }
          >
            Load raw attestations
          </button>
          <button
            className="rounded-xl border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
            onClick={() =>
              runExample('tagBreakdown', async client => {
                const response = await client.api.getTagBreakdown({
                  tag_id: tagKey || undefined,
                  chain_id: chainIdInput || undefined,
                  limit: 10
                });
                return response;
              })
            }
          >
            Tag breakdown
          </button>
        </div>
        <ResultViewer label="LABELS" {...getExampleState('getLabels')} />
        <ResultViewer label="ADDRESS SEARCH" {...getExampleState('searchByTag')} />
        <ResultViewer label="ATTESTATIONS" {...getExampleState('attestations')} />
        <ResultViewer label="TAG BREAKDOWN" {...getExampleState('tagBreakdown')} />
      </PlaygroundCard>

      <PlaygroundCard
        id="enrichment"
        title="4. Build address profiles & display helpers"
        description="AddressEnricher combines REST queries, helper utilities and trust filtering so you can render human-friendly panels quickly."
        badge="enrichment"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Address to enrich
            <input
              value={enrichmentAddress}
              onChange={event => setEnrichmentAddress(event.target.value)}
              className="mt-2 rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Highlight tag (optional)
            <input
              value={tagKey}
              onChange={event => setTagKey(event.target.value)}
              className="mt-2 rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Fallback name
            <input
              value={fallbackName}
              onChange={event => setFallbackName(event.target.value)}
              className="mt-2 rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500"
            onClick={() =>
              runExample('enrichmentProfile', async client => {
                const profile = await client.enrich.getProfile(enrichmentAddress, {
                  fallbackName,
                  limit: 25,
                  highlightTags: [tagKey, 'owner_project', 'usage_category']
                });
                return profile ?? { message: 'No labels found' };
              })
            }
          >
            Generate profile
          </button>
          <button
            className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            onClick={() =>
              runExample('enrichmentSearch', async client => {
                const response = await client.enrich.searchByTag(tagKey, tagValue, {
                  limit: 5,
                  enrichResults: true
                });
                return response;
              })
            }
          >
            Search & enrich by tag
          </button>
          <button
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() =>
              runExample('displayName', async client => {
                const displayName = await client.api.getDisplayName(enrichmentAddress, { fallback: fallbackName });
                const summary = await client.api.getAddressSummary(enrichmentAddress);
                return { displayName, summary };
              })
            }
          >
            Helper summary
          </button>
        </div>
        <ResultViewer label="PROFILE" {...getExampleState('enrichmentProfile')} />
        <ResultViewer label="TAG SEARCH" {...getExampleState('enrichmentSearch')} />
        <ResultViewer label="HELPERS" {...getExampleState('displayName')} />
      </PlaygroundCard>

      <PlaygroundCard
        id="trust"
        title="5. Trust graphs & attester confidence"
        description="TrustService turns trust-list attestations into a weighted graph so you can rank label sources per end-user."
        badge="trust"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Source address (viewer)
            <input
              value={trustSource}
              onChange={event => setTrustSource(event.target.value)}
              className="mt-2 rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Attester to inspect
            <input
              value={trustTarget}
              onChange={event => setTrustTarget(event.target.value)}
              className="mt-2 rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Trust-list fetch limit
            <input
              type="number"
              value={trustLimit}
              onChange={event => setTrustLimit(Number(event.target.value))}
              className="mt-2 rounded-xl border border-slate-200 px-3 py-2 text-slate-900 focus:border-indigo-400 focus:outline-none"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-amber-500"
            onClick={() =>
              runExample('trustConfidence', async client => {
                if (!trustSource) {
                  throw new Error('Provide a source address to seed the trust table.');
                }
                client.trust.setSourceAddress(trustSource);
                await client.trust.refresh({ sourceAddress: trustSource, limit: trustLimit });
                const confidence = client.trust.getConfidence(trustTarget || trustSource);
                return {
                  source: trustSource,
                  target: trustTarget || trustSource,
                  confidence
                };
              })
            }
          >
            Compute confidence
          </button>
          <button
            className="rounded-xl border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50"
            onClick={() =>
              runExample('trustLists', async client => {
                const response = await client.api.getTrustLists({ limit: trustLimit });
                return response;
              })
            }
          >
            Inspect trust lists
          </button>
        </div>
        <ResultViewer label="CONFIDENCE" {...getExampleState('trustConfidence')} />
        <ResultViewer label="TRUST LISTS" {...getExampleState('trustLists')} />
      </PlaygroundCard>

      <PlaygroundCard
        id="best-label"
        title="6. Trust-aware best labels"
        description="Exercise the new desiredTags + trust-list attester pipeline. When auto-rank and trustListAttester are configured, these helpers bias toward what the selected attester trusts."
        badge="labels"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Address to inspect
            <input
              value={bestLabelAddress}
              onChange={event => setBestLabelAddress(event.target.value)}
              className="mt-2 rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="flex flex-col text-sm font-medium text-slate-700 md:col-span-2">
            Desired tags (comma separated)
            <input
              value={desiredTagsInput}
              onChange={event => setDesiredTagsInput(event.target.value)}
              className="mt-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none"
              placeholder="contract_name,owner_project,usage_category"
            />
          </label>
        </div>
        <button
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500"
          onClick={handleTrustAwareBestLabel}
        >
          Run trust-aware lookup
        </button>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-900">
          {trustBestLabelState.status === 'success' && trustBestLabelData ? (
            <>
              <p className="text-xs uppercase tracking-wide text-emerald-600">
                desired tags: {trustBestLabelData.desiredTags?.join(', ') || 'none'}
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {trustBestLabelData.display}{' '}
                <span className="font-mono text-xs text-emerald-700">{bestLabelAddress}</span>
              </p>
              <p className="mt-2 text-sm">
                Project: {trustBestLabelData.summary?.project ?? '—'} • Category:{' '}
                {trustBestLabelData.summary?.category ?? '—'}
              </p>
              <p className="mt-4 text-xs uppercase tracking-wide text-emerald-600">Valid labels (post-rank)</p>
              <ul className="mt-2 space-y-1 font-mono text-xs text-emerald-800">
                {(trustBestLabelData.valid ?? []).slice(0, 5).map((label: any, index: number) => (
                  <li key={label.uid ?? index}>
                    {label.attester} → {JSON.stringify(label.tags_json ?? {}, null, 0)}
                  </li>
                ))}
                {(trustBestLabelData.valid ?? []).length === 0 && (
                  <li>No labels survived the trust filters.</li>
                )}
              </ul>
            </>
          ) : (
            <p className="text-emerald-700">
              Provide an address + desired tags, then run the lookup to confirm the SDK is honoring trust-weighted ranking.
            </p>
          )}
        </div>
        <details className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <summary className="cursor-pointer font-semibold text-slate-900">Show trust-best-label code</summary>
          <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-slate-900 p-3 text-xs text-slate-100">{trustBestLabelCode}</pre>
        </details>
        <ResultViewer label="TRUSTED BEST LABEL" {...trustBestLabelState} />
      </PlaygroundCard>

      <PlaygroundCard
        id="recipes"
        title="7. Use-case blueprints"
        description="Showcase ready-to-adapt UX patterns powered by the SDK. Each example includes a live preview plus expandable code so you can drop the snippet into your own app."
        badge="recipes"
      >
        <div className="space-y-10">
          <section className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row">
              <label className="flex flex-1 flex-col text-sm font-medium text-slate-700">
                Attester address
                <input
                  value={memoAttester}
                  onChange={event => setMemoAttester(event.target.value)}
                  className="mt-2 rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-indigo-400 focus:outline-none"
                />
              </label>
              <label className="flex flex-1 flex-col text-sm font-medium text-slate-700">
                Recipient address
                <input
                  value={memoRecipient}
                  onChange={event => setMemoRecipient(event.target.value)}
                  className="mt-2 rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-indigo-400 focus:outline-none"
                />
              </label>
            </div>
            <button
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-700"
              onClick={handleTrustMemoCompose}
            >
              Compose trusted memo
            </button>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              {trustMemoState.status === 'success' && trustMemoData?.summary ? (
                <>
                  <p className="text-base font-semibold text-slate-900">
                    {trustMemoData.summary.name}{' '}
                    <span className="font-mono text-xs text-slate-500">{trustMemoData.summary.address}</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Confidence: {(Math.max(0, trustMemoData.confidence ?? 0) * 100).toFixed(1)}% • Project:{' '}
                    {trustMemoData.summary.project ?? 'n/a'} • Category: {trustMemoData.summary.category ?? 'n/a'}
                  </p>
                  <p className="mt-4 text-xs uppercase tracking-wide text-slate-500">Latest attestations</p>
                  <ul className="mt-2 space-y-1 text-xs font-mono text-slate-600">
                    {trustMemoData.attestations.length === 0 && <li>No attestations found for this combo.</li>}
                    {trustMemoData.attestations.map((att: any) => (
                      <li key={att.uid ?? att.id}>
                        {att.time ?? att.time_iso ?? '—'} · {att.schema_info ?? 'label'} · {att.attester ?? 'unknown'}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-slate-500">Run the example to generate a memo that merges trust confidence with attestation context.</p>
              )}
            </div>
            <details className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <summary className="cursor-pointer font-semibold text-slate-900">Show memo code</summary>
              <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-slate-900 p-3 text-xs text-slate-100">{trustMemoCode}</pre>
            </details>
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row">
              <label className="flex flex-1 flex-col text-sm font-medium text-slate-700">
                Address to reveal
                <input
                  value={animatedAddressTarget}
                  onChange={event => setAnimatedAddressTarget(event.target.value)}
                  className="mt-2 rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-indigo-400 focus:outline-none"
                />
              </label>
              <button
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500"
                onClick={handleAnimatedLabel}
              >
                Run reveal animation
              </button>
            </div>
            <div className="rounded-3xl border border-indigo-100 bg-indigo-50/70 p-6 text-center shadow-inner">
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-500">Display name</p>
              <p className="mt-2 font-mono text-3xl text-indigo-900">{animatedLabelDisplay.name || '···'}</p>
              <div className="mt-4 grid gap-4 text-sm text-indigo-700 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-indigo-400">owner_project</p>
                  <p className="font-semibold">{animatedLabelDisplay.project || '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-indigo-400">usage_category</p>
                  <p className="font-semibold">{animatedLabelDisplay.category || '—'}</p>
                </div>
              </div>
            </div>
            <details className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <summary className="cursor-pointer font-semibold text-slate-900">Show animation code</summary>
              <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-slate-900 p-3 text-xs text-slate-100">{animatedLabelCode}</pre>
            </details>
          </section>

          <section className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="flex flex-col text-sm font-medium text-slate-700">
                Trust memo copy
                <textarea
                  value={memoNotes}
                  onChange={event => setMemoNotes(event.target.value)}
                  rows={3}
                  className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-rose-300 focus:outline-none"
                />
              </label>
              <label className="col-span-2 flex flex-col text-sm font-medium text-slate-700">
                Confidence score ({(trustSlider * 100).toFixed(0)}%)
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={trustSlider}
                  onChange={event => setTrustSlider(Number(event.target.value))}
                  className="mt-4 accent-rose-600"
                />
              </label>
            </div>
            <button
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-rose-500"
              onClick={handleTrustVote}
            >
              Build “do you trust” payload
            </button>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              {trustSubmissionState.status === 'success' && trustSubmissionData ? (
                <>
                  <p className="font-semibold text-slate-900">Ready-to-submit payload preview</p>
                  <pre className="mt-3 max-h-60 overflow-auto rounded-xl bg-slate-900 p-3 text-xs text-slate-100">
                    {JSON.stringify(trustSubmissionData.input, null, 2)}
                  </pre>
                </>
              ) : (
                <p className="text-slate-500">Use the slider + memo copy, then click build to see the TrustList payload scaffold.</p>
              )}
            </div>
            <details className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <summary className="cursor-pointer font-semibold text-slate-900">Show trust memo code</summary>
              <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-slate-900 p-3 text-xs text-slate-100">{trustVoteCode}</pre>
            </details>
          </section>
        </div>
      </PlaygroundCard>

      <PlaygroundCard
        id="write"
        title="8. Validate & build attestations"
        description="Use LabelValidator for schema checks and WriteClient to assemble EIP-712 payloads. This playground signs with a deterministic mock signer so you can preview the payload format."
        badge="validator + write"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Label JSON payload
            <textarea
              value={labelJson}
              onChange={event => setLabelJson(event.target.value)}
              rows={10}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <div className="space-y-4 text-sm text-slate-600">
            <p>
              Provide <code>address</code>, <code>chainId</code>, and a <code>tags</code> object. The validator uses the
              latest schema loaded during client initialization, so you can test new tags instantly.
            </p>
            <label className="flex flex-col text-sm font-medium text-slate-700">
              Mock signer address
              <input
                value={writeAddress}
                onChange={event => setWriteAddress(event.target.value)}
                className="mt-2 rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-indigo-400 focus:outline-none"
              />
            </label>
            <p className="text-xs text-slate-500">
              The mock signer generates deterministic signatures (use your own signer in production). Payloads are
              forwarded to the REST client if you want to test submission flows locally.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-rose-500"
                onClick={handleLabelValidation}
              >
                Validate payload
              </button>
              <button
                className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                onClick={handlePayloadBuild}
              >
                Build attestation
              </button>
            </div>
          </div>
        </div>
        <ResultViewer label="VALIDATION" {...getExampleState('validator')} />
        <ResultViewer label="WRITE PAYLOAD" {...getExampleState('write')} />
      </PlaygroundCard>

      <PlaygroundCard
        id="extras"
        title="9. Bonus utilities & next steps"
        description="The SDK ships more helpers than we can demo interactively. Use this checklist as living documentation tied to the local package."
        badge="docs"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>
              <strong>Proxy handler</strong>: wrap <code>oli.api</code> with <code>createProxyHandler</code> to inject
              auth headers or log outgoing requests.
            </li>
            <li>
              <strong>Data exports</strong>: <code>fetcher.getFullRawExport()</code> downloads the entire label pool for
              offline analytics.
            </li>
            <li>
              <strong>Validation helpers</strong>: <code>fetcher.isValidValue(tag_id, value)</code> mirrors the schema
              logic used by the attesters.
            </li>
            <li>
              <strong>Trust auto-refresh</strong>: call <code>trust.startAutoRefresh</code> to keep long-lived dashboards
              up-to-date without manual polling.
            </li>
          </ul>
          <div className="rounded-2xl bg-slate-900/90 p-4 text-xs text-slate-100">
            <pre>
{`import { createProxyHandler } from '@openlabels/sdk';

const apiWithProxy = new Proxy(oli.api, createProxyHandler({
  beforeRequest(path, options) {
    console.log('->', path, options);
  },
  afterResponse(path, response) {
    console.log('<-', path, response.status);
  }
});`}
            </pre>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          Need more? Extend this file with your own scenarios—everything lives under <code>src/components/sdk-playground</code> so
          it never interferes with the production flow.
        </p>
      </PlaygroundCard>
    </div>
  );
};
