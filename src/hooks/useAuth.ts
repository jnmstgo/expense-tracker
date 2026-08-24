import { useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { initGoogleAuth, requestAccessToken } from '@/services/authService';
import { getOrCreateSpreadsheet } from '@/services/googleSheets';
import type { GoogleTokenResponse } from '@/types';

export function useAuth() {
  const { user, setUser, updateToken, updateSpreadsheetId, logout, isTokenValid } = useAuthStore();
  const pendingUserId = useRef<string | null>(null);

  const handleToken = useCallback(async (token: GoogleTokenResponse) => {
    if (token.error) {
      console.warn('OAuth token error/prompt closed:', token.error);
      return;
    }

    updateToken(token.access_token, token.expires_in);

    const userId = pendingUserId.current ?? useAuthStore.getState().user?.id;
    if (!userId) return;

    try {
      const existingId = useAuthStore.getState().user?.spreadsheetId;
      const spreadsheetId = existingId || await getOrCreateSpreadsheet(token.access_token, userId);
      updateSpreadsheetId(spreadsheetId);
    } catch (err) {
      console.error('Could not connect to Google Sheets:', err);
    }
  }, [updateToken, updateSpreadsheetId]);

  const refreshToken = useCallback((interactive = false) => {
    const currentUser = useAuthStore.getState().user;
    if (currentUser?.email) {
      try {
        requestAccessToken(currentUser.email, interactive ? '' : '');
      } catch (err) {
        console.warn('Failed to refresh access token:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const tryInit = () => {
      if (window.google?.accounts?.id && window.google?.accounts?.oauth2) {
        initGoogleAuth(
          partialUser => {
            pendingUserId.current = partialUser.id;
            const existingUser = useAuthStore.getState().user;
            const sameUser = existingUser && existingUser.id === partialUser.id;
            setUser({
              ...partialUser,
              accessToken: '',
              tokenExpiry: 0,
              spreadsheetId: sameUser ? existingUser.spreadsheetId : null,
            });
            requestAccessToken(partialUser.email);
          },
          handleToken
        );

        // Auto-refresh token on start if user session exists and token is expired or expiring soon (< 5 mins)
        const currentUser = useAuthStore.getState().user;
        if (currentUser?.email) {
          const isExpiringSoon = !currentUser.accessToken || Date.now() > currentUser.tokenExpiry - 5 * 60 * 1000;
          if (isExpiringSoon && navigator.onLine) {
            try {
              requestAccessToken(currentUser.email);
            } catch (e) {
              console.warn('Silent token request on mount error:', e);
            }
          }
        }

        return true;
      }
      return false;
    };

    if (!tryInit()) {
      const interval = setInterval(() => {
        if (tryInit()) clearInterval(interval);
      }, 200);
      return () => clearInterval(interval);
    }
  }, [setUser, handleToken]);

  // Periodic background token refresh check & on tab focus
  useEffect(() => {
    const checkAndRefresh = () => {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser?.email || !navigator.onLine) return;

      const isExpiringSoon = !currentUser.accessToken || Date.now() > currentUser.tokenExpiry - 5 * 60 * 1000;
      if (isExpiringSoon) {
        try {
          requestAccessToken(currentUser.email);
        } catch (e) {
          console.warn('Background token refresh check error:', e);
        }
      }
    };

    const interval = setInterval(checkAndRefresh, 60 * 1000); // Check every minute
    const onFocus = () => checkAndRefresh();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkAndRefresh();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return { user, logout, isTokenValid, refreshToken };
}
