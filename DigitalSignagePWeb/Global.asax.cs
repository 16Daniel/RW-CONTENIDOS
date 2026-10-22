using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Optimization;
using System.Web.Routing;
using System.Web.Security;
using System.Security.Principal;

namespace DigitalSignagePWeb
{
    public class MvcApplication : System.Web.HttpApplication
    {
        protected void Application_Start()
        {
            AreaRegistration.RegisterAllAreas();
            FilterConfig.RegisterGlobalFilters(GlobalFilters.Filters);
            RouteConfig.RegisterRoutes(RouteTable.Routes);
            BundleConfig.RegisterBundles(BundleTable.Bundles);
        }

        /// <summary>
        /// Se ejecuta en CADA petición HTTP, después de que ASP.NET intenta autenticar al usuario.
        /// Su trabajo es leer la cookie de FormsAuthentication y reconstruir el usuario (con su rol),
        /// para que [Authorize], [Authorize(Roles = "...")] y User.IsInRole("...") funcionen.
        /// </summary>
        protected void Application_PostAuthenticateRequest()
        {
            var cookie = Request.Cookies[FormsAuthentication.FormsCookieName];
            if (cookie == null) return;

            try
            {
                var ticket = FormsAuthentication.Decrypt(cookie.Value);
                if (ticket == null || ticket.Expired) return;

                var identity = new GenericIdentity(ticket.Name);
                var roles = ticket.UserData
                    .Split(new[] { ',' }, StringSplitOptions.RemoveEmptyEntries);

                Context.User = new GenericPrincipal(identity, roles);
            }
            catch
            {
                // Cookie inválida: el usuario queda como anónimo
            }
        }
    }
}
