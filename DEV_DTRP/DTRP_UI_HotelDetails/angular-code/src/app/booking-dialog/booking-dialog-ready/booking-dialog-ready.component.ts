import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-booking-dialog-ready',
  templateUrl: './booking-dialog-ready.component.html',
  styleUrls: ['./booking-dialog-ready.component.scss']
})
export class BookingDialogReadyComponent implements OnInit {

  @Input("hotelData") hotelData: any;

  constructor() { }

  ngOnInit() {
  }

}
