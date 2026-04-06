---
name: yours-wallet-migration
description: Use when migrating, upgrading, or converting dApps from legacy yours-wallet-provider v3.x (window.yours, window.panda, YoursProvider, useYoursWallet) to the new BRC-100 CWI interface v4.x (window.CWI, CWIProvider, useCWI, WalletInterface). Covers the full paradigm shift from custom wallet methods to the BRC-100 standard, including mappings for all legacy API methods to their CWI equivalents or replacements. Trigger phrases: migrate yours-wallet, upgrade wallet provider, switch from legacy wallet, update from YoursProvider, convert window.yours to CWI, refactor useYoursWallet, yours-wallet-provider v4 migration, window.yours is undefined, useYoursWallet deprecated, YoursProvider not found.
---

# Yours Wallet Migration Guide — Legacy Provider to BRC-100 CWI

Follow this guide when migrating an existing application from yours-wallet-provider v3.x (legacy) to v4.x+ (CWI/BRC-100).

For the complete legacy type definitions, see [references/legacy-types.md](references/legacy-types.md).

## Critical Migration Rule

**Never drop features.** Every section, button, input, and handler in the legacy app must have a corresponding implementation in the migrated app. If a legacy method has no direct CWI equivalent, provide a stub that logs a helpful message explaining the alternative. Do not remove UI elements.

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
| Peer dependency | None beyond React | @bsv/sdk, @1sat/actions (for types and actions) |
| Data model | Custom types per method | BRC-100 Actions, Baskets, Tags |
| Permission model | Domain whitelist + popup | Originator-based WalletPermissionsManager |
| Transaction format | Raw hex / custom objects | BEEF (BRC-95) |
| Key derivation | DerivationTag (label/id/domain) | BRC-42/43 protocolID + keyID + counterparty |
| Ordinals/tokens | Built-in wallet methods | @1sat/actions (action system) |

## Step 1 — Update Dependencies

```bash
bun add yours-wallet-provider@latest @bsv/sdk @1sat/actions @1sat/core
```

> **Important:** `@1sat/actions` is required for ordinals, tokens, inscriptions, locks, and signing. Do not hand-roll scripts — use the action system.

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

## Step 3 — Set Up the Action Context

Most operations use `@1sat/actions` which requires a context wrapping the wallet:

```typescript
import { createContext } from '@1sat/actions'

// Inside your component, after wallet is available:
const { wallet } = cwi
const ctx = createContext(wallet, { services: undefined })

// For operations needing network access (ordinals, tokens, locks):
import { OneSatServices } from '@1sat/wallet'
const services = new OneSatServices('main')
const ctx = createContext(wallet, { services })
```

## Step 4 — Method Migration Reference

### Connection

| Legacy | CWI Equivalent | Notes |
|--------|----------------|-------|
| connect() → identityPubKey | waitForAuthentication() then getPublicKey({ identityKey: true }) → .publicKey | waitForAuthentication() triggers the extension permission prompt; getPublicKey retrieves the identity key after auth |
| disconnect() | No equivalent — clear local state | Connection lifecycle managed by extension |
| isConnected() | Check cwi.status === 'available', or try getPublicKey | Status is reactive via the provider |

```typescript
// Legacy
const identityPubKey = await wallet.connect()

// CWI — waitForAuthentication() triggers the extension permission prompt,
// then getPublicKey() retrieves the identity key
await wallet.waitForAuthentication()
const { publicKey } = await wallet.getPublicKey({ identityKey: true })
setIdentityPubKey(publicKey)

// Legacy disconnect → just clear local state
setIdentityPubKey('')

// Legacy isConnected → check status or try getPublicKey
const isConnected = cwi.status === 'available'
```

### Identity & Keys

| Legacy | CWI Equivalent |
|--------|----------------|
| getPubKeys() → { bsvPubKey, ordPubKey, identityPubKey } | getPublicKey({ identityKey: true }) for identity; derived keys via getPublicKey({ protocolID, keyID }) |
| getAddresses() → { bsvAddress, ordAddress, identityAddress } | Derive from public keys using PublicKey.fromString(pk).toAddress() |
| getSocialProfile() → { displayName, avatar } | BAP identity lookup via 1Sat API (not a wallet method) |

