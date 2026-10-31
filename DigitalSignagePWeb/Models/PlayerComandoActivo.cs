using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace DigitalSignagePWeb.Models
{
    /// <summary>
    /// Representa el resultado de la consulta de una solicitud
    /// de comando Player activa y vigente.
    /// </summary>
    public class PlayerComandoActivo
    {
        public string Status { get; set; }

        public bool existe_solicitud { get; set; }

        public int? id_comando_player { get; set; }

        public int total_players { get; set; }
    }
}