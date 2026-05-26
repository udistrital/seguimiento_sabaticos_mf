import { Component, DestroyRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface DocumentoDetalle {
  key: string;
  label: string;
  archivo?: File | null;
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
   spinnerVisible = false;

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
    return this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Editar_Plan_Trabajo');
  }

  get canEnviarRevision(): boolean {
    return this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Enviar_Revision_Plan_Trabajo');
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
    }
  }

  onEliminarDocumento(key: string): void {
    this.documentosSeleccionadosDetalle =
      this.documentosSeleccionadosDetalle.filter(
        doc => doc.key !== key
      );
  }

  trackDocumento(_: number, item: DocumentoDetalle): string {
    return item.key;
  }

  onPrevisualizarDocumento(key: string): void {
    const documento = this.documentosSeleccionadosDetalle.find(
      doc => doc.key === key
    );

    if (!documento?.archivo) {
      return;
    }

    const fileURL = URL.createObjectURL(documento.archivo);

    window.open(fileURL, '_blank');
  }

  constructor(
    private fb: FormBuilder,
    private destroyRef: DestroyRef,
    private readonly translate: TranslateService,
    private readonly configuracionService: ConfiguracionService,
    private sabaticosCrudService: SabaticosCrudService,
  ) {
    this.translate.setDefaultLang('es');
    this.translate.use('es');

    this.form = this.buildForm();
    this.rol = localStorage.getItem('rol') || '';
    this.terceroId =localStorage.getItem('tercero') || '';
    this.sabaticoId = localStorage.getItem('SabaticoId') || '';

    this.configuracionService.get("perfil_x_menu_opcion?limit=-1&query=Perfil__Nombre__in:" + this.rol)
    .subscribe((response: any) => {
      this.permisos = response;
      this.togglePlanTrabajo();
      this.loadSabatico(this.sabaticoId);
    });
  }

  ngOnInit(): void {
    this.translate.get('GLOBAL.saludo').subscribe((res: string) => {
    });
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      descripcion_plan_trabajo: [''],
    });
  }

  private loadSabatico(id: string): void {
    this.spinnerVisible = true;
    const endpoint = `historial_estado_sabatico?query=TerceroId:${this.terceroId},SabaticoId.Id:${id},Activo:True`;

    this.sabaticosCrudService.get(endpoint)
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe((response: any) => {
      const data = response?.Data[0] ?? response ?? [];
      this.sabaticoData = data;

      this.form.patchValue({
        descripcion_plan_trabajo:
          this.sabaticoData?.Justificacion || ''
      });
    });
    this.spinnerVisible = false;
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