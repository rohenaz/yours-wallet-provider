---
name: yours-wallet-migration
description: Use when migrating, upgrading, or converting dApps from legacy yours-wallet-provider v3.x (window.yours, window.panda, YoursProvider, useYoursWallet) to the new BRC-100 CWI interface v4.x (window.CWI, CWIProvider, useCWI, WalletInterface). Covers the full paradigm shift from custom wallet methods to the BRC-100 standard, including mappings for all legacy API methods to their CWI equivalents or replacements. Trigger phrases: migrate yours-wallet, upgrade wallet provider, switch from legacy wallet, update from YoursProvider, convert window.yours to CWI, refactor useYoursWallet, yours-wallet-provider v4 migration, window.yours is undefined, useYoursWallet deprecated, YoursProvider not found.
---

# Yours Wallet Migration Guide — Legacy Provider to BRC-100 CWI

Follow this guide when migrating an existing application from yours-wallet-provider v3.x (legacy) to v4.x+ (CWI/BRC-100).

For the complete legacy type definitions, see [references/legacy-types.md](references/legacy-types.md).

## Why the API Changed

The legacy provider was a custom wallet API specific to Yours Wallet. BRC-100 (CWI — Common Wallet Interface) is a Bitcoin SV standard that any compliant wallet can implement. Migrating means your dApp becomes wallet-agnostic: any BRC-100 wallet works, not just Yours.

The other major shift is the transaction model. Legacy returned raw hex ({ txid, rawtx }). CWI returns BEEF (Background Evaluation Extended Format, BRC-95) which bundles SPV merkle proofs with the transaction — enabling trustless verification without a full node.

## Architecture Change Summary

| Aspect | Legacy (v3.x) | New (v4.x CWI) |
|--------|---------------|-----------------|
| Global object | window.yours / window.panda | window.CWI |
| Interface | YoursProviderType (custom) | WalletInterface from @bsv/sdk |
| React provider | YoursProvider | CWIProvider |
| React hook | useYoursWallet() | useCWI() |
| Hook return type | YoursProviderType (all methods) | Discriminated union: { status, wallet } |
| Peer dependency | None beyond React | @bsv/sdk (for types) |
| Data model | Custom types per method | BRC-100 Actions, Baskets, Tags |
| Permission model | Domain whitelist + popup | Originator-based WalletPermissionsManager |
| Transaction format | Raw hex / custom objects | BEEF (BRC-95) |
| Key derivation | DerivationTag (label/id/domain) | BRC-42/43 protocolID + keyID + counterparty |

## Step 1 — Update Dependencies

```bash
bun add yours-wallet-provider@latest @bsv/sdk
```

## Step 2 — Swap React Provider and Hook

### Before

```tsx
import { YoursProvider, useYoursWallet } from 'yours-wallet-provider'

function App() {
  return (
    <YoursProvider>
      <MyApp />
    </YoursProvider>
  )
}

function MyApp() {
  const wallet = useYoursWallet()
  // wallet.isReady, wallet.connect(), etc.
}
```

### After

```tsx
import { CWIProvider, useCWI } from 'yours-wallet-provider'

function App() {
  return (
    {/* Optional: timeout={10000} (default). Set to control how long to wait for CWI injection. */}
    <CWIProvider>
      <MyApp />
    </CWIProvider>
  )
}

function MyApp() {
  const cwi = useCWI()
  // cwi.status: 'loading' | 'available' | 'unavailable'
  // cwi.wallet: WalletInterface (narrowed when status === 'available')

  if (cwi.status === 'loading') return <p>Connecting...</p>
  if (cwi.status === 'unavailable') return <p>Install Yours Wallet</p>

  // TypeScript narrows wallet to WalletInterface here
  const { wallet } = cwi
}
```

useCWI() returns a discriminated union. When status === 'available', TypeScript narrows wallet to WalletInterface automatically — no null assertions needed.

## Step 3 — Method Migration Reference

### Connection

| Legacy | CWI Equivalent | Notes |
|--------|----------------|-------|
| connect() → identityPubKey | getPublicKey({ identityKey: true }) → .publicKey | No explicit connect; extension handles permission prompts automatically |
| disconnect() | No equivalent | Connection lifecycle managed by extension |
| isConnected() | Check cwi.status === 'available' | Status is reactive via the provider |

### Identity & Keys

| Legacy | CWI Equivalent |
|--------|----------------|
| getPubKeys() → { bsvPubKey, ordPubKey, identityPubKey } | getPublicKey({ identityKey: true }) for identity; derived keys via getPublicKey({ protocolID, keyID }) |
| getAddresses() → { bsvAddress, ordAddress, identityAddress } | Derive from public keys using @bsv/sdk address utilities |
| getSocialProfile() → { displayName, avatar } | BAP identity lookup via 1Sat API (not a wallet method) |

