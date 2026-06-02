import { Component, DestroyRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterModule } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfiguracionService } from '../../services/configuracion.service';
import { SabaticosCrudService } from '../../services/sabaticos-crud.service';
import { PopUpManager } from '../../../managers/popUpManager';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SabaticosMidService } from '../../services/sabaticos-mid.service';
import { LoaderService } from '../../services/loader.service';
import { firstValueFrom, switchMap } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { GestorDocumentalService } from '../../services/gestor-documental.service';
import {
  Role,
  Permission,
  EstadoSabaticoCode,
  EstadoSoporteNombre,
  EstadoSoporteCodigo,
  Endpoints,
  FormDataKeys,
  Justificaciones,
} from './formulario-plan-trabajo.constants';
import { TercerosService } from '../../services/terceros.service';

interface DocumentoDetalle {
  key: string;
  label: string;
  archivo?: File | null;
  id?: number | null;
  rawData?: any;
  remoteUrl?: string | null;
  remoteName?: string | null;
  documentoId?: number | null;
  isBackend?: boolean;
  estadoSoporte?: string | null;
}


@Component({
  selector: 'seguimiento-sabaticos-mf-formulario-plan-trabajo',
  standalone: true,
  imports: [
    MatCardModule,
    TranslateModule,
    MatIconModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatInputModule,
    RouterModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    CommonModule,
    FormsModule,
    MatButtonModule,
  ],
  templateUrl: './formulario-plan-trabajo.html',
  styleUrl: './formulario-plan-trabajo.scss',
})
export class FormularioPlanTrabajo {

   rol!: string;
   form: FormGroup;
   cargandoDocumentos = false;
   documentosSeleccionados: string[] = [];
   documentosSeleccionadosDetalleDocente: DocumentoDetalle[] = [];
   documentosSeleccionadosDetalleSecretaria: DocumentoDetalle[] = [];
   nombreDocumento = '';
   nombreTercero = ""
   permisos: any[] = [];
   terceroId = '';
   sabaticoId = '';
   historialSabaticoData: any = null;
   sabaticoData: any = null;
   planTrabajoData: any = null;
   originalDescripcionPlanTrabajo = '';
   originalObservacionesSecretaria = '';
  // gestor documental helpers
  documentoObjectUrls: Record<string, string> = {};
  documentoBackendIds: Record<string, number | null> = {};
  documentosCargando: Record<string, boolean> = {};
  documentoArchivos: Record<string, string> = {};
   window = window;

  get isDocente(): boolean {
    return this.rol === Role.DOCENTE;
  } 

  get isSecretariaAcademica(): boolean {
    return this.rol === Role.SECRETARIA_ACADEMICA;
  }

  get roleInfoMessageKey(): string {
    if (this.isSecretariaAcademica) {
      return 'HISTORIAL_SABATICOS.roleInfo.secretariaAcademica';
    }

    return 'HISTORIAL_SABATICOS.edit.roleInfo.docente';
  }

  get canEditarPlanTrabajoDocente(): boolean {
    const estado = this.historialSabaticoData?.EstadoSabaticoId?.CodigoAbreviacion;
    const estadoCorrecto = estado === EstadoSabaticoCode.EN_EJECUCION ||
      estado === EstadoSabaticoCode.SUBSANACION || estado === EstadoSabaticoCode.CARGUE_PLAN_TRABAJO;
    
    return this.permisos.some((p: any) => p?.Opcion?.Nombre === Permission.EditarPlanTrabajo) && estadoCorrecto;
  }

  get canSubirDocumentosSecretaria(): boolean {
    const estado = this.historialSabaticoData?.EstadoSabaticoId?.CodigoAbreviacion;
    const estadoCorrecto = estado === EstadoSabaticoCode.REVISION_SA;
    const tienePermiso = this.permisos.some((p: any) => p?.Opcion?.Nombre === Permission.AprobarRechazar);
    return tienePermiso && this.isSecretariaAcademica && estadoCorrecto;
  }

  get canSaveObservacionesSecretaria(): boolean {

    const permiso = this.permisos.some((p: any) => p?.Opcion?.Nombre === Permission.GuardarPlanTrabajo) && this.isSecretariaAcademica;
    const estado = this.historialSabaticoData?.EstadoSabaticoId?.CodigoAbreviacion;
    const estadoCorrecto = estado === EstadoSabaticoCode.REVISION_SA;
    
    return permiso && estadoCorrecto;
  }

  get canSubsanarSecretaria(): boolean {

    const permiso = this.permisos.some((p: any) => p?.Opcion?.Nombre === Permission.SubsanarPlanTrabajo) && this.isSecretariaAcademica;
    const estado = this.historialSabaticoData?.EstadoSabaticoId?.CodigoAbreviacion;
    const estadoCorrecto = estado === EstadoSabaticoCode.REVISION_SA;

    return permiso && estadoCorrecto;
  }

