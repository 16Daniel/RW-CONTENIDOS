/**
 * Configuración de Dispositivos.
 * Primera etapa: consulta, filtros, indicadores, tarjetas y tabla.
 * La persistencia de audio se habilitará cuando existan los endpoints correspondientes.
 */
class ConfigurarDispositivos {
    constructor() {
        this.table = null;
        this.players = [];
        this.vista = 'cards';
        this.consultaVersion = 0;

        // Control de consultas manuales y actualización automática.
        this.consultasManualesActivas = 0;
        this.autoRefreshTimer = null;
        this.autoRefreshEnCurso = false;
        this.autoRefreshIntervalo = 20000;

        this.$modulo = $('#configurar-dispositivos');

        this.raspberryImageUrl = typeof raspberryImageUrl !== 'undefined'
            ? raspberryImageUrl
            : '';
    }

    /** Inicializa los componentes y carga la información existente. */
    async init() {
        this.inicializarTabla();
        this.registrarEventos();
        await this.cargarRegiones();
        await this.cargarEstatusAdmin();
        await this.cargarKPIPlayers();
        await this.cargarPlayers();

        this.iniciarActualizacionAutomatica();
    }

    /** Obtiene una URL desde los atributos existentes de la vista. */
    obtenerUrl(atributo) {
        const url = this.$modulo.attr(atributo);
        if (!url) {
            throw new Error(`No se configuró el endpoint '${atributo}' en la vista.`);
        }
        return url;
    }

    /** Muestra errores conservando el mensaje que devuelve el servidor. */
    mostrarError(error, titulo) {
        console.error(titulo, error);
        const mensaje = typeof error === 'string'
            ? error
            : (typeof Alerts !== 'undefined' && typeof Alerts.obtenerMensajeError === 'function'
                ? Alerts.obtenerMensajeError(error)
                : (error?.responseJSON?.Message || error?.responseText || error?.message || String(error)));
        if (typeof Alerts !== 'undefined' && typeof Alerts.error === 'function') {
            Alerts.error(mensaje, titulo);
        } else {
            console.error(`${titulo}: ${mensaje}`);
        }
    }

    /** Obtiene las regiones reutilizando el catálogo existente. */
    async cargarRegiones() {
        try {
            const response = await $.ajax({
                url: this.obtenerUrl('ObtenerRegiones'),
                type: 'GET',
                dataType: 'json'
            });
            if (response.Status !== 'OK') {
                throw new Error(response.Message || 'La API no devolvió las regiones.');
            }
            const $select = $('#region').empty().append($('<option>', { value: '', text: 'Todas' }));
            (response.Data || []).forEach(region => {
                $select.append($('<option>', {
                    value: region.id_estado,
                    text: `${region.estado} - ${region.abreviatura}`
                }));
            });
        } catch (error) {
            this.mostrarError(error, 'Error al cargar regiones');
        }
    }

    /** Obtiene los estatus administrativos reutilizando el catálogo existente. */
    async cargarEstatusAdmin() {
        try {
            const response = await $.ajax({
                url: this.obtenerUrl('ObtenerEstatusAdmin'),
                type: 'GET',
                dataType: 'json'
            });
            if (response.Status !== 'OK') {
                throw new Error(response.Message || 'La API no devolvió los estatus.');
            }
            const $select = $('#estatus-admin').empty().append($('<option>', {
                value: '', text: 'Todos'
            }));
            (response.Data || []).forEach(estatus => {
                $select.append($('<option>', {
                    value: estatus.id_estatus,
                    text: estatus.estatus
                }));
            });
        } catch (error) {
            this.mostrarError(error, 'Error al cargar estatus');
        }
    }

