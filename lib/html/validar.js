// Generado desde src/html/validar.ts por scripts/build-web.mjs. No editar a mano.
// Validador de HTML de email: estructura, CSS compatible con Outlook/Gmail,
// imágenes, links y UTM, y lo propio de cada herramienta (baja y variables).
                                                
                                                     
import { PERFILES, VARIABLES_AJENAS } from '../tools/perfiles.js';
import { crearLineador, escanear, parsearEstilo, textoVisible,          } from './escaner.js';

                                     
                            
                                                                                
                           
                      
                                                                                                           
                                     
 

                                 
               
                
                
 

                                   
              
                     
                
 

                                      
                        
                          
                               
                                                                                                                   
 

const LIMITE_GMAIL = 102 * 1024;
const PROHIBIDOS                                    = { script: 'error', form: 'error', iframe: 'error', object: 'error', embed: 'error', video: 'aviso', audio: 'aviso', input: 'aviso', button: 'aviso' };
const PLACEHOLDER = /\{\{\s*LINK|A_COMPLETAR|example\.(com|org)|localhost|127\.0\.0\.1|^https?:\/\/(www\.)?(url|link)\.?(com)?\/?$/i;

export function validarHtml(html        , op                     = {})                      {
  const h             = [];
  const add = (severidad                       , codigo        , mensaje        , t               , contexto         ) =>
    h.push({ codigo, severidad, mensaje, linea: typeof t === 'number' ? t : t?.linea, contexto: contexto ?? (typeof t === 'object' ? recortar(t.crudo) : undefined) });

  const tags = escanear(html);
  const aperturas = tags.filter((t) => !t.cierre);
  const de = (n        ) => aperturas.filter((t) => t.nombre === n);
  const bytes = new TextEncoder().encode(html).length;

  // ── Estructura ─────────────────────────────────────────────
  if (!/^\s*<!doctype html/i.test(html)) add('aviso', 'estructura.doctype', 'Falta <!DOCTYPE html>: algunos clientes renderizan en modo quirks.', 1);
  if (bytes > LIMITE_GMAIL) add('error', 'estructura.peso', `Pesa ${kb(bytes)}: Gmail recorta los mails de más de 102 KB y oculta el resto (incluido el link de baja).`);
  else if (bytes > 90 * 1024) add('aviso', 'estructura.peso', `Pesa ${kb(bytes)}: cerca del límite de 102 KB de Gmail; la herramienta suele sumar tracking.`);
  if (!/<meta[^>]+charset/i.test(html)) add('aviso', 'estructura.charset', 'Falta <meta charset="utf-8">: tildes y emojis pueden verse rotos.');
  if (!/<meta[^>]+name=["']?viewport/i.test(html)) add('info', 'estructura.viewport', 'Falta <meta name="viewport">: en mobile puede verse achicado.');
  if (!de('title').length) add('info', 'estructura.title', 'Falta <title> (algunos clientes lo muestran en la vista web).');
  const htmlTag = de('html')[0];
  if (htmlTag && !htmlTag.atributos.lang) add('info', 'estructura.lang', 'Falta lang="es" en <html> (lectores de pantalla).', htmlTag);

  for (const t of aperturas) {
    const sev = PROHIBIDOS[t.nombre];
    if (sev) add(sev, `estructura.${t.nombre}`, `<${t.nombre}> no funciona en email (Gmail/Outlook lo eliminan o bloquean).`, t);
    if (t.nombre === 'link' && /stylesheet/i.test(t.atributos.rel ?? '')) add('error', 'css.externo', 'CSS externo con <link>: Gmail y Outlook lo ignoran. Pasarlo inline.', t);
  }

  // ── CSS ────────────────────────────────────────────────────
  const tablas = de('table');
  const divs = de('div');
  if (!tablas.length) add('error', 'css.sin-tablas', 'No hay <table>: Outlook de escritorio necesita layout con tablas.');
  else if (divs.length > tablas.length * 3) add('aviso', 'css.divs', `Hay ${divs.length} <div> y ${tablas.length} <table>: si el layout depende de divs, se rompe en Outlook.`);

  const bloquesStyle = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  const fueraDeMedia = bloquesStyle.map(quitarMedia).join('').replace(/\/\*[\s\S]*?\*\//g, '');
  const reglasFuera = (fueraDeMedia.match(/\{/g) ?? []).length;
  const visuales = aperturas.filter((t) => ['td', 'p', 'a', 'span', 'h1', 'h2', 'h3', 'h4', 'div', 'table'].includes(t.nombre));
  const conInline = visuales.filter((t) => t.atributos.style).length;
  if (reglasFuera > 0 && visuales.length && conInline / visuales.length < 0.5) {
    add('error', 'css.no-inline', `El CSS no está inline: ${conInline} de ${visuales.length} elementos tienen style y hay ${reglasFuera} reglas en <style>. Gmail (app y cuentas no Google) las ignora.`);
  } else if (reglasFuera > 0) {
    add('aviso', 'css.style-bloque', `Hay ${reglasFuera} reglas en <style> fuera de @media. Si son visuales, conviene inlinearlas.`);
  }

  for (const t of aperturas) {
    const st = t.atributos.style;
    if (!st) continue;
    const e = parsearEstilo(st);
    if (/flex|grid/i.test(e.display ?? '')) add('aviso', 'css.flex-grid', `display:${e.display} no funciona en Outlook de escritorio.`, t);
    if (/absolute|fixed|sticky/i.test(e.position ?? '')) add('aviso', 'css.position', `position:${e.position} no funciona en la mayoría de los clientes.`, t);
    if (e.float) add('info', 'css.float', 'float tiene soporte irregular en Outlook.', t);
    if (/url\(/i.test(e['background-image'] ?? e.background ?? '')) add('aviso', 'css.background-image', 'Imagen de fondo por CSS: Outlook de escritorio no la muestra (necesita VML). Definir un background-color de respaldo.', t);
    if (/var\(--/.test(st)) add('error', 'css.variables', 'Variables CSS (var(--x)): no funcionan en Gmail ni Outlook.', t);
  }
  for (const t of tablas) {
    const w = Number(t.atributos.width);
    if (w > 700) add('aviso', 'css.ancho', `Tabla de ${w}px: el estándar es 600-640px.`, t);
  }
  if (tablas.length && !tablas.some((t) => t.atributos.role === 'presentation')) add('info', 'css.role', 'Las tablas no tienen role="presentation" (los lectores de pantalla las leen como datos).');

  // ── Imágenes ───────────────────────────────────────────────
  const imagenes                     = [];
  for (const t of de('img')) {
    const src = (t.atributos.src ?? '').trim();
    const alt = 'alt' in t.atributos ? t.atributos.alt : null;
    imagenes.push({ src, alt, linea: t.linea });
    if (!src) { add('error', 'img.sin-src', 'Imagen sin src.', t); continue; }
    if (op.prefijoImagenesPendientes && src.startsWith(op.prefijoImagenesPendientes)) { /* se suben en la herramienta */ }
    else if (/^data:/i.test(src)) add('error', 'img.base64', 'Imagen embebida en base64: Gmail no la muestra y suma peso. Subirla a un hosting.', t, src.slice(0, 40) + '…');
    else if (/^(file:|[a-z]:\\|\/\/?localhost|https?:\/\/(localhost|127\.)|\.{0,2}\/)/i.test(src) || !/^[a-z]+:\/\//i.test(src)) add('error', 'img.local', `Ruta de imagen local o relativa: no se va a ver. (${src})`, t);
    else if (/^http:/i.test(src)) add('aviso', 'img.http', 'Imagen por http: algunos clientes la bloquean. Usar https.', t);
    if (/drive\.google\.com|docs\.google\.com/i.test(src)) add('aviso', 'img.drive', 'Imagen servida desde Google Drive: no es hosting estable y suele fallar. Subirla a la herramienta.', t);
    if (/\.(webp|svg|avif)(\?|$)/i.test(src)) add('aviso', 'img.formato', 'Formato no soportado en todos los clientes (Outlook/Gmail): usar JPG, PNG o GIF.', t);
    if (alt === null) add('aviso', 'img.alt', 'Imagen sin alt: con imágenes bloqueadas no se ve nada.', t);
    if (!t.atributos.width) add('aviso', 'img.width', 'Imagen sin atributo width: Outlook la muestra a tamaño real.', t);
  }

  // ── Links ──────────────────────────────────────────────────
  const links                   = [];
  const cierres = tags.filter((t) => t.cierre && t.nombre === 'a');
  for (const t of de('a')) {
    const cierre = cierres.find((c) => c.inicio > t.inicio);
    const texto = cierre ? textoVisible(html.slice(t.fin, cierre.inicio)).slice(0, 60) || (/<img/i.test(html.slice(t.fin, cierre.inicio)) ? '[imagen]' : '') : '';
    if (!('href' in t.atributos)) { if (!t.atributos.name) add('aviso', 'link.sin-href', '<a> sin href.', t); continue; }
    const href = t.atributos.href.trim();
    links.push({ href, linea: t.linea, texto });
    if (!href || href === '#') { add('error', 'link.vacio', `Link vacío o "#"${texto ? ` en "${texto}"` : ''}.`, t); continue; }
    if (/^(mailto:|tel:|sms:)/i.test(href)) continue;
    if (/^javascript:/i.test(href)) { add('error', 'link.javascript', 'Link javascript: no funciona en email.', t); continue; }
    if (PLACEHOLDER.test(href)) { add('error', 'link.placeholder', `Link sin reemplazar: ${href}`, t); continue; }
    if (esVariable(href)) continue; // merge tag de la herramienta (baja, vista web)
    if (!/^https?:\/\//i.test(href)) { add('error', 'link.relativo', `Link relativo o mal formado: ${href}`, t); continue; }
    if (/\s/.test(href)) add('error', 'link.espacios', `El link tiene espacios: ${href}`, t);
    if (/^http:/i.test(href)) add('aviso', 'link.http', `Link por http: ${href}`, t);
    let url     ;
    try { url = new URL(href); } catch { add('error', 'link.invalido', `URL inválida: ${href}`, t); continue; }
    const utms = ['utm_source', 'utm_medium', 'utm_campaign'];
    const presentes = utms.filter((u) => url.searchParams.has(u));
    for (const u of utms) if (url.searchParams.getAll(u).length > 1) add('aviso', 'utm.duplicado', `${u} aparece más de una vez: ${href}`, t);
    const delSitio = (op.dominiosSitio ?? []).some((d) => url.hostname === d || url.hostname.endsWith('.' + d));
    if (presentes.length > 0 && presentes.length < 3) add('aviso', 'utm.incompleto', `UTM incompleto (faltan ${utms.filter((u) => !presentes.includes(u)).join(', ')}): ${href}`, t);
    else if (op.exigirUtm && delSitio && presentes.length === 0) add('error', 'utm.falta', `Link al sitio sin UTM: ${href}`, t);
  }
  if (!links.length) add('aviso', 'link.ninguno', 'El mail no tiene ningún link.');

  // ── Contenido ──────────────────────────────────────────────
  const texto = textoVisible(html);
  if (imagenes.length && texto.length < 100) add('aviso', 'contenido.solo-imagenes', `Casi todo es imagen (${texto.length} caracteres de texto): peor entregabilidad y se ve vacío con imágenes bloqueadas.`);

  // ── Herramienta: baja y variables ──────────────────────────
  const linea = crearLineador(html);
  const perfil = op.herramienta ? PERFILES[op.herramienta] : undefined;
  const patronPropio = perfil?.variables.patron ? new RegExp(perfil.variables.patron) : null;
  for (const v of VARIABLES_AJENAS) {
    for (const m of html.matchAll(v.patron)) {
      if (patronPropio?.test(m[0]) || /^\{\{\s*LINK/i.test(m[0])) continue; // {{LINK_X}} ya se reporta como link sin reemplazar
      add(perfil?.variables.confirmado ? 'error' : 'aviso', 'variables.ajenas', `Variable con sintaxis ${v.nombre}: verificar que ${perfil?.nombre ?? 'la herramienta'} la reconozca.`, linea(m.index ), m[0]);
    }
  }
  const mencionaBaja = /desuscrib|darte de baja|dar(se)? de baja|unsubscribe|no (quiero|querés) recibir/i.test(texto);
  if (perfil?.baja.patron) {
    if (!new RegExp(perfil.baja.patron).test(html)) add('error', 'baja.falta', `Falta el link de baja de ${perfil.nombre}.`);
  } else if (perfil) {
    add('info', 'baja.sin-confirmar', `Link de baja de ${perfil.nombre} sin confirmar: ${perfil.baja.nota}${mencionaBaja ? ' (el HTML menciona la baja en el texto).' : ' El HTML no menciona la baja.'}`);
  } else if (!mencionaBaja) {
    add('aviso', 'baja.texto', 'El texto no menciona la baja. Verificar que la herramienta agregue el footer.');
  }

  return {
    hallazgos: h,
    links,
    imagenes,
    stats: { bytes, tablas: tablas.length, divs: divs.length, imagenes: imagenes.length, links: links.length, caracteresTexto: texto.length },
  };
}

/** Merge tags de herramientas en un href ({{unsubscribe}}, *|UNSUB|*, %%view_email_url%%, [UNSUBSCRIBE]). */
export function esVariable(href        )          {
  return /^(\{\{.*\}\}|\*\|.*\|\*|%%.*%%|\[[A-Z_]+\]|\$\{.*\}|#\{.*\})$/.test(href.trim());
}

function quitarMedia(css        )         {
  let r = '';
  let i = 0;
  while (i < css.length) {
    const j = css.indexOf('@media', i);
    if (j < 0) { r += css.slice(i); break; }
    r += css.slice(i, j);
    let k = css.indexOf('{', j);
    if (k < 0) break;
    let prof = 1;
    k++;
    while (k < css.length && prof > 0) { if (css[k] === '{') prof++; else if (css[k] === '}') prof--; k++; }
    i = k;
  }
  return r;
}

const kb = (b        ) => `${(b / 1024).toFixed(1)} KB`;
const recortar = (s        ) => (s.length > 120 ? s.slice(0, 117) + '…' : s);
