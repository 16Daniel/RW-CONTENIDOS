using DigitalSignagePWeb.Models;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace DigitalSignagePWeb.Controllers
{
    [Authorize]
    [OutputCache(NoStore = true, Duration = 0, VaryByParam = "None")]
    public class DispositivosController : Controller
    {

        /// <summary>
        ///Instancia de clase que permite el acceso a los datos del negocio
        /// </summary>
        AccesoDatos AccesoDatos = new AccesoDatos();

        #region Views

        // GET: Monitor
        public ActionResult Monitoreo()
        {
            return View();
        }

        // GET: Administrar Dispositivos
        public ActionResult AdministrarDispositivos()
        {
            return View();
        }

        #endregion

        #region Metodos Monitoreo

        //GET: Obtener Rangos       
        [HttpGet]
        [Authorize]
        public JsonResult ObtenerRangos()
        {
            try
            {
                string resultado = AccesoDatos.ExecuteProcedure(
                    AccesoDatos.GCConsultaRegiones,
                    null
                );

                // Validar errores devueltos por AccesoDatos
                if (resultado.StartsWith("Error:"))
                {
                    System.Diagnostics.Trace.TraceError(resultado);

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = HttpContext.IsDebuggingEnabled
                            ? resultado
                            : "No fue posible consultar el catálogo de regiones."
                    }, JsonRequestBehavior.AllowGet);
                }

                var regiones = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(resultado);

                return Json(new
                {
                    Status = "OK",
                    Data = regiones
                }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Trace.TraceError(ex.ToString());

                return Json(new
                {
                    Status = "ERROR",
                    Message = HttpContext.IsDebuggingEnabled
                        ? ex.Message
                        : "Ocurrió un error al consultar el catálogo de regiones."
                }, JsonRequestBehavior.AllowGet);
            }
        }

        //GET: Obtener Estatus player       
        [HttpGet]
        [Authorize]
        public JsonResult ObtenerEstatusPlayer()
        {
            try
            {
                string resultado = AccesoDatos.ExecuteProcedure(
                    AccesoDatos.GCConsultaEstatusPlayer,
                    null
                );

                // Validar errores devueltos por AccesoDatos
                if (resultado.StartsWith("Error:"))
                {
                    System.Diagnostics.Trace.TraceError(resultado);

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = HttpContext.IsDebuggingEnabled
                            ? resultado
                            : "No fue posible consultar el catálogo de estatus players."
                    }, JsonRequestBehavior.AllowGet);
                }

                var estatusPlayers = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(resultado);

                return Json(new
                {
                    Status = "OK",
                    Data = estatusPlayers
                }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Trace.TraceError(ex.ToString());

                return Json(new
                {
                    Status = "ERROR",
                    Message = HttpContext.IsDebuggingEnabled
                        ? ex.Message
                        : "Ocurrió un error al consultar el catálogo de estatus players."
                }, JsonRequestBehavior.AllowGet);
            }
        }
              

        //GET: Obtener Players
        [HttpGet]
        [Authorize]
        public ActionResult ObtenerPlayers()
        {
            try
            {
                string resultado = AccesoDatos.ExecuteProcedure(
                    AccesoDatos.GCConsultaPlayers,
                    null
                );

                if (resultado.StartsWith("Error:"))
                {
                    return Json(new
                    {
                        Status = "ERROR",
                        Message = resultado
                    }, JsonRequestBehavior.AllowGet);
                }

                var players = JsonConvert.DeserializeObject<List<Player>>(resultado);

                return Content(
                         JsonConvert.SerializeObject(new
                         {
                             Status = "OK",
                             Data = players
                         }),
                         "application/json"
                     );
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    Status = "ERROR",
                    Message = ex.Message,
                    ExceptionMessage = ex.InnerException?.Message
                }, JsonRequestBehavior.AllowGet);
            }
        }

        /// <summary>
        /// Genera una solicitud de actualización de información
        /// para todos los Players registrados.
        /// </summary>
        /// <returns>Identificador de la solicitud y total de destinatarios.</returns>
        /// <exception cref="InvalidOperationException">
        /// Se produce cuando no es posible crear la solicitud en SQL Server.
        /// </exception>
        [HttpPost]
        [Authorize]
        public ActionResult CrearComandoPlayer()
        {
            try
            {
                AccesoDatos accesoDatos = new AccesoDatos();

                var parametros = new Dictionary<string, string>
                {
                    { "codigo_tipo_comando", "REPORTAR_INFO" },
                    { "minutos_expiracion", "2" }
                };

                string resultado = accesoDatos.ExecuteProcedure(
                    accesoDatos.GCCrearComandoPlayer,
                    parametros
                );

                if (resultado.StartsWith("Error:", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(resultado);
                }

                List<PlayerComandoCreadoResultado> resultados =
                    JsonConvert.DeserializeObject<List<PlayerComandoCreadoResultado>>(resultado);

                if (resultados == null || resultados.Count != 1)
                {
                    throw new InvalidOperationException(
                        "No se obtuvo una respuesta válida al crear la solicitud."
                    );
                }

                PlayerComandoCreadoResultado comando = resultados[0];

                if (comando.Status != "OK" || comando.id_comando_player <= 0)
                {
                    throw new InvalidOperationException(
                        "SQL Server no confirmó la creación de la solicitud."
                    );
                }

                return Json(new
                {
                    Status = "OK",
                    Message = "Solicitud de actualización creada correctamente.",
                    Data = new
                    {
                        comando.id_comando_player,
                        comando.total_players
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
                        : "No fue posible crear la solicitud de actualización."
                });
            }
        }


        /// <summary>
        /// Consulta el progreso de una solicitud de comandos,
        /// incluyendo sus resultados pendientes, completados,
        /// fallidos y expirados.
        /// </summary>
        /// <param name="id_comando_player">Identificador de la solicitud.</param>
        /// <returns>Información general y contadores de progreso.</returns>
        /// <exception cref="InvalidOperationException">
        /// Se produce cuando falla la consulta o su respuesta es inválida.
        /// </exception>
        [HttpGet]
        [Authorize]
        public ActionResult ObtenerProgresoComandoPlayer(int id_comando_player)
        {
            try
            {
                if (id_comando_player <= 0)
                {
                    Response.StatusCode = 400;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "El identificador del comando no es válido."
                    }, JsonRequestBehavior.AllowGet);
                }

                var parametros = new Dictionary<string, string>
                {
                    { "id_comando_player", id_comando_player.ToString() }
                };

                AccesoDatos accesoDatos = new AccesoDatos();

                string resultado = accesoDatos.ExecuteProcedure(
                    accesoDatos.GCObtenerProgresoComandoPlayer,
                    parametros
                );

                if (resultado.StartsWith("Error:", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(resultado);
                }

                List<PlayerComandoProgreso> resultados =
                    JsonConvert.DeserializeObject<List<PlayerComandoProgreso>>(resultado);

                if (resultados == null || resultados.Count == 0)
                {
                    Response.StatusCode = 404;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "No se encontró la solicitud de comandos."
                    }, JsonRequestBehavior.AllowGet);
                }

                if (resultados.Count != 1)
                {
                    throw new InvalidOperationException(
                        "La consulta devolvió más de una solicitud."
                    );
                }

                return Json(new
                {
                    Status = "OK",
                    Message = "Progreso consultado correctamente.",
                    Data = resultados[0]
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
                        : "No fue posible consultar el progreso del comando."
                }, JsonRequestBehavior.AllowGet);
            }
        }


        /// <summary>
        /// Obtiene la solicitud activa y vigente de un tipo de comando Player.
        /// Permite recuperar el seguimiento de una solicitud después de
        /// recargar la página, sin generar un nuevo comando.
        /// </summary>
        /// <param name="codigo_tipo_comando">
        /// Código del tipo de comando que se desea consultar.
        /// </param>
        /// <returns>
        /// Resultado JSON con el identificador de la solicitud activa,
        /// la cantidad de Players asociados y un indicador de existencia.
        /// </returns>
        [HttpGet]
        [Authorize]
        public ActionResult ObtenerComandoPlayerActivo(string codigo_tipo_comando)
        {
            try
            {
                // Validar el código del tipo de comando.
                if (string.IsNullOrWhiteSpace(codigo_tipo_comando))
                {
                    Response.StatusCode = 400;

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "El código del tipo de comando es obligatorio."
                    }, JsonRequestBehavior.AllowGet);
                }

                // Preparar los parámetros del procedimiento almacenado.
                var parametros = new Dictionary<string, string>
                {
                    { "codigo_tipo_comando", codigo_tipo_comando }
                };

                AccesoDatos accesoDatos = new AccesoDatos();

                // Consultar la solicitud activa sin crear nuevos comandos.
                string resultado = accesoDatos.ExecuteProcedure(
                    accesoDatos.GCObtenerComandoPlayerActivo,
                    parametros
                );

                // Propagar los errores devueltos por la capa de datos.
                if (resultado.StartsWith("Error:", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(resultado);
                }

                // Convertir el resultado SQL a un modelo tipado.
                List<PlayerComandoActivo> resultados =
                    JsonConvert.DeserializeObject<List<PlayerComandoActivo>>(resultado);

                if (resultados == null || resultados.Count != 1)
                {
                    throw new InvalidOperationException(
                        "La consulta de solicitud activa no devolvió exactamente un registro."
                    );
                }

                return Json(new
                {
                    Status = "OK",
                    Message = "Consulta de solicitud activa realizada correctamente.",
                    Data = resultados[0]
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
                        : "No fue posible consultar la solicitud activa del comando."
                }, JsonRequestBehavior.AllowGet);
            }
        }


        #endregion

        #region Metodos Administrar dispositivos
        /// <summary>
        /// Obtiene el catálogo de sucursales disponibles.
        /// </summary>
        /// <returns>Listado de sucursales en formato JSON.</returns>
        [HttpGet]
        [Authorize]
        public ActionResult ObtenerSucursales()
        {
            try
            {
                string resultado = AccesoDatos.ExecuteProcedure(
                    AccesoDatos.GCConsultaSucursales,
                    null
                );

                if (resultado.StartsWith("Error:", StringComparison.OrdinalIgnoreCase))
                {
                    return Json(new
                    {
                        Status = "ERROR",
                        Message = resultado
                    }, JsonRequestBehavior.AllowGet);
                }

                var sucursales = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(resultado);

                return Json(new
                {
                    Status = "OK",
                    Data = sucursales
                }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Trace.TraceError(ex.ToString());

                return Json(new
                {
                    Status = "ERROR",
                    Message = ex.Message,
                    ExceptionMessage = ex.InnerException?.Message
                }, JsonRequestBehavior.AllowGet);
            }
        }

        //GET: Obtener Estatus administracion       
        [HttpGet]
        [Authorize]
        public JsonResult ObtenerEstatusAdmin()
        {
            try
            {
                string resultado = AccesoDatos.ExecuteProcedure(
                    AccesoDatos.GCConsultaEstatusAdministrativo,
                    null
                );

                // Validar errores devueltos por AccesoDatos
                if (resultado.StartsWith("Error:"))
                {
                    System.Diagnostics.Trace.TraceError(resultado);

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = HttpContext.IsDebuggingEnabled
                            ? resultado
                            : "No fue posible consultar el catálogo de estatus administrativo."
                    }, JsonRequestBehavior.AllowGet);
                }

                var estatusAdmin = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(resultado);

                return Json(new
                {
                    Status = "OK",
                    Data = estatusAdmin
                }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Trace.TraceError(ex.ToString());

                return Json(new
                {
                    Status = "ERROR",
                    Message = HttpContext.IsDebuggingEnabled
                        ? ex.Message
                        : "Ocurrió un error al consultar el catálogo de estatus administrativo."
                }, JsonRequestBehavior.AllowGet);
            }
        }

        //GET: Obtener Players
        [HttpGet]
        [Authorize]
        public ActionResult ObtenerPlayersAdmin()
        {
            try
            {
                string resultado = AccesoDatos.ExecuteProcedure(
                    AccesoDatos.GCConsultaPlayersAdministracion,
                    null
                );

                if (resultado.StartsWith("Error:"))
                {
                    return Json(new
                    {
                        Status = "ERROR",
                        Message = resultado
                    }, JsonRequestBehavior.AllowGet);
                }

                var players = JsonConvert.DeserializeObject<List<Player>>(resultado);

                return Content(
                         JsonConvert.SerializeObject(new
                         {
                             Status = "OK",
                             Data = players
                         }),
                         "application/json"
                     );
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    Status = "ERROR",
                    Message = ex.Message,
                    ExceptionMessage = ex.InnerException?.Message
                }, JsonRequestBehavior.AllowGet);
            }
        }

        /// <summary>
        /// Consulta la información de un Player por su identificador.
        /// </summary>
        /// <param name="id_player">Identificador del Player.</param>
        /// <returns>Información del Player en formato JSON.</returns>
        [HttpGet]
        [Authorize]
        public ActionResult ObtenerPlayerPorId(int id_player)
        {
            try
            {
                if (id_player <= 0)
                {
                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "El identificador del dispositivo no es válido."
                    }, JsonRequestBehavior.AllowGet);
                }

                var parametros = new Dictionary<string, string>
                {
                    { "id_player", id_player.ToString() }
                };

                string resultado = AccesoDatos.ExecuteProcedure(
                    AccesoDatos.GCConsultaConsultaInformacionPlayerAdmin,
                    parametros
                );

                if (resultado.StartsWith("Error:", StringComparison.OrdinalIgnoreCase))
                {
                    return Json(new
                    {
                        Status = "ERROR",
                        Message = resultado
                    }, JsonRequestBehavior.AllowGet);
                }

                var players = JsonConvert.DeserializeObject<List<Player>>(resultado);

                if (players == null || players.Count != 1)
                {
                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "No se encontró un dispositivo único con el identificador indicado."
                    }, JsonRequestBehavior.AllowGet);
                }

                return Content(
                    JsonConvert.SerializeObject(new
                    {
                        Status = "OK",
                        Data = players[0]
                    }),
                    "application/json"
                );
            }
            catch (Exception ex)
            {
                System.Diagnostics.Trace.TraceError(ex.ToString());

                return Json(new
                {
                    Status = "ERROR",
                    Message = ex.Message,
                    ExceptionMessage = ex.InnerException?.Message
                }, JsonRequestBehavior.AllowGet);
            }
        }

        /// <summary>
        /// Consulta las unidades de almacenamiento disponibles.
        /// </summary>
        /// <returns>Catálogo de unidades de almacenamiento.</returns>
        [HttpGet]
        [Authorize]
        public ActionResult ObtenerUnidadesAlmacenamiento()
        {
            try
            {
                string resultado = AccesoDatos.ExecuteProcedure(
                    AccesoDatos.GCConsultaConsultaUnidadAlmacenamiento,
                    null
                );

                if (resultado.StartsWith("Error:", StringComparison.OrdinalIgnoreCase))
                {
                    return Json(new
                    {
                        Status = "ERROR",
                        Message = resultado
                    }, JsonRequestBehavior.AllowGet);
                }

                var unidades = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(resultado);

                return Json(new
                {
                    Status = "OK",
                    Data = unidades
                }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Trace.TraceError(ex.ToString());

                return Json(new
                {
                    Status = "ERROR",
                    Message = ex.Message,
                    ExceptionMessage = ex.InnerException?.Message
                }, JsonRequestBehavior.AllowGet);
            }
        }

        /// <summary>
        /// Registra un nuevo Player en la plataforma.
        /// </summary>
        [HttpPost]
        [Authorize]
        public ActionResult InsertarNuevoPlayer(Player playerModelo)
        {
            try
            {   
                //Verificar que el modelo venga con información
                if (playerModelo == null)
                    throw new ArgumentException("No se recibió información del dispositivo.");

                if (playerModelo.id_sucursal <= 0 || string.IsNullOrWhiteSpace(playerModelo.numero_serie))
                    throw new ArgumentException("La sucursal y el número de serie son obligatorios.");

                if (playerModelo.numero_serie.Trim().Length > 150)
                    throw new ArgumentException("El número de serie no puede exceder 150 caracteres.");

                // Validar que la capacidad recibida sea numérica.
                if (!ModelState.IsValidField("capacidad_almacenamiento"))
                    throw new ArgumentException("La capacidad de almacenamiento debe ser un número válido.");

                // Validar rango y precisión de DECIMAL(18,2).
                if (playerModelo.capacidad_almacenamiento.HasValue)
                {
                    decimal capacidad = playerModelo.capacidad_almacenamiento.Value;

                    if (capacidad < 0 ||
                        capacidad >= 10000000000000000m ||
                        decimal.Round(capacidad, 2) != capacidad)
                    {
                        throw new ArgumentException(
                            "La capacidad de almacenamiento debe ser positiva y tener máximo 2 decimales."
                        );
                    }
                }

                var parametros = new Dictionary<string, string>
                {
                    { "id_sucursal", playerModelo.id_sucursal.ToString() },
                    { "numero_serie", playerModelo.numero_serie.Trim() },
                    { "capacidad_almacenamiento", playerModelo.capacidad_almacenamiento?.ToString(System.Globalization.CultureInfo.InvariantCulture) },
                    { "id_unidad_almacenamiento", playerModelo.id_unidad_almacenamiento?.ToString() },
                    { "id_estatus_admin", playerModelo.id_estatus_admin?.ToString() }
                };

                string resultado = AccesoDatos.ExecuteProcedure(
                    AccesoDatos.GCInsertaNuevoPlayer,
                    parametros
                );

                int idPlayer = ValidarResultadoOperacionPlayer(resultado);

                return Json(new
                {
                    Status = "OK",
                    Message = "Dispositivo registrado correctamente.",
                    Data = new { id_player = idPlayer }
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Trace.TraceError(ex.ToString());

                return Json(new
                {
                    Status = "ERROR",
                    Message = ex.Message
                });
            }
        }

        /// <summary>
        /// Actualiza la información administrativa de un Player existente.
        /// </summary>
        [HttpPost]
        [Authorize]
        public ActionResult ActualizarInformacionPlayerAdmin(Player playerModelo)
        {
            try
            {
                if (playerModelo == null)
                    throw new ArgumentException("No se recibió información del dispositivo.");

                if (playerModelo.id_player <= 0 || playerModelo.id_sucursal <= 0)
                    throw new ArgumentException("El Player y la sucursal deben ser válidos.");

                // Validar que la capacidad recibida sea numérica.
                if (!ModelState.IsValidField("capacidad_almacenamiento"))
                    throw new ArgumentException("La capacidad de almacenamiento debe ser un número válido.");

                // Validar rango y precisión de DECIMAL(18,2).
                if (playerModelo.capacidad_almacenamiento.HasValue)
                {
                    decimal capacidad = playerModelo.capacidad_almacenamiento.Value;

                    if (capacidad < 0 ||
                        capacidad >= 10000000000000000m ||
                        decimal.Round(capacidad, 2) != capacidad)
                    {
                        throw new ArgumentException(
                            "La capacidad de almacenamiento debe ser positiva y tener máximo 2 decimales."
                        );
                    }
                }

                var parametros = new Dictionary<string, string>
                {
                    { "id_player", playerModelo.id_player.ToString() },
                    { "id_sucursal", playerModelo.id_sucursal.ToString() },
                    { "capacidad_almacenamiento", playerModelo.capacidad_almacenamiento?.ToString(System.Globalization.CultureInfo.InvariantCulture) },
                    { "id_unidad_almacenamiento", playerModelo.id_unidad_almacenamiento?.ToString() }
                };

                string resultado = AccesoDatos.ExecuteProcedure(
                    AccesoDatos.GCActualizarInformacionPlayerAdmin,
                    parametros
                );

                int idPlayer = ValidarResultadoOperacionPlayer(resultado);

                return Json(new
                {
                    Status = "OK",
                    Message = "Información del dispositivo actualizada correctamente.",
                    Data = new { id_player = idPlayer }
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Trace.TraceError(ex.ToString());

                return Json(new
                {
                    Status = "ERROR",
                    Message = ex.Message
                });
            }
        }

        /// <summary>
        /// Cambia el estatus administrativo de un Player.
        /// </summary>
        [HttpPost]
        [Authorize]
        public ActionResult ModificarEstatusPlayer(Player playerModelo)
        {
            try
            {
                if (playerModelo == null)
                    throw new ArgumentException("No se recibió información del dispositivo.");

                if (playerModelo.id_player <= 0 || playerModelo.id_estatus_admin <= 0)
                    throw new ArgumentException("El Player y el estatus deben ser válidos.");

                var parametros = new Dictionary<string, string>
                {
                    { "id_player", playerModelo.id_player.ToString() },
                    { "id_estatus_admin", playerModelo.id_estatus_admin.ToString() }
                };

                string resultado = AccesoDatos.ExecuteProcedure(
                    AccesoDatos.GCModificarEstatusPlayer,
                    parametros
                );

                int idPlayer = ValidarResultadoOperacionPlayer(resultado);

                return Json(new
                {
                    Status = "OK",
                    Message = "Estatus administrativo actualizado correctamente.",
                    Data = new { id_player = idPlayer }
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Trace.TraceError(ex.ToString());

                return Json(new
                {
                    Status = "ERROR",
                    Message = ex.Message
                });
            }
        }

        /// <summary>
        /// Valida que el procedimiento almacenado haya confirmado la operación.
        /// </summary>
        /// <param name="resultado">Respuesta JSON de ExecuteProcedure.</param>
        /// <returns>Identificador del Player afectado.</returns>
        private int ValidarResultadoOperacionPlayer(string resultado)
        {
            if (string.IsNullOrWhiteSpace(resultado))
                throw new InvalidOperationException("SQL Server no devolvió una respuesta.");

            if (resultado.StartsWith("Error:", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException(resultado);

            var registros = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(resultado);

            if (registros == null || registros.Count != 1)
                throw new InvalidOperationException("El procedimiento no devolvió un resultado válido.");

            var registro = registros[0];

            string estado = Convert.ToString(registro["Resultado"]);

            if (!string.Equals(estado, "OK", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException(estado);

            if (!registro.ContainsKey("id_player") ||
                !int.TryParse(Convert.ToString(registro["id_player"]), out int idPlayer) ||
                idPlayer <= 0)
                throw new InvalidOperationException("SQL Server no devolvió un identificador válido.");

            return idPlayer;
        }

        #endregion 
    }
}
