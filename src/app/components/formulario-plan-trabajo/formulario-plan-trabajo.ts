import { Component, DestroyRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatInputModule } from '@angular/material/input';
import { RouterModule } from '@angular/router';
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
   documentosSeleccionadosDetalle: DocumentoDetalle[] = [];
   nombreDocumento = '';
   permisos: any[] = [];
   terceroId = '';
   sabaticoId = '';
   sabaticoData: any = null;
   planTrabajoData: any = null;
   originalDescripcionPlanTrabajo = '';
  // gestor documental helpers
  documentoObjectUrls: Record<string, string> = {};
  documentoBackendIds: Record<string, number | null> = {};
  documentosCargando: Record<string, boolean> = {};
  documentoArchivos: Record<string, string> = {};
   window = window;

  get isDocente(): boolean {
    return this.rol === 'DOCENTE';
  } 

  get isSecretariaAcademica(): boolean {
    return this.rol === 'SECRETARIA_ACADEMICA';
  }

  get roleInfoMessageKey(): string {
    if (this.isSecretariaAcademica) {
      return 'HISTORIAL_SABATICOS.roleInfo.secretariaAcademica';
    }

    return 'HISTORIAL_SABATICOS.edit.roleInfo.docente';
  }

  get canEditarPlanTrabajo(): boolean {
    // Verificar que el estado sea CARGUE_PLAN_TRABAJO (ES1)
    const estadoCorrecto = this.sabaticoData?.EstadoSabaticoId?.CodigoAbreviacion === 'ES1' ||
                          this.sabaticoData?.EstadoSabaticoId?.CodigoAbreviacion === 'CARGUE_PLAN_TRABAJO';
    
    return this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Editar_Plan_Trabajo') && estadoCorrecto;
  }

  get canEnviarRevision(): boolean {
    // Verificar permiso
    const tienePermiso = this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Enviar_Revision_Plan_Trabajo');
    
    // Verificar que el estado sea CARGUE_PLAN_TRABAJO (ES1)
    const estadoCorrecto = this.sabaticoData?.EstadoSabaticoId?.CodigoAbreviacion === 'ES1' ||
                          this.sabaticoData?.EstadoSabaticoId?.CodigoAbreviacion === 'CARGUE_PLAN_TRABAJO';
    
    return tienePermiso && estadoCorrecto;
  }

  get canDisabledEnviar(): boolean {
    const descripcionValida =
      this.form.get('descripcion_plan_trabajo')?.valid;

    const tieneDocumento =
      this.documentosSeleccionadosDetalle.some(
        doc => doc.archivo || doc.id != null || !!doc.remoteUrl
      );

    // Debe tener permiso y estado correcto
    const puedeEnviar = this.canEnviarRevision;

    return !!descripcionValida && tieneDocumento && puedeEnviar;
  }

    get canDisabledGuardar(): boolean {
    const descripcionControl = this.form.get('descripcion_plan_trabajo');
    const descripcionValida = descripcionControl?.valid;
    const descripcionModificada =
      descripcionValida &&
      descripcionControl?.value !== this.originalDescripcionPlanTrabajo;

    const tieneDocumentoNuevo =
      this.documentosSeleccionadosDetalle.some(
        doc => doc.archivo
      );

    return descripcionModificada || tieneDocumentoNuevo;
  }

  onAgregarDocumento(): void {
    if (!this.canEditarPlanTrabajo) {
      return;
    }

    const nombre = this.nombreDocumento.trim();

    if (!nombre) {
      return;
    }

    const existe = this.documentosSeleccionadosDetalle.some(
      doc => doc.label.toLowerCase() === nombre.toLowerCase()
    );

    if (existe) {
      return;
    }

    this.documentosSeleccionadosDetalle.push({
      key: crypto.randomUUID(),
      label: nombre,
      archivo: null,
    });

    this.nombreDocumento = '';
  }

  onDocumentoChange(key: string, event: Event): void {
  const input = event.target as HTMLInputElement;

  if (!input.files?.length) {
    return;
  }

  const archivo = input.files[0];

  const documento = this.documentosSeleccionadosDetalle.find(
    doc => doc.key === key
  );

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

  async onEliminarDocumento(key: string): Promise<void> {
    const documento = this.documentosSeleccionadosDetalle.find(
      doc => doc.key === key
    );

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
      const body = documento.rawData
        ? { ...documento.rawData, Activo: false }
        : { Id: documento.id, Activo: false };

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
            console.error(error);
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

    this.documentosSeleccionadosDetalle =
      this.documentosSeleccionadosDetalle.filter(
        doc => doc.key !== key
      );

    delete this.documentoObjectUrls[key];
    delete this.documentoBackendIds[key];
    delete this.documentosCargando[key];
    delete this.documentoArchivos[key];
  }

  trackDocumento(_: number, item: DocumentoDetalle): string {
    return item.key;
  }

  onPrevisualizarDocumento(key: string): void {
    const documento =
      this.documentosSeleccionadosDetalle.find(
        doc => doc.key === key
      );

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

    const documentosConArchivo =
      this.documentosSeleccionadosDetalle.filter(
        doc => doc.archivo
      );

    if (!documentosConArchivo.length) {
      return;
    }

    const endpoint = `soporte_sabatico`;

    try {

      // ejecutar uno por uno
      for (const doc of documentosConArchivo) {

        const formData = new FormData();

        formData.append(
          'SabaticoId',
          String(Number(this.sabaticoId))
        );

        formData.append(
          'rol_usuario',
          this.rol
        );

        formData.append(
          'estado_soporte_sabatico',
          'S0'
        );

        formData.append(
          'documentos',
          doc.archivo as File
        );

        formData.append(
          'nombre_archivo',
          doc.label
        );

        const response = await firstValueFrom(
          this.sabaticosMidService.postFile(
            endpoint,
            formData
          )
        );

        console.log(
          `Documento ${doc.label} cargado`,
          response
        );
      }

      console.log(
        'Todos los documentos fueron cargados'
      );

      // recargar soportes para evitar reintentar archivos ya subidos
      this.loadSoportesSabatico(this.sabaticoId);

    } catch (error: any) {

      console.error(
        'Error cargando documentos',
        error
      );

      throw error;
    }
  }

  onGuardarPlanTrabajo(executeSubscribe = true) {

  if (!this.canDisabledGuardar) {
    return;
  }

  const endpoint = `sabatico/plan_trabajo`;

  const data = {
    TerceroId: Number(this.terceroId),
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
          console.error(error);
        }
      });
  }

  // retorna observable reutilizable
  return request$;
}