```typescript
import { PublicKey } from '@bsv/sdk'

// Legacy getPubKeys
const { bsvPubKey, ordPubKey, identityPubKey } = await wallet.getPubKeys()

// CWI — three separate calls
const identity = await wallet.getPublicKey({ identityKey: true })
const bsv = await wallet.getPublicKey({ protocolID: [2, 'wallet'], keyID: 'bsv', counterparty: 'self' })
const ord = await wallet.getPublicKey({ protocolID: [2, 'wallet'], keyID: 'ord', counterparty: 'self' })

// Legacy getAddresses
const { bsvAddress } = await wallet.getAddresses()

// CWI — derive addresses from public keys
const bsvAddress = PublicKey.fromString(bsv.publicKey).toAddress()
const ordAddress = PublicKey.fromString(ord.publicKey).toAddress()
const identityAddress = PublicKey.fromString(identity.publicKey).toAddress()
```

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
const spendable = outputs.filter(o => o.spendable)
const satoshis = spendable.reduce((sum, o) => sum + o.satoshis, 0)

// Legacy getMNEEBalance
const { amount } = await wallet.getMNEEBalance()

// CWI — query MNEE basket
const { outputs: mneeOutputs } = await wallet.listOutputs({ basket: 'mnee', limit: 1000 })
const mneeSpendable = mneeOutputs.filter(o => o.spendable)
```

### Sending BSV — Use @1sat/actions

```typescript
import { sendBsv, createContext } from '@1sat/actions'

const ctx = createContext(wallet, { services: undefined })

// Legacy
await wallet.sendBsv([
  { address: '1abc...', satoshis: 5000 },
  { address: '1def...', satoshis: 3000 }
])

// CWI — use sendBsv action
await sendBsv.execute(ctx, {
  requests: [
    { address: '1abc...', satoshis: 5000 },
    { address: '1def...', satoshis: 3000 },
  ],
})

// Legacy OP_RETURN data
await wallet.sendBsv([{ satoshis: 0, data: ['hello', 'world'] }])

// CWI — sendBsv supports data arrays directly
await sendBsv.execute(ctx, {
  requests: [{ data: ['hello', 'world'], satoshis: 0 }],
})
```

### Signing Messages — Use @1sat/actions

```typescript
import { signBsm, createContext } from '@1sat/actions'

const ctx = createContext(wallet, { services: undefined })

// Legacy
const signed = await wallet.signMessage({ message: 'Hello', encoding: 'utf8' })

// CWI — use signBsm action
const result = await signBsm.execute(ctx, {
  message: 'Hello',
  encoding: 'utf8',
})
// result: { address, pubKey, message, sig }
```

### Ordinals — Use @1sat/actions

```typescript
import { getOrdinals, transferOrdinals, purchaseOrdinal, inscribe, createContext } from '@1sat/actions'

const ctx = createContext(wallet, { services })

// Legacy getOrdinals
const ordinals = await wallet.getOrdinals()

// CWI
const { outputs, BEEF } = await getOrdinals.execute(ctx, { limit: 100 })
```

```typescript
// Legacy transferOrdinal
await wallet.transferOrdinal({ address: '1abc...', origin: 'txid_0', outpoint: 'txid_0' })

// CWI — get ordinal from wallet, then transfer
const { outputs } = await getOrdinals.execute(ctx, { limit: 100 })
const ordinal = outputs.find(o => o.outpoint === 'txid_0')
await transferOrdinals.execute(ctx, {
  transfers: [{ ordinal, address: '1abc...' }],
})
```

```typescript
// Legacy purchaseOrdinal
await wallet.purchaseOrdinal({ outpoint: 'txid_0' })

// CWI
await purchaseOrdinal.execute(ctx, {
  outpoint: 'txid_0',
  marketplaceAddress: '1Market...',  // optional
  marketplaceRate: 0.02,             // optional
})
```

```typescript
// Legacy inscribe
await wallet.inscribe([{
  address: '1abc...',
  base64Data: btoa('Hello'),
  mimeType: 'text/plain',
  map: { app: 'myapp', type: 'test' },
}])

