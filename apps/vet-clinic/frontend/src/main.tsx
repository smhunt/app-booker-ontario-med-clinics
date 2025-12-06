import React from 'react';
import ReactDOM from 'react-dom/client';
import { OptionalClerkProvider } from './contexts/ClerkContext';
import App from './App.tsx';
import './index.css';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OptionalClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <App />
    </OptionalClerkProvider>
  </React.StrictMode>,
);
