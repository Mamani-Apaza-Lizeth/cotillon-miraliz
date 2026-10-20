// Uso: node proxy.mjs  (escucha en 127.0.0.1:54321 y reenvía /rest/v1 a PostgREST en :3000)
// Proxy mínimo que imita las rutas de Supabase para pruebas E2E locales.
import http from 'node:http';
import { sign } from './jwt.mjs';
const USERS = {
  '11111111-1111-4111-8111-111111111111': 'duena@miraliz.test',
  '22222222-2222-4222-8222-222222222222': 'taller@miraliz.test',
  '33333333-3333-4333-8333-333333333333': 'cliente@miraliz.test',
};
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Expose-Headers': '*' };
http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const url = new URL(req.url, 'http://x');
  const chunks = []; for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);
  if (url.pathname.startsWith('/rest/v1')) {
    const headers = { ...req.headers }; delete headers.host; delete headers['content-length'];
    const r = await fetch('http://127.0.0.1:3000' + url.pathname.replace('/rest/v1', '') + url.search, { method: req.method, headers, body: ['GET','HEAD'].includes(req.method) ? undefined : body });
    const out = Buffer.from(await r.arrayBuffer());
    const h = { ...cors }; r.headers.forEach((v, k) => { if (!['content-encoding','transfer-encoding','connection'].includes(k) && !k.startsWith('access-control')) h[k] = v; });
    res.writeHead(r.status, h); return res.end(out);
  }
  if (url.pathname === '/auth/v1/user') {
    const tok = (req.headers.authorization || '').replace('Bearer ', '');
    try { const p = JSON.parse(Buffer.from(tok.split('.')[1], 'base64url')); res.writeHead(200, { ...cors, 'content-type': 'application/json' });
      return res.end(JSON.stringify({ id: p.sub, email: USERS[p.sub], aud: 'authenticated', role: 'authenticated' })); } catch { res.writeHead(401, cors); return res.end('{}'); }
  }
  if (url.pathname === '/auth/v1/logout') { res.writeHead(204, cors); return res.end(); }
  res.writeHead(404, { ...cors, 'content-type': 'application/json' }); res.end('{"message":"no disponible en el entorno E2E local"}');
}).listen(54321, '127.0.0.1', () => console.log('proxy listo'));
