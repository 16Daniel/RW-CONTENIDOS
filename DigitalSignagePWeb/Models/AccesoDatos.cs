using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Text;

namespace DigitalSignagePWeb.Models
{
    public class AccesoDatos
    {

        #region Login
        //SP para validar usuarios
        public string GCValidaUsuarios { get { return "EXEC SpOpMxDS_ValidaUsuario @email, @password"; } }

        #endregion

        #region Usuarios
        //SP para consultar areas
        public string GCConsultaAreas { get { return "EXEC SpOpMxDS_ConsultaAreas"; } }

        //SP para consultar sucursales
        public string GCConsultaSucursales { get { return "EXEC SpOpMxDS_ConsultaSucursales"; } }

        //SP para consultar roles
        public string GCConsultaRoles { get { return "EXEC SpOpMxDS_ConsultaRoles"; } }

        // SP para actualizar la información del usuario
        public string GCActualizaInfoUsuario { get { return "EXEC SpOpMxDS_ActualizarInformacionUsuario @id_usuario, @nombre, @apellido_paterno, @apellido_materno, @id_area, @id_sucursal, @id_rol"; } }

        #endregion

        #region Monitoreo
        //SP para consultar regiones
        public string GCConsultaRegiones { get { return "EXEC SpOpMxDS_ConsultaRegiones"; } }

        //SP para consultar estatus players
        public string GCConsultaEstatusPlayer { get { return "EXEC SpOpMxDS_ConsultaEstatusPlayer"; } }

        //SP para consultar players
        public string GCConsultaPlayers { get { return "EXEC SpOpMxDS_ConsultaPlayers"; } }

        #endregion

        #region Administrar dispositivos
        //SP para consultar las cifras de los KPI's
        public string GCConsultaCifrasKPIPlayersAdmin { get { return "SpOpMxDS_ConsultaCifrasKPIPlayersAdmin"; } }

        //SP para consultar players administracion
        public string GCConsultaPlayersAdministracion { get { return "EXEC SpOpMxDS_ConsultaPlayersAdministracion @busqueda, @id_estado, @id_estatus_admin"; } }

        //SP para consultar estatus administrativos
        public string GCConsultaEstatusAdministrativo { get { return "EXEC SpOpMxDS_ConsultaEstatusAdministrativo"; } }
        
        //SP para consultar player por id
        public string GCConsultaConsultaInformacionPlayerAdmin { get { return "EXEC SpOpMxDS_ConsultaInformacionPlayerAdmin @id_player"; } }

        //SP para consultar unidad almacenamiento 
        public string GCConsultaConsultaUnidadAlmacenamiento { get { return "EXEC SpOpMxDS_ConsultaUnidadAlmacenamiento"; } }

        //SP para registrar un nuevo player
        public string GCInsertaNuevoPlayer { get { return "EXEC SpOpMxDS_InsertarNuevoPlayer @id_sucursal, @numero_serie, @capacidad_almacenamiento, @id_unidad_almacenamiento, @id_estatus_admin"; } }

        //SP modificar la informacion administrativa de un player
        public string GCActualizarInformacionPlayerAdmin { get { return "EXEC SpOpMxDS_ActualizarInformacionPlayerAdmin @id_player, @id_sucursal, @capacidad_almacenamiento, @id_unidad_almacenamiento"; } }

        //SP para cambiar el estatus adminstrativo de un player
        public string GCModificarEstatusPlayer { get { return "EXEC SpOpMxDS_ModificarEstatusPlayer @id_player, @id_estatus_admin"; } }

        //SP Consulta la información de vinculación y seguridad de un Player
        public string GCConsultarVinculacionPlayerAdmin { get { return "EXEC SpOpMxDS_ConsultarVinculacionPlayerAdmin @numero_serie"; } }

        //SP Autoriza o rechaza una solicitud de vinculación de un Player
        public string GCResolverSolicitudVinculacionPlayer { get { return "EXEC SpOpMxDS_ResolverSolicitudVinculacionPlayer @id_solicitud_vinculacion, @id_usuario_resolucion, @autorizar, @observaciones"; } }


        #endregion

        #region Configurar dispositivos

        //SP para consultar players administracion
        public string GCConsultaPlayersConfigDisp { get { return "EXEC SpOpMxDS_ConsultaPlayersConfigurarDisp @busqueda, @id_estado, @id_estatus_admin"; } }

        //SP para consultar la configuracion de un player (individual)
        public string GCConsultaConfiguracionPlayer { get { return "EXEC SpOpMxDS_ConsultaConfiguracionPlayer @id_player"; } }

