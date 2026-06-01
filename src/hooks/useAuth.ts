import { useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { initGoogleAuth, requestAccessToken } from '@/services/authService';
import { getOrCreateSpreadsheet } from '@/services/googleSheets';
import type { GoogleTokenResponse } from '@/types';

export function useAuth() {
  const { user, setUser, updateToken, updateSpreadsheetId, logout, isTokenValid } = useAuthStore();
  const { showNotification } = useUiStore();
  const pendingUserId = useRef<string | null>(null);

  const handleToken = useCallback(async (token: GoogleTokenResponse) => {
    if (token.error) {
      showNotification('Authentication failed. Please try again.', 'error');
      return;
    }

    updateToken(token.access_token, token.expires_in);

    const userId = pendingUserId.current ?? user?.id;
    if (!userId) return;

    try {
      const spreadsheetId = await getOrCreateSpreadsheet(token.access_token, userId);
      updateSpreadsheetId(spreadsheetId);
      showNotification('Signed in successfully!', 'success');
    } catch (err) {
      showNotification('Could not connect to Google Sheets.', 'error');
      console.error(err);
    }
  }, [user?.id, updateToken, updateSpreadsheetId, showNotification]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.google) return;
    initGoogleAuth(
      partialUser => {
        pendingUserId.current = partialUser.id;
        setUser({
          ...partialUser,
          accessToken: '',
          tokenExpiry: 0,
          spreadsheetId: null,
        });
        requestAccessToken();
      },
      handleToken
    );
  }, [setUser, handleToken]);

  const refreshToken = useCallback(() => {
    if (user) requestAccessToken();
  }, [user]);

  return { user, logout, isTokenValid, refreshToken };
}