  get canEnviarRevisionDocente(): boolean {
    // Verificar permiso
    const tienePermiso = this.permisos.some((p: any) => p?.Opcion?.Nombre === Permission.EnviarRevision);
    
    const estado = this.historialSabaticoData?.EstadoSabaticoId?.CodigoAbreviacion;
    const estadoCorrecto = estado === EstadoSabaticoCode.CARGUE_PLAN_TRABAJO ||
      estado === EstadoSabaticoCode.SUBSANACION || estado === EstadoSabaticoCode.EN_EJECUCION;
    
    return tienePermiso && estadoCorrecto;
  }

  get canEnviarRevisionSecretaria(): boolean {

    const estado = this.historialSabaticoData?.EstadoSabaticoId?.CodigoAbreviacion;
    const estadoCorrecto = estado === EstadoSabaticoCode.REVISION_SA 

    // Verificar permiso
    const tienePermiso = this.permisos.some((p: any) => p?.Opcion?.Nombre === Permission.EnviarRevision);
    
    return tienePermiso && this.isSecretariaAcademica && estadoCorrecto;
  }

    get CargarSoportesDocente(): boolean {
    // Verificar permiso
    const tienePermiso = this.permisos.some((p: any) => p?.Opcion?.Nombre === Permission.CargarSoporte);
    
    const estado = this.historialSabaticoData?.EstadoSabaticoId?.CodigoAbreviacion;
    const estadoCorrecto = estado === EstadoSabaticoCode.EN_EJECUCION ||
      estado === EstadoSabaticoCode.SUBSANACION || estado === EstadoSabaticoCode.CARGUE_PLAN_TRABAJO;
    
    return tienePermiso && estadoCorrecto && this.isDocente;
  }

    get CargarSoportesSecretaria(): boolean {
    // Verificar permiso
    const tienePermiso = this.permisos.some((p: any) => p?.Opcion?.Nombre === Permission.AprobarRechazar);
    
    const estado = this.historialSabaticoData?.EstadoSabaticoId?.CodigoAbreviacion;
    const estadoCorrecto = estado === EstadoSabaticoCode.REVISION_SA
    
    return tienePermiso && estadoCorrecto && this.isSecretariaAcademica;
  }

  get canAprobarRechazarSoportes(): boolean {
    // Verificar permiso
    const tienePermiso = this.permisos.some((p: any) => p?.Opcion?.Nombre === Permission.AprobarRechazar);
    const estado = this.historialSabaticoData?.EstadoSabaticoId?.CodigoAbreviacion;
    const estadoCorrecto = estado === EstadoSabaticoCode.REVISION_SA;

    return tienePermiso && this.isSecretariaAcademica && estadoCorrecto;
  }

  get canDisabledEnviar(): boolean {
    const descripcionValida =
      this.form.get('descripcion_plan_trabajo')?.valid;

    const tieneDocumento =
      this.documentosSeleccionadosDetalleDocente.some(
        doc => doc.archivo || doc.id != null || !!doc.remoteUrl
      );

    // Debe tener permiso y estado correcto
    const puedeEnviar = this.canEnviarRevisionDocente;

    return !!descripcionValida && tieneDocumento && puedeEnviar;
  }

    get hasObservacionesSecretaria(): boolean {
    const control = this.form.get('observacionesSecretaria');
    const value = control?.value || '';
    return value.trim().length > 0;
  }

  get hasObservacionesSubsanar(): boolean {
    const control = this.form.get('observacionesSecretaria');

    return !!control?.value && control.value.trim().length > 0;

  }

get hasObservacionesCambiaron(): boolean {
  const control = this.form.get('observacionesSecretaria');
  const currentValue = control?.value || '';

  const observacionesCambiaron =
    currentValue !== this.originalObservacionesSecretaria;

  const tieneDocumentosNuevos =
    this.documentosSeleccionadosDetalleSecretaria.some(
      doc => !!doc.archivo
    );

  return observacionesCambiaron || tieneDocumentosNuevos;
}

  get canDisabledGuardar(): boolean {
    const descripcionControl = this.form.get('descripcion_plan_trabajo');
    const descripcionValida = descripcionControl?.valid;
    const descripcionModificada =
      descripcionValida &&
      descripcionControl?.value !== this.originalDescripcionPlanTrabajo;

    const tieneDocumentoNuevo =
      this.documentosSeleccionadosDetalleDocente.some(
        doc => doc.archivo
      );

    return descripcionModificada || tieneDocumentoNuevo || this.hasObservacionesSecretaria;
  }

  get canEnviarRevisionSecretariaEnabled(): boolean {
    const tieneDocumentos = this.documentosSeleccionadosDetalleDocente.length > 0;
    const todosAprobados = tieneDocumentos && this.documentosSeleccionadosDetalleDocente.every(
      doc => doc.estadoSoporte === EstadoSoporteNombre.APROBADO
    );
    return this.canEnviarRevisionSecretaria && todosAprobados;
  }

