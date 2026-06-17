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
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { TercerosService } from '../../services/terceros.service';
import { RouterModule } from '@angular/router';
import { SabaticosMidService } from '../../services/sabaticos-mid.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import {EstadoSabaticoCode, EstadoSoporteCodigo} from '../formulario-plan-trabajo/formulario-plan-trabajo.constants';

type RolOperativo = 'DOCENTE' | 'SECRETARIA_ACADEMICA';
type RolSistema = RolOperativo | 'ADMIN_SGA';

interface HistorialEstadoSabaticos {
  id: string;
  fechaInicio: string;
  fechaFinal: string;
  estadoSabatico: string;
  estadoSabaticoCodigo?: string;
  docenteNombre: string;
  terceroIdDocente?: number;
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
  imports: [CommonModule, MatCardModule, MatIconModule, MatTableModule, TranslateModule, MatPaginatorModule, TranslatePipe, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule, MatButtonModule, FormsModule, RouterModule,MatTooltipModule],
  templateUrl: './historial-sabaticos.html',
  styleUrl: './historial-sabaticos.scss',
})

export class HistorialSabaticos {

  //TRANSLATE
  currentLang = 'es'; 

  //roles y permisos
  rol: RolOperativo = 'DOCENTE';
  rolReal: RolSistema | '' = '';
  rolConsulta: RolOperativo = 'SECRETARIA_ACADEMICA';
  documentoDocenteConsulta = '';
  readonly rolesConsultaOptions: RolOperativo[] = ['DOCENTE', 'SECRETARIA_ACADEMICA'];
  readonly estadosConsultaSecretariaAcademica: string[] = [
    EstadoSabaticoCode.REVISION_SA,
    EstadoSabaticoCode.SOCIALIZACION_PENDIENTE,
  ];
  readonly estadosConsultaSecretariaAcademicaVencidos: string[] = [
    EstadoSabaticoCode.EN_EJECUCION,
  ];
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
  readonly displayedColumnsDocente = ['id', 'fechaInicio', 'fechaFinal', 'estadoSabatico', 'gestion'];
  readonly displayedColumnsConDocente = ['id', 'fechaInicio', 'fechaFinal', 'docente' ,'estadoSabatico' , 'gestion'];
  displayedColumns = [...this.displayedColumnsConDocente];
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

  get esModoConsultaAdmin(): boolean {
    return this.rolReal === 'ADMIN_SGA';
  }

  get isConsultaDocenteAdmin(): boolean {
    return this.esModoConsultaAdmin && this.isDocente;
  }

  get canBuscarDocenteConsulta(): boolean {
    return this.isConsultaDocenteAdmin
      && !this.cargandoHistorialSabaticos
      && this.documentoDocenteConsulta.trim().length > 0;
  }

  get roleInfoMessageKey(): string {
    if (this.esModoConsultaAdmin) {
      return 'HISTORIAL_SABATICOS.roleInfo.adminConsulta';
    }

    if (this.isSecretariaAcademica) {
      return 'HISTORIAL_SABATICOS.roleInfo.secretariaAcademica';
    }

    return 'HISTORIAL_SABATICOS.roleInfo.docente';
  }

  canCrearSolicitud(solicitud: HistorialEstadoSabaticos): boolean {
    if (this.esModoConsultaAdmin) {
      return false;
    }
    const enEstadoIncumplimiento = solicitud?.estadoSabaticoCodigo != EstadoSabaticoCode.INCUMPLIMIENTO
    return this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Crear_Solicitud_Sabatico') && enEstadoIncumplimiento;
  }

  get canEnviarSabaticos(): boolean {
    if (this.esModoConsultaAdmin) {
      return false;
    }
    return this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Enviar_Sabatico');
  }

  canReporteProducto(solicitud: HistorialEstadoSabaticos): boolean {
    if (this.esModoConsultaAdmin) {
      return false;
    }
    return this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Reporte_Productos');
  }

  canVisualizarPlanTrabajo(_: HistorialEstadoSabaticos): boolean {
    return this.esModoConsultaAdmin
      && this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Visualizar_Plan_Trabajo');
  }

