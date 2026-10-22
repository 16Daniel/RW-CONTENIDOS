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

        .swal2-container { backdrop-filter: blur(4px); transition: backdrop-filter .4s ease; }
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
    warning(message, title = "Aviso") {
        return Modal.fire({ icon: "warning", title, text: message });
    },
    success(message, title = "Listo") {
        return Modal.fire({ icon: "success", title, text: message, timer: 2000, showConfirmButton: false });
    },
    async confirm(message, title = "¿Estás seguro?") {
        const r = await Modal.fire({
            icon: "question", title, text: message,
            showCancelButton: true, confirmButtonText: "Sí", cancelButtonText: "Cancelar"
        });
        return r.isConfirmed;
    }
};