  get isEstadoCarguePlanTrabajo(): boolean {
    const estado = this.historialSabaticoData?.EstadoSabaticoId?.CodigoAbreviacion;
    return estado === EstadoSabaticoCode.EN_EJECUCION ||
      estado === EstadoSabaticoCode.SUBSANACION;
  }

  get isEstadoSubsanacion(): boolean {
    return this.historialSabaticoData?.EstadoSabaticoId?.CodigoAbreviacion === EstadoSabaticoCode.SUBSANACION;
  }

  get isEstadoRevisioSA(): boolean {
    return this.historialSabaticoData?.EstadoSabaticoId?.CodigoAbreviacion === EstadoSabaticoCode.REVISION_SA;
  }

    get isEstadoSocializacion(): boolean {
    return this.historialSabaticoData?.EstadoSabaticoId?.CodigoAbreviacion === EstadoSabaticoCode.SOCIALIZACION_PENDIENTE;
  }

    get isEstadoFinalizado(): boolean {
    return this.historialSabaticoData?.EstadoSabaticoId?.CodigoAbreviacion === EstadoSabaticoCode.FINALIZADO;
  }

  onAgregarDocumento(): void {

    const nombre = this.nombreDocumento.trim();

    if (!nombre) {
      return;
    }

    const existe = this.documentosSeleccionadosDetalleDocente.some(
      doc => doc.label.toLowerCase() === nombre.toLowerCase()
    );

    if (existe) {
      return;
    }
    if (this.rol === Role.SECRETARIA_ACADEMICA) {
      this.documentosSeleccionadosDetalleSecretaria.push({
        key: crypto.randomUUID(),
        label: nombre,
        archivo: null,
      });
    }else{
      this.documentosSeleccionadosDetalleDocente.push({
      key: crypto.randomUUID(),
      label: nombre,
      archivo: null,
    });
    }

    this.nombreDocumento = '';
  }

  onDocumentoChange(key: string, event: Event): void {
    let documento
  const input = event.target as HTMLInputElement;

  if (!input.files?.length) {
    return;
  }

  const archivo = input.files[0];
if(this.rol === Role.SECRETARIA_ACADEMICA){
  documento = this.documentosSeleccionadosDetalleSecretaria.find(
    doc => doc.key === key
  );
}else{
  documento = this.documentosSeleccionadosDetalleDocente.find(
    doc => doc.key === key
  );}
  

  if (documento) {
    documento.archivo = archivo;

    // liberar url anterior si existe
    if (this.documentoObjectUrls[key]) {
      URL.revokeObjectURL(
        this.documentoObjectUrls[key]
      );
    }

    // crear preview local
    this.documentoObjectUrls[key] =
      URL.createObjectURL(archivo);
  }
}

  async onAprobarSoporte(key: string): Promise<void> {
    const documento = this.documentosSeleccionadosDetalleDocente.find(
      doc => doc.key === key
    );

    if (!documento) {
      return;
    }

    const title = this.translate.instant(
      'HISTORIAL_SABATICOS.edit.approveConfirmTitle'
    );
    const text = this.translate.instant(
      'HISTORIAL_SABATICOS.edit.approveConfirmText'
    );

    const result = await this.popUpManager.showConfirmAlert(text, title);
    if (!result?.isConfirmed) {
      return;
    }

    await this.updateEstadoSoporte(documento, 'APROBADO');
  }

  async onRechazarSoporte(key: string): Promise<void> {
    const documento = this.documentosSeleccionadosDetalleDocente.find(
      doc => doc.key === key
    );

    if (!documento) {
      return;
    }

    const title = this.translate.instant(
      'HISTORIAL_SABATICOS.edit.rechazarConfirmarTtitle'
    );
    const text = this.translate.instant(
      'HISTORIAL_SABATICOS.edit.rechazarConfirmarText'
    );

    const result = await this.popUpManager.showConfirmAlert(text, title);
    if (!result?.isConfirmed) {
      return;
    }

    await this.updateEstadoSoporte(documento, 'RECHAZADO');
  }



