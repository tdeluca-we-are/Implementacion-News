// Generado desde src/html/piezas.ts por scripts/build-web.mjs. No editar a mano.
// Cuando la pieza llega como imágenes (JPG/PNG) en lugar de HTML: medirlas,
// revisar que sirvan para email y armar un HTML de tablas con una fila por pieza.
                                                

                          
                                 
                
               
 

/** Lee ancho y alto del encabezado del archivo, sin dependencias (Node y navegador). */
export function medirImagen(b            )                 {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (b.length > 24 && v.getUint32(0) === 0x89504e47) {
    return { formato: 'png', ancho: v.getUint32(16), alto: v.getUint32(20) };
  }
  if (b.length > 10 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) {
    return { formato: 'gif', ancho: v.getUint16(6, true), alto: v.getUint16(8, true) };
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marca = b[i + 1];
      // SOF0..SOF15 salvo DHT (C4), JPG (C8) y DAC (CC)
      if (marca >= 0xc0 && marca <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marca)) {
        return { formato: 'jpg', alto: v.getUint16(i + 5), ancho: v.getUint16(i + 7) };
      }
      if (marca === 0xd8 || marca === 0x01 || (marca >= 0xd0 && marca <= 0xd7)) { i += 2; continue; }
      i += 2 + v.getUint16(i + 2);
    }
  }
  return null;
}

                              
                 
                  
                          
                
                                                               
                    
                                                                                   
                
 

const ANCHO_EMAIL = 600;
/** Outlook de escritorio recorta las imágenes de más de 1728 px de alto. */
const ALTO_MAX_OUTLOOK = 1728;

export function revisarPiezas(piezas               )             {
  const h             = [];
  const anchos = new Set        ();
  const altosPorFila = new Map                     ();
  let total = 0;
  for (const p of piezas) {
    const n = `Pieza ${p.numero} (${p.archivo})`;
    total += p.bytes;
    if (!p.medidas) { h.push({ codigo: 'piezas.ilegible', severidad: 'error', mensaje: `${n}: no se pudo leer como JPG, PNG o GIF.` }); continue; }
    const { ancho, alto } = p.medidas;
    const cols = p.columnas ?? 1;
    // Ancho con que se muestra: 600 si va sola en la fila, 300 si son dos, 200 si son tres…
    const anchoEnMail = Math.floor(ANCHO_EMAIL / cols);
    if (cols === 1) anchos.add(ancho);
    if (ancho < anchoEnMail) h.push({ codigo: 'piezas.angosta', severidad: 'aviso', mensaje: `${n}: mide ${ancho}px de ancho y se muestra a ${anchoEnMail}px: se va a ver estirada. Lo ideal es ${anchoEnMail * 2}px (pantallas retina).` });
    // En columnas, cualquier ancho mayor alcanza: solo se comenta el estándar en piezas de fila completa.
    else if (cols === 1 && ancho !== anchoEnMail * 2 && ancho !== anchoEnMail) h.push({ codigo: 'piezas.ancho', severidad: 'info', mensaje: `${n}: mide ${ancho}px de ancho; para ${cols === 1 ? 'una fila completa' : `una fila de ${cols}`} lo estándar es ${anchoEnMail} o ${anchoEnMail * 2}px.` });
    // Alto en pantalla, al ancho con que se muestra
    const altoEnPantalla = Math.round((alto * anchoEnMail) / ancho);
    if (cols > 1 && p.fila !== undefined) { if (!altosPorFila.has(p.fila)) altosPorFila.set(p.fila, new Set()); altosPorFila.get(p.fila) .add(altoEnPantalla); }
    if (alto > ALTO_MAX_OUTLOOK) h.push({ codigo: 'piezas.alta', severidad: 'aviso', mensaje: `${n}: mide ${alto}px de alto; Outlook de escritorio recorta pasados ${ALTO_MAX_OUTLOOK}px. Cortarla en dos.` });
    else if (altoEnPantalla > 1000) h.push({ codigo: 'piezas.alta', severidad: 'info', mensaje: `${n}: ocupa ${altoEnPantalla}px de alto en pantalla; si tiene varios productos, conviene cortarla para darle un link a cada uno.` });
    if (p.bytes > 1024 * 1024) h.push({ codigo: 'piezas.peso', severidad: 'aviso', mensaje: `${n}: pesa ${kb(p.bytes)}; en datos móviles tarda en cargar. Comprimir a menos de 500 KB.` });
    else if (p.bytes > 500 * 1024) h.push({ codigo: 'piezas.peso', severidad: 'info', mensaje: `${n}: pesa ${kb(p.bytes)}; conviene comprimirla.` });
    if (p.medidas.formato === 'png' && p.bytes > 300 * 1024) h.push({ codigo: 'piezas.png', severidad: 'info', mensaje: `${n}: PNG pesado; si es una foto, en JPG pesa mucho menos.` });
  }
  for (const [fila, altos] of altosPorFila) {
    if (Math.max(...altos) - Math.min(...altos) > 2) h.push({ codigo: 'piezas.fila-desigual', severidad: 'aviso', mensaje: `Fila ${fila}: las fotos de la misma fila tienen alturas distintas (${[...altos].join(', ')}px en pantalla): va a quedar un escalón.` });
  }
  if (anchos.size > 1) h.push({ codigo: 'piezas.anchos-distintos', severidad: 'aviso', mensaje: `Las piezas tienen anchos distintos (${[...anchos].join(', ')}px): pueden quedar escalones entre una y otra.` });
  if (total > 2.5 * 1024 * 1024) h.push({ codigo: 'piezas.peso-total', severidad: 'aviso', mensaje: `Las piezas suman ${kb(total)}: el mail va a tardar en cargar.` });
  return h;
}

                            
              
                
              
                                                                     
                  
 

