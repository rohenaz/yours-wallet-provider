import { type ReactNode, createContext, useEffect, useReducer, useRef } from "react";
import type { WalletInterface } from "@bsv/sdk";

export type CWIStatus = "loading" | "available" | "unavailable";

export type CWIContextValue =
  | { status: "loading"; wallet: undefined }
  | { status: "available"; wallet: WalletInterface }
  | { status: "unavailable"; wallet: undefined };

type Action =
  | { type: "FOUND"; wallet: WalletInterface }
  | { type: "TIMED_OUT" };

function reducer(_state: CWIContextValue, action: Action): CWIContextValue {
  switch (action.type) {
    case "FOUND":
      return { status: "available", wallet: action.wallet };
    case "TIMED_OUT":
      return { status: "unavailable", wallet: undefined };
    default:
      return _state;
  }
}

const INITIAL_STATE: CWIContextValue = { status: "loading", wallet: undefined };

export const CWIContext = createContext<CWIContextValue | undefined>(undefined);

interface CWIProviderProps {
  children: ReactNode;
  /** Maximum time in ms to wait for CWI injection before marking as unavailable. Defaults to 10000. */
  timeout?: number;
}

/**
 * Provides access to the BRC-100 WalletInterface injected by Yours Wallet
 * as `window.CWI`. Listens for the `cwiReady` CustomEvent dispatched by the
 * extension, with a polling fallback for extensions that don't emit the event.
 * Exposes the wallet and connection status via a discriminated union.
 */
export const CWIProvider = (props: CWIProviderProps) => {
  const { children, timeout = 10_000 } = props;
  const [value, dispatch] = useReducer(reducer, INITIAL_STATE);

  const foundRef = useRef(false);

  useEffect(() => {
    foundRef.current = false;

    const markFound = (wallet: WalletInterface) => {
      if (foundRef.current) return;
      foundRef.current = true;
      dispatch({ type: "FOUND", wallet });
      cleanup();
    };

    const checkCWI = () => {
      if ("CWI" in window && window.CWI) {
        markFound(window.CWI);
        return true;
      }
      return false;
    };

    // Already available (synchronous injection during document load)
    if (checkCWI()) return;

    // Listen for the CustomEvent the extension dispatches on injection
    const onCWIReady = () => checkCWI();
    window.addEventListener("cwiReady", onCWIReady);

    // Polling fallback for extensions that don't emit the event
    const intervalId = setInterval(checkCWI, 500);

    const timeoutId = setTimeout(() => {
      if (!foundRef.current) {
        dispatch({ type: "TIMED_OUT" });
        cleanup();
      }
    }, timeout);

    function cleanup() {
      window.removeEventListener("cwiReady", onCWIReady);
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    }

    return cleanup;
  }, [timeout]);

  return (
    <CWIContext.Provider value={value}>
      {children}
    </CWIContext.Provider>
  );
};