  private async updateEstadoSoporte(documento: DocumentoDetalle, nuevoEstado: string): Promise<void> {
    this.loaderService.show();

    // Obtener el ID del estado según el nuevo estado
    let estadoSoporteId: number | null = null;
    if (nuevoEstado === EstadoSoporteNombre.APROBADO) {
      estadoSoporteId = await this.consultarEstadoSoporte(EstadoSoporteCodigo.APROBADO);
    } else if (nuevoEstado === EstadoSoporteNombre.RECHAZADO) {
      estadoSoporteId = await this.consultarEstadoSoporte(EstadoSoporteCodigo.RECHAZADO);
    }

    // Formatear fecha en formato PostgreSQL: YYYY-MM-DD HH:MM:SS.sss
    const formatDateForPostgres = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      const ms = String(date.getMilliseconds()).padStart(3, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
    };

    const fechaActual = formatDateForPostgres(new Date());
    const fechaCreacion = documento.rawData?.FechaCreacion || fechaActual;

    // Asegurar que tomamos correctamente el DocumentoId (puede venir en rawData.Documento.Id)
    const documentoIdToSend = documento.documentoId ?? documento.rawData?.Documento?.Id ?? documento.rawData?.documento?.Id ?? documento.rawData?.DocumentoId ?? null;

    // Construir el cuerpo con la estructura del modelo SoporteSabatico
    const body = {
      Id: documento.id ?? documento.rawData?.Id,
      DocumentoId: documentoIdToSend,
      Activo: true,
      FechaCreacion: fechaCreacion,
      FechaModificacion: fechaActual,
      RolUsuario: documento.rawData?.RolUsuario || '',
      SabaticoId: documento.rawData?.SabaticoId,
      EstadoSoporteSabaticoId: {
        Id: estadoSoporteId,
      }
    };

    this.sabaticosCrudService.put(Endpoints.SoporteSabatico, body as any)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loaderService.hide())
      )
      .subscribe({
        next: () => {
          // Actualizar el estado del documento en la lista
          const index = this.documentosSeleccionadosDetalleDocente.findIndex(
            doc => doc.key === documento.key
          );
          if (index !== -1) {
            this.documentosSeleccionadosDetalleDocente[index].estadoSoporte = nuevoEstado;
          }

          const successMessage = nuevoEstado === EstadoSoporteNombre.APROBADO
            ? 'HISTORIAL_SABATICOS.edit.approveSuccess'
            : 'HISTORIAL_SABATICOS.edit.rejectSuccess';

          this.popUpManager.showSuccessAlert(
            this.translate.instant(successMessage)
          );
        },
        error: (error) => {
          const errorMessage = nuevoEstado === EstadoSoporteNombre.APROBADO
            ? 'HISTORIAL_SABATICOS.edit.approveError'
            : 'HISTORIAL_SABATICOS.edit.rejectError';

          this.popUpManager.showErrorAlert(
            this.translate.instant(errorMessage)
          );
        }
      });
  }

  async onEliminarDocumento(key: string): Promise<void> {
    let documento

    if(this.rol == Role.SECRETARIA_ACADEMICA){
      documento = this.documentosSeleccionadosDetalleSecretaria.find(
        doc => doc.key === key
      );
    }else{
    documento = this.documentosSeleccionadosDetalleDocente.find(
      doc => doc.key === key
    );
    }


    if (!documento) {
      return;
    }

    const title = this.translate.instant(
      'HISTORIAL_SABATICOS.edit.deleteConfirmTitle'
    );
    const text = this.translate.instant(
      'HISTORIAL_SABATICOS.edit.deleteConfirmText'
    );

    const result = await this.popUpManager.showConfirmAlert(text, title);
    if (!result?.isConfirmed) {
      return;
    }

    const cleanup = () => this.removeDocumentoFromList(key);

    if (documento.id) {
      this.loaderService.show();

      const body = {
      Id: documento.id,
      DocumentoId: documento.rawData.Documento.Id,
      Activo: false,
      FechaCreacion: documento.rawData.Documento.FechaCreacion,
      FechaModificacion: documento.rawData.Documento.FechaModificacion,
      RolUsuario: documento.rawData?.RolUsuario || '',
      SabaticoId: documento.rawData?.SabaticoId,
      EstadoSoporteSabaticoId: {
        Id: documento.rawData?.EstadoSoporteSabatico.Id,
      }
    };

      this.sabaticosCrudService.put('soporte_sabatico', body as any)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.loaderService.hide())
        )
        .subscribe({
          next: () => {
            cleanup();
            this.popUpManager.showSuccessAlert(
              this.translate.instant(
                'HISTORIAL_SABATICOS.edit.deleteSuccess'
              )
            );
          },
          error: (error) => {
            this.popUpManager.showErrorAlert(
              this.translate.instant(
                'HISTORIAL_SABATICOS.edit.deleteError'
              )
            );
          }
        });
      return;
    }

    cleanup();
  }

  private removeDocumentoFromList(key: string): void {
    if (this.documentoObjectUrls[key]) {
      URL.revokeObjectURL(this.documentoObjectUrls[key]);
    }
    if(this.rol == Role.SECRETARIA_ACADEMICA){
      this.documentosSeleccionadosDetalleSecretaria =
      this.documentosSeleccionadosDetalleSecretaria.filter(
        doc => doc.key !== key
      );
    }else{
    this.documentosSeleccionadosDetalleDocente =
      this.documentosSeleccionadosDetalleDocente.filter(
        doc => doc.key !== key
      );
    }

    delete this.documentoObjectUrls[key];
    delete this.documentoBackendIds[key];
    delete this.documentosCargando[key];
    delete this.documentoArchivos[key];
  }

  trackDocumento(_: number, item: DocumentoDetalle): string {
    return item.key;
  }

  onPrevisualizarDocumento(key: string): void {
    let documento
    if(this.rol === Role.SECRETARIA_ACADEMICA){
      documento = this.documentosSeleccionadosDetalleSecretaria.find(
        doc => doc.key === key
      );
    }else{
    documento =
      this.documentosSeleccionadosDetalleDocente.find(
        doc => doc.key === key
      );
      }

    if (!documento) {
      return;
    }

    // archivo local cargado por usuario
    if (documento.archivo) {
      const localUrl = this.documentoObjectUrls[key];
      if (localUrl) {
        window.open(localUrl, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    // cache backend
    const cachedUrl = this.documentoObjectUrls[key];
    if (cachedUrl) {
      window.open(cachedUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const documentoId =
      documento.documentoId ??
      this.documentoBackendIds[key];

    if (!documentoId) {
      if (documento.remoteUrl) {
        window.open(documento.remoteUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      this.popUpManager.showAlert(
        this.translate.instant(
          'HISTORIAL_SOLICITUDES.edit.documentos.noPreviewTitle'
        ),
        this.translate.instant(
          'HISTORIAL_SOLICITUDES.edit.documentos.noPreviewText'
        )
      );
      return;
    }

    if (this.documentosCargando[key]) {
      return;
    }

    this.documentosCargando[key] = true;
    this.loaderService.show();

    this.gestorDocumentalService
      .getDocumentoById(Number(documentoId))
      .pipe(finalize(() => {
        this.documentosCargando[key] = false;
        this.loaderService.hide();
      }))
      .subscribe({
        next: (nuxeoDoc) => {
          if (!nuxeoDoc) {
            if (documento.remoteUrl) {
              window.open(documento.remoteUrl, '_blank', 'noopener,noreferrer');
            } else {
              this.popUpManager.showErrorAlert(
                this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.noPreviewText')
              );
            }
            return;
          }

          const blobUrl = this.gestorDocumentalService.getBlobUrlFromDocumento(nuxeoDoc);
          if (blobUrl) {
            this.documentoObjectUrls[key] = blobUrl;
            window.open(blobUrl, '_blank', 'noopener,noreferrer');
          } else if (documento.remoteUrl) {
            window.open(documento.remoteUrl, '_blank', 'noopener,noreferrer');
          } else {
            this.popUpManager.showErrorAlert(
              this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.noPreviewText')
            );
          }
        },
        error: () => {
          if (documento.remoteUrl) {
            window.open(documento.remoteUrl, '_blank', 'noopener,noreferrer');
          } else {
            this.popUpManager.showErrorAlert(
              this.translate.instant('HISTORIAL_SOLICITUDES.edit.documentos.noPreviewText')
            );
          }
        }
      });
  }

  async onGuardarDocumentos(): Promise<void> {
    let documentosConArchivo
    if(this.rol === Role.SECRETARIA_ACADEMICA){
        documentosConArchivo =
      this.documentosSeleccionadosDetalleSecretaria.filter(
        doc => doc.archivo
      );
    }else{
      documentosConArchivo =
      this.documentosSeleccionadosDetalleDocente.filter(
        doc => doc.archivo
      );
    }


    if (!documentosConArchivo.length) {
      return;
    }

    const endpoint = Endpoints.SoporteSabatico;

    try {

      // ejecutar uno por uno
      for (const doc of documentosConArchivo) {

        const formData = new FormData();

        formData.append(FormDataKeys.SabaticoId, String(Number(this.sabaticoId)));
        formData.append(FormDataKeys.RolUsuario, this.rol);
        formData.append(FormDataKeys.EstadoSoporteSabatico, EstadoSoporteCodigo.PENDIENTE_REVISION_SOPORTE);
        formData.append(FormDataKeys.Documentos, doc.archivo as File);
        formData.append(FormDataKeys.NombreArchivo, doc.label);

        const response = await firstValueFrom(
          this.sabaticosMidService.postFile(
            endpoint,
            formData
          )
        );
      }

      // recargar soportes para evitar reintentar archivos ya subidos
      this.loadSoportesSabatico(this.sabaticoId);

    } catch (error: any) {

      throw error;
    }
  }

  onGuardarPlanTrabajo(executeSubscribe = true) {
    if (!this.canDisabledGuardar) {
      return;
    }

    const endpoint = `sabatico/plan_trabajo`;

    const data = {
      SabaticoId: Number(this.sabaticoId),
      Justificacion:
        this.form.get(
          'descripcion_plan_trabajo'
        )?.value,
    };

    const request$ = this.sabaticosMidService
      .post(endpoint, data)
      .pipe(
        switchMap(async (response: any) => {

          if (response.Status === 200) {

            // espera documentos
            await this.onGuardarDocumentos();

            // recarga info
            this.loadHistorialEstadoSabatico(
              this.sabaticoId
            );

            this.loadPlanDeTrabajo(
              this.sabaticoId
            );
          }

          return response;
        })
      );

    // ejecución normal (botón guardar)
    if (executeSubscribe) {
      this.loaderService.show();

      request$
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.loaderService.hide())
        )
        .subscribe({
          next: () => {
          },
          error: (error) => {
          }
        });
    }

    // retorna observable reutilizable
    return request$;
}

onGuardarObservacionesSecretaria(): void {
  
  if (!this.canSaveObservacionesSecretaria) {
    return;
  }

  const endpoint = `sabatico`;

  this.sabaticoData.Observaciones = this.form.get('observacionesSecretaria')?.value || '';


  this.loaderService.show();

  const formatDateForPostgresNoMs = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const parseToDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val !== 'string') return null;
    let s = val.trim();
    s = s.replace(/(\+0+\s*)+/g, '+0000');
    s = s.replace(/\s*\+0000\s*$/, '');
    s = s.replace(/^([0-9]{4}-[0-9]{2}-[0-9]{2})\s+([0-9]{2}:[0-9]{2}:[0-9]{2})(.*)$/, '$1T$2$3');
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d;
    return null;
  };

  const sanitizeToPostgresDates = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    Object.keys(obj).forEach((k) => {
      const val = obj[k];
      if (val == null) return;
      if (typeof val === 'string' && /fecha/i.test(k)) {
        const d = parseToDate(val);
        if (d) {
          obj[k] = formatDateForPostgresNoMs(d);
          return;
        }
      }
      if (typeof val === 'object') sanitizeToPostgresDates(val);
    });
  };

  const payload = JSON.parse(JSON.stringify(this.sabaticoData));
  sanitizeToPostgresDates(payload);

  this.sabaticosCrudService.put(endpoint, payload)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loaderService.hide())
    )
    .subscribe({
      next: () => {
        this.onGuardarDocumentos()
        this.popUpManager.showSuccessAlert(
          this.translate.instant(
            'HISTORIAL_SABATICOS.edit.saveObservacionesSuccess'
          )
        );
        this.loadHistorialEstadoSabatico(this.sabaticoId);
      },
      error: (error) => {
        this.popUpManager.showErrorAlert(
          this.translate.instant(
            'HISTORIAL_SABATICOS.edit.saveObservacionesError'
          )
        );
      }
    });
}

