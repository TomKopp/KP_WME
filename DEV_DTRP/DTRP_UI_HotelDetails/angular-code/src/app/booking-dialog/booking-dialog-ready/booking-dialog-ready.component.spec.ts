import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingDialogReadyComponent } from './booking-dialog-ready.component';

describe('BookingDialogReadyComponent', () => {
  let component: BookingDialogReadyComponent;
  let fixture: ComponentFixture<BookingDialogReadyComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BookingDialogReadyComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BookingDialogReadyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
