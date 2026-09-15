import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyLibraryComponent } from './my-library.component';
import { LocalBibliographyService } from '../../services/local-bibliography.service';
import { WordCitationService } from '../../services/word-citation.service';

describe('MyLibraryComponent', () => {
  let component: MyLibraryComponent;
  let fixture: ComponentFixture<MyLibraryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyLibraryComponent],
      providers: [LocalBibliographyService, WordCitationService]
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
});
