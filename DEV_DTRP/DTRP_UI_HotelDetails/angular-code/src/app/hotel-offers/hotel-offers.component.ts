import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-hotel-offers',
  templateUrl: './hotel-offers.component.html',
  styleUrls: ['./hotel-offers.component.scss']
})
export class HotelOffersComponent implements OnInit {

  @Input("windowWidth") windowWidth: number = 0;
  @Input("offersList") offersList: HotelOffersItem[] = [];
  @Output("selectedOffer") selectedOffer: EventEmitter<HotelOffersItem> = new EventEmitter();
  constructor() { }

  ngOnInit() {
  }

  public sortOffersByPrice(offersList: HotelOffersItem[]): HotelOffersItem[] {
    if (!offersList) return [];
    offersList.sort((a,b)=>{
      return b.pricePerNight - a.pricePerNight;
    });
    return offersList;
  }

  public selectOffer(offerItem: HotelOffersItem): void {
    this.selectedOffer.emit(offerItem);
  }
}

export class HotelOffersItem {
  public img: string;
  public name: string;
  public rooms: number;
  public pricePerNight: number;
  public availabilities: HotelOffersItemAvailability[];

  constructor(img: string, name: string, rooms: number, pricePerNight: number, availabilities: HotelOffersItemAvailability[]) {
    this.img = img;
    this.name = name;
    this.rooms = rooms;
    this.pricePerNight = pricePerNight;
    this.availabilities = availabilities;
  }
}

export class HotelOffersItemAvailability {
  startDate: Date;
  endDate: Date;
  constructor(startDate: Date, endDate: Date) {
    this.startDate = startDate;
    this.endDate = endDate;
  }
}
