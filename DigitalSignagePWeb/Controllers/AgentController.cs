using DigitalSignagePWeb.Models;
using DigitalSignagePWeb.Services.Security;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Caching;
using System.Security.Cryptography;
using System.Text;
using System.Web;
using System.Web.Mvc;

namespace DigitalSignagePWeb.Controllers
{
    /// <summary>
    /// Expone los endpoints utilizados por DigitalSignage.Agent
    /// para comunicarse con la plataforma central.
    /// </summary>
    
    public class AgentController : Controller
    {

        // Almacenamiento temporal compartido entre solicitudes.
        private static readonly MemoryCache CacheDesafios = MemoryCache.Default;

        // Sincronización para administrar desafíos concurrentes.
        private static readonly object BloqueoDesafios = new object();

        // Tiempo máximo de validez de un desafío. (2 min)
        private static readonly TimeSpan VigenciaDesafio = TimeSpan.FromMinutes(2);

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
        /// Recibe una solicitud de vinculación enviada por DigitalSignage.Agent.
        /// Registra la identidad pública del dispositivo para su autorización.
        /// </summary>
        /// <param name="request">Número de serie y clave pública RSA del dispositivo.</param>
        /// <returns>Resultado del registro de la solicitud.</returns>
        [HttpPost]
        [AllowAnonymous]
        public ActionResult SolicitarVinculacion(PlayerSolicitudVinculacionRequest request)
        {
            try
            {
                // Validar los datos recibidos.
                if (request == null ||
                    string.IsNullOrWhiteSpace(request.numero_serie) ||
                    string.IsNullOrWhiteSpace(request.clave_publica))
                {
                    Response.StatusCode = 400;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "El número de serie y la clave pública son obligatorios."
                    });
                }

                string numeroSerie = request.numero_serie.Trim();
                string clavePublica = request.clave_publica.Trim();

