
'use strict';

class Monitoreo {

    // ========================================================
    // CONSTRUCTOR
    // ========================================================

    constructor() {

        this.devices = [];
        this.estatusPlayers = [];

        this.currentPage = 1;
        this.view = 'grid';

        this.filters = {
            search: '',
            region: '',
            estatus: ''
        };

        this.raspberryImageUrl = typeof raspberryImageUrl !== 'undefined'
            ? raspberryImageUrl
            : '';

        this.comandoActualId = null;

        this.progresoTimer = null;
        this.consultandoProgreso = false;
        this.solicitudFinalizada = false;
        // Inicializa las variables para refrescar la pantalla en automatico
        this.refrescoTimer = null;
        this.consultandoPlayers = false;
    }


    // ========================================================
    // INICIALIZACIÓN
    // ========================================================

    async init() {

        try {

            this.bindEvents();

            await this.cargarRegiones();
            await this.cargarEstatusPlayer();
            await this.cargarPlayers();
            await this.recuperarComandoPlayerActivo();

            // Iniciar el intervalo para refrescar la informacion cada minuto
            this.iniciarRefrescoAutomatico();

            this.updateCounters();
            this.render();

        } catch (error) {

            console.error('Error al inicializar Monitoreo:', error);

        }

    }

    // ========================================================
    // CONSULTA DE PLAYERS
    // ========================================================

    async cargarPlayers(automatico = false) {
        // Evitar consultas simultaneas
        if (this.consultandoPlayers) {
            return;
        }

        this.consultandoPlayers = true;

        try {
            // El indicador de carga se conserva para las operaciones normales, pero no aparece cada minuto durante el refresco automático.
            if (!automatico) {
                Loading();
            }

            const response = await $.ajax({
                url: $('.main-content-monitoreo').attr('ObtenerPlayers'),
                type: 'GET',
                dataType: 'JSON',
                cache: false
            });

            if (response.Status === 'OK') {

                this.devices = response.Data.map(player => new Players(player));

                // Esta modificación, cuando se actualice automáticamente, conservará la página que estás visualizando.
                if (!automatico) {
                    this.currentPage = 1;
                }

                this.updateCounters();
                this.render();

            } else {
                // Evitar alertas repetidas en el refresco automático
                if (automatico) {
                    console.error('Error en refresco automático:', response.Message);
                } else {
                    Alerts.error(
                        response.Message || 'No se recibió el detalle del error.',
                        'Error al cargar dispositivos'
                    );
                }

            }

        } catch (error) {

            console.error('Error al cargar dispositivos:', error);

            // Evitar alertas durante el refresco automático.
            if (!automatico) {

                Alerts.error(
                    Alerts.obtenerMensajeError(error),
                    'Error al cargar dispositivos'
                );

            }

        } finally {

            this.consultandoPlayers = false;

            if (!automatico) {
                StopLoading();
            }

        }


    }

    /**
    * Inicia la actualización automática de los dispositivos.
    *
    * Consulta la información almacenada en SQL Server sin generar
    * comandos REPORTAR_INFO ni interferir con su seguimiento.
    */
    iniciarRefrescoAutomatico() {

        if (this.refrescoTimer !== null) {
            clearInterval(this.refrescoTimer);
        }

        const segundos = Number(
            $('.main-content-monitoreo').attr('RefreshIntervalSeconds')
        );

        if (!Number.isFinite(segundos) || segundos <= 0) {
            console.error('Intervalo de refresco de Monitoreo no válido.');
            return;
        }

        this.refrescoTimer = setInterval(() => {

            if (!this.consultandoPlayers && !document.hidden) {
                this.cargarPlayers(true);
            }

        }, segundos * 1000);

    }

    // ========================================================
    // FILTROS - CATÁLOGOS
    // ========================================================

