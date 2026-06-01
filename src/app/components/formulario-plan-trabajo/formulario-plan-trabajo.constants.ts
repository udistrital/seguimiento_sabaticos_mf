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
  ES1 = 'ES1',
  CARGUE_PLAN_TRABAJO = 'CARGUE_PLAN_TRABAJO',
  ES2 = 'ES2',
  ES3 = 'ES3',
  ES4 = 'ES4',
}

export enum EstadoSoporteNombre {
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
}

export enum EstadoSoporteCodigo {
  S0 = 'S0',
  S1 = 'S1',
  S2 = 'S2',
}

export const EstadoSoporteIdMap = {
  APROBADO: 3,
  RECHAZADO: 4,
} as const;

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

export const RoutePaths = {
  SeguimientoSabaticos: '/seguimiento-sabaticos/',
} as const;

export const Messages = {
  RevisionEnviada: 'La revisión se envió correctamente.',
} as const;
