class Cuenta {
    // Atributos de modelo para el inicio de sesión
    constructor() {
        this.idUsuario = "";
        this.nombre = "";
        this.apellidoPat = "";
        this.apellidoMat = "";
        this.correo = "";
        this.id_area = "";
        this.id_sucursal = "";
        this.id_rol = "";
    }

    // =========================================================================
    //                     INICIALIZACIONES DEL MODULO
    // =========================================================================

    async init() {

        // Carga de catalogos
        await this.cargarAreas();
        await this.cargarSucursales();
        await this.cargarRoles();


        // Cargar información del usuario
        await this.obtenerDatosCuenta();

        // Evento del botón Guardar
        $('#btnGuardar').on('click', ValidacionFormularios);
    }

    // =========================================================================
    //                               METODOS
    // =========================================================================
    // Cargar catálogo de áreas
    async cargarAreas() {
        try {
            Loading();
            const response = await $.ajax({
                url: $(".main-content-cuenta").attr("ObtenerAreas"),
                type: 'GET',
                dataType: 'JSON'
            });

            if (response.Status == "OK") {

                const select = $('#area');

                select.empty();
                select.append('<option value="" selected disabled>Selecciona el área</option>');

                response.Data.forEach(area => {
                    select.append(
                        $('<option>', {
                            value: area.id_area,
                            text: area.area
                        })
                    );
                });

            } else {
                Alerts.error(response.Message, "Error al cargar áreas");
            }

        } catch (error) {

            console.error("Error al cargar áreas:", error);

            let mensaje = error.responseJSON?.Message
                || error.responseJSON?.ExceptionMessage;

            if (!mensaje && error.responseText) {
                const documento = new DOMParser().parseFromString(error.responseText, "text/html");
                mensaje = documento.title || error.responseText;
            }

            Alerts.error(
                mensaje || error.message || "No se recibió el detalle del error.",
                "Error al cargar áreas"
            );
        } finally {
            StopLoading();
        }
    }

    // Cargar catálogo de sucursales
    async cargarSucursales() {
        try {
            Loading();
            const response = await $.ajax({
                url: $(".main-content-cuenta").attr("ObtenerSucursales"),
                type: 'GET',
                dataType: 'JSON'
            });

            if (response.Status == "OK") {

                const select = $('#sucursal');

                select.empty();
                select.append('<option value="" selected disabled>Selecciona una sucursal</option>');

                response.Data.forEach(sucursal => {
                    select.append(
                        $('<option>', {
                            value: sucursal.id_sucursal,
                            text: sucursal.sucursal + " - " + sucursal.abreviatura_estado
                        })
                    );
                });

            } else {
                Alerts.error(response.Message, "Error al cargar sucursales");
            }

        } catch (error) {

            console.error("Error al cargar sucursales:", error);

            let mensaje = error.responseJSON?.Message
                || error.responseJSON?.ExceptionMessage;

            if (!mensaje && error.responseText) {
                const documento = new DOMParser().parseFromString(error.responseText, "text/html");
                mensaje = documento.title || error.responseText;
            }

            Alerts.error(
                mensaje || error.message || "No se recibió el detalle del error.",
                "Error al cargar sucursales"
            );
        } finally {
            StopLoading();
        } 
    }

    // Cargar catálogo de sucursales
    async cargarRoles() {
        try {
            Loading();
            const response = await $.ajax({
                url: $(".main-content-cuenta").attr("ObtenerRol"),
                type: 'GET',
                dataType: 'JSON'
            });

            if (response.Status == "OK") {

                const select = $('#rol');

                select.empty();
                select.append('<option value="" selected disabled>Seleccione un rol</option>');

                response.Data.forEach(rol => {
                    select.append(
                        $('<option>', {
                            value: rol.id_rol,
                            text: rol.rol
                        })
                    );
                });

            } else {
                Alerts.error(response.Message, "Error al cargar roles");
            }

        } catch (error) {

            console.error("Error al cargar roles:", error);

            let mensaje = error.responseJSON?.Message
                || error.responseJSON?.ExceptionMessage;

            if (!mensaje && error.responseText) {
                const documento = new DOMParser().parseFromString(error.responseText, "text/html");
                mensaje = documento.title || error.responseText;
            }

            Alerts.error(
                mensaje || error.message || "No se recibió el detalle del error.",
                "Error al cargar roles"
            );
        } finally {
            StopLoading();
        }
    }

