# WalletInterface — BRC-100 Type Reference

From `@bsv/sdk` v2.0.x — `Wallet.interfaces.d.ts`

## WalletInterface Methods

```typescript
export interface WalletInterface {
  // Key Derivation & Encryption
  getPublicKey: (args: GetPublicKeyArgs, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<GetPublicKeyResult>
  revealCounterpartyKeyLinkage: (args: RevealCounterpartyKeyLinkageArgs, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<RevealCounterpartyKeyLinkageResult>
  revealSpecificKeyLinkage: (args: RevealSpecificKeyLinkageArgs, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<RevealSpecificKeyLinkageResult>
  encrypt: (args: WalletEncryptArgs, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<WalletEncryptResult>
  decrypt: (args: WalletDecryptArgs, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<WalletDecryptResult>

  // HMAC
  createHmac: (args: CreateHmacArgs, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<CreateHmacResult>
  verifyHmac: (args: VerifyHmacArgs, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<VerifyHmacResult>

  // Signatures
  createSignature: (args: CreateSignatureArgs, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<CreateSignatureResult>
  verifySignature: (args: VerifySignatureArgs, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<VerifySignatureResult>

  // Actions (Transactions)
  createAction: (args: CreateActionArgs, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<CreateActionResult>
  signAction: (args: SignActionArgs, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<SignActionResult>
  abortAction: (args: AbortActionArgs, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<AbortActionResult>
  listActions: (args: ListActionsArgs, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<ListActionsResult>
  internalizeAction: (args: InternalizeActionArgs, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<InternalizeActionResult>

  // Outputs
  listOutputs: (args: ListOutputsArgs, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<ListOutputsResult>
  relinquishOutput: (args: RelinquishOutputArgs, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<RelinquishOutputResult>

  // Certificates
  acquireCertificate: (args: AcquireCertificateArgs, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<WalletCertificate>
  listCertificates: (args: ListCertificatesArgs, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<ListCertificatesResult>
  proveCertificate: (args: ProveCertificateArgs, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<ProveCertificateResult>
  relinquishCertificate: (args: RelinquishCertificateArgs, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<RelinquishCertificateResult>
  discoverByIdentityKey: (args: DiscoverByIdentityKeyArgs, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<DiscoverCertificatesResult>
  discoverByAttributes: (args: DiscoverByAttributesArgs, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<DiscoverCertificatesResult>

  // Authentication & Network
  isAuthenticated: (args: object, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<AuthenticatedResult>
  waitForAuthentication: (args: object, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<AuthenticatedResult>
  getHeight: (args: object, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<GetHeightResult>
  getHeaderForHeight: (args: GetHeaderArgs, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<GetHeaderResult>
  getNetwork: (args: object, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<GetNetworkResult>
  getVersion: (args: object, originator?: OriginatorDomainNameStringUnder250Bytes) => Promise<GetVersionResult>
}
```

## Key Argument Types

### WalletEncryptionArgs (base for key-related operations)

```typescript
export interface WalletEncryptionArgs {
  protocolID: WalletProtocol;          // [securityLevel, protocolName] e.g. [2, 'myapp']
  keyID: KeyIDStringUnder800Bytes;     // e.g. 'auth-key'
  counterparty?: WalletCounterparty;   // identity key or 'self'
  privileged?: BooleanDefaultFalse;
  privilegedReason?: DescriptionString5to50Bytes;
  seekPermission?: BooleanDefaultTrue;
}
```

### GetPublicKeyArgs

```typescript
export interface GetPublicKeyArgs extends Partial<WalletEncryptionArgs> {
  identityKey?: true;            // if true, returns the wallet's identity key
  forSelf?: BooleanDefaultFalse; // if true, derive for self regardless of counterparty
}
```

### WalletEncryptArgs / WalletDecryptArgs

```typescript
export interface WalletEncryptArgs extends WalletEncryptionArgs {
  plaintext: Byte[];   // number[]
}

export interface WalletDecryptArgs extends WalletEncryptionArgs {
  ciphertext: Byte[];  // number[]
}
```

### CreateSignatureArgs

```typescript
export interface CreateSignatureArgs extends WalletEncryptionArgs {
  data?: Byte[];              // data to sign (provide this OR hashToDirectlySign)
  hashToDirectlySign?: Byte[]; // pre-computed hash to sign directly
}
```

### CreateActionArgs

```typescript
export interface CreateActionArgs {
  description: DescriptionString5to50Bytes;  // 5-50 char description
  inputBEEF?: BEEF;
  inputs?: CreateActionInput[];
  outputs?: CreateActionOutput[];
  lockTime?: PositiveIntegerOrZero;
  version?: PositiveIntegerOrZero;
  labels?: LabelStringUnder300Bytes[];
  options?: CreateActionOptions;
}
```

### ListActionsArgs

```typescript
export interface ListActionsArgs {
  labels: LabelStringUnder300Bytes[];
  labelQueryMode?: 'any' | 'all';
  includeLabels?: BooleanDefaultFalse;
  includeInputs?: BooleanDefaultFalse;
  includeInputSourceLockingScripts?: BooleanDefaultFalse;
  includeInputUnlockingScripts?: BooleanDefaultFalse;
  includeOutputs?: BooleanDefaultFalse;
  includeOutputLockingScripts?: BooleanDefaultFalse;
  limit?: PositiveIntegerDefault10Max10000;
  offset?: PositiveIntegerOrZero;
  seekPermission?: BooleanDefaultTrue;
}
```

### ListOutputsArgs

```typescript
export interface ListOutputsArgs {
  basket: BasketStringUnder300Bytes;      // e.g. 'default', 'ordinals'
  tags?: OutputTagStringUnder300Bytes[];
  tagQueryMode?: 'all' | 'any';
  include?: 'locking scripts' | 'entire transactions';
  includeCustomInstructions?: BooleanDefaultFalse;
  includeTags?: BooleanDefaultFalse;
  includeLabels?: BooleanDefaultFalse;
  limit?: PositiveIntegerDefault10Max10000;
  offset?: number;
  seekPermission?: BooleanDefaultTrue;
}
```

## Branded String Types

These are all `string` at runtime but documented for clarity:

```typescript
type OriginatorDomainNameStringUnder250Bytes = string  // FQDN of requesting app
type DescriptionString5to50Bytes = string              // action/operation description
type BasketStringUnder300Bytes = string                // basket name
type OutputTagStringUnder300Bytes = string             // output tag
type LabelStringUnder300Bytes = string                 // action label
type KeyIDStringUnder800Bytes = string                 // key identifier
type WalletProtocol = [SecurityLevel, ProtocolString5To400Bytes]  // i.e. [number, string]
type WalletCounterparty = PubKeyHex | 'self' | 'anyone'
type Byte = number                                     // 0-255
type BEEF = Byte[] | Uint8Array                        // BRC-95 encoded tx + merkle proofs
type AtomicBEEF = Byte[] | Uint8Array                  // Single-tx BEEF from createAction
type BooleanDefaultFalse = boolean
type BooleanDefaultTrue = boolean
type PositiveIntegerOrZero = number
type PositiveIntegerDefault10Max10000 = number
```
