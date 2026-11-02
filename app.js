'use strict';
(() => {
  const prices = Object.freeze({100: 2300, 310: 6000, 520: 11000, 1060: 20000, 2180: 35000, 5600: 90000});
  const config = window.NAILO_CONFIG || {};
  const nequi = String(config.nequiNumber || '');
  const whatsapp = String(config.whatsappNumber || '');
  const holder = String(config.paymentHolder || '').trim();
  const configured = /^3\d{9}$/.test(nequi) && /^573\d{9}$/.test(whatsapp) && holder.length > 1 && holder.length <= 100;
  const $ = id => document.getElementById(id);
  const form = $('order-form');
  const name = $('customer-name');
  const player = $('player-id');
  const confirmation = $('confirmation');
  const radios = [...document.querySelectorAll('input[name="package"]')];
  const money = value => '$' + new Intl.NumberFormat('es-CO').format(value) + ' COP';
  const quantity = value => new Intl.NumberFormat('es-CO').format(value) + ' diamantes';
  const selected = () => radios.find(radio => radio.checked)?.value;
  function invalidate() {
    $('ready-panel').hidden = true;
    $('whatsapp-link').removeAttribute('href');
    $('ready-details').textContent = '';
  }
  function error(input, id, message) {
    $(id).textContent = message;
    input.setAttribute('aria-invalid', String(Boolean(message)));
    return !message;
  }
  function updatePackage() {
    const pack = selected();
    if (!Object.hasOwn(prices, pack)) return;
    $('summary-diamonds').textContent = quantity(pack);
    $('summary-price').textContent = money(prices[pack]);
    radios.forEach(radio => {
      radio.closest('.package').querySelector('.select-label').firstChild.textContent = radio.checked ? 'Paquete seleccionado ' : 'Seleccionar paquete ';
    });
    invalidate();
  }
  if (configured) {
    $('nequi-details').textContent = 'Número: ' + nequi;
    $('holder-details').textContent = 'Titular: ' + holder;
    $('holder-details').hidden = false;
  } else {
    $('configuration-notice').hidden = false;
    $('configuration-notice').textContent = 'Pedidos temporalmente no disponibles: la tienda aún debe configurar sus datos de Nequi, titular y WhatsApp. Puedes revisar tu selección, pero no enviar pedidos ni realizar pagos.';
  }
  radios.forEach(radio => radio.addEventListener('change', updatePackage));
  form.addEventListener('input', invalidate);
  form.addEventListener('change', invalidate);
  $('prepare-button').addEventListener('click', event => {
    event.preventDefault();
    invalidate();
    const customer = name.value.trim().replace(/\s+/gu, ' ');
    const id = player.value.trim();
    const nameValid = error(name, 'name-error', /^[\p{L}\p{M}][\p{L}\p{M} .’'\-]{1,59}$/u.test(customer) ? '' : 'Escribe un nombre de 2 a 60 caracteres, usando letras, espacios, apóstrofes o guiones.');
    const idValid = error(player, 'id-error', /^\d{6,15}$/.test(id) ? '' : 'Escribe un ID de 6 a 15 dígitos, sin espacios ni símbolos.');
    const confirmed = error(confirmation, 'confirmation-error', confirmation.checked ? '' : 'Confirma que revisaste tu ID y las condiciones de entrega.');
    if (!nameValid || !idValid || !confirmed) {
      (!nameValid ? name : !idValid ? player : confirmation).focus();
      return;
    }
    const pack = selected();
    if (!configured || !Object.hasOwn(prices, pack)) {
      $('configuration-notice').focus();
      return;
    }
    const message = ['Hola, NAILO RECARGAS. Solicito una cotización (no es una orden confirmada):', 'Nombre: ' + customer, 'ID del jugador: ' + id, 'Paquete: ' + quantity(pack), 'Precio orientativo del catálogo: ' + money(prices[pack]), 'Este mensaje es editable y no acredita precio, pago ni entrega. La tienda debe verificar su catálogo vigente y el dinero recibido.', 'Pago manual por Nequi.', 'Entiendo que la entrega es manual y requiere verificar el dinero recibido.', 'Por favor, confirmen disponibilidad, destinatario y tiempo de entrega antes de pagar.'].join('\n');
    $('ready-details').textContent = customer + ' · ID ' + id + ' · ' + quantity(pack) + ' · ' + money(prices[pack]);
    $('whatsapp-link').href = 'https://wa.me/' + whatsapp + '?text=' + encodeURIComponent(message);
    $('ready-panel').hidden = false;
    $('whatsapp-link').focus();
  });
  // Reset transient form data when restoring a page from the back/forward cache.
  window.addEventListener('pageshow', event => { if (event.persisted) { name.value = ''; player.value = ''; confirmation.checked = false; updatePackage(); } });
  updatePackage();
  form.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.target === name || event.target === player)) {
      event.preventDefault();
      $('prepare-button').click();
    }
  });
  form.querySelectorAll('[disabled]').forEach(control => { control.disabled = false; });
})();
