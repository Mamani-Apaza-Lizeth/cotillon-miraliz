// Punto de entrada de la Edge Function. La lógica está en handler.ts (importable desde las pruebas).
import { handler } from './handler.ts';

Deno.serve(handler);
