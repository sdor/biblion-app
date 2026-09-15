import { TestBed } from '@angular/core/testing';
import { IndexedDbService } from './indexed-db.service';

describe('IndexedDbService', () => {
  let service: IndexedDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IndexedDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should check IndexedDB support status', () => {
    const isSupported = service.isSupported();
    expect(typeof isSupported).toBe('boolean');
  });
});
