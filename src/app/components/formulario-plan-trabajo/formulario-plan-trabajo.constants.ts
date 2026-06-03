export enum Role {
  DOCENTE = 'DOCENTE',
  SECRETARIA_ACADEMICA = 'SECRETARIA_ACADEMICA',
}

export enum Permission {
  EditarPlanTrabajo = 'Editar_Plan_Trabajo',
  GuardarPlanTrabajo = 'Guardar_Plan_Trabajo',
  SubsanarPlanTrabajo = 'SUBSANAR_PLAN_TRABAJO_SABATICO',
  EnviarRevision = 'Enviar_Revision_Plan_Trabajo',
  CargarSoporte = 'Cargar_Soporte_Plan_trabajo_Sabatico',
  AprobarRechazar = 'Aprobar_Rechazar_Soportes_Sabaticos_Sabatico',
}

export enum EstadoSabaticoCode {
  EN_EJECUCION = 'ES0',
  CARGUE_PLAN_TRABAJO = 'ES1',
  REVISION_SA = 'ES2',
  SOCIALIZACION_PENDIENTE = 'ES3',
  SUBSANACION = 'ES4',
  FINALIZADO = 'ES5',
  INCUMPLIMIENTO = 'ES6'
}

export enum EstadoSoporteNombre {
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
}

export enum EstadoSoporteCodigo {
  PENDIENTE_REVISION_SOPORTE = 'S0',
  REVISION_SA = 'S1',
  APROBADO = 'S2',
  RECHAZADO = 'S3',
}

export const Endpoints = {
  SoporteSabatico: 'soporte_sabatico',
  HistorialEstadoSabatico: 'historial_estado_sabatico',
  SabaticoPlanTrabajo: 'sabatico/plan_trabajo',
  SabaticoPlanTrabajoEstado: 'sabatico/plan_trabajo/estado',
} as const;

export const FormDataKeys = {
  SabaticoId: 'SabaticoId',
  RolUsuario: 'rol_usuario',
  EstadoSoporteSabatico: 'estado_soporte_sabatico',
  Documentos: 'documentos',
  NombreArchivo: 'nombre_archivo',
} as const;

export const Justificaciones = {
  RevisionEnviada: 'Enviar a revision SA',
  SubsanacionEnviada: 'Subsanación del Plan de Trabajo',
  SocializacionPendiente: 'Socializacion del Producto Pendiente',
} as const;
