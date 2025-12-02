---
title: "An Integration Guide to OLI: SDKs, Bulk Attestations, and Metadata"
excerpt: "Learn how to integrate OLI into your workflow using the Python SDK, build enriched web components with the JS SDK, and bulk attest via the frontend."
date: "2025-12-02"
author: "OLI Team"
authorSocial:
  twitter: "https://twitter.com/open_labels"
  telegram: "https://t.me/olilabels"
tags: ["developer", "integration", "sdk", "guide", "python", "typescript"]
featured: true
readingTime: 8
seo:
  title: "Integration Guide to OLI: SDKs & Bulk Attestations"
  description: "Complete guide to integrating Open Labels Initiative. Learn to use the Python SDK, TypeScript SDK, and Frontend Bulk Upload tools for EVM address labeling."
  keywords: ["open labels initiative","integration", "oli sdk", "python sdk", "typescript sdk", "bulk attestation", "evm labeling", "blockchain development"]
---

The Open Labels Initiative (OLI) is building the trust layer for the EVM ecosystem. Whether you're a developer building a block explorer, a data analyst tracking dapp usage, or a project owner wanting to claim your contracts, OLI provides the tools you need.

In this guide, we'll cover the full workflow:
1.  **Registering Your Project**: The essential first step to create your identity.
2.  **Python SDK**: For backend scripts and data pipelines.
3.  **JavaScript/TypeScript SDK**: For building frontend applications that consume OLI metadata.
4.  **Frontend Bulk Upload**: A "no-code" way to submit a maximum of 50 labels onchain in one go via CSV, featuring our automatic validations and quick fixes.

---

## 1. Prerequisite: Registering Your Project (The `owner_project` Tag)

