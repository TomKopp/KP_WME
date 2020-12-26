import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TripSectionOverviewComponent } from './trip-section-overview.component';

describe('TripSectionOverviewComponent', () => {
  let component: TripSectionOverviewComponent;
  let fixture: ComponentFixture<TripSectionOverviewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TripSectionOverviewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TripSectionOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
