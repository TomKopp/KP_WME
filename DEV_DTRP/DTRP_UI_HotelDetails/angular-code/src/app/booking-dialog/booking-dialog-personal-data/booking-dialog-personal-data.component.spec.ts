import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingDialogPersonalDataComponent } from './booking-dialog-personal-data.component';

describe('BookingDialogPersonalDataComponent', () => {
  let component: BookingDialogPersonalDataComponent;
  let fixture: ComponentFixture<BookingDialogPersonalDataComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BookingDialogPersonalDataComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BookingDialogPersonalDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
