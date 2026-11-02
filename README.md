# NAILO RECARGAS

Tienda estática de diamantes de Free Fire, hecha con HTML, CSS y JavaScript puro. Sin compilación, backend, base de datos, pasarela de pagos ni dependencias de producción.

## Configurar el comercio

Edita únicamente los datos públicos en `config.js`:

- `nequiNumber`: número colombiano real de Nequi de 10 dígitos, comenzando por 3.
- `whatsappNumber`: número colombiano de WhatsApp, con prefijo `57` y sin `+`, espacios ni símbolos (12 dígitos).
- `paymentHolder`: nombre público del titular para verificar el destinatario.

Se dejan vacíos deliberadamente. Hasta configurar los tres correctamente, no se genera ningún enlace de pedido ni se muestran datos de pago. No pongas claves ni credenciales en el repositorio: todos estos archivos son públicos. Confirma que los números y el titular son correctos antes de compartir la tienda.

Los paquetes y precios se presentan en `index.html` y se validan contra la tabla `prices` de `app.js`; actualiza ambos si cambias el catálogo.

## Desarrollo local

Desde la raíz del repositorio:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Abre el servidor local en el navegador. No es necesario instalar paquetes para ejecutar la tienda. Los recursos son locales: no hay fuentes, rastreadores ni scripts de terceros. Utiliza la copia existente del repositorio; cada tarea en la nube ya está aislada y no necesita otro worktree.

## Publicar en Netlify desde GitHub

1. Revisa `main` y configura los datos públicos antes de cualquier publicación.
2. En Netlify, importa el repositorio desde GitHub y elige la rama que quieras publicar.
3. Deja el comando de compilación vacío y usa `.` como directorio de publicación. `netlify.toml` ya declara ese directorio y las cabeceras.
4. Despliega y verifica que el dominio tenga certificado HTTPS activo. Para un dominio propio, configura DNS y espera la emisión del certificado en Netlify. No incluyas subdominios sin HTTPS porque HSTS aplica también a ellos.
5. Comprueba en el despliegue el catálogo, la versión móvil, los datos del destinatario y el mensaje de WhatsApp. El enlace abre una conversación; el cliente aún debe pulsar **enviar**.
6. Inspecciona la respuesta del dominio publicado (por ejemplo, `curl -I https://TU-DOMINIO`) para comprobar CSP, HSTS, `nosniff` y demás cabeceras; prueba también que HTTP redirige a HTTPS. La configuración local no acredita un despliegue real.

No se ha publicado ni enviado ningún pedido automáticamente. Netlify sirve contenido estático; no habilites Netlify Forms para este formulario.

## Flujo y seguridad

El cliente selecciona un paquete, introduce nombre e ID (6–15 dígitos) y acepta la entrega manual. Se valida al enviar; el resumen usa `textContent` y el mensaje se codifica con `encodeURIComponent`. No se usa `innerHTML`, almacenamiento local, cookies, analítica ni solicitudes de red desde JavaScript. Cualquier modificación invalida el pedido preparado. No se solicita la contraseña del juego.

Los datos permanecen en memoria hasta abandonar la página. Al abrir WhatsApp, nombre e ID forman parte de la URL del mensaje y se comparten con WhatsApp; pueden permanecer en su historial y quedan sujetos a sus políticas. La página no registra pedidos, reserva inventario, demuestra la existencia de una cuenta ni autentica pagos. La validación cliente sirve para evitar errores de entrada, no como control de autorización.

**Antes de transferir**, el cliente debe confirmar disponibilidad, destinatario y tiempo de entrega con la tienda. **Antes de recargar**, el operador debe comprobar directamente en su cuenta de Nequi que el dinero se recibió por el importe correcto. Una captura, un comprobante o este mensaje nunca bastan para acreditar el pago. No hay pagos automáticos ni promesas de entrega inmediata.

La CSP de Netlify solo permite scripts, estilos e imágenes locales, impide conexiones de scripts, formularios nativos, marcos y plugins. La navegación explícita a `https://wa.me/` sigue permitida. No agregues código inline o servicios externos sin revisar la política. El HTTPS efectivo y las cabeceras deben comprobarse tras desplegar.

## Validación automatizada

Se incluye `tests/store.spec.cjs`, que usa Playwright como herramienta de desarrollo, fuera de la aplicación. Con Playwright y Chromium disponibles, inicia el servidor anterior y ejecuta:

```sh
node tests/store.spec.cjs
```

Si no tienes Playwright, instálalo en un directorio de herramientas externo al repositorio y expón su `node_modules` con `NODE_PATH`. El ejecutable Chromium se puede indicar con `CHROMIUM_PATH` (por defecto `/usr/bin/chromium`). La prueba verifica precios, configuración vacía, validación, preparación e invalidación de pedidos, contenido del enlace, intento de XSS, ausencia de almacenamiento, CSP y adaptación móvil. Utiliza datos ficticios interceptados solo dentro del navegador de prueba y no envía mensajes ni pagos.

## Protecciones y límites

El bloque de pedido no es un formulario HTML nativo: no puede enviar los datos por GET o POST, incluso si el servidor no añade CSP. Los campos y el botón comienzan deshabilitados y solo se habilitan al terminar la inicialización. Enter permite preparar la solicitud una vez inicializada. Una CSP en el HTML añade protección en alojamientos que no leen `netlify.toml`; `frame-ancestors`, HSTS, `nosniff` y otras cabeceras siguen requiriendo configuración del servidor. No se ha verificado ni publicado un despliegue.

WhatsApp permite editar cualquier mensaje. No existe una firma ni una orden autenticada en esta aplicación estática. El texto solo solicita una cotización: el operador debe consultar un catálogo independiente y vigente, confirmar paquete e ID y verificar directamente en Nequi destinatario e importe recibido. Nunca entregar basándose únicamente en el texto, enlace o comprobante del cliente. Impedir la manipulación exigiría un backend con órdenes verificables y validación del lado servidor.

Las pruebas usan el sandbox de Chromium de forma predeterminada. Solo si el entorno no soporta el sandbox, en una máquina de pruebas aislada y con contenido de confianza, ejecutar `CHROMIUM_NO_SANDBOX=1 node tests/store.spec.cjs`. Playwright es una dependencia de desarrollo externa; no se publica como parte de la aplicación.