async onEnviarRevisionDocente(): Promise<void> {
  const isDocenteReady = this.canDisabledEnviar;
  const isSecretariaReady = this.canEnviarRevisionSecretariaEnabled;

  if (!isDocenteReady && !isSecretariaReady) {
    return;
  }

  const title = this.translate.instant(
    'HISTORIAL_SABATICOS.edit.sendConfirmTitle'
  );
  const text = this.translate.instant(
    'HISTORIAL_SABATICOS.edit.sendConfirmText'
  );

  const result = await this.popUpManager.showConfirmAlert(
    text,
    title
  );

  if (!result?.isConfirmed) {
    return;
  }

  const endpoint = `sabatico/plan_trabajo/estado`;

  const data = {
    SabaticoId: Number(this.sabaticoId),
    Justificacion: Justificaciones.RevisionEnviada,
    EstadoSabatico: EstadoSabaticoCode.REVISION_SA,
    EstadoSoporteSabatico: EstadoSoporteCodigo.REVISION_SA,
  };

  this.loaderService.show();

  // Si hay cambios (descripción o documentos nuevos), guardar primero
  if (this.canDisabledGuardar) {
    this.onGuardarPlanTrabajo(false)
      ?.pipe(
        switchMap(() =>
          this.sabaticosMidService.post(
            endpoint,
            data
          )
        ),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loaderService.hide())
      )
      .subscribe({
        next: (response: any) => {
          if (response.Status === 200) {
            this.loadHistorialEstadoSabatico(
              this.sabaticoId
            );
          }
        },
        error: (error) => {
        }
      });
  } else {
    // Sin cambios, ir directo al cambio de estado
    this.sabaticosMidService.post(endpoint, data)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loaderService.hide())
      )
      .subscribe({
        next: (response: any) => {
          if (response.Status === 200) {
            this.loadHistorialEstadoSabatico(
              this.sabaticoId
            );
          }
        },
        error: (error) => {
        }
      });
  }
}

