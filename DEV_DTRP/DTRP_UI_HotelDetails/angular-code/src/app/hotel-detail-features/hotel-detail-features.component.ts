import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-hotel-detail-features',
  templateUrl: './hotel-detail-features.component.html',
  styleUrls: ['./hotel-detail-features.component.scss']
})
export class HotelDetailFeaturesComponent implements OnInit {

  @Input("featureList") featureList:HotelDetailFeaturesItem[] = [];
  @Input("windowWidth") windowWidth: number = 0;

  constructor() { 
  }

  ngOnInit() {
  }

}

export interface HotelDetailFeaturesItem {
  readonly id : string;
  name: string;
  icon: string;
}

export class PoolFeature implements HotelDetailFeaturesItem {
  public name = "Pool";
  public icon = "pool";
  public readonly id = "pool";
}
export class WLANFeature implements HotelDetailFeaturesItem {
  public name = "Wifi";
  public icon = "wifi";
  public readonly id = "wifi";
}
export class ParkingFeature implements HotelDetailFeaturesItem {
  public name = "Free Parking";
  public icon = "local_parking";
  public readonly id = "local_parking";
}
export class AirportShuttleFeature implements HotelDetailFeaturesItem {
  public name = "Airport Shuttle";
  public icon = "airport_shuttle";
  public readonly id = "airport_shuttle";
}
export class FitnessCenterFeature implements HotelDetailFeaturesItem {
  public name = "Fitness Center";
  public icon = "fitness_center";
  public readonly id = "fitness_center";
}
export class GolfFeature implements HotelDetailFeaturesItem {
  public name = "Golf course";
  public icon = "golf_course";
  public readonly id = "golf_course";
}
export class BreakfastFeature implements HotelDetailFeaturesItem {
  public name = "Free breakfast";
  public icon = "free_breakfast";
  public readonly id = "free_breakfast";
}
export class MeetingRoomsFeature implements HotelDetailFeaturesItem {
  public name = "Meeting rooms";
  public icon = "business_center";
  public readonly id = "meeting_rooms";
}
export class ChildrenFeature implements HotelDetailFeaturesItem {
  public name = "Child friendly";
  public icon = "child_friendly";
  public readonly id = "child_friendly";
}