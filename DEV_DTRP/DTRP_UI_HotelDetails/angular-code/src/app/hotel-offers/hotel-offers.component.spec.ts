import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HotelOffersComponent } from './hotel-offers.component';

describe('HotelOffersComponent', () => {
  let component: HotelOffersComponent;
  let fixture: ComponentFixture<HotelOffersComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HotelOffersComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HotelOffersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
