import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MyLibraryComponent } from './my-library.component';
import { LocalBibliographyService } from '../../services/local-bibliography.service';
import { WordCitationService } from '../../services/word-citation.service';

describe('MyLibraryComponent', () => {
  let component: MyLibraryComponent;
  let fixture: ComponentFixture<MyLibraryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyLibraryComponent],
      providers: [
        LocalBibliographyService,
        WordCitationService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MyLibraryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter tag selection', () => {
    component.setFilterTag('genomics');
    expect(component.selectedTag()).toBe('genomics');
    expect(component.selectedCollectionId()).toBeNull();
  });

  it('should clear all filters and reset pageIndex', () => {
    component.searchQuery.set('CRISPR');
    component.setFilterTag('genomics');
    component.pageIndex.set(2);
    component.clearAllFilters();
    expect(component.searchQuery()).toBe('');
    expect(component.selectedTag()).toBeNull();
    expect(component.selectedCollectionId()).toBeNull();
    expect(component.pageIndex()).toBe(0);
  });

  it('should compute pagination metrics correctly', () => {
    component.selectedPageSize.set(5);
    expect(component.pageIndex()).toBe(0);
    component.nextPage();
    // with 0 items, totalPages is 1, pageIndex stays 0
    expect(component.pageIndex()).toBe(0);
  });

  it('should render Load Bibliography button and session warning banner when not authenticated', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Load Bibliography');
    expect(el.querySelector('.session-warning-banner')).toBeTruthy();
    expect(el.querySelector('.session-warning-banner')?.textContent).toContain('Session Storage:');
    expect(el.querySelector('.session-warning-banner')?.textContent).toContain('Cloud synchronization is supported only when signed in');
  });

  it('should render Local indicator with green OK by default and red when error occurs', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(component.localStatus().status).toBe('ok');
    expect(component.localStatus().label).toBe('Local: OK');
    expect(el.textContent).toContain('Local: OK');
    expect(el.querySelector('.status-indicator-badge.is-ok')).toBeTruthy();

    // Trigger local error
    component.bibService.error.set('Failed to open database');
    fixture.detectChanges();
    expect(component.localStatus().status).toBe('error');
    expect(component.localStatus().label).toBe('Local: Error');
  });

  it('should render Cloud indicator as red when not logged in, green when logged in, and yellow on connection error', () => {
    const el = fixture.nativeElement as HTMLElement;

    // 1. Not logged in: Red
    expect(component.cloudStatus().status).toBe('error');
    expect(component.cloudStatus().label).toBe('Cloud: Sync Off');
    expect(el.textContent).toContain('Cloud: Sync Off');

    // 2. Logged in and OK: Green
    component.authService.currentUser.set({ id: 1, email_address: 'scientist@nih.gov', name: 'Dr. Scientist' });
    fixture.detectChanges();
    expect(component.cloudStatus().status).toBe('ok');
    expect(component.cloudStatus().label).toBe('Cloud: OK');

    // 3. Connection problem: Yellow
    component.cloudSync.syncError.set('Network timeout connecting to Biblion Cloud');
    fixture.detectChanges();
    expect(component.cloudStatus().status).toBe('warning');
    expect(component.cloudStatus().label).toBe('Cloud: Connection Issue');
  });
});