// CWI — use inscribe action
await inscribe.execute(ctx, {
  base64Content: btoa('Hello'),
  contentType: 'text/plain',
  map: { app: 'myapp', type: 'test' },
})
```

### Tokens (BSV20/BSV21) — Use @1sat/actions

```typescript
import { getBsv21Balances, sendBsv21, purchaseBsv21, createContext } from '@1sat/actions'

const ctx = createContext(wallet, { services })

// Legacy getBsv20s
const tokens = await wallet.getBsv20s()

// CWI
const balances = await getBsv21Balances.execute(ctx, {})
```

```typescript
// Legacy sendBsv20
await wallet.sendBsv20({ idOrTick: 'TOKEN_ID', address: '1abc...', amount: 100 })

// CWI
await sendBsv21.execute(ctx, {
  tokenId: 'TOKEN_ID',
  amount: '100',
  address: '1abc...',
})
```

```typescript
// Legacy purchaseBsv20
await wallet.purchaseBsv20({ outpoint: 'txid_0' })

// CWI
await purchaseBsv21.execute(ctx, {
  tokenId: 'TOKEN_ID',
  outpoint: 'txid_0',
  amount: '100',
})
```

### Lock BSV — Use @1sat/actions

```typescript
import { lockBsv, getLockData, createContext } from '@1sat/actions'

const ctx = createContext(wallet, { services })

// Legacy
await wallet.lockBsv([{ address: '1abc...', blockHeight: 900000, sats: 10000 }])

// CWI — use lockBsv action (address is derived by wallet, not specified)
await lockBsv.execute(ctx, {
  requests: [{ satoshis: 10000, until: 900000 }],
})

// Check lock status
const data = await getLockData.execute(ctx, {})
// data: { totalLocked, unlockable, nextUnlock }
```

### Broadcasting External Transactions

```typescript
// Legacy
const txid = await wallet.broadcast({ rawtx: hexString })

// CWI — use internalizeAction for external transactions
// (createAction broadcasts automatically for wallet-created txs)
import { Utils } from '@bsv/sdk'

const txBytes = Utils.toArray(hexString, 'hex')
await wallet.internalizeAction({
  tx: txBytes,
  outputs: [],
  description: 'Broadcast external transaction',
})
```

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

### Methods Changed

| Legacy | CWI Equivalent |
|--------|----------------|
| getNetwork() | wallet.getNetwork({}) — returns { network: 'mainnet' \| 'testnet' } |

### Methods Removed (No CWI Equivalent)

These methods have no wallet-level replacement. Provide a stub that logs a helpful message. **Do not remove the UI element.**

| Legacy | Replacement |
|--------|-------------|
| isReady (property) | Check cwi.status !== 'loading' |
| getExchangeRate() | Use an external BSV price API — stub with informational message |
| getSocialProfile() | BAP identity lookup via 1Sat API using identity key — stub with informational message |
| getSignatures({ rawtx, sigRequests }) | Not needed — createAction() handles signing internally. For advanced use, signAction(). |
| removeListener(event, fn) | No event system; use cwi.status reactivity |

### Events

Yours Wallet dispatches a `YoursEmitEvent` CustomEvent on the window when the user signs out or switches accounts.

**React (CWIProvider) — automatic:**

```tsx
const { status, wallet } = useCWI();
// status === 'signed_out' when user signs out (wallet is undefined)
// status === 'available' with refreshed wallet after account switch
```

The `CWIProvider` listens for `YoursEmitEvent` internally and updates its state automatically.

**Vanilla JS / non-React — listen directly:**

```js
window.addEventListener('YoursEmitEvent', (e) => {
  const { action } = e.detail;
  if (action === 'signedOut') {
    // User signed out — clear app state, show connect UI
  }
  if (action === 'switchAccount') {
    // Account changed — re-fetch identity from window.CWI
    // e.g. await window.CWI.getPublicKey({ identityKey: true, ... })
  }
});
```

| Legacy | CWI Equivalent |
|--------|----------------|
| on('signedOut', listener) | `useCWI()` status becomes `'signed_out'`, or listen for `YoursEmitEvent` with `detail.action === 'signedOut'` |
| on('switchAccount', listener) | `useCWI()` re-dispatches with fresh wallet, or listen for `YoursEmitEvent` with `detail.action === 'switchAccount'` |
| removeListener(event, fn) | Standard `removeEventListener('YoursEmitEvent', fn)` |

## Step 5 — Transaction Format Changes

Legacy methods returned { txid, rawtx } as hex strings. CWI uses BEEF (BRC-95) which bundles the transaction with merkle proofs for SPV verification.

```typescript
// Legacy
const { txid, rawtx } = await wallet.sendBsv([...])

