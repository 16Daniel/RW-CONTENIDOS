using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace DigitalSignagePWeb.Models
{
    public class InformacionUsuario
    {
        public string Nombre { get; set; }
        public string Apellido_Paterno { get; set; }
        public string Apellido_Materno { get; set; }
        public string Correo { get; set; }
        public int Id_Area { get; set; }
        public string Area { get; set; }
        public int Id_Sucursal { get; set; }
        public string Sucursal { get; set; }
        public int Id_Rol { get; set; }
        public string Rol { get; set; }
        public int Id_Estatus { get; set; }
        public string Estatus { get; set; }
    }
}