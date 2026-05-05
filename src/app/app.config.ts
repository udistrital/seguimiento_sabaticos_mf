import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { HttpClient, provideHttpClient, withFetch } from '@angular/common/http';
import { APP_BASE_HREF, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import localeEn from '@angular/common/locales/en';

// Importaciones oficiales para Standalone v17+
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader, TranslateHttpLoader } from '@ngx-translate/http-loader';

import { getSingleSpaExtraProviders } from 'single-spa-angular';
import { provideNativeDateAdapter } from '@angular/material/core';
import { routes } from './app.routes';

registerLocaleData(localeEs);
registerLocaleData(localeEn);

// export function createTranslateLoader(http: HttpClient) {
//   return new TranslateHttpLoader(
//     http,
//     environment.apiUrl + 'assets/i18n/',
//     '.json'
//   );
// }

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: APP_BASE_HREF, useValue: '/seguimiento-sabaticos/' },
    provideAnimationsAsync(),
    provideNativeDateAdapter(),
    provideHttpClient(withFetch()),
    provideTranslateService({
      fallbackLang: 'es',
      loader: provideTranslateHttpLoader({
        prefix: 'http://localhost:4222/assets/i18n/',
        suffix: '.json'
      })
    }),

    getSingleSpaExtraProviders()
  ]
};
