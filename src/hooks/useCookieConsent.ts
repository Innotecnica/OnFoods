import { useState, useEffect } from 'react';
import { env } from '@/utils/environment';

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

export const useCookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always true, can't be disabled
    analytics: false,
    marketing: false,
    functional: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    const lastConsent = localStorage.getItem('cookie-consent-date');
    
    if (!consent) {
      setShowBanner(true);
    } else {
      const stored = JSON.parse(consent);
      setPreferences(stored);
      
      // Check if consent is older than 12 months (LGPD requirement)
      if (lastConsent) {
        const consentDate = new Date(lastConsent);
        const now = new Date();
        const monthsDiff = (now.getFullYear() - consentDate.getFullYear()) * 12 + 
                          (now.getMonth() - consentDate.getMonth());
        
        if (monthsDiff >= 12) {
          setShowBanner(true);
        }
      }
    }
  }, []);

  const acceptAll = () => {
    const newPreferences = {
      essential: true,
      analytics: true,
      marketing: true,
      functional: true,
    };
    
    setPreferences(newPreferences);
    localStorage.setItem('cookie-consent', JSON.stringify(newPreferences));
    localStorage.setItem('cookie-consent-date', new Date().toISOString());
    setShowBanner(false);
    
    // Load analytics and marketing scripts
    loadAnalyticsScripts();
    loadMarketingScripts();
  };

  const acceptSelected = (newPreferences: CookiePreferences) => {
    const updatedPreferences = { ...newPreferences, essential: true };
    
    setPreferences(updatedPreferences);
    localStorage.setItem('cookie-consent', JSON.stringify(updatedPreferences));
    localStorage.setItem('cookie-consent-date', new Date().toISOString());
    setShowBanner(false);
    
    // Load scripts based on preferences
    if (updatedPreferences.analytics) {
      loadAnalyticsScripts();
    }
    if (updatedPreferences.marketing) {
      loadMarketingScripts();
    }
  };

  const rejectAll = () => {
    const minimalPreferences = {
      essential: true,
      analytics: false,
      marketing: false,
      functional: false,
    };
    
    setPreferences(minimalPreferences);
    localStorage.setItem('cookie-consent', JSON.stringify(minimalPreferences));
    localStorage.setItem('cookie-consent-date', new Date().toISOString());
    setShowBanner(false);
    
    // Clear tracking cookies
    clearTrackingCookies();
  };

  const clearTrackingCookies = () => {
    const trackingCookies = [
      '_ga', '_gid', '_gat', '_gtag', '_gcl_au', // Google Analytics
      '_fbp', '_fbc', // Facebook Pixel
      '__utma', '__utmb', '__utmc', '__utmz', // Old Google Analytics
      '_hjid', '_hjSessionUser', // Hotjar
      'intercom-id', 'intercom-session', // Intercom
    ];
    
    trackingCookies.forEach(cookieName => {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname}`;
    });
  };

  const updatePreferences = (newPreferences: CookiePreferences) => {
    acceptSelected(newPreferences);
  };

  const loadAnalyticsScripts = () => {
    const analyticsEnabled = (import.meta.env.VITE_ENABLE_ANALYTICS === 'true');
    const gaId = (import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim();
    if (!analyticsEnabled || !gaId) return;

    if (typeof window !== 'undefined' && !(window as any).gtag) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      script.onload = () => {
        (window as any).dataLayer = (window as any).dataLayer || [];
        (window as any).gtag = function gtag(...args: any[]){ (window as any).dataLayer.push(args); };
        (window as any).gtag('js', new Date());
        (window as any).gtag('config', gaId);
      };
      document.head.appendChild(script);
    }
  };

  const loadMarketingScripts = () => {
    // Facebook Pixel, Google Ads, etc.
    console.log('Loading marketing scripts...');
  };

  return {
    showBanner,
    preferences,
    acceptAll,
    acceptSelected,
    rejectAll,
    updatePreferences,
    setShowBanner,
    clearTrackingCookies,
  };
};
