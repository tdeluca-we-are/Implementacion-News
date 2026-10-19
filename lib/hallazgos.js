// Generado desde src/hallazgos.ts por scripts/build-web.mjs. No editar a mano.
// Formato común de todo lo que reportan los validadores.

                                                   

                           
                 
                       
                  
                 
                                                   
                    
 

export function hayErrores(hallazgos            )          {
  return hallazgos.some((h) => h.severidad === 'error');
}

const ORDEN                            = { error: 0, aviso: 1, info: 2 };

export function ordenar(hallazgos            )             {
  return [...hallazgos].sort((a, b) => ORDEN[a.severidad] - ORDEN[b.severidad] || (a.linea ?? 0) - (b.linea ?? 0));
}