  canFinalizarSabatico(solicitud: HistorialEstadoSabaticos): boolean {
    if (this.esModoConsultaAdmin) {
      return false;
    }
    const tienePermiso = this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Finalizar_Sabatico');
    const enEstadoSocializacionPendiente = solicitud?.estadoSabaticoCodigo === EstadoSabaticoCode.SOCIALIZACION_PENDIENTE
    return tienePermiso && enEstadoSocializacionPendiente;
  }

    canIncumplimientoSabatico(solicitud: HistorialEstadoSabaticos): boolean {
    if (this.esModoConsultaAdmin) {
      return false;
    }
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
    localStorage.setItem('rolReal', this.rolReal || this.rol);
    localStorage.setItem('readOnly', String(this.esModoConsultaAdmin));
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

    Promise.all([
      this.autenticationService.getRole(),
      this.autenticationService.getDocument()
    ]).then(([roles, documento]: [unknown, unknown]) => {
      this.inicializarRol(roles);
      this.cargarPermisosPorRol(this.rolReal || this.rol);
      this.documento = String(documento ?? '');
      this.loadEstadosSabaticos();

      if (this.esModoConsultaAdmin) {
        this.loadHistorialSabaticos();
      } else {
        this.loadTerceroId();
      }
    });
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
      if (this.esModoConsultaAdmin && !this.terceroId) {
        this.displayedColumns = [...this.displayedColumnsDocente];
        this.historialEstadoSabaticos = [];
        this.applyFilters();
        this.cargandoHistorialSabaticos = false;
        return;
      }

      endpoint = `historial_estado_sabatico?query=TerceroId:${this.terceroId},Activo:True&limit=-1`;
      this.displayedColumns = [...this.displayedColumnsDocente];
      service = this.sabaticosCrudService;
    }

