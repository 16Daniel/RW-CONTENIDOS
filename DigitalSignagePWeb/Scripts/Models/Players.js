'use strict';

class Players {

    constructor(data = {}) {

        this.id_player = data.id_player;
        this.id_sucursal = data.id_sucursal;
        this.sucursal = data.sucursal;
        this.id_estado = data.id_estado;
        this.estado = data.estado;

        this.id_estatus_player = data.id_estatus_player;
        this.estatus_player = data.estatus_player;

        this.modelo_player = data.modelo_player;
        this.numero_serie = data.numero_serie;
        this.direccion_mac = data.direccion_mac;
        this.ip_player = data.ip_player;
        this.version_agent = data.version_agent;

        this.id_estado_sincronizacion = data.id_estado_sincronizacion;
        this.estado_sincronizacion = data.estado_sincronizacion;

        this.ultima_fecha_comunicacion = data.ultima_fecha_comunicacion;
        this.estado_reproduccion = data.estado_reproduccion;

        this.ultimo_contenido_reportado = data.ultimo_contenido_reportado;
        this.ultima_playlist_reportada = data.ultima_playlist_reportada;

        this.capacidad_almacenamiento = data.capacidad_almacenamiento;
        this.ultimo_espacio_disponible = data.ultimo_espacio_disponible;
        this.unidad_almacenamiento = data.unidad_almacenamiento;

        this.fecha_creacion = data.fecha_creacion;
        this.fecha_modificacion = data.fecha_modificacion;

    }

}