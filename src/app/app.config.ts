import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { getSingleSpaExtraProviders } from 'single-spa-angular';

import { routes } from './app.routes';
import { APP_BASE_HREF } from '@angular/common';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: APP_BASE_HREF, useValue: '/seguimiento-sabaticos/' },
    provideAnimationsAsync(),
    provideHttpClient(withFetch()),
    TranslateModule.forRoot().providers!,
    getSingleSpaExtraProviders(),
    provideHttpClient(withFetch())
  ]
};
