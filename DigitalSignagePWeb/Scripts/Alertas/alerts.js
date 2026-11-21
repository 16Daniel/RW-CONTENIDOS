// ---------- Animaciones propias ----------
(function () {
    const style = document.createElement("style");
    style.textContent = `
        @keyframes app-swal-in {
            0%   { opacity: 0; transform: translateY(40px) scale(.92); filter: blur(4px); }
            60%  { opacity: 1; filter: blur(0); }
            100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes app-swal-out {
            0%   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
            100% { opacity: 0; transform: translateY(-24px) scale(.95); filter: blur(3px); }
        }
        .app-swal-in  { animation: app-swal-in  .65s cubic-bezier(.16, 1, .3, 1) both; }
        .app-swal-out { animation: app-swal-out .4s  cubic-bezier(.4, 0, .2, 1)  both; }

        .swal2-container:not(.swal2-container--toast) {
            backdrop-filter: blur(4px);
            transition: backdrop-filter .4s ease;
        }
        .swal2-popup { border-radius: 16px; box-shadow: 0 20px 50px rgba(0, 0, 0, .25); }
    `;
    document.head.appendChild(style);
})();

// ---------- Configuración base ----------
const Modal = Swal.mixin({
    confirmButtonColor: "#B01830",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Aceptar"
});

// ---------- API ----------
const Alerts = {
    error(message, title = "Error") {
        return Modal.fire({ icon: "error", title, text: message });
    },
    obtenerMensajeError(error) {

        if (error.responseJSON?.Message || error.responseJSON?.message) {
            return error.responseJSON.Message || error.responseJSON.message;
        }

        if (error instanceof Error) {
            return error.message;
        }

        if (error.responseText) {

            const respuesta = error.responseText.trim();

            if (respuesta.startsWith('<')) {
                return `El servidor devolvió HTML en lugar de JSON. HTTP ${error.status}. Verifica la URL del servicio, la sesión y la respuesta del controlador.`;
            }

            return respuesta.length > 500
                ? respuesta.substring(0, 500) + '...'
                : respuesta;
        }

        if (error.status === 0) {
            return 'No se pudo establecer conexión con el servidor.';
        }

        return `Error HTTP ${error.status || 'desconocido'}: ${error.statusText || 'Sin descripción'}.`;
    },
    warning(message, title = "Aviso") {
        return Modal.fire({ icon: "warning", title, text: message });
    },
    success(message, title = "Listo") {
        return Modal.fire({ icon: "success", title, text: message, timer: 2000, showConfirmButton: false });
    },
    info(message, title = "Información") {
        return Modal.fire({icon: "info", title, text: message, timer: 3000, showConfirmButton: false
        });
    },

    toast(message, title = "Notificación", icon = "success") {
        return Swal.fire({
            toast: true,
            position: "top-end",
            icon: icon,
            title: title,
            text: message,
            showConfirmButton: false,
            timer: 4000,
            timerProgressBar: true,
            width: 340,
            padding: "12px",
            background: "#ffffff",
            showClass: {
                popup: "swal2-show"
            },
            hideClass: {
                popup: "swal2-hide"
            },
            didOpen: (toast) => {
                toast.addEventListener("mouseenter", Swal.stopTimer);
                toast.addEventListener("mouseleave", Swal.resumeTimer);
            }
        });
    },

    async confirm(message, title = "¿Estás seguro?", confirmText = "Confirmar", permitirHTML = false) {
        const r = await Modal.fire({
            icon: "question",
            title,
            ...(permitirHTML ? { html: message } : { text: message }),
            showCancelButton: true,
            confirmButtonText: confirmText,
            cancelButtonText: "Cancelar",

            buttonsStyling: false,
            customClass: {
                confirmButton: "m-btn m-btn--primary",
                cancelButton: "m-btn m-btn--outline",
                actions: "gap-2"
            }
        });

        return r.isConfirmed;
    }


};

