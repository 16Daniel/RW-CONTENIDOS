using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace DigitalSignagePWeb.Models
{
    /// <summary>
    /// Representa la información técnica reportada
    /// por DigitalSignage.Agent desde una Raspberry Pi.
    /// </summary>
    public class PlayerReporteRequest
    {
        /// <summary>
        /// Número de serie físico del dispositivo.
        /// </summary>
        public string numero_serie { get; set; }

        /// <summary>
        /// Dirección MAC del dispositivo.
        /// </summary>
        public string direccion_mac { get; set; }

        /// <summary>
        /// Modelo de hardware detectado.
        /// </summary>
        public string modelo_player { get; set; }

        /// <summary>
        /// Dirección IPv4 utilizada por el agente.
        /// </summary>
        public string ip_player { get; set; }

        /// <summary>
        /// Versión instalada de DigitalSignage.Agent.
        /// </summary>
        public string version_agent { get; set; }

        /// <summary>
        /// Capacidad total del almacenamiento en bytes.
        /// </summary>
        public long capacidad_almacenamiento_bytes { get; set; }

        /// <summary>
        /// Espacio disponible del almacenamiento en bytes.
        /// </summary>
        public long espacio_disponible_bytes { get; set; }
    }
}