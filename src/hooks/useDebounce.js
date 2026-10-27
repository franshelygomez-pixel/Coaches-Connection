import { useEffect, useState } from "react";

export default function useDebounce(valor, demora = 350) {
  const [valorEstable, setValorEstable] = useState(valor);

  useEffect(() => {
    const temporizador = window.setTimeout(() => setValorEstable(valor), demora);
    return () => window.clearTimeout(temporizador);
  }, [demora, valor]);

  return valorEstable;
}