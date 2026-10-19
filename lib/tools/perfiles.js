// Generado desde src/tools/perfiles.ts por scripts/build-web.mjs. No editar a mano.
// Lo que cambia entre herramientas a nivel HTML: link de baja, sintaxis de
// variables y si soportan preheader propio. Todo lo marcado confirmado: false
// es supuesto y hay que validarlo con el proveedor o con una news real (S2).
                                                     

                                    
                  
                 
                                                                                         
                                                                                                       
                                                                                 
                                                                              
                                                                         
                                 
                                                             
                          
                    
 

export const PERFILES                                         = {
  woowup: {
    id: 'woowup',
    nombre: 'WoowUp',
    baja: { patron: null, agregaFooterSola: null, confirmado: false, nota: 'Confirmar si Beefree/WoowUp agrega el footer de baja o hay que incluir un merge tag.' },
    // Motor de templates: Twig en sandbox (docs de WoowUp, "Motor de template de emails"). Nombres de variables sin relevar.
    variables: { patron: '^(\\{\\{[^}]+\\}\\}|\\{%[^%]+%\\})$', ejemplo: '{{ variable | default("") }}', confirmado: true },
    campoPreheader: null,
    pasosManuales: [
      'Campañas → Crear campaña → Campaña única.',
      'Nombre, asunto y segmento (copiar del kit).',
      'Editor: importar HTML (o Empezar desde cero y pegar el HTML en un bloque HTML).',
      'Revisar preheader y remitente.',
      'Enviar prueba a los emails de test del kit.',
      'Esperar aprobación y programar con la fecha y hora del kit.',
    ],
    estadoApi: 'API v3 pública sin endpoints de campañas. Consultado a WoowUp por una credencial para automatizar la carga.',
  },
  icomm: {
    id: 'icomm',
    nombre: 'icomm',
    baja: { patron: null, agregaFooterSola: null, confirmado: false, nota: 'Sin relevar.' },
    variables: { patron: null, confirmado: false },
    campoPreheader: null,
    pasosManuales: ['Crear campaña nueva.', 'Pegar asunto, preheader y remitente del kit.', 'Cargar el HTML.', 'Elegir la lista/segmento del kit.', 'Enviar prueba.', 'Esperar aprobación y programar.'],
    estadoApi: 'Sin documentación pública de campañas. Consultado al proveedor (S0).',
  },
  marketingnube: {
    id: 'marketingnube',
    nombre: 'Tiendanube Marketing Nube',
    baja: { patron: null, agregaFooterSola: null, confirmado: false, nota: 'Sin relevar.' },
    variables: { patron: null, confirmado: false },
    campoPreheader: null,
    pasosManuales: ['Crear campaña de email.', 'Pegar asunto, preheader y remitente del kit.', 'Cargar el HTML.', 'Elegir el segmento del kit.', 'Enviar prueba.', 'Esperar aprobación y programar.'],
    estadoApi: 'Sin documentación pública de campañas. Consultado al proveedor (S0).',
  },
  connectif: {
    id: 'connectif',
    nombre: 'Connectif',
    baja: { patron: null, agregaFooterSola: null, confirmado: false, nota: 'Sin relevar.' },
    variables: { patron: null, confirmado: false },
    campoPreheader: null,
    pasosManuales: ['Crear contenido de email con el HTML.', 'Crear el workflow/campaña con el segmento del kit.', 'Pegar asunto, preheader y remitente.', 'Enviar prueba.', 'Esperar aprobación y programar.'],
    estadoApi: 'Sin documentación pública de campañas. Consultado al proveedor (S0).',
  },
};

/** Sintaxis de variables de otras plataformas: si aparecen, casi seguro se copió de otro lado. */
export const VARIABLES_AJENAS                                       = [
  { nombre: 'Mailchimp', patron: /\*\|[A-Z0-9_:]+\|\*/g },
  { nombre: 'Salesforce (AMPscript)', patron: /%%=?[\w\s().,'"]+=?%%/g },
  { nombre: 'Liquid/Handlebars ({{ }})', patron: /\{\{\s*[\w.]+\s*\}\}/g },
  { nombre: 'Liquid ({% %})', patron: /\{%[^%]+%\}/g },
];
