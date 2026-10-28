using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace DigitalSignagePWeb.Models
{
    /// <summary>
    /// Representa la identidad de un Player autenticado
    /// mediante un token de acceso válido.
    /// </summary>
    public class PlayerTokenValidado
    {
        /// <summary>
        /// Identificador único del Player registrado.
        /// </summary>
        public int id_player { get; set; }

        /// <summary>
        /// Número de serie registrado del dispositivo.
        /// </summary>
        public string numero_serie { get; set; }
             
    }
}
