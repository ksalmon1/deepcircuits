
import { useState, useEffect } from 'react';

/**
 * Hook to check if the device is in mobile viewport
 */
export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkMobile();

    // Add event listener
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return isMobile;
};

/**
 * Media query hook (compatible with previous code)
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const updateMatches = () => setMatches(media.matches);
    
    // Initial check
    updateMatches();
    
    // Add event listener
    media.addEventListener('change', updateMatches);
    
    // Cleanup
    return () => {
      media.removeEventListener('change', updateMatches);
    };
  }, [query]);

  return matches;
};