    /** Actualiza los cuatro indicadores utilizando la consulta existente. */
    async cargarKPIPlayers(esActualizacionAutomatica = false) {

        try {
            const response = await $.ajax({
                url: this.obtenerUrl('ObtenerCifrasKPIPlayersAdmin'),
                type: 'GET',
                dataType: 'json',
                cache: false
            });
            if (response.Status !== 'OK') {
                throw new Error(response.Message || 'La API no devolvió los indicadores.');
            }
            const kpi = response.Data || {};
            $('#players-count-total').text(kpi.total_registrados ?? 0);
            $('#players-count-activos').text(kpi.total_activos ?? 0);
            $('#players-count-inactivos').text(kpi.total_inactivos ?? 0);
            $('#players-count-sin-token').text(kpi.total_sin_token ?? 0);
        } catch (error) {
            if (esActualizacionAutomatica) {
                console.error('Error al actualizar indicadores:', error);
            } else {
                this.mostrarError(error, 'Error al cargar indicadores');
            }
        }
    }

    /**
     * Consulta Players respetando los filtros actuales.
     * Evita que una actualización automática sobrescriba búsquedas manuales.
     */
    async cargarPlayers(esActualizacionAutomatica = false) {

        if (esActualizacionAutomatica && this.consultasManualesActivas > 0) {
            return;
        }

        const versionConsulta = ++this.consultaVersion;

        if (!esActualizacionAutomatica) {
            this.consultasManualesActivas++;
        }

        try {

            if (!esActualizacionAutomatica) {
                Loading();
            }

            const response = await $.ajax({
                url: this.obtenerUrl('ObtenerPlayersConfigDisp'),
                type: 'GET',
                dataType: 'JSON',
                data: {
                    busqueda: $('#buscar').val().trim(),
                    id_estado: $('#region').val() || null,
                    id_estatus_admin: $('#estatus-admin').val() || null
                },
                cache: false
            });

            // Ignorar respuestas anteriores a una búsqueda más reciente.
            if (
                versionConsulta !== this.consultaVersion ||
                (esActualizacionAutomatica && this.consultasManualesActivas > 0)
            ) {
                return;
            }

            if (response.Status !== 'OK') {
                throw new Error(response.Message || 'No se recibió el detalle del error.');
            }

            const paginaActual = this.table.page();

            this.players = response.Data || [];

            this.table.clear();
            this.table.rows.add(this.players);
            this.table.draw(esActualizacionAutomatica ? false : true);

            if (esActualizacionAutomatica) {
                const totalPaginas = this.table.page.info().pages;
                const paginaDestino = Math.min(
                    paginaActual,
                    Math.max(0, totalPaginas - 1)
                );

                if (this.table.page() !== paginaDestino) {
                    this.table.page(paginaDestino).draw('page');
                }
            }

        } catch (error) {

            if (esActualizacionAutomatica) {
                console.error('Error al actualizar dispositivos:', error);
            } else {
                this.mostrarError(error, 'Error al cargar dispositivos');
            }

        } finally {

            if (!esActualizacionAutomatica) {
                this.consultasManualesActivas--;
                StopLoading();
            }
        }
    }

    /** Detiene el temporizador de actualización automática. */
    detenerActualizacionAutomatica() {

        if (this.autoRefreshTimer !== null) {
            clearTimeout(this.autoRefreshTimer);
            this.autoRefreshTimer = null;
        }
    }

    /** Actualiza periódicamente Players y KPI sin interrumpir la edición. */
    iniciarActualizacionAutomatica() {

        this.detenerActualizacionAutomatica();

        const actualizar = async () => {

            // No actualizar mientras la pestaña esté oculta,
            // exista un modal abierto o una consulta manual activa.
            if (
                document.hidden ||
                $('#config-player-modal.show, #config-bulk-modal.show').length > 0 ||
                this.consultasManualesActivas > 0 ||
                this.autoRefreshEnCurso
            ) {
                this.autoRefreshTimer = setTimeout(
                    actualizar,
                    this.autoRefreshIntervalo
                );
                return;
            }

            this.autoRefreshEnCurso = true;

            try {

                await this.cargarKPIPlayers(true);

                if (
                    this.consultasManualesActivas === 0 &&
                    $('#config-player-modal.show, #config-bulk-modal.show').length === 0
                ) {
                    await this.cargarPlayers(true);
                }

            } catch (error) {

                console.error('Error durante la actualización automática:', error);

            } finally {

                this.autoRefreshEnCurso = false;

                this.autoRefreshTimer = setTimeout(
                    actualizar,
                    this.autoRefreshIntervalo
                );
            }
        };

        this.autoRefreshTimer = setTimeout(
            actualizar,
            this.autoRefreshIntervalo
        );
    }

