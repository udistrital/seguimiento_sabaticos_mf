import { fromEvent } from 'rxjs';
import { getCookie } from '../utils/cookie';
import { RouterOutlet } from '@angular/router';
import { Component, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AppLoaderComponent } from './components/app-loader/app-loader.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'seguimiento-sabaticos-mf',
  imports: [CommonModule, RouterOutlet, AppLoaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('seguimiento-sabaticos-mf');

  whatLang$ = fromEvent(window, 'lang');

    constructor(
    private readonly translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.validateLang();
  }
  
  validateLang() {
    let lang = getCookie('lang') || 'es';
    this.whatLang$.subscribe((x: any) => {
      lang = x['detail']['answer'];
      this.translate.setDefaultLang(lang);
      this.translate.use(lang);
    });
    const initialLang = getCookie('lang') || 'es';
    this.translate.setDefaultLang(initialLang);
    this.translate.use(initialLang);

  }
}
