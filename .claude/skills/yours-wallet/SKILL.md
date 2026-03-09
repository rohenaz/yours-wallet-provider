---
name: yours-wallet
description: Use when building new integrations with Yours Wallet using the BRC-100 CWI (Common Wallet Interface). Covers React setup with CWIProvider/useCWI, vanilla JS with window.CWI, sending BSV, signing messages, encryption, listing ordinals, token operations, and the noSend+BEEF relay pattern. Trigger on: yours wallet, integrate wallet, CWI, BRC-100 wallet, wallet provider, connect to wallet, browser extension wallet, BSV wallet integration, yours-wallet-provider, window.CWI, useCWI, CWIProvider, build dApp, wallet connection, WalletInterface, createAction, listOutputs, getPublicKey, BEEF.
---

# Yours Wallet Integration Guide — BRC-100 CWI

Use this skill when building new dApp integrations with Yours Wallet.

For the full WalletInterface type reference, see [references/cwi-interface.md](references/cwi-interface.md).

## What is CWI?

CWI (Common Wallet Interface) implements BRC-100, a standard wallet interface for BSV. Any BRC-100 compliant wallet exposes the same WalletInterface from @bsv/sdk. Your dApp talks to one standard API — not a wallet-specific one.

Yours Wallet injects window.CWI into the page. The yours-wallet-provider package provides React bindings to detect and consume it.

## Installation

```bash
bun add yours-wallet-provider @bsv/sdk
# For ordinals/tokens:
bun add @1sat/actions @1sat/client
```

## React Setup

```tsx
import { CWIProvider, useCWI } from 'yours-wallet-provider'

function App() {
  return (
    <CWIProvider timeout={10_000}>
      <Dashboard />
    </CWIProvider>
  )
}

function Dashboard() {
  const cwi = useCWI()

  if (cwi.status === 'loading') return <p>Connecting to wallet...</p>
  if (cwi.status === 'unavailable') return <p>Please install Yours Wallet</p>

  // TypeScript narrows wallet to WalletInterface when status === 'available'
  return <WalletUI wallet={cwi.wallet} />
}
```

useCWI() returns a discriminated union:
- { status: 'loading', wallet: undefined } — waiting for extension injection
- { status: 'available', wallet: WalletInterface } — ready to use
- { status: 'unavailable', wallet: undefined } — extension not found within timeout

CWIProvider detects window.CWI injection with a 500ms polling interval. The timeout prop (default 10s) controls how long to wait before marking as unavailable.

## Vanilla JS Setup

```typescript
import type { WalletInterface } from '@bsv/sdk'

function waitForCWI(timeout = 10_000): Promise<WalletInterface> {
  return new Promise((resolve, reject) => {
    if (window.CWI) return resolve(window.CWI)

    const interval = setInterval(() => {
      if (window.CWI) { cleanup(); resolve(window.CWI) }
    }, 500)
    const timer = setTimeout(() => { cleanup(); reject(new Error('Yours Wallet not found')) }, timeout)

    function cleanup() {
      clearInterval(interval)
      clearTimeout(timer)
    }
  })
}

const wallet = await waitForCWI()
```

## Core Concepts

### Actions (Transactions)
BRC-100 calls transactions "actions". An action has a description, labeled inputs/outputs, and is built via createAction(). The wallet handles UTXO selection, signing, and broadcasting.

### Baskets & Tags
Outputs live in baskets (logical groupings like 'default' for BSV, 'ordinals' for NFTs). Tags are labels on individual outputs for filtering. Use listOutputs() with basket/tag filters to query.

### BEEF Format
Transactions return as BEEF (BRC-95) — the tx bundled with merkle proofs for SPV verification. This enables trustless payment verification without a full node.

### protocolID / keyID / counterparty
Key derivation uses BRC-42/43:
- protocolID: [securityLevel, protocolName] — level 1=public, 2=counterparty-specific, 3=privileged
- keyID: identifier within the protocol
- counterparty: the other party's identity key, 'self', or 'anyone'

## Common Recipes

### Check Authentication

```typescript
const { authenticated } = await wallet.isAuthenticated({})
if (!authenticated) {
  await wallet.waitForAuthentication({})
}
```

### Get Network

```typescript
const { network } = await wallet.getNetwork({})
// network is 'mainnet' or 'testnet'
```

### Get Identity Key

```typescript
const { publicKey } = await wallet.getPublicKey({ identityKey: true })
```

### Check Balance

