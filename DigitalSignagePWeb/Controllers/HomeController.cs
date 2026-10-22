using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Security;

namespace DigitalSignagePWeb.Controllers
{
    [Authorize]
    [OutputCache(NoStore = true, Duration = 0, VaryByParam = "None")]
    public class HomeController : Controller
    {
        // Cargar vista principal
        public ActionResult Index()
        {
            return View();
        }

        //Cerrar sesión del usuario y redirigir a la página de inicio de sesión
        public ActionResult Logout()
        {
            FormsAuthentication.SignOut();
            Session.Clear();
            Session.Abandon();
            return RedirectToAction("login", "Account");
        }
    }
}