    if (this.isSecretariaAcademica){
      this.displayedColumns = [...this.displayedColumnsConDocente];
      endpoint = this.esModoConsultaAdmin
        ? 'historial_estado_sabatico?query=Activo:True&limit=-1'
        : `sabatico/sabaticos_secretaria/${this.documento}`;
      service = this.esModoConsultaAdmin
        ? this.sabaticosCrudService
        : this.sabaticoMidService
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
          const apiSolicitudes = this.filtrarHistorialPorRol(
            this.mapHistorialResponse(Array.isArray(data) ? data : [])
          );
          this.historialEstadoSabaticos = apiSolicitudes;
          this.applyFilters();
          this.cargandoHistorialSabaticos = false;
          if (this.esModoConsultaAdmin && this.isSecretariaAcademica) {
            this.fetchDocenteInfoForSabaticos(apiSolicitudes);
          }
        },
        error: (error:any) => {
          this.cargandoHistorialSabaticos = false;
        }
      });
  }

  private inicializarRol(rolesRaw: unknown): void {
    const roles = Array.isArray(rolesRaw) ? rolesRaw.map(String) : [];
    const rolesSoportados: RolSistema[] = ['DOCENTE', 'SECRETARIA_ACADEMICA', 'ADMIN_SGA'];
    const rolEncontrado = roles.find((rol) => rolesSoportados.includes(rol as RolSistema)) as RolSistema | undefined;

    this.rolReal = roles.includes('ADMIN_SGA')
      ? 'ADMIN_SGA'
      : rolEncontrado ?? '';
    this.rol = this.esModoConsultaAdmin
      ? this.rolConsulta
      : (this.rolReal as RolOperativo) || 'DOCENTE';
  }

  private cargarPermisosPorRol(rol: string): void {
    if (!rol) {
      this.permisos = [];
      return;
    }

    this.configuracionService.get(`perfil_x_menu_opcion?limit=-1&query=Perfil__Nombre__in:${rol}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response: any) => {
        this.permisos = response;
      });
  }

  onRolConsultaChange(rol: RolOperativo): void {
    if (!this.esModoConsultaAdmin || this.rolConsulta === rol) {
      return;
    }

    this.rolConsulta = rol;
    this.rol = rol;
    if (rol !== 'DOCENTE') {
      this.documentoDocenteConsulta = '';
    }
    this.terceroId = 0;
    this.loadHistorialSabaticos();
  }

  onDocumentoDocenteConsultaChange(value: string): void {
    this.documentoDocenteConsulta = value;
  }

  onBuscarDocenteConsulta(): void {
    if (!this.canBuscarDocenteConsulta) {
      return;
    }

    this.loadTerceroIdConsultaDocente(this.documentoDocenteConsulta.trim());
  }

  getRolConsultaTranslationKey(rol: RolOperativo): string {
    const traducciones: Record<RolOperativo, string> = {
      DOCENTE: 'HISTORIAL_SABATICOS.adminConsulta.roles.docente',
      SECRETARIA_ACADEMICA: 'HISTORIAL_SABATICOS.adminConsulta.roles.secretariaAcademica',
    };
    return traducciones[rol];
  }

  private loadTerceroIdConsultaDocente(documento: string): void {
    const endpoint = `datos_identificacion?query=Activo:true,Numero:${documento}&sortby=FechaCreacion&order=desc`;
    this.loaderService.show();
    this.tercerosService.get(endpoint)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loaderService.hide()))
      .subscribe({
        next: (response: any) => {
          const data = response?.Data ?? response ?? [];
          if (Array.isArray(data) && data.length > 0) {
            const tercero = data[0]?.TerceroId;
            this.terceroId = Number(tercero?.Id ?? tercero ?? 0);
            this.loadHistorialSabaticos();
            return;
          }

          this.terceroId = 0;
          this.historialEstadoSabaticos = [];
          this.applyFilters();
        },
        error: () => {
          this.terceroId = 0;
          this.historialEstadoSabaticos = [];
          this.applyFilters();
        }
      });
  }

  private filtrarHistorialPorRol(historial: HistorialEstadoSabaticos[]): HistorialEstadoSabaticos[] {
    if (this.esModoConsultaAdmin && this.isSecretariaAcademica) {
      return historial.filter((item) => {
        const codigo = item.estadoSabaticoCodigo ?? '';
        if (this.estadosConsultaSecretariaAcademica.includes(codigo)) {
          return true;
        }

        return this.estadosConsultaSecretariaAcademicaVencidos.includes(codigo)
          && this.isFechaFinVencida(item.fechaFinal);
      });
    }

    return historial;
  }

  private isFechaFinVencida(fechaFinal: string): boolean {
    const fecha = this.parseLocalDate(fechaFinal);
    if (!fecha) {
      return false;
    }

    const hoy = new Date();
    const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
    return fecha.getTime() < hoySinHora;
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
      const terceroId = Number(
        item.TerceroId?.Id ??
        item.TerceroId ??
        item.SabaticoId?.TerceroId?.Id ??
        item.SabaticoId?.TerceroId
      );
  
      return {
        id: String(item.SabaticoId?.Id ?? item.Id ?? ''),
        fechaInicio: this.formatApiDate(item.SabaticoId?.FechaInicio ) ?? '',
        fechaFinal: this.formatApiDate(item.SabaticoId?.FechaFin) ?? '',
        estadoSabatico: item.EstadoSabaticoId?.NombreEstado,
        estadoSabaticoCodigo: item.EstadoSabaticoId?.CodigoAbreviacion,
        docenteNombre: item.Tercero?.NombreCompleto ?? item.TerceroId?.NombreCompleto ?? '',
        ...(Number.isFinite(terceroId) && terceroId > 0 ? { terceroIdDocente: terceroId } : {})
      };
    });
  }

  private fetchDocenteInfoForSabaticos(sabaticos: HistorialEstadoSabaticos[]): void {
    const terceroIds = [...new Set(
      sabaticos
        .filter((item) => !item.docenteNombre)
        .map((item) => item.terceroIdDocente)
        .filter((id): id is number => Boolean(id && id > 0))
    )];

    terceroIds.forEach((terceroId) => {
      this.tercerosService.get(`tercero/${terceroId}`)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response: any) => {
            const nombre = response?.NombreCompleto ?? '';
            if (!nombre) {
              return;
            }

            this.historialEstadoSabaticos.forEach((item) => {
              if (item.terceroIdDocente === terceroId) {
                item.docenteNombre = nombre;
              }
            });
            this.applyFilters();
          },
          error: () => {}
        });
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

  private parseLocalDate(value: string): Date | null {
    if (!value) {
      return null;
    }

    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
      return null;
    }

    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
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
