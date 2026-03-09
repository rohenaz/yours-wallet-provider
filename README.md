# yours-wallet-provider

React provider for integrating [Yours Wallet](https://yours.org) into your BSV application via the [BRC-100](https://github.com/bitcoin-sv/BRCs/blob/master/wallet/0100.md) Common Wallet Interface (CWI) standard.

## Install

```bash
bun add yours-wallet-provider
```

**Peer dependencies** — install if not already present:

```bash
bun add react @bsv/sdk
```

> Requires React >= 19, `@bsv/sdk` ^2.0.0. ESM only (`"type": "module"`).

---

## Quick Start

Wrap your app (or any subtree) in `CWIProvider`, then call `useCWI()` in any child component.

```tsx
// main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CWIProvider } from 'yours-wallet-provider'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CWIProvider>
      <App />
    </CWIProvider>
  </StrictMode>
)
```

```tsx
// App.tsx
import { useCWI } from 'yours-wallet-provider'

export default function App() {
  const cwi = useCWI()

  if (cwi.status === 'loading') return <p>Connecting to wallet...</p>
  if (cwi.status === 'unavailable') return <p>Please install Yours Wallet</p>

  // TypeScript narrows cwi.wallet to WalletInterface here
  const handleGetKey = async () => {
    const { publicKey } = await cwi.wallet.getPublicKey({ identityKey: true })
    console.log(publicKey)
  }

  return <button onClick={handleGetKey}>Get Identity Key</button>
}
```

---

## API Reference

### `<CWIProvider>`

Detects `window.CWI` injection by the Yours Wallet browser extension. Listens for the `cwiReady` CustomEvent dispatched by the extension, with a 500ms polling fallback for extensions that do not emit the event. Transitions to `unavailable` after the timeout elapses with no wallet found.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | — | Required. Child component tree. |
| `timeout` | `number` | `10000` | Milliseconds to wait before marking status as `unavailable`. |

```tsx
<CWIProvider timeout={5000}>
  <App />
</CWIProvider>
```

### `useCWI()`

Returns a discriminated union. Narrow on `status` to access the wallet.

```ts
type CWIContextValue =
  | { status: 'loading';     wallet: undefined }
  | { status: 'available';   wallet: WalletInterface }
  | { status: 'unavailable'; wallet: undefined }
```

`WalletInterface` is the BRC-100 standard interface from `@bsv/sdk`. It provides methods such as `createAction`, `getPublicKey`, `encrypt`, `decrypt`, `createHmac`, and more.

`useCWI()` throws if called outside a `CWIProvider`.

### Subpath exports

| Import path | Contents |
|-------------|----------|
| `yours-wallet-provider` | All exports (default entry) |
| `yours-wallet-provider/cwi` | `CWIProvider`, `CWIContext`, `CWIContextValue`, `CWIStatus` |
| `yours-wallet-provider/legacy` | `YoursProvider`, `YoursContext` (deprecated) |
| `yours-wallet-provider/icon` | `YoursIcon`, `YoursIconProps` |
| `yours-wallet-provider/types` | Legacy `providerTypes` (deprecated) |

---

## Vanilla JS Usage

If you are not using React, access `window.CWI` directly after the extension injects it.

```ts
function onWalletReady(wallet: import('@bsv/sdk').WalletInterface) {
  wallet.getPublicKey({ identityKey: true }).then(({ publicKey }) => {
    console.log('Identity key:', publicKey)
  })
}

// Immediate check
if (window.CWI) {
  onWalletReady(window.CWI)
} else {
  // Listen for the injection event
  window.addEventListener('cwiReady', () => {
    if (window.CWI) onWalletReady(window.CWI)
  }, { once: true })
}
```

---

## Migration from v3

v4.0 replaces the legacy `window.yours` API with the BRC-100 `window.CWI` standard. The legacy API remains available but is deprecated and will be removed in a future major version.

For a step-by-step migration walkthrough, see the migration skill in `.claude/skills/yours-wallet-migration`.

**Quick summary:**

| v3 | v4 |
|----|----|
| `<YoursProvider>` | `<CWIProvider>` |
| `useYoursWallet()` | `useCWI()` |
| `window.yours` | `window.CWI` |
| Custom provider types | `WalletInterface` from `@bsv/sdk` |

---

## Legacy API (deprecated)

The following exports remain for backwards compatibility during migration. They connect to `window.yours` and will be removed in a future major version.

```tsx
// Deprecated — migrate to CWIProvider + useCWI()
import { YoursProvider, useYoursWallet } from 'yours-wallet-provider'
```

`YoursProvider` polls `window.yours.isReady` every 1000ms. `useYoursWallet()` returns the raw `YoursProviderType` object and throws if called outside a `YoursProvider`.

---

## YoursIcon

Renders the Yours Wallet SVG logo. Useful for wallet connection buttons and install prompts.

```tsx
import { YoursIcon } from 'yours-wallet-provider'
// or from the subpath:
// import { YoursIcon } from 'yours-wallet-provider/icon'

<YoursIcon size="24px" />
<YoursIcon size="1.5rem" />
```

| Prop | Type | Description |
|------|------|-------------|
| `size` | `string` | Sets both `width` and `height`. Accepts any CSS length value. |

---

## License

MIT