        //SP para guardar configuracion de players (individual)
        public string GCGuardarConfiguracionPlayer { get { return "EXEC SpOpMxDS_GuardarConfiguracionPlayer @id_player, @id_audio"; } }

        //SP para guardar configuracion de players (Masiva)
        public string GCGuardarConfiguracionMasivaPlayer { get { return "EXEC SpOpMxDS_GuardarConfiguracionMasivaPlayer @id_audio"; } }
        
        // SP para confirmar la versión de configuración aplicada por el Player.        
        public string GCConfirmarConfiguracionPlayer { get { return "EXEC SpOpMxDS_ConfirmarConfiguracionPlayer @id_player, @version_aplicada"; } }

        #endregion

        #region Agent
        /// <summary>
        /// Registra un nuevo token de autenticación para un Player,
        /// utilizando su hash SHA-256.
        /// </summary>
        public string GCEmitirTokenPlayer
        {
            get
            {
                return @"DECLARE @TokenHash BINARY(32);

                 SET @TokenHash = CONVERT(BINARY(32), @hash_hex, 2);

                 EXEC SpOpMxDS_EmitirTokenPlayer
                     @id_player = @id_player,
                     @token_hash = @TokenHash;";
            }
        }

        /// <summary>
        /// Consulta el Player asociado a un token vigente.
        /// </summary>
        public string GCValidarTokenConsultaPlayer
        {
            get
            {
                return @"DECLARE @TokenHash BINARY(32);
                            SET @TokenHash = CONVERT(BINARY(32), @hash_hex, 2);
                        EXEC SpOpMxDS_ValidarTokenConsultaPlayer @token_hash = @TokenHash;";
            }
        }

        /// <summary>
        /// Consulta para obtener la unida de almacenamiento del player.
        /// </summary>
        public string GCObtenerUnidadAlmacenamientoPlayer
        {
            get
            {
                return "EXEC SpOpMxDS_ObtenerUnidadAlmacenamientoPlayer @id_player;";
            }
        }

        /// <summary>
        /// Actualiza la información del player.
        /// </summary>
        public string GCActualizarInformacionPlayer
        {
            get
            {
                return @"
                    EXEC SpOpMxDS_ActualizarInformacionPlayer
                        @id_player,
                        @id_estatus_player,
                        @modelo_player,
                        @numero_serie,
                        @direccion_mac,
                        @ip_player,
                        @version_agent,                        
                        @id_estado_sincronizacion,
                        @ultimo_estado_reproductor,
                        @ultimo_contenido_reportado,
                        @ultima_playlist_reportada,
                        @capacidad_almacenamiento,
                        @ultimo_espacio_disponible;
                ";
            }
        }

        /// <summary>
        /// Registra una solicitud de comando dirigida a todos los Players.
        /// </summary>
        public string GCCrearComandoPlayer = "EXEC SpOpMxDS_CrearComandoPlayer @codigo_tipo_comando, @minutos_expiracion, @id_player, @codigo_alcance";

        /// <summary>
        /// Consulta los comandos pendientes de un Player específico. Cada Raspberry consultara únicamente los comandos 
        /// que tiene asignados.
        /// </summary> 
        public string GCObtenerComandosPendientesPlayer = "EXEC SpOpMxDS_ObtenerComandosPendientesPlayer @id_player";

        /// <summary>
        /// Registra el inicio de ejecución de un comando por un Player.
        /// </summary>
        public string GCIniciarComandoPlayer = "EXEC SpOpMxDS_IniciarComandoPlayer @id_comando_player, @id_player";

        /// <summary>
        /// Consulta el estatus de un comando
        /// </summary>
        public string GCConsultarEstadoComandoPlayer = "EXEC SpOpMxDS_ConsultarEstadoComandoPlayer @id_comando_player, @id_player";

        /// <summary>
        /// Registra el resultado de un comando ejecutado por un Player y actualiza el estado general de la solicitud.
        /// </summary>
        public string GCFinalizarComandoPlayer = "EXEC SpOpMxDS_FinalizarComandoPlayer @id_comando_player, @id_player, @codigo_resultado, @mensaje_resultado";

        /// <summary>
        /// Consulta el progreso general de una solicitud de comandos y sus detalles.
        /// </summary>
        public string GCObtenerProgresoComandoPlayer = "EXEC SpOpMxDS_ObtenerProgresoComandoPlayer @id_comando_player";

