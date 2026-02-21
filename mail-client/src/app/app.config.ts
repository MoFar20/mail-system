import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';

/**
 * Zentrale Anwendungskonfiguration.
 * Registriert das Routing und den HttpClient mit dem funktionalen Auth-Interceptor.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // Aktiviert die in app.routes.ts definierten Pfade
    provideRouter(routes),

    // Konfiguriert den HttpClient mit unserem JWT-Sicherheits-Header
    provideHttpClient(
      withInterceptors([authInterceptor])
    )
  ]
};
