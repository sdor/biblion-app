import { Component, inject, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule, DatePipe, UpperCasePipe } from '@angular/common';
import { SubscriptionService } from '../../services/subscription.service';

@Component({
  selector: 'app-subscription-modal',
  standalone: true,
  imports: [CommonModule, DatePipe, UpperCasePipe],
  templateUrl: './subscription-modal.component.html',
  styleUrls: ['./subscription-modal.component.scss']
})
export class SubscriptionModalComponent implements OnInit {
  readonly subscriptionService = inject(SubscriptionService);
  readonly subscription = this.subscriptionService.subscription;

  @Output() closed = new EventEmitter<void>();

  ngOnInit(): void {
    this.subscriptionService.preloadCheckoutUrl();
  }

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
    let confirmed = true;
    try {
      const message = this.subscriptionService.isOnTrial()
        ? 'Are you sure you want to cancel your free trial? Your trial access will end immediately. You will have a 30-day grace period to subscribe before cloud data is permanently erased.'
        : 'Are you sure you want to cancel your subscription? Automatic renewal will be stopped, but you will retain full access for the remainder of your billing period. Please note that payments are non-refundable.';
      confirmed = confirm(message);
    } catch {
      // In Office.js taskpanes, window.confirm throws "Function window.confirm is not supported."
      confirmed = true;
    }
    if (confirmed) {
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
