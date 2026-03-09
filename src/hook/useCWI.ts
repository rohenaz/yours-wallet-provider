import { use } from "react";
import { CWIContext } from "../context/CWIContext.js";

/**
 * Returns the BRC-100 WalletInterface from Yours Wallet and its connection status
 * as a discriminated union. Check `status` to narrow the type.
 *
 * @example
 * ```tsx
 * const cwi = useCWI();
 *
 * if (cwi.status === 'loading') return <p>Connecting to wallet...</p>;
 * if (cwi.status === 'unavailable') return <p>Please install Yours Wallet</p>;
 *
 * // TypeScript narrows wallet to WalletInterface here
 * const result = await cwi.wallet.getPublicKey({ identityKey: true });
 * ```
 */
export const useCWI = () => {
  const context = use(CWIContext);
  if (!context) {
    throw new Error("useCWI must be used within a CWIProvider");
  }
  return context;
};
