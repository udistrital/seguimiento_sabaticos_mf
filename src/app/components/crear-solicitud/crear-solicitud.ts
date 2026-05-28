import { Component, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { PopUpManager } from '../../../managers/popUpManager';
import { RequestManager } from '../../../managers/requestManager';
import { ImplicitAutenticationService } from '../../services/implicit_authentication.service';
import {
  CrearSolicitudFormulario,
  CrearSolicitudRequest,
  SabaticosMidService,
} from '../../services/sabaticos-mid.service';
import { TercerosService } from '../../services/terceros.service';

export interface SabaticoSeleccionado {
  id: string;
  fechaInicio: string;
  fechaFinal: string;
  estadoSabatico: string;
}

interface DocenteInfo {
  nombre: string;
  facultad: string;
  identificacion: string;
  proyecto_curricular: string;
}

interface DocumentoDetalle {
  key: string;
  label: string;
  archivo?: File | null;
}

type DocumentoConArchivo = DocumentoDetalle & { archivo: File };

@Component({
  selector: 'seguimiento-sabaticos-mf-crear-solicitud',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './crear-solicitud.html',
  styleUrl: './crear-solicitud.scss',
})
export class CrearSolicitud {

  // Tiempo máximo (en meses) entre la fecha de inicio del sabático
  // y el momento en que aún se puede crear una solicitud asociada.
  private readonly MESES_LIMITE = 3;

  form: FormGroup;
  enviando = false;
  sabaticoSeleccionado: SabaticoSeleccionado | null = null;

  nombreDocumento = '';
  documentosSeleccionadosDetalle: DocumentoDetalle[] = [];

  docenteInfo: DocenteInfo = {
    nombre: '',
    facultad: '',
    identificacion: '',
    proyecto_curricular: '',
  };

  constructor(
    private readonly fb: FormBuilder,
    private readonly translate: TranslateService,
    private readonly router: Router,
    private readonly popUpManager: PopUpManager,
    private readonly sabaticosMidService: SabaticosMidService,
    private readonly tercerosService: TercerosService,
    private readonly autenticationService: ImplicitAutenticationService,
    private readonly requestManager: RequestManager,
    private readonly destroyRef: DestroyRef,
  ) {
    this.translate.setDefaultLang('es');
    this.translate.use('es');
    this.form = this.buildForm();
    this.sabaticoSeleccionado = this.resolveSabaticoSeleccionado();
    this.loadDocenteInfo();
  }

  get fechaInicioSabatico(): Date | null {
    return this.parseFechaInicio(this.sabaticoSeleccionado?.fechaInicio);
  }

  get fechaLimiteSolicitud(): Date | null {
    const fechaInicio = this.fechaInicioSabatico;
    if (!fechaInicio) {
      return null;
    }

    // Construimos la fecha límite con el constructor explícito para evitar
    // efectos secundarios al mutar la fecha de inicio.
    return new Date(
      fechaInicio.getFullYear(),
      fechaInicio.getMonth() + this.MESES_LIMITE,
      fechaInicio.getDate(),
    );
  }

  get puedeSolicitar(): boolean {
    // Si no hay sabático seleccionado o no se puede parsear la fecha,
    // bloqueamos la creación para evitar enviar datos inconsistentes.
    const fechaLimite = this.fechaLimiteSolicitud;
    if (!fechaLimite) {
      return false;
    }

    return this.startOfToday().getTime() <= fechaLimite.getTime();
  }

  get tieneDocumentosCargados(): boolean {
    return this.documentosSeleccionadosDetalle.some(
      (doc) => !!doc.archivo && this.esArchivoPdf(doc.archivo),
    );
  }

  get diasRestantesSolicitud(): number | null {
    const fechaLimite = this.fechaLimiteSolicitud;
    if (!fechaLimite) {
      return null;
    }

    const msPorDia = 1000 * 60 * 60 * 24;
    const diferencia = fechaLimite.getTime() - this.startOfToday().getTime();
    return Math.ceil(diferencia / msPorDia);
  }

  private resolveSabaticoSeleccionado(): SabaticoSeleccionado | null {
    // Primero intentamos leer el state activo de la navegación,
    // de forma que sea independiente del modo SSR/CSR.
    const navigationState = this.router.getCurrentNavigation()?.extras?.state as
      | { sabatico?: SabaticoSeleccionado }
      | undefined;

    if (navigationState?.sabatico) {
      return navigationState.sabatico;
    }

    // Fallback para cuando el componente se inicializa después de la navegación
    // (por ejemplo, al volver atrás manteniendo el history.state).
    if (typeof history !== 'undefined') {
      const sabatico = (history.state as { sabatico?: SabaticoSeleccionado })?.sabatico;
      return sabatico ?? null;
    }

    return null;
  }

  async onRegistrar(): Promise<void> {
    if (!this.puedeSolicitar) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.tieneDocumentosCargados) {
      this.popUpManager.showErrorAlert(
        this.translate.instant('CREAR_SOLICITUD.errores.sinDocumentos'),
      );
      return;
    }

    this.enviando = true;

    try {
      const terceroId = await this.resolveTerceroId();
      if (terceroId === null) {
        this.popUpManager.showErrorAlert(
          this.translate.instant('CREAR_SOLICITUD.errores.terceroNoEncontrado'),
        );
        return;
      }

      const sabaticoId = Number(this.sabaticoSeleccionado?.id);
      if (!Number.isFinite(sabaticoId) || sabaticoId <= 0) {
        throw new Error('SabaticoId del sabático seleccionado no es válido');
      }

      const tipoSolicitudId = this.mapTipoSolicitudToId(this.form.value.tipoSolicitud);
      if (!tipoSolicitudId) {
        throw new Error('Tipo de solicitud no soportado por el microservicio');
      }

      const payload: CrearSolicitudRequest = {
        TerceroId: terceroId,
        TipoSolicitudId: tipoSolicitudId,
        SabaticoId: sabaticoId,
        formulario: this.buildFormularioPayload(),
      };

      const response = await firstValueFrom(
        this.sabaticosMidService
          .crearSolicitud(payload)
          .pipe(takeUntilDestroyed(this.destroyRef)),
      );

      const solicitudId = response?.Data?.Solicitud?.Id;
      if (typeof solicitudId !== 'number' || !Number.isFinite(solicitudId)) {
        throw new Error('Respuesta del servicio sin Data.Solicitud.Id válido');
      }

      await this.subirSoportesSecuencial(solicitudId, terceroId);
    } catch (error) {
      console.error('Error al registrar la solicitud', error);
      this.popUpManager.showErrorAlert(
        this.translate.instant('CREAR_SOLICITUD.errores.registroFallido'),
      );
    } finally {
      this.enviando = false;
    }
  }

  onAgregarDocumento(): void {
    if (!this.puedeSolicitar) {
      return;
    }

    const nombre = this.nombreDocumento.trim();
    if (!nombre) {
      return;
    }

    const yaExiste = this.documentosSeleccionadosDetalle.some(
      doc => doc.label.toLowerCase() === nombre.toLowerCase(),
    );
    if (yaExiste) {
      return;
    }

    this.documentosSeleccionadosDetalle.push({
      key: this.generarKeyDocumento(),
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
    const documento = this.documentosSeleccionadosDetalle.find(doc => doc.key === key);

    if (documento) {
      documento.archivo = archivo;
    }
  }

  onEliminarDocumento(key: string): void {
    const documento = this.documentosSeleccionadosDetalle.find(doc => doc.key === key);
    if (!documento) {
      return;
    }

    const titulo = this.translate.instant('CREAR_SOLICITUD.documentos.confirmEliminarTitle');
    const texto = this.translate.instant(
      'CREAR_SOLICITUD.documentos.confirmEliminarText',
      { nombre: documento.label },
    );

    this.popUpManager.showConfirmAlert(texto, titulo).then((result) => {
      if (!result?.isConfirmed) {
        return;
      }

      this.documentosSeleccionadosDetalle = this.documentosSeleccionadosDetalle.filter(
        doc => doc.key !== key,
      );
    });
  }

  onPrevisualizarDocumento(key: string): void {
    const documento = this.documentosSeleccionadosDetalle.find(doc => doc.key === key);
    if (!documento?.archivo) {
      return;
    }

    const fileURL = URL.createObjectURL(documento.archivo);
    window.open(fileURL, '_blank');
  }

  trackDocumento(_: number, item: DocumentoDetalle): string {
    return item.key;
  }

  private loadDocenteInfo(): void {
    this.autenticationService.getDocument().then((documentoRaw: any) => {
      const documento = String(documentoRaw ?? '').trim();
      if (!documento) {
        return;
      }

      this.docenteInfo.identificacion = documento;

      this.requestManager.setPath('ACADEMICA_MID_SERVICE');
      this.requestManager.getXml(`consulta_datos_docente_planta/${documento}`)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response: any) => {
            const parsed = this.parseDocenteResponse(response);
            this.docenteInfo = { ...this.docenteInfo, ...parsed };
          },
          error: (err) => {
            console.error('Error al cargar información del docente', err);
          },
        });
    });
  }

  private parseDocenteResponse(response: string): Partial<DocenteInfo> {
    try {
      const data = JSON.parse(response);
      const datos = data?.datosCollection?.datos?.[0];
      if (!datos) {
        return {};
      }

      return {
        nombre: `${datos.nombres || ''} ${datos.apellidos || ''}`.trim(),
        facultad: datos.facultad || '',
        identificacion: datos.documento || '',
        proyecto_curricular: datos.proyecto || '',
      };
    } catch {
      return {};
    }
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      tipoSolicitud: ['', Validators.required],
      justificacion: ['', [Validators.required, Validators.maxLength(1000)]],
    });
  }

  private buildFormularioPayload(): CrearSolicitudFormulario {
    const { tipoSolicitud, justificacion } = this.form.value;

    const sabatico = this.sabaticoSeleccionado
      ? {
          id: this.toNullable(this.sabaticoSeleccionado.id),
          fechaInicio: this.toIsoDate(this.sabaticoSeleccionado.fechaInicio),
          fechaFinal: this.toIsoDate(this.sabaticoSeleccionado.fechaFinal),
          estadoSabatico: this.toNullable(this.sabaticoSeleccionado.estadoSabatico),
        }
      : null;

    return {
      docente: {
        nombre: this.docenteInfo.nombre || null,
        facultad: this.docenteInfo.facultad || null,
        identificacion: this.docenteInfo.identificacion || null,
        proyecto_curricular: this.docenteInfo.proyecto_curricular || null,
      },
      tipoSolicitud: this.toNullable(tipoSolicitud),
      justificacion: this.toNullable(justificacion),
      respuestaSolicitud: null,
      sabatico,
      documentos: this.documentosSeleccionadosDetalle.map((doc) => ({ label: doc.label })),
    };
  }

  // Sube secuencialmente los PDFs adjuntos al endpoint `soporte_solicitud`.
  // Se respeta una pausa de 2s entre cargas, sin esperar antes de la primera
  // ni después de la última, según contrato del microservicio.
  private async subirSoportesSecuencial(solicitudId: number, terceroId: number): Promise<void> {
    const pdfs: DocumentoConArchivo[] = this.documentosSeleccionadosDetalle.filter(
      (doc): doc is DocumentoConArchivo => !!doc.archivo && this.esArchivoPdf(doc.archivo),
    );

    if (pdfs.length === 0) {
      await this.popUpManager.showSuccessAlert(
        this.translate.instant('CREAR_SOLICITUD.exito.solicitudCreada'),
      );
      this.router.navigate(['']);
      return;
    }

    const fallidos: string[] = [];

    for (let i = 0; i < pdfs.length; i++) {
      const documento = pdfs[i];
      const formData = new FormData();
      formData.append('solicitud_id', String(solicitudId));
      formData.append('tercero_id', String(terceroId));
      formData.append('rol_usuario', 'DOCENTE');
      formData.append('estado_soporte_solicitud', 'PEN');
      formData.append('documentos', documento.archivo);

      try {
        await firstValueFrom(this.sabaticosMidService.subirSoporteSolicitud(formData));
      } catch (error) {
        console.error(`Error al cargar el documento "${documento.label}"`, error);
        fallidos.push(documento.label);
      }

      if (i < pdfs.length - 1) {
        await this.sleep(2000);
      }
    }

    if (fallidos.length > 0) {
      this.popUpManager.showErrorAlert(
        this.translate.instant('CREAR_SOLICITUD.errores.documentosFallidos', {
          documentos: fallidos.join(', '),
        }),
      );
    } else {
      await this.popUpManager.showSuccessAlert(
        this.translate.instant('CREAR_SOLICITUD.exito.solicitudCreada'),
      );
      this.router.navigate(['']);
    }
  }

  // Resuelve el TerceroId del docente autenticado usando el documento expuesto
  // por `ImplicitAutenticationService` y consultando `terceros_crud/datos_identificacion`.
  // Devuelve `null` si no se obtiene un TerceroId válido (documento ausente,
  // sin coincidencias activas o error de red); el llamador decide cómo informar.
  private async resolveTerceroId(): Promise<number | null> {
    try {
      const documentoRaw = await this.autenticationService.getDocument();
      const documento = String(documentoRaw ?? '').trim();
      if (!documento) {
        return null;
      }

      const endpoint =
        `datos_identificacion?query=Activo:true,Numero:${encodeURIComponent(documento)}` +
        `&sortby=FechaCreacion&order=desc`;

      const response: any = await firstValueFrom(this.tercerosService.get(endpoint));
      const data = response?.Data ?? response ?? [];

      if (!Array.isArray(data) || data.length === 0) {
        return null;
      }

      const terceroId = Number(data[0]?.TerceroId?.Id);
      return Number.isFinite(terceroId) && terceroId > 0 ? terceroId : null;
    } catch (error) {
      console.error('Error al resolver el TerceroId del docente', error);
      return null;
    }
  }

  // Traduce el valor del select `tipoSolicitud` al código `TipoSolicitudId`
  // que espera el microservicio. Devuelve `null` si no hay un mapeo definido,
  // para que el llamador trate ese caso como inválido.
  private mapTipoSolicitudToId(tipo: string | null | undefined): string | null {
    switch (tipo) {
      case 'SUSPENSION':
        return 'SS';
      case 'MODIFICACION':
        return 'MS';
      default:
        return null;
    }
  }

  private toNullable(value: string | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const trimmed = String(value).trim();
    return trimmed === '' ? null : trimmed;
  }

  // Devuelve únicamente la parte `YYYY-MM-DD` de un valor de fecha,
  // ignorando cualquier sufijo de hora o zona horaria.
  private toIsoDate(fechaRaw: string | null | undefined): string | null {
    if (!fechaRaw) {
      return null;
    }

    const match = fechaRaw.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }

  private esArchivoPdf(archivo: File): boolean {
    if (archivo.type === 'application/pdf') {
      return true;
    }
    return archivo.name.toLowerCase().endsWith('.pdf');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Parsea fechas en formato YYYY-MM-DD respetando la zona horaria local
  // para evitar el corrimiento que aplica `new Date('YYYY-MM-DD')` (UTC).
  private parseFechaInicio(fechaRaw: string | undefined): Date | null {
    if (!fechaRaw) {
      return null;
    }

    const match = fechaRaw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) {
      return null;
    }

    const [, anio, mes, dia] = match;
    const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia));
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  private startOfToday(): Date {
    const ahora = new Date();
    return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  }

  // `crypto.randomUUID` no existe en navegadores antiguos ni en algunos
  // entornos de prueba; este helper devuelve un identificador único válido.
  private generarKeyDocumento(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
