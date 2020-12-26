import { HotelData } from "./hotel-detail/hotel-detail.component";
import { TripSectionHotelData, TripSectionHotelDataItem } from "./app.hotel-data";
import { HotelDetailFeaturesItem } from "./hotel-detail-features/hotel-detail-features.component";
import { HotelOffersItem } from "./hotel-offers/hotel-offers.component";

export class InputDataMapper {

    public inputData: any;

    public mapInputData(data?: any): TripSectionHotelData[] {
        if (data) this.inputData = JSON.parse(JSON.stringify(data.tripSections));

        let mappedData: TripSectionHotelData[] = [];

        for (let section of  this.inputData.sections) {
            let tripSection = new TripSectionHotelData();
            tripSection.destination = section.location;
            tripSection.timeStart = new Date(section.startDate);
            tripSection.timeEnd = new Date(section.endDate);
            tripSection.flightStart = this.getEarliestTripSectionFlight(section.transport).endDate;
            tripSection.flightEnd = this.getLatestTripSectionFlight(section.transport).startDate;
            
            let hotelData: TripSectionHotelDataItem[] = [];
            if (section.hotel)
            for (let hotel of section.hotel) {
                let hotelDataItem: TripSectionHotelDataItem = new TripSectionHotelDataItem();
                hotelDataItem.id = hotel.id;
                hotelDataItem.timeStart = new Date(hotel.bookingStart);
                hotelDataItem.timeEnd = new Date(hotel.bookingEnd);

                let hotelItem: HotelData = new HotelData();
                hotelItem.city = hotel.city;
                hotelItem.id = hotel.id;
                hotelItem.img = hotel.img;
                hotelItem.name = hotel.name;
                hotelItem.rating = hotel.rating;
                hotelItem.hotelImageUrls = hotel.hotelImageUrls;
                hotelItem.hotelFeatureList = hotel.hotelFeatureList;
                hotelItem.offers = hotel.offers;

                hotelDataItem.hotel = hotelItem;

                hotelData.push(hotelDataItem);
            }

            tripSection.hotelList = hotelData;
            mappedData.push(tripSection);
        }
        
        return mappedData;
    }

    private getLatestTripSectionFlight(transportData: any):{startDate: Date, endDate: Date} {
        return {
            startDate: new Date(transportData.flights[transportData.flights.length-1].flightSegments[0].startDate),
            endDate: new Date(transportData.flights[transportData.flights.length-1].flightSegments[0].endDate)
        };
    }

    private getEarliestTripSectionFlight(transportData: any):{startDate: Date, endDate: Date} {
        if (!transportData.flights || transportData.flights.length == 0)
            return {startDate: null, endDate: null};

        return {
            startDate: new Date(transportData.flights[0].flightSegments[0].startDate),
            endDate: new Date(transportData.flights[0].flightSegments[0].endDate)
        };
    }

    public mapOutputData(sectionsData: TripSectionHotelData[]): any {
        if (!this.inputData) return;
        for (let i: number = 0; i < this.inputData.sections.length; i++) {
            let sectionOut = this.inputData.sections[i];
            sectionOut.hotel = [];
            let sectionIntern = sectionsData[i];
            for (let hotel of sectionIntern.hotelList) {
                sectionOut.hotel.push(
                    {
                        id: hotel.hotel.id,
                        name: hotel.hotel.name,
                        img: hotel.hotel.img,
                        bookingStart: hotel.timeStart,
                        bookingEnd: hotel.timeEnd,
                        hotelImageUrls: hotel.hotel.hotelImageUrls,
                        rating: hotel.hotel.rating,
                        city: hotel.hotel.city,
                        hotelFeatureList: this.getOutputHotelFeatureList(hotel.hotel.hotelFeatureList),
                        offers: this.getHotelOffers(hotel.hotel.offers)
                    }
                );
            }
        }
        
        return this.inputData;
        // {
        //     "id": "hotel_1",
        //     "name": "Hotel 1",
        //     "img": "https://s-ec.bstatic.com/images/hotel/max1024x768/681/68184730.jpg",
        //     "bookingStart": "2019-01-10",
        //     "bookingEnd": "2019-01-20",
        //     "hotelFeatureList": [
        //         {
        //             "id": "random_Id",
        //             "name": "Pool",
        //             "icon": "pool"
        //         }
        //     ],
        //     "hotelImageUrls": [],
        //     "rating": 3,
        //     "offers": [
        //         {
        //             "img": "",
        //             "name": "2 Bett Suite",
        //             "pricePerNight": 322.00,
        //             "availabilities": [
        //                 {
        //                     "startDate": "2019-01-01",
        //                     "endDate": "2019-01-03"
        //                 }
        //             ]      
        //         }
        //     ],
        //     "city": "Barcelona"
        // }
    }
    
    private getOutputHotelFeatureList(featureList: HotelDetailFeaturesItem[]): {id: string, name: string, icon: string}[] {
        if (!featureList) return [];
        
        let formattedFeatureList: {id: string, name: string, icon: string}[] = [];
        for (let feature of featureList) {
            formattedFeatureList.push({
                id: feature.id,
                name: feature.name,
                icon: feature.icon
            });
        }
        return formattedFeatureList;
    }

    private getHotelOffers(offersList: HotelOffersItem[]): any[] {
        let formattedOffers: {img: string, name: string, pricePerNight: number, availabilities: any}[] = [];
        for (let offer of offersList) {
            let fullOffer = {
                img: offer.img,
                name: offer.name,
                pricePerNight: offer.pricePerNight,
                availabilities: []
            };
            for (let availability of offer.availabilities) {
                fullOffer.availabilities.push({
                    startDate: availability.startDate,
                    endDate: availability.endDate
                });
            }
            formattedOffers.push(fullOffer);
        }
        return formattedOffers;
    }
}