import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { CloudSyncService } from './cloud-sync.service';
import { AuthService } from './auth.service';
import { IndexedDbService } from './indexed-db.service';

describe('CloudSyncService', () => {
  let service: CloudSyncService;
  let auth: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CloudSyncService,
        AuthService,
        IndexedDbService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(CloudSyncService);
    auth = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.isSyncing()).toBe(false);
  });

  it('should not sync if user is not authenticated', async () => {
    auth.currentUser.set(null);
    const result = await service.syncWithCloud();
    expect(result).toBe(false);
  });
});