    async cargarRegiones() {

        try {

            Loading();

            const response = await $.ajax({
                url: $('.main-content-monitoreo').attr('ObtenerRegiones'),
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

    async cargarEstatusPlayer() {

        try {

            Loading();

            const response = await $.ajax({
                url: $('.main-content-monitoreo').attr('ObtenerEstatusPlayer'),
                type: 'GET',
                dataType: 'JSON'
            });

            if (response.Status === 'OK') {

                this.estatusPlayers = response.Data;

                const select = $('#estatus');

                select.empty();
                select.append('<option value="">Todos</option>');

                this.estatusPlayers.forEach(estatus => {

                    select.append(
                        $('<option>', {
                            value: estatus.id_estatus_player,
                            text: estatus.estatus_player
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

    // ========================================================
    // FILTRADO
    // ========================================================

    search() {

        this.filters = {
            search: String($('#search').val() || '').toLowerCase().trim(),
            region: $('#region').val() || '',
            estatus: $('#estatus').val() || ''
        };

        this.currentPage = 1;
        this.render();

    }

    clearFilters() {

        $('#search').val('');
        $('#region').val('');
        $('#estatus').val('');

        this.filters = {
            search: '',
            region: '',
            estatus: ''
        };

        this.currentPage = 1;
        this.render();

    }

    getFilteredDevices() {

        const filters = this.filters;

        return this.devices.filter(device => {

            const matchesSearch = !filters.search || [
                "PLYR-" + device.id_player,
                device.sucursal,
                device.direccion_mac,
                device.ip_player
            ].some(value =>
                String(value ?? '').toLowerCase().includes(filters.search)
            );

            const matchesRegion =
                !filters.region ||
                String(device.id_estado) === String(filters.region);

            const matchesStatus =
                !filters.estatus ||
                String(device.id_estatus_player) === String(filters.estatus);

            return (
                matchesSearch &&
                matchesRegion &&
                matchesStatus
            );

        });

    }

    // ========================================================
    // CONTADORES
    // ========================================================

    updateCounters() {

        // Total de dispositivos registrados
        $('#count-total').text(this.devices.length);

        // Relación entre los estatus de SQL Server y los KPI del HTML
        const estatusKPI = {
            1: '#count-online',
            2: '#count-offline',
            3: '#count-unknown'
        };

        this.estatusPlayers.forEach(estatus => {

            const count = this.devices.filter(
                device =>
                    String(device.id_estatus_player) ===
                    String(estatus.id_estatus_player)
            ).length;

            const selector = estatusKPI[estatus.id_estatus_player];

            if (selector) {
                $(selector).text(count);
            }

        });

    }

    // ========================================================
    // EVENTOS
    // ========================================================

    bindEvents() {

        $('#btn-search').on('click', () => {
            this.search();
        });

        $('#search').on('keydown', event => {

            if (event.key === 'Enter') {

                event.preventDefault();
                this.search();

            }

        });

        $('#clear').on('click', () => {
            this.clearFilters();
        });

        $('#page-size').on('change', () => {

            this.currentPage = 1;
            this.render();

        });        

        $('#grid-btn').on('click', () => {

            this.view = 'grid';
            this.render();

        });

        $('#table-btn').on('click', () => {

            this.view = 'table';
            this.render();

        });

        $('#sidebar-toggle').on('click', () => {

            document.body.classList.toggle('sidebar-open');

        });

        $('#devices').on('click', '[data-detail]', event => {

            const id = $(event.currentTarget).attr('data-detail');

            this.openModal(id);

        });

        $('#pages').on('click', '[data-page]', event => {

            const button = event.currentTarget;

            if (button.disabled) {
                return;
            }

            this.currentPage = Number($(button).attr('data-page'));
            this.render();

        });


    }
        
    // ========================================================
    // RENDERIZADO PRINCIPAL
    // ========================================================

    render() {

        const list = this.getFilteredDevices();

        const size = Number($('#page-size').val()) || 12;

        const totalPages = Math.max(
            1,
            Math.ceil(list.length / size)
        );

        this.currentPage = Math.max(
            1,
            Math.min(this.currentPage, totalPages)
        );

        const start = (this.currentPage - 1) * size;
        const page = list.slice(start, start + size);

        $('#result-count').text(list.length + ' resultados');

        $('#grid-btn').toggleClass(
            'selected',
            this.view === 'grid'
        );

        $('#table-btn').toggleClass(
            'selected',
            this.view === 'table'
        );

        if (page.length === 0) {

            $('#devices').html(`
                <div class="empty">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <p>No se encontraron dispositivos con esos filtros.</p>
                </div>
            `);

        } else if (this.view === 'grid') {

            this.renderGrid(page);

        } else {

            this.renderTable(page);

        }

        this.renderPagination(list.length, size, totalPages);

    }

    // ========================================================
    // VISTA DE TARJETAS
    // ========================================================

    renderGrid(devices) {

        const cards = devices.map(
            device => this.createCard(device)
        ).join('');

        $('#devices').html(`
            <div class="device-grid">
                ${cards}
            </div>
        `);

    }

    createCard(device) {

        return `
            <article class="m-card device-card card-hover">

                <div class="device-top">

                    <span class="status ${this.getStatusClass(device.estatus_player)}">
                        ${this.escapeHTML(device.estatus_player)}
                    </span>

                    <span class="status ${this.getEstadoSincronizacion(device.estado_sincronizacion)}">
                    
                        ${this.escapeHTML(device.estado_sincronizacion)}
                    </span>

                </div>

                <div class="device-illustration">
                    <img src="${this.escapeHTML(this.raspberryImageUrl)}"
                         alt="Raspberry Pi"
                         class="img-disp">
                </div>

                <h3 class="device-name">
                    ${this.escapeHTML(device.sucursal)}
                </h3>

                <div class="device-id">
                    PLYR-${this.escapeHTML(device.id_player)}
                </div>

                <div class="device-details">

                    <div class="detail">

                        <i class="fa-solid fa-link"></i>

                        <div>
                            <div class="detail-label fw-bold">MAC</div>
                            <div class="detail-value">
                                ${this.escapeHTML(device.direccion_mac || 'Por asignar')}
                            </div>
                        </div>

                    </div>

                    <div class="detail">

                        <i class="fa-solid fa-network-wired"></i>

                        <div>
                            <div class="detail-label fw-bold">Región</div>
                            <div class="detail-value">
                                ${this.escapeHTML(device.estado)}
                            </div>
                        </div>

                    </div>

                    <div class="detail">

                        <i class="fa-solid fa-circle-play"></i>

                        <div>
                            <div class="detail-label fw-bold">Contenido</div>
                            <div class="detail-value">
                                ${this.escapeHTML(device.ultimo_contenido_reportado || 'Por asignar')}
                            </div>
                        </div>

                    </div>

                </div>

                <button type="button"
                        class="m-btn m-btn--ghost detail-btn"
                        data-detail="${this.escapeHTML(device.id_player)}">

                    <i class="fa-solid fa-eye"></i>
                    &nbsp; Ver detalles

                </button>

            </article>
        `;

    }

    // ========================================================
    // VISTA DE TABLA
    // ========================================================


    renderTable(devices) {

        const rows = devices.map(device => `
            <tr class="align-middle">

                <td class="text-center">
                    <div class="d-flex flex-column align-items-center gap-1">

                        <span class="admin-player-identity">
                            <span class="monitor-player-icon">
                                <i class="fa-solid fa-desktop"></i>
                            </span>

                            <span class="monitor-player-code">
                                PLYR-${this.escapeHTML(device.id_player)}
                            </span>
                        </span>

                        <span class="text-muted small">
                            <i class="fa-solid fa-location-dot me-1"></i>
                            ${this.escapeHTML(device.sucursal || 'Por asignar')}
                        </span>

                    </div>
                </td>

                <td class="text-center">
                    ${this.escapeHTML(device.direccion_mac || 'Por asignar') }
                </td>

                <td class="text-center">
                    <span class="monitor-player-region">
                        <i class="fa-solid fa-location-dot"></i>
                        <span>${this.escapeHTML(device.estado)}</span>
                    </span>
                </td>

                <td class="text-center">
                    ${this.escapeHTML(device.ultimo_contenido_reportado || 'Por asignar')}
                </td>

                <td class="text-center">
                    <span class="status ${this.getEstadoSincronizacion(device.estado_sincronizacion)}">
                        ${this.escapeHTML(device.estado_sincronizacion)}
                    </span>
                </td>

                <td class="text-center">
                    <span class="status ${this.getStatusClass(device.estatus_player)}">
                        ${this.escapeHTML(device.estatus_player)}
                    </span>
                </td>

                <td class="text-center">
                    <button type="button"
                            class=" monitor-action monitor-detail-action"
                            data-detail="${this.escapeHTML(device.id_player)}"
                            title="Ver detalles">
                        <i class="fa-solid fa-circle-info"></i>
                    </button>
                    
                </td>

            </tr>
        `).join('');

            $('#devices').html(`
            <div class="m-card table-wrap">

                <table class="m-table devices-table">

                    <thead>
                        <tr>
                            <th class="text-center">Dispositivo</th>
                            <th class="text-center">MAC</th>
                            <th class="text-center">Región</th>
                            <th class="text-center">Contenido</th>
                            <th class="text-center">Estado</th>
                            <th class="text-center">Estatus</th>
                            <th class="text-center">Acción</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${rows}
                    </tbody>

                </table>

            </div>
        `);

    }

    // ========================================================
    // PAGINACIÓN
    // ========================================================

    renderPagination(total, size, totalPages) {

        const start = (this.currentPage - 1) * size + 1;

        const end = Math.min(
            this.currentPage * size,
            total
        );

        $('#page-caption').text(
            total > 0
                ? `Mostrando ${start}–${end} de ${total} dispositivos`
                : '0 dispositivos'
        );

        let buttons = `
            <button type="button"
                    data-page="${this.currentPage - 1}"
                    ${this.currentPage === 1 ? 'disabled' : ''}
                    aria-label="Anterior">
                ‹
            </button>
        `;

        for (let page = 1; page <= totalPages; page++) {

            buttons += `
                <button type="button"
                        data-page="${page}"
                        class="${page === this.currentPage ? 'active' : ''}">
                    ${page}
                </button>
            `;

        }

        buttons += `
            <button type="button"
                    data-page="${this.currentPage + 1}"
                    ${this.currentPage === totalPages ? 'disabled' : ''}
                    aria-label="Siguiente">
                ›
            </button>
        `;

        $('#pages').html(buttons);

    }


    // ========================================================
    // MODAL DE DETALLES
    // ========================================================

    openModal(id_player) {

        const device = this.devices.find(
            item => String(item.id_player) === String(id_player)
        );

        if (!device) {
            return;
        }

        const details = [
            ['ID', "PLYR -" + device.id_player],
            ['Sucursal', device.sucursal],
            ['Modelo', device.modelo_player],
            ['Dirección IP', device.ip_player],
            ['Dirección MAC', device.direccion_mac],
            ['Región', device.estado],
            ['Contenido', device.ultimo_contenido_reportado],
            ['Playlist', device.ultima_playlist_reportada],
            ['Estado conexión', device.estatus_player],           
            ['Reproducción', device.estado_reproduccion],
            ['Último reporte', this.formatDate(device.ultima_fecha_comunicacion)]
        ];

        const rows = details.map(([label, value]) => `
            <div class="modal-row">

                <span>
                    ${this.escapeHTML(label)}
                </span>

                <strong>
                    ${this.escapeHTML(value)}
                </strong>

            </div>
        `).join('');

        const storage = this.getStorageInfo(
            device.ultimo_espacio_disponible,
            device.capacidad_almacenamiento
        );

        let almacenamientoHTML = '';

        if (storage) {

            const unidad = this.escapeHTML(device.unidad_almacenamiento || 'GB');

            almacenamientoHTML = `
                <div class="mt-4 progressBar-content">

                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="fw-semibold">Almacenamiento</span>
                        <span class="small text-muted">
                            ${storage.utilizado.toFixed(2)} ${unidad} / ${storage.total.toFixed(2)} ${unidad}
                        </span>
                    </div>

                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar ${storage.color} progress-bar-striped progress-bar-animated"
                             role="progressbar"
                             style="width: ${storage.porcentaje}%;"
                             aria-valuenow="${storage.porcentaje}"
                             aria-valuemin="0"
                             aria-valuemax="100">
                        </div>
                    </div>

                    <div class="d-flex justify-content-between mt-2">
                        <small class="text-muted">
                            ${storage.disponible.toFixed(2)} ${unidad} disponibles
                        </small>
                        <small class="text-muted">
                            ${storage.porcentaje.toFixed(1)}% utilizado
                        </small>
                    </div>

                </div>
            `;
        }

        $('#modal-title').text(device.sucursal || 'Detalle del dispositivo');
        $('#modal-body').html(rows + almacenamientoHTML);



        // Abrir modal con Bootstrap
        const modalElement = document.getElementById('modal-detallesPlayer');

        // Colocar el modal directamente dentro del body
        if (modalElement.parentElement !== document.body) {
            document.body.appendChild(modalElement);
        }

        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);

        modal.show();

    }

    closeModal() {

        const modalElement = document.getElementById('modal-detallesPlayer');
        const modal = bootstrap.Modal.getInstance(modalElement);

        if (modal) {
            modal.hide();
        }

    }


    // ========================================================
    // MODALES
    // ========================================================

    /**
    * Crea una solicitud de actualización de información
    * para los Players registrados.
    */
    async crearSolicitudActualizacion() {
        const $btn = $('#refresh');

        try {
            $btn.prop('disabled', true);

            const response = await $.ajax({
                url: $('.main-content-monitoreo').attr('CrearComandoPlayer'),
                type: 'POST',
                dataType: 'json',
                data: {
                    codigo_tipo_comando: 'REPORTAR_INFO',
                    codigo_alcance: 'GLOBAL'
                }
            });

            if (response.Status !== 'OK') {
                throw new Error(response.Message || 'No se pudo crear la solicitud.');
            }

            const data = response.Data;
            this.solicitudFinalizada = false;

            this.comandoActualId = data.id_comando_player;

            

            $('#progreso-solicitud').text(`Solicitud #${this.comandoActualId}`);
            $('#progreso-total').text(data.total_players);

            const modalElement = document.getElementById('modal-progreso-comando');
            const modal = bootstrap.Modal.getOrCreateInstance(modalElement);

            modal.show();

            // Consultar inmediatamente el estado de la solicitud.
            await this.consultarProgresoComando();

            // Iniciar consultas periódicas si la solicitud sigue activa.
            if (this.progresoTimer === null &&
                !this.solicitudFinalizada) {
                this.iniciarConsultaProgreso();
            }
          

        } catch (error) {
            console.error('Error al crear la solicitud:', error);

            Alerts.error(
                Alerts.obtenerMensajeError(error),
                'Error al crear solicitud'
            );

        } finally {
            $btn.prop('disabled', false);
        }
    }

    /**
    * Consulta el progreso de una solicitud de actualización
    * utilizando su identificador.
    */
    async consultarProgresoComando() {

        //Se protege para que no envíe otra petición mientras la anterior sigue ejecutándose.
        if (this.consultandoProgreso) {
            return;
        }

        this.consultandoProgreso = true;

        try {
            if (!this.comandoActualId) {
                throw new Error('No existe una solicitud para consultar.');
            }
                        
            const response = await $.ajax({
                url: $('.main-content-monitoreo').attr('ObtenerProgresoComandoPlayer'),
                type: 'GET',
                dataType: 'json',
                data: {
                    id_comando_player: this.comandoActualId
                }
            });

            if (response.Status !== 'OK') {
                throw new Error(response.Message || 'No se pudo consultar el progreso.');
            }

            const data = response.Data;

            // Actualizar los indicadores del modal.
            $('#progreso-total').text(data.total_players);
            $('#progreso-pendientes').text(data.pendientes);
            $('#progreso-en-proceso').text(data.en_proceso);
            $('#progreso-completados').text(data.completados);
            $('#progreso-errores').text(data.errores);
            $('#progreso-expirados').text(data.expirados);

            // Calcular el porcentaje de dispositivos finalizados.
            const porcentaje = data.total_players > 0
                ? Math.round((data.finalizados / data.total_players) * 100)
                : 0;

            // Actualizar el porcentaje y la barra de progreso.
            $('#progreso-porcentaje').text(`${porcentaje}%`);

            const esperando = porcentaje === 0 && data.estatus_general !== 'Finalizado';

            $('#progreso-contenedor')
                .toggleClass('progress-indeterminate', esperando);

            $('#progreso-barra')
                .css('width', `${porcentaje}%`);

            $('#progreso-contenedor').attr('aria-valuenow', porcentaje);

            // Mostrar el estado general de la solicitud.
            $('#progreso-estado').text(this.formatearEstatus(data.estatus_general));

            // Detiene el temporizador cuando termine la solicitud
            // Con esto, cuando todos los Players hayan terminado, se deja de consultar innecesariamente.
            if (data.estatus_general === 'Finalizado' ||
                (data.total_players > 0 && data.finalizados >= data.total_players)) {

                this.solicitudFinalizada = true;
                this.detenerConsultaProgreso();

                
                // Recargar las tarjetas con la información actualizada.
                await this.cargarPlayers();
            }

        } catch (error) {
            console.error('Error al consultar el progreso:', error);

            Alerts.error(
                Alerts.obtenerMensajeError(error),
                'Error al consultar progreso'
            );
        } finally {
            this.consultandoProgreso = false;
        }
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

    getStatusClass(estatus_player) {

        switch (estatus_player) {

            case "En línea":
                return 'online';

            case "Sin conexión":
                return 'offline';

            case "Sin reporte":
                return 'no-report';

            default:
                return '';
        }

    }

    getEstadoSincronizacion(estado_sincronizacion) {

        switch (estado_sincronizacion) {

            case "Sincronizado":
                return 'sincronizado';

            case "Actualizando":
                return 'actualizando';

            case "Pendiente":
                return 'pendiente';

            case "Error":
                return 'error';

            default:
                return '';
        }

    }

    // Formatear fechas
    formatDate(fecha) {
        if (!fecha) return 'Sin información';

        const date = new Date(fecha);

        if (isNaN(date.getTime())) return 'Fecha inválida';

        return date.toLocaleString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    // Calculo para progressbar de almacenamiento
    getStorageInfo(disponible, total) {

        disponible = Number(disponible);
        total = Number(total);

        if (!Number.isFinite(disponible) ||
            !Number.isFinite(total) ||
            total <= 0) {
            return null;
        }

        const utilizado = Math.max(0, total - disponible);

        const porcentaje = Math.min(
            100,
            Math.max(0, (utilizado / total) * 100)
        );

        const color = porcentaje >= 90
            ? 'bg-danger'
            : porcentaje >= 75
                ? 'bg-warning'
                : 'bg-success';

        return {
            disponible,
            total,
            utilizado,
            porcentaje,
            color
        };
    }

    /**
    * Formatea el nombre de un estatus para mostrarlo en la interfaz.
    *
    * @param {string} estatus - Estatus recibido desde el servidor.
    * @returns {string} Estatus con formato legible.
    */
    formatearEstatus(estatus) {
        if (!estatus) {
            return '';
        }

        return estatus.replaceAll('_', ' ');
    }

    /**
    * Inicia la consulta automática del progreso cada 3 segundos.
    */
    iniciarConsultaProgreso() {
        this.detenerConsultaProgreso();

        this.progresoTimer = setInterval(() => {
            if (!this.consultandoProgreso) {
                this.consultarProgresoComando();
            }
        }, 3000);
    }

    /**
    * Detiene las consultas automáticas del progreso.
    */
    detenerConsultaProgreso() {
        if (this.progresoTimer !== null) {
            clearInterval(this.progresoTimer);
            this.progresoTimer = null;
        }
    }

    /**
    * Recupera la solicitud activa y vigente de un tipo de comando Player.
    *
    * Permite continuar el seguimiento de una solicitud después de recargar
    * la página, sin generar un nuevo comando.
    *
    * @returns {Promise<void>}
    */
    async recuperarComandoPlayerActivo() {

        try {

            const response = await $.ajax({
                url: $('.main-content-monitoreo').attr('ObtenerComandoPlayerActivo'),
                type: 'GET',
                dataType: 'json',
                data: {
                    codigo_tipo_comando: 'REPORTAR_INFO'
                }
            });

            // Validar el resultado devuelto por el Controller.
            if (response.Status !== 'OK') {
                throw new Error(response.Message || 'No fue posible recuperar la solicitud activa.');
            }

            const data = response.Data;

            // Si no existe una solicitud vigente, conservar el estado inicial.
            if (!data || !data.existe_solicitud) {
                return;
            }

            // Restaurar el identificador de la solicitud recuperada.
            this.comandoActualId = data.id_comando_player;
            this.solicitudFinalizada = false;

            // Restaurar la información general del modal.
            $('#progreso-solicitud').text(`Solicitud #${this.comandoActualId}`);
            $('#progreso-total').text(data.total_players);

            // Consultar inmediatamente el progreso actualizado.
            await this.consultarProgresoComando();

            // Reanudar el seguimiento automático si continúa activa.
            if (!this.solicitudFinalizada && this.progresoTimer === null) {
                this.iniciarConsultaProgreso();
            }

        } catch (error) {

            console.error('Error al recuperar la solicitud activa:', error);

            Alerts.error(
                Alerts.obtenerMensajeError(error),
                'Error al recuperar solicitud'
            );

        }

    }
}


// ============================================================
// INSTANCIA DE CLASE
// ============================================================

const MonitoreoCs = new Monitoreo();


// ============================================================
// DOCUMENT READY
// ============================================================

$(document).ready(function () {

    MonitoreoCs.init().catch(error => {

        console.error('Error no controlado en Monitoreo:', error);

    });

    /**
    * Gestiona la actualización de información de los Players.
    *
    * Si existe una solicitud activa, abre nuevamente el modal y consulta
    * su progreso sin generar un comando adicional.
    *
    * Si no existe una solicitud activa o la anterior ya finalizó,
    * crea una nueva solicitud de actualización.
    */
    $('#refresh').on('click', async () => {

        // Verificar si existe una solicitud pendiente o en proceso.
        if (MonitoreoCs.comandoActualId && !MonitoreoCs.solicitudFinalizada) {

            // Recuperar la instancia del modal de progreso y mostrarla.
            const modalElement = document.getElementById('modal-progreso-comando');
            const modal = bootstrap.Modal.getOrCreateInstance(modalElement);

            modal.show();

            // Consultar el estado actual sin generar un nuevo comando.
            await MonitoreoCs.consultarProgresoComando();

        } else {

            // Crear una nueva solicitud cuando no exista otra activa.
            await MonitoreoCs.crearSolicitudActualizacion();

        }

    });

});
