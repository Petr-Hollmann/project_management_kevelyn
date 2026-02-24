import { useState, useEffect } from 'react';

// Upravený hook pro spolehlivější načítání stavu z localStorage
export function usePersistentState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const storedValue = window.localStorage.getItem(key);
      if (storedValue) {
        const parsed = JSON.parse(storedValue);
        // Konverze dat pro dateRange
        if (parsed && parsed.dateRange) {
          if (parsed.dateRange.from) parsed.dateRange.from = new Date(parsed.dateRange.from);
          if (parsed.dateRange.to) parsed.dateRange.to = new Date(parsed.dateRange.to);
        }
        return parsed;
      }
      return defaultValue;
    } catch (error) {
      console.error("Error reading from localStorage", error);
      return defaultValue;
    }
  });

  // Tento useEffect nyní pouze ukládá změny
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error("Error writing to localStorage", error);
    }
  }, [key, state]);

  // Tento useEffect naslouchá změnám v localStorage z jiných tabů/stránek
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key) {
        try {
          const newValue = e.newValue ? JSON.parse(e.newValue) : defaultValue;
          setState(newValue);
        } catch (error) {
          console.error("Error parsing new value from storage", error);
          setState(defaultValue);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, defaultValue]);

  return [state, setState];
}