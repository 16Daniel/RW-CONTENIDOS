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

        #endregion

        #region Metodos

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

        #endregion
    }
}