async onEnviarRevisionSecretaria(): Promise<void> {

  const title = this.translate.instant(
    'HISTORIAL_SABATICOS.edit.sendConfirmTitle'
  );
  const text = this.translate.instant(
    'HISTORIAL_SABATICOS.edit.sendConfirmText'
  );

  const result = await this.popUpManager.showConfirmAlert(
    text,
    title
  );

  if (!result?.isConfirmed) {
    return;
  }

  const endpoint = `sabatico/plan_trabajo/estado`;

  const data = {
    SabaticoId: Number(this.sabaticoId),
    Justificacion: Justificaciones.SocializacionPendiente,
    EstadoSabatico: EstadoSabaticoCode.SOCIALIZACION_PENDIENTE,
    EstadoSoporteSabatico: EstadoSoporteCodigo.APROBADO,
  };

  this.loaderService.show();

  // Si hay cambios (descripción o documentos nuevos), guardar primero
  if (this.canDisabledGuardar) {
    this.onGuardarPlanTrabajo(false)
      ?.pipe(
        switchMap(() =>
          this.sabaticosMidService.post(
            endpoint,
            data
          )
        ),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loaderService.hide())
      )
      .subscribe({
        next: (response: any) => {
          if (response.Status === 200) {
            this.popUpManager.showSuccessAlert(
              this.translate.instant(
                'HISTORIAL_SABATICOS.edit.messageEnviarRevision'
              )
            );
            this.router.navigate(['']);
          }
        },
        error: (error) => {
        }
      });
  } else {
    // Sin cambios, ir directo al cambio de estado
    this.sabaticosMidService.post(endpoint, data)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loaderService.hide())
      )
      .subscribe({
        next: (response: any) => {
          if (response.Status === 200) {
            this.popUpManager.showSuccessAlert(
              this.translate.instant(
                'HISTORIAL_SABATICOS.edit.messageEnviarRevision'
              )
              
            );
            this.router.navigate(['']);
          }
        },
        error: (error) => {
        }
      });
  }
}

