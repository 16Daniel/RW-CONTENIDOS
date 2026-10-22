using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;


namespace DigitalSignagePWeb.Models
{
    public class UtilidadesGenerales
    {


        /// <summary>
        /// Convierte una cantidad de bytes a la unidad de almacenamiento
        /// configurada administrativamente para el Player.
        /// </summary>
        /// <param name="bytes">Cantidad de bytes.</param>
        /// <param name="idUnidad">Identificador de la unidad de almacenamiento.</param>
        /// <returns>Valor convertido a dos decimales.</returns>
        /// <exception cref="InvalidOperationException">
        /// Se produce cuando la unidad configurada no es válida.
        /// </exception>
        public static decimal ConvertirAlmacenamiento(long bytes, int idUnidad)
        {
            decimal divisor;

            switch (idUnidad)
            {
                case 1: // TB
                    divisor = 1000000000000m;
                    break;

                case 2: // GB
                    divisor = 1000000000m;
                    break;

                case 3: // MB
                    divisor = 1000000m;
                    break;

                case 4: // KB
                    divisor = 1000m;
                    break;

                default:
                    throw new InvalidOperationException(
                        $"Unidad de almacenamiento no válida: {idUnidad}."
                    );
            }

            return Math.Round(bytes / divisor, 2, MidpointRounding.AwayFromZero);
        }

    }
}