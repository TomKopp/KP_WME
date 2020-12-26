import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { HotelData } from './hotel-detail/hotel-detail.component';
import { HotelDetailFeaturesItem, PoolFeature, WLANFeature, ParkingFeature, AirportShuttleFeature, GolfFeature, BreakfastFeature, MeetingRoomsFeature, FitnessCenterFeature, ChildrenFeature } from './hotel-detail-features/hotel-detail-features.component';
import { HotelOffersItem, HotelOffersItemAvailability } from './hotel-offers/hotel-offers.component';

const DummyHotelImages: any[] = [
  {
    img: "https://www.ahstatic.com/photos/7205_ho_00_p_2048x1536.jpg",
    detailImg: ["https://www.ahstatic.com/photos/2631_rodbc_00_p_1024x768.jpg","https://www.ahstatic.com/photos/gibb_dd_00_p_2048x1536.jpg","https://www.ahstatic.com/photos/2631_sl_00_p_2048x1536.jpg"]
  },
  {
    img: "https://assets.hyatt.com/content/dam/hyatt/hyattdam/images/2018/02/14/1226/Hyatt-Place-St-George-Convention-Center-P004-Exterior.adapt.16x9.1920.1080.jpg",
    detailImg: ["https://assets.hyatt.com/content/dam/hyatt/hyattdam/images/2016/08/04/0952/Hyatt-Place-Amsterdam-Airport-P058-Guestroom-Large-King.adapt.16x9.1280.720.jpg","https://assets.hyatt.com/content/dam/hyatt/hyattdam/images/2016/08/04/0952/Hyatt-Place-Amsterdam-Airport-P078-Lounge-Detail-Book.adapt.16x9.1920.1080.jpg","https://assets.hyatt.com/content/dam/hyatt/hyattdam/images/2018/05/16/1131/Hyatt-Place-P335-French-Toast.adapt.4x3.1280.960.jpg"]
  },
  {
    img: "https://pix10.agoda.net/hotelImages/115/1157073/1157073_16062412150044053329.jpg?s=1024x768",
    detailImg: ["https://pix6.agoda.net/hotelImages/489/489266/489266_17032920250052009121.jpg?s=1024x768","https://pix6.agoda.net/hotelImages/489/489266/489266_16092301250046820246.jpg?s=1024x768","https://pix6.agoda.net/hotelImages/489/489266/489266_15080422500033645853.jpg?s=1024x768"]
  },
  {
    img: "http://www.michellhotel.com/uploads/002.jpg",
    detailImg: ["http://www.michellhotel.com/uploads/rooms.jpg","http://www.michellhotel.com/uploads/yemek.jpg","http://www.michellhotel.com/uploads/elence.jpg"]
  }
];

@Injectable({
  providedIn: 'root'
})

export class DummyHotelService {

  private hotelData: HotelData[] = [];
  private readonly citylist: string[] = [
    "barcelona"
  ];

  constructor(
    private http: HttpClient,
  ) {
    this.hotelData = this.getDummyData(new Date(2000,1,1),new Date(2100,1,1),this.citylist);
  }

  private getDummyData(startDate: Date, endDate: Date, cityList: string[]): HotelData[] {
    let hoteldata: HotelData[] = [];
    for (let city of cityList) {
      hoteldata = hoteldata.concat(this.getHotelData(new DummyHotelCityDateItem(startDate,endDate,city)));
    }
    return hoteldata;
  }

  private getHotelData(cityDate: DummyHotelCityDateItem): HotelData[] {
    let countOfHotels: number = Math.floor(Math.random() * 100); 
    let hotelData: HotelData[] = [];
    for (let i = 0; i < countOfHotels; i++) {
      let imgIndex: number = Math.floor(Math.random()*DummyHotelImages.length);
      let rating: number = Math.floor(Math.random()*6);
      hotelData.push(
        new HotelData(
          "Hotel " + i,
          DummyHotelImages[imgIndex].img,
          this.generateHotelFestures(rating),
          DummyHotelImages[imgIndex].detailImg,
          rating,
          this.generateRoomContent(
            Math.random()*7 + 1, 40 * (rating+1),
            cityDate.startDate, 
            cityDate.endDate
          ),
          cityDate.city
        )
      );
    }
    return hotelData;
  }

