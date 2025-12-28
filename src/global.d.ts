import { YoursProviderType } from "./types/providerTypes";
import { WalletInterface } from "@bsv/sdk";

declare global {
  interface Window {
    yours: YoursProviderType;
    panda: YoursProviderType;
    CWI: WalletInterface;
  }
}
