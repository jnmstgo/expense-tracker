import { useEffect, useRef } from 'react';
import { renderGoogleButton } from '@/services/authService';

export default function GoogleSignIn() {
  const btnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tryRender = () => {
      if (btnRef.current && window.google?.accounts?.id) {
        renderGoogleButton(btnRef.current);
        return true;
      }
      return false;
    };

    if (!tryRender()) {
      const interval = setInterval(() => {
        if (tryRender()) clearInterval(interval);
      }, 200);
      return () => clearInterval(interval);
    }
  }, []);

  return <div ref={btnRef} className="flex justify-center" />;
}
