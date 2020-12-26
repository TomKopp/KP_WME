import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { HotelDetailFeaturesItem } from '../hotel-detail-features/hotel-detail-features.component';
import { HotelOffersItem } from '../hotel-offers/hotel-offers.component';
import { MatDialog } from '@angular/material';
import { BookingDialogComponent } from '../booking-dialog/booking-dialog.component';

@Component({
  selector: 'app-hotel-detail',
  templateUrl: './hotel-detail.component.html',
  styleUrls: ['./hotel-detail.component.scss']
})
export class HotelDetailComponent implements OnInit {

  public hotelMainImages: string[] = [];

  @ViewChild('slideshow') slideshow: any;

  @Input("windowWidth") windowWidth: number = 0;
  @Input("hotelData") hotelData: HotelData;

  @Output("onGoBack") goBack: EventEmitter<boolean> = new EventEmitter<boolean>();

  constructor(public dialog: MatDialog) {
  }

  ngOnInit() {
  }

  ngOnChanges() {
    if (!this.hotelData) return;
    this.hotelMainImages = [this.hotelData.img].concat(this.hotelData.hotelImageUrls || []);
  }

  public onGoBack(): void {
    this.goBack.emit(true);
  }

  public onSelectDetailImage(index: number): void {
    this.slideshow.goToSlide(index);
  }

  public openDialog(offer: HotelOffersItem) {
    const dialogRef = this.dialog.open(BookingDialogComponent, {
      height: "500px",
      data: {
        hotelData: this.hotelData,
        offer: offer
      }
    });

    dialogRef.afterClosed().subscribe(result => {
    });
  }
}

export class HotelData {
  public id: string;
  public name: string;
  public img: string;
  public hotelFeatureList: HotelDetailFeaturesItem[];
  public hotelImageUrls: string[];
  public rating: number;
  public offers: HotelOffersItem[];
  public city: string;

  constructor(name?: string, img?: string, 
    hotelFeatureList?: HotelDetailFeaturesItem[], hotelImageUrls?: string[], 
    rating?: number, offers?: HotelOffersItem[], city?: string, id?: string){
    this.name = name || "";
    this.img = img || "";
    this.hotelFeatureList = hotelFeatureList || [];
    this.hotelImageUrls = hotelImageUrls || [];
    this.rating = rating || 0;
    this.offers = offers || [];
    this.id = id || "id_" + Math.random() * Math.random();
    this.city = city;
  }
}
