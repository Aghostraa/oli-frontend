'use server';

import { OLIClient } from '@openlabels/sdk';

let oliClient: OLIClient | null = null;
let configuredApiKey: string | undefined;
let initializationAttempted = false;

function resolveApiKey(): string | undefined {
  return process.env.OLI_API_KEY ?? process.env.NEXT_PUBLIC_OLI_API_KEY;
}

async function initializeClient(client: OLIClient) {
  if (initializationAttempted) {
    return;
  }

  initializationAttempted = true;

  try {
    await client.init();
  } catch (error) {
    console.warn('OLI SDK initialization failed; proceeding without cached tag metadata.', error);
  }
}

/**
 * Lazily instantiate and initialize a shared OLI SDK client.
 * Recreates the client if the API key changes between calls.
 */
export async function getOLIClient(): Promise<OLIClient> {
  const apiKey = resolveApiKey();

  if (!oliClient || configuredApiKey !== apiKey) {
    oliClient = new OLIClient({
      api: {
        apiKey,
        timeoutMs: 0,
        enableCache: true,
        cacheTtl: 30_000,
        staleWhileRevalidate: 15_000
      }
    });
    configuredApiKey = apiKey;
    initializationAttempted = false;
  }

  await initializeClient(oliClient);

  return oliClient;
}
