import { Component, OnInit, Input, ViewChild, Output, EventEmitter } from '@angular/core';
import { TripSectionHotelDataItem, TripSectionHotelData } from '../app.hotel-data';

declare var HotelTimeLineBuilder;

@Component({
  selector: 'app-trip-section-overview',
  templateUrl: './trip-section-overview.component.html',
  styleUrls: ['./trip-section-overview.component.scss']
})
export class TripSectionOverviewComponent {

  public data: TripSectionHotelData;
  public hotelListSelector = new HotelTimeLineBuilder();

  @Input("data") set setData(data: TripSectionHotelData) {
    this.data = data;
    this.hotelListSelector.disableSelector(data.destination == null);
  };
  @Output("selectedHotel") selectedHotel: EventEmitter<{hotel: TripSectionHotelDataItem, trip: TripSectionHotelData}> = new EventEmitter<{hotel: TripSectionHotelDataItem, trip: TripSectionHotelData}>();
  @Output("removeHotel") removeHotel: EventEmitter<{hotelId: string, trip: TripSectionHotelData}> = new EventEmitter<{hotelId: string, trip: TripSectionHotelData}>();
  @ViewChild("hoteloverview") hoteloverview;

  constructor() {
  }

  ngAfterViewInit() {
    let emitSelectedHotel = function(hotel) {
      this.selectedHotel.emit({hotel: hotel.additionalData, trip: this.data});
    };
    this.hotelListSelector.addAfterHotelSelect("emitSelectedHotel",emitSelectedHotel.bind(this));

    let deselectHotel = function() {
      this.selectedHotel.emit(null);
    };
    this.hotelListSelector.addAfterHotelDeselect("deselectHotel",deselectHotel.bind(this))
    
    // TODO just add time change of hotel
    let addnewHotel = function(hotelDate) {
      this.addNewHotel(hotelDate);
      this.hotelListSelector.dataSet = this.mapDatasetToHotelTimeLineBuilder();
      this.hotelListSelector.prepareDataset(this.hotelListSelector.dataSet);
      this.hotelListSelector.addHotelTimeLineElements();
      this.hotelListSelector.cleanHotelCreateCanvas();
    };
    this.hotelListSelector.addCreateNewHotel("addnewHotel",addnewHotel.bind(this));

    let removeHotel = function(hotelId: string) {
      this.removeHotelById(hotelId);
      this.selectedHotel.emit(null);
      this.removeHotel.emit({hotelId: hotelId, trip: this.data});
    }
    this.hotelListSelector.addAfterHotelRemoved("removehotel",removeHotel.bind(this));
    this.buildOverview();
  }

  ngOnChanges() {
    if (this.hotelListSelector.isInit) {
      this.hotelListSelector.refreshData(this.mapDatasetToHotelTimeLineBuilder(),this.data.timeStart,this.data.timeEnd, this.data.flightStart, this.data.flightEnd);
    }
  }

  private buildOverview(): void {
    if (!this.data) return;
    this.hotelListSelector.init(this.hoteloverview.nativeElement, this.mapDatasetToHotelTimeLineBuilder(),this.data.timeStart,this.data.timeEnd);
    this.hotelListSelector.addFlightLimits(this.data.flightStart,this.data.flightEnd);
  }

  private mapDatasetToHotelTimeLineBuilder(): any[] {
    let timeLineData: any[] = [];

    if (this.data && this.data.hotelList)
      for (let hotel of this.data.hotelList) {
        timeLineData.push({
          timeStart: new Date(hotel.timeStart),
          timeEnd: new Date(hotel.timeEnd),
          hotelName: hotel.hotel? hotel.hotel.name : "",
          additionalData: hotel
        });
      }

    return timeLineData;
  }

  public addNewHotel(startDate: Date) {
    let newHotel: TripSectionHotelDataItem = new TripSectionHotelDataItem();
    newHotel.timeStart = startDate;
    let plusOneDay = new Date(new Date(startDate).setDate(startDate.getDate() + 1));
    newHotel.timeEnd = plusOneDay;
    this.data.hotelList.push(newHotel);
  }

  public removeHotelById(hotelId: string) {
    let removeIndex = this.data.hotelList.findIndex(data=>{
      return data.id == hotelId;
    });
    if (removeIndex != null)
      this.data.hotelList.splice(removeIndex, 1);

    
  }
}
