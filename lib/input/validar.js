// Generado desde src/input/validar.ts por scripts/build-web.mjs. No editar a mano.
// Valida el input estándar contra el esquema y contra el mapeo del cliente.
// No toca el HTML: eso lo hace src/html/validar.ts.
                                                
                                                      
                                                  

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Hoy en Argentina como YYYY-MM-DD (un toISOString() en UTC-3 corre el día). */
export function hoyArgentina(ahora = new Date())         {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(ahora);
}

/** Largo visible: los emojis cuentan como un carácter. */
function largo(s        )         {
  return [...new Intl.Segmenter('es').segment(s)].length;
}

export function validarInput(input                 , clientes          , hoy = hoyArgentina())             {
  const h             = [];
  const err = (codigo        , mensaje        , contexto         ) => h.push({ codigo, severidad: 'error', mensaje, contexto });
  const aviso = (codigo        , mensaje        , contexto         ) => h.push({ codigo, severidad: 'aviso', mensaje, contexto });

  for (const campo of ['cliente', 'nombre', 'asunto', 'preheader', 'segmento']         ) {
    if (typeof input[campo] !== 'string' || !input[campo].trim()) err('input.falta', `Falta "${campo}".`);
  }
  const tienePiezas = Array.isArray(input.piezas) && input.piezas.length > 0;
  if (!input.html && !tienePiezas) err('input.falta', 'Falta el contenido: "html" (pieza de Atlas) o "piezas" (imágenes en orden).');
  if (input.html && tienePiezas) err('input.falta', 'Va "html" o "piezas", no los dos.');
  if (h.length) return h;

  const cliente = clientes[input.cliente];
  if (!cliente) {
    err('input.cliente', `El cliente "${input.cliente}" no está en config/clientes.json.`);
    return h;
  }

  // Asunto y preheader
  const la = largo(input.asunto);
  if (la > 150) err('input.asunto.largo', `El asunto tiene ${la} caracteres: la mayoría de las herramientas corta antes.`);
  else if (la > 60) aviso('input.asunto.largo', `El asunto tiene ${la} caracteres: en mobile se ven ~40-60.`);
  if (input.asunto !== input.asunto.trim()) aviso('input.asunto.espacios', 'El asunto empieza o termina con espacios.');
  const lp = largo(input.preheader);
  if (lp > 150) aviso('input.preheader.largo', `El preheader tiene ${lp} caracteres: se corta pasados ~100-130.`);
  if (lp < 20) aviso('input.preheader.corto', `El preheader tiene ${lp} caracteres: el cliente de mail completa el resto con texto del cuerpo.`);
  if (input.preheader.trim() === input.asunto.trim()) aviso('input.preheader.igual', 'El preheader repite el asunto.');
  if (/\{\{|\}\}|\*\||%%|A_COMPLETAR|lorem ipsum/i.test(input.asunto + input.preheader)) {
    err('input.placeholder', 'El asunto o el preheader tienen un placeholder sin reemplazar.', `${input.asunto} / ${input.preheader}`);
  }

  // Remitente: opcional. Si no se indica, queda el que tiene configurado la herramienta.
  const remitente = input.remitente ?? cliente.remitentes?.[0];
  if (remitente) {
    if (!EMAIL.test(remitente.email)) err('input.remitente', `Email de remitente inválido: ${remitente.email}`);
    const dominio = remitente.email.split('@')[1]?.toLowerCase();
    if (dominio && cliente.dominiosRemitente?.length && !cliente.dominiosRemitente.includes(dominio)) {
      err('input.remitente.dominio', `El dominio ${dominio} no está autenticado para ${cliente.nombre} (${cliente.dominiosRemitente.join(', ')}).`);
    }
    if (/A_COMPLETAR/.test(remitente.email)) err('input.remitente', 'El remitente del cliente está sin completar en config/clientes.json.');
  }
  if (input.responderA && !EMAIL.test(input.responderA)) err('input.responderA', `Email de respuesta inválido: ${input.responderA}`);

  // Segmento: un alias del mapeo del cliente, o el nombre / ID tal como figura en la herramienta.
  const seg = cliente.segmentos?.[input.segmento];
  if (seg && seg.id === 'A_COMPLETAR') err('input.segmento', `El segmento "${input.segmento}" no tiene id en la herramienta.`);

  // Fecha y hora: opcionales (la programación se hace en la herramienta); si están, se validan.
  const { fecha, hora } = input.envio ?? { fecha: '', hora: '' };
  if (!fecha && !hora) { /* sin fecha */ }
  else if (!FECHA.test(fecha ?? '')) err('input.fecha', `Fecha inválida "${fecha}": usar YYYY-MM-DD.`);
  else if (fecha < hoy) err('input.fecha', `La fecha ${fecha} ya pasó (hoy es ${hoy}).`);
  if ((fecha || hora) && !HORA.test(hora ?? '')) err('input.hora', `Hora inválida "${hora}": usar HH:MM (hora Argentina).`);

  // Tests
  for (const e of input.emailsTest ?? []) if (!EMAIL.test(e)) err('input.emailsTest', `Email de test inválido: ${e}`);

  // Piezas
  (input.piezas ?? []).forEach((p, i) => {
    const n = `Pieza ${i + 1}`;
    if (!p.imagen) err('input.piezas', `${n}: falta "imagen".`);
    else if (!/\.(jpe?g|png|gif)$/i.test(p.imagen)) err('input.piezas.formato', `${n}: ${p.imagen} no es JPG, PNG ni GIF.`);
    if (!p.alt?.trim()) aviso('input.piezas.alt', `${n}: sin "alt" (texto que se ve con imágenes bloqueadas).`);
    if (p.link && !/^https:\/\//.test(p.link)) err('input.piezas.link', `${n}: el link tiene que empezar con https:// (${p.link}).`);
  });
  if (tienePiezas && !input.piezas .some((p) => p.link)) aviso('input.piezas.sin-links', 'Ninguna pieza tiene link: el mail no va a tener clicks.');
  if (input.urlImagenes && !/^https:\/\/.+\/$/.test(input.urlImagenes)) err('input.urlImagenes', '"urlImagenes" tiene que ser https:// y terminar en /.');

  // Links
  for (const l of input.links ?? []) {
    if (!l.buscar || !l.url) err('input.links', 'Cada link necesita "buscar" y "url".');
    else if (!/^https:\/\//.test(l.url)) aviso('input.links.https', `El link no es https: ${l.url}`);
  }
  return h;
}
