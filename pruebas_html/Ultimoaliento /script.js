document.addEventListener("DOMContentLoaded", function () {
    const tipoJugador = document.getElementById("tipo");
    const streamerField = document.getElementById("streamer-field");
    const streamLink = document.getElementById("stream-link");

    const form = document.getElementById("join-form");
    const formMessage = document.getElementById("form-message");

    function actualizarFormulario() {
        const esStreamer = tipoJugador.value === "streamer";

        streamerField.hidden = !esStreamer;
        streamLink.required = esStreamer;

        if (!esStreamer) {
            streamLink.value = "";
        }
    }

    tipoJugador.addEventListener("change", actualizarFormulario);

    actualizarFormulario();

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        formMessage.textContent =
            "El formulario está validado en tu navegador, pero todavía no está conectado a un sistema de envío. Tu solicitud NO se ha enviado.";
        formMessage.style.color = "#e07870";
    });
});

import { createClient } from
    'https://esm.sh/@supabase/supabase-js@2';

// 1. Configuración de Supabase
const SUPABASE_URL = 'https://zmnttmbjusswemgfmqqf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_kwfgiECZEPcvpBr2qeLzkA_9TXMaHF4';

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// 2. Elementos del formulario
const form = document.getElementById('join-form');
const tipo = document.getElementById('tipo');
const streamerField = document.getElementById('streamer-field');
const streamLink = document.getElementById('stream-link');
const mensaje = document.getElementById('form-message');
const boton = form.querySelector('[type="submit"]');

// 3. Mostrar el campo de canal solo para streamers
function actualizarPerfil() {
    const esStreamer = tipo.value === 'streamer';

    streamerField.hidden = !esStreamer;
    streamLink.required = esStreamer;

    if (!esStreamer) {
        streamLink.value = '';
    }
}

tipo.addEventListener('change', actualizarPerfil);
actualizarPerfil();

// 4. Guardar los datos al enviar
form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const datos = {
        minecraft: document.getElementById('minecraft').value.trim(),
        discord: document.getElementById('discord').value.trim(),
        tipo: tipo.value,
        stream_link: tipo.value === 'streamer'
            ? streamLink.value.trim()
            : null,
        premium: document.getElementById('premium').value,
        confirmacion: form.querySelector(
            '[name="confirmacion"]'
        ).checked
    };

    boton.disabled = true;
    mensaje.textContent = 'Enviando solicitud...';

    try {
        const { error } = await supabase
            .from('solicitudes_minecraft')
            .insert([datos]);

        if (error) throw error;

        mensaje.textContent =
            '¡Solicitud enviada correctamente!';

        form.reset();
        actualizarPerfil();

    } catch (error) {
        console.error('Error de Supabase:', error);

        mensaje.textContent =
            'No se pudo enviar la solicitud. Inténtalo de nuevo.';
    } finally {
        boton.disabled = false;
    }
});
