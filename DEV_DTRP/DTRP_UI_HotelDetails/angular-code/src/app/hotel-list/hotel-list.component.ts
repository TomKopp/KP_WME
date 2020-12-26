import { HotelDetailFeaturesItem, PoolFeature, WLANFeature, ParkingFeature, AirportShuttleFeature, FitnessCenterFeature, GolfFeature, BreakfastFeature, MeetingRoomsFeature, ChildrenFeature } from './../hotel-detail-features/hotel-detail-features.component';
import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { HotelData } from '../hotel-detail/hotel-detail.component';

const listItemHeight: number = 85;

@Component({
  selector: 'app-hotel-list',
  templateUrl: './hotel-list.component.html',
  styleUrls: ['./hotel-list.component.scss']
})
export class HotelListComponent {

  public featureList: {feature: HotelDetailFeaturesItem, selected: boolean}[] = [
    {feature: new PoolFeature(), selected: false},
    {feature: new WLANFeature(), selected: false},
    {feature: new ParkingFeature(), selected: false},
    {feature: new AirportShuttleFeature(), selected: false},
    {feature: new FitnessCenterFeature(), selected: false},
    {feature: new GolfFeature(), selected: false},
    {feature: new BreakfastFeature(), selected: false},
    {feature: new MeetingRoomsFeature(), selected: false},
    {feature: new ChildrenFeature(), selected: false}
  ];

  public ratingsList: {rating: number, selected: boolean}[] = [
    {rating: 0, selected: false},
    {rating: 1, selected: false},
    {rating: 2, selected: false},
    {rating: 3, selected: false},
    {rating: 4, selected: false},
    {rating: 5, selected: false}
  ];

  public hotelList: HotelData[] = [];
  public currentlySelectedHotelId: string = "";
  private hotelListHasChanged: boolean = false;

  @ViewChild("GUIHotelList") GUIHotelList: ElementRef;

  @Input("windowWidth") windowWidth: number = 0;
  @Input("hotelData") set setHotelList(hotelList:HotelData[]){
    this.hotelList = this.sortByFeatures(hotelList);
    this.hotelListHasChanged = true;
  };
  @Input("currentlySelectedHotelId") set setCurrentlySelectedHotelId(currentlySelectedHotelId: string){
    this.currentlySelectedHotelId = currentlySelectedHotelId;
    if (this.hotelListHasChanged) {
      this.jumpToSelectedHotel(this.currentlySelectedHotelId);
      this.hotelListHasChanged = false;
    }
  };
  @Input("filteredFeatures") set setFilteredFeatures(features: HotelDetailFeaturesItem[]) {
    for (let feature of features) {
      this.featureList.find(featureItem=> featureItem.feature.name == feature.name).selected = true;
    }
  }
  @Input("filteredRating") set setFilteredRating(ratings: number[]) {
    if (ratings.length == 6) return;
    for (let rating of ratings) {
      this.ratingsList.find(ratingItem=> ratingItem.rating == rating).selected = true;
    }
  }
  @Output("selectedHotel") selectedHotel: EventEmitter<HotelData> = new EventEmitter<HotelData>();
  @Output("filterFeature") filterFeature: EventEmitter<HotelDetailFeaturesItem[]> = new EventEmitter<HotelDetailFeaturesItem[]>();
  @Output("filterRating") ratingFeature: EventEmitter<number[]> = new EventEmitter<number[]>();

  constructor() {
  }

  public onSelectHotel(selectedHotel: HotelData, index: number): void {
    this.selectedHotel.emit(selectedHotel);
    this.currentlySelectedHotelId = selectedHotel.id;
  }

  public selectFilterFeature(index: number): void {
    this.featureList[index].selected = !this.featureList[index].selected;

    let featureList: HotelDetailFeaturesItem[] = [];
    for (let feature of this.featureList) {
      if (feature.selected) featureList.push(feature.feature);
    }
    this.filterFeature.emit(featureList);
  }

  public selectRatingFeature(index: number): void {
    this.ratingsList[index].selected = !this.ratingsList[index].selected;
    let ratingList: number[] = [];
    for (let rating of this.ratingsList) {
      if (rating.selected) ratingList.push(rating.rating);
    }
    if (ratingList.length == 0) ratingList = [0,1,2,3,4,5];
    this.ratingFeature.emit(ratingList);
  }

  public sortByFeatures(hotelList: HotelData[]): HotelData[] {
    let filteredHotelList:HotelData[] = [];
    for (let i = 5; i >= 0; i--) {
      let hotels = hotelList.filter(hotel=>{return hotel.rating == i});
      hotels.sort((a,b)=>{return b.hotelFeatureList.length - a.hotelFeatureList.length;});
      filteredHotelList = filteredHotelList.concat(hotels);
    }
    return filteredHotelList;
  }

  public jumpToSelectedHotel(hotelId: string): void {
    if (!hotelId ||!this.hotelList) return;
    let index: number = this.hotelList.findIndex(hotel=>{return hotel.id == hotelId});
    this.GUIHotelList.nativeElement.scrollTop = index * listItemHeight;
  }
}