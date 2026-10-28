using DigitalSignagePWeb.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Web.Mvc;

namespace DigitalSignagePWeb.Controllers
{
    /// <summary>
    /// Expone los endpoints utilizados por DigitalSignage.Agent
    /// para comunicarse con la plataforma central.
    /// </summary>
    
    public class AgentController : Controller
    {

        /// <summary>
        /// Comprueba que la API del agente está disponible.
        /// </summary>
        /// <returns>
        /// Respuesta JSON con el estado del servicio y la fecha
        /// y hora UTC del servidor.
        /// </returns>
        [HttpGet]
        [AllowAnonymous]
        public JsonResult Health()
        {
            try
            {
                return Json(new
                {
                    Status = true,
                    Message = "API de DigitalSignage.Agent disponible.",
                    ServerTimeUtc = DateTime.UtcNow
                }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                Response.StatusCode = 500;

                return Json(new
                {
                    Status = false,
                    Message = ex.Message
                }, JsonRequestBehavior.AllowGet);
            }
        }


        /// <summary>
        /// Comprueba que el token Bearer corresponde a un Player registrado
        /// y que su credencial se encuentra vigente.
        /// Endpoint temporal para pruebas de autenticación.
        /// </summary>
        /// <returns>
        /// Información del Player autenticado o una respuesta HTTP 401.
        /// </returns>
        [HttpGet]
        [AllowAnonymous]
        public ActionResult ValidarToken()
        {
            try
            {
                PlayerTokenValidado player = ValidarTokenConsultaPlayer();

                if (player == null)
                {
                    Response.StatusCode = 401;
                    Response.SuppressFormsAuthenticationRedirect = true;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "Token inválido, revocado o vencido."
                    }, JsonRequestBehavior.AllowGet);
                }

                return Json(new
                {
                    Status = "OK",
                    Message = "Token válido.",
                    Data = player
                }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Trace.TraceError(ex.ToString());

                Response.StatusCode = 500;

                return Json(new
                {
                    Status = "ERROR",
                    Message = HttpContext.IsDebuggingEnabled
                        ? ex.Message
                        : "No fue posible validar la credencial del Player."
                }, JsonRequestBehavior.AllowGet);
            }
        }


        /// <summary>
        /// Valida el token Bearer recibido y obtiene la identidad
        /// del Player autenticado.
        /// </summary>
        /// <returns>
        /// Los datos del Player cuando el token es válido.
        /// Null cuando el token no existe, está revocado o ha expirado.
        /// </returns>
        /// <exception cref="InvalidOperationException">
        /// Se produce cuando ocurre un error al consultar la base de datos.
        /// </exception>
        private PlayerTokenValidado ValidarTokenConsultaPlayer()
        {
            string authorization = Request.Headers["Authorization"];

            if (string.IsNullOrWhiteSpace(authorization))
            {
                return null;
            }

            string[] partes = authorization.Trim().Split(
                new[] { ' ' },
                StringSplitOptions.RemoveEmptyEntries
            );

            if (partes.Length != 2 ||
                !partes[0].Equals("Bearer", StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            string token = partes[1];

            // Verificar el formato del token.
            if (token.Length != 64 || !token.All(Uri.IsHexDigit))
            {
                return null;
            }

            // Calcular el hash SHA-256 del token recibido.
            byte[] tokenBytes = Encoding.UTF8.GetBytes(token);
            byte[] hashBytes;

            using (SHA256 sha256 = SHA256.Create())
            {
                hashBytes = sha256.ComputeHash(tokenBytes);
            }

            //Convierte el token a hexadecimal
            string hashHex = BitConverter
                .ToString(hashBytes)
                .Replace("-", "");

            // Consultar el Player asociado al token.
            var parametros = new Dictionary<string, string>
            {
                { "hash_hex", hashHex }
            };

            AccesoDatos accesoDatos = new AccesoDatos();

            string resultado = accesoDatos.ExecuteProcedure(
                accesoDatos.GCValidarTokenConsultaPlayer,
                parametros
            );

            if (resultado.StartsWith("Error:", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(resultado);
            }

            var players = JsonConvert.DeserializeObject<List<PlayerTokenValidado>>(
                resultado
            );

            if (players == null || players.Count != 1 || players[0].id_player <= 0)
            {
                return null;
            }

            return players[0];
        }


        /// <summary>
        /// Recibe y actualiza la información técnica del Player autenticado.
        /// </summary>
        /// <param name="request">Información reportada por DigitalSignage.Agent.</param>
        /// <returns>Resultado de la actualización.</returns>
        [HttpPost]
        [AllowAnonymous]
        public ActionResult ReportarInformacion(PlayerReporteRequest request)
        {
            try
            {
                // Validar la identidad del Player mediante su token Bearer.
                PlayerTokenValidado player = ValidarTokenConsultaPlayer();

                if (player == null)
                {
                    Response.StatusCode = 401;
                    Response.SuppressFormsAuthenticationRedirect = true;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "Token inválido, revocado o vencido."
                    });
                }

                if (request == null)
                {
                    Response.StatusCode = 400;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "No se recibió información del Player."
                    });
                }

                // Validar los identificadores del dispositivo del request recibido contra los del Player autenticado.
                if (request.id_player != player.id_player ||
                    !string.Equals(request.numero_serie, player.numero_serie,
                        StringComparison.OrdinalIgnoreCase))
                {
                    Response.StatusCode = 400;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "Los identificadores no coinciden con el Player autenticado."
                    });
                }

