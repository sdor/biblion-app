import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token();
  const isApiRequest =
    req.url.startsWith(authService.apiUrl) ||
    req.url.startsWith(environment.apiUrl) ||
    (!!environment.sslApiUrl && req.url.startsWith(environment.sslApiUrl)) ||
    req.url.startsWith('/api/');

  let modifiedReq = req;

  if (token && isApiRequest) {
    modifiedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(modifiedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // If unauthorized response from our API, clear local session
      if (error.status === 401 && isApiRequest && !req.url.includes('/api/v1/sessions')) {
        authService.clearSession();
      }
      return throwError(() => error);
    })
  );
};
