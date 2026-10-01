import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

interface PauseState {
  paused: boolean;
  setPaused: Dispatch<SetStateAction<boolean>>;
}

const PauseContext = createContext<PauseState | null>(null);

export function PauseProvider({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false);
  return <PauseContext value={{ paused, setPaused }}>{children}</PauseContext>;
}

export function usePause(): PauseState {
  const state = useContext(PauseContext);
  if (!state) throw new Error("usePause must be used inside PauseProvider");
  return state;
}
