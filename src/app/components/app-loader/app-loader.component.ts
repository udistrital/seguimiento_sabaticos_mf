import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { LoaderService } from '../../services/loader.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-loader',
  templateUrl: './app-loader.component.html',
  styleUrls: ['./app-loader.component.scss'],
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLoaderComponent {
  readonly isLoading$: Observable<boolean>;

  constructor(private readonly loader: LoaderService) {
    this.isLoading$ = this.loader.isLoading$;
  }
}
