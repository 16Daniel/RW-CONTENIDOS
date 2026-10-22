class LoginAccess {
    // Atributos de modelo para el inicio de sesión
    constructor() {
        // +atrubuto para el correo
        this.email = "";
        // +atrubuto para la contraseña
        this.password = "";
        // + atributo que indica cual es el endpoint de consulta
        this.urlaction = "";
        // + atributo que indica cual es el endpoint de redireccionamiento
        this.urldestino = "";
        // + atributo para guardar el response
        this.dataresponse = "";
    }

    // Método para validar el usuario
    async validarUsuario() {
        try {
            Loading();
            const response = await $.ajax({
                url: this.urlaction,
                type: 'POST',
                dataType: 'JSON',
                data: {
                    email: this.email,     // Usar el email del atributo de la clase
                    password: this.password // Usar el password del atributo de la clase
                }
            });

            // Evalua la respuesta si existe el usuario
            if (response.Status == "OK") {
                this.dataresponse = JSON.parse(response.Data);
               
                Alerts.success(response.Message, "Inicio de sesión exitoso");
                setTimeout(() => window.location.href = response.ExtraData, 2000);
                StopLoading();
            }
            else {
               
                Alerts.error(response.Message, "Inicio de sesión incorrecto");
                StopLoading();
            }

        } catch (error) {
            const errorMessage = error.responseJSON ? error.responseJSON.message : "Ocurrió un error al procesar la solicitud.";
        
            Alerts.error(errorMessage, "Inicio de sesión");

            StopLoading();
        }
    }
   
}

// Instancia de clase
const loginAccessCs = new LoginAccess();

// Función para manejar el envío del formulario
function ValidacionFormularios(event) {
    // Validar el formulario
    if (this.checkValidity() === false) {
        event.preventDefault();
        event.stopPropagation();
    } else {
        event.preventDefault();
        event.stopPropagation();

        // Obtener valores del formulario y asignarlos a los atributos de la clase
        loginAccessCs.email = $('#email').val(); // Asignar a atributo
        loginAccessCs.password = $('#password').val(); // Asignar a atributo
        loginAccessCs.urlaction = $(event.currentTarget).attr("action"); // Asignar a atributo
        loginAccessCs.urldestino = $(event.currentTarget).attr("redirect"); // Asignar a atributo

        // Llamar al método validarUsuario
        loginAccessCs.validarUsuario();
    }

    // Añadir la clase 'was-validated' para activar los estilos de validación
    $(this).addClass('was-validated');
}


// Cuando el documento se encuentra listo
$(document).ready(function () {
    
    $(document).on('submit', '.needs-validation', ValidacionFormularios);
});
