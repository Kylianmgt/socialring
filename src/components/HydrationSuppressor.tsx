'use client';

import { useEffect } from 'react';

/**
 * Suppresses hydration mismatch warnings caused by external scripts/extensions
 * that add attributes like data-np-intersection-state to DOM elements
 */
export function HydrationSuppressor() {
  useEffect(() => {
    // Suppress specific hydration warnings in development
    if (process.env.NODE_ENV === 'development') {
      const originalError = console.error;
      const originalWarn = console.warn;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.error = function(...args: any[]) {
        const errorString = String(args[0]);
        
        // Suppress hydration mismatch warnings for external attributes
        if (
          errorString.includes('Hydration failed') ||
          errorString.includes('data-np-intersection-state') ||
          (errorString.includes('Warning: Did not expect server HTML to contain') && 
           args[0]?.includes('data-'))
        ) {
          return;
        }
        
        return originalError.apply(console, args);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.warn = function(...args: any[]) {
        const warnString = String(args[0]);
        
        // Suppress hydration mismatch warnings for external attributes
        if (
          warnString.includes('Hydration failed') ||
          warnString.includes('data-np-intersection-state') ||
          (warnString.includes('Warning: Did not expect server HTML to contain') && 
           args[0]?.includes('data-'))
        ) {
          return;
        }
        
        return originalWarn.apply(console, args);
      };
    }
  }, []);

  return null;
}
