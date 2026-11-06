import { useEffect, useRef, useState } from 'react';
import type { WordToShow } from '../types';

/**
 * Offloads dictionary word filtering to a background Web Worker thread
 * so typing in the search bar remains smooth even on large dictionaries.
 */
export function useWorkerSearch(source: WordToShow, searchQuery: string): WordToShow {
  const [filteredWords, setFilteredWords] = useState<WordToShow>(source);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL('../search.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (e: MessageEvent<WordToShow>) => {
      setFilteredWords(e.data);
    };
    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const searchTerm = searchQuery.trim();

    if (!searchTerm) {
      setFilteredWords(source);
      return;
    }

    if (workerRef.current) {
      workerRef.current.postMessage({
        words: source,
        query: searchTerm,
        filter: 'all',
      });
    }
  }, [searchQuery, source]);

  return filteredWords;
}