    /** DataTables administra la paginación de ambas presentaciones. */
    inicializarTabla() {
        if (!$.fn.DataTable) {
            throw new Error('DataTables no está disponible en la página.');
        }
        const self = this;
        this.table = $('#config-devices-table').DataTable({
            data: [],
            paging: true,
            pageLength: Number($('#config-page-size').val()) || 12,
            lengthChange: false,
            searching: false,
            ordering: false,
            info: false,
            autoWidth: false,
            dom: 't',
            language: { emptyTable: 'No se encontraron dispositivos.' },
            columns: [
                {
                    data: 'id_player',
                    render: function (data, type, row) {
                        const nombre = `PLYR-${data}`;
                        const sucursal = row.sucursal?.trim() || 'Por asignar';
                        if (type !== 'display') return `${nombre} ${sucursal}`;
                        return `<div class="d-flex flex-column align-items-center gap-1">
                            <span class="admin-player-identity">
                                <span class="admin-player-icon"><i class="fa-solid fa-desktop"></i></span>
                                <span class="admin-player-code">${self.escapeHTML(nombre)}</span>
                            </span>
                            <span class="text-muted small">
                                <i class="fa-solid fa-location-dot me-1"></i>${self.escapeHTML(sucursal)}
                            </span>
                        </div>`;
                    }
                },
                {
                    data: 'direccion_mac',
                    render: data => self.escapeHTML(data || 'Por asignar')
                },
                {
                    data: 'numero_serie',
                    render: data => self.escapeHTML(data || '-')
                },
                {
                    data: 'estado',
                    render: data => `<span class="admin-player-region">
                        <i class="fa-solid fa-location-dot"></i>
                        <span>${self.escapeHTML(data || 'Sin región')}</span>
                    </span>`
                },
                {
                    data: 'id_estatus_admin',
                    className: 'text-center',
                    render: function (data) {
                        const estatus = Number(data);

                        const clase = estatus === 1 ? 'active'
                            : estatus === 2 ? 'inactive'
                                : 'suspended';

                        const texto = estatus === 1 ? 'Activo'
                            : estatus === 2 ? 'Inactivo'
                                : 'Suspendido';

                        return `<span class="status ${clase}">${texto}</span>`;
                    }
                },
                {
                    data: null,
                    orderable: false,
                    searchable: false,
                    render: (_data, _type, row) => `
                    <button type="button"
                            class="configurar-action configurar-detail-action"
                            data-detail="${Number(row.id_player)}"
                            title="Ver detalles">
                        <i class="fa-solid fa-circle-info"></i>
                    </button>`
                }
            ],
            drawCallback: () => this.actualizarVista()
        });
    }

