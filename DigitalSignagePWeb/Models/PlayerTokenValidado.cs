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

    /// <summary>
    /// Datos enviados por DigitalSignage.Agent para demostrar
    /// la posesión de su clave privada RSA.
    /// </summary>
    public class PlayerAutenticacionRequest
    {
        /// <summary>
        /// Identificador del desafío entregado por la API.
        /// </summary>
        public string id_desafio { get; set; }

        /// <summary>
        /// Firma RSA-PSS/SHA-256 del desafío, codificada en Base64.
        /// </summary>
        public string firma { get; set; }
    }

    /// <summary>
    /// Representa un desafío temporal asociado a la identidad
    /// autorizada de un Player.
    /// </summary>
    public class PlayerDesafio
    {
        public int IdPlayer { get; set; }

        public string NumeroSerie { get; set; }

        public string ClavePublica { get; set; }

        public string Desafio { get; set; }
    }
}
