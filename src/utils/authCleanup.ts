/**
 * Utility functions for robust authentication state cleanup
 * Prevents limbo states and ensures clean auth transitions
 */

export const cleanupAuthState = () => {
  console.log('🧹 Starting comprehensive auth state cleanup');
  
  // Clear localStorage auth keys
  Object.keys(localStorage).forEach((key) => {
    if (
      key.startsWith('supabase.auth.') || 
      key.includes('sb-') ||
      key === 'userProfileCache' ||
      key.startsWith('establishment_favorites_') ||
      key === 'recent-searches'
    ) {
      console.log(`🗑️ Removing localStorage key: ${key}`);
      localStorage.removeItem(key);
    }
  });

  // Clear sessionStorage auth keys if available
  if (typeof sessionStorage !== 'undefined') {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        console.log(`🗑️ Removing sessionStorage key: ${key}`);
        sessionStorage.removeItem(key);
      }
    });
  }

  // Clear any auth-related cookies
  clearAuthCookies();
  
  console.log('✅ Auth state cleanup completed');
};

export const clearAuthCookies = () => {
  // Clear any auth-related cookies
  const authCookies = [
    'sb-access-token',
    'sb-refresh-token',
    'supabase-auth-token'
  ];
  
  authCookies.forEach(cookieName => {
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname}`;
  });
};

export const clearUserCache = () => {
  const cacheKeys = [
    'userProfileCache',
    'recent-searches',
    'cart-items-cache',
    'favorites-cache'
  ];
  
  cacheKeys.forEach(key => {
    localStorage.removeItem(key);
  });
};

export const validateAuthState = async (supabase: any) => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('⚠️ Session validation error:', error);
      cleanupAuthState();
      return false;
    }
    
    if (!session) {
      console.log('ℹ️ No active session found');
      cleanupAuthState();
      return false;
    }
    
    // Check if token is expired
    const now = Date.now() / 1000;
    if (session.expires_at && session.expires_at < now) {
      console.warn('⚠️ Session token expired');
      cleanupAuthState();
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Auth state validation failed:', error);
    cleanupAuthState();
    return false;
  }
};

export const safeSignOut = async (supabase: any) => {
  try {
    console.log('🚪 Starting safe sign out process');
    
    // Clean up state first
    cleanupAuthState();
    
    // Attempt global sign out
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.warn('⚠️ Sign out error (continuing anyway):', error);
      }
    } catch (err) {
      console.warn('⚠️ Sign out request failed (continuing anyway):', err);
    }
    
    // Force clean state
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Final cleanup
    cleanupAuthState();
    
    console.log('✅ Safe sign out completed');
    return true;
  } catch (error) {
    console.error('❌ Safe sign out failed:', error);
    // Even if signOut fails, clean up local state
    cleanupAuthState();
    return false;
  }
};