import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { TripSectionHotelData, TripSectionHotelDataItem } from '../app.hotel-data';

@Component({
  selector: 'app-trip-overview',
  templateUrl: './trip-overview.component.html',
  styleUrls: ['./trip-overview.component.scss']
})
export class TripOverviewComponent {

  public tripSections: TripSectionHotelData[] = [];

  @Input("tripSections") set setTripSections(tripSections: TripSectionHotelData[]) {
    this.tripSections = JSON.parse(JSON.stringify(tripSections));
  };
  @Output("selectedHotel") selectedHotel: EventEmitter<{hotel: TripSectionHotelDataItem, trip: TripSectionHotelData}> = new EventEmitter<{hotel: TripSectionHotelDataItem, trip: TripSectionHotelData}>();
  @Output("removeHotel") removeHotel: EventEmitter<{hotelId: string, trip: TripSectionHotelData}> = new EventEmitter<{hotelId: string, trip: TripSectionHotelData}>();

  public selectedTripIndex: number = 0;

  constructor() {
  }

  public getInActiveTripSections(): TripSectionHotelData[]{
    return this.tripSections.filter((tripSection, index)=>{return index != this.selectedTripIndex});
  }

  public getSelectedTrip(): TripSectionHotelData {
    return this.tripSections[this.selectedTripIndex];
  }

  public emitSelectedTripSectionHotel(data: {hotel: TripSectionHotelDataItem, trip: TripSectionHotelData}) {
    this.selectedHotel.emit(data);
  }

  public emitRemovedTripSectionHotel(data: {hotelId: string, trip: TripSectionHotelData}): void {
    this.removeHotel.emit(data);
  }
}