  private generateRoomContent(roomCount: number, priceFullCapacity: number, startDate: Date, endDate: Date): HotelOffersItem[] {
    let roomOffer: HotelOffersItem[] = [];
    for (let i = 0; i < roomCount; i++) {
      let roomPrice = priceFullCapacity + parseInt(priceFullCapacity * Math.random() + "");
      let capacity = parseInt((8 * Math.random() + 1) + "");
      roomOffer.push(new HotelOffersItem(
        "https://static01.nyt.com/images/2018/09/23/realestate/23fix1/oakImage-1536872349845-jumbo.jpg",
        this.generateRoomName(roomPrice, capacity),
        3,
        parseInt(roomPrice/capacity + ""),
        this.generateRoomAvailability(startDate, endDate)
      ));
    }
    return roomOffer;
  }

  private generateRoomName(price: number, person: number): string {
    let roomName: string = "";
    roomName += person + " Bett ";
    if (price/person > 150) roomName += "Superior Suite ";
    else if (price/person > 100) roomName += "Suite ";
    else if (price/person > 40) roomName += "Zimmer ";
    else roomName += "Schlafsaal ";
    return roomName;
  }

  private generateRoomAvailability(startTimePhase: Date, endTimePhase: Date): HotelOffersItemAvailability[] {
    let availability: HotelOffersItemAvailability[] = [];
    availability.push(new HotelOffersItemAvailability(
      startTimePhase, endTimePhase
    ));
    return availability;
  }

  private generateHotelFestures(rating: number): HotelDetailFeaturesItem[] {
    let probability: number = rating * 0.2;
    let hotelDetails: HotelDetailFeaturesItem[] = [];
    if (Math.random() < probability) hotelDetails.push(new PoolFeature());
    if (Math.random() < probability) hotelDetails.push(new WLANFeature());
    if (Math.random() < probability) hotelDetails.push(new ParkingFeature());
    if (Math.random() < probability) hotelDetails.push(new AirportShuttleFeature());
    if (Math.random() < probability) hotelDetails.push(new FitnessCenterFeature());
    if (Math.random() < probability) hotelDetails.push(new GolfFeature());
    if (Math.random() < probability) hotelDetails.push(new BreakfastFeature());
    if (Math.random() < probability) hotelDetails.push(new MeetingRoomsFeature());
    if (Math.random() < probability) hotelDetails.push(new ChildrenFeature());
    return hotelDetails;
  }

  public getHotelsByFilter(startDate: Date, endDate: Date, city?: string, features?: HotelDetailFeaturesItem[], ratings?: number[]): Promise<HotelData[]> {
    return new Promise<HotelData[]>(resolve=>{
      resolve(
        this.filterHotelListByDate(this.filterByRating(this.filterByFeatures(this.hotelData, features),ratings), startDate, endDate).sort((hotel1,hotel2) => hotel2.rating - hotel1.rating)
      );
    });
  }

  public filterByCity(hotelList: HotelData[], city: string): HotelData[] {
    return hotelList.filter(hotelItem=>{return hotelItem.city.toLowerCase() == city.toLowerCase();});
  }

  public filterByRating(hotelList: HotelData[], ratings: number[]): HotelData[] {
    if (!ratings) return hotelList;
    return hotelList.filter(hotelItem=>{return ratings.indexOf(hotelItem.rating) > -1});
  }

  public filterByFeatures(hotelList: HotelData[], features: HotelDetailFeaturesItem[]): HotelData[] {
    if (!features) return hotelList;
    let filteredList: HotelData[] = [];
    for (let hotel of hotelList) {
      let hasAllFeatures = true;
      for (let feature of features) {
        if (!hotel.hotelFeatureList.find(item=>{
          return item.id == feature.id;
        })) hasAllFeatures = false;
      }
      if (hasAllFeatures) filteredList.push(hotel);
    }
    return filteredList;
  }

  public filterHotelListByDate(hotelList: HotelData[], startDate: Date, endDate: Date): HotelData[] {
    let hotelsDateInside: HotelData[] = [];
    for (let hotel of hotelList) {
      if (this.checkIfDateIsInside(startDate, endDate, hotel.offers)) 
        hotelsDateInside.push(hotel);
    }
    return hotelsDateInside;
  }

  private checkIfDateIsInside(startDate: Date, endDate: Date, hotelOffers: HotelOffersItem[]): boolean {
    for (let room of hotelOffers) {
      for (let availability of room.availabilities) {
        if (
          availability.startDate.getTime() <= startDate.getTime() &&
          availability.endDate.getTime() >= endDate.getTime()
        ) {
          return true;
        }
      }
    }
    return false;
  }
}

export class DummyHotelCityDateItem {
  public city: string;
  public startDate: Date;
  public endDate: Date;

  constructor(startDate: Date, endDate: Date, city: string) {
    this.startDate = startDate;
    this.endDate = endDate;
    this.city = city;
  }
}
