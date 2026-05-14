import { Component } from '@angular/core';
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
import { PopUpManager } from '../../managers/popUpManager';

export interface SabaticoSeleccionado {
  id: string;
  fechaInicio: string;
  fechaFinal: string;
  estadoSabatico: string;
}

interface DocumentoDetalle {
  key: string;
  label: string;
  archivo?: File | null;
}

@Component({
  selector: 'seguimiento-sabatico-mf-crear-solicitud',
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

  constructor(
    private readonly fb: FormBuilder,
    private readonly translate: TranslateService,
    private readonly router: Router,
    private readonly popUpManager: PopUpManager,
  ) {
    this.translate.setDefaultLang('es');
    this.translate.use('es');
    this.form = this.buildForm();
    this.sabaticoSeleccionado = this.resolveSabaticoSeleccionado();
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

  onGuardarBorrador(): void {
    if (!this.puedeSolicitar) {
      return;
    }

    this.enviando = true;
    // TODO: Persistir el borrador de la solicitud (sin radicar) usando el
    // servicio correspondiente. No se exige validación completa del formulario.
    console.log('Borrador de solicitud guardado:', {
      ...this.form.value,
      documentos: this.documentosSeleccionadosDetalle,
    });
    this.enviando = false;
  }

  onRegistrar(): void {
    if (!this.puedeSolicitar) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando = true;
    // TODO: Registrar/radicar la solicitud definitiva con su documentación
    // contra el servicio de sabáticos.
    console.log('Solicitud registrada:', {
      ...this.form.value,
      documentos: this.documentosSeleccionadosDetalle,
    });
    this.enviando = false;
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

  private buildForm(): FormGroup {
    return this.fb.group({
      tipoSolicitud: ['', Validators.required],
      justificacion: ['', [Validators.required, Validators.maxLength(1000)]],
      respuestaSolicitud: ['', Validators.maxLength(1000)],
    });
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