async onSubsanarPlanTrabajo(): Promise<void> {

  const title = this.translate.instant(
    'HISTORIAL_SABATICOS.edit.subsanarConfirmTitle'
  );
  const text = this.translate.instant(
    'HISTORIAL_SABATICOS.edit.subsanarConfirmText'
  );

  const result = await this.popUpManager.showConfirmAlert(
    text,
    title
  );

  if (!result?.isConfirmed) {
    return;
  }

  const endpoint = `sabatico/plan_trabajo/estado`;

  const data = {
    SabaticoId: Number(this.sabaticoId),
    Justificacion: Justificaciones.SubsanacionEnviada,
    EstadoSabatico: EstadoSabaticoCode.SUBSANACION,
    EstadoSoporteSabatico: EstadoSoporteCodigo.PENDIENTE_REVISION_SOPORTE,
  };

  this.loaderService.show();

  this.sabaticosMidService.post(endpoint, data)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loaderService.hide())
    )
    .subscribe({
      next: (response: any) => {
        if (response.Status === 200) {
            this.popUpManager.showSuccessAlert(
              this.translate.instant(
                'HISTORIAL_SABATICOS.edit.messageEnviarRevision'
              )
            );
            this.router.navigate(['']);
        }
      },
      error: (error) => {
      }
    });
}

  constructor(
    private fb: FormBuilder,
    private destroyRef: DestroyRef,
    private readonly translate: TranslateService,
    private readonly configuracionService: ConfiguracionService,
    private sabaticosCrudService: SabaticosCrudService,
    private readonly gestorDocumentalService: GestorDocumentalService,
    private sabaticosMidService: SabaticosMidService,
    private readonly loaderService: LoaderService,
    private readonly popUpManager: PopUpManager,
    private readonly router: Router,
    private readonly terceroCrudService : TercerosService
  ) {
    this.translate.setDefaultLang('es');
    this.translate.use('es');

    this.form = this.buildForm();
    this.rol = localStorage.getItem('rol') || '';
    this.terceroId = localStorage.getItem('tercero') || '';
    this.sabaticoId = localStorage.getItem('SabaticoId') || '';

    // Inicializar estado del control de observaciones según rol
    this.toggleObservacionesSecretaria();

    this.loaderService.show();
    this.configuracionService.get("perfil_x_menu_opcion?limit=-1&query=Perfil__Nombre__in:" + this.rol)
      .pipe(finalize(() => this.loaderService.hide()))
      .subscribe((response: any) => {
        this.permisos = response;
        this.loadHistorialEstadoSabatico(this.sabaticoId);
        this.loadPlanDeTrabajo(this.sabaticoId);
        this.loadSoportesSabatico(this.sabaticoId);
        
       
      });
  }

  ngOnInit(): void {
    this.translate.get('GLOBAL.saludo').subscribe((res: string) => {
    });
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      descripcion_plan_trabajo: ['', Validators.required],
      observacionesSecretaria: [''],
    });
  }

  async consultarEstadoSoporte(CodigoAbreviacion: string): Promise<number | null> {
  const endpoint = `estado_soporte_sabatico?query=CodigoAbreviacion:${CodigoAbreviacion}`;

  this.loaderService.show();

  try {
    const response: any = await firstValueFrom(
      this.sabaticosCrudService.get(endpoint)
    );

    return response?.Data?.[0]?.Id ?? null;
  } finally {
    this.loaderService.hide();
  }
}

  private loadSabaticoData(): void {
    this.sabaticoData = this.historialSabaticoData.SabaticoId || null;
    const observacionesInicial = this.sabaticoData.Observaciones || '';
    this.originalObservacionesSecretaria = observacionesInicial;
    this.form.patchValue({
      observacionesSecretaria: observacionesInicial
    });
  }

