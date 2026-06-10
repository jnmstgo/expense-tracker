import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import LoginPage from '@/pages/LoginPage';
import MainPage from '@/pages/MainPage';
import LoadingSpinner from '@/components/UI/LoadingSpinner';

function App() {
  const { user, isTokenValid } = useAuth();

  // If we have a user session saved, but the token has expired, we are in a "refreshing" state.
  // We can show a loading spinner while Google Auth initializes and refreshes the token,
  // rather than immediately kicking the user to the LoginPage.
  const [isRefreshing, setIsRefreshing] = useState(!!user && !isTokenValid());

  useEffect(() => {
    if (user && isTokenValid()) {
      setIsRefreshing(false);
    }
  }, [user, isTokenValid]);

  useEffect(() => {
    if (user && !isTokenValid()) {
      setIsRefreshing(true);
      const timer = setTimeout(() => {
        setIsRefreshing(false);
      }, 6000); // 6 seconds timeout
      return () => clearTimeout(timer);
    }
  }, [user]);

  // If the user is fully logged in
  const authenticated = user && isTokenValid();

  if (isRefreshing && user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-white/50 animate-pulse font-sans">Sincronizando sesión con Google...</p>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginPage />;
  }

  return <MainPage />;
}

export default App;