    // Actualizar información de la cuenta
    async actualizarInfoCuenta() {
        try {
            Loading();

            // Crear objeto con la información del usuario, la informacion la guardan las variables en el constructor de la clase
            const usuario = {
                Nombre: this.nombre,
                Apellido_Paterno: this.apellidoPat,
                Apellido_Materno: this.apellidoMat,
                Id_Area: this.id_area,
                Id_Sucursal: this.id_sucursal,
                Id_Rol: this.id_rol
            };


            const response = await $.ajax({
                url: $(".main-content-cuenta").attr("ActualizarInfoUsuario"),
                type: 'POST',
                dataType: 'JSON',
                data: usuario
            });

            if (response.Status == "OK") {
                const usuario = response.Data;

                // Actualizar formulario
                $('#nombre').val(usuario.Nombre);
                $('#apellidoPat').val(usuario.Apellido_Paterno);
                $('#apellidoMat').val(usuario.Apellido_Materno);
                $('#correo').val(usuario.Correo);
                $('#area').val(usuario.Id_Area);
                $('#sucursal').val(usuario.Id_Sucursal);
                $('#rol').val(usuario.Id_Rol);

                
                // Actualizar nombre del menú principa
                $('.js-acc-btn').text(
                    `${usuario.Nombre} ${usuario.Apellido_Paterno}`
                );

                // Actualizar nombre del menú desplegable
                $('.info .name a').text(
                    `${usuario.Nombre} ${usuario.Apellido_Paterno} ${usuario.Apellido_Materno}`
                );

                Alerts.success("", "Información actualizada correctamente.");               

            } else {

                Alerts.error(response.Message, "Actualización incorrecta");
            }

        } catch (error) {
            console.error("Error completo:", error);

            const mensaje = error.responseJSON?.Message
                || error.responseJSON?.ExceptionMessage
                || (error.responseText?.includes("<html")
                    ? new DOMParser().parseFromString(error.responseText, "text/html").title
                    : error.responseText)
                || `Error HTTP ${error.status}: ${error.statusText}`;

            Alerts.error(mensaje, "Error al actualizar la cuenta");

        } finally {
            StopLoading();
        }
    }

    // Obtener información del usuario autenticado
    async obtenerDatosCuenta() {
        try {
            Loading();
            const response = await $.ajax({
                url: $("body").attr("obtenerDatosCuenta"),
                type: 'GET',
                dataType: 'JSON'
            });

            if (response.Status == "OK") {

                const usuario = response.Data;

                // Guardar ID del usuario
                this.idUsuario = usuario.id_usuario;

                // Llenar formulario
                $('#nombre').val(usuario.nombre);
                $('#apellidoPat').val(usuario.apellido_paterno);
                $('#apellidoMat').val(usuario.apellido_materno);
                $('#correo').val(usuario.correo);
                $('#area').val(usuario.id_area);
                $('#sucursal').val(usuario.id_sucursal);
                $('#rol').val(usuario.id_rol);

            } else {

                console.error("Error del servidor:", response.Message);
                Alerts.error(response.Message, "Consulta de datos incorrecta");

            }

        } catch (error) {

            console.error("Error AJAX:", error);

            let mensajeError = error.responseJSON?.Message
                || error.responseJSON?.ExceptionMessage
                || error.message;

            // Si ASP.NET devuelve una página HTML de error
            if (!mensajeError && error.responseText) {
                const documento = new DOMParser().parseFromString(
                    error.responseText,
                    "text/html"
                );

                mensajeError = documento.title || error.responseText;
            }

            Alerts.error(
                mensajeError || "No se recibió el detalle del error.",
                "Consulta de datos incorrecta"
            );


        } finally {
            StopLoading();
        }
    }
}

// Instancia de clase
const cuentaCs = new Cuenta();

// =========================================================================
//                               FUNCIONES
// =========================================================================

//Validacion del formulario para actualizacion de la informacion de la cuenta
function ValidacionFormularios() {

    const formulario = $('#formInfoCuenta');

    // Añadir clase para activar los estilos
    formulario.addClass('was-validated');

    // Validar formulario
    if (!formulario.get(0).checkValidity()) {
        return;
    }

    // Capturar información del usuario
    cuentaCs.nombre = $('#nombre').val();
    cuentaCs.apellidoPat = $('#apellidoPat').val();
    cuentaCs.apellidoMat = $('#apellidoMat').val();
    cuentaCs.id_area = $('#area').val();
    cuentaCs.id_sucursal = $('#sucursal').val();
    cuentaCs.id_rol = $('#rol').val();

    // Obtener URL
    cuentaCs.action = formulario.attr('action');

    // Ejecutar método para actualizar la información de la cuenta
    cuentaCs.actualizarInfoCuenta();
}


// Cuando el documento se encuentra listo
$(document).ready(function () {
    //Inicializa los eventos
    cuentaCs.init();
        
});
