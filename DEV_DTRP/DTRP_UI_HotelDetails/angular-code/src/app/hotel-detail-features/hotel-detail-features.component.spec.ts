import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HotelDetailFeaturesComponent } from './hotel-detail-features.component';

describe('HotelDetailFeaturesComponent', () => {
  let component: HotelDetailFeaturesComponent;
  let fixture: ComponentFixture<HotelDetailFeaturesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HotelDetailFeaturesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HotelDetailFeaturesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
