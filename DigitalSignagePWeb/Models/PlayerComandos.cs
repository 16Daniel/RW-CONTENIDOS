using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace DigitalSignagePWeb.Models
{
    /// <summary>
    /// Representa un comando pendiente asignado a un Player.
    /// </summary>
    public class PlayerComandoPendiente
    {
        public int id_comando_player { get; set; }

        public string codigo_tipo_comando { get; set; }

        public string fecha_solicitud_utc { get; set; }

        public string fecha_expiracion_utc { get; set; }
    }

    /// <summary>
    /// Representa la solicitud para iniciar un comando asignado al Player.
    /// </summary>
    public class PlayerComandoIniciarRequest
    {
        public int id_comando_player { get; set; }
    }

    /// <summary>
    /// Representa el resultado de una operación sobre
    /// un comando asignado a un Player.
    /// </summary>
    public class PlayerComandoResultado
    {
        public string Status { get; set; }

        public string Message { get; set; }
    }

    /// <summary>
    /// Datos enviados por el agente al finalizar un comando.
    /// </summary>
    public class PlayerComandoFinalizarRequest
    {
        public int id_comando_player { get; set; }

        public string codigo_resultado { get; set; }

        public string mensaje_resultado { get; set; }
    }

    /// <summary>
    /// Resultado de la finalización de un comando.
    /// </summary>
    public class PlayerComandoFinalizarResultado : PlayerComandoResultado
    {
        public int id_comando_player { get; set; }

        public int id_player { get; set; }

        public string codigo_resultado { get; set; }
    }

    /// <summary>
    /// Resultado de la creación de una solicitud de comandos.
    /// </summary>
    public class PlayerComandoCreadoResultado
    {
        public string Status { get; set; }

        public int id_comando_player { get; set; }

        public int total_players { get; set; }
    }

    /// <summary>
    /// Progreso acumulado de una solicitud de comandos.
    /// </summary>
    public class PlayerComandoProgreso
    {
        public int id_comando_player { get; set; }

        public string codigo_tipo_comando { get; set; }

        public string estatus_general { get; set; }

        public string fecha_solicitud_utc { get; set; }

        public string fecha_expiracion_utc { get; set; }

        public int total_players { get; set; }

        public int pendientes { get; set; }

        public int en_proceso { get; set; }

        public int completados { get; set; }

        public int errores { get; set; }

        public int expirados { get; set; }

        public int finalizados { get; set; }
    }





}