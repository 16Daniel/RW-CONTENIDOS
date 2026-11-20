using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace DigitalSignagePWeb.Models
{
    /// <summary>
    /// Representa la versión de configuración aplicada por el Player.
    /// </summary>
    public class ConfiguracionPlayerConfirmarRequest
    {
        public int version_aplicada { get; set; }
    }
}