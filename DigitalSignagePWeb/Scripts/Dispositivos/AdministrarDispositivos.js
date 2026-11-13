class AdministracionPlayers {
    constructor() {
        this.idPlayer = null;
        this.numeroSerie = null;
        this.table = null;

        // Control de actualización automática de credenciales.
        this.tokenPollingTimer = null;
        this.tokenPollingIntentos = 0;
        this.tokenPollingMaxIntentos = 40;
        this.tokenPollingVersion = 0;

        // Control de actualización automática del módulo.
        this.autoRefreshTimer = null;
        this.autoRefreshEnCurso = false;
        this.autoRefreshIntervalo = 30000;

        // Control de concurrencia entre consultas manuales y automáticas.
        this.playersConsultaVersion = 0;
        this.playersConsultasManualesActivas = 0;

        this.puedeGestionarCredencial = false;
        this.estatusToken = null;
    }

    /** Inicializa la tabla y los eventos del módulo. */
    async init() {
        this.inicializarTabla();
        this.bindEvents();
        this.ajustarAnchoModales();

        // FILTROS
        // Cargar catalogos
        await this.cargarRegiones();
        await this.cargarEstatusAdmin();

        // KPI's
        // Carga de cifras en KPI's
        await this.cargarKPIPlayersAdmin();

        // TABLA
        // Cargar players
        await this.cargarPlayersAdmin();

        // Iniciar actualización automática de KPI y dispositivos.
        this.iniciarActualizacionAutomatica();


    }

    /** Inicializa DataTables para mostrar los Players consultados. */
    inicializarTabla() {


        this.table = $('#admin-devices-table').DataTable({

            data: [],

            columns: [
                {
                    data: 'id_player',
                    render: function (data, type, row) {

                        const identificador = `PLYR-${data}`;
                        const sucursal = row.sucursal?.trim() || 'Por asignar';

                        if (type !== 'display') {
                            return `${identificador} ${sucursal}`;
                        }

                        const identificadorTxt = $.fn.dataTable.render.text().display(identificador);
                        const sucursalTxt = $.fn.dataTable.render.text().display(sucursal);

                        return `
                            <div class="d-flex flex-column align-items-center gap-1">
                                <span class="admin-player-identity">
                                    <span class="admin-player-icon">
                                        <i class="fa-solid fa-desktop"></i>
                                    </span>
                                    <span class="admin-player-code">
                                        ${identificadorTxt}
                                    </span>
                                </span>

                                <span class="text-muted small">
                                    <i class="fa-solid fa-location-dot me-1"></i>
                                    ${sucursalTxt}
                                </span>
                            </div>
                        `;
                    }
                },
                {
                    data: 'modelo_player',
                    render: function (data, type) {

                        const modelo = data == null || String(data).trim() === ''
                            ? 'Por asignar'
                            : data;

                        return type === 'display'
                            ? $.fn.dataTable.render.text().display(modelo)
                            : modelo;
                    }
                },
                {
                    data: 'numero_serie',
                    render: $.fn.dataTable.render.text()
                },
                {
                    data: 'estado',
                    render: function (data, type) {

                        if (type !== 'display') {
                            return data ?? '';
                        }

                        const region = $.fn.dataTable.render
                            .text()
                            .display(data ?? '');

                        return `
                            <span class="admin-player-region">
                                <i class="fa-solid fa-location-dot"></i>
                                <span>${region}</span>
                            </span>
                        `;
                    }
                },
                {
                    data: 'capacidad_almacenamiento',
                    render: function (data, type, row) {

                        if (data == null) {
                            return '';
                        }

                        const valor = `${data} ${row.unidad_almacenamiento || ''}`.trim();

                        return type === 'display'
                            ? $.fn.dataTable.render.text().display(valor)
                            : data;
                    }
                },
                {
                    data: 'fecha_modificacion',
                    render: function (data, type) {

                        if (!data) {
                            return '-';
                        }

                        if (type !== 'display') {
                            return data;
                        }

                        const fecha = new Date(data);

                        return Number.isNaN(fecha.getTime())
                            ? ''
                            : fecha.toLocaleDateString('es-MX');
                    }
                },
                {
                    data: 'estado_vinculacion',
                    render: function (data, type) {

                        if (type !== 'display') {
                            return data ?? '';
                        }

                        const estatus = String(data ?? 'Sin vincular').trim().toLowerCase();

                        let clase = 'admin-binding--neutral';
                        let icono = 'fa-link-slash';
                        let texto = 'Sin vincular';

                        if (estatus === 'vinculado') {

                            clase = 'admin-binding--approved';
                            icono = 'fa-link';
                            texto = 'Vinculado';

                        } else if (estatus === 'pendiente') {

                            clase = 'admin-binding--pending';
                            icono = 'fa-clock';
                            texto = 'Pendiente';

                        } else if (estatus === 'rechazado') {

                            clase = 'admin-binding--rejected';
                            icono = 'fa-circle-xmark';
                            texto = 'Rechazado';
                        }

                        return `
                            <span class="admin-player-status admin-binding-status ${clase}">
                                <span class="admin-status-signal">
                                    <i class="fa-solid ${icono}"></i>
                                </span>
                                <span>${texto}</span>
                            </span>
                        `;
                    }
                },
                {
                    data: 'estatus_administracion',
                    render: function (data, type) {

                        if (type !== 'display') {
                            return data ?? '';
                        }

                        const estatus = String(data ?? '').trim().toLowerCase();

                        let clase = 'admin-player-status--inactive';
                        let icono = 'fa-circle-xmark';

                        if (estatus === 'activo') {

                            clase = 'admin-player-status--active';
                            icono = 'fa-circle-check';

                        } else if (estatus === 'suspendido') {

                            clase = 'admin-player-status--suspended';
                            icono = 'fa-circle-pause';

                        }

                        const texto = $.fn.dataTable.render
                            .text()
                            .display(data ?? '');

                        return `
                            <span class="admin-player-status ${clase}">
                                <span class="admin-status-signal">
                                    <i class="fa-solid ${icono}"></i>
                                </span>
                                <span>${texto}</span>
                            </span>
                        `;
                    }
                },
                {
                    data: null,
                    orderable: false,
                    searchable: false,
                    className: 'text-center text-nowrap',
                    render: function (_data, _type, row) {

                        const id = Number(row.id_player);
                        const estatus = Number(row.id_estatus_admin);

                        if (!Number.isSafeInteger(id) || id <= 0) {
                            return '';
                        }

                        const botonEstatus = estatus === 1
                            ? `
                                <button type="button"
                                        class="admin-action btnEstadoPlayer ms-1"
                                        data-id="${id}"
                                        data-estatus="2"
                                        title="Dar de baja"
                                        data-bs-toggle="tooltip"
                                        data-bs-placement="top"
                                        data-bs-title="Dar de baja">
                                    <i class="fa-solid fa-ban"></i>
                                </button>
                            `
                            : (estatus === 2 || estatus === 3)
                                ? `
                                    <button type="button"
                                            class="admin-action btnEstadoPlayer ms-1"
                                            data-id="${id}"
                                            data-estatus="1"
                                            title="Activar dispositivo"
                                            data-bs-toggle="tooltip"
                                            data-bs-placement="top"
                                            data-bs-title="Activar dispositivo">
                                        <i class="fa-solid fa-circle-check text-success"></i>
                                    </button>
                                `
                                : '';

                        return `
                            <button type="button"
                                    class="admin-action btnEditarPlayer"
                                    data-id="${id}"
                                    title="Editar dispositivo"
                                    data-bs-toggle="tooltip"
                                    data-bs-placement="top"
                                    data-bs-title="Editar dispositivo">
                                <i class="fa-solid fa-pen"></i>
                            </button>

                            ${botonEstatus}
                        `;
                    }
                }
            ],
            columnDefs: [
                {
                    targets: '_all',
                    className: 'text-center'
                }
            ],
            pageLength: 12,
            lengthChange: false,
            searching: true,
            ordering: true,
            paging: true,
            info: false,

            // Permite que DataTables calcule los anchos.
            autoWidth: false,

            // Mantiene la tabla sin contenedores de scroll adicionales.
            scrollX: false,

            // Conserva los controles de paginación personalizados.
            dom: 't',

            language: {
                emptyTable: 'No hay dispositivos cargados',
                zeroRecords: 'No se encontraron dispositivos'
            },

            drawCallback: () => {
                this.actualizarContadores();
            }
        });

        this.actualizarContadores();
    }


    // ========================================================
    // FILTROS - CATÁLOGOS
    // ========================================================

    async cargarRegiones() {

        try {

            Loading();

            const response = await $.ajax({
                url: $('.main-content-admin-dispositivos').attr('ObtenerRegiones'),
                type: 'GET',
                dataType: 'JSON'
            });

            if (response.Status === 'OK') {

                const select = $('#region');

                select.empty();
                select.append('<option value="">Todas</option>');

                response.Data.forEach(region => {

                    select.append(
                        $('<option>', {
                            value: region.id_estado,
                            text: region.estado + ' - ' + region.abreviatura
                        })
                    );

                });

            } else {

                Alerts.error(response.Message, 'Error al cargar regiones');

            }

        } catch (error) {

            console.error('Error al cargar regiones:', error);

            Alerts.error(
                Alerts.obtenerMensajeError(error),
                'Error al cargar regiones'
            );

        } finally {

            StopLoading();

        }

    }

    async cargarEstatusAdmin() {

        try {

            Loading();

            const response = await $.ajax({
                url: $('.main-content-admin-dispositivos').attr('ObtenerEstatusAdmin'),
                type: 'GET',
                dataType: 'JSON'
            });

            if (response.Status === 'OK') {

                this.estatusAdmin = response.Data;

                const select = $('#estatus-admin');

                select.empty();
                select.append('<option value="">Todos</option>');

                this.estatusAdmin.forEach(estatusAdmin => {

                    select.append(
                        $('<option>', {
                            value: estatusAdmin.id_estatus,
                            text: estatusAdmin.estatus
                        })
                    );

                });

            } else {

                Alerts.error(response.Message, 'Error al cargar estatus');

            }

        } catch (error) {

            console.error('Error al cargar estatus:', error);

            Alerts.error(
                Alerts.obtenerMensajeError(error),
                'Error al cargar estatus'
            );

        } finally {

            StopLoading();

        }

    }

    /** Carga las sucursales disponibles para registrar o editar un dispositivo. */
    async cargarSucursalesModal() {

        try {

            const response = await $.ajax({
                url: $('.main-content-admin-dispositivos').attr('ObtenerSucursales'),
                type: 'GET',
                dataType: 'JSON'
            });

            if (response.Status !== 'OK') {
                throw new Error(response.Message);
            }

            const select = $('#sucursal');

            select.empty();
            select.append('<option value="">Seleccione sucursal</option>');

            response.Data.forEach(sucursal => {

                select.append($('<option>', {
                    value: sucursal.id_sucursal,
                    text: sucursal.sucursal
                }));

            });

        } catch (error) {

            console.error('Error al cargar sucursales del modal:', error);

            throw error;
        }
    }

    /** Carga las regiones disponibles para editar un dispositivo. */
    async cargarRegionesModal() {

        try {

            const response = await $.ajax({
                url: $('.main-content-admin-dispositivos').attr('ObtenerRegiones'),
                type: 'GET',
                dataType: 'JSON'
            });

            if (response.Status !== 'OK') {
                throw new Error(response.Message);
            }

            const select = $('#region-modal');

            select.empty();
            select.append('<option value="">Seleccione región</option>');

            response.Data.forEach(region => {

                select.append($('<option>', {
                    value: region.id_estado,
                    text: region.estado + ' - ' + region.abreviatura
                }));

            });

        } catch (error) {

            console.error('Error al cargar regiones del modal:', error);

            throw error;
        }
    }

    /** Carga los estatus administrativos disponibles para edición. */
    async cargarEstatusAdminModal() {

        try {

            const response = await $.ajax({
                url: $('.main-content-admin-dispositivos').attr('ObtenerEstatusAdmin'),
                type: 'GET',
                dataType: 'JSON'
            });

            if (response.Status !== 'OK') {
                throw new Error(response.Message);
            }

            const select = $('#estatusAdmin-modal');

            select.empty();
            select.append('<option value="">Seleccione estatus</option>');

            response.Data.forEach(estatus => {

                select.append($('<option>', {
                    value: estatus.id_estatus,
                    text: estatus.estatus
                }));

            });

        } catch (error) {

            console.error('Error al cargar estatus del modal:', error);

            throw error;
        }
    }

    /** Carga las unidades de almacenamiento disponibles para edición. */
    async cargarUnidadesAlmacenamientoModal() {

        try {

            const response = await $.ajax({
                url: $('.main-content-admin-dispositivos').attr('ObtenerUnidadesAlmacenamiento'),
                type: 'GET',
                dataType: 'JSON'
            });

            if (response.Status !== 'OK') {
                throw new Error(response.Message);
            }

            const select = $('#unidadAlmacenamiento-modal');

            select.empty();
            select.append('<option value="">Seleccione unidad</option>');

            response.Data.forEach(unidad => {

                select.append($('<option>', {
                    value: unidad.id_unidad_almacenamiento,
                    text: unidad.unidad_almacenamiento
                }));

            });

        } catch (error) {

            console.error('Error al cargar unidades de almacenamiento:', error);

            throw error;
        }
    }

    // ========================================================
    // CONSULTA DE PLAYERS
    // ========================================================

    async cargarPlayersAdmin(esActualizacionAutomatica = false) {
        // No iniciar consultas automáticas mientras existan búsquedas manuales.
        if (esActualizacionAutomatica && this.playersConsultasManualesActivas > 0) {
            return;
        }
        try {

            // Evitar que el refresco automático sobrescriba una búsqueda manual
            // Cada consulta invalida las respuestas anteriores.
            const versionConsulta = ++this.playersConsultaVersion;

            // Registrar consultas iniciadas manualmente.
            if (!esActualizacionAutomatica) {
                this.playersConsultasManualesActivas++;
            }

            if (!esActualizacionAutomatica) {
                Loading();
            }
            const response = await $.ajax({
                url: $('.main-content-admin-dispositivos').attr('ObtenerPlayersAdmin'),
                type: 'GET',
                dataType: 'JSON',
                data: { // Envio de parametros para busqueda de players
                    busqueda: $('#buscar').val().trim(),
                    id_estado: $('#region').val() || null,
                    id_estatus_admin: $('#estatus-admin').val() || null
                },
                cache: false
            });

            // Descartar respuestas antiguas o automáticas que coincidan
            // con una búsqueda manual en ejecución.
            if (
                versionConsulta !== this.playersConsultaVersion ||
                (esActualizacionAutomatica && this.playersConsultasManualesActivas > 0)
            ) {
                return;
            }

            if (response.Status === 'OK') {
                // Carga de datos en el datable
                // Conservar la página seleccionada durante el refresco automático.
                const paginaActual = this.table.page();

                this.table.clear();
                this.table.rows.add(response.Data);

                if (esActualizacionAutomatica) {
                    this.table.draw(false);
                } else {
                    this.table.draw();
                }

                // Restaurar la página si sigue existiendo.
                if (esActualizacionAutomatica && this.table.page() !== paginaActual) {
                    const totalPaginas = this.table.page.info().pages;
                    const paginaDestino = Math.min(paginaActual, Math.max(0, totalPaginas - 1));

                    this.table.page(paginaDestino).draw('page');
                }

            } else {

                console.error('Error al cargar dispositivos:', response.Message);

                if (!esActualizacionAutomatica) {
                    Alerts.error(
                        response.Message || 'No se recibió el detalle del error.',
                        'Error al cargar dispositivos'
                    );
                }

            }

        } catch (error) {

            console.error('Error al cargar dispositivos:', error);

            if (!esActualizacionAutomatica) {
                Alerts.error(
                    Alerts.obtenerMensajeError(error),
                    'Error al cargar dispositivos'
                );
            }

        } finally {

            if (!esActualizacionAutomatica) {

                this.playersConsultasManualesActivas--;

                StopLoading();
            }
        }

    }

    /** Consulta el Player, asigna los datos al formulario y abre el modal de edición. */
    async consultarPlayerPorId(idPlayer) {
        try {
            Loading();

            const response = await $.ajax({
                url: $('.main-content-admin-dispositivos').attr('ObtenerPlayerPorId'),
                type: 'GET',
                dataType: 'JSON',
                data: { id_player: idPlayer },
                cache: false
            });

            if (response.Status === 'OK' && response.Data) {
                const player = response.Data;
                this.idPlayer = Number(player.id_player);

                $('#admin-device-id').val(player.id_player);
                $('#sucursal').val(player.id_sucursal ?? '');
                $('#numSerie').val(player.numero_serie ?? '');
                $('#region-modal').val(player.id_estado ?? '');
                $('#capacidadAlmacenamiento').val(player.capacidad_almacenamiento ?? '');
                $('#unidadAlmacenamiento-modal').val(player.id_unidad_almacenamiento ?? '');
                $('#estatusAdmin-modal').val(player.id_estatus_admin ?? '');

                // Conservar el número de serie del Player seleccionado.
                this.numeroSerie = player.numero_serie;

                $('#admin-general-tab').tab('show');
                $('#admin-modal-device').modal('show');
            } else {
                Alerts.error(
                    response.Message || 'No se recibió información del dispositivo.',
                    'Error al consultar dispositivo'
                );
            }
        } catch (error) {
            console.error('Error al consultar dispositivo:', error);
            Alerts.error(Alerts.obtenerMensajeError(error), 'Error al consultar dispositivo');
        } finally {
            StopLoading();
        }
    }

    /** Consulta la información de vinculación y seguridad del Player seleccionado. */
    async consultarVinculacionPlayerAdmin(esConsultaAutomatica = false) {

        try {

            if (!this.numeroSerie) {
                throw new Error('No se encontró el número de serie del dispositivo.');
            }

            if (!esConsultaAutomatica) {

                this.puedeGestionarCredencial = false;
                this.estatusToken = null;

                // Limpiar los datos de la consulta anterior.
                $('#admin-binding-status').text('Consultando...');
                $('#admin-binding-request').text('—');
                $('#admin-binding-date').text('—');
                $('#admin-binding-fingerprint').text('—');
                $('#admin-binding-last-contact').text('—');
                $('#admin-binding-identity').text('—');

                // Restablecer y deshabilitar el panel de credenciales.
                $('#admin-token-panel').addClass('admin-token-panel--disabled');

                $('#admin-token-status')
                    .removeClass('admin-pill--active admin-pill--inactive admin-pill--token')
                    .addClass('admin-pill--neutral')
                    .text('Sin consultar');

                $('#admin-token-issued, #admin-token-expires').text('—');
                $('#admin-token-renew').prop('disabled', true);

                $('#admin-binding-actions').addClass('d-none');

                $('#autorizar-autentificacion, #rechazar-autentificacion')
                    .prop('disabled', true);   
            }
            

            const numeroSerie = this.numeroSerie;

            const versionPolling = this.tokenPollingVersion;
           

            const response = await $.ajax({
                url: $('.main-content-admin-dispositivos').attr('ConsultarVinculacionPlayerAdmin'),
                type: 'GET',
                dataType: 'JSON',
                data: {
                    numero_serie: numeroSerie
                },
                cache: false
            });

            if (response.Status !== 'OK' || !response.Data) {
                throw new Error(response.Message || 'No se recibió información de vinculación.');
            }

            // Evitar actualizar información de otro Player o de un seguimiento cancelado.
            if (
                this.numeroSerie !== numeroSerie ||
                (
                    esConsultaAutomatica &&
                    (
                        versionPolling !== this.tokenPollingVersion ||
                        !$('#admin-modal-device').hasClass('show')
                    )
                )
            ) {
                return;
            }

            const vinculacion = response.Data;

            this.puedeGestionarCredencial =
                vinculacion.PuedeGestionarCredencial === true;

            this.estatusToken = vinculacion.EstatusToken;

            // Mostrar acciones únicamente para solicitudes pendientes.
            const solicitudPendiente =
                Number(vinculacion.Codigo) === 1 &&
                Number(vinculacion.IdSolicitudVinculacion) > 0;

            $('#admin-binding-actions').toggleClass('d-none', !solicitudPendiente);

            // Habilitar las acciones existentes únicamente para solicitudes pendientes.
            $('#autorizar-autentificacion, #rechazar-autentificacion')
                .prop('disabled', !solicitudPendiente);

            const clasesVinculacion = [
                'admin-pill--neutral',
                'admin-binding--pending',
                'admin-binding--approved',
                'admin-binding--rejected',
                'admin-binding--neutral'
            ];

            const clasesPorEstado = {
                0: 'admin-binding--neutral',
                1: 'admin-binding--pending',
                2: 'admin-binding--approved',
                3: 'admin-binding--rejected',
                4: 'admin-binding--neutral'
            };

            $('#admin-binding-status')
                .removeClass(clasesVinculacion.join(' '))
                .addClass(clasesPorEstado[Number(vinculacion.Codigo)] || 'admin-binding--neutral')
                .text(vinculacion.Estado ?? 'Sin información');

            $('#admin-binding-request').text(vinculacion.IdSolicitudVinculacion ?? 'Sin solicitud');
            $('#admin-binding-date').text(this.formatearFechaVinculacion(vinculacion.FechaSolicitud));
            $('#admin-binding-fingerprint').text(vinculacion.HuellaClavePublica ?? '—');
            $('#admin-binding-last-contact').text(this.formatearFechaVinculacion(vinculacion.FechaUltimaComunicacion));
            $('#admin-binding-identity').text(vinculacion.IdentidadVigente ? 'Sí' : 'No');

            // ============================================================
            // CREDENCIAL DE AUTENTICACIÓN
            // ============================================================

            // Utilizar la autorización calculada directamente en SQL Server.
            const puedeGestionarCredencial =
                vinculacion.PuedeGestionarCredencial === true;

            // Habilitar o deshabilitar visualmente el panel completo.
            $('#admin-token-panel')
                .toggleClass(
                    'admin-token-panel--disabled',
                    !puedeGestionarCredencial
                );

            // Controlar la disponibilidad de la acción de renovación.
            const tokenVigente = puedeGestionarCredencial && vinculacion.EstatusToken === 'Vigente';

            $('#admin-token-renew').prop('disabled', !tokenVigente);

            if (puedeGestionarCredencial) {

                const clasesPorEstatusToken = {
                    'Vigente': 'admin-pill--active',
                    'Expirado': 'admin-pill--inactive',
                    'Revocado': 'admin-pill--inactive',
                    'Sin asignar': 'admin-pill--neutral'
                };

                // Mostrar el estatus real de la credencial.
                // Determinar si el Agent todavía no ha generado su credencial.
                const estatusToken = vinculacion.EstatusToken;

                const esperandoCredencial =  puedeGestionarCredencial &&  estatusToken === 'Sin asignar';

                // Mostrar el estatus real o indicar que esperamos la credencial.
                $('#admin-token-status')
                    .removeClass(
                        'admin-pill--neutral admin-pill--active admin-pill--inactive admin-pill--token admin-pill--waiting'
                    )
                    .addClass(
                        esperandoCredencial
                            ? 'admin-pill--neutral admin-pill--waiting'
                            : (clasesPorEstatusToken[estatusToken] || 'admin-pill--neutral')
                    )
                    .text(
                        esperandoCredencial
                            ? 'Esperando credencial'
                            : (estatusToken ?? 'Sin información')
                    );

                // Mostrar las fechas de la credencial.
                $('#admin-token-issued').text(
                    this.formatearFechaVinculacion(vinculacion.FechaEmisionToken)
                );

                $('#admin-token-expires').text(
                    this.formatearFechaVinculacion(vinculacion.FechaExpiracionToken)
                );

            } else {

                // El Player no cumple las condiciones para gestionar su credencial.
                $('#admin-token-status')
                    .removeClass('admin-pill--active admin-pill--inactive admin-pill--token')
                    .addClass('admin-pill--neutral')
                    .text('No disponible');

                $('#admin-token-issued, #admin-token-expires').text('—');
            }

        } catch (error) {

            console.error('Error al consultar vinculación del Player:', error);

            // Durante el polling, conservar la información visible
            // y permitir que el mecanismo vuelva a intentar.
            if (esConsultaAutomatica) {
                throw error;
            }

            $('#admin-binding-status').text('Error de consulta');

            $('#admin-token-panel').addClass('admin-token-panel--disabled');
            $('#admin-token-renew').prop('disabled', true);

            $('#admin-token-status')
                .removeClass('admin-pill--active admin-pill--inactive admin-pill--token')
                .addClass('admin-pill--neutral')
                .text('No disponible');

            $('#admin-token-issued, #admin-token-expires').text('—');

            Alerts.error(
                Alerts.obtenerMensajeError(error),
                'Error al consultar vinculación'
            );
        }
    }
    /**
     * Convierte una fecha UTC de ASP.NET MVC al horario
     * de México (America/Mexico_City).
     *
     * @param {string} valor Fecha recibida desde el servidor.
     * @returns {string} Fecha y hora local de México.
     */
    formatearFechaVinculacion(valor) {
        if (!valor) {
            return '—';
        }

        let fecha;

        const coincidencia = /\/Date\((-?\d+)(?:[+-]\d{4})?\)\//.exec(valor);

        if (coincidencia) {
            fecha = new Date(Number(coincidencia[1]));
        } else if (typeof valor === 'string') {
            // Las fechas sin zona horaria se interpretan como UTC.
            fecha = new Date(
                /(?:Z|[+-]\d{2}:\d{2})$/i.test(valor)
                    ? valor
                    : valor.replace(' ', 'T') + 'Z'
            );
        } else {
            fecha = new Date(valor);
        }

        if (isNaN(fecha.getTime())) {
            return '—';
        }

        return fecha.toLocaleString('es-MX', {
            timeZone: 'America/Mexico_City',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }


    // ========================================================
    // FUNCIONALIDAD
    // ========================================================

    /** Consulta y actualiza los indicadores generales (KPI's) de Players. */
    async cargarKPIPlayersAdmin(esActualizacionAutomatica = false) {

        try {

            const response = await $.ajax({
                url: $('.main-content-admin-dispositivos').attr('ObtenerCifrasKPIPlayersAdmin'),
                type: 'GET',
                dataType: 'JSON',
                cache: false
            });

            if (response.Status === 'OK') {

                const kpi = response.Data;

                $('#players-count-total').text(kpi.total_registrados ?? 0);
                $('#players-count-activos').text(kpi.total_activos ?? 0);
                $('#players-count-inactivos').text(kpi.total_inactivos ?? 0);
                $('#players-count-sin-token').text(kpi.total_sin_token ?? 0);

            } else {

                console.error('Error al actualizar los indicadores:', response.Message);

                if (!esActualizacionAutomatica) {
                    Alerts.error(
                        response.Message || 'No se recibió el detalle del error.',
                        'Error al cargar indicadores'
                    );
                }

            }

        } catch (error) {

            console.error('Error al cargar indicadores de Players:', error);

            if (!esActualizacionAutomatica) {
                Alerts.error(
                    Alerts.obtenerMensajeError(error),
                    'Error al cargar indicadores'
                );
            }

        }

    }

    /**
    * Registra un nuevo Player en la plataforma.
    * @param {playerModelo} playerModelo Información del dispositivo.
    */
    async insertarNuevoPlayer(playerModelo) {

        try {

            Loading();

            const response = await $.ajax({
                url: $('.main-content-admin-dispositivos').attr('InsertarNuevoPlayer'),
                type: 'POST',
                dataType: 'JSON',
                data: playerModelo
            });

            if (response.Status === 'OK') {

                $('#admin-modal-device').modal('hide');

                Alerts.success(response.Message);

                // Recargar los contadores de los KPI's
                await this.cargarKPIPlayersAdmin();

                // Recargar la informacion de los players
                await this.cargarPlayersAdmin();

            } else {

                Alerts.error(
                    response.Message,
                    'Error al registrar dispositivo'
                );

            }

        } catch (error) {

            console.error('Error al registrar dispositivo:', error);

            Alerts.error(
                Alerts.obtenerMensajeError(error),
                'Error al registrar dispositivo'
            );

        } finally {

            StopLoading();

        }

    }

    /**
    * Actualiza la informacion adminsitrativa de un Player en la plataforma.
    * @param {playerModelo} playerModelo Información del dispositivo.
    */
    async actualizarInformacionPlayer(playerModelo) {

        try {

            Loading();

            const response = await $.ajax({
                url: $('.main-content-admin-dispositivos').attr('ActualizarInformacionPlayerAdmin'),
                type: 'POST',
                dataType: 'JSON',
                data: playerModelo
            });

            if (response.Status === 'OK') {

                $('#admin-modal-device').modal('hide');

                Alerts.success(response.Message);

                // Recargar los contadores de los KPI's
                await this.cargarKPIPlayersAdmin();

                // Recargar la informacion de los players
                await this.cargarPlayersAdmin();

            } else {

                Alerts.error(response.Message, 'Error al actualizar dispositivo');

            }

        } catch (error) {

            console.error('Error al actualizar dispositivo:', error);

            Alerts.error(
                Alerts.obtenerMensajeError(error),
                'Error al actualizar dispositivo'
            );

        } finally {

            StopLoading();

        }

    }

    async modificarEstatusPlayer(playerModelo) {

        try {

            Loading();

            const response = await $.ajax({
                url: $('.main-content-admin-dispositivos').attr('ModificarEstatusPlayer'),
                type: 'POST',
                dataType: 'JSON',
                data: playerModelo
            });

            if (response.Status === 'OK') {

                $('#admin-modal-baja').modal('hide');

                Alerts.success(response.Message);

                // Recargar los contadores de los KPI's
                await this.cargarKPIPlayersAdmin();

                // Recargar la informacion de los players
                await this.cargarPlayersAdmin();

            } else {

                Alerts.error(response.Message, 'Error al modificar estatus');

            }

        } catch (error) {

            console.error('Error al modificar estatus del Player:', error);

            Alerts.error(
                Alerts.obtenerMensajeError(error),
                'Error al modificar estatus'
            );

        } finally {

            StopLoading();

        }

    }

    // Se realiza el proceso de autorizacion o rechazo de vinculacion
    async resolverSolicitudVinculacion(autorizar) {
        const idSolicitud = Number($('#admin-binding-request').text().replace('#', '').trim());

        if (!Number.isInteger(idSolicitud) || idSolicitud <= 0) {
            Alerts.error('No se encontró una solicitud válida.');
            return;
        }

        const confirmado = await Alerts.confirm(
            autorizar
                ? '¿Deseas autorizar la vinculación de este dispositivo con la plataforma?'
                : '¿Deseas rechazar la solicitud de vinculación de este dispositivo?',
            autorizar
                ? 'Autorizar dispositivo'
                : 'Rechazar solicitud',
            autorizar
                ? 'Autorizar'
                : 'Rechazar'
        );

        if (!confirmado) {
            return;
        }

        const url = $('#main-content').attr('ResolverSolicitudVinculacionPlayer');
                
        try {
            //Loading();

            const response = await $.ajax({
                url: url,
                type: 'POST',
                data: {
                    id_solicitud_vinculacion: idSolicitud,
                    autorizar: autorizar,
                    observaciones: ''
                }
            });

            if (response.Status !== 'OK') {
                throw new Error(response.Message || 'No fue posible resolver la solicitud.');
            }

            // Actualizar el estado de vinculación sin cerrar el modal.
            await this.consultarVinculacionPlayerAdmin();

            await Alerts.success(
                response.Message,
                autorizar ? 'Dispositivo autorizado' : 'Solicitud rechazada'
            );

            await this.cargarPlayersAdmin();

            // Iniciar el seguimiento únicamente después de autorizar
            // y cuando el Agent todavía no tenga una credencial asignada.
            if (
                autorizar &&
                $('#admin-token-status').text().trim() === 'Esperando credencial'
            ) {
                this.iniciarConsultaAutomaticaToken(this.numeroSerie);
            }

        } catch (error) {
            Alerts.error(
                error.responseJSON?.Message ||
                error.responseText ||
                error.message ||
                'No fue posible resolver la solicitud.'
            );
        } //finally {
        //StopLoading();
        //}
    }

    /**
     * Detiene el seguimiento de la credencial e invalida
     * cualquier ejecución anterior del polling.
     */
    detenerConsultaAutomaticaToken() {

        // Invalidar las ejecuciones anteriores.
        this.tokenPollingVersion++;

        if (this.tokenPollingTimer !== null) {
            clearTimeout(this.tokenPollingTimer);
            this.tokenPollingTimer = null;
        }

        this.tokenPollingIntentos = 0;
    }

    /**
     * Consulta periódicamente la credencial hasta detectar
     * un token vigente o alcanzar el límite de intentos.
     *
     * @param {string} numeroSerie Número de serie del Player.
     */
    async iniciarConsultaAutomaticaToken(numeroSerie) {

        this.detenerConsultaAutomaticaToken();

        // Identificador exclusivo de esta ejecución.
        const version = this.tokenPollingVersion;
        // Control exclusivo de esta ejecución del polling.
        let consultaEnCurso = false;

        const consultar = async () => {

            // No continuar si se canceló el seguimiento,
            // cambió el Player o se cerró el modal.
            if (
                version !== this.tokenPollingVersion ||
                this.numeroSerie !== numeroSerie ||
                !$('#admin-modal-device').hasClass('show')
            ) {
                return;
            }

            if (consultaEnCurso) {
                return;
            }

            if (this.tokenPollingIntentos >= this.tokenPollingMaxIntentos) {
                this.detenerConsultaAutomaticaToken();
                return;
            }

            consultaEnCurso = true;
            this.tokenPollingIntentos++;

            try {

                await this.consultarVinculacionPlayerAdmin(true);

                // No programar otra consulta si el seguimiento fue cancelado.
                if (
                    version !== this.tokenPollingVersion ||
                    this.numeroSerie !== numeroSerie ||
                    !$('#admin-modal-device').hasClass('show')
                ) {
                    return;
                }

                // Detener cuando el token esté vigente.
                if ($('#admin-token-status').text().trim() === 'Vigente') {
                    this.detenerConsultaAutomaticaToken();
                    return;
                }

            } catch (error) {

                console.error(
                    'Error durante la consulta automática del token:',
                    error
                );

            } finally {

                consultaEnCurso = false;
            }

            // Programar únicamente si esta ejecución sigue activa.
            if (
                version === this.tokenPollingVersion &&
                this.numeroSerie === numeroSerie &&
                $('#admin-modal-device').hasClass('show')
            ) {
                this.tokenPollingTimer = setTimeout(consultar, 3000);
            }
        };

        await consultar();
    }

    /**
     * Actualiza periódicamente los KPI y la tabla de Players
     * sin interrumpir la interacción del usuario.
     */
    iniciarActualizacionAutomatica() {

        // Evitar temporizadores duplicados.
        if (this.autoRefreshTimer !== null) {
            clearTimeout(this.autoRefreshTimer);
            this.autoRefreshTimer = null;
        }

        const actualizar = async () => {

            // No realizar consultas mientras la pestaña esté oculta.
            if (document.hidden) {
                this.autoRefreshTimer = setTimeout(
                    actualizar,
                    this.autoRefreshIntervalo
                );
                return;
            }

            // Evitar consultas simultáneas.
            if (this.autoRefreshEnCurso) {
                this.autoRefreshTimer = setTimeout(
                    actualizar,
                    this.autoRefreshIntervalo
                );
                return;
            }

            this.autoRefreshEnCurso = true;

            try {

                // Actualizar indicadores sin mostrar alertas.
                await this.cargarKPIPlayersAdmin(true);

                // No interferir con búsquedas manuales en ejecución.
                if (this.playersConsultasManualesActivas === 0) {

                    // Actualizar tabla sin mostrar Loading.
                    await this.cargarPlayersAdmin(true);
                }

            } catch (error) {

                console.error(
                    'Error durante la actualización automática de Players:',
                    error
                );

            } finally {

                this.autoRefreshEnCurso = false;

                // Programar el siguiente ciclo.
                this.autoRefreshTimer = setTimeout(
                    actualizar,
                    this.autoRefreshIntervalo
                );

            }
        };

        // Primera actualización después de 30 segundos.
        this.autoRefreshTimer = setTimeout(
            actualizar,
            this.autoRefreshIntervalo
        );
    }

    /**
     * Solicita la renovación de la credencial de un Player.
     */
    async renovarTokenPlayer() {
        const $btn = $('#admin-token-renew');
        const idPlayer = Number(this.idPlayer);

        try {

            if (!Number.isSafeInteger(idPlayer) || idPlayer <= 0) {
                throw new Error('No se ha seleccionado un Player válido.');
            }

            const puedeRenovar =
                this.puedeGestionarCredencial === true &&
                this.estatusToken === 'Vigente';

            if (!puedeRenovar) {
                throw new Error(
                    'No es posible renovar el token porque el dispositivo no tiene una identidad autorizada y una credencial vigente.'
                );
            }
          
            $btn.prop('disabled', true);

            const response = await $.ajax({
                url: $('.main-content-admin-dispositivos').attr('CrearComandoPlayer'),
                type: 'POST',
                dataType: 'json',
                data: {
                    codigo_tipo_comando: 'RENOVAR_TOKEN',
                    codigo_alcance: 'INDIVIDUAL',
                    id_player: idPlayer
                }
            });

            if (response.Status !== 'OK') {
                throw new Error(response.Message || 'No fue posible solicitar la renovación.');
            }

            Alerts.success(
                response.Message || 'Solicitud de renovación registrada.',
                'Renovación solicitada'
            );

        } catch (error) {

            console.error('Error al solicitar renovación de token:', error);

            Alerts.error(
                Alerts.obtenerMensajeError(error),
                'Error al renovar token'
            );

        } finally {

            if (this.idPlayer === idPlayer) {
                await this.consultarVinculacionPlayerAdmin();
            }
        }
    }

    //=================================================================================
    // EVENTOS
    //=================================================================================
    /** Vincula los botones existentes de la vista. se implemententan los eventos */
    bindEvents() {
        //=================================================================================
        // MODALES
        //=================================================================================
        // Botones para abrir los modales
        $(document).on('click', '#btn-nuevo-dispositivo', () => this.abrirModalNuevo());

        $(document).on('click', '.btnEditarPlayer', (event) => {

            const boton = $(event.currentTarget);

            this.abrirModalEditar(boton.data('id'));

        });

        $(document).on('click', '.btnEstadoPlayer', (event) => {

            const boton = $(event.currentTarget);

            this.abrirModalEstado(boton.data('id'), boton.data('estatus'));

        });

        // Consultar vinculación al abrir la pestaña de seguridad.
        $(document).on('shown.bs.tab', '#admin-security-tab', async () => {

            if (this.idPlayer && this.numeroSerie) {
                await this.consultarVinculacionPlayerAdmin();
            }

        });

        $(document).on('shown.bs.tab', '#admin-security-tab', function () {
            $('#admin-guardar-player').addClass('d-none');
        });

        $(document).on('shown.bs.tab', '#admin-general-tab', function () {
            $('#admin-guardar-player').removeClass('d-none');
        });

        $(document).on('click', '#autorizar-autentificacion', function () {
            AdministracionPlayersCs.resolverSolicitudVinculacion(true);
        });

        $(document).on('click', '#rechazar-autentificacion', function () {
            AdministracionPlayersCs.resolverSolicitudVinculacion(false);
        });

        //=================================================================================
        // VALIDACIONES
        //=================================================================================
        // Validaciones para completar campos
        $(document).on('submit', '#admin-device-form', async function (event) {

            event.preventDefault();

            // Validar campos obligatorios.
            if (!this.checkValidity()) {
                $(this).addClass('was-validated');
                return;
            }

            // Validar capacidad de almacenamiento.
            const capacidad = $('#capacidadAlmacenamiento').val().trim();

            if (capacidad !== '' && !/^\d{1,16}(\.\d{1,2})?$/.test(capacidad)) {

                Alerts.error(
                    'Ingresa una capacidad válida, con máximo 2 decimales.',
                    'Capacidad de almacenamiento inválida'
                );

                $('#capacidadAlmacenamiento').focus();
                return;
            }

            // Obtener los valores del formulario, se arma el modelo con la informacion del player.
            let playerModelo = new Players({
                id_sucursal: $('#sucursal').val(),
                numero_serie: $('#numSerie').val().trim(),
                capacidad_almacenamiento: capacidad || null,
                id_unidad_almacenamiento: $('#unidadAlmacenamiento-modal').val() || null,
                id_estatus_admin: $('#estatusAdmin-modal').val() || null
            });

            // Registrar o actualizar dispositivo.
            if (AdministracionPlayersCs.idPlayer == null) {

                await AdministracionPlayersCs.insertarNuevoPlayer(playerModelo);

            } else {

                playerModelo.id_player = AdministracionPlayersCs.idPlayer;

                await AdministracionPlayersCs.actualizarInformacionPlayer(playerModelo);

            }

        });

        // Evento para dar de baja un player (inactivar)
        $(document).on('click', '#admin-confirmar-baja', async function () {

            const idPlayer = AdministracionPlayersCs.idPlayer;
            const idEstatus = AdministracionPlayersCs.idEstatus;

            if (!idPlayer || ![1, 2].includes(Number(idEstatus))) return;

            const playerModelo = new Players({
                id_player: idPlayer,
                id_estatus_admin: idEstatus
            });

            await AdministracionPlayersCs.modificarEstatusPlayer(playerModelo);

        });

        //=================================================================================
        // FILTROS
        //=================================================================================
        // Buscar Players aplicando los filtros en SQL Server.
        $('#admin-btn-search').on('click', async () => {
            await this.cargarPlayersAdmin();
        });

        // Buscar al presionar Enter desde cualquiera de los filtros.
        $('#buscar, #region, #estatus-admin').on('keydown', async (event) => {

            if (event.key === 'Enter') {
                event.preventDefault();
                await this.cargarPlayersAdmin();
            }

        });

        // Limpiar filtros y consultar todos los Players.
        $('#admin-btn-clear').on('click', async () => {

            $('#buscar').val('');
            $('#region').val('');
            $('#estatus-admin').val('');

            await this.cargarPlayersAdmin();
        });

        //=================================================================================
        // DATATABLES
        //=================================================================================
        // Evento de botones del datable
        $('#admin-pages').on('click', '[data-page]', (event) => {
            const $button = $(event.currentTarget);
            if ($button.prop('disabled')) return;
            this.table.page(Number($button.attr('data-page'))).draw('page');
        });

        $('#admin-page-size').on('change', (event) => {
            this.table.page.len(Number($(event.currentTarget).val())).draw();
        });

        //=================================================================================
        // FUNCIONALIDADES
        //=================================================================================
        // Detener las consultas automáticas al cerrar el modal.
        $(document).on('hidden.bs.modal', '#admin-modal-device', () => {
            this.detenerConsultaAutomaticaToken();
        });

        $(document).on('click', '#admin-token-renew', async (event) => {
            event.preventDefault();

            if ($(event.currentTarget).prop('disabled')) {
                return;
            }

            await this.renovarTokenPlayer();
        });
    }

    /** Aplica búsqueda local a los registros que tenga cargados DataTables. */
    buscar() {
        this.table.search($('#admin-search').val().trim()).draw();
    }

    /** Actualiza indicadores de la tabla sin inventar totales globales. */
    actualizarContadores() {
        if (!this.table) return;
        const info = this.table.page.info();
        $('#admin-result-count').text(`${info.recordsDisplay} resultados`);
        $('#admin-page-caption').text(info.recordsDisplay
            ? `Mostrando ${info.start + 1}–${info.end} de ${info.recordsDisplay} dispositivos`
            : '0 dispositivos');
        this.renderizarPaginacion(info);
    }

    /** Dibuja los controles visuales usando únicamente el estado de DataTables. */
    renderizarPaginacion(info) {
        const $pages = $('#admin-pages');
        $pages.empty();

        const crearBoton = (texto, pagina, activo, deshabilitado, etiqueta) => {
            return $('<button>', {
                type: 'button',
                text: texto,
                'data-page': pagina,
                'aria-label': etiqueta,
                'aria-current': activo ? 'page' : null,
                class: activo ? 'active' : ''
            }).prop('disabled', deshabilitado);
        };

        $pages.append(crearBoton('‹', info.page - 1, false, info.page === 0, 'Anterior'));

        // Ventana acotada para evitar cientos de botones con grandes volúmenes.
        const inicio = Math.max(0, Math.min(info.page - 2, info.pages - 5));
        const fin = Math.min(info.pages, inicio + 5);

        for (let pagina = inicio; pagina < fin; pagina++) {
            $pages.append(crearBoton(String(pagina + 1), pagina, pagina === info.page, false, `Página ${pagina + 1}`));
        }

        $pages.append(crearBoton('›', info.page + 1, false, info.page >= info.pages - 1, 'Siguiente'));

    }

    /** Ajusta el ancho de los modales al tamaño visible de la ventana. */
    ajustarAnchoModales() {
        const modales = $('#admin-modal-device, #admin-modal-baja');

        modales.on('show.bs.modal', function () {
            $(this).css('width', document.documentElement.clientWidth + 'px');
        });

        modales.on('hidden.bs.modal', function () {
            $(this).css('width', '');
        });

        $(window).on('resize', function () {
            modales.filter('.show').css('width', document.documentElement.clientWidth + 'px');
        });
    }

    // ========================================================
    // MODALES
    // ========================================================

    /** Limpia el formulario y abre el modal para registrar un Player. */
    async abrirModalNuevo() {
        try {
            Loading();
            this.idPlayer = null;
            this.numeroSerie = null;

            $('#admin-device-form')[0].reset();
            $('#admin-device-form').removeClass('was-validated');
            $('#admin-device-form .is-invalid, #admin-device-form .is-valid').removeClass('is-invalid is-valid');

            $('#admin-device-id').val('');
            $('#admin-modal-title').text('Nuevo dispositivo');
            $('#admin-modal-identificador').text('');


            $('#admin-security-tab-item').addClass('d-none');
            $('#admin-modal-description').text('Información general del dispositivo.');

            $('#numSerie').prop('disabled', false);
            $('#estatusAdmin-modal').prop('disabled', false);

            // Carga de catalogos para el registro de nuevos players
            await this.cargarSucursalesModal();
            await this.cargarRegionesModal();
            await this.cargarEstatusAdminModal();
            await this.cargarUnidadesAlmacenamientoModal();

            $('#admin-general-tab').tab('show');
            $('#admin-modal-device').modal('show');
        } catch (error) {
            console.error('Error al abrir nuevo dispositivo:', error);
            Alerts.error(Alerts.obtenerMensajeError(error), 'Error al cargar formulario');
        } finally {
            StopLoading();
        }
    }

    /** Prepara el formulario de edición y consulta el Player seleccionado. */
    async abrirModalEditar(idPlayer) {
        if (!idPlayer) return;

        try {
            Loading();
            this.idPlayer = idPlayer;
            this.numeroSerie = null;
            this.puedeGestionarCredencial = false;
            this.estatusToken = null;

            $('#admin-device-form')[0].reset();
            $('#admin-device-form').removeClass('was-validated');
            $('#admin-device-form .is-invalid, #admin-device-form .is-valid').removeClass('is-invalid is-valid');

            $('#admin-modal-title').text('Editar dispositivo');
            $('#admin-modal-identificador').text('ID: PLYR ' + idPlayer);


            $('#admin-security-tab-item').removeClass('d-none');
            $('#admin-modal-description').text('Información general, vinculación y seguridad del dispositivo.');

            $('#numSerie').prop('disabled', true);
            $('#estatusAdmin-modal').prop('disabled', true);

            // Carga de catalogos para la actualización de información de players
            await this.cargarSucursalesModal();
            await this.cargarRegionesModal();
            await this.cargarEstatusAdminModal();
            await this.cargarUnidadesAlmacenamientoModal();

            // Cargar la información del player seleccionado
            // Se envia el id player seleccionado
            await this.consultarPlayerPorId(idPlayer);

        } catch (error) {
            console.error('Error al abrir edición:', error);
            Alerts.error(Alerts.obtenerMensajeError(error), 'Error al cargar información del dispositivo');
        } finally {
            StopLoading();
        }
    }

    /** Abre la confirmación de baja; no modifica el estado en SQL. */
    abrirModalEstado(idPlayer, idEstatus) {

        if (!idPlayer || ![1, 2].includes(Number(idEstatus))) return;

        this.idPlayer = idPlayer;
        this.idEstatus = Number(idEstatus);

        const activar = this.idEstatus === 1;

        // Título y descripción.
        $('#admin-modal-baja-title').text(
            activar ? 'Activar dispositivo' : 'Desactivar dispositivo'
        );

        $('.admin-baja-description').html(
            `¿Confirmas la ${activar ? 'activación' : 'baja administrativa'} de <strong id="admin-baja-player-id"></strong>?`
        );

        $('#admin-baja-player-id').text(`PLYR-${idPlayer}`);

        // Invertir los estados de la transición.
        const estados = $('.admin-baja-state');

        const estadoInicial = estados.eq(0);
        const estadoFinal = estados.eq(1);

        estadoInicial.find('.admin-baja-circle')
            .removeClass('admin-baja-circle--active admin-baja-circle--inactive')
            .addClass(activar ? 'admin-baja-circle--inactive' : 'admin-baja-circle--active');

        estadoFinal.find('.admin-baja-circle')
            .removeClass('admin-baja-circle--active admin-baja-circle--inactive')
            .addClass(activar ? 'admin-baja-circle--active' : 'admin-baja-circle--inactive');

        estadoInicial.find('i')
            .attr('class', activar ? 'fa-solid fa-power-off' : 'fa-regular fa-circle-check');

        estadoFinal.find('i')
            .attr('class', activar ? 'fa-regular fa-circle-check' : 'fa-solid fa-power-off');

        estadoInicial.find('.admin-baja-label')
            .removeClass('admin-baja-label--active admin-baja-label--inactive')
            .addClass(activar ? 'admin-baja-label--inactive' : 'admin-baja-label--active')
            .text(activar ? 'Inactivo' : 'Activo');

        estadoFinal.find('.admin-baja-label')
            .removeClass('admin-baja-label--active admin-baja-label--inactive')
            .addClass(activar ? 'admin-baja-label--active' : 'admin-baja-label--inactive')
            .text(activar ? 'Activo' : 'Inactivo');

        // Mensaje informativo.
        $('.admin-baja-notice').html(
            activar
                ? 'El dispositivo pasará a estado <b>activo</b> y podrá volver a comunicarse con la plataforma y recibir instrucciones remotas.'
                : 'El dispositivo pasará a estado <b>inactivo</b> y dejará de enviar información a la plataforma, así como de recibir y ejecutar instrucciones remotas.'
        );

        // Botón de confirmación.
        $('#admin-confirmar-baja').text(
            activar ? 'Activar' : 'Desactivar'
        );

        $('#admin-modal-baja').modal('show');

    }


}

const AdministracionPlayersCs = new AdministracionPlayers();

$(document).ready(async function () {
    await AdministracionPlayersCs.init();
});







