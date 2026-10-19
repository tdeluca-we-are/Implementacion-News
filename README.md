# Hub de implementación de news

App web para que todo Owned Media cargue, valide, apruebe y registre las news de
cada cliente. Usa el mismo proyecto de Supabase que el semáforo, el calendario y
Briefs (`ojzcxwhoinmljospgmfp`) y las mismas marcas (`sem_marcas`).

- `index.html`: la app (una página, sin build).
- `lib/`: el núcleo de validación y armado, **generado** desde el proyecto `newsletters`
  (carpeta `src/`, en la compu de Tomás) con `npm run build:web`. No editar a mano.
- `hub-schema.sql`: tablas `nws_`, permisos (RLS), reglas del flujo y bucket de imágenes.

## Puesta en marcha (una vez)

1. Supabase → SQL editor → correr `hub-schema.sql` (después del schema del semáforo).
2. Entrar al hub con tu usuario de Supabase. Ya quedás como admin (`tdeluca@we-are.com.ar`).
3. **Clientes**: por cada marca, herramienta, cuenta, remitentes, dominios autenticados,
   segmentos (alias → id de la herramienta), UTM y dominios del sitio.
4. **Accesos**: dar de alta a cada analista con su mail, rol y marcas. La cuenta se
   crea en Supabase → Authentication → Users, igual que en Briefs.

Para probar sin cuenta: "Ver demo con datos de ejemplo" en el login (no guarda nada).

En local (desde el proyecto `newsletters`): `npm run hub` y abrir http://localhost:5175.

## Flujo

```
Borrador ──(sin errores)──▶ Lista para aprobar ──(revisó el test)──▶ Aprobada ──▶ Cargada
    ▲                                                                     │
    └───────────── si cambia el contenido, la aprobación se cae ──────────┘
```

- El analista crea la news, sube las piezas (JPG/PNG, quedan en el bucket público
  `nws-piezas`, así el HTML final ya tiene las imágenes hosteadas) o pega el HTML de Atlas.
- El hub valida en vivo con las mismas reglas de la CLI y muestra la vista previa y los
  datos para pegar.
- Aprobar exige marcar "revisé el test" y queda atado a la huella. La base de datos
  (trigger `nws_news_reglas`) hace cumplir las reglas aunque alguien saltee la pantalla.
- Todo cambio de estado queda en `nws_eventos` (se ve en "Registro").

## Carga automática

Hoy, kit para todos (datos para pegar + HTML). Cuando WoowUp dé una credencial por
cuenta, se suma una función de servidor (Supabase Edge Function) con esa credencial
guardada en el servidor, y se habilita por cliente con "Carga automática por API".
