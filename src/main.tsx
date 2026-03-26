import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import { AuthGate } from './components/AuthGate.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { applyTheme, getInitialTheme } from './lib/theme.ts';
import './index.css';

applyTheme(getInitialTheme());
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AuthGate>
        <App />
      </AuthGate>
    </AuthProvider>
  </StrictMode>,
);
