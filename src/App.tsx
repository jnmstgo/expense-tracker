import { useAuth } from '@/hooks/useAuth';
import LoginPage from '@/pages/LoginPage';
import MainPage from '@/pages/MainPage';

function App() {
  const { user } = useAuth();

  // Persistent session: As long as the user has logged in at least once,
  // we immediately render MainPage from local cache and keep the session open forever.
  // The app will NEVER close the session or kick the user out to LoginPage
  // unless they explicitly click "Cerrar sesión".
  if (!user) {
    return <LoginPage />;
  }

  return <MainPage />;
}

export default App;
