import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatInputModule } from '@angular/material/input';
import { RouterModule } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface DocumentoDetalle {
  key: string;
  label: string;
  archivo?: File | null;
}


@Component({
  selector: 'seguimiento-sabatico-mf-formulario-plan-trabajo',
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
    
  ],
  templateUrl: './formulario-plan-trabajo.html',
  styleUrl: './formulario-plan-trabajo.scss',
})
export class FormularioPlanTrabajo {

   rol!: string;
   form: FormGroup;
   isReadOnly = false;
   cargandoDocumentos = false;
   documentosSeleccionados: string[] = [];
   documentosSeleccionadosDetalle: DocumentoDetalle[] = [];
    nombreDocumento = '';


  get isSecretariaGeneral(): boolean {
    return this.rol === 'SECRETARIA_GENERAL';
  }

  get isDocente(): boolean {
    return this.rol === 'DOCENTE';
  } 

  get isSecretariaAcademica(): boolean {
    return this.rol === 'SECRETARIA_ACADEMICA';
  }

  get roleInfoMessageKey(): string {
    if (this.isSecretariaGeneral) {
      return 'HISTORIAL_SABATICOS.roleInfo.secretariaGeneral';
    }

    if (this.isSecretariaAcademica) {
      return 'HISTORIAL_SABATICOS.roleInfo.secretariaAcademica';
    }

    return 'HISTORIAL_SABATICOS.edit.roleInfo.docente';
  }

  get canEditarFormularioPrincipal(): boolean {
    return !this.isReadOnly && this.rol !== 'SECRETARIA_GENERAL' && this.rol !== 'SECRETARIA_ACADEMICA';
  }

  get canAprobarDocumentos(): boolean {
    return !this.isReadOnly
      && (this.rol === 'SECRETARIA_ACADEMICA' || this.rol === 'SECRETARIA_GENERAL');
  }

  onAgregarDocumento(): void {
    if (!this.canEditarFormularioPrincipal) {
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
    private readonly translate: TranslateService,
  ) {
    this.translate.setDefaultLang('es');
    this.translate.use('es');
    this.form = this.buildForm();

    if (this.isDocente){
      this.cargandoDocumentos = true;
      this.isReadOnly = true;
    }
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

}