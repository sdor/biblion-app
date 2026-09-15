import { Routes } from '@angular/router';
import { PubmedSearchComponent } from './components/pubmed-search/pubmed-search.component';
import { CursorReferencesComponent } from './components/cursor-references/cursor-references.component';
import { MyLibraryComponent } from './components/my-library/my-library.component';

export const routes: Routes = [
  { path: '', component: PubmedSearchComponent },
  { path: 'pubmed', component: PubmedSearchComponent },
  { path: 'library', component: MyLibraryComponent },
  { path: 'cursor-references', component: CursorReferencesComponent },
  { path: '**', redirectTo: '' }
];
