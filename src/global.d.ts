import type { YoursProviderType } from "./types/providerTypes";
import type { WalletInterface } from "@bsv/sdk";

declare global {
  interface Window {
    yours?: YoursProviderType;
    CWI?: WalletInterface;
  }
}