        /// <summary>
        /// Consulta si existe una solicitud de comando Player activa y vigente para un tipo de comando específico.
        /// </summary>
        public string GCObtenerComandoPlayerActivo = "EXEC SpOpMxDS_ObtenerComandoPlayerActivo @codigo_tipo_comando";

        /// <summary>
        /// Registra o recupera una solicitud de vinculación
        /// enviada por DigitalSignage.Agent.
        /// </summary>
        public string GCRegistrarSolicitudVinculacion = "EXEC SpOpMxDS_RegistrarSolicitudVinculacionPlayer @numero_serie, @clave_publica;";
           
        /// <summary>
        /// Recuperar estatus de una solicitud de vinculación
        /// enviada por DigitalSignage.Agent.
        /// </summary>
        public string GCConsultarEstadoVinculacionPlayer = "EXEC SpOpMxDS_ConsultarEstadoVinculacionPlayer @numero_serie, @clave_publica;";
           


        #endregion

        #region SQLFunctions
        //Ejecutar un query de resultado simple
        public string ExecuteSingleSelectQuery(string commandText, Dictionary<string, string> parameters)
        {
            string result = string.Empty;
            using (SqlConnection myConnection = new SqlConnection(ConfigurationManager.ConnectionStrings["DefaultConnection"].ConnectionString))
            {
                try
                {
                    myConnection.Open();

                    using (SqlCommand command = new SqlCommand(commandText, myConnection))
                    {
                        if (parameters != null && parameters.Count > 0)
                        {
                            foreach (var parameter in parameters)
                            {
                                command.Parameters.AddWithValue("@" + parameter.Key, parameter.Value);
                            }
                        }

                        command.CommandType = CommandType.Text;

                        // Ejecuta el comando y obtén el resultado
                        result = (string)command.ExecuteScalar();
                    }
                }
                finally
                {
                    if (myConnection.State == ConnectionState.Open)
                    {
                        myConnection.Close();
                    }
                }
            }

            return result;
        }
        //Ejecutar query de resultado multiple en formato JSONSTRING
        public string ExecuteProcedure(string commandText, Dictionary<string, string> parameters)
        {
            string result = string.Empty;
            using (SqlConnection myConnection = new SqlConnection(ConfigurationManager.ConnectionStrings["DefaultConnection"].ConnectionString))
            {
                try
                {
                    myConnection.Open();

                    using (SqlCommand cmd = new SqlCommand(commandText, myConnection))
                    {
                        cmd.CommandTimeout = 240;

                        if (parameters != null && parameters.Count > 0)
                        {
                            foreach (var parameter in parameters)
                            {
                                if (parameter.Value == null)
                                {
                                    cmd.Parameters.AddWithValue("@" + parameter.Key, DBNull.Value);
                                }
                                else
                                {
                                    cmd.Parameters.AddWithValue("@" + parameter.Key, parameter.Value);
                                }
                            }
                        }
                        cmd.CommandType = CommandType.Text;

                        using (SqlDataReader reader = cmd.ExecuteReader())
                        {
                            using (StringWriter sw = new StringWriter())
                            using (JsonTextWriter jsonWriter = new JsonTextWriter(sw))
                            {
                                DataTable dtDocuments = new DataTable();
                                dtDocuments.Load(reader);

                                JsonSerializer serializer = new JsonSerializer();
                                serializer.Serialize(jsonWriter, dtDocuments);
                                result = sw.ToString();

                                //JsonSerializer serializer = new JsonSerializer
                                //{
                                //    // Configuraciones para escapar caracteres conflictivos y mejorar legibilidad
                                //    StringEscapeHandling = StringEscapeHandling.EscapeNonAscii,
                                //    Formatting = Formatting.Indented // Cambiar a None si no necesitas el formato legible
                                //};
                            }
                        }
                    }
                }
                catch (Exception E)
                {
                    StringBuilder Error = new StringBuilder();
                    Error.Append("Error: ");
                    Error.Append(E.Message ?? "");
                    Error.Append(E.InnerException != null ? E.InnerException.ToString() : "");
                    result = Error.ToString();
                }
                finally
                {
                    if (myConnection.State == ConnectionState.Open)
                    {
                        myConnection.Close();
                    }
                }
            }

            return result;
        }

        #endregion

        #region AditionalClassModel
        public class JsonResponse
        {
            public string Status { get; set; }
            public string Message { get; set; }
            public object Data { get; set; }
            public object Data2 { get; set; }
            public object Data3 { get; set; }
            public string ExtraData { get; set; }
            public string Other { get; set; }
        }

        public Dictionary<string, string> RequestParameters { get; set; }

        #endregion
    }
}