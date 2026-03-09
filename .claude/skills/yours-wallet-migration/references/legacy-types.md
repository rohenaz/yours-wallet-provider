# Legacy YoursProviderType — Complete Type Reference

These are the exact types from `yours-wallet-provider` v3.x (`src/types/providerTypes.ts`).
Reference these when mapping old API calls to their CWI equivalents.

## YoursProviderType Interface

```typescript
export type YoursProviderType = {
  isReady: boolean;
  on: (event: YoursEvents, listener: YoursEventListeners) => void;
  removeListener: (event: YoursEvents, listener: YoursEventListeners) => void;
  connect: () => Promise<string | undefined>;
  disconnect: () => Promise<boolean>;
  isConnected: () => Promise<boolean>;
  getPubKeys: () => Promise<PubKeys | undefined>;
  getAddresses: () => Promise<Addresses | undefined>;
  getNetwork: () => Promise<NetWork | undefined>;
  getSocialProfile: () => Promise<SocialProfile | undefined>;
  getBalance: () => Promise<Balance | undefined>;
  getMNEEBalance: () => Promise<MNEEBalance | undefined>;
  getBsv20s: () => Promise<Bsv20[] | undefined>;
  sendBsv: (params: SendBsv[]) => Promise<SendBsvResponse | undefined>;
  sendBsv20: (params: SendBsv20) => Promise<SendBsv20Response | undefined>;
  sendMNEE: (params: SendMNEE[]) => Promise<SendMNEEResponse | undefined>;
  transferOrdinal: (params: TransferOrdinal) => Promise<string | undefined>;
  purchaseOrdinal: (params: PurchaseOrdinal) => Promise<string | undefined>;
  purchaseBsv20: (params: PurchaseOrdinal) => Promise<string | undefined>;
  signMessage: (params: SignMessage) => Promise<SignedMessage | undefined>;
  getSignatures: (params: GetSignatures) => Promise<SignatureResponse[] | undefined>;
  broadcast: (params: Broadcast) => Promise<string | undefined>;
  getExchangeRate: () => Promise<number | undefined>;
  getPaymentUtxos: () => Promise<Utxo[] | undefined>;
  generateTaggedKeys: (params: TaggedDerivationRequest) => Promise<TaggedDerivationResponse>;
  getTaggedKeys: (params: GetTaggedKeysRequest) => Promise<TaggedDerivationResponse[] | undefined>;
  inscribe: (params: InscribeRequest[]) => Promise<SendBsvResponse | undefined>;
  lockBsv: (params: LockRequest[]) => Promise<SendBsvResponse | undefined>;
  encrypt: (params: EncryptRequest) => Promise<string[] | undefined>;
  decrypt: (params: DecryptRequest) => Promise<string[] | undefined>;
};
```

## Identity Types

```typescript
export type PubKeys = {
  bsvPubKey: string;
  ordPubKey: string;
  identityPubKey: string;
};

export type Addresses = {
  bsvAddress: string;
  ordAddress: string;
  identityAddress: string;
};

export type SocialProfile = {
  displayName: string;
  avatar: string;
};

export enum NetWork {
  Mainnet = "mainnet",
  Testnet = "testnet",
}
```

## Balance Types

```typescript
export type Balance = {
  bsv: number;
  satoshis: number;
  usdInCents: number;
};

export type MNEEBalance = {
  amount: number;
  decimalAmount: number;
};

export type Utxo = {
  satoshis: number;
  script: string;
  txid: string;
  vout: number;
};
```

## Sending Types

```typescript
export type SendBsv = {
  address?: string;
  paymail?: string;
  satoshis: number;
  data?: string[];
  script?: string;
  inscription?: RawInscription;
};

export type SendBsvResponse = { txid: string; rawtx: string };
export type SendBsv20Response = { txid: string; rawtx: string };
export type SendMNEEResponse = { txid: string; rawtx: string };

export type SendBsv20 = {
  idOrTick: string;
  address: string;
  amount: number;
};

export type SendMNEE = {
  address: string;
  amount: number;
};

export type TransactionFormat = "tx" | "beef" | "ef";

export type Broadcast = {
  rawtx: string;
  format?: TransactionFormat;
  fund?: boolean;
};
```

## Ordinal Types

