
namespace DigitalSignagePWeb.Models
{
    /// <summary>
    /// Representa una solicitud de vinculación
    /// enviada por DigitalSignage.Agent.
    /// </summary>
    public class PlayerSolicitudVinculacionRequest
    {
        public string numero_serie { get; set; }

        public string clave_publica { get; set; }
    }
}