Before you can attribute contracts to a project (e.g., tagging a contract as owned by "Uniswap"), the project must exist in the OLI registry (powered by the [OSS Directory](https://github.com/opensource-observer/oss-directory)). This ensures that the `owner_project` tag always refers to a valid, canonical entity.

You can easily add your project via the OLI frontend:

### Step 1: Use the AI Profiler
If you can't find your project in the opensource directory or when you use the dropdown for the [Owner Project](https://www.openlabelsinitiative.org/attest#single-attestation), you'll need to add it. We've made this easy with our AI Site Profiler.
1.  Click **"Add New Project"**.
2.  Select ["Use Site Profiler GPT"](https://chatgpt.com/g/g-68d13e485a608191a57c64d28c6db5f0-site-profiler-yaml-v7).
3.  Enter your project's website URL.

![Add a Project with AI Profiler](/blog-images/oli-guide/1.png)

### Step 2: Auto-fill and Verify
The AI will generate a YAML configuration for your project (It might include strange info, so users discretion is advised).
1.  Copy the generated YAML.
2.  Paste it into the **"Quick Start: Auto-fill from YAML"** box.
3.  Click **"Parse YAML & Auto-Fill"**.

![Auto-fill from YAML](/blog-images/oli-guide/3.png)

### Step 3: Submit the Pull Request
Once the form is filled, clicking **"Generate & Submit"** will guide you to create a Pull Request to the OSS Directory. Once merged, your project slug (e.g., `artefacthq`) becomes a valid value for the `owner_project` tag.

![Submit Project PR](/blog-images/oli-guide/4.png)


[Now that you know, go ahead and add it there!](https://www.openlabelsinitiative.org/project)

---

## 2. Python SDK: Scripting Attestations

Now that you have your project registered, you can use the Python SDK to programmatically submit attestations.

### Prerequisites

```bash
pip install oli-python
```

### Usage Example

Here is a polished script that initializes the client, validates your tags against the schema, and performs a bulk submission. Note how we use the `owner_project` slug we just registered.

You can simply use the following snippet using Jupiter Notebook [here](https://github.com/openlabelsinitiative/OLI/blob/main/2_label_pool/tooling_write/python/main.ipynb). (Ready to use) 

Check our [Label Schema](https://www.openlabelsinitiative.org/docs?section=tag-documentation) docs to inform yourself on all the possible tags and value sets, most importantly the `usage_category` [ValueSet](https://www.openlabelsinitiative.org/docs?section=tag-documentation&viewUsageCategory=true).

```python
from oli import OLI

# 1. Initialize the OLI client
# We use a private key to sign attestations, allowing you to build on-chain reputation.
PRIVATE_KEY = "YOUR_PRIVATE_KEY" 
oli = OLI(private_key=PRIVATE_KEY)

print("Initializing OLI API client...")

# 2. Define your Label Data
# Key fields: address, chain_id, and tags (e.g., usage_category, owner_project)
address = "0x9438b8B447179740cD97869997a2FCc9b4AA63a2"
chain_id = "eip155:1"  # Ethereum Mainnet

tags = {
    "contract_name": "GrowThePie Donation Address",
    "is_eoa": True,
    "owner_project": "growthepie", # This must match your registered project slug!
    "usage_category": "donation" 
}

# 3. (Optional) Validate before submission
# This checks if your tags comply with the OLI schema (e.g., valid category_id).
is_valid = oli.validate_label(address, chain_id, tags)
print(f"Attestation is valid: {is_valid}")

if is_valid:
    # 4. Submit a Single Label
    print("Submitting single label...")
    response = oli.submit_label(address, chain_id, tags)
    print(f"Submission response: {response}")

    # 5. Bulk Submission (Recommended for efficiency)
    # You can submit lists of attestations in one request.
    print("Submitting bulk labels...")
    attestations = [
        {"address": address, "chain_id": chain_id, "tags": tags},
        # Add more attestations here...
        {
            "address": "0xdC6fF44d5d932Cbd77B52E5612Ba0529DC6226F1", 
            "chain_id": "eip155:10", # Optimism
            "tags": {"usage_category": "fungible_tokens", "contract_name": "WLD"}
        }
    ]
    
    response = oli.submit_label_bulk(attestations)
    print(f"Bulk submission response: {response}")
```

---

## 3. Web Component: Consuming Metadata

The `@openlabels/oli-sdk` for JavaScript/TypeScript allows you to fetch attestations directly in the browser to enrich your UI.

### Prerequisites

1.  **Install the SDK**:
    ```bash
    npm install @openlabels/oli-sdk
    ```

2.  **Get an API Key**:
    To use the SDK in your application, you'll need an API key for some of the functions.
    *   Go to the [Developer Portal](https://www.openlabelsinitiative.org/developer).
    *   Connect your GitHub account to verify your developer identity.
    *   Complete the brief user info form.
    *   Receive your API key instantly.

    ![Developer API Access](/blog-images/oli-guide/5.png)

### Example: Gas Leaderboard Web Component

```typescript
  import { OLIClient } from '@openlabels/oli-sdk';
  import type { LabelItem } from '@openlabels/oli-sdk/types/api';

  const ADDRESSES = [
    '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24',
    '0x2626664c2603336E57B271c5C0b26F421741e481',
    '0x6fF5693b99212Da76ad316178A184AB56D299b43'
  ];
  const CHAIN_ID = 'eip155:8453';        // Base; set to undefined to search all
  chains
  const LIMIT_PER_ADDRESS = 10;          // How many labels to fetch per address
  const INCLUDE_ALL = true;              // Include older/revoked labels so we
  don’t miss tags
  const REQUIRED_TAGS = ['usage_category', 'owner_project']; // Fields we must
  have

  const parseTime = (l: LabelItem) => (l.time ? Date.parse(l.time) : 0) || 0;

  // Group labels by attestation (attester|time|chain) so we can pick one “payload” per address
  function groupByAttestation(labels: LabelItem[]): LabelItem[][] {
    const groups = new Map<string, LabelItem[]>();
    for (const label of labels) {
      const key = `${(label.attester ?? '').toLowerCase()}|${label.time ?? ''}|
  ${label.chain_id ?? ''}`;
      (groups.get(key) ?? groups.set(key, []).get(key)!)?.push(label);
    }
    return [...groups.values()].sort((a, b) => parseTime(b[0]) -
  parseTime(a[0])); // newest first
  }

  // Prefer the newest attestation that contains all required tags; otherwise use the newest attestation
  function pickGroupWithTags(groups: LabelItem[][], required: string[]) {
    return groups.find(g => required.every(tag => g.some(l => l.tag_id ===
  tag))) ?? groups[0] ?? [];
  }

  // Get the newest value for a tag within the chosen attestation
  const getTag = (labels: LabelItem[], id: string) =>
    labels.find(l => l.tag_id === id)?.tag_value ?? '-';

  async function main() {
    const apiKey = process.env.OLI_API_KEY;
    if (!apiKey) throw new Error('Set OLI_API_KEY');

    const oli = new OLIClient({ api: { apiKey } });
    await oli.init();

    const results = await oli.api.getAttestationsForAddresses(ADDRESSES, {
      chain_id: CHAIN_ID,
      limit_per_address: LIMIT_PER_ADDRESS,
      include_all: INCLUDE_ALL
    });

    for (const { address, labels } of results) {
      const groups = groupByAttestation(labels);
      const selected = pickGroupWithTags(groups, REQUIRED_TAGS);
      const attester = selected.find(l => l.attester)?.attester ?? '';
      const attesterShort = attester ? oli.helpers.formatAddress(attester,
  'short') : '-';

      console.log(
        [
          `address=${address}`,
          `usage=${getTag(selected, 'usage_category')}`,
          `project=${getTag(selected, 'owner_project')}`,
          `name=${getTag(selected, 'contract_name')}`,
          `attester=${attesterShort}`
        ].join(' | ')
      );
    }
  }

  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
```
 Why this approach:

  - Single bulk call to /labels/bulk for all addresses.
  - Fetches multiple labels per address and picks the newest attestation that
    actually has the required tags (usage/project), so you don’t lose fields when
    the latest attestation omits them.
  - Falls back to newest attestation if required tags don’t exist.
  - Keeps the log output simple for front-end enrichment.
---

## 4. Frontend Guide: Bulk Uploads

For users who prefer a UI over code, the OLI frontend provides a powerful **Bulk Attestation** tool. This is perfect for project owners needing to attest dozens of contracts at once, or alrady have CSVs ready of their contracts.

### Step 1: Prepare Your CSV
Create a CSV file with your contract list. We support **fuzzy matching**, so you don't need to worry about perfect headers.

**Required Columns:**
*   `chain_id` (e.g., "Ethereum", "1", "eip155:1")
*   `address` (Contract address)

**Recommended Columns:**
*   `usage_category`: Describes what the contract does.
*   `owner_project`: The slug of a project submitted in the OSS Directory.
*   `contract_name`: A human-readable name.

**Example CSV:**
```csv
chain_id, address, usage_category, contract_name
Ethereum, 0x123...abc, dex, Uniswap V3 Pool
Optimism, 0x456...def, bridge, Optimism Gateway
Base, 0x789...123, nft_marketplace, OpenSea Registry
```
You can also use this the test CSV [here](https://github.com/openlabelsinitiative/oli-frontend/blob/main/public/test-csvs/comprehensive_test.csv) to see how bad your CSVs can be! ;)

### Step 2: Upload & Validate
1.  Drag and drop your CSV into the bulk upload zone.
2.  **Smart Validation**: The system will validate your addresses and categories.
    *   *Typos?* We'll suggest corrections (e.g., "defi" -> `dex`).
    *   *Wrong Chain?* We'll normalize it to the CAIP-2 standard (e.g., `eip155:1`).
3.  Click **Attest** to sign the transaction and publish your labels on-chain.

### Correct Tagging Reference
To ensure your labels are discoverable, use our standard `usage_category` values also broken down [here](https://www.openlabelsinitiative.org/docs?section=tag-documentation). Here are some common ones:

*   **DeFi**: `dex`, `lending`, `staking`, `yield_vaults`, `stablecoin`
*   **NFT**: `nft_marketplace`, `non_fungible_tokens`
*   **Infra**: `bridge`, `oracle`, `trading`
*   **Social**: `governance`, `gaming`

By following these standards, your contracts immediately show up correctly on explorers and dashboards that consume OLI data.