async onEnviarRevision(): Promise<void> {
  if (!this.canDisabledEnviar) {
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
    TerceroId: Number(this.terceroId),
    SabaticoId: Number(this.sabaticoId),
    Justificacion: 'Enviar a revision SA',
    EstadoSabatico: 'ES2',
    EstadoSoporteSabatico: 'S1',
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
          console.error(error);
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
          console.error(error);
        }
      });
  }
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
    private readonly popUpManager: PopUpManager
  ) {
    this.translate.setDefaultLang('es');
    this.translate.use('es');

    this.form = this.buildForm();
    this.rol = localStorage.getItem('rol') || '';
    this.terceroId = localStorage.getItem('tercero') || '';
    this.sabaticoId = localStorage.getItem('SabaticoId') || '';

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
    });
  }

  private loadSoportesSabatico(id: string): void {
    this.loaderService.show();

    const endpoint =
      `soporte_sabatico/${id}`;

    this.sabaticosMidService
      .get(endpoint)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loaderService.hide())
      )
      .subscribe({
        next: (response: any) => {

          const data = response?.Data ?? [];

          this.documentosSeleccionadosDetalle =
            (Array.isArray(data) ? data : [])
            .map((item: any, idx: number) => {

              const documento = item.Documento ?? item;
              const key = String(
                item.Id ??
                documento.Id ??
                item.DocumentoId ??
                crypto.randomUUID()
              );

              const documentoId =
                documento?.Id ?? item.DocumentoId ?? null;

              const soporteId =
                item.Id ?? item.DocumentoId ?? null;

              const remoteUrl =
                documento?.Enlace ??
                item.Url ??
                item.DocumentoUrl ??
                item.Enlace ??
                null;

              this.documentoBackendIds[key] =
                documentoId;

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
                remoteName:
                  documento?.Nombre ??
                  item.FileName ??
                  item.Nombre ??
                  item.NombreDocumento ??
                  null,
                isBackend: Boolean(item.Documento || item.DocumentoId || item.Id),
              };
            });
        },

        error: () => {
        }
      });
  }

  private loadHistorialEstadoSabatico(id: string): void {
    this.loaderService.show();
    const endpoint = `historial_estado_sabatico?query=TerceroId:${this.terceroId},SabaticoId.Id:${id},Activo:True`;

    this.sabaticosCrudService.get(endpoint)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loaderService.hide())
      )
      .subscribe((response: any) => {
        const data = response?.Data[0] ?? response ?? [];
        this.sabaticoData = data;
        // Actualizar estado del control de descripción basado en el estado del sabatico
        this.togglePlanTrabajo();
      });
  }

  private loadPlanDeTrabajo(id: string): void {
    this.loaderService.show();

    const endpoint =
      `historial_estado_sabatico?query=TerceroId:${this.terceroId},SabaticoId.Id:${id},EstadoSabaticoId.CodigoAbreviacion:ES1`;

    this.sabaticosCrudService.get(endpoint)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loaderService.hide())
      )
      .subscribe((response: any) => {

        const data = response?.Data?.[0] ?? null;

        this.planTrabajoData = data;

        console.log(
          this.planTrabajoData?.Justificacion
        );

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

    if (!this.canEditarPlanTrabajo) {
      control.disable();
    } else {
      control.enable();
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