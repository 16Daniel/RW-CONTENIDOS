
namespace DigitalSignagePWeb.Models
{
    /// <summary>
    /// Representa el resultado devuelto por el procedimiento
    /// almacenado de registro de solicitudes de vinculación.
    /// </summary>
    public class PlayerSolicitudVinculacionResultado
    {
        public bool Status { get; set; }

        public int Codigo { get; set; }

        public long? IdSolicitudVinculacion { get; set; }

        public int? IdPlayer { get; set; }

        public string Message { get; set; }
    }
}
