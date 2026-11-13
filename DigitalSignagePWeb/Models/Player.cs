using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace DigitalSignagePWeb.Models
{
    public class Player
    {
        public int id_player { get; set; }
        public int? id_sucursal { get; set; }
        public string sucursal { get; set; }
        public int id_estado { get; set; }
        public string estado { get; set; }

        public int? id_estatus_admin { get; set; }
        public string estatus_administracion { get; set; }
        public int? id_estatus_player { get; set; }
        public string estatus_player { get; set; }

        public string modelo_player { get; set; }
        public string numero_serie { get; set; }
        public string direccion_mac { get; set; }
        public string ip_player { get; set; }
        public string version_agent { get; set; }
        public string estado_vinculacion { get; set; }

        public int? id_estado_sincronizacion { get; set; }
        public string estado_sincronizacion { get; set; }

        public DateTime? ultima_fecha_comunicacion { get; set; }
        public string estado_reproduccion { get; set; }

        public string ultimo_contenido_reportado { get; set; }
        public string ultima_playlist_reportada { get; set; }

        public decimal? capacidad_almacenamiento { get; set; }
        public decimal? ultimo_espacio_disponible { get; set; }
        public int? id_unidad_almacenamiento { get; set; }
        public string unidad_almacenamiento { get; set; }

        public DateTime? fecha_creacion { get; set; }
        public DateTime? fecha_modificacion { get; set; }
    }
}