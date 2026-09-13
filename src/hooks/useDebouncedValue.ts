import {
  useEffect,
  useState,
} from 'react';

/**
 * Small shared debounce hook for server-side search fields.
 *
 * It keeps typing responsive while avoiding one API request
 * for every key stroke on large operational lists.
 */
export function useDebouncedValue<T>(
  value: T,
  delay = 300,
): T {
  const [
    debouncedValue,
    setDebouncedValue,
  ] = useState(value);

  useEffect(
    () => {
      const timer = window.setTimeout(
        () => {
          setDebouncedValue(value);
        },
        delay,
      );

      return () => {
        window.clearTimeout(timer);
      };
    },
    [
      value,
      delay,
    ],
  );

  return debouncedValue;
}
