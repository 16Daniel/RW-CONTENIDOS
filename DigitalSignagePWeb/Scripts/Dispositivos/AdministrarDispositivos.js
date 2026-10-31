class AdministracionPlayers {
    constructor() {
        this.idPlayer = null;
        this.table = null;
    }

    /** Inicializa la tabla y los eventos del módulo. */
    async init() {
        this.inicializarTabla();
        this.bindEvents();
    }

    /**
     * Inicializa DataTables con un registro temporal
     * para probar los botones de Editar y Dar de baja.
     */
    inicializarTabla() {

        // TEMPORAL: eliminar cuando conectemos SQL Server.
        const registrosTemporales = [
            {
                IdPlayer: 1,
                Identificador: 'PLYR-1',
                Dispositivo: 'Raspberry Pi 3 B+',
                NumeroSerie: 'RPI-0001',
                Region: 'Querétaro',
                Almacenamiento: '16 GB',
                FechaModificacion: '30/10/2026',
                Estatus: 'Activo'
            }
        ];

        this.table = $('#admin-devices-table').DataTable({

            data: registrosTemporales,

            columns: [
                {
                    data: 'Identificador',
                    render: function (data, type) {

                        if (type !== 'display') {
                            return data ?? '';
                        }

                        const identificador = $.fn.dataTable.render
                            .text()
                            .display(data ?? '');

                        return `
                            <span class="admin-player-identity">
                                <span class="admin-player-icon">
                                    <i class="fa-solid fa-desktop"></i>
                                </span>
                                <span class="admin-player-code">
                                    ${identificador}
                                </span>
                            </span>
                        `;
                    }
                },
                { data: 'Dispositivo', render: $.fn.dataTable.render.text() },
                { data: 'NumeroSerie', render: $.fn.dataTable.render.text() },
                {
                    data: 'Region',
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
                { data: 'Almacenamiento', render: $.fn.dataTable.render.text() },
                { data: 'FechaModificacion', render: $.fn.dataTable.render.text() },
                {
                    data: 'Estatus',
                    render: function (data, type) {

                        if (type !== 'display') {
                            return data ?? '';
                        }

                        const activo = String(data ?? '').trim().toLowerCase() === 'activo';

                        const clase = activo
                            ? 'admin-player-status--active'
                            : 'admin-player-status--inactive';

                        const icono = activo
                            ? 'fa-circle-check'
                            : 'fa-circle-xmark';

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

                        const id = Number(row.IdPlayer);

                        if (!Number.isSafeInteger(id) || id <= 0) {
                            return '';
                        }

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

                        <button type="button"
                                class="admin-action btnEstadoPlayer ms-1"
                                data-id="${id}"
                                title="Dar de baja"
                                data-bs-toggle="tooltip"
                                data-bs-placement="top"
                                data-bs-title="Dar de baja">
                            <i class="fa-solid fa-ban"></i>
                        </button>
                    `;
                    }
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
                this.inicializarTooltips();
            }
        });

        this.actualizarContadores();
    }

    /**
    * Inicializa los tooltips de las acciones.
    */
    inicializarTooltips() {
        document.querySelectorAll(
            '.admin-table [data-bs-toggle="tooltip"]'
        ).forEach(elemento => {
            bootstrap.Tooltip.getOrCreateInstance(elemento, {
                container: 'body',
                trigger: 'hover'
            });
        });
    }

    /** Vincula los botones existentes de la vista. */
    bindEvents() {
        $(document).on('click', '#btn-nuevo-dispositivo', () => this.abrirModalNuevo());
        $(document).on('click', '.btnEditarPlayer', (event) => {
            this.abrirModalEditar($(event.currentTarget).data('id'));
        });
        $(document).on('click', '.btnEstadoPlayer', (event) => {
            this.abrirModalEstado($(event.currentTarget).data('id'));
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

    /** Abre el modal existente para alta. */
    abrirModalNuevo() {
        this.idPlayer = null;
        $('#admin-device-form')[0].reset();
        $('#admin-device-id').val('');
        $('#admin-modal-title').text('Nuevo dispositivo');

        // Configuracion de datos
        $("#numSerie").prop("disabled", false);

        bootstrap.Tab.getOrCreateInstance(document.getElementById('admin-general-tab')).show();
        bootstrap.Modal.getOrCreateInstance(document.getElementById('admin-modal-device')).show();
    }

    /** Abre edición para una fila real, sin inventar datos del dispositivo. */
    abrirModalEditar(idPlayer) {
        if (!idPlayer) return;
        this.idPlayer = idPlayer;
        $('#admin-device-form')[0].reset();
        $('#admin-device-id').val(idPlayer);
        $('#admin-modal-title').text('Editar dispositivo');

        // Configuracion de datos
        $("#numSerie").prop("disabled", true);



        // Pendiente: consultar los datos reales por ID antes de permitir guardar.
        bootstrap.Tab.getOrCreateInstance(document.getElementById('admin-general-tab')).show();
        bootstrap.Modal.getOrCreateInstance(document.getElementById('admin-modal-device')).show();
    }

    /** Abre la confirmación de baja; no modifica el estado en SQL. */
    abrirModalEstado(idPlayer) {
        if (!idPlayer) return;
        this.idPlayer = idPlayer;
        $('#admin-baja-player-id').text("PLYR " + idPlayer);
        bootstrap.Modal.getOrCreateInstance(document.getElementById('admin-modal-baja')).show();
    }
}

const AdministracionPlayersCs = new AdministracionPlayers();

$(document).ready(async function () {
    await AdministracionPlayersCs.init();
});




