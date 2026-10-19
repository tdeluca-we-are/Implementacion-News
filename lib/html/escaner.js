// Generado desde src/html/escaner.ts por scripts/build-web.mjs. No editar a mano.
// Escáner de tags liviano: alcanza para auditar HTML de email sin depender de
// un parser con DOM. No reconstruye el árbol; devuelve tags con atributos y línea.

                      
                 
                  
                                    
                 
              
                
                
 

const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/g;
const ATRIBUTO = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

/** Reemplaza comentarios y bloques <script>/<style> por espacios, conservando offsets. */
export function enmascarar(html        , conEstilos = true)         {
  const tapar = (m        ) => m.replace(/[^\n]/g, ' ');
  let r = html.replace(/<!--[\s\S]*?-->/g, tapar);
  r = r.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (_m, a, b, c) => a + tapar(b) + c);
  if (conEstilos) r = r.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (_m, a, b, c) => a + tapar(b) + c);
  return r;
}

export function crearLineador(html        )                             {
  const saltos           = [];
  for (let i = 0; i < html.length; i++) if (html[i] === '\n') saltos.push(i);
  return (offset) => {
    let lo = 0, hi = saltos.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (saltos[mid] < offset) lo = mid + 1; else hi = mid;
    }
    return lo + 1;
  };
}

export function escanear(html        )        {
  const limpio = enmascarar(html);
  const linea = crearLineador(html);
  const tags        = [];
  for (const m of limpio.matchAll(TAG)) {
    const atributos                         = {};
    for (const a of (m[3] ?? '').matchAll(ATRIBUTO)) {
      atributos[a[1].toLowerCase()] = decodificar(a[2] ?? a[3] ?? a[4] ?? '');
    }
    const inicio = m.index ;
    tags.push({
      nombre: m[2].toLowerCase(),
      cierre: m[1] === '/',
      atributos,
      inicio,
      fin: inicio + m[0].length,
      linea: linea(inicio),
      crudo: html.slice(inicio, inicio + m[0].length),
    });
  }
  return tags;
}

export function decodificar(s        )         {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

/** Parsea un atributo style a { propiedad: valor }. */
export function parsearEstilo(style        )                         {
  const r                         = {};
  for (const decl of style.split(';')) {
    const i = decl.indexOf(':');
    if (i > 0) r[decl.slice(0, i).trim().toLowerCase()] = decl.slice(i + 1).trim();
  }
  return r;
}

/** Texto visible aproximado (sin tags, comentarios, style ni script). */
export function textoVisible(html        )         {
  return enmascarar(html)
    .replace(/<(script|style|title)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;|&zwnj;|&#8203;|&#847;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