private loadSoportesSabatico(id: string): void {
  this.loaderService.show();

  const endpoint = `soporte_sabatico/${id}`;

  this.sabaticosMidService
    .get(endpoint)
    .pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loaderService.hide())
    )
    .subscribe({
      next: (response: any) => {
        const data = response?.Data ?? [];

        const documentos = (Array.isArray(data) ? data : []).map(
          (item: any, idx: number) => {
            const documento = item.Documento ?? item;

            const key = String(
              item.Id ??
              documento.Id ??
              item.DocumentoId ??
              crypto.randomUUID()
            );

            const documentoId =
              documento?.Id ??
              item.DocumentoId?.Id ??
              null;

            const soporteId =
              item.Id ??
              item.DocumentoId ??
              null;

            const remoteUrl =
              documento?.Enlace ??
              item.Url ??
              item.DocumentoUrl ??
              item.Enlace ??
              null;

            this.documentoBackendIds[key] = documentoId;

            const estadoSoporte =
              item.EstadoSoporteSabatico?.NombreEstado ?? null;

            return {
              key,
              id: soporteId,
              rawData: item,
              label: String(
                documento?.Nombre ??
                item.Nombre ??
                item.NombreDocumento ??
                item.Label ??
                `Documento ${idx + 1}`
              ),
              documentoId,
              archivo: null,
              remoteUrl,
              estadoSoporte,
              remoteName:
                documento?.Nombre ??
                item.FileName ??
                item.Nombre ??
                item.NombreDocumento ??
                null,
              isBackend: Boolean(
                item.Documento ||
                item.DocumentoId ||
                item.Id
              ),
            };
          }
        );

        // Separar por rol
        this.documentosSeleccionadosDetalleDocente =
          documentos.filter(
            doc =>
              doc.rawData?.RolUsuario === Role.DOCENTE
          );

        this.documentosSeleccionadosDetalleSecretaria =
          documentos.filter(
            doc =>
              doc.rawData?.RolUsuario === Role.SECRETARIA_ACADEMICA
          );
      },

      error: () => {}
    });
}

  private loadNombreTerceroSabatico (terceroId: string){
    this.loaderService.show()
    const endpoint = "tercero/" + terceroId;

    this.terceroCrudService.get(endpoint)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loaderService.hide())
      )
      .subscribe((response: any) => {
        this.nombreTercero = response.NombreCompleto
      })

  }

  private loadHistorialEstadoSabatico(id: string): void {
    this.loaderService.show();
    const endpoint = `historial_estado_sabatico?query=SabaticoId.Id:${id},Activo:True`;

    this.sabaticosCrudService.get(endpoint)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loaderService.hide())
      )
      .subscribe((response: any) => {
        const data = response?.Data[0] ?? response ?? [];
        this.historialSabaticoData = data;
        this.loadNombreTerceroSabatico(this.historialSabaticoData.TerceroId)
        // Actualizar estado del control de descripción basado en el estado del sabatico
        this.togglePlanTrabajo();
        this.loadSabaticoData();
      });
  }

  private loadPlanDeTrabajo(id: string): void {
    this.loaderService.show();

    const endpoint =
      `historial_estado_sabatico?query=SabaticoId.Id:${id},EstadoSabaticoId.CodigoAbreviacion:${EstadoSabaticoCode.CARGUE_PLAN_TRABAJO}`;

    this.sabaticosCrudService.get(endpoint)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loaderService.hide())
      )
      .subscribe((response: any) => {

        const data = response?.Data?.[0] ?? null;

        this.planTrabajoData = data;

        this.form.patchValue({
          descripcion_plan_trabajo:
            this.planTrabajoData?.Justificacion || ''
        });

        this.originalDescripcionPlanTrabajo =
          this.planTrabajoData?.Justificacion || '';
      });
  }

  private togglePlanTrabajo(): void {
    const control = this.form.get('descripcion_plan_trabajo');

    if (!control) return;

    if (!this.canEditarPlanTrabajoDocente) {
      control.disable();
    } else {
      control.enable();
    }
    // actualizar disponibilidad del campo de observaciones
    this.toggleObservacionesSecretaria();
  }

  private toggleObservacionesSecretaria(): void {
    const control = this.form.get('observacionesSecretaria');
    if (!control) return;

    if (this.isSecretariaAcademica) {
      control.enable();
    } else {
      control.disable();
    }
  }

  formatApiDate(fechaRaw: string): string {
    if (!fechaRaw) return '';
    const dateObj = new Date(fechaRaw);
    if (Number.isNaN(dateObj.getTime())) {
      const match = fechaRaw.match(/^(\d{4}-\d{2}-\d{2})/);
      return match ? match[1] : '';
    }
    return this.formatLocalDate(dateObj);
  }

  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}