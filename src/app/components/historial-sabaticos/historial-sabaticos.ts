import { Component, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService, TranslatePipe } from '@ngx-translate/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { ImplicitAutenticationService } from '../../services/implicit_authentication.service';
import { ConfiguracionService } from '../../services/configuracion.service';
import { SabaticosCrudService } from '../../services/sabaticos-crud.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { LoaderService } from '../../services/loader.service';
import { PopUpManager } from '../../../managers/popUpManager';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { TercerosService } from '../../services/terceros.service';
import { RouterModule } from '@angular/router';
import { SabaticosMidService } from '../../services/sabaticos-mid.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import {EstadoSabaticoCode, EstadoSoporteCodigo} from '../formulario-plan-trabajo/formulario-plan-trabajo.constants';

interface HistorialEstadoSabaticos {
  id: string;
  fechaInicio: string;
  fechaFinal: string;
  estadoSabatico: string;
  estadoSabaticoCodigo?: string;
  docenteNombre: string
}

interface ColumnFilters {
  id: string;
  fechaInicio: string;
  fechaFinal: string;
  estadoSabatico: string;
  docenteNombre: string;
}

type FilterColumn = 'id' | 'fechaInicio' | 'fechaFinal' | 'estadoSabatico' | 'docenteNombre';

@Component({
  selector: 'historial-sabaticos',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatTableModule, TranslateModule, MatPaginatorModule, TranslatePipe, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule, FormsModule, RouterModule,MatTooltipModule],
  templateUrl: './historial-sabaticos.html',
  styleUrl: './historial-sabaticos.scss',
})

export class HistorialSabaticos {

  //TRANSLATE
  currentLang = 'es'; 

  //roles y permisos
  rol!: string;
  permisos: any[] = [];
  historialEstadoSabaticos: HistorialEstadoSabaticos[] = [];
  documento = '';
  terceroId = 0;

  
  //TABLE
  pageSize = 5;
  pageIndex = 0;
  cargandoHistorialSabaticos = true;
  readonly pageSizeOptions = [5, 10, 25];
  filteredSabaticos: HistorialEstadoSabaticos[] = [];
  displayedColumns = ['id', 'fechaInicio', 'fechaFinal', 'docente' ,'estadoSabatico' , 'gestion'];
  columnFilters: ColumnFilters = {
    id: '',
    fechaInicio: '',
    fechaFinal: '',
    estadoSabatico: '',
    docenteNombre: '',
  };
  estadoOptions: string[] = [];

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

