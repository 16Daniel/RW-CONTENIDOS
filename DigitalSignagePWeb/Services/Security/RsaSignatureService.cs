
using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;

namespace DigitalSignagePWeb.Services.Security
{
    /// <summary>
    /// Importa claves públicas RSA en formato PEM y verifica
    /// firmas RSA-PSS utilizando SHA-256.
    /// </summary>
    public static class RsaSignatureService
    {
        private static readonly byte[] RsaOid =
        {
            0x2A, 0x86, 0x48, 0x86,
            0xF7, 0x0D, 0x01, 0x01, 0x01
        };

        /// <summary>
        /// Verifica una firma RSA-PSS con SHA-256 utilizando
        /// la clave pública PEM del Player.
        /// </summary>
        /// <param name="clavePublicaPem">Clave pública RSA en formato PEM.</param>
        /// <param name="datos">Datos originales firmados.</param>
        /// <param name="firma">Firma RSA recibida.</param>
        /// <returns>True si la firma es válida; false en caso contrario.</returns>
        public static bool VerificarFirmaRsa(string clavePublicaPem, byte[] datos, byte[] firma)
        {
            if (datos == null)
                throw new ArgumentNullException(nameof(datos));

            if (firma == null)
                throw new ArgumentNullException(nameof(firma));

            RSAParameters parametros = ImportarClavePublicaPem(clavePublicaPem);

            using (RSACng rsa = new RSACng())
            {
                rsa.ImportParameters(parametros);

                return rsa.VerifyData(
                    datos,
                    firma,
                    HashAlgorithmName.SHA256,
                    RSASignaturePadding.Pss
                );
            }
        }

        /// <summary>
        /// Importa una clave pública RSA codificada como
        /// SubjectPublicKeyInfo en formato PEM/DER.
        /// </summary>
        /// <param name="clavePublicaPem">Clave pública PEM.</param>
        /// <returns>Parámetros públicos RSA.</returns>
        private static RSAParameters ImportarClavePublicaPem(string clavePublicaPem)
        {
            if (string.IsNullOrWhiteSpace(clavePublicaPem))
                throw new ArgumentException("La clave pública RSA es obligatoria.");

            const string inicio = "-----BEGIN PUBLIC KEY-----";
            const string fin = "-----END PUBLIC KEY-----";

            string pem = clavePublicaPem.Trim();

            if (!pem.StartsWith(inicio, StringComparison.Ordinal) ||
                !pem.EndsWith(fin, StringComparison.Ordinal))
            {
                throw new CryptographicException(
                    "La clave pública no tiene el formato PEM esperado.");
            }

            string base64 = pem
                .Substring(inicio.Length, pem.Length - inicio.Length - fin.Length)
                .Replace("\r", "")
                .Replace("\n", "")
                .Trim();

            byte[] datos = Convert.FromBase64String(base64);

            // Limitar el tamaño de la clave recibida.
            if (datos.Length == 0 || datos.Length > 2048)
            {
                throw new CryptographicException(
                    "El tamaño de la clave pública RSA no es válido.");
            }

            using (MemoryStream stream = new MemoryStream(datos))
            using (BinaryReader reader = new BinaryReader(stream))
            {
                // SubjectPublicKeyInfo.
                long finPrincipal = LeerSecuenciaAsn1(reader, stream.Length);

                // AlgorithmIdentifier.
                long finAlgoritmo = LeerSecuenciaAsn1(reader, finPrincipal);

                LeerTagAsn1(reader, 0x06);

                int longitudOid = LeerLongitudAsn1(reader, finAlgoritmo);

                if (longitudOid != RsaOid.Length ||
                    longitudOid > finAlgoritmo - stream.Position)
                {
                    throw new CryptographicException(
                        "El identificador del algoritmo RSA no es válido.");
                }

                byte[] oid = reader.ReadBytes(longitudOid);

                if (!oid.SequenceEqual(RsaOid))
                {
                    throw new CryptographicException(
                        "La clave pública no corresponde al algoritmo RSA.");
                }

                // Parámetro NULL del identificador RSA.
                LeerTagAsn1(reader, 0x05);

                int longitudNull = LeerLongitudAsn1(reader, finAlgoritmo);

                if (longitudNull != 0 || stream.Position != finAlgoritmo)
                {
                    throw new CryptographicException(
                        "Los parámetros del algoritmo RSA no son válidos.");
                }

                // BIT STRING que contiene RSAPublicKey.
                LeerTagAsn1(reader, 0x03);

                int longitudBitString = LeerLongitudAsn1(reader, finPrincipal);
                long finBitString = stream.Position + longitudBitString;

                if (longitudBitString < 1 ||
                    finBitString > finPrincipal ||
                    reader.ReadByte() != 0)
                {
                    throw new CryptographicException(
                        "El formato BIT STRING de la clave RSA no es válido.");
                }

                // RSAPublicKey: SEQUENCE { modulus, publicExponent }.
                long finClaveRsa = LeerSecuenciaAsn1(reader, finBitString);

                byte[] modulo = LeerEnteroAsn1(reader, finClaveRsa);
                byte[] exponente = LeerEnteroAsn1(reader, finClaveRsa);

                if (stream.Position != finClaveRsa ||
                    finClaveRsa != finBitString ||
                    finBitString != finPrincipal ||
                    finPrincipal != stream.Length)
                {
                    throw new CryptographicException(
                        "La clave RSA contiene datos adicionales o incompletos.");
                }

                // La identidad del Agent utiliza RSA de 3072 bits.
                if (modulo.Length != 384 ||
                    exponente.Length == 0 ||
                    exponente.Length > 4)
                {
                    throw new CryptographicException(
                        "Los parámetros de la clave RSA no tienen el tamaño esperado.");
                }

                uint valorExponente = 0;

                foreach (byte valor in exponente)
                {
                    valorExponente = (valorExponente << 8) | valor;
                }

                if (valorExponente < 3 || (valorExponente & 1) == 0)
                {
                    throw new CryptographicException(
                        "El exponente público RSA no es válido.");
                }

                return new RSAParameters
                {
                    Modulus = modulo,
                    Exponent = exponente
                };
            }
        }

