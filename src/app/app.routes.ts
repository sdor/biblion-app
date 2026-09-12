import { Routes } from '@angular/router';
import { PubmedSearchComponent } from './components/pubmed-search/pubmed-search.component';
import { CursorReferencesComponent } from './components/cursor-references/cursor-references.component';

export const routes: Routes = [
  { path: '', component: PubmedSearchComponent },
  { path: 'pubmed', component: PubmedSearchComponent },
  { path: 'cursor-references', component: CursorReferencesComponent },
  { path: '**', redirectTo: '' }
];
