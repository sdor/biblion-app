import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-about-support',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './about-support.component.html',
  styleUrl: './about-support.component.scss'
})
export class AboutSupportComponent {
  readonly copiedEmail = signal<boolean>(false);
  readonly supportEmail = 'support@biosystechnologies.com';

  copyEmail(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(this.supportEmail).then(() => {
        this.copiedEmail.set(true);
        setTimeout(() => this.copiedEmail.set(false), 2500);
      });
    }
  }
}