// CWI — @1sat/actions handle this automatically
const result = await sendBsv.execute(ctx, { requests: [...] })
// result.txid after broadcast
```

## Step 6 — Buffer and Encoding Changes

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

1. **connect() requires waitForAuthentication()** — Call `await wallet.waitForAuthentication()` first to trigger the extension permission prompt, then `getPublicKey({ identityKey: true })` to get the identity key. Without `waitForAuthentication()`, calls will fail with "Unauthorized!".
2. **Raw hex is gone** — @1sat/actions handle BEEF format automatically.
3. **Buffer breaks in non-Node environments** — Use Utils from @bsv/sdk.
4. **Don't mix old and new providers** — Remove all window.yours / window.panda references.
5. **Key derivation security levels are new** — Choose protocolID[0] carefully: 1=public, 2=counterparty-specific (most common), 3=privileged.
6. **Balance is no longer one call** — Sum satoshis from listOutputs().
7. **Use @1sat/actions for ordinals/tokens/locks** — Do not hand-roll locking scripts or inscription envelopes. Always use the action system.
8. **Encryption is per-counterparty** — Legacy took an array of pubKeys. CWI takes a single counterparty. Loop for multiple recipients.
9. **Never drop UI elements** — If a legacy feature has no CWI equivalent, keep the button and log a helpful message explaining the alternative.

## Migration Checklist

- [ ] Update yours-wallet-provider to latest and add @bsv/sdk, @1sat/actions, @1sat/core
- [ ] Replace YoursProvider with CWIProvider
- [ ] Replace useYoursWallet() with useCWI() — handle discriminated union { status, wallet }
- [ ] Set up action context: createContext(wallet, { services })
- [ ] Remove window.yours / window.panda references and type declarations
- [ ] Convert connect() to waitForAuthentication() + getPublicKey({ identityKey: true }); stub disconnect()
- [ ] Convert sendBsv() to sendBsv.execute(ctx, { requests }) from @1sat/actions
- [ ] Convert signMessage() to signBsm.execute(ctx, { message }) from @1sat/actions
- [ ] Convert encrypt()/decrypt() to CWI equivalents (protocolID/keyID/counterparty)
- [ ] Convert generateTaggedKeys()/getTaggedKeys() to getPublicKey()
- [ ] Convert getOrdinals() to getOrdinals.execute(ctx) from @1sat/actions
- [ ] Convert inscribe() to inscribe.execute(ctx) from @1sat/actions
- [ ] Convert transferOrdinal() to transferOrdinals.execute(ctx) from @1sat/actions
- [ ] Convert purchaseOrdinal() to purchaseOrdinal.execute(ctx) from @1sat/actions
- [ ] Convert getBsv20s() to getBsv21Balances.execute(ctx) from @1sat/actions
- [ ] Convert sendBsv20() to sendBsv21.execute(ctx) from @1sat/actions
- [ ] Convert purchaseBsv20() to purchaseBsv21.execute(ctx) from @1sat/actions
- [ ] Convert lockBsv() to lockBsv.execute(ctx) from @1sat/actions
- [ ] Convert broadcast() to wallet.internalizeAction()
- [ ] Replace getBalance() with listOutputs() aggregation
- [ ] Stub getExchangeRate() and getSocialProfile() with informational messages
- [ ] Convert event listeners to informational stubs explaining CWI alternatives
- [ ] Replace all Buffer usage with @bsv/sdk Utils
- [ ] Review security levels on all protocolID usages
- [ ] Verify all UI sections, buttons, and inputs are preserved 1:1
- [ ] Test all permission flows with the updated extension
