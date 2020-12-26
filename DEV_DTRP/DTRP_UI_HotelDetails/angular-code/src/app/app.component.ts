import { Component } from '@angular/core';
import { HotelDetailFeaturesItem, PoolFeature, WLANFeature, ParkingFeature, AirportShuttleFeature, GolfFeature, BreakfastFeature, MeetingRoomsFeature } from './hotel-detail-features/hotel-detail-features.component';
import { HotelData } from './hotel-detail/hotel-detail.component';
import { HotelOffersItem } from './hotel-offers/hotel-offers.component';
import { DummyHotelService } from './dummy-hotel.service';
import { InputDataMapper } from './app.input-data.mapper';
import { TripSectionHotelDataItem, TripSectionHotelData } from './app.hotel-data';
import { MatSnackBar } from '@angular/material';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  host: {
    '(window:resize)': 'onResize($event.target.innerWidth)'
  }
})

export class AppComponent {
  title = 'hoteldetails';

  public width: number = 0;
  public selectedTripSectionHotel: TripSectionHotelDataItem;
  public selectedTripSection: TripSectionHotelData;
  public selectedTripPart: boolean = false;
  public selectedFilterFeatures: HotelDetailFeaturesItem[] = [];
  public selectedFilterRatings: number[] = [0,1,2,3,4,5];
  public hotelList: HotelData[] = [];

  public showHotelList: boolean = true;
  public showHotelDetail: boolean = true;

  public tripSections: TripSectionHotelData[] = [];

  public mapper: InputDataMapper = new InputDataMapper();

  constructor(
    private dummyHotelService: DummyHotelService,
    private snackBar: MatSnackBar
  ) {
    this.hotelList = [];

    let tripSection1Item1: TripSectionHotelDataItem = new TripSectionHotelDataItem;
    tripSection1Item1.timeStart = new Date(2018,1,1);
    tripSection1Item1.timeEnd = new Date(2018,1,10);
    let tripSection1: TripSectionHotelData = new TripSectionHotelData();
    tripSection1.destination = "Barcelona";

    let tripSection1Item2: TripSectionHotelDataItem = new TripSectionHotelDataItem;
    tripSection1Item2.timeStart = new Date(2018,1,12);
    tripSection1Item2.timeEnd = new Date(2018,1,24);

    tripSection1.hotelList = [tripSection1Item1, tripSection1Item2];
    tripSection1.hotelList = [];
    tripSection1.timeStart = new Date(2018,1,1);
    tripSection1.timeEnd = new Date(2019,1,1);
    tripSection1.flightStart = new Date(2018,1,1);
    tripSection1.flightEnd = new Date(2019,1,1);
    this.tripSections.push(tripSection1);
  }

  ngOnInit() {
    this.onResize(window.innerWidth);
  
    window.addEventListener("message", this.updateDataFromOutside.bind(this), false);
  }

  public updateDataFromOutside(event: MessageEvent): void {
    if (event.data && typeof event.data == "string") {
        this.setNewTripsections(this.mapper.mapInputData(JSON.parse(event.data)));
        this.snackBar.open("Trip-Daten wurden aktualisiert.", "", {
            duration: 3000,
        });
    }
  }

  public onResize(targetWidth: number): void {
    this.width = targetWidth;
    if (this.width < 900) {
      this.showHotelList = true;
      this.showHotelDetail = false;
    }
    else {
      this.showHotelList = true;
      this.showHotelDetail = true;
    }
  }

  public onSelectHotel(hotel: HotelData): void {
    if (!this.selectedTripSectionHotel) return;
    
    this.selectedTripSectionHotel.hotel = hotel;
    
    let section = this.tripSections.find(section => section.id == this.selectedTripSection.id)
    if (!section) return;
    
    let hotelIndex = section.hotelList.findIndex(hotelItem => this.selectedTripSectionHotel.id == hotelItem.id);

    // add new hotel
    if (hotelIndex == -1) section.hotelList.push(this.selectedTripSectionHotel);
    // update existing hotel
    else section.hotelList.splice(hotelIndex,1,this.selectedTripSectionHotel);

    this.updateDashboardHotelData();
    if (this.width < 900) {
      this.showHotelList = false;
      this.showHotelDetail = true;
    }
  }

  public updateDashboardHotelData(): void {  
    if (window.parent) {
      let mappedData = this.mapper.mapOutputData(this.tripSections);
      window.parent.postMessage(mappedData, '*');
    }
  }

  public onGoBack(): void {
    if (this.width < 900) {
      this.showHotelList = true;
      this.showHotelDetail = false;
    }
  }

  public setSelectedTripSectionHotelByOutput(data: {hotel: TripSectionHotelDataItem, trip: TripSectionHotelData}) {
    if (!data) {
      this.selectedTripSectionHotel = null;
      this.selectedTripPart = false;
      return;
    }
    this.selectedTripSectionHotel = data.hotel;
    this.selectedTripSection = data.trip;
    this.selectedTripPart = true;
    this.dummyHotelService.getHotelsByFilter(new Date(2018,1,1), new Date(2018,2,1), "",this.selectedFilterFeatures, this.selectedFilterRatings).then(
      data=> {
        this.hotelList = data;
      }
    );
    if (this.width < 900) {
      this.showHotelList = true;
      this.showHotelDetail = false;
    }
  }

  public setNewTripsections(tripSections: TripSectionHotelData[]): void {
    this.tripSections = tripSections;
    this.selectedTripPart = false;
  }

  public executeHotelListFilter(features?: HotelDetailFeaturesItem[], ratings?: number[]): void {
    if (features) this.selectedFilterFeatures = features;
    if (ratings) this.selectedFilterRatings = ratings;
    this.dummyHotelService.getHotelsByFilter(new Date(2018,1,1), new Date(2018,2,1), "",this.selectedFilterFeatures, this.selectedFilterRatings).then(
      data=> {
        this.hotelList = data;
      }
    );
  }

  public removeHotel(data: {hotelId: string, trip: TripSectionHotelData}): void {
    let section = this.tripSections.find(section => section.id == this.selectedTripSection.id)
    if (!section) return;

    let hotelIndex = section.hotelList.findIndex(hotelItem => {return data.hotelId == hotelItem.id;});
    section.hotelList.splice(hotelIndex,1);

    this.updateDashboardHotelData();
  }
}