                if (request.capacidad_almacenamiento_bytes <= 0 ||
                    request.espacio_disponible_bytes < 0 ||
                    request.espacio_disponible_bytes > request.capacidad_almacenamiento_bytes)
                {
                    Response.StatusCode = 400;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "Los valores de almacenamiento no son válidos."
                    });
                }

                AccesoDatos accesoDatos = new AccesoDatos();

                // Obtener la unidad administrativa (si es TB, GB, etc.) configurada en SQL Server.
                var parametrosUnidad = new Dictionary<string, string>
                {
                    { "id_player", player.id_player.ToString() }
                };

                string resultadoUnidad = accesoDatos.ExecuteProcedure(
                    accesoDatos.GCObtenerUnidadAlmacenamientoPlayer,
                    parametrosUnidad
                );

                if (resultadoUnidad.StartsWith("Error:", StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException(resultadoUnidad);

                var unidades = JsonConvert.DeserializeObject<List<UnidadAlmacenamientoPlayer>>(
                    resultadoUnidad
                );

                if (unidades == null || unidades.Count != 1)
                    throw new InvalidOperationException(
                        "No fue posible obtener la unidad de almacenamiento del Player."
                    );

                int idUnidad = unidades[0].id_unidad_almacenamiento;

                // Convertir los valores de almacenamiento a la unidad configurada en SQL Server.
                // Para saber la capacidad y el espacio disponible en la misma unidad que se utiliza en la base de datos.
                decimal capacidad = UtilidadesGenerales.ConvertirAlmacenamiento(
                    request.capacidad_almacenamiento_bytes, idUnidad);

                decimal disponible = UtilidadesGenerales.ConvertirAlmacenamiento(
                    request.espacio_disponible_bytes, idUnidad);

                // Actualizar la información del Player en la base de datos.
                var parametros = new Dictionary<string, string>
                {
                    { "id_player", player.id_player.ToString() },
                    { "id_estatus_player", "1" },
                    { "modelo_player", request.modelo_player },
                    { "numero_serie", player.numero_serie },
                    { "direccion_mac", request.direccion_mac },
                    { "ip_player", request.ip_player },
                    { "version_agent", request.version_agent },

                    { "id_estado_sincronizacion", null },
                    { "ultimo_estado_reproductor", null },
                    { "ultimo_contenido_reportado", null },
                    { "ultima_playlist_reportada", null },

                    { "capacidad_almacenamiento", capacidad.ToString(System.Globalization.CultureInfo.InvariantCulture) },
                    { "ultimo_espacio_disponible", disponible.ToString(System.Globalization.CultureInfo.InvariantCulture) }
                };

                string resultado = accesoDatos.ExecuteProcedure(
                    accesoDatos.GCActualizarInformacionPlayer,
                    parametros
                );

                if (resultado.StartsWith("Error:", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(resultado);
                }

                JArray registros = JArray.Parse(resultado);

                if (registros.Count != 1 ||
                    registros[0].Value<int>("id_player") != player.id_player)
                {
                    throw new InvalidOperationException(
                        "No se confirmó la actualización del Player."
                    );
                }

                return Json(new
                {
                    Status = "OK",
                    Message = "Información del Player actualizada correctamente.",
                    Data = new
                    {
                        id_player = player.id_player,
                        capacidad_almacenamiento = capacidad,
                        ultimo_espacio_disponible = disponible,
                        id_unidad_almacenamiento = idUnidad
                    }
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Trace.TraceError(ex.ToString());

                Response.StatusCode = 500;

                return Json(new
                {
                    Status = "ERROR",
                    Message = HttpContext.IsDebuggingEnabled
                        ? ex.ToString()
                        : "No fue posible actualizar la información del Player."
                });
            }
        }

        /// <summary>
        /// Obtiene los comandos pendientes y vigentes asignados
        /// al Player autenticado.
        /// </summary>
        /// <returns>
        /// Respuesta JSON con los comandos pendientes del Player.
        /// </returns>
        /// <exception cref="InvalidOperationException">
        /// Se produce cuando ocurre un error al consultar los comandos.
        /// </exception>
        [HttpGet]
        [AllowAnonymous]
        public ActionResult ObtenerComandosPendientes()
        {
            try
            {
                // Validar la identidad del Player mediante su token Bearer.
                PlayerTokenValidado player = ValidarTokenConsultaPlayer();

                if (player == null)
                {
                    Response.StatusCode = 401;
                    Response.SuppressFormsAuthenticationRedirect = true;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "Token inválido, revocado o vencido."
                    }, JsonRequestBehavior.AllowGet);
                }

                // Consultar únicamente los comandos del Player autenticado.
                var parametros = new Dictionary<string, string>
                {
                    { "id_player", player.id_player.ToString() }
                };

                AccesoDatos accesoDatos = new AccesoDatos();

                string resultado = accesoDatos.ExecuteProcedure(
                    accesoDatos.GCObtenerComandosPendientesPlayer,
                    parametros
                );

                if (resultado.StartsWith("Error:", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(resultado);
                }

                // Deserealizacion del resultado de la busqueda de comandos pendientes en SQL.
                List<PlayerComandoPendiente> comandos = JsonConvert.DeserializeObject<List<PlayerComandoPendiente>>(resultado);

                return Json(new
                {
                    Status = "OK",
                    Message = "Comandos pendientes consultados correctamente.",
                    Data = comandos
                }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Trace.TraceError(ex.ToString());

                Response.StatusCode = 500;

                return Json(new
                {
                    Status = "ERROR",
                    Message = HttpContext.IsDebuggingEnabled
                        ? ex.ToString()
                        : "No fue posible consultar los comandos pendientes."
                }, JsonRequestBehavior.AllowGet);
            }
        }


        /// <summary>
        /// Registra el inicio de ejecución de un comando asignado
        /// al Player autenticado.
        /// </summary>
        /// <param name="request">
        /// Identificador del comando que se desea iniciar.
        /// </param>
        /// <returns>
        /// Resultado de la operación, indicando si el comando
        /// fue iniciado correctamente.
        /// </returns>
        /// <exception cref="InvalidOperationException">
        /// Se produce cuando ocurre un error al ejecutar el procedimiento almacenado.
        /// </exception>
        [HttpPost]
        [AllowAnonymous]
        public ActionResult IniciarComandoPlayer(PlayerComandoIniciarRequest request)
        {
            try
            {
                // Validar la identidad del Player mediante su token Bearer.
                PlayerTokenValidado player = ValidarTokenConsultaPlayer();

                if (player == null)
                {
                    Response.StatusCode = 401;
                    Response.SuppressFormsAuthenticationRedirect = true;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "Token inválido, revocado o vencido."
                    });
                }

                // Validar los datos recibidos.
                if (request == null || request.id_comando_player <= 0)
                {
                    Response.StatusCode = 400;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "El identificador del comando no es válido."
                    });
                }

                // Preparar los parámetros del procedimiento almacenado.
                var parametros = new Dictionary<string, string>
                {
                    { "id_comando_player", request.id_comando_player.ToString() },
                    { "id_player", player.id_player.ToString() }
                };

                AccesoDatos accesoDatos = new AccesoDatos();

                // Registrar el inicio del comando en SQL Server.
                string resultado = accesoDatos.ExecuteProcedure(
                    accesoDatos.GCIniciarComandoPlayer,
                    parametros
                );

                if (resultado.StartsWith("Error:", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(resultado);
                }

                // Obtener la respuesta del procedimiento almacenado.
                List<PlayerComandoResultado> resultados =
                    JsonConvert.DeserializeObject<List<PlayerComandoResultado>>(resultado);

                if (resultados == null || resultados.Count != 1)
                {
                    throw new InvalidOperationException(
                        "No se obtuvo una respuesta válida al iniciar el comando."
                    );
                }

                PlayerComandoResultado respuesta = resultados[0];

                if (respuesta.Status != "OK")
                {
                    Response.StatusCode = 409;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = respuesta.Message
                    });
                }

                return Json(new
                {
                    Status = "OK",
                    Message = respuesta.Message
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Trace.TraceError(ex.ToString());

                Response.StatusCode = 500;

                return Json(new
                {
                    Status = "ERROR",
                    Message = HttpContext.IsDebuggingEnabled
                        ? ex.ToString()
                        : "No fue posible iniciar el comando del Player."
                });
            }
        }

        /// <summary>
        /// Registra el resultado definitivo de un comando ejecutado
        /// por el Player autenticado.
        /// </summary>
        /// <param name="request">Comando, resultado y mensaje de ejecución.</param>
        /// <returns>Confirmación del resultado registrado.</returns>
        /// <exception cref="InvalidOperationException">
        /// Se produce cuando falla la ejecución del procedimiento almacenado
        /// o su respuesta no es válida.
        /// </exception>
        [HttpPost]
        [AllowAnonymous]
        public ActionResult FinalizarComandoPlayer(PlayerComandoFinalizarRequest request)
        {
            try
            {
                PlayerTokenValidado player = ValidarTokenConsultaPlayer();

                if (player == null)
                {
                    Response.StatusCode = 401;
                    Response.SuppressFormsAuthenticationRedirect = true;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "Token inválido, revocado o vencido."
                    });
                }

                if (request == null || request.id_comando_player <= 0)
                {
                    Response.StatusCode = 400;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "El identificador del comando no es válido."
                    });
                }

                string codigoResultado = request.codigo_resultado?.Trim();

                if (codigoResultado != "Completado" && codigoResultado != "Error")
                {
                    Response.StatusCode = 400;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "El resultado debe ser Completado o Error."
                    });
                }

                if (request.mensaje_resultado != null &&
                    request.mensaje_resultado.Length > 1000)
                {
                    Response.StatusCode = 400;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "El mensaje del resultado no puede superar 1000 caracteres."
                    });
                }

                var parametros = new Dictionary<string, string>
                {
                    { "id_comando_player", request.id_comando_player.ToString() },
                    { "id_player", player.id_player.ToString() },
                    { "codigo_resultado", codigoResultado },
                    { "mensaje_resultado", request.mensaje_resultado }
                };

                AccesoDatos accesoDatos = new AccesoDatos();

                string resultado = accesoDatos.ExecuteProcedure(accesoDatos.GCFinalizarComandoPlayer, parametros);

                if (resultado.StartsWith("Error:", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(resultado);
                }

                List<PlayerComandoFinalizarResultado> resultados = JsonConvert.DeserializeObject<List<PlayerComandoFinalizarResultado>>(resultado);

                if (resultados == null || resultados.Count != 1)
                {
                    throw new InvalidOperationException(
                        "No se obtuvo una respuesta válida al finalizar el comando."
                    );
                }

                PlayerComandoFinalizarResultado respuesta = resultados[0];

                if (respuesta.Status != "OK")
                {
                    Response.StatusCode = 409;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = respuesta.Message
                    });
                }

                return Json(new
                {
                    Status = "OK",
                    Message = respuesta.Message,
                    Data = new
                    {
                        respuesta.id_comando_player,
                        respuesta.id_player,
                        respuesta.codigo_resultado
                    }
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Trace.TraceError(ex.ToString());

                Response.StatusCode = 500;

                return Json(new
                {
                    Status = "ERROR",
                    Message = HttpContext.IsDebuggingEnabled
                        ? ex.ToString()
                        : "No fue posible finalizar el comando del Player."
                });
            }
        }

    }
}