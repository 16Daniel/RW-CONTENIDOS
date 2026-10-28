using DigitalSignagePWeb.Models;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Net;
using System.Text;
using System.Web;
using System.Web.Mvc;
using System.Web.Security;

namespace DigitalSignagePWeb.Controllers
{
    public class AccountController : Controller
    {
        /// <summary>
        ///Instancia de clase que permite el acceso a los datos del negocio
        /// </summary>
        AccesoDatos AccesoDatos = new AccesoDatos();

        // GET: Login
        [HttpGet]
        public ActionResult Login()
        {
            if (User.Identity.IsAuthenticated)
                return RedirectToAction("Index", "Home");

            // Si la URL trae ReturnUrl, redirige a la misma pantalla sin él
            if (Request.QueryString["ReturnUrl"] != null)
                return RedirectToAction("login", "Account");

            return View();
        }

        /// <summary>
        /// Método utilizado para validar las credenciales de usuario, con los parámetros que engloblan este método.
        /// </summary>
        /// <param name="email"></param>
        /// <param name="password"></param>
        /// <returns>return Json(new { status = "OK", message = "Inicio de sesión exitoso", data = AccessResult });</returns>
        [HttpPost]
        //[ValidateAntiForgeryToken]
        public JsonResult ValidarUsuario(string email, string password)
        {
            try
            {
                // 1. Validación de entrada
                if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
                {
                    return Json(new AccesoDatos.JsonResponse { Status = "ERROR", Message = "Email y contraseña son requeridos." });
                }

                // 2. Preparar el diccionario de parámetros de usuario
                Dictionary<string, string> UserData = new Dictionary<string, string>
                {
                    { "email", email },
                    { "password", password }
                };

                // 3. Ejecutar la consulta
                string acceso = AccesoDatos.ExecuteProcedure(AccesoDatos.GCValidaUsuarios, UserData);

                // 4. Validación del acceso
                if (acceso.StartsWith("Error"))
                {
                    return Json(new AccesoDatos.JsonResponse { Status = "ERROR", Message = acceso });
                }
               
                dynamic user = JsonConvert.DeserializeObject<dynamic>(acceso);

                if (user == null || user.Count == 0)
                {
                    return Json(new AccesoDatos.JsonResponse
                    {
                        Status = "ERROR",
                        Message = "No es posible completar el inicio de sesión, valida tus credenciales."
                    });
                }

                // ===== Creacion de las cookies de autenticación =====
                string correo = (string)user[0].correo;
                string rol = (string)user[0].rol;
                string estatus = (string)user[0].estatus;

                if (!string.Equals(estatus, "Activo", StringComparison.OrdinalIgnoreCase))
                {
                    return Json(new AccesoDatos.JsonResponse
                    {
                        Status = "ERROR",
                        Message = "Tu cuenta no se encuentra activa. Contacta al administrador."
                    });
                }

                var ticket = new FormsAuthenticationTicket(
                1,                            // versión
                correo,                       // nombre de usuario
                DateTime.Now,                 // fecha de creación
                DateTime.Now.Add(FormsAuthentication.Timeout),  // expira (igual que el timeout del Web.config)
                false,                        // no persistente
                rol);                         // el rol viaja aquí

                var cookie = new HttpCookie(FormsAuthentication.FormsCookieName,
                                            FormsAuthentication.Encrypt(ticket))
                {
                    HttpOnly = true,
                    Secure = Request.IsSecureConnection
                };
                Response.Cookies.Add(cookie);

                //Se crean las variables de sesión
                Session["id_usuario"] = user[0].id_usuario;
                Session["correo"] = user[0].correo;
                Session["nombre"] = user[0].nombre;
                Session["apellido_paterno"] = user[0].apellido_paterno;
                Session["apellido_materno"] = user[0].apellido_materno;
                Session["id_area"] = user[0].id_area;
                Session["area"] = user[0].area;
                Session["id_sucursal"] = user[0].id_sucursal;
                Session["sucursal"] = user[0].sucursal;
                Session["id_rol"] = user[0].id_rol;
                Session["rol"] = user[0].rol;
                Session["id_estatus"] = user[0].id_estatus;
                Session["estatus"] = user[0].estatus;

                // Si la validación del acceso es correcta, puedes continuar con el flujo lógico
                return Json(new AccesoDatos.JsonResponse { Status = "OK", Message = "¡Bienvenido, " + user[0].nombre + "!", Data = acceso, ExtraData = Url.Action("Index", "Home") });

            }

            catch (Exception E)
            {
                // 6. Obtener el número de línea del error
                var lineNumber = (new System.Diagnostics.StackTrace(E, true)).GetFrame(0).GetFileLineNumber();

                // 7. Crear un mensaje de error detallado
                StringBuilder sb = new StringBuilder();
                sb.Append("No es posible iniciar sesión, por favor contacte al administrador del sistema con el siguiente código de error: ");
                sb.Append(E.Message);
                sb.Append($" (Línea: {lineNumber})");

                // 8. Devolver el error en formato JSON
                return Json(new { Status = "ERROR", Message = sb.ToString(), Data = string.Empty });
            }
        }

        // Obtener los datos de las variables de sesión
        [HttpGet]
        [Authorize]
        public JsonResult ObtenerDatosCuenta()
        {
            try
            {
                if (Session["id_usuario"] == null)
                {
                    return Json(new
                    {
                        Status = "ERROR",
                        Message = "La sesión ha expirado."
                    }, JsonRequestBehavior.AllowGet);
                }

                return Json(new
                {
                    Status = "OK",
                    Data = new
                    {
                        id_usuario = Convert.ToInt32(Session["id_usuario"]),
                        nombre = Convert.ToString(Session["nombre"]),
                        apellido_paterno = Convert.ToString(Session["apellido_paterno"]),
                        apellido_materno = Convert.ToString(Session["apellido_materno"]),
                        correo = Convert.ToString(Session["correo"]),
                        area = Convert.ToString(Session["area"]),
                        id_area = Convert.ToString(Session["id_area"]),
                        sucursal = Convert.ToString(Session["sucursal"]),
                        id_sucursal = Convert.ToString(Session["id_sucursal"]),
                        rol = Convert.ToString(Session["rol"]),
                        id_rol = Convert.ToString(Session["id_rol"]),
                        id_estatus = Convert.ToString(Session["id_estatus"]),
                        estatus = Convert.ToString(Session["estatus"])
                    }
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
                        : "Ocurrió un error al obtener los datos de la cuenta."
                }, JsonRequestBehavior.AllowGet);
            }
        }
                
        [HttpPost]
        //[ValidateAntiForgeryToken]
        [Authorize]
        public ActionResult Logout()
        {
            FormsAuthentication.SignOut();
            Session.Clear();
            Session.Abandon();
            return RedirectToAction("login", "Account");
        }

    }
}