/** Agrupa las piezas en filas: cada una con "junto" se suma a la fila de la anterior. */
export function agruparEnFilas                               (piezas     )        {
  const filas        = [];
  piezas.forEach((p, i) => { if (i > 0 && p.junto) filas[filas.length - 1].push(p); else filas.push([p]); });
  return filas;
}

const esc = (s        ) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** HTML de email: una fila por pieza, o varias piezas lado a lado si van "junto". Sin espacios entre piezas. */
export function armarHtmlDesdePiezas(o                                                                              )         {
  const celda = (f           , ancho        ) => {
    const img = `<img src="${esc(f.src)}" width="${ancho}" alt="${esc(f.alt)}" style="display:block;width:100%;max-width:${ancho}px;height:auto;border:0;outline:none;text-decoration:none;">`;
    return f.link ? `<a href="${esc(f.link)}" target="_blank" style="display:block;">${img}</a>` : img;
  };
  const filas = agruparEnFilas(o.filas).map((fila) => {
    if (fila.length === 1) return `<tr><td style="padding:0;font-size:0;line-height:0;">${celda(fila[0], ANCHO_EMAIL)}</td></tr>`;
    // Columnas: se reparte el ancho; la última se queda con el resto para sumar 600 justos.
    const base = Math.floor(ANCHO_EMAIL / fila.length);
    const celdas = fila.map((f, i) => {
      const ancho = i === fila.length - 1 ? ANCHO_EMAIL - base * (fila.length - 1) : base;
      return `<td width="${ancho}" valign="top" style="padding:0;font-size:0;line-height:0;width:${(100 * ancho / ANCHO_EMAIL).toFixed(2)}%;">${celda(f, ancho)}</td>`;
    }).join('');
    return `<tr><td style="padding:0;font-size:0;line-height:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;"><tr>${celdas}</tr></table></td></tr>`;
  });
  const pie = o.textoPie
    ? `<tr><td align="center" style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#777777;">${esc(o.textoPie)}</td></tr>`
    : '';
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${esc(o.titulo)}</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(o.preheader)}${'&#847;&zwnj;&nbsp;'.repeat(30)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;">
<tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
${filas.join('\n')}
${pie}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>
`;
}

const kb = (b        ) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);