    /** Genera las tarjetas con jQuery append(), sin plantillas externas. */
    renderizarTarjetas() {
        const $grid = $('#config-device-grid').empty();
        const filas = this.table.rows({ page: 'current' }).data().toArray();

        filas.forEach(player => {
            const id = Number(player.id_player);
            const nombre = `PLYR-${id}`;
            const sucursal = player.sucursal || 'Por asignar';
            const estatus = String(player.estatus_administracion || '').toLowerCase();
            const clase = estatus === 'activo' ? 'active'
                : estatus === 'inactivo' ? 'inactive' : 'suspended';

            const $card = $('<article>', { class: 'm-card device-card card-hover' });
            $card.append(`
                <div class="device-top">
                    <span class="status ${clase}">${this.escapeHTML(player.estatus_administracion || 'Sin estatus')}</span>
                </div>
                <div class="device-illustration">
                   <img src="${this.escapeHTML(this.raspberryImageUrl)}"
                         alt="Raspberry Pi"
                         class="img-disp">
                </div>
                
                <h3 class="device-name">${this.escapeHTML(player.sucursal)}</h3>
                 <div class="device-id">
                    PLYR-${this.escapeHTML(player.id_player)}
                </div>

                <div class="device-details">
                    <div class="detail">

                        <i class="fa-solid fa-link"></i>

                        <div>
                            <div class="detail-label fw-bold">MAC</div>
                            <div class="detail-value">
                                ${this.escapeHTML(player.direccion_mac || 'Por asignar')}
                            </div>
                        </div>

                    </div>

                    <div class="detail">

                        <i class="fa-solid fa-network-wired"></i>

                        <div>
                            <div class="detail-label fw-bold">Región</div>
                            <div class="detail-value">
                                ${this.escapeHTML(player.estado || 'Por asignar')}
                            </div>
                        </div>

                    </div>

                    <div class="detail">

                        <i class="fa-solid fa-circle-play"></i>

                        <div>
                            <div class="detail-label fw-bold">Contenido</div>
                            <div class="detail-value">
                                ${this.escapeHTML(player.ultimo_contenido_reportado || 'Por asignar')}
                            </div>
                        </div>

                    </div>
                </div>
                <button type="button" class="m-btn m-btn--ghost detail-btn config-btn-player"
                    data-id="${id}">
                    <i class="fa-solid fa-gear me-2"></i>Configurar
                </button>
            `);
            $grid.append($card);
        });
    }

    /** Actualiza contador, tarjetas y navegación de acuerdo con DataTables. */
    actualizarVista() {
        if (!this.table) return;
        const info = this.table.page.info();
        $('#config-result-count').text(`${info.recordsDisplay} resultados`);
        $('#config-pagination-info').text(info.recordsDisplay
            ? `Mostrando ${info.start + 1}–${info.end} de ${info.recordsDisplay} dispositivos`
            : 'Mostrando 0 de 0 dispositivos');

        this.renderizarTarjetas();
        this.renderizarPaginacion(info);
        $('#config-empty').toggleClass('d-none', info.recordsDisplay !== 0);
    }

    /** Crea paginación acotada para listados extensos. */
    renderizarPaginacion(info) {
        const $paginas = $('#config-pagination').empty();
        const crear = (texto, pagina, activo, disabled) => $('<button>', {
            type: 'button',
            text: texto,
            'data-page': pagina,
            class: activo ? 'active' : '',
            'aria-current': activo ? 'page' : null
        }).prop('disabled', disabled);

        $paginas.append(crear('‹', info.page - 1, false, info.page === 0));
        const inicio = Math.max(0, Math.min(info.page - 2, info.pages - 5));
        const fin = Math.min(info.pages, inicio + 5);
        for (let i = inicio; i < fin; i++) {
            $paginas.append(crear(String(i + 1), i, i === info.page, false));
        }
        $paginas.append(crear('›', info.page + 1, false, info.pages === 0 || info.page >= info.pages - 1));
    }

    /** Alterna la vista de tarjetas o tabla sin consultar nuevamente la API. */
    cambiarVista(vista) {

        this.vista = vista;

        $('#config-device-grid').toggleClass('d-none', vista !== 'cards');
        $('#config-table-container').toggleClass('d-none', vista !== 'table');

        $('#config-view-grid')
            .toggleClass('selected', vista === 'cards')
            .attr('aria-pressed', vista === 'cards');

        $('#config-view-table')
            .toggleClass('selected', vista === 'table')
            .attr('aria-pressed', vista === 'table');

        if (vista === 'table') {
            this.table.columns.adjust();
        }
    }

