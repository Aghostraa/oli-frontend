'use client';

import type { ExpandedAttestation } from '@openlabels/oli-sdk';

const ATTTESTATIONS_API = '/api/attestations';

export type Attestation = ExpandedAttestation;

interface AttestationApiResponse {
  count: number;
  attestations: ExpandedAttestation[];
}

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

async function requestAttestations(params: Record<string, string | number | boolean | undefined | null>): Promise<AttestationApiResponse> {
  const query = buildQuery(params);
  const response = await fetch(`${ATTTESTATIONS_API}?${query}`, {
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

  const data = (await response.json()) as AttestationApiResponse;
  return data;
}

export async function fetchAttestationsByContract(
  contractAddress: string,
  cacheBreaker?: { timestamp: number },
  limit: number = 50
): Promise<Attestation[]> {
  const { attestations } = await requestAttestations({
    recipient: contractAddress,
    limit,
    order: 'desc',
    cacheBreaker: cacheBreaker?.timestamp
  });

  return attestations;
}

export async function searchAttestations(options: {
  contractAddress?: string;
  recipient?: string;
  dataContains?: string;
  limit?: number;
  cacheBreaker?: { timestamp: number };
}): Promise<Attestation[]> {
  const { contractAddress, recipient, dataContains, limit = 50, cacheBreaker } = options;

  const params: Record<string, string | number | boolean | undefined | null> = {
    limit,
    order: 'desc',
    cacheBreaker: cacheBreaker?.timestamp
  };

  if (contractAddress) {
    params.attester = contractAddress;
  }

  if (recipient) {
    params.recipient = recipient;
  }

  if (dataContains) {
    params.dataContains = dataContains;
  }

  const { attestations } = await requestAttestations(params);
  return attestations;
}

export async function fetchLatestAttestations(limit: number = 5): Promise<Attestation[]> {
  const { attestations } = await requestAttestations({
    limit,
    order: 'desc'
  });
  return attestations;
}
