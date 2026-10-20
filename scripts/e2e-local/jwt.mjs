// Firma JWT HS256 de PRUEBA para el entorno E2E local (nunca usar en producción).
import crypto from 'node:crypto';
const secret = process.env.E2E_JWT_SECRET ?? 'miraliz-e2e-local-secret-0123456789abcdef';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
export function sign(payload) {
  const h = b64({ alg: 'HS256', typ: 'JWT' });
  const now = Math.floor(Date.now() / 1000);
  const p = b64({ iat: now, exp: now + 86400 * 30, ...payload });
  const s = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${s}`;
}
if (process.argv[2] === 'anon') process.stdout.write(sign({ role: 'anon' }));
