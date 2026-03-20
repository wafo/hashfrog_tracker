'use client';

import { useEffect, useState } from "react";

/**
 * Debounces a value, only updating after the specified delay.
 * @param {string|number|boolean|object|Array} value - The value to debounce.
 * @param {number} delay - Delay in milliseconds.
 * @returns {string|number|boolean|object|Array} The debounced value.
 */
function useDebounce(value, delay) {
  // State and setters for debounced value
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(
    () => {
      // Update debounced value after delay
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
      // Cancel the timeout if value changes (also on delay change or unmount)
      // This is how we prevent debounced value from updating if value is changed ...
      // .. within the delay period. Timeout gets cleared and restarted.
      return () => {
        clearTimeout(handler);
      };
    },
    [value, delay], // Only re-call effect if value or delay changes
  );
  return debouncedValue;
}

export default useDebounce;
