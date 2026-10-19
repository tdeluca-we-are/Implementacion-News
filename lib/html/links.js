// Generado desde src/html/links.ts por scripts/build-web.mjs. No editar a mano.
// Reemplazo de links y UTM sobre el HTML. Solo toca el valor de los href;
// el resto del HTML queda byte a byte igual.
                                                            
import { esVariable } from './validar.js';

                             
                
                  
 

const HREF = /(<a\b[^>]*?\bhref\s*=\s*)(["'])(.*?)\2/gi;

function codificarHref(url        , comilla        )         {
  return url.replace(/&(?!amp;)/g, '&amp;').replace(comilla === '"' ? /"/g : /'/g, comilla === '"' ? '&quot;' : '&#39;');
}

function reescribir(html        , fn                          , cambios              )         {
  return html.replace(HREF, (m, pre        , q        , crudo        ) => {
    const href = crudo.replace(/&amp;/g, '&');
    const nuevo = fn(href);
    if (nuevo === href) return m;
    cambios.push({ antes: href, despues: nuevo });
    return pre + q + codificarHref(nuevo, q) + q;
  });
}

export function reemplazarLinks(html        , reemplazos                 )                                                                    {
  const cambios               = [];
  const usados = new Set               ();
  const out = reescribir(html, (href) => {
    const r = reemplazos.find((x) => href.trim() === x.buscar.trim());
    if (!r) return href;
    usados.add(r);
    return r.url;
  }, cambios);
  return { html: out, cambios, sinUsar: reemplazos.filter((r) => !usados.has(r)) };
}

/** Agrega UTM a los links del sitio del cliente. No pisa UTM que ya vengan puestos. */
export function aplicarUtm(html        , utm     , dominiosSitio          )                                          {
  const cambios               = [];
  const out = reescribir(html, (href) => conUtm(href, utm, dominiosSitio), cambios);
  return { html: out, cambios };
}

export function conUtm(href        , utm     , dominiosSitio          )         {
  if (esVariable(href) || !/^https?:\/\//i.test(href)) return href;
  let url     ;
  try { url = new URL(href); } catch { return href; }
  if (!dominiosSitio.some((d) => url.hostname === d || url.hostname.endsWith('.' + d))) return href;
  const params                                 = [
    ['utm_source', utm.source], ['utm_medium', utm.medium], ['utm_campaign', utm.campaign], ['utm_content', utm.content],
  ];
  let cambio = false;
  for (const [k, v] of params) if (v && !url.searchParams.has(k)) { url.searchParams.set(k, v); cambio = true; }
  return cambio ? url.toString() : href;
}

/** "Hot Sale - Día 1" + 2026-11-03 → "20261103-hot-sale-dia-1" */
export function slugCampana(nombre        , fecha        )         {
  const s = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${fecha.replace(/-/g, '')}-${s}`;
}