```typescript
const { outputs } = await wallet.listOutputs({ basket: 'default', limit: 1000 })
const satoshis = outputs.filter(o => o.spendable).reduce((sum, o) => sum + o.satoshis, 0)
```

### Send BSV

```typescript
import { P2PKH } from '@bsv/sdk'

const result = await wallet.createAction({
  description: 'Send BSV payment',
  outputs: [{
    lockingScript: new P2PKH().lock(recipientAddress).toHex(),
    satoshis: 5000,
    outputDescription: 'Payment to merchant'
  }]
})
// result.txid is available when broadcast succeeds (undefined when noSend is true)
```

### Sign a Message

```typescript
import { Utils } from '@bsv/sdk'

const { signature } = await wallet.createSignature({
  data: Utils.toArray(message, 'utf8'),
  protocolID: [2, 'myapp'],
  keyID: 'auth',
  counterparty: 'self'
})
```

### Encrypt / Decrypt

```typescript
import { Utils } from '@bsv/sdk'

// Encrypt for a specific counterparty
const { ciphertext } = await wallet.encrypt({
  plaintext: Utils.toArray('secret message', 'utf8'),
  protocolID: [2, 'secure-chat'],
  keyID: 'channel-1',
  counterparty: recipientIdentityKey
})

// Decrypt
const { plaintext } = await wallet.decrypt({
  ciphertext,
  protocolID: [2, 'secure-chat'],
  keyID: 'channel-1',
  counterparty: senderIdentityKey
})
const message = Utils.toUTF8(plaintext)
```

### List Ordinals

```typescript
const { outputs } = await wallet.listOutputs({ basket: 'ordinals' })
// Each output has outpoint, satoshis, tags, labels
// For full ordinal data (inscription content, MAP metadata), query 1Sat API with the outpoint
```

### Ordinal/Token Operations with @1sat/actions

```typescript
import { createContext, transferOrdinals, sendBsv21, listOrdinal } from '@1sat/actions'
import { OneSatServices } from '@1sat/client'

// Create context with services (required for backend operations)
const services = new OneSatServices('main')
const ctx = createContext(wallet, { chain: 'main', services })

// Transfer, list, send tokens, etc. using ctx
```

### noSend + BEEF Relay (Payment Verification)

Use this when a server needs to verify payment before granting access:

```typescript
// Client: create but don't broadcast
const { tx } = await wallet.createAction({
  description: 'Payment to service',
  outputs: [{
    lockingScript: new P2PKH().lock(merchantAddress).toHex(),
    satoshis: 1000,
    outputDescription: 'Service fee'
  }],
  options: { noSend: true }
})

// tx is AtomicBEEF (Byte[] | Uint8Array) — send to server for SPV verification
const beef = tx instanceof Uint8Array ? tx : new Uint8Array(tx!)
await fetch('/api/pay', {
  method: 'POST',
  headers: { 'Content-Type': 'application/octet-stream' },
  body: beef
})
```

### List Transaction History

```typescript
const { actions } = await wallet.listActions({
  labels: ['payment'],
  labelQueryMode: 'any',
  limit: 50
})
```

### Derive App-Specific Keys

```typescript
const { publicKey } = await wallet.getPublicKey({
  protocolID: [2, 'myapp'],
  keyID: 'user-profile',
  counterparty: 'self'
})
```

## Related Skills for Deeper Operations

| Task | Skill |
|------|-------|
| Ordinals minting, transfer, marketplace | 1sat-skills:transaction-building |
| dApp connection patterns (@1sat/connect, @1sat/react) | 1sat-skills:dapp-connect |
| 1Sat API queries (UTXOs, tokens, content) | 1sat-skills:1sat-stack |
| BRC-100 wallet architecture deep dive | bsv-skills:wallet-brc100 |
| BSM message signing | bsv-skills:message-signing |
| BRC-42/43 key derivation details | bsv-skills:key-derivation |
| ECDH encryption patterns | bsv-skills:wallet-encrypt-decrypt |
| Wallet setup and sync | 1sat-skills:wallet-setup |

## Important Rules

- Use bun, not npm
- Use Utils.toArray(), Utils.toBase64(), Utils.toHex() from @bsv/sdk — never Buffer
- Use P2PKH from @bsv/sdk for locking scripts — never raw script construction
- Use @1sat/actions for ordinal/token operations — not raw createAction
- Always pass services when creating @1sat/actions context
- Prefer BEEF format over raw hex
- Never transmit private keys — use signature proofs
- Fail informatively rather than using fallbacks
