// Empaqueta src/ui/app.js (+ el engine que importa) en un único archivo HTML
// autocontenido (ADR-001). Usa la API de JS de esbuild, no minifica (para que
// el profesor pueda leer el código si quiere) y verifica que el resultado no
// tenga ninguna referencia a recursos externos antes de escribirlo.

import * as esbuild from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(__dirname, '..');

async function main() {
  const resultado = await esbuild.build({
    entryPoints: [path.join(raiz, 'src/ui/app.js')],
    bundle: true,
    format: 'iife',
    minify: false,
    target: 'es2020',
    write: false,
  });

  const script = resultado.outputFiles[0].text;
  const estilos = await readFile(path.join(raiz, 'src/ui/styles.css'), 'utf8');
  const plantilla = await readFile(path.join(raiz, 'src/ui/index.html'), 'utf8');

  const html = plantilla
    .replace('<!--STYLES-->', estilos)
    .replace('<!--SCRIPT-->', script);

  verificarAutocontenido(html);

  const dirSalida = path.join(raiz, 'dist');
  await mkdir(dirSalida, { recursive: true });
  const archivoSalida = path.join(dirSalida, 'simulador.html');
  await writeFile(archivoSalida, html, 'utf8');

  const tamanoKB = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  console.log(`Build OK: ${archivoSalida} (${tamanoKB} KB)`);
}

/**
 * Verifica que el HTML final no tenga ninguna referencia a recursos externos
 * (ADR-001: debe funcionar sin internet). Lanza y detiene el build (exit 1)
 * si encuentra algo sospechoso.
 */
function verificarAutocontenido(html) {
  const problemas = [];

  if (/<script\s+[^>]*src=/i.test(html)) {
    problemas.push('Se encontró un <script src="..."> — el script debe estar inline.');
  }
  if (/<link\b/i.test(html)) {
    problemas.push('Se encontró un <link> — no debe haber hojas de estilo ni recursos enlazados externamente.');
  }
  if (/@import/i.test(html)) {
    problemas.push('Se encontró un @import en CSS — no está permitido.');
  }
  if (/url\(\s*['"]?https?:/i.test(html)) {
    problemas.push('Se encontró un url(http...) en CSS — no está permitido.');
  }

  // http://, https:// o protocol-relative (//host tras comilla, paréntesis o =) en
  // cualquier parte, salvo el namespace SVG exacto. Antes solo se buscaba //cdn y un
  // <img src="//host/x.png"> pasaba la verificación (review de seguridad).
  const sinNamespaceSvg = html.split('http://www.w3.org/2000/svg').join('');
  if (/https?:\/\//i.test(sinNamespaceSvg) || /["'(=]\s*\/\/[a-z0-9]/i.test(sinNamespaceSvg)) {
    problemas.push('Se encontró una referencia a http://, https:// o //host distinta del namespace SVG.');
  }

  if (problemas.length > 0) {
    console.error('El build NO es autocontenido. Problemas encontrados:');
    problemas.forEach((p) => console.error(` - ${p}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error en el build:', err);
  process.exit(1);
});
