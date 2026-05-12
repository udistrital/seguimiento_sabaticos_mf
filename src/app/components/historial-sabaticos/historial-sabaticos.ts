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
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSpinner } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { TercerosService } from '../../services/terceros.service';
import { RouterModule } from '@angular/router';

interface HistorialEstadoSabaticos {
  id: string;
  fechaInicio: string;
  fechaFinal: string;
  estadoSabatico: string;
}

interface ColumnFilters {
  id: string;
  fechaInicio: string;
  fechaFinal: string;
  estadoSabatico: string;
}

type FilterColumn = 'id' | 'fechaInicio' | 'fechaFinal' | 'estadoSabatico';

@Component({
  selector: 'historial-sabaticos',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatTableModule, TranslateModule, MatPaginatorModule, MatSpinner, TranslatePipe, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule, FormsModule, RouterModule],
  templateUrl: './historial-sabaticos.html',
  styleUrl: './historial-sabaticos.scss',
})

export class HistorialSabaticos {

  //TRANSLATE
  currentLang = 'es'; 

  //roles y permisos
  rol!: string;
  perfil!: string;
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
  readonly displayedColumns = ['id', 'fechaInicio', 'fechaFinal', 'estadoSabatico', 'gestion'];
  columnFilters: ColumnFilters = {
    id: '',
    fechaInicio: '',
    fechaFinal: '',
    estadoSabatico: '',
  };
  estadoOptions: string[] = [];
  

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

    return 'HISTORIAL_SABATICOS.roleInfo.docente';
  }

  get canCrearSolicitud(): boolean {
    return this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Crear_Solicitud_Sabatico');
  }

  get canEnviarSabaticos(): boolean {
    return this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Enviar_Sabatico');
  }

  get canReporteProducto(): boolean {
    return this.permisos.some((p: any) => p?.Opcion?.Nombre === 'Reporte_Productos');
  }


  get paginatedSabaticos(): HistorialEstadoSabaticos[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredSabaticos.slice(start, start + this.pageSize);
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

  constructor(
    private readonly destroyRef: DestroyRef,
    private readonly translate: TranslateService,
    private readonly configuracionService: ConfiguracionService,
    private readonly sabaticosCrudService: SabaticosCrudService,
    private readonly autenticationService: ImplicitAutenticationService,
    private readonly tercerosService: TercerosService
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
      this.perfil = response[0]?.Perfil?.Nombre ?? '';
    });



    if(this.isDocente) {
      this.autenticationService.getDocument().then((documento: any) => {
      this.documento = String(documento ?? '');

      console.log('Documento listo:', this.documento);
      this.loadTerceroId();
    });
    }else {
      console.log("Consulta y logica para secretaria academicca")
    }
  }

  ngOnInit(): void {
    this.translate.get('GLOBAL.saludo').subscribe((res: string) => {
    });
  }

  private loadTerceroId(): void {
    console.log('Documento:', this.documento);
    const endpoint = `datos_identificacion?query=Activo:true,Numero:${this.documento}&sortby=FechaCreacion&order=desc`;
    this.tercerosService.get(endpoint).subscribe((response: any) => {
      const data = response?.Data ?? response ?? [];
      if (Array.isArray(data) && data.length > 0) {
        const mapData = data[0]?.TerceroId ?? this.terceroId;
        this.terceroId = Number(mapData.Id);
        console.log('TerceroId obtenido:', this.terceroId);
        this.loadHistorialSabaticos();
      } else {
        console.warn('No se encontraron datos de identificación para el documento proporcionado.');
      }
    }, (error) => {
      console.error('Error al cargar datos de identificación:', error); 
    });
  } 


  private loadHistorialSabaticos(): void {
    this.cargandoHistorialSabaticos = true;
    const endpoint = `historial_estado_sabatico?query=TerceroId:${this.terceroId},Activo:True&limit=-1`;

    this.sabaticosCrudService.get(endpoint)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          const data = response?.Data ?? response ?? [];
          const apiSolicitudes = this.mapHistorialResponse(Array.isArray(data) ? data : []);
          this.historialEstadoSabaticos = apiSolicitudes;
          this.applyFilters();
          this.cargandoHistorialSabaticos = false;
        },
        error: (error) => {
          console.error('Error al cargar solicitudes del coordinador:', error);
          this.cargandoHistorialSabaticos = false;
        }
      });
  }

  private applyFilters(): void {
    this.estadoOptions = [...new Set(this.historialEstadoSabaticos.map(x => x.estadoSabatico))];
    this.filteredSabaticos = this.historialEstadoSabaticos.filter((historial) => {
      const matchesId = this.matchesFilter(historial.id, this.columnFilters.id);
      const matchesFechaInicio = this.matchesDate(historial.fechaInicio, this.columnFilters.fechaInicio);
      const matchesFechaFinal = this.matchesDate(historial.fechaFinal, this.columnFilters.fechaFinal);
      const matchesEstado = this.matchesFilter(historial.estadoSabatico, this.columnFilters.estadoSabatico);

      return matchesId && matchesFechaInicio && matchesFechaFinal && matchesEstado;
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