    return 'HISTORIAL_SABATICOS.roleInfo.docente';
  }

  canCrearSolicitud(solicitud: HistorialEstadoSabaticos): boolean {
    const enEstadoIncumplimiento = solicitud?.estadoSabaticoCodigo != EstadoSabaticoCode.INCUMPLIMIENTO
    return this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Crear_Solicitud_Sabatico') && enEstadoIncumplimiento;
  }

  get canEnviarSabaticos(): boolean {
    return this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Enviar_Sabatico');
  }

  canReporteProducto(solicitud: HistorialEstadoSabaticos): boolean {
    const enEstadoSocializacionPendiente = solicitud?.estadoSabaticoCodigo != EstadoSabaticoCode.EN_EJECUCION
    const enEstadoIncumplimiento = solicitud?.estadoSabaticoCodigo != EstadoSabaticoCode.INCUMPLIMIENTO
    return this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Reporte_Productos')  && enEstadoIncumplimiento;
  }

  canFinalizarSabatico(solicitud: HistorialEstadoSabaticos): boolean {
    const tienePermiso = this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Finalizar_Sabatico');
    const enEstadoSocializacionPendiente = solicitud?.estadoSabaticoCodigo === EstadoSabaticoCode.SOCIALIZACION_PENDIENTE
    return tienePermiso && enEstadoSocializacionPendiente;
  }

    canIncumplimientoSabatico(solicitud: HistorialEstadoSabaticos): boolean {
    const tienePermiso = this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Incumplimiento_Sabatico');
    const enEstadoSocializacionPendiente = solicitud?.estadoSabaticoCodigo === EstadoSabaticoCode.EN_EJECUCION
    return tienePermiso && enEstadoSocializacionPendiente;
  }

  get paginatedSabaticos(): HistorialEstadoSabaticos[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredSabaticos.slice(start, start + this.pageSize);
  }

  getEstadoClass(solicitud: HistorialEstadoSabaticos): string {
    switch (solicitud.estadoSabaticoCodigo) {
      case EstadoSabaticoCode.CARGUE_PLAN_TRABAJO:
        return 'estado--cargue';
      case EstadoSabaticoCode.REVISION_SA:
        return 'estado--sa';
      case EstadoSabaticoCode.SUBSANACION:
        return 'estado--subsanacion';
      case EstadoSabaticoCode.FINALIZADO:
        return 'estado--aprobada';
      case EstadoSabaticoCode.INCUMPLIMIENTO:
        return 'estado--rechazada';
      case EstadoSabaticoCode.SOCIALIZACION_PENDIENTE:
        return 'estado-socializacion'
      default:
        return 'estado--borrador';
    }
  }

  onFilterChange(column: FilterColumn, value: string | Date | null): void {
    if (value instanceof Date) {
      this.columnFilters[column] = this.formatDate(value);
    } else {
      this.columnFilters[column] = value ?? '';
    }

    this.applyFilters();
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
  }

  onViewPlanTrabajo(solicitudId: string): void {
    localStorage.setItem('SabaticoId', solicitudId);
    localStorage.setItem('rol', this.rol);
    localStorage.setItem('tercero', this.terceroId.toString());
  }
  
  constructor(
    private readonly destroyRef: DestroyRef,
    private readonly popUpManager: PopUpManager,
    private readonly translate: TranslateService,
    private readonly loaderService: LoaderService,
    private readonly tercerosService: TercerosService,
    private readonly configuracionService: ConfiguracionService,
    private readonly sabaticosCrudService: SabaticosCrudService,
    private readonly sabaticoMidService: SabaticosMidService,
    private readonly autenticationService: ImplicitAutenticationService,
    
  ) 
  { 
    this.translate.setDefaultLang('es');
    this.translate.use('es');

    // Obtener roles del usuario autenticado
    let roles: any = this.autenticationService.getRole();
    this.rol= roles.__zone_symbol__value.find((x: string) => ['DOCENTE', 'SECRETARIA_ACADEMICA'].includes(x));

    this.configuracionService.get("perfil_x_menu_opcion?limit=-1&query=Perfil__Nombre__in:" + this.rol)
    .subscribe((response: any) => {
      this.permisos = response
    });

    this.autenticationService.getDocument().then((documento: any) => {
      this.documento = String(documento ?? '');
      this.loadTerceroId();
    })
  }

  ngOnInit(): void {
    this.translate.get('GLOBAL.saludo').subscribe((res: string) => {
    });
  }

    async onIncumpliminetoSabatico(sabaticoId: number): Promise<void> {
    const title = this.translate.instant(
      'HISTORIAL_SABATICOS.edit.sendConfirmIncumplimientoTitle'
    );
    const text = this.translate.instant(
      'HISTORIAL_SABATICOS.edit.sendConfirmIncumplimientoMessage'
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
      SabaticoId: Number(sabaticoId),
      Justificacion: 'Finalización del sabático',
      EstadoSabatico: EstadoSabaticoCode.INCUMPLIMIENTO,
      EstadoSoporteSabatico: EstadoSoporteCodigo.RECHAZADO,
    };

    this.loaderService.show();
    this.sabaticoMidService.post(endpoint, data)
      .pipe(finalize(() => this.loaderService.hide()))
      .subscribe({
        next: () => {
          const successMessage = this.translate.instant('GLOBAL.operacion_exitosa');
          this.popUpManager.showSuccessAlert(successMessage);
          this.loadHistorialSabaticos();
        },
        error: (error) => {
          const errorMessage = this.translate.instant('GLOBAL.operacion_fallida');
          this.popUpManager.showErrorAlert(errorMessage);
        }
      });



    }

  async onFinalizarSabatico(sabaticoId: number): Promise<void> {
    const title = this.translate.instant(
      'HISTORIAL_SABATICOS.edit.sendConfirmFinalizarTitle'
    );
    const text = this.translate.instant(
      'HISTORIAL_SABATICOS.edit.sendConfirmFinalizarText'
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
      SabaticoId: Number(sabaticoId),
      Justificacion: 'Finalización del sabático',
      EstadoSabatico: EstadoSabaticoCode.FINALIZADO,
      EstadoSoporteSabatico: EstadoSoporteCodigo.APROBADO,
    };

    this.loaderService.show();
    this.sabaticoMidService.post(endpoint, data)
      .pipe(finalize(() => this.loaderService.hide()))
      .subscribe({
        next: () => {
          const successMessage = this.translate.instant('GLOBAL.operacion_exitosa');
          this.popUpManager.showSuccessAlert(successMessage);
          this.loadHistorialSabaticos();
        },
        error: (error) => {
          const errorMessage = this.translate.instant('GLOBAL.operacion_fallida');
          this.popUpManager.showErrorAlert(errorMessage);
        }
      });



    }

  private loadTerceroId(): void {
    const endpoint = `datos_identificacion?query=Activo:true,Numero:${this.documento}&sortby=FechaCreacion&order=desc`;
    this.loaderService.show();
    this.tercerosService.get(endpoint).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loaderService.hide())).subscribe((response: any) => {
      const data = response?.Data ?? response ?? [];
      if (Array.isArray(data) && data.length > 0) {
        const mapData = data[0]?.TerceroId ?? this.terceroId;
        this.terceroId = Number(mapData.Id);
        this.loadEstadosSabaticos();
        this.loadHistorialSabaticos();
      } else {
        console.warn('No se encontraron datos de identificación para el documento proporcionado.');
      }
    }, (error) => {
      console.error('Error al cargar datos de identificación:', error); 
    });
  } 


  private loadHistorialSabaticos(): void {
    let endpoint = ""
    let service : any
    if (this.isDocente){
      endpoint = `historial_estado_sabatico?query=TerceroId:${this.terceroId},Activo:True&limit=-1`;
      const columnaELiminar = "docente";
        this.displayedColumns = this.displayedColumns.filter(col => col !== columnaELiminar);
      service = this.sabaticosCrudService;
    }

    if (this.isSecretariaAcademica){
      endpoint = `sabatico/sabaticos_secretaria/` + this.documento;
      service = this.sabaticoMidService
    }

    if (!endpoint || !service) {
    console.error('No se encontró endpoint o servicio para el rol');
    return;
  }

    this.cargandoHistorialSabaticos = true;

    this.loaderService.show();
    service.get(endpoint)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loaderService.hide()))
      .subscribe({
        next: (response: any) => {
          const data = response?.Data ?? response ?? [];
          const apiSolicitudes = this.mapHistorialResponse(Array.isArray(data) ? data : []);
          this.historialEstadoSabaticos = apiSolicitudes;
          this.applyFilters();
          this.cargandoHistorialSabaticos = false;
        },
        error: (error:any) => {
          this.cargandoHistorialSabaticos = false;
        }
      });
  }

  private loadEstadosSabaticos(): void {
    const endpoint = `estado_sabatico?query=Activo:true&limit=-1`;
    this.sabaticosCrudService.get(endpoint).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((response: any) => {
      const data = response?.Data ?? response ?? [];
      this.estadoOptions = Array.isArray(data) ? data.map((item: any) => item.NombreEstado) : [];
    }, (error) => {
    });
  }

  private applyFilters(): void {
    this.filteredSabaticos = this.historialEstadoSabaticos.filter((historial) => {
      const matchesId = this.matchesFilter(historial.id, this.columnFilters.id);
      const matchesFechaInicio = this.matchesDate(historial.fechaInicio, this.columnFilters.fechaInicio);
      const matchesFechaFinal = this.matchesDate(historial.fechaFinal, this.columnFilters.fechaFinal);
      const matchesEstado = this.matchesFilter(historial.estadoSabatico, this.columnFilters.estadoSabatico);
      const matchDocenteNombre = this.matchesFilter(historial.docenteNombre, this.columnFilters.docenteNombre)

      return matchesId && matchesFechaInicio && matchesFechaFinal && matchesEstado && matchDocenteNombre;
    });
    this.pageIndex = 0;
  }

    private matchesFilter(value: string, filterValue: string): boolean {
    if (!filterValue) {
      return true;
    }
    return this.normalize(value).includes(this.normalize(filterValue));
  }

    private mapHistorialResponse(data: any[]): HistorialEstadoSabaticos[] {
    return data.map((item) => {
      const fechaInicio =  this.formatApiDate(item.SabaticoId?.FechaInicio ) ?? '';
      const fechaFinal = this.formatApiDate(item.SabaticoId?.FechaFin) ?? '';
  
      return {
        id: String(item.SabaticoId?.Id ?? item.Id ?? ''),
        fechaInicio: this.formatApiDate(item.SabaticoId?.FechaInicio ) ?? '',
        fechaFinal: this.formatApiDate(item.SabaticoId?.FechaFin) ?? '',
        estadoSabatico: item.EstadoSabaticoId?.NombreEstado,
        estadoSabaticoCodigo: item.EstadoSabaticoId?.CodigoAbreviacion,
        docenteNombre: item.Tercero?.NombreCompleto
      };
    });
  }

    private formatApiDate(fechaRaw: string): string {
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

  private matchesDate(value: string, filterValue: string): boolean {
  if (!filterValue) return true;
  return value === filterValue;
}

formatDate(date: Date | null): string {
  if (!date) return '';
  return this.formatLocalDate(date);
}

  private normalize(value: string): string {
    return value
      ? value
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
      : '';
  }
}
