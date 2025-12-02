# Open Labels Initiative (OLI)

A Next.js application providing a user interface for the Open Labels Initiative - a standardized framework and data model for EVM address labeling.

## About the Project

Open Labels Initiative (OLI) is built on three core pillars:

1. **Data Model** - A standardized framework for blockchain address labeling that ensures consistency across different databases.
2. **Label Pool** - A publicly accessible database of attested labels, collected through blockchain attestations.
3. **Label Confidence** - Trust algorithms applied to raw labels, optimized for various use cases like analytics and security.

## Features

- **Search** - Find and explore detailed information about EVM addresses
- **Attest** - Contribute to the ecosystem by creating attestations for blockchain addresses
- **Analytics** - View statistics, leaderboards of attestors, and explore attestation distribution


## Technology Stack

- **Frontend**: Next.js 15, React 19, TailwindCSS 3
- **State Management**: React Hooks
- **GraphQL**: Apollo Client for data fetching
- **Blockchain Integration**: Ethereum Attestation Service (EAS) SDK, ethers.js
- **UI Components**: Recharts for data visualization, Headless UI for accessible components
- **Styling**: TailwindCSS with custom gradients

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- NPM or Yarn
- MetaMask or compatible Ethereum wallet for creating attestations

### Installation

1. Clone the repository
   ```
   git clone https://github.com/openlabelsinitiative/oli.git
   cd oli
   ```

2. Install dependencies
   ```
   npm install
   # or
   yarn install
   ```


3. Run the development server
   ```
   npm run dev
   # or
   yarn dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

- `/src/app`: Next.js app directory structure containing pages
- `/src/components`: Reusable React components
- `/src/services`: API services and data fetching logic
- `/src/constants`: Project constants and configuration
- `/src/lib`: Utility functions and shared libraries

## Key Components

- **AttestationForm**: Form for creating new address attestations
- **SearchTab**: Interface for searching and exploring address labels
- **LeaderboardTable**: Displays top attestors in the ecosystem
- **LatestAttestations**: Shows recent attestation activity

## Blockchain Integration

The application integrates with the Ethereum Attestation Service (EAS) on Base network and optionaly Arbitrum. Attestations use a standardized schema with the UID:
```
0xb763e62d940bed6f527dd82418e146a904e62a297b8fa765c9b3e1f0bc6fdd68
```

### Arbitrum Orbit Chains Integration

OLI automatically syncs and supports all mainnet Arbitrum Orbit chains. The system:
- Fetches chain data monthly from the [Arbitrum Portal API](https://portal-data.arbitrum.io/__auto-generated-orbitChains.json)

**Quick Setup:**
```bash
# Fetch Orbit chains for the first time
npm run sync-orbit-chains
```

## Contributing

Contributions are welcome! Please check out our community calls and join the ecosystem.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Community

- Join our [community calls](https://calendar.google.com/calendar/u/3?cid=MmQ0MzYxNzQ3ZGFiY2M3ZDJkZjk0NjZiYmY3MmNmZDUwZTNjMjE2OTQ4YzgyNmI4OTBmYjYyN2VmNGRjNjQ4OEBncm91cC5jYWxlbmRhci5nb29nbGUuY29t)
- Follow us on [Twitter](https://x.com/open_labels)
- Check out our main [GitHub repository](https://github.com/openlabelsinitiative/OLI)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Products Using OLI

- [Enscribe](https://app.enscribe.xyz/) - Tool to Assign ENS to contracts
- [growthepie Labels](https://labels.growthepie.com/) - Label explorer and analytics platform
- [growthepie Applications](https://www.growthepie.com/applications/) - L2 analytics platform
- [Blockscout](https://www.blockscout.com/) - Block explorer providing contract metadata
- [AGX](https://agx.app/) - Blockchain analytics platform
- [Sourcify](https://repo.sourcify.dev/) - Contract verification service


## Supporters

- Ethereum Foundation
- growthepie