        /// <summary>
        /// Lee una secuencia ASN.1 y devuelve su posición final.
        /// </summary>
        private static long LeerSecuenciaAsn1(BinaryReader reader, long limite)
        {
            LeerTagAsn1(reader, 0x30);

            int longitud = LeerLongitudAsn1(reader, limite);
            long fin = reader.BaseStream.Position + longitud;

            if (fin > limite)
            {
                throw new CryptographicException(
                    "La secuencia ASN.1 excede los límites permitidos.");
            }

            return fin;
        }

        /// <summary>
        /// Comprueba el identificador ASN.1 esperado.
        /// </summary>
        private static void LeerTagAsn1(BinaryReader reader, byte tagEsperado)
        {
            if (reader.BaseStream.Position >= reader.BaseStream.Length ||
                reader.ReadByte() != tagEsperado)
            {
                throw new CryptographicException(
                    "La estructura ASN.1 de la clave pública no es válida.");
            }
        }

        /// <summary>
        /// Lee una longitud ASN.1 codificada en DER.
        /// Rechaza longitudes indefinidas y codificaciones no mínimas.
        /// </summary>
        private static int LeerLongitudAsn1(BinaryReader reader, long limite)
        {
            if (reader.BaseStream.Position >= limite)
            {
                throw new CryptographicException(
                    "La longitud ASN.1 está incompleta.");
            }

            int primerByte = reader.ReadByte();

            if ((primerByte & 0x80) == 0)
                return primerByte;

            int cantidadBytes = primerByte & 0x7F;

            if (cantidadBytes == 0 ||
                cantidadBytes > 4 ||
                cantidadBytes > limite - reader.BaseStream.Position)
            {
                throw new CryptographicException(
                    "La longitud ASN.1 no es válida.");
            }

            long longitud = 0;

            for (int i = 0; i < cantidadBytes; i++)
            {
                byte valor = reader.ReadByte();

                if (i == 0 && valor == 0)
                {
                    throw new CryptographicException(
                        "La longitud ASN.1 no utiliza una codificación DER mínima.");
                }

                longitud = (longitud << 8) | valor;
            }

            if (longitud < 128 ||
                longitud > int.MaxValue ||
                longitud > limite - reader.BaseStream.Position)
            {
                throw new CryptographicException(
                    "La longitud ASN.1 excede los límites permitidos.");
            }

            return (int)longitud;
        }

        /// <summary>
        /// Lee un entero positivo ASN.1 y elimina únicamente
        /// el byte de signo cuando está correctamente codificado.
        /// </summary>
        private static byte[] LeerEnteroAsn1(BinaryReader reader, long limite)
        {
            LeerTagAsn1(reader, 0x02);

            int longitud = LeerLongitudAsn1(reader, limite);

            if (longitud == 0 ||
                longitud > limite - reader.BaseStream.Position)
            {
                throw new CryptographicException(
                    "El entero RSA tiene una longitud no válida.");
            }

            byte[] valor = reader.ReadBytes(longitud);

            // Los enteros RSA deben ser positivos y no nulos.
            if (valor.All(b => b == 0))
            {
                throw new CryptographicException(
                    "El entero RSA no puede ser cero.");
            }

            if (valor[0] == 0x00)
            {
                if (valor.Length < 2 || (valor[1] & 0x80) == 0)
                {
                    throw new CryptographicException(
                        "El entero RSA contiene un byte de signo innecesario.");
                }

                return valor.Skip(1).ToArray();
            }

            if ((valor[0] & 0x80) != 0)
            {
                throw new CryptographicException(
                    "El entero RSA tiene una codificación negativa.");
            }

            return valor;
        }
    }
}
