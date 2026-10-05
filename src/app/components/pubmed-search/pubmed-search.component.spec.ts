import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PubmedSearchComponent } from './pubmed-search.component';
import { PubmedService } from '../../services/pubmed.service';
import { WordCitationService } from '../../services/word-citation.service';

describe('PubmedSearchComponent', () => {
  let component: PubmedSearchComponent;
  let fixture: ComponentFixture<PubmedSearchComponent>;
  let pubmedService: PubmedService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PubmedSearchComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PubmedSearchComponent);
    component = fixture.componentInstance;
    pubmedService = TestBed.inject(PubmedService);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('Search Button enabled/disabled states', () => {
    it('should have Search button enabled when search term is empty and not loading', () => {
      component.searchTerm.set('');
      pubmedService.isLoading.set(false);
      fixture.detectChanges();

      const searchBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.submit-search-btn');
      expect(searchBtn).toBeTruthy();
      expect(searchBtn.disabled).toBe(false);
    });

    it('should have Search button disabled when pubmedService.isLoading is true', () => {
      pubmedService.isLoading.set(true);
      fixture.detectChanges();

      const searchBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.submit-search-btn');
      expect(searchBtn).toBeTruthy();
      expect(searchBtn.disabled).toBe(true);
    });

    it('should have exactly 3 sample query examples', () => {
      expect(component.sampleQueries.length).toBe(3);
      const chipButtons = fixture.nativeElement.querySelectorAll('.query-chips .chip-btn');
      expect(chipButtons.length).toBe(3);
    });
  });

  describe('Search submission behavior', () => {
    it('should clear search results and restore pristine page when Search button is clicked with an empty string', () => {
      // Simulate existing search results on page
      pubmedService.hasSearched.set(true);
      pubmedService.articles.set([{ pmid: '12345', title: 'Test Article' } as any]);
      pubmedService.currentTerm.set('Cancer');
      component.searchTerm.set('');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.welcome-guide')).toBeNull();

      const searchBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.submit-search-btn');
      searchBtn.click();
      fixture.detectChanges();

      expect(pubmedService.hasSearched()).toBe(false);
      expect(pubmedService.articles()).toEqual([]);
      expect(pubmedService.currentTerm()).toBe('');
      expect(fixture.nativeElement.querySelector('.welcome-guide')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.cards-list')).toBeNull();
    });

    it('should clear search results and restore pristine page when Search button is clicked with only whitespace', () => {
      pubmedService.hasSearched.set(true);
      pubmedService.articles.set([{ pmid: '12345', title: 'Test Article' } as any]);
      pubmedService.currentTerm.set('Cancer');
      component.searchTerm.set('    ');
      fixture.detectChanges();

      const searchBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.submit-search-btn');
      searchBtn.click();
      fixture.detectChanges();

      expect(pubmedService.hasSearched()).toBe(false);
      expect(pubmedService.articles()).toEqual([]);
      expect(pubmedService.currentTerm()).toBe('');
      expect(fixture.nativeElement.querySelector('.welcome-guide')).toBeTruthy();
    });

    it('should call executeSearch when Search button is clicked with a valid query', () => {
      const executeSearchSpy = vi.spyOn(pubmedService, 'executeSearch').mockReturnValue(of({} as any));
      component.searchTerm.set('CRISPR');
      fixture.detectChanges();

      const searchBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.submit-search-btn');
      searchBtn.click();
      fixture.detectChanges();

      expect(executeSearchSpy).toHaveBeenCalledWith('CRISPR', 0, component.selectedPageSize());
    });
  });

  describe('AI Rewrite information', () => {
    it('should display AI Query Rewrite guide card in the initial welcome state', () => {
      pubmedService.hasSearched.set(false);
      pubmedService.isLoading.set(false);
      fixture.detectChanges();

      const aiGuideCard = fixture.nativeElement.querySelector('.ai-guide-card');
      expect(aiGuideCard).toBeTruthy();
      expect(aiGuideCard.textContent).toContain('AI Query Rewrite');
      expect(aiGuideCard.textContent).toContain('Pro Feature');
      expect(aiGuideCard.textContent).toContain('MeSH terms');
    });

    it('should provide a "What is AI Rewrite?" toggle button', () => {
      const toggleBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.ai-info-toggle-btn');
      expect(toggleBtn).toBeTruthy();
      expect(toggleBtn.textContent).toContain('What is AI Rewrite?');
    });

    it('should toggle AI Rewrite explanation card when toggle button is clicked', () => {
      expect(component.showAiInfo()).toBe(false);
      expect(fixture.nativeElement.querySelector('.ai-info-card')).toBeNull();

      const toggleBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.ai-info-toggle-btn');
      toggleBtn.click();
      fixture.detectChanges();

      expect(component.showAiInfo()).toBe(true);
      const infoCard = fixture.nativeElement.querySelector('.ai-info-card');
      expect(infoCard).toBeTruthy();
      expect(infoCard.textContent).toContain('What is AI Rewrite?');
      expect(infoCard.textContent).toContain('MeSH & Field Tags');
      expect(infoCard.textContent).toContain('Boolean Grouping');
      expect(infoCard.textContent).toContain('Bring Your Own Key');

      // Click again or close button should hide it
      const closeBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.ai-info-close-btn');
      closeBtn.click();
      fixture.detectChanges();

      expect(component.showAiInfo()).toBe(false);
      expect(fixture.nativeElement.querySelector('.ai-info-card')).toBeNull();
    });

    it('should indicate that AI Rewrite is a Pro feature requiring a subscription in the info card', () => {
      component.showAiInfo.set(true);
      fixture.detectChanges();

      const infoCard = fixture.nativeElement.querySelector('.ai-info-card');
      expect(infoCard.textContent).toContain('Pro Feature');
      expect(infoCard.textContent).toContain('Pro feature requiring an active subscription or free trial');
      expect(infoCard.textContent).toContain('Subscription Required');
    });

    it('should disable Configure AI Settings button when user is not signed in', () => {
      component.authService.token.set(null);
      component.authService.currentUser.set(null);
      component.showAiInfo.set(true);
      fixture.detectChanges();

      expect(component.hasProAccess()).toBe(false);
      const configBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-configure-ai');
      expect(configBtn).toBeTruthy();
      expect(configBtn.disabled).toBe(true);
      expect(configBtn.title).toContain('Sign in required');
      expect(fixture.nativeElement.querySelector('.btn-sub-action').textContent).toContain('Sign In to Unlock Pro');
    });

    it('should disable Configure AI Settings button when user is signed in but subscription is expired and trial ended', () => {
      component.authService.token.set('test-jwt');
      component.authService.currentUser.set({
        id: 1,
        email_address: 'test@example.com',
        subscription: { active: false, on_trial: false, status: 'expired' } as any
      });
      component.showAiInfo.set(true);
      fixture.detectChanges();

      expect(component.hasProAccess()).toBe(false);
      const configBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-configure-ai');
      expect(configBtn.disabled).toBe(true);
      expect(configBtn.title).toContain('Active subscription or free trial required');
      expect(fixture.nativeElement.querySelector('.btn-sub-action').textContent).toContain('Subscribe to Unlock Pro');
    });

    it('should enable Configure AI Settings button and open modal when user has an active subscription', () => {
      const openModalSpy = vi.spyOn(component.aiSettingsService, 'openSettingsModal');
      component.authService.token.set('test-jwt');
      component.authService.currentUser.set({
        id: 1,
        email_address: 'test@example.com',
        subscription: { active: true, on_trial: false, status: 'active' } as any
      });
      component.showAiInfo.set(true);
      fixture.detectChanges();

      expect(component.hasProAccess()).toBe(true);
      const configBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-configure-ai');
      expect(configBtn.disabled).toBe(false);

      configBtn.click();
      fixture.detectChanges();

      expect(openModalSpy).toHaveBeenCalled();
    });

    it('should enable Configure AI Settings button when user is on an active free trial', () => {
      component.authService.token.set('test-jwt');
      component.authService.currentUser.set({
        id: 1,
        email_address: 'test@example.com',
        subscription: { active: false, on_trial: true, status: 'on_trial' } as any
      });
      component.showAiInfo.set(true);
      fixture.detectChanges();

      expect(component.hasProAccess()).toBe(true);
      const configBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-configure-ai');
      expect(configBtn.disabled).toBe(false);
    });

    it('should close AI Rewrite explanation when "Got it" button is clicked', () => {
      component.showAiInfo.set(true);
      fixture.detectChanges();

      const dismissBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-dismiss-ai-info');
      expect(dismissBtn).toBeTruthy();
      dismissBtn.click();
      fixture.detectChanges();

      expect(component.showAiInfo()).toBe(false);
      expect(fixture.nativeElement.querySelector('.ai-info-card')).toBeNull();
    });
  });
});
