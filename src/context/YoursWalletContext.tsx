import { type ReactNode, createContext, useEffect, useState } from "react";
import type { YoursProviderType } from "../types/providerTypes.js";

export const YoursContext = createContext<YoursProviderType | undefined>(
  undefined
);

interface YoursProviderProps {
  children: ReactNode;
}

/**
 * @deprecated Use `<CWIProvider>` instead.
 * This provider connects to the legacy `window.yours` provider.
 * Migrate to `<CWIProvider>` + `useCWI()` for BRC-100 WalletInterface support.
 */
export const YoursProvider = (props: YoursProviderProps) => {
  const { children } = props;
  const [yoursWallet, setYoursWallet] = useState<YoursProviderType | undefined>(
    undefined
  );

  useEffect(() => {
    const checkYoursWallet = () => {
      if ("yours" in window && window.yours?.isReady) {
        setYoursWallet(window.yours);
      }
    };

    checkYoursWallet();
    const intervalId = setInterval(checkYoursWallet, 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <YoursContext.Provider value={yoursWallet}>
      {children}
    </YoursContext.Provider>
  );
};