                // Validar tamaños de acuerdo con las columnas SQL.
                if (numeroSerie.Length > 150 || clavePublica.Length > 1000)
                {
                    Response.StatusCode = 400;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "El número de serie o la clave pública supera la longitud permitida."
                    });
                }

                // Validar la estructura de una clave pública RSA en formato PEM.
                if (!clavePublica.StartsWith("-----BEGIN PUBLIC KEY-----", StringComparison.Ordinal) ||
                    !clavePublica.EndsWith("-----END PUBLIC KEY-----", StringComparison.Ordinal))
                {
                    Response.StatusCode = 400;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "La clave pública no tiene el formato PEM esperado."
                    });
                }

                // Preparar parámetros para SQL Server.
                var parametros = new Dictionary<string, string>
                {
                    { "numero_serie", numeroSerie },
                    { "clave_publica", clavePublica }
                };

                AccesoDatos accesoDatos = new AccesoDatos();

                string resultado = accesoDatos.ExecuteProcedure(
                    accesoDatos.GCRegistrarSolicitudVinculacion,
                    parametros
                );

                if (resultado.StartsWith("Error:", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(resultado);
                }

                List<PlayerSolicitudVinculacionResultado> resultados =
                    JsonConvert.DeserializeObject<List<PlayerSolicitudVinculacionResultado>>(resultado);

                if (resultados == null || resultados.Count != 1)
                {
                    throw new InvalidOperationException(
                        "No se obtuvo una respuesta válida al registrar la solicitud."
                    );
                }

                PlayerSolicitudVinculacionResultado respuesta = resultados[0];

                if (!respuesta.Status)
                {
                    Response.StatusCode = 409;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = respuesta.Message,
                        Codigo = respuesta.Codigo
                    });
                }

                return Json(new
                {
                    Status = "OK",
                    Message = respuesta.Message,
                    Data = new
                    {
                        respuesta.Codigo,
                        respuesta.IdSolicitudVinculacion,
                        respuesta.IdPlayer
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
                        : "No fue posible registrar la solicitud de vinculación."
                });
            }
        }


        /// <summary>
        /// Consulta el estado actual de vinculación de un dispositivo
        /// utilizando su número de serie y clave pública RSA.
        /// </summary>
        /// <param name="request">
        /// Número de serie y clave pública del dispositivo.
        /// </param>
        /// <returns>
        /// Estado de vinculación registrado en SQL Server.
        /// </returns>
        [HttpPost]
        [AllowAnonymous]
        public ActionResult ConsultarEstadoVinculacion(PlayerSolicitudVinculacionRequest request)
        {
            try
            {
                // Validar los parámetros recibidos.
                if (request == null ||
                    string.IsNullOrWhiteSpace(request.numero_serie) ||
                    string.IsNullOrWhiteSpace(request.clave_publica))
                {
                    Response.StatusCode = 400;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "El número de serie y la clave pública son obligatorios."
                    });
                }

                string numeroSerie = request.numero_serie.Trim();
                string clavePublica = request.clave_publica.Trim();

                if (numeroSerie.Length > 150 || clavePublica.Length > 1000)
                {
                    Response.StatusCode = 400;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "El número de serie o la clave pública supera la longitud permitida."
                    });
                }

                // Preparar los parámetros para SQL Server.
                var parametros = new Dictionary<string, string>
                {
                    { "numero_serie", numeroSerie },
                    { "clave_publica", clavePublica }
                };

                AccesoDatos accesoDatos = new AccesoDatos();

                string resultado = accesoDatos.ExecuteProcedure(
                    accesoDatos.GCConsultarEstadoVinculacionPlayer,
                    parametros
                );

                if (resultado.StartsWith("Error:", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(resultado);
                }

                JArray registros = JArray.Parse(resultado);

                if (registros.Count != 1)
                {
                    throw new InvalidOperationException(
                        "No se obtuvo una respuesta válida al consultar el estado de vinculación."
                    );
                }

                JObject respuesta = (JObject)registros[0];

                bool status = respuesta.Value<bool>("Status");
                int codigo = respuesta.Value<int>("Codigo");
                string estado = respuesta.Value<string>("Estado");
                string mensaje = respuesta.Value<string>("Message");

                if (!status)
                {
                    Response.StatusCode = 409;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = mensaje,
                        Codigo = codigo
                    });
                }

                return Json(new
                {
                    Status = "OK",
                    Message = mensaje,
                    Data = new
                    {
                        Codigo = codigo,
                        Estado = estado,
                        IdSolicitudVinculacion =
                            respuesta.Value<long?>("IdSolicitudVinculacion"),
                        IdPlayer = respuesta.Value<int?>("IdPlayer")
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
                        : "No fue posible consultar el estado de vinculación."
                });
            }
        }


        /// <summary>
        /// Genera un desafío criptográfico temporal para autenticar
        /// la identidad RSA de un Player previamente vinculado.
        /// </summary>
        /// <param name="request">
        /// Número de serie y clave pública RSA del dispositivo.
        /// </param>
        /// <returns>
        /// Identificador del desafío y datos aleatorios que deberán firmarse.
        /// </returns>
        [HttpPost]
        [AllowAnonymous]
        public ActionResult SolicitarDesafio(PlayerSolicitudVinculacionRequest request)
        {
            try
            {
                if (request == null ||
                    string.IsNullOrWhiteSpace(request.numero_serie) ||
                    string.IsNullOrWhiteSpace(request.clave_publica))
                {
                    Response.StatusCode = 400;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "El número de serie y la clave pública son obligatorios."
                    });
                }

                string numeroSerie = request.numero_serie.Trim();
                string clavePublica = request.clave_publica.Trim();

                if (numeroSerie.Length > 150 || clavePublica.Length > 1000)
                {
                    Response.StatusCode = 400;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "Los datos de identidad superan la longitud permitida."
                    });
                }

                // Consultar la identidad autorizada mediante el SP existente.
                var parametros = new Dictionary<string, string>
                {
                    { "numero_serie", numeroSerie },
                    { "clave_publica", clavePublica }
                };

                AccesoDatos accesoDatos = new AccesoDatos();

                string resultado = accesoDatos.ExecuteProcedure(
                    accesoDatos.GCConsultarEstadoVinculacionPlayer,
                    parametros
                );

                if (resultado.StartsWith("Error:", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(resultado);
                }

                JArray registros = JArray.Parse(resultado);

                if (registros.Count != 1)
                {
                    throw new InvalidOperationException(
                        "No se obtuvo una respuesta válida al consultar la identidad."
                    );
                }

                JObject respuesta = (JObject)registros[0];

                bool autorizado = respuesta.Value<bool>("Status") && respuesta.Value<int>("Codigo") == 2;

                int idPlayer = respuesta.Value<int?>("IdPlayer") ?? 0;

                if (!autorizado || idPlayer <= 0)
                {
                    Response.StatusCode = 403;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "La identidad del Player no está autorizada."
                    });
                }

                // Generar desafío criptográficamente aleatorio.
                byte[] desafio = new byte[32];

                using (RandomNumberGenerator rng = RandomNumberGenerator.Create())
                {
                    rng.GetBytes(desafio);
                }

                string idDesafio = Guid.NewGuid().ToString("N");
                string desafioBase64 = Convert.ToBase64String(desafio);

                // Guardar temporalmente los datos asociados al desafío.
                PlayerDesafio datosDesafio = new PlayerDesafio
                {
                    IdPlayer = idPlayer,
                    NumeroSerie = numeroSerie,
                    ClavePublica = clavePublica,
                    Desafio = desafioBase64
                };

                // Guarda el desafío durante dos minutos en MemoryCache.
                lock (BloqueoDesafios)
                {
                    CacheDesafios.Set(
                        "PlayerDesafio_" + idDesafio,
                        datosDesafio,
                        new CacheItemPolicy
                        {
                            AbsoluteExpiration =
                                DateTimeOffset.UtcNow.Add(VigenciaDesafio)
                        }
                    );
                }

                return Json(new
                {
                    Status = "OK",
                    Message = "Desafío generado correctamente.",
                    Data = new
                    {
                        IdDesafio = idDesafio,
                        Desafio = desafioBase64,
                        ExpiraEnSegundos = 120
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
                        : "No fue posible generar el desafío de autenticación."
                });
            }
        }

        /// <summary>
        /// Autentica un Player mediante la firma RSA de un desafío
        /// temporal y emite un token Bearer de acceso.
        /// </summary>
        /// <param name="request">Identificador del desafío y firma RSA en Base64.</param>
        /// <returns>Token de autenticación cuando la identidad es válida.</returns>
        [HttpPost]
        [AllowAnonymous]
        public ActionResult AutenticarPlayer(PlayerAutenticacionRequest request)
        {
            try
            {
                if (request == null ||
                    string.IsNullOrWhiteSpace(request.id_desafio) ||
                    string.IsNullOrWhiteSpace(request.firma) ||
                    request.firma.Length > 1024)
                {
                    Response.StatusCode = 400;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "Los datos de autenticación no son válidos."
                    });
                }

                // Consumir el desafío una sola vez.
                PlayerDesafio datos = ConsumirDesafio(request.id_desafio);

                if (datos == null)
                {
                    Response.StatusCode = 401;
                    Response.SuppressFormsAuthenticationRedirect = true;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "El desafío no existe, expiró o ya fue utilizado."
                    });
                }

                byte[] firma;

                try
                {
                    firma = Convert.FromBase64String(request.firma);
                }
                catch (FormatException)
                {
                    Response.StatusCode = 400;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "La firma RSA no tiene un formato Base64 válido."
                    });
                }

                byte[] desafio = Convert.FromBase64String(datos.Desafio);

                // Comprobar que el dispositivo posee la clave privada RSA de identidad.
                bool firmaValida = RsaSignatureService.VerificarFirmaRsa(
                    datos.ClavePublica,
                    desafio,
                    firma
                );

                if (!firmaValida)
                {
                    Response.StatusCode = 401;
                    Response.SuppressFormsAuthenticationRedirect = true;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "La firma RSA del Player no es válida."
                    });
                }

                AccesoDatos accesoDatos = new AccesoDatos();

                // Confirmar nuevamente que la identidad continúa autorizada.
                var parametrosVinculacion = new Dictionary<string, string>
                {
                    { "numero_serie", datos.NumeroSerie },
                    { "clave_publica", datos.ClavePublica }
                };

                string resultadoVinculacion = accesoDatos.ExecuteProcedure(
                    accesoDatos.GCConsultarEstadoVinculacionPlayer,
                    parametrosVinculacion
                );

                if (resultadoVinculacion.StartsWith("Error:", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(resultadoVinculacion);
                }

                JArray registrosVinculacion = JArray.Parse(resultadoVinculacion);

                if (registrosVinculacion.Count != 1)
                {
                    throw new InvalidOperationException(
                        "No se obtuvo una respuesta válida al verificar la vinculación."
                    );
                }

                JObject vinculacion = (JObject)registrosVinculacion[0];

                bool identidadVigente = vinculacion.Value<bool>("Status") && vinculacion.Value<int>("Codigo") == 2 && vinculacion.Value<int?>("IdPlayer") == datos.IdPlayer;

                if (!identidadVigente)
                {
                    Response.StatusCode = 403;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "La identidad del Player ya no está autorizada."
                    });
                }

                // Generar token aleatorio de 256 bits.
                byte[] tokenBytes = new byte[32];

                using (RandomNumberGenerator rng = RandomNumberGenerator.Create())
                {
                    rng.GetBytes(tokenBytes);
                }

                string token = BitConverter.ToString(tokenBytes).Replace("-", "");

                // Guardar únicamente el hash SHA-256 del token.
                byte[] hashBytes;

                using (SHA256 sha256 = SHA256.Create())
                {
                    hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(token));
                }

                string hashHex = BitConverter.ToString(hashBytes).Replace("-", "");

                var parametrosToken = new Dictionary<string, string>
                {
                    { "id_player", datos.IdPlayer.ToString() },
                    { "hash_hex", hashHex }
                };

                //Se emite el token de seguridad
                string resultadoToken = accesoDatos.ExecuteProcedure(
                    accesoDatos.GCEmitirTokenPlayer,
                    parametrosToken
                );

                if (resultadoToken.StartsWith("Error:", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(resultadoToken);
                }

                JArray registrosToken = JArray.Parse(resultadoToken);

                if (registrosToken.Count != 1)
                {
                    throw new InvalidOperationException(
                        "No se obtuvo una respuesta válida al emitir el token."
                    );
                }

                JObject respuestaToken = (JObject)registrosToken[0];

                if (!respuestaToken.Value<bool>("Status"))
                {
                    Response.StatusCode = 409;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = respuestaToken.Value<string>("Message"),
                        Codigo = respuestaToken.Value<int>("Codigo")
                    });
                }

                if (respuestaToken.Value<int?>("IdPlayer") != datos.IdPlayer ||
                    (respuestaToken.Value<int?>("IdPlayerToken") ?? 0) <= 0)
                {
                    throw new InvalidOperationException(
                        "La emisión del token devolvió una identidad inconsistente."
                    );
                }

                // Evitar que la respuesta que contiene el token sea almacenada en caché.
                Response.Cache.SetCacheability(HttpCacheability.NoCache);
                Response.Cache.SetNoStore();

                return Json(new
                {
                    Status = "OK",
                    Message = "Player autenticado correctamente.",
                    Data = new
                    {
                        IdPlayer = datos.IdPlayer,
                        Token = token,
                        TokenType = "Bearer"
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
                        : "No fue posible autenticar al Player."
                });
            }
        }


        /// <summary>
        /// Recupera y elimina un desafío temporal de autenticación.
        /// Garantiza que un mismo desafío no pueda consumirse
        /// simultáneamente por varias solicitudes.
        /// </summary>
        /// <param name="idDesafio">Identificador del desafío.</param>
        /// <returns>
        /// Datos del desafío, o null si no existe o ha expirado.
        /// </returns>
        private static PlayerDesafio ConsumirDesafio(string idDesafio)
        {
            if (string.IsNullOrWhiteSpace(idDesafio) ||
                !Guid.TryParseExact(idDesafio, "N", out _))
            {
                return null;
            }

            string claveCache = "PlayerDesafio_" + idDesafio;

            lock (BloqueoDesafios)
            {
                return CacheDesafios.Remove(claveCache) as PlayerDesafio;
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
            string hashHex = BitConverter.ToString(hashBytes).Replace("-", "");

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
        /// Consulta el estado actual de un comando asignado al Player
        /// autenticado, incluyendo comandos finalizados o vencidos.
        /// </summary>
        /// <param name="id_comando_player">
        /// Identificador del comando que se desea consultar.
        /// </param>
        /// <returns>
        /// Estado del comando correspondiente al Player autenticado.
        /// </returns>
        [HttpGet]
        [AllowAnonymous]
        public ActionResult ConsultarEstadoComandoPlayer(int id_comando_player)
        {
            try
            {
                // Validar la identidad del Player mediante Bearer Token.
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

                // Validar el identificador recibido.
                if (id_comando_player <= 0)
                {
                    Response.StatusCode = 400;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "El identificador del comando no es válido."
                    }, JsonRequestBehavior.AllowGet);
                }

                // Consultar únicamente el detalle asignado al Player.
                var parametros = new Dictionary<string, string>
                {
                    { "id_comando_player", id_comando_player.ToString() },
                    { "id_player", player.id_player.ToString() }
                };

                AccesoDatos accesoDatos = new AccesoDatos();

                string resultado = accesoDatos.ExecuteProcedure(
                    accesoDatos.GCConsultarEstadoComandoPlayer,
                    parametros
                );

                if (resultado.StartsWith("Error:", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(resultado);
                }

                JArray registros = JArray.Parse(resultado);

                if (registros.Count == 0)
                {
                    Response.StatusCode = 404;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "El comando no existe o no está asignado al Player."
                    }, JsonRequestBehavior.AllowGet);
                }

                if (registros.Count != 1)
                {
                    throw new InvalidOperationException(
                        "La consulta devolvió una cantidad inesperada de registros."
                    );
                }

                var respuesta = new
                {
                    Status = "OK",
                    Message = "Estado del comando consultado correctamente.",
                    Data = registros[0]
                };

                return Content(
                    JsonConvert.SerializeObject(respuesta),
                    "application/json"
                );
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
                        : "No fue posible consultar el estado del comando."
                }, JsonRequestBehavior.AllowGet);
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


        /// <summary>
        /// Consulta la configuración vigente del Player autenticado,        
        /// </summary>
        /// <returns>Configuración del Player en formato JSON.</returns>
        /// <exception cref="InvalidOperationException">
        /// Se produce cuando SQL Server devuelve un resultado inválido.
        /// </exception>
        [HttpGet]
        [AllowAnonymous]
        public ActionResult ObtenerConfiguracionPlayer()
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

                // Consultar únicamente la configuración del Player autenticado.
                var parametros = new Dictionary<string, string>
                {
                    { "id_player", player.id_player.ToString() }
                };

                AccesoDatos accesoDatos = new AccesoDatos();

                string resultado = accesoDatos.ExecuteProcedure(
                    accesoDatos.GCConsultaConfiguracionPlayer,
                    parametros
                );

                if (string.IsNullOrWhiteSpace(resultado) ||
                    resultado.StartsWith("Error:", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(resultado);
                }

                var configuraciones =
                    JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(resultado);

                if (configuraciones == null || configuraciones.Count != 1)
                {
                    throw new InvalidOperationException(
                        "No se obtuvo una configuración válida para el Player.");
                }

                return Json(new
                {
                    Status = "OK",
                    Message = "Configuración consultada correctamente.",
                    Data = configuraciones[0]
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
                        : "No fue posible consultar la configuración del Player."
                }, JsonRequestBehavior.AllowGet);
            }
        }

        /// <summary>
        /// Confirma la versión de configuración aplicada por el Player autenticado.
        /// </summary>
        /// <param name="version_aplicada">Versión aplicada por el Agent.</param>
        /// <returns>Resultado de la confirmación en formato JSON.</returns>
        [HttpPost]
        [AllowAnonymous]
        public ActionResult ConfirmarConfiguracionPlayer(ConfiguracionPlayerConfirmarRequest request)
        {
            try
            {
                // Validar la identidad del Player.
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

                if (request == null || request.version_aplicada <= 0)
                    throw new ArgumentException("La versión aplicada no es válida.");

                var parametros = new Dictionary<string, string>
                {
                    { "id_player", player.id_player.ToString() },
                    { "version_aplicada", request.version_aplicada.ToString() }                
                };

                AccesoDatos accesoDatos = new AccesoDatos();

                string resultado = accesoDatos.ExecuteProcedure(
                    accesoDatos.GCConfirmarConfiguracionPlayer,
                    parametros
                );

                if (string.IsNullOrWhiteSpace(resultado) ||
                    resultado.StartsWith("Error:", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(resultado);
                }

                var resultados =
                    JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(resultado);

                if (resultados == null || resultados.Count != 1)
                    throw new InvalidOperationException("SQL Server no devolvió un resultado válido.");

                string mensaje = Convert.ToString(resultados[0]["Resultado"]);

                if (mensaje.StartsWith("Error:", StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException(mensaje);

                return Json(new
                {
                    Status = "OK",
                    Message = mensaje
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
                        : "No fue posible confirmar la configuración del Player."
                });
            }
        }
    }
}