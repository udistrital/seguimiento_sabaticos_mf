import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class LoaderService {
  private readonly activeRequests$ = new BehaviorSubject<number>(0);

  readonly isLoading$ = this.activeRequests$.pipe(
    map(count => count > 0),
    distinctUntilChanged()
  );

  show(): void {
    this.activeRequests$.next(this.activeRequests$.value + 1);
  }

  hide(): void {
    const next = Math.max(0, this.activeRequests$.value - 1);
    this.activeRequests$.next(next);
  }

  reset(): void {
    this.activeRequests$.next(0);
  }
}
