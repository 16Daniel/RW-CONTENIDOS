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
    public class UsuariosController : Controller
    {
        /// <summary>
        ///Instancia de clase que permite el acceso a los datos del negocio
        /// </summary>
        AccesoDatos AccesoDatos = new AccesoDatos();

        #region Views
        // Cargar vista de perfil y configuraciones
        public ActionResult Cuenta()
        {
            return View();
        }
        #endregion

        #region Gets
        // Obtener catálogo de áreas
        [HttpGet]
        [Authorize]
        public JsonResult ObtenerAreas()
        {
            try
            {
                string resultado = AccesoDatos.ExecuteProcedure(
                    AccesoDatos.GCConsultaAreas,
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
                            : "No fue posible consultar el catálogo de áreas."
                    }, JsonRequestBehavior.AllowGet);
                }

                var areas = JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(resultado);

                return Json(new
                {
                    Status = "OK",
                    Data = areas
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
                        : "Ocurrió un error al consultar el catálogo de áreas."
                }, JsonRequestBehavior.AllowGet);
            }
        }
        
        // Obtener catálogo de sucursales
        [HttpGet]
        [Authorize]
        public JsonResult ObtenerSacursales()
        {
            try
            {
                string resultado = AccesoDatos.ExecuteProcedure(
                    AccesoDatos.GCConsultaSucursales,
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
                            : "No fue posible consultar el catálogo de sucursales."
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
                    Message = HttpContext.IsDebuggingEnabled
                        ? ex.Message
                        : "Ocurrió un error al consultar el catálogo de sucursales."
                }, JsonRequestBehavior.AllowGet);
            }
        }
        
        // Obtener catálogo de roles
        [HttpGet]
        [Authorize]
        public JsonResult ObtenerRoles()
        {
            try
            {
                string resultado = AccesoDatos.ExecuteProcedure(
                    AccesoDatos.GCConsultaRoles,
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
                            : "No fue posible consultar el catálogo de roles."
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
                    Message = HttpContext.IsDebuggingEnabled
                        ? ex.Message
                        : "Ocurrió un error al consultar el catálogo de roles."
                }, JsonRequestBehavior.AllowGet);
            }
        }

        #endregion

        #region Updates
        // Actualizar información del usuario
        [HttpPut]
        [Authorize]
        public JsonResult ActualizarInfoUsuario(InformacionUsuario usuario)
        {
            try
            {
                if (Session["id_usuario"] == null)
                {
                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "La sesión ha expirado."
                    });
                }

                if (usuario == null || !ModelState.IsValid)
                {
                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "Los datos proporcionados no son válidos."
                    });
                }

                int idUsuario = Convert.ToInt32(Session["id_usuario"]);

                Dictionary<string, string> parametros = new Dictionary<string, string>
                {
                    { "id_usuario", idUsuario.ToString() },
                    { "nombre", usuario.Nombre },
                    { "apellido_paterno", usuario.Apellido_Paterno },
                    { "apellido_materno", usuario.Apellido_Materno },
                    { "id_area", usuario.Id_Area.ToString() },
                    { "id_sucursal", usuario.Id_Sucursal.ToString() },
                    { "id_rol", usuario.Id_Rol.ToString() }
                };

                string resultado = AccesoDatos.ExecuteProcedure(
                    AccesoDatos.GCActualizaInfoUsuario,
                    parametros
                );

                if (resultado.StartsWith("Error:", StringComparison.OrdinalIgnoreCase))
                {
                    System.Diagnostics.Trace.TraceError(resultado);

                    return Json(new
                    {
                        Status = "ERROR",
                        Message = HttpContext.IsDebuggingEnabled
                            ? resultado
                            : "No fue posible actualizar la información."
                    });
                }

                // Deserializar información actualizada
                var usuarios = JsonConvert.DeserializeObject<List<InformacionUsuario>>(resultado);

                if (usuarios == null || usuarios.Count == 0)
                {
                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "El procedimiento no devolvió información del usuario actualizado."
                    });
                }

                //Actualizamos el contenido de las variables de sesión
                Session["nombre"] = usuarios[0].Nombre;
                Session["apellido_paterno"] = usuarios[0].Apellido_Paterno;
                Session["apellido_materno"] = usuarios[0].Apellido_Materno;                
                Session["id_area"] = usuarios[0].Id_Area;
                Session["area"] = usuarios[0].Area;
                Session["id_sucursal"] = usuarios[0].Id_Sucursal;
                Session["sucursal"] = usuarios[0].Sucursal;
                Session["id_rol"] = usuarios[0].Id_Rol;
                Session["rol"] = usuarios[0].Rol;
                Session["id_estatus"] = usuarios[0].Id_Estatus;
                Session["estatus"] = usuarios[0].Estatus;

                return Json(new
                {
                    Status = "OK",
                    Message = "Información actualizada correctamente.",
                    Data = usuarios[0]
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Trace.TraceError(ex.ToString());

                return Json(new
                {
                    Status = "ERROR",
                    Message = HttpContext.IsDebuggingEnabled
                        ? ex.Message
                        : "Ocurrió un error al actualizar la información."
                });
            }
        }
        
        #endregion
    }
}
