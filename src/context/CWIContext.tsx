import { type ReactNode, createContext, useEffect, useReducer, useRef } from "react";
import type { WalletInterface } from "@bsv/sdk";

export type CWIStatus = "loading" | "available" | "unavailable" | "signed_out";

export type CWIContextValue =
  | { status: "loading"; wallet: undefined }
  | { status: "available"; wallet: WalletInterface }
  | { status: "unavailable"; wallet: undefined }
  | { status: "signed_out"; wallet: undefined };

type Action =
  | { type: "FOUND"; wallet: WalletInterface }
  | { type: "TIMED_OUT" }
  | { type: "SIGNED_OUT" }
  | { type: "ACCOUNT_CHANGED"; wallet: WalletInterface };

function reducer(_state: CWIContextValue, action: Action): CWIContextValue {
  switch (action.type) {
    case "FOUND":
      return { status: "available", wallet: action.wallet };
    case "TIMED_OUT":
      return { status: "unavailable", wallet: undefined };
    case "SIGNED_OUT":
      return { status: "signed_out", wallet: undefined };
    case "ACCOUNT_CHANGED":
      return { status: "available", wallet: action.wallet };
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
 *
 * Also listens for `YoursEmitEvent` to detect sign-out and account switches:
 * - `signedOut` → status becomes `'signed_out'`, wallet is cleared
 * - `switchAccount` → status stays `'available'`, wallet reference is refreshed
 *
 * Exposes the wallet and connection status via a discriminated union.
 */
export const CWIProvider = (props: CWIProviderProps) => {
  const { children, timeout = 10_000 } = props;
  const [value, dispatch] = useReducer(reducer, INITIAL_STATE);

  const foundRef = useRef(false);

  // Phase 1: Detect CWI injection
  useEffect(() => {
    if (foundRef.current) return;

    // Check synchronously first — if CWI is already injected, dispatch
    // immediately and skip setting up listeners/timers entirely.
    if ("CWI" in window && window.CWI) {
      foundRef.current = true;
      dispatch({ type: "FOUND", wallet: window.CWI });
      return;
    }

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

  // Phase 2: Listen for wallet state changes (sign-out, account switch)
  useEffect(() => {
    const onWalletEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { action: string; params?: unknown }
        | undefined;
      if (!detail?.action) return;

      if (detail.action === "signedOut") {
        foundRef.current = false;
        dispatch({ type: "SIGNED_OUT" });
      }

      if (detail.action === "switchAccount") {
        // After account switch, window.CWI still points to the same
        // CWI substrate but the underlying account has changed.
        // Re-read window.CWI to give consumers a fresh reference.
        if ("CWI" in window && window.CWI) {
          foundRef.current = true;
          dispatch({ type: "ACCOUNT_CHANGED", wallet: window.CWI });
        } else {
          foundRef.current = false;
          dispatch({ type: "SIGNED_OUT" });
        }
      }
    };

    window.addEventListener("YoursEmitEvent", onWalletEvent);
    return () => window.removeEventListener("YoursEmitEvent", onWalletEvent);
  }, []);

  return (
    <CWIContext.Provider value={value}>
      {children}
    </CWIContext.Provider>
  );
};
