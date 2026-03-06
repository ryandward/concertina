import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface ConcertinaModeContextValue {
  enabled: boolean;
  toggle: () => void;
}

const ConcertinaModeContext = createContext<ConcertinaModeContextValue>({
  enabled: true,
  toggle: () => {},
});

export function ConcertinaModeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(true);
  const toggle = useCallback(() => setEnabled((prev) => !prev), []);

  return (
    <ConcertinaModeContext value={{ enabled, toggle }}>
      {children}
    </ConcertinaModeContext>
  );
}

export function useConcertinaMode() {
  return useContext(ConcertinaModeContext);
}
