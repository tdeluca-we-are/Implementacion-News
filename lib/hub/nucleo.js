// Generado desde src/hub/nucleo.ts por scripts/build-web.mjs. No editar a mano.
// Núcleo de la preparación, sin Node: lo usan la CLI (vía preparar.ts) y el hub
// web en el navegador. Resuelve el mapeo del cliente, arma el HTML final
// (links + UTM), valida todo y calcula la huella.
                                                                               
import { hayErrores, ordenar,               } from '../hallazgos.js';
import { aplicarUtm, conUtm, reemplazarLinks, slugCampana,                 } from '../html/links.js';
import { armarHtmlDesdePiezas, medirImagen, revisarPiezas,                  } from '../html/piezas.js';
import { validarHtml,                          } from '../html/validar.js';
                                                                         
import { validarInput } from '../input/validar.js';
import { PERFILES,                        } from '../tools/perfiles.js';
import { sha256 } from './sha256.js';

                                   
               
                         
                         
                            
                       
                     
           
                                                                                      
                   
                       
                    
                                                 
                            
                                                                                   
                              
                             
                                  
                        
                 
                                                                                 
                 
 

                                                     
                                           
                
                                  
              
              
                     
              
 

/** Una imagen ya leída, en el mismo orden que input.piezas. */
                               
                  
                    
                
                                                                              
               
 

                            
                
                          
 

/** Prefijo de src de las imágenes que viajan en el kit hasta que se suban. */
export const CARPETA_PENDIENTES = 'imagenes/';

export function prepararCampana(input                 , clientes          , contenido           , hoy         )                   {
  const hallazgosInput = validarInput(input, clientes, hoy);
  const cliente = clientes[input.cliente];
  if (!cliente || hallazgosInput.some((x) => x.codigo === 'input.falta' || x.codigo === 'input.cliente')) {
    throw new ErrorPreparacion(hallazgosInput);
  }

  const slug = slugCampana(input.nombre, input.envio.fecha);
  const utm      = { source: cliente.utm.source, medium: cliente.utm.medium, campaign: cliente.utm.campaign ?? slug, ...input.utm }       ;
  const extra             = [];

  let htmlOriginal        ;
  let piezas                              ;
  if (input.piezas?.length) {
    const archivos = contenido.piezas ?? [];
    if (archivos.length !== input.piezas.length) throw new ErrorPreparacion([...hallazgosInput, { codigo: 'input.piezas', severidad: 'error', mensaje: `Hay ${input.piezas.length} piezas en el input y ${archivos.length} imágenes cargadas.` }]);
    piezas = input.piezas.map((p, i) => {
      const { archivo, datos, ruta, url } = archivos[i];
      // Sin URL pública se numeran: así dos "banner.jpg" no chocan y el orden se ve en el nombre.
      const numerado = /^\d{1,3}[-_ ]/.test(archivo) ? archivo : `${String(i + 1).padStart(2, '0')}-${archivo}`;
      const src = url ?? (input.urlImagenes ? input.urlImagenes + archivo : CARPETA_PENDIENTES + numerado);
      return {
        numero: i + 1, ruta, archivo, src, alt: p.alt ?? '', bytes: datos.length, medidas: medirImagen(datos),
        linkFinal: p.link ? conUtm(p.link, utm, cliente.dominiosSitio) : undefined,
        sha: sha256(datos).slice(0, 12),
      };
    });
    extra.push(...revisarPiezas(piezas));
    htmlOriginal = armarHtmlDesdePiezas({
      titulo: input.asunto,
      preheader: input.preheader,
      textoPie: input.textoPie,
      filas: piezas.map((p, i) => ({ src: p.src, alt: p.alt, link: input.piezas [i].link })),
    });
  } else {
    if (contenido.html === undefined) throw new ErrorPreparacion([...hallazgosInput, { codigo: 'input.html', severidad: 'error', mensaje: 'Falta el HTML de la pieza.' }]);
    htmlOriginal = contenido.html;
  }
  const imagenesPendientes = !!piezas?.some((p) => p.src.startsWith(CARPETA_PENDIENTES));
  if (imagenesPendientes) extra.push({ codigo: 'piezas.subir', severidad: 'info', mensaje: `Las imágenes se suben a ${PERFILES[cliente.herramienta].nombre} en el orden del kit (o cargar "urlImagenes" para tener el HTML final).` });

  const r1 = reemplazarLinks(htmlOriginal, input.links ?? []);
  for (const l of r1.sinUsar) extra.push({ codigo: 'input.links.sin-usar', severidad: 'aviso', mensaje: `El link "${l.buscar}" del input no aparece en el HTML.` });
  const r2 = aplicarUtm(r1.html, utm, cliente.dominiosSitio);

  const validacion = validarHtml(r2.html, {
    herramienta: cliente.herramienta,
    dominiosSitio: cliente.dominiosSitio,
    exigirUtm: true,
    prefijoImagenesPendientes: imagenesPendientes ? CARPETA_PENDIENTES : undefined,
  });
  const hallazgos = ordenar([...hallazgosInput, ...extra, ...validacion.hallazgos]);

  const remitente = input.remitente ?? cliente.remitentes[0];
  const segmento = cliente.segmentos[input.segmento];
  const envioIso = `${input.envio.fecha}T${input.envio.hora}:00-03:00`;
  const huella = calcularHuella({ asunto: input.asunto, preheader: input.preheader, remitente, segmento: segmento?.id, envioIso, html: r2.html, imagenes: piezas?.map((p) => p.sha) });

  return {
    slug, input, cliente, perfil: PERFILES[cliente.herramienta], remitente, segmento, utm, envioIso,
    htmlOriginal, htmlFinal: r2.html, piezas, imagenesPendientes,
    cambiosLinks: mezclarCambios(r1.cambios, r2.cambios),
    validacion, hallazgos, lista: !hayErrores(hallazgos), huella,
  };
}

export function calcularHuella(contenido                         )         {
  const ordenado = Object.fromEntries(Object.keys(contenido).sort().map((k) => [k, contenido[k]]));
  return sha256(JSON.stringify(ordenado)).slice(0, 16);
}

/** Une "placeholder → url" y "url → url con UTM" en un solo cambio por link. */
function mezclarCambios(a              , b              )               {
  const utm = new Map(b.map((c) => [c.antes, c.despues]));
  const out = a.map((c) => ({ antes: c.antes, despues: utm.get(c.despues) ?? c.despues }));
  const tocados = new Set(a.map((c) => c.despues));
  for (const c of b) if (!tocados.has(c.antes)) out.push({ ...c });
  return out;
}

export class ErrorPreparacion extends Error {
  hallazgos            ;
  constructor(hallazgos            ) {
    super(hallazgos.filter((x) => x.severidad === 'error').map((x) => x.mensaje).join('\n'));
    this.hallazgos = hallazgos;
  }
}
