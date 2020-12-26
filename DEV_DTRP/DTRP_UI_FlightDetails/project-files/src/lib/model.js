/**
 * Model classes according to domain model
 */
/* eslint-disable import/prefer-default-export,no-trailing-spaces,no-underscore-dangle,no-underscore-dangle */
export class FlightSegment {
  constructor(startDate, startLocation, endDate, endLocation, flightNo = '', cabinClass = '', airline = '') {
    this._startDate = startDate;
    this._endDate = endDate;

    this._startLocation = startLocation;
    this._endLocation = endLocation;

    this._flightNo = flightNo;
    this._cabinClass = cabinClass;
    this._airline = airline;
  }

  get flightTime() {
    return Math.abs(new Date(this.endDate).getTime() - new Date(this.startDate).getTime());
  }

  get airline() {
    return this._airline;
  }

  set airline(airline) {
    this._airline = airline;
  }

  get startDate() {
    return this._startDate;
  }

  get endDate() {
    return this._endDate;
  }

  get startLocation() {
    return this._startLocation;
  }

  get endLocation() {
    return this._endLocation;
  }

  get cabinClass() {
    return this._cabinClass;
  }

  set cabinClass(cabinClass) {
    this._cabinClass = cabinClass;
  }

  get flightNo() {
    return this._flightNo;
  }

  set flightNo(flightNo) {
    this._flightNo = flightNo;
  }

  get segmentNo() {
    return this._segmentNo;
  }

  set segmentNo(segmentNo) {
    this._segmentNo = segmentNo;
  }

  toJSON() {
    return {
      startDate: this._startDate,
      endDate: this._endDate,
      startLocation: {
        city: this._startLocation.city,
        iata: this._startLocation.iata,
      },
      endLocation: {
        city: this._endLocation.city,
        iata: this._endLocation.iata,
      },
      flightNo: this._flightNo,
      cabinClass: this._cabinClass,
      airline: this._airline,
      segmentNo: this._segmentNo,
      flightTime: this.flightTime,
    };
  }

  static fromJSON(jsonObj) {
    if (jsonObj === null) return null;

    const flightSegment = new FlightSegment(new Date(jsonObj.startDate), jsonObj.startLocation,
      new Date(jsonObj.endDate), jsonObj.endLocation, jsonObj.flightNo, jsonObj.cabinClass, jsonObj.airline);
    return flightSegment;
  }
}

export class Flight {
  constructor() {
    this._flightSegments = [];
  }

  get travelTime() {
    return Math.abs(new Date(this.endDate).getTime() - new Date(this.startDate).getTime());
  }

  get flightTime() {
    let flightTime = 0;
    for (const flightSegment of this._flightSegments) {
      flightTime += flightSegment.flightTime;
    }
    return flightTime;
  }

  get startLocation() {
    return this.flightSegments[0].startLocation;
  }

  get endLocation() {
    return this.flightSegments[this.flightSegments.length - 1].endLocation;
  }

  get startDate() {
    return this.flightSegments[0].startDate;
  }

  get endDate() {
    return this.flightSegments[this.flightSegments.length - 1].endDate;
  }

  get airline() {
    return this.flightSegments[0].airline;
  }

  get stopoverCount() {
    let count = this.flightSegments.length - 1;
    if (count < 0) {
      count = 0;
    }
    return count;
  }

  get flightSegments() {
    return this._flightSegments;
  }

  addFlightSegment(flightSegment) {
    const newFlightSegment = flightSegment;
    newFlightSegment.segmentNo = this.flightSegments.length;
    this._flightSegments.push(flightSegment);
  }

  getStopoverTime(startSegmentNo) {
    // the last flight segment does not have a stopover
    if (startSegmentNo >= this.stopoverCount
      || startSegmentNo < 0) return 0;

    return this.flightSegments[startSegmentNo + 1].startDate - this.flightSegments[startSegmentNo].endDate;
  }

  toJSON() {
    return {
      flightTime: this.flightTime,
      travelTime: this.travelTime,
      startDate: this.startDate,
      endDate: this.endDate,
      flightSegments: this._flightSegments.map(flightSegment => flightSegment.toJSON()),
    };
  }

  static fromJSON(jsonObj) {
    if (jsonObj === null) return null;

    const flight = new Flight();
    for (const flightSegment of jsonObj.flightSegments) {
      flight.addFlightSegment(FlightSegment.fromJSON(flightSegment));
    }
    return flight;
  }
}

export class FlightRoute {
  constructor(flights = [], price = 0) {
    this.flights = flights;
    this.price = price;
  }

  addFlight(flight) {
    this.flights.push(flight);
  }

  get travelTime() {
    let totalTravelTime = 0;
    for (const flight of this.flights) {
      totalTravelTime += flight.travelTime;
    }
    return totalTravelTime;
  }

  toJSON() {
    return {
      price: this.price,
      flights: this.flights.map(flight => flight.toJSON()),
    };
  }

  static fromJSON(jsonObj) {
    if (jsonObj === null) return null;
    return new FlightRoute(jsonObj.flights.map(flight => Flight.fromJSON(flight)), jsonObj.price);
  }
}
