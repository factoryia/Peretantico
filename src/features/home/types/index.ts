export interface RequestDetail {
    id: string
    fecha: string
    solicitante: {
      nombre: string
      documento: string
      telefono: string
      direccion: string
    }
    servicio: {
      categoria: string
      servicio: string
      eps: string
      ordenMedica: string
    }
    gestion: {
      repartidor: string
      estado: string
      observaciones: string
    }
  }