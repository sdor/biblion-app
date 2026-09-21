import { Component, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe, UpperCasePipe } from '@angular/common';
import { SubscriptionService } from '../../services/subscription.service';

@Component({
  selector: 'app-subscription-modal',
  standalone: true,
  imports: [CommonModule, DatePipe, UpperCasePipe],
  templateUrl: './subscription-modal.component.html',
  styleUrls: ['./subscription-modal.component.scss']
})
export class SubscriptionModalComponent {
  readonly subscriptionService = inject(SubscriptionService);
  readonly subscription = this.subscriptionService.subscription;

  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.subscriptionService.closeSubscriptionModal();
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close();
    }
  }

  subscribeNow(): void {
    this.subscriptionService.openCheckout();
  }

  cancelSubscription(): void {
    if (confirm('Are you sure you want to cancel your subscription? Automatic renewal will be stopped, but you will retain full access for the remainder of your billing period. Please note that the remainder of your subscription is non-refundable.')) {
      this.subscriptionService.cancelSubscription().subscribe({
        error: () => {}
      });
    }
  }

  resumeSubscription(): void {
    this.subscriptionService.resumeSubscription().subscribe({
      error: () => {}
    });
  }

  openPortal(): void {
    this.subscriptionService.openCustomerPortal();
  }

  updatePaymentMethod(): void {
    this.subscriptionService.openUpdatePaymentMethod();
  }
}
