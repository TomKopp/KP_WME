import { HotelData } from "./hotel-detail/hotel-detail.component";

export class TripSectionHotelData {
    readonly id: string;
    public hotelList: TripSectionHotelDataItem[];
    public destination: string;
    public timeStart: Date;
    public timeEnd: Date;
    public flightStart: Date;
    public flightEnd: Date;
    constructor () {
        this.id = "id_" + Math.random() * new Date().getTime();
    }
}

export class TripSectionHotelDataItem {
    public id: string;
    public hotel: HotelData;
    public timeStart: Date;
    public timeEnd: Date;
    constructor() {
        this.id = "id_" + Math.random() * new Date().getTime()
    }
}