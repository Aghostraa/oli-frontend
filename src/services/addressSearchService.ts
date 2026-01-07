'use client';

export interface AddressSearchResult {
  address: string;
  chain_id: string;
  time: string;
  attester: string | null;
}

export interface AddressSearchResponse {
  tag_id: string;
  tag_value: string;
  count: number;
  results: AddressSearchResult[];
}

export interface LabelItem {
  tag_id: string;
  tag_value: string;
  chain_id: string;
  time: string;
  attester: string | null;
}

export interface LabelsResponse {
  address: string;
  count: number;
  labels: LabelItem[];
}

const ADDRESS_SEARCH_API = '/api/addresses/search';
const LABELS_API = '/api/labels';

function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    searchParams.set(key, String(value));
  });
  return searchParams.toString();
}

async function requestJson<T>(endpoint: string, params: Record<string, string | number | boolean | undefined | null>): Promise<T> {
  const query = buildQuery(params);
  const response = await fetch(`${endpoint}?${query}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = (errorBody && errorBody.error) || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function searchAddressesByTag(options: {
  tagId: string;
  tagValue?: string;
  chainId?: string;
  limit?: number;
}): Promise<AddressSearchResponse> {
  const { tagId, tagValue, chainId, limit = 100 } = options;

  return requestJson<AddressSearchResponse>(ADDRESS_SEARCH_API, {
    tag_id: tagId,
    tag_value: tagValue,
    chain_id: chainId,
    limit
  });
}

export async function fetchLabelsForAddress(options: {
  address: string;
  chainId?: string;
  limit?: number;
  includeAll?: boolean;
}): Promise<LabelsResponse> {
  const { address, chainId, limit = 100, includeAll = false } = options;

  return requestJson<LabelsResponse>(LABELS_API, {
    address,
    chain_id: chainId,
    limit,
    include_all: includeAll
  });
}
