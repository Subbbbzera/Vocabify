import { useEffect, useState } from 'react';

export interface DictionaryDisplaySettings {
  fontSize: number;
  setFontSize: (value: number) => void;
  wordMargin: number;
  setWordMargin: (value: number) => void;
  wordPaddingY: number;
  setWordPaddingY: (value: number) => void;
  showStatus: boolean;
  setShowStatus: (value: boolean) => void;
  showAlphabet: boolean;
  setShowAlphabet: (value: boolean) => void;
}

/**
 * Manages and persists user visual preferences for the dictionary word list.
 */
export function useDictionaryDisplaySettings(): DictionaryDisplaySettings {
  const [fontSize, setFontSize] = useState(
    () => Number(localStorage.getItem('innerD-fontSize')) || 18,
  );
  const [wordMargin, setWordMargin] = useState(
    () => Number(localStorage.getItem('innerD-wordMargin')) || 12,
  );
  const [wordPaddingY, setWordPaddingY] = useState(
    () => Number(localStorage.getItem('innerD-wordPaddingY')) || 16,
  );
  const [showStatus, setShowStatus] = useState(
    () => localStorage.getItem('innerD-showStatus') !== 'false',
  );
  const [showAlphabet, setShowAlphabet] = useState(
    () => localStorage.getItem('innerD-showAlphabet') !== 'false',
  );

  useEffect(() => {
    localStorage.setItem('innerD-fontSize', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('innerD-wordMargin', wordMargin.toString());
  }, [wordMargin]);

  useEffect(() => {
    localStorage.setItem('innerD-wordPaddingY', wordPaddingY.toString());
  }, [wordPaddingY]);

  useEffect(() => {
    localStorage.setItem('innerD-showStatus', showStatus.toString());
  }, [showStatus]);

  useEffect(() => {
    localStorage.setItem('innerD-showAlphabet', showAlphabet.toString());
  }, [showAlphabet]);

  return {
    fontSize,
    setFontSize,
    wordMargin,
    setWordMargin,
    wordPaddingY,
    setWordPaddingY,
    showStatus,
    setShowStatus,
    showAlphabet,
    setShowAlphabet,
  };
}
