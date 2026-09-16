import { Routes } from '@angular/router';
import { PubmedSearchComponent } from './components/pubmed-search/pubmed-search.component';
import { CursorReferencesComponent } from './components/cursor-references/cursor-references.component';
import { MyLibraryComponent } from './components/my-library/my-library.component';
import { AboutSupportComponent } from './components/about-support/about-support.component';
import { PrivacyPolicyComponent } from './components/privacy-policy/privacy-policy.component';
import { TermsOfUseComponent } from './components/terms-of-use/terms-of-use.component';

export const routes: Routes = [
  { path: '', component: PubmedSearchComponent },
  { path: 'pubmed', component: PubmedSearchComponent },
  { path: 'library', component: MyLibraryComponent },
  { path: 'cursor-references', component: CursorReferencesComponent },
  { path: 'about', component: AboutSupportComponent },
  { path: 'support', component: AboutSupportComponent },
  { path: 'privacy', component: PrivacyPolicyComponent },
  { path: 'terms', component: TermsOfUseComponent },
  { path: '**', redirectTo: '' }
];
