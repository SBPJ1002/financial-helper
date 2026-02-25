import { useState, useEffect } from 'react';

interface PublicRates {
  selic: { value: number; date: string } | null;
  cdi: { value: number; date: string } | null;
  ipca: { value: number; date: string } | null;
  poupanca: { value: number; date: string } | null;
  dolar: { value: number; date: string } | null;
  lastUpdated: string | null;
}

let cachedRates: PublicRates | null = null;
let fetchPromise: Promise<PublicRates | null> | null = null;

async function fetchRates(): Promise<PublicRates | null> {
  try {
    const res = await fetch('/api/rates/public');
    if (!res.ok) return null;
    const data = await res.json();
    cachedRates = data;
    return data;
  } catch {
    return null;
  }
}

export function usePublicRates() {
  const [rates, setRates] = useState<PublicRates | null>(cachedRates);
  const [isLoading, setIsLoading] = useState(!cachedRates);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (cachedRates) {
      setRates(cachedRates);
      setIsLoading(false);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = fetchRates();
    }

    fetchPromise.then((data) => {
      if (data) {
        setRates(data);
      } else {
        setError(true);
      }
      setIsLoading(false);
    });
  }, []);

  return { rates, isLoading, error };
}