**Key derivation mapping:**

```typescript
// DerivationTag → protocolID/keyID mapping:
//   label  → protocolID[1]  (protocol name string)
//   id     → keyID
//   domain → counterparty (or derive from originator context)
//   meta   → encode in keyID if needed
//
// Security levels for protocolID[0]:
//   1 = anyone can derive (public)
//   2 = specific counterparty required  ← most app-level use
//   3 = privileged / wallet-internal

// Legacy (TaggedDerivationRequest has label + id + meta; domain is on the response tag, not the request)
await wallet.generateTaggedKeys({ label: 'myapp', id: 'encryption' })

// CWI
await wallet.getPublicKey({ protocolID: [2, 'myapp'], keyID: 'encryption', counterparty: 'self' })
```

### Balance & UTXOs

```typescript
// Legacy
const { satoshis } = await wallet.getBalance()
const utxos = await wallet.getPaymentUtxos()

// CWI
const { outputs } = await wallet.listOutputs({ basket: 'default', limit: 1000 })
const satoshis = outputs.filter(o => o.spendable).reduce((sum, o) => sum + o.satoshis, 0)
```

### Sending BSV

```typescript
// Legacy
await wallet.sendBsv([
  { address: '1abc...', satoshis: 5000 },
  { address: '1def...', satoshis: 3000 }
])

// CWI
import { P2PKH } from '@bsv/sdk'

await wallet.createAction({
  description: 'Send BSV payment',
  outputs: [
    { lockingScript: new P2PKH().lock('1abc...').toHex(), satoshis: 5000, outputDescription: 'Payment 1' },
    { lockingScript: new P2PKH().lock('1def...').toHex(), satoshis: 3000, outputDescription: 'Payment 2' }
  ]
})
```

### Ordinals & Inscriptions

| Legacy | CWI Equivalent |
|--------|----------------|
| getOrdinals() | listOutputs({ basket: 'ordinals' }) + parse via 1Sat API |
| inscribe(InscribeRequest[]) | createAction() with inscription outputs via @1sat/actions |
| transferOrdinal({ address, origin, outpoint }) | createAction() spending the ordinal output via @1sat/actions |
| purchaseOrdinal({ outpoint }) | createAction() with OrdLock unlock via @1sat/actions |

```typescript
// CWI — use @1sat/actions for ordinal operations
import { createContext } from '@1sat/actions'
import { OneSatServices } from '@1sat/client'

const services = new OneSatServices('main')
const ctx = createContext(wallet, { chain: 'main', services })
// Pass ctx to action functions like transferOrdinals(), listOrdinal(), etc.
```

### Tokens (BSV20/BSV21/MNEE)

| Legacy | CWI Equivalent |
|--------|----------------|
| getBsv20s() | listOutputs({ basket: 'bsv21', tags: [tokenId] }) |
| sendBsv20({ idOrTick, address, amount }) | sendBsv21() from @1sat/actions with context |
| sendMNEE(SendMNEE[]) | createAction() with MNEE transfer via @mnee/ts-sdk |
| getMNEEBalance() | Use @mnee/ts-sdk or listOutputs({ basket: 'mnee' }) |
| purchaseBsv20({ outpoint }) | createAction() with BSV20 purchase logic via @1sat/actions |

### Methods Changed

| Legacy | CWI Equivalent |
|--------|----------------|
| getNetwork() | wallet.getNetwork({}) — returns { network: 'mainnet' \| 'testnet' } |

### Methods Removed (No CWI Equivalent)

| Legacy | Replacement |
|--------|-------------|
| isReady (property) | Check cwi.status !== 'loading' |
| getExchangeRate() | Use an external BSV price API |
| getSignatures({ rawtx, sigRequests }) | Not needed — createAction() handles signing internally. For advanced use, signAction(). |
| removeListener(event, fn) | No event system; use cwi.status reactivity |

### Signing & Encryption

```typescript
// Legacy signMessage
const signed = await wallet.signMessage({ message: 'Hello', encoding: 'utf8', tag: { label: 'myapp', id: 'auth', domain: 'example.com' } })

// CWI createSignature
import { Utils } from '@bsv/sdk'
const result = await wallet.createSignature({ data: Utils.toArray('Hello', 'utf8'), protocolID: [2, 'myapp'], keyID: 'auth', counterparty: 'self' })
```

