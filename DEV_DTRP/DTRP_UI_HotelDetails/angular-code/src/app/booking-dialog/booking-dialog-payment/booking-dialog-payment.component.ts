import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { MatRadioChange } from '@angular/material';

@Component({
  selector: 'app-booking-dialog-payment',
  templateUrl: './booking-dialog-payment.component.html',
  styleUrls: ['./booking-dialog-payment.component.scss']
})
export class BookingDialogPaymentComponent implements OnInit {

  @Output() selectedPayment: EventEmitter<PaymentOption> = new EventEmitter();

  readonly paymentOptions: {value: PaymentOption, label: string}[] = [
    { value: PaymentOption.CREDITCARD, label: "Kreditkarte" },
    { value: PaymentOption.PAYPAL, label: "PayPal" },
    { value: PaymentOption.SOFORT, label: "Sofort-Überweisung" },
    { value: PaymentOption.BEFORE, label: "Vorüberweisung" }
  ];

  constructor() { }

  ngOnInit() {
  }

  public selectPaymentOption(paymentOption: PaymentOption): void {
    this.selectedPayment.emit(paymentOption);
  }

}

export enum PaymentOption {
  CREDITCARD="CREDITCARD",
  PAYPAL="PAYPAL",
  SOFORT="SOFORT",
  BEFORE="BEFORE"
}
