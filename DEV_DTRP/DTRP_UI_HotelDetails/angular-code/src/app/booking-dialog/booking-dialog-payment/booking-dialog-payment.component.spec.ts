import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingDialogPaymentComponent } from './booking-dialog-payment.component';

describe('BookingDialogPaymentComponent', () => {
  let component: BookingDialogPaymentComponent;
  let fixture: ComponentFixture<BookingDialogPaymentComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BookingDialogPaymentComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BookingDialogPaymentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