    /** Abre el modal y consulta la configuración actual del Player (individual). */
    async abrirConfiguracion(id) {
        const player = this.players.find(p => Number(p.id_player) === Number(id));
        if (!player) return;

        $('#config-player-id').val(id);
        $('#config-player-modal-title').text(`Configuración de PLYR-${id}`);
        $('#config-player-description').text(player.sucursal || player.numero_serie || '');

        // Limpiar la selección anterior.
        $('input[name="config-audio-output"]').prop('checked', false);
        $('#config-save-player').prop('disabled', true);
        $('#config-player-apply-status').text('Consultando configuración...');

        $('#config-player-modal').modal('show');

        try {
            const response = await $.ajax({
                url: this.obtenerUrl('ObtenerConfiguracionPlayer'),
                type: 'GET',
                dataType: 'json',
                data: { id_player: id },
                cache: false
            });

            if (response.Status !== 'OK') {
                throw new Error(response.Message || 'No fue posible consultar la configuración.');
            }

            const idAudio = response.Data?.id_audio;

            // Seleccionar la salida registrada, si existe.
            if (idAudio != null) {
                $(`input[name="config-audio-output"][value="${Number(idAudio)}"]`)
                    .prop('checked', true);
            }

            $('#config-player-apply-status').text(
                idAudio == null
                    ? 'Este Player todavía no tiene una salida de audio configurada.'
                    : 'Configuración de audio registrada.'
            );

            $('#config-save-player').prop('disabled', false);

        } catch (error) {
            this.mostrarError(error, 'Error al consultar configuración');

            $('#config-player-apply-status').text(
                'No fue posible cargar la configuración.'
            );
        }
    }

    /** Guarda la configuración de audio seleccionada para el Player (individual) */
    async guardarConfiguracionPlayer() {
        const idPlayer = Number($('#config-player-id').val());
        const idAudio = Number(
            $('input[name="config-audio-output"]:checked').val()
        );

        if (!idAudio) {
            Alerts.error('Selecciona una salida de audio.', 'Configuración');
            return;
        }

        // Advertir cuando el Player está administrativamente inactivo.
        const player = this.players.find(
            p => Number(p.id_player) === idPlayer
        );

        if (Number(player?.id_estatus_admin) === 2) {

            const confirmado = await Alerts.confirm(
                `El dispositivo <b>PLYR-${idPlayer}</b> se encuentra administrativamente <b>Inactivo</b>.<br><br>
                 La configuración se guardará y será aplicada cuando el player vuelva a estar activo.<br><br>
                 ¿Deseas guardar la configuración de todas formas?`,
                'Dispositivo inactivo',
                'Sí, guardar',
                true
            );

            if (!confirmado) {
                return;
            }
        }

        try {
            Loading();
            $('#config-save-player').prop('disabled', true);

            const response = await $.ajax({
                url: this.obtenerUrl('GuardarConfiguracionPlayer'),
                type: 'POST',
                dataType: 'json',
                data: {
                    id_player: idPlayer,
                    id_audio: idAudio
                }
            });

            if (response.Status !== 'OK') {
                throw new Error(response.Message || 'No fue posible guardar la configuración.');
            }

            $('#config-player-modal').modal('hide');

            Alerts.success(response.Message, 'Configuración');

        } catch (error) {
            this.mostrarError(error, 'Error al guardar configuración');

        } finally {
            StopLoading();
            $('#config-save-player').prop('disabled', false);
        }
    }

    /**
     * Guarda masivamente la configuración de audio.
     * Incluye todos los Players registrados, independientemente
     * de su estado administrativo o de conexión.
     */
    async guardarConfiguracionMasivaPlayer() {
        const idAudio = Number(
            $('input[name="config-bulk-audio"]:checked').val()
        );

        if (!idAudio) {
            Alerts.error('Selecciona una salida de audio.', 'Configuración masiva');
            return;
        }

        // Obtener el nombre de la salida de audio seleccionada.
        const salidaAudio = $('input[name="config-bulk-audio"]:checked')
            .closest('.config-audio-option')
            .find('.config-audio-option-title')
            .text()
            .trim();

        // Solicitar confirmación antes de aplicar el cambio masivo.
        const confirmado = await Alerts.confirm(
            `Estás a punto de aplicar la salida de audio <b>${salidaAudio}</b> a <b>todos los Players</b> registrados, incluidos los inactivos.<br><br>
             <b>Esta acción reemplazará la configuración individual de audio de cada dispositivo.</b><br><br>
             ¿Deseas continuar?`,
            '¿Confirmar configuración masiva?',
            'Sí, aplicar a todos',
            true
        );

        if (!confirmado) {
            return;
        }

        try {
            Loading();
            $('#config-save-bulk').prop('disabled', true);

            const response = await $.ajax({
                url: this.obtenerUrl('GuardarConfiguracionMasivaPlayer'),
                type: 'POST',
                dataType: 'json',
                data: {
                    id_audio: idAudio
                }
            });

            if (response.Status !== 'OK') {
                throw new Error(
                    response.Message || 'No fue posible guardar la configuración masiva.'
                );
            }

            // Cerrar el modal.
            $('#config-bulk-modal').modal('hide');

            // Mostrar el resultado de la operación.
            Alerts.success(
                `${response.Message} Nuevos: ${response.Insertados}. Actualizados: ${response.Actualizados}.`,
                'Configuración masiva'
            );

        } catch (error) {
            this.mostrarError(error, 'Error al guardar configuración masiva');

        } finally {
            StopLoading();
            $('#config-save-bulk').prop('disabled', false);
        }
    }

