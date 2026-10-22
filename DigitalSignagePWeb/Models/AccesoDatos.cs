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

        #region Agent

        /// <summary>
        /// Consulta el Player asociado a un token vigente.
        /// </summary>
        public string GCValidarTokenConsultaPlayer
        {
            get
            {
                return @"DECLARE @TokenHash BINARY(32);
                            SET @TokenHash = CONVERT(BINARY(32), @hash_hex, 2);
                        EXEC dbo.SpOpMxDS_ValidarTokenConsultaPlayer @token_hash = @TokenHash;";
            }
        }

        /// <summary>
        /// Consulta para obtener la unida de almacenamiento del player.
        /// </summary>
        public string GCObtenerUnidadAlmacenamientoPlayer
        {
            get
            {
                return "EXEC dbo.SpOpMxDS_ObtenerUnidadAlmacenamientoPlayer @id_player;";
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
                    EXEC dbo.SpOpMxDS_ActualizarInformacionPlayer
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