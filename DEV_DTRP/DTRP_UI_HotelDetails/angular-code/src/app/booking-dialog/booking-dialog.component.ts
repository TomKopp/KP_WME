import { Component, OnInit, Input, Inject } from '@angular/core';
import { PaymentOption } from './booking-dialog-payment/booking-dialog-payment.component';
import { PersonalData } from './booking-dialog-personal-data/booking-dialog-personal-data.component';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

@Component({
  selector: 'app-booking-dialog',
  templateUrl: './booking-dialog.component.html',
  styleUrls: ['./booking-dialog.component.scss']
})
export class BookingDialogComponent implements OnInit {

  public selectedPaymentOption: PaymentOption;
  public selectedPersonalData: PersonalData;

  constructor(
    public dialogRef: MatDialogRef<BookingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
    ) { }

  ngOnInit() {
  }

  public changePersonalData(selectedPersonalData: PersonalData): void {
    this.selectedPersonalData = selectedPersonalData;
  }

  public changePayment(paymentOption: PaymentOption): void {
    this.selectedPaymentOption = paymentOption;
  }

  public closeDialog(): void {
    this.dialogRef.close();
  }

}
