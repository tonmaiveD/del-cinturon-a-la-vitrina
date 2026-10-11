/**
 * Servidor estático mínimo para tests e2e: sirve dist/ con gzip como lo haría un hosting
 * estático real (el `vite preview` no comprime y falsea las medidas de carga).
 *
 * Fiel a GitHub Pages: un archivo inexistente da 404 (no la portada), y si el build se hizo
 * con BASE_PUBLICA (p. ej. /del-cinturon-a-la-vitrina/) los recursos solo existen bajo esa
 * ruta, de modo que un recurso sin el prefijo falla en las pruebas igual que fallaría en
 * producción. La portada responde también en «/» para que las pruebas usen page.goto('/').
 * Uso: tsx pipeline/servidor-estatico.ts [puerto]
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { createGzip } from 'node:zlib';

const RAIZ = 'dist';
/** Prefijo con el que se construyó dist/ (el mismo que usa el build de producción). */
const BASE = (process.env.BASE_PUBLICA ?? '/').replace(/\/?$/, '/');
const PUERTO = Number(process.argv[2] ?? 4173);
const TIPOS: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.map': 'application/json',
};
const COMPRIMIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.map']);

createServer((req, res) => {
  let ruta = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (ruta === '/') ruta = BASE;
  if (!ruta.startsWith(BASE)) {
    res.writeHead(404).end();
    return;
  }
  let archivo = normalize(join(RAIZ, ruta.slice(BASE.length)));
  if (!archivo.startsWith(RAIZ)) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(archivo) && statSync(archivo).isDirectory()) archivo = join(archivo, 'index.html');
  if (!existsSync(archivo)) {
    res.writeHead(404).end();
    return;
  }
  const ext = extname(archivo);
  const cabeceras: Record<string, string> = {
    'Content-Type': TIPOS[ext] ?? 'application/octet-stream',
  };
  if (archivo.includes('/assets/'))
    cabeceras['Cache-Control'] = 'public, max-age=31536000, immutable';
  if (COMPRIMIBLE.has(ext) && /\bgzip\b/.test(String(req.headers['accept-encoding']))) {
    res.writeHead(200, { ...cabeceras, 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' });
    createReadStream(archivo)
      .pipe(createGzip({ level: 9 }))
      .pipe(res);
  } else {
    res.writeHead(200, { ...cabeceras, 'Content-Length': String(statSync(archivo).size) });
    createReadStream(archivo).pipe(res);
  }
}).listen(PUERTO, () => console.log(`Sirviendo ${RAIZ}/ en http://localhost:${PUERTO}`));