```typescript
export type TransferOrdinal = {
  address: string;
  origin: string;
  outpoint: string;
};

export type PurchaseOrdinal = {
  outpoint: string;
  marketplaceRate?: number;
  marketplaceAddress?: string;
};

export type MimeTypes =
  | "text/plain" | "text/html" | "text/css"
  | "application/javascript" | "application/json" | "application/xml"
  | "image/jpeg" | "image/png" | "image/gif" | "image/svg+xml"
  | "audio/mpeg" | "audio/wav" | "audio/wave" | "video/mp4"
  | "application/pdf" | "application/msword"
  | "application/vnd.ms-excel" | "application/vnd.ms-powerpoint"
  | "application/zip" | "application/x-7z-compressed"
  | "application/x-gzip" | "application/x-tar" | "application/x-bzip2";

export type MAP = { app: string; type: string; [prop: string]: string };

export type RawInscription = {
  base64Data: string;
  mimeType: MimeTypes;
  map?: MAP;
};

export type InscribeRequest = {
  address: string;
  base64Data: string;
  mimeType: MimeTypes;
  map?: MAP;
  satoshis?: number;
};
```

## Signing & Crypto Types

```typescript
export type SignMessage = {
  message: string;
  encoding?: "utf8" | "hex" | "base64";
  tag?: DerivationTag;
};

export type SignedMessage = {
  address: string;
  pubKey: string;
  sig: string;
  message: string;
  derivationTag: DerivationTag;
};

export type SignatureRequest = {
  prevTxid: string;
  outputIndex: number;
  inputIndex: number;
  satoshis: number;
  address: string | string[];
  script?: string;
  sigHashType?: number;
  csIdx?: number;
  data?: unknown;
};

export type SignatureResponse = {
  inputIndex: number;
  sig: string;
  pubKey: string;
  sigHashType: number;
  csIdx?: number;
};

export type GetSignatures = {
  rawtx: string;
  sigRequests: SignatureRequest[];
  format?: TransactionFormat;
};

export type EncryptRequest = {
  message: string;
  pubKeys: string[];
  encoding?: "utf8" | "hex" | "base64";
  tag?: DerivationTag;
};

export type DecryptRequest = {
  messages: string[];
  tag?: DerivationTag;
};
```

## Key Derivation Types

```typescript
export type InternalYoursTags =
  | { label: "panda"; id: "bsv"; domain: ""; meta: {} }
  | { label: "panda"; id: "ord"; domain: ""; meta: {} }
  | { label: "panda"; id: "identity"; domain: ""; meta: {} }
  | { label: "yours"; id: "bsv"; domain: ""; meta: {} }
  | { label: "yours"; id: "ord"; domain: ""; meta: {} }
  | { label: "yours"; id: "identity"; domain: ""; meta: {} };

export type DerivationTag =
  | InternalYoursTags
  | { label: string; id: string; domain: string; meta?: { [key: string]: any } };

export type TaggedDerivationRequest = {
  label: string;
  id: string;
  meta?: { [key: string]: any };
};

export type TaggedDerivationResponse = {
  address: string;
  pubKey: string;
  tag: DerivationTag;
};

export type GetTaggedKeysRequest = {
  label: string;
  ids?: string[];
};
```

## Lock Types

```typescript
export type LockRequest = {
  address: string;
  blockHeight: number;
  sats: number;
};
```

## Event Types

```typescript
export type YoursEvents = "signedOut" | "switchAccount";
export type YoursEventListeners = (args?: { [key: string]: any }) => void;
```

## BSV20 Types

```typescript
export interface Bsv20Balance { confirmed: bigint; pending: bigint }

export interface Bsv20 {
  p: string; op: string; dec: number; amt: string;
  all: Bsv20Balance; listed: Bsv20Balance;
  status?: Bsv20Status; tick?: string; icon?: string; id?: string; sym?: string;
}

export enum Bsv20Status { Invalid = -1, Pending = 0, Valid = 1 }

export type KeyTypes = "bsv" | "ord";

export type MapSubType = "collection" | "collectionItem";

export interface OrdSchema {
  app: string;
  type: string;
  name: string;
  subType?: MapSubType;
  subTypeData?: Record<string, string>;
  royalties?: string;
  previewUrl?: string;
}

export type BSV20Txo = {
  txid: string;
  vout: number;
  outpoint: string;
  owner?: string;
  script?: string;
  spend?: string;
  height: number;
  idx: number;
  op?: string;
  tick?: string;
  id?: string;
  amt: string;
  status: number;
  reason?: string;
  listing: boolean;
  price?: number;
  pricePer?: number;
  payout?: string;
  pricePerUnit?: number;
};
```
