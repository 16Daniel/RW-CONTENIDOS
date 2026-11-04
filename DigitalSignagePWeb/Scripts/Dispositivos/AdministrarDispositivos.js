class AdministracionPlayers {
    constructor() {
        this.idPlayer = null;
        this.table = null;
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

        // TABLA
        // Cargar players
        await this.cargarPlayersAdmin();
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
                            : estatus === 2
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

    async cargarPlayersAdmin() {

        try {

            Loading();

            const response = await $.ajax({
                url: $('.main-content-admin-dispositivos').attr('ObtenerPlayersAdmin'),
                type: 'GET',
                dataType: 'JSON',
                cache: false
            });

            if (response.Status === 'OK') {
                // Carga de datos en el datable
                this.table.clear();

                this.table.rows.add(response.Data);

                this.table.draw();

            } else {

                console.error('Error en refresco automático:', response.Message);

                Alerts.error(
                    response.Message || 'No se recibió el detalle del error.',
                    'Error al cargar dispositivos'
                );

            }

        } catch (error) {

            console.error('Error al cargar dispositivos:', error);

            Alerts.error(
                Alerts.obtenerMensajeError(error),
                'Error al cargar dispositivos'
            );

        } finally {

            StopLoading();

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

                $('#admin-device-id').val(player.id_player);
                $('#sucursal').val(player.id_sucursal ?? '');
                $('#numSerie').val(player.numero_serie ?? '');
                $('#region-modal').val(player.id_estado ?? '');
                $('#capacidadAlmacenamiento').val(player.capacidad_almacenamiento ?? '');
                $('#unidadAlmacenamiento-modal').val(player.id_unidad_almacenamiento ?? '');
                $('#estatusAdmin-modal').val(player.id_estatus_admin ?? '');

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


    // ========================================================
    // FUNCIONALIDAD
    // ========================================================

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

    /** Vincula los botones existentes de la vista. se implemententan los eventos */
    bindEvents() {

        //Botones para abrir los modales
        $(document).on('click', '#btn-nuevo-dispositivo', () => this.abrirModalNuevo());

        $(document).on('click', '.btnEditarPlayer', (event) => {

            const boton = $(event.currentTarget);
            boton.tooltip('hide');
            this.abrirModalEditar(boton.data('id'));

        });

        $(document).on('click', '.btnEstadoPlayer', (event) => {

            const boton = $(event.currentTarget);
            boton.tooltip('hide');

            this.abrirModalEstado(boton.data('id'), boton.data('estatus'));

        });
       
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

        $('#admin-btn-search').on('click', () => this.buscar());
        $('#admin-search').on('keydown', (event) => {
            if (event.key === 'Enter') this.buscar();
        });
        $('#admin-btn-clear').on('click', () => {
            $('#admin-search, #admin-filter-status, #admin-filter-token').val('');
            this.table.search('').columns().search('').draw();
        });
        $('#admin-pages').on('click', '[data-page]', (event) => {
            const $button = $(event.currentTarget);
            if ($button.prop('disabled')) return;
            this.table.page(Number($button.attr('data-page'))).draw('page');
        });

        $('#admin-page-size').on('change', (event) => {
            this.table.page.len(Number($(event.currentTarget).val())).draw();
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

            $('#admin-device-form')[0].reset();
            $('#admin-device-form').removeClass('was-validated');
            $('#admin-device-form .is-invalid, #admin-device-form .is-valid').removeClass('is-invalid is-valid');

            $('#admin-device-id').val('');
            $('#admin-modal-title').text('Nuevo dispositivo');
            $('#admin-modal-identificador').text('');
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

            $('#admin-device-form')[0].reset();
            $('#admin-device-form').removeClass('was-validated');
            $('#admin-device-form .is-invalid, #admin-device-form .is-valid').removeClass('is-invalid is-valid');

            $('#admin-modal-title').text('Editar dispositivo');
            $('#admin-modal-identificador').text('ID: PLYR ' + idPlayer);
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







