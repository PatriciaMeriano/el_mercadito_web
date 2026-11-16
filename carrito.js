/* Carrito de El Mercadito
   Uso: agregar carrito.css y carrito.js en cada página y poner
   botones con la clase "btn-agregar" y los atributos data-id y data-nombre.
   data-precio es opcional: sin precio, el producto figura "A consultar".
   Al hacer el pedido se piden nombre, forma de entrega, dirección (si es envío) y
   medio de pago, y se arma el mensaje de WhatsApp con el carrito y esos datos. */

(function () {
  // Número de WhatsApp con código de país, sin + ni espacios (ej: 5493442123456).
  // Si queda vacío, no aparece el botón de enviar pedido.
  const WHATSAPP = "5493442311926";
  // Medios de pago que aparecen en la pantalla de datos. Editá esta lista a gusto.
  const MEDIOS_DE_PAGO = ["Efectivo", "Transferencia", "Tarjeta de débito"];
  // Medios de pago que solo se ofrecen cuando el cliente retira en el local
  const PAGO_SOLO_EN_LOCAL = ["Tarjeta de débito"];
  const CLAVE = "mercadito_carrito";

  let items = cargar();

  function cargar() {
    try {
      return JSON.parse(localStorage.getItem(CLAVE)) || [];
    } catch (e) {
      return [];
    }
  }

  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(items));
    } catch (e) {}
  }

  function formatoPrecio(n) {
    return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  // Los productos sin precio (precio null) no suman al total
  function total() {
    return items.reduce((s, i) => s + (i.precio ? i.precio * i.cantidad : 0), 0);
  }

  function hayAConsultar() {
    return items.some((i) => !i.precio);
  }

  function textoTotal() {
    const t = total();
    if (!t) return "A consultar";
    return formatoPrecio(t) + (hayAConsultar() ? " + productos a consultar" : "");
  }

  function cantidadTotal() {
    return items.reduce((s, i) => s + i.cantidad, 0);
  }

  function agregar(producto) {
    const existente = items.find((i) => i.id === producto.id);
    if (existente) existente.cantidad += 1;
    else items.push({ ...producto, cantidad: 1 });
    guardar();
    render();
  }

  function cambiarCantidad(id, delta) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    item.cantidad += delta;
    if (item.cantidad <= 0) items = items.filter((i) => i.id !== id);
    guardar();
    render();
  }

  function quitar(id) {
    items = items.filter((i) => i.id !== id);
    guardar();
    render();
  }

  function vaciar() {
    items = [];
    guardar();
    render();
  }

  function textoPedido(datos) {
    const lineas = items.map(
      (i) => `• ${i.cantidad} x ${i.nombre}` + (i.precio ? ` (${formatoPrecio(i.precio * i.cantidad)})` : "")
    );
    const pie = total() ? `\n\nTotal: ${textoTotal()}` : "";
    let cliente = `\n\nNombre: ${datos.nombre}`;
    cliente += `\nEntrega: ${datos.entrega === "envio" ? "Envío a domicilio" : "Retiro en el local"}`;
    if (datos.entrega === "envio") cliente += `\nDirección: ${datos.direccion}`;
    cliente += `\nPago: ${datos.pago}`;
    if (datos.notas) cliente += `\nObservaciones: ${datos.notas}`;
    return `Hola! Quiero hacer este pedido:\n${lineas.join("\n")}${pie}${cliente}`;
  }

  function escapar(texto) {
    const d = document.createElement("div");
    d.textContent = texto;
    return d.innerHTML;
  }

  // ---------- Interfaz ----------
  let boton, panel, fondo, lista, totalEl, contador, form, pie, titulo;

  function crearInterfaz() {
    boton = document.createElement("button");
    boton.className = "carrito-boton";
    boton.type = "button";
    boton.setAttribute("aria-label", "Abrir carrito");
    boton.innerHTML = 'Carrito <span class="carrito-contador">0</span>';

    fondo = document.createElement("div");
    fondo.className = "carrito-fondo";

    panel = document.createElement("aside");
    panel.className = "carrito-panel";
    panel.setAttribute("aria-label", "Carrito de compras");
    panel.innerHTML = `
      <div class="carrito-cabecera">
        <h2 class="carrito-titulo">Tu pedido</h2>
        <button type="button" class="carrito-cerrar" aria-label="Cerrar carrito">&times;</button>
      </div>
      <ul class="carrito-lista"></ul>
      <div class="carrito-pie">
        <p class="carrito-total">Total: <strong>$0</strong></p>
        <button type="button" class="carrito-vaciar">Vaciar carrito</button>
        ${WHATSAPP ? '<button type="button" class="carrito-enviar">Hacer pedido</button>' : ""}
      </div>
      ${WHATSAPP ? `
      <form class="carrito-datos" hidden novalidate>
        <label>Nombre
          <input type="text" name="nombre" autocomplete="name" required>
        </label>
        <fieldset>
          <legend>¿Cómo lo recibís?</legend>
          <label class="carrito-opcion"><input type="radio" name="entrega" value="retiro" checked> Retiro en el local</label>
          <label class="carrito-opcion"><input type="radio" name="entrega" value="envio"> Envío a domicilio</label>
        </fieldset>
        <label class="carrito-campo-direccion" hidden>Dirección
          <input type="text" name="direccion" autocomplete="street-address">
        </label>
        <label>Medio de pago
          <select name="pago" required>
            <option value="">Elegí una opción</option>
          </select>
          <small class="carrito-ayuda" hidden>La tarjeta de débito está disponible solo para retiro en el local.</small>
        </label>
        <label>Observaciones (opcional)
          <textarea name="notas" rows="3" placeholder="Ej: marca preferida, horario de entrega"></textarea>
        </label>
        <p class="carrito-error" role="alert"></p>
        <button type="submit" class="carrito-confirmar">Enviar pedido por WhatsApp</button>
        <button type="button" class="carrito-volver">Volver al carrito</button>
      </form>` : ""}`;

    document.body.append(boton, fondo, panel);

    lista = panel.querySelector(".carrito-lista");
    totalEl = panel.querySelector(".carrito-total strong");
    contador = boton.querySelector(".carrito-contador");
    pie = panel.querySelector(".carrito-pie");
    titulo = panel.querySelector(".carrito-titulo");
    form = panel.querySelector(".carrito-datos");

    boton.addEventListener("click", abrir);
    fondo.addEventListener("click", cerrar);
    panel.querySelector(".carrito-cerrar").addEventListener("click", cerrar);
    panel.querySelector(".carrito-vaciar").addEventListener("click", vaciar);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") cerrar();
    });

    const enviar = panel.querySelector(".carrito-enviar");
    if (enviar && form) {
      enviar.addEventListener("click", () => {
        if (items.length) mostrarFormulario();
      });
      panel.querySelector(".carrito-volver").addEventListener("click", mostrarCarrito);
      form.addEventListener("change", (e) => {
        if (e.target.name === "entrega") actualizarEntrega();
      });
      form.addEventListener("submit", enviarPedido);
    }

    lista.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-accion]");
      if (!b) return;
      const id = b.dataset.id;
      if (b.dataset.accion === "mas") cambiarCantidad(id, 1);
      if (b.dataset.accion === "menos") cambiarCantidad(id, -1);
      if (b.dataset.accion === "quitar") quitar(id);
    });
  }

  function abrir() {
    mostrarCarrito();
    panel.classList.add("abierto");
    fondo.classList.add("abierto");
  }

  function cerrar() {
    panel.classList.remove("abierto");
    fondo.classList.remove("abierto");
  }

  // ---------- Pantalla previa al envío ----------
  function mostrarCarrito() {
    if (!form) return;
    form.hidden = true;
    lista.hidden = false;
    pie.hidden = false;
    titulo.textContent = "Tu pedido";
  }

  function mostrarFormulario() {
    lista.hidden = true;
    pie.hidden = true;
    form.hidden = false;
    titulo.textContent = "Tus datos";
    form.querySelector(".carrito-error").textContent = "";
    actualizarEntrega();
    form.elements.nombre.focus();
  }

  function actualizarEntrega() {
    const esEnvio = form.elements.entrega.value === "envio";
    form.querySelector(".carrito-campo-direccion").hidden = !esEnvio;

    // En envío a domicilio se sacan los medios de pago que son solo para el local
    const select = form.elements.pago;
    const elegido = select.value;
    const disponibles = MEDIOS_DE_PAGO.filter((m) => !(esEnvio && PAGO_SOLO_EN_LOCAL.includes(m)));
    select.innerHTML =
      '<option value="">Elegí una opción</option>' +
      disponibles.map((m) => `<option value="${m}">${m}</option>`).join("");
    if (disponibles.includes(elegido)) select.value = elegido;
    form.querySelector(".carrito-ayuda").hidden = !esEnvio;
  }

  function enviarPedido(e) {
    e.preventDefault();
    const error = form.querySelector(".carrito-error");
    const datos = {
      nombre: form.elements.nombre.value.trim(),
      entrega: form.elements.entrega.value,
      direccion: form.elements.direccion.value.trim(),
      pago: form.elements.pago.value,
      notas: form.elements.notas.value.trim(),
    };

    if (!datos.nombre) {
      error.textContent = "Escribí tu nombre para que sepamos a quién entregarle el pedido.";
      form.elements.nombre.focus();
      return;
    }
    if (datos.entrega === "envio" && !datos.direccion) {
      error.textContent = "Escribí la dirección donde querés recibir el pedido.";
      form.elements.direccion.focus();
      return;
    }
    if (!datos.pago) {
      error.textContent = "Elegí cómo vas a pagar.";
      form.elements.pago.focus();
      return;
    }
    if (!items.length) return;

    error.textContent = "";
    const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(textoPedido(datos))}`;
    window.open(url, "_blank", "noopener");
  }

  function render() {
    if (!items.length && form && !form.hidden) mostrarCarrito();
    contador.textContent = cantidadTotal();
    totalEl.textContent = textoTotal();

    if (!items.length) {
      lista.innerHTML = '<li class="carrito-vacio">Todavía no agregaste productos.</li>';
    } else {
      lista.innerHTML = items
        .map(
          (i) => `
        <li class="carrito-item">
          <div class="carrito-item-info">
            <span class="carrito-item-nombre">${escapar(i.nombre)}</span>
            <span class="carrito-item-precio">${i.precio ? formatoPrecio(i.precio * i.cantidad) : "A consultar"}</span>
          </div>
          <div class="carrito-item-controles">
            <button type="button" data-accion="menos" data-id="${escapar(i.id)}" aria-label="Quitar uno">−</button>
            <span>${i.cantidad}</span>
            <button type="button" data-accion="mas" data-id="${escapar(i.id)}" aria-label="Agregar uno">+</button>
            <button type="button" class="carrito-quitar" data-accion="quitar" data-id="${escapar(i.id)}">Quitar</button>
          </div>
        </li>`
        )
        .join("");
    }

    panel.querySelector(".carrito-vaciar").disabled = !items.length;
    const enviar = panel.querySelector(".carrito-enviar");
    if (enviar) enviar.disabled = !items.length;
  }

  // Escucha los clics en cualquier botón "btn-agregar" de la página
  function escucharBotones() {
    document.addEventListener("click", (e) => {
      const b = e.target.closest(".btn-agregar");
      if (!b) return;
      const precio = parseFloat(b.dataset.precio);
      if (!b.dataset.id || !b.dataset.nombre) return;
      // Si no hay data-precio (o no es un número), el producto queda "a consultar"
      agregar({ id: b.dataset.id, nombre: b.dataset.nombre, precio: isNaN(precio) ? null : precio });

      // Confirmación breve en el botón
      const original = b.textContent;
      b.textContent = "Agregado";
      b.disabled = true;
      setTimeout(() => {
        b.textContent = original;
        b.disabled = false;
      }, 800);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    crearInterfaz();
    escucharBotones();
    render();
  });

  // Mantiene sincronizado el carrito si se modifica desde otra pestaña
  window.addEventListener("storage", (e) => {
    if (e.key === CLAVE) {
      items = cargar();
      render();
    }
  });
})();