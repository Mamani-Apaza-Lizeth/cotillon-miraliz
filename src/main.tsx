// Punto de entrada: proveedores globales (sesión, configuración, carrito, avisos) y rutas.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';
import { configurationError } from './lib/supabase';

function ConfigurationErrorScreen({ problems }: { problems: string[] }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl">Falta configurar la conexión con Supabase</h1>
      <p className="mt-2 text-ink-700">La aplicación no puede iniciar por los siguientes motivos:</p>
      <ul className="mt-4 list-disc space-y-1 pl-6 text-rose-700">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
      <p className="mt-6 text-ink-700">
        Copie <code>.env.example</code> como <code>.env</code> en la raíz del proyecto, complete los valores y reinicie con
        <code> npm run dev</code>. Vea el capítulo 6 del manual técnico.
      </p>
    </main>
  );
}

const root = createRoot(document.getElementById('root') as HTMLElement);

if (configurationError) {
  root.render(<ConfigurationErrorScreen problems={configurationError.problems} />);
} else {
  root.render(
    <StrictMode>
      <ToastProvider>
        <AuthProvider>
          <SettingsProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </SettingsProvider>
        </AuthProvider>
      </ToastProvider>
    </StrictMode>,
  );
}