```typescript
// Legacy encrypt (array of pubKeys — encrypts for multiple recipients)
await wallet.encrypt({ message: 'secret', pubKeys: [recipientPubKey], tag: { label: 'myapp', id: 'ch-1', domain: '' } })

// CWI encrypt (single counterparty — call separately per recipient)
await wallet.encrypt({ plaintext: Utils.toArray('secret', 'utf8'), protocolID: [2, 'myapp'], keyID: 'ch-1', counterparty: recipientIdentityKey })
```

```typescript
// Legacy decrypt
const decrypted = await wallet.decrypt({ messages: [ciphertext], tag: { label: 'myapp', id: 'ch-1', domain: '' } })

// CWI decrypt (single counterparty)
const result = await wallet.decrypt({ ciphertext: Utils.toArray(ciphertext, 'base64'), protocolID: [2, 'myapp'], keyID: 'ch-1', counterparty: senderIdentityKey })
const message = Utils.toUTF8(result.plaintext)
```

### Broadcasting

| Legacy | CWI Equivalent |
|--------|----------------|
| broadcast({ rawtx, format }) → txid | createAction() broadcasts automatically; for external tx use internalizeAction() |

### Locking BSV

| Legacy | CWI Equivalent |
|--------|----------------|
| lockBsv(LockRequest[]) → SendBsvResponse | createAction() with CLTV locking script (see 1sat-skills:timelock) |

### Events

| Legacy | CWI Equivalent |
|--------|----------------|
| on('signedOut', listener) | Detect via waitForAuthentication() |
| on('switchAccount', listener) | Re-query identity key or listen for extension events |

## Step 4 — Transaction Format Changes

Legacy methods returned { txid, rawtx } as hex strings. CWI uses BEEF (BRC-95) which bundles the transaction with merkle proofs for SPV verification.

```typescript
// Legacy
const { txid, rawtx } = await wallet.sendBsv([...])

// CWI — broadcasts automatically, returns txid
const result = await wallet.createAction({ description: 'Payment', outputs: [...] })
// result.txid after broadcast

// For payment verification (noSend pattern):
const result = await wallet.createAction({ description: 'Payment', outputs: [...], options: { noSend: true } })
// result.tx is BEEF bytes (number[]) — pass to server for SPV verification
```

## Step 5 — Buffer and Encoding Changes

```typescript
// Remove all Buffer usage. Replace with @bsv/sdk Utils:
import { Utils } from '@bsv/sdk'

Utils.toArray('hello', 'utf8')   // string → number[]
Utils.toArray(hexStr, 'hex')     // hex → number[]
Utils.toHex(byteArray)           // number[] → hex string
Utils.toBase64(byteArray)        // number[] → base64 string
Utils.toUTF8(byteArray)          // number[] → string
```

## Common Migration Pitfalls

1. **No connect() method** — CWI manages permissions automatically. Gate UI on cwi.status instead.
2. **Raw hex is gone** — createAction() returns BEEF. Use Transaction.fromBEEF(result.tx) only if a dependency requires raw hex.
3. **Buffer breaks in non-Node environments** — Use Utils from @bsv/sdk.
4. **Don't mix old and new providers** — Remove all window.yours / window.panda references.
5. **Key derivation security levels are new** — Choose protocolID[0] carefully: 1=public, 2=counterparty-specific (most common), 3=privileged.
6. **Balance is no longer one call** — Sum satoshis from listOutputs().
7. **Ordinal/token operations need @1sat/actions** — The wallet has no ordinal-specific methods. Always pass services when creating context: `createContext(wallet, { chain: 'main', services })`.
8. **Encryption is per-counterparty** — Legacy took an array of pubKeys. CWI takes a single counterparty. Loop for multiple recipients.

## Migration Checklist

- [ ] Update yours-wallet-provider to latest and add @bsv/sdk
- [ ] Replace YoursProvider with CWIProvider
- [ ] Replace useYoursWallet() with useCWI() — handle discriminated union { status, wallet }
- [ ] Remove window.yours / window.panda references and type declarations
- [ ] Convert sendBsv() to createAction() with P2PKH outputs
- [ ] Convert signMessage() to createSignature() with protocolID/keyID
- [ ] Convert encrypt()/decrypt() to CWI equivalents (protocolID/keyID/counterparty)
- [ ] Convert generateTaggedKeys()/getTaggedKeys() to getPublicKey()
- [ ] Update transaction handling for BEEF format
- [ ] Remove connect()/disconnect() calls — use cwi.status for gating
- [ ] Replace getBalance() with listOutputs() aggregation
- [ ] Update ordinal operations to use @1sat/actions with services
- [ ] Update token operations to use @1sat/actions or @mnee/ts-sdk
- [ ] Replace all Buffer usage with @bsv/sdk Utils
- [ ] Review security levels on all protocolID usages
- [ ] Test all permission flows with the updated extension
