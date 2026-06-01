import { useAuth } from '@/hooks/useAuth';
import LoginPage from '@/pages/LoginPage';
import MainPage from '@/pages/MainPage';

function App() {
  const { user, isTokenValid } = useAuth();

  // Simple token validity validation
  const authenticated = user && isTokenValid();

  if (!authenticated) {
    return <LoginPage />;
  }

  return <MainPage />;
}

export default App;
