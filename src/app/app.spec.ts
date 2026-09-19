import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { App } from './app';
import { WordCitationService } from './services/word-citation.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideHttpClient()
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should display brand name Biblion', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-name')?.textContent).toContain('Biblion');
  });

  it('should not display citation style selector when open in browser', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-citation-style-selector')).toBeNull();
  });

  it('should display citation style selector when open inside Word', async () => {
    const fixture = TestBed.createComponent(App);
    const wordService = TestBed.inject(WordCitationService);
    wordService.isWord.set(true);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-citation-style-selector')).toBeTruthy();
  });

  it('should not display Live References nav tab when open in browser', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.cursor-nav-item')).toBeNull();
  });

  it('should display Live References nav tab when running in Word', async () => {
    const fixture = TestBed.createComponent(App);
    const wordService = TestBed.inject(WordCitationService);
    wordService.isWord.set(true);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.cursor-nav-item')).toBeTruthy();
    expect(compiled.querySelector('.cursor-nav-item')?.textContent).toContain('Live References');
  });

  it('should display Sign In button when user is not authenticated', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.btn-auth-signin')).toBeTruthy();
    expect(compiled.querySelector('.btn-auth-signin')?.textContent).toContain('Sign In');
  });

  it('should toggle auth modal when openAuthModal / closeAuthModal are called', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();

    expect(app.isAuthModalOpen()).toBe(false);
    app.openAuthModal();
    fixture.detectChanges();
    expect(app.isAuthModalOpen()).toBe(true);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-auth-modal')).toBeTruthy();

    app.closeAuthModal();
    fixture.detectChanges();
    expect(app.isAuthModalOpen()).toBe(false);
    expect(compiled.querySelector('app-auth-modal')).toBeNull();
  });

  it('should open edit account modal via openEditAccount when authenticated', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.authService.token.set('valid-token');
    app.authService.currentUser.set({ id: 1, email_address: 'test@example.com' });
    await fixture.whenStable();
    fixture.detectChanges();

    app.openEditAccount();
    fixture.detectChanges();

    expect(app.isAuthModalOpen()).toBe(true);
    expect(app.authService.authModalMode()).toBe('edit');
    expect(app.isUserMenuOpen()).toBe(false);
  });
});
