import type { User, GoogleCredentialResponse, GoogleTokenResponse } from '@/types';
import { decodeJwt } from '@/utils/formatters';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

const SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
].join(' ');

type TokenCallback = (token: GoogleTokenResponse) => void;
type CredentialCallback = (user: Omit<User, 'accessToken' | 'tokenExpiry' | 'spreadsheetId'>) => void;

let tokenClient: ReturnType<typeof window.google.accounts.oauth2.initTokenClient> | null = null;

export function initGoogleAuth(
  onCredential: CredentialCallback,
  onToken: TokenCallback
): void {
  window.google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: (response: GoogleCredentialResponse) => {
      const payload = decodeJwt(response.credential);
      const name = (payload['name'] as string) ||
                   (payload['email'] as string).split('@')[0];
      onCredential({
        id:      payload['sub'] as string,
        email:   payload['email'] as string,
        name,
        picture: (payload['picture'] as string) || '',
      });
    },
    auto_select: false,
    cancel_on_tap_outside: true,
  });

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: onToken,
    error_callback: err => {
      console.error('OAuth2 token error:', err.type);
    },
  });
}

export function requestAccessToken(): void {
  if (!tokenClient) throw new Error('Auth not initialised');
  tokenClient.requestAccessToken({ prompt: '' });
}

export function promptSignIn(): void {
  window.google.accounts.id.prompt(notification => {
    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
      // Fall back to rendering button
    }
  });
}

export function renderGoogleButton(element: HTMLElement): void {
  window.google.accounts.id.renderButton(element, {
    theme: 'filled_black',
    size: 'large',
    shape: 'pill',
    text: 'signin_with',
    logo_alignment: 'left',
  });
}
