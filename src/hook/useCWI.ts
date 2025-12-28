import { useContext } from "react";
import { CWIContext } from "../context/CWIContext";

export const useCWI = () => {
  const context = useContext(CWIContext);
  if (!context) {
    throw new Error("useCWI must be used within a CWIProvider");
  }
  return context;
};
