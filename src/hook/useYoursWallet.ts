import { use } from "react";
import { YoursContext } from "../context/YoursWalletContext.js";

/**
 * @deprecated Use `useCWI()` from `yours-wallet-provider` instead.
 * This hook connects to the legacy `window.yours` provider.
 * Migrate to `<CWIProvider>` + `useCWI()` for BRC-100 WalletInterface support.
 */
export const useYoursWallet = () => {
  const context = use(YoursContext);
  if (!context) {
    throw new Error("useYoursWallet must be used within a YoursProvider");
  }
  return context;
};
