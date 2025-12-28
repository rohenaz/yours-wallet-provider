import { ReactNode, createContext, useEffect, useState } from "react";
import { WalletInterface } from "@bsv/sdk";

export const CWIContext = createContext<WalletInterface | undefined>(undefined);

interface CWIProviderProps {
  children: ReactNode;
}

export const CWIProvider = (props: CWIProviderProps) => {
  const { children } = props;
  const [cwi, setCwi] = useState<WalletInterface | undefined>(undefined);

  useEffect(() => {
    const checkCWI = () => {
      if ("CWI" in window && window.CWI) {
        setCwi(window.CWI);
      }
    };

    checkCWI();
    const intervalId = setInterval(checkCWI, 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <CWIContext.Provider value={cwi}>
      {children}
    </CWIContext.Provider>
  );
};