    /** Asocia los controles existentes de la vista. */
    registrarEventos() {

        $('#buscar, #region, #estatus-admin').on('input change', () => {
            this.consultaVersion++;
        });

        //=================================================================================
        // FILTROS
        //=================================================================================
        // Buscar Players aplicando los filtros en SQL Server.
        $('#buscar-filtros').on('click', async () => {
            await this.cargarPlayers();
        });

        // Buscar al presionar Enter desde cualquiera de los filtros.
        $('#buscar, #region, #estatus-admin').on('keydown', async (event) => {

            if (event.key === 'Enter') {
                event.preventDefault();
                await this.cargarPlayers();
            }

        });

        // Limpiar filtros y consultar todos los Players.
        $('#reestablecer-filtros').on('click', async () => {

            $('#buscar').val('');
            $('#region').val('');
            $('#estatus-admin').val('');

            await this.cargarPlayers();
        });

        //=================================================================================
        // MODALES
        //=================================================================================

        // Abre el modal de configuraciones del player
        this.$modulo.on('click', '.config-btn-player, .configurar-detail-action', e => {
            const id = $(e.currentTarget).attr('data-id') || $(e.currentTarget).attr('data-detail');
            this.abrirConfiguracion(id);
        });

        this.$modulo.on('click', '.configurar-detail-action', e => {
            e.preventDefault();
            e.stopPropagation();

            const id = $(e.currentTarget).attr('data-detail');
            this.abrirConfiguracion(id);
        });

        // Limpiar selección al abrir el modal masivo.
        $('#config-bulk-modal').on('show.bs.modal', () => {
            $('input[name="config-bulk-audio"]').prop('checked', false);
        });

        // Guardar configuración masiva.
        $('#config-save-bulk').on('click', async () => {
            await this.guardarConfiguracionMasivaPlayer();
        });

        //=================================================================================
        // FUNCIONALIDAD
        //=================================================================================

        $('#config-page-size').on('change', e => {
            this.table.page.len(Number($(e.currentTarget).val())).draw();
        });

        $('#config-view-grid').on('click', () => this.cambiarVista('cards'));

        $('#config-view-table').on('click', () => this.cambiarVista('table'));

        $('#config-btn-bulk').on('click', () => {
            $('#config-bulk-audio').val('');
            $('#config-save-bulk').prop('disabled', true);
            bootstrap.Modal.getOrCreateInstance(document.getElementById('config-bulk-modal')).show();
        });

        $(window).on('pagehide', () => this.detenerActualizacionAutomatica());

        // Guardar configuración individual del Player.
        $(document).on('click', '#config-save-player', async () => {
            await this.guardarConfiguracionPlayer();
        });
    }

    // ========================================================
    // UTILIDADES
    // ========================================================

    escapeHTML(value) {

        return String(value ?? '').replace(/[&<>"']/g, character => ({

            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'

        }[character]));

    }

}

const ConfigurarDispositivosCs = new ConfigurarDispositivos();

$(document).ready(async function () {
    await ConfigurarDispositivosCs.init();
});




