/* eslint-disable import/prefer-default-export,no-restricted-syntax,no-trailing-spaces,no-console */
import moment from 'moment';
import airports from '../data/eu_airports.json';
import airlines from '../data/eu_airlines';
import { Flight, FlightRoute, FlightSegment } from './model';

/**
 * Generate random travel time between min and max
 * @param min
 * @param max
 * @returns {number}
 */
function getRandTravelTime(min, max) {
  const randNo = Math.random() * (+max - +min) + +min;
  // round up to next multiple of 5x
  return Math.ceil(randNo / 5) * 5;
}

/**
 * Generate random price depending on travel time
 * @param travelTime
 * @returns {number}
 */
function genPrice(travelTime) {
  // 150 euros per hour
  let price = Math.round(1200 - (travelTime / 60 * 150));
  if (price <= 0) price = 300;
  return price;
}

/**
 * Generate flight number
 * @param icao
 * @param count
 * @returns {*}
 */
function genFlightNo(icao, count = 5) {
  let flightNo = icao;
  const digits = '0123456789';
  const countOfPositions = count;

  for (let i = 0; i < countOfPositions; i++) {
    flightNo += digits.charAt(Math.floor(Math.random() * digits.length));
  }

  return flightNo;
}

/**
 * Return JSON airport list of european airports
 */
export function getAirportList() {
  return airports;
}

/**
 * Use dummy trip sections data if no initial data were received by other component
 * @returns {{startDate: Date, endDate: Date, sections: *[]}}
 */
export function getTripSectionsInitialData() {
  const today = new Date();

  return {
    startDate: today,
    endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 20),
    sections: [
      {
        location: 'Madrid',
        startDate: today,
        endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 15),
      },
      {
        location: 'Barcelona',
        startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 15),
        endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 20),
      },
    ],

  };
}

/**
 * Query airport list and create mocked flight routes
 * @param flightRouteParams
 * @returns {string}
 */
export function queryFlightRoutes(flightRouteParams) {
  let i = 0;
  const flights = [];
  const self = this;

  for (const flightQuery of flightRouteParams) {
    // get airport data from iata code and city
    let srcAirport;
    let destAirport;

    if (flightQuery.startLocation.iata === '') srcAirport = airports.find(airport => airport.city === flightQuery.startLocation.city);
    else srcAirport = airports.find(airport => airport.iata === flightQuery.startLocation.iata);

    if (flightQuery.endLocation.iata === '') destAirport = airports.find(airport => airport.city === flightQuery.endLocation.city);
    else destAirport = airports.find(airport => airport.iata === flightQuery.endLocation.iata);

    // get airlines which operates in start or end location's country
    const airline = airlines.find(airl => airl.country === srcAirport.country || airl.country === destAirport.country);

    if (srcAirport !== undefined && destAirport !== undefined) {
      for (const depTime of srcAirport.dep_times) {
        if (flights[i] === undefined) flights[i] = [];

        const randTravelTime = getRandTravelTime(90, 180);

        const startTimeAsMoment = moment({
          years: new Date(flightQuery.travelDate).getFullYear(),
          months: new Date(flightQuery.travelDate).getMonth(),
          days: new Date(flightQuery.travelDate).getDate(),
          hours: depTime.split(':')[0],
          minutes: depTime.split(':')[1],
        });

        flights[i].push({
          startLocation: { city: srcAirport.city, iata: srcAirport.iata, input: `${srcAirport.city} (${srcAirport.iata})` },
          endLocation: { city: destAirport.city, iata: destAirport.iata, input: `${destAirport.city} (${destAirport.iata})` },
          startDate: startTimeAsMoment.toDate(),
          endDate: moment(startTimeAsMoment).add(randTravelTime, 'minute').toDate(),
          travelTime: randTravelTime,
          travelDate: flightQuery.travelDate,
          cabinClass: 'Economy',
          flightNo: genFlightNo(airline.icao),
          airline,
          stopovers: 0,
        });
      }
    }
    i += 1;
  }

  const f = (a, b) => [].concat(...a.map(d => b.map(e => [].concat(d, e))));
  const cartesian = (a, b, ...c) => (b ? cartesian(f(a, b), ...c) : a);

  const output = cartesian(...flights);

  const flightAlternatives = [];

  // construct flight alternatives array
  // add price (dependent of total travel time
  for (const flightAlt of output) {
    let travelTime = 0;
    for (const flightSegment of flightAlt) {
      travelTime += flightSegment.travelTime;
    }

    const flightAltObj = { price: genPrice(travelTime), flights: flightAlt };
    flightAlternatives.push(flightAltObj);
  }

  // check for validity of flights of a flight route
  const results = checkValidityOfResults(flightAlternatives);
  return JSON.stringify(results);
}

/**
 * Parses http response JSON format to flight route model format
 * @param flightRouteJSON
 * @returns {FlightRoute}
 * @constructor
 */
export function ResponseJSONToFlightRoute(flightRouteJSON) {
  const flightRouteTmp = new FlightRoute();
  flightRouteTmp.price = flightRouteJSON.price;

  for (const flight of flightRouteJSON.flights) {
    const flightTmp = new Flight();

    const endDate1 = moment(flight.startDate).add(20, 'minutes').toDate();
    const startDate2 = moment(flight.startDate).add(40, 'minutes').toDate();

    const endLocation1 = { city: 'Paris', iata: 'CDG', input: 'Paris (CDG)' };
    const startLocation2 = endLocation1;

    // const flightSegmentTmp1 = new FlightSegment(flight.startDate, flight.startLocation, endDate1, endLocation1, flight.flightNo, flight.cabinClass, flight.airline);
    // const flightSegmentTmp2 = new FlightSegment(startDate2, startLocation2, flight.endDate, flight.endLocation, flight.flightNo, flight.cabinClass, flight.airline);
    // flightTmp.addFlightSegment(flightSegmentTmp1);
    // flightTmp.addFlightSegment(flightSegmentTmp2);

    const flightSegmentTmp = new FlightSegment(flight.startDate, flight.startLocation, flight.endDate, flight.endLocation, flight.flightNo, flight.cabinClass, flight.airline);
    flightTmp.addFlightSegment(flightSegmentTmp);

    flightRouteTmp.addFlight(flightTmp);
  }
  return flightRouteTmp;
}

/**
 * Check if start/end dates of route result flights don't overlap
 * @param flightAlternatives
 * @returns {Array}
 */
function checkValidityOfResults(flightAlternatives) {
  const prunedFlightAlternatives = [];
  let resultIsValid;

  for (const flightRoute of flightAlternatives) {
    resultIsValid = true;

    for (let i = 0; i < flightRoute.flights.length; i++) {
      if (flightRoute.flights[i + 1] === undefined) break;

      // if end date of previous flight comes after start date of next flight the whole
      // flight route is rendered invalid
      if (moment(flightRoute.flights[i].endDate).isAfter(moment(flightRoute.flights[i + 1].startDate))) {
        resultIsValid = false;
        break;
      }
    }

    if (resultIsValid) prunedFlightAlternatives.push(flightRoute);
  }

  return prunedFlightAlternatives;
}

/**
 * Save datum to specific key persistently
 * @param key
 * @param data
 */
export function saveToLocalStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Get datum from specific key
 * @param key
 * @returns {any}
 */
export function getFromLocalStorage(key) {
  return JSON.parse(localStorage.getItem(key));
}

/**
 * Delete data from specific key
 * @param key
 */
export function removeFromLocalStorage(key) {
  return localStorage.removeItem(key);
}

/**
 * Key list of all local storage keys for consistent saving
 * @type {{FLIGHTROUTE: string, TRIPSECTIONS: string}}
 */
export const LocalStorageKeys = {
  FLIGHTROUTE: 'flightRouteData',
  TRIPSECTIONS: 'tripSectionsData',
};

/**
 * Use as default start/end airport for a trip
 * @type {{city: string, iata: string, input: string}}
 */
export const defaultGermanAirport = {
  city: 'Berlin',
  iata: 'SXF',
  input: 'Berlin (SXF)',
};

/**
 * Comprises functionality shared between all components
 * @type {{data(): *, methods: {onResize(*): void, getTimeOfStay(*, *): (number|*), isSameDay(*=, *, *=): *, scrollTop(): void, isEmpty(*=): boolean, timeInTimespan(*=, *): *, getDisplayedInputDstStr(*, *): (*|string), handleScroll(): void, relevantTripDetailsChanged(*, *): boolean, localiseDE(*): *}, filters: {currency: (function(*): string), momentjs: (function(*=, *=): string), inMinutes: (function(*): string)}, created(): void, mounted(), beforeDestroy(): void}}
 */
export const mixin = {
  data() {
    const today = new Date();

    return {
      isTabletSize: false,
      isPhoneSize: false,
      SIZE_PHONE: 768,
      SIZE_TABLET: 1024,

      hasScrolledDown: false,
    };
  },
  methods: {
    /**
     * React to resizing of the window and initial window size
     * @param event
     */
    onResize(event) {
      // is tablet size
      if (event.target.innerWidth <= this.SIZE_TABLET && event.target.innerWidth > this.SIZE_PHONE) {
        this.isTabletSize = true;
        this.isPhoneSize = false;
      }
      // is phone size
      else if (event.target.innerWidth <= this.SIZE_PHONE) {
        this.isTabletSize = false;
        this.isPhoneSize = true;
      }
      // is desktop size
      else {
        this.isPhoneSize = false;
        this.isTabletSize = false;
      }
    },

    /**
     * Return duration between two dates in days
     * @param flights
     * @param index
     * @returns {number}
     */
    getTimeOfStay(flights, index) {
      if (flights[index + 1] === undefined) return 0;

      const start = moment(flights[index].startDate);
      const end = moment(flights[index + 1].endDate);

      return Math.round(moment.duration(end.diff(start)).asDays());
    },
    /**
     * Check if start and end date are on the same day, otherwise show "+1" to indicate that
     * @param startDateStr
     * @param travelTime
     * @param endDateStr
     * @returns {boolean}
     */
    isSameDay(startDateStr, travelTime, endDateStr) {
      const startTimeMoment = moment(startDateStr);
      const endDate = new Date(endDateStr);
      let endDateMoment;

      const startDateMoment = moment({
        years: endDate.getFullYear(), months: endDate.getMonth(), days: endDate.getDay(), hours: startTimeMoment.hours(), minutes: startTimeMoment.minutes(),
      });
      endDateMoment = moment(startDateMoment).add(travelTime / 1000 / 60, 'minutes');
      return startDateMoment.isSame(endDateMoment, 'days');
    },

    /**
     * Scroll page back to top
     */
    scrollTop() {
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    },

    /*
    Check if an object is empty
     */
    isEmpty(obj) {
      // null and undefined are "empty"
      if (obj == null) return true;

      // Assume if it has a length property with a non-zero value
      // that that property is correct.
      if (obj.length > 0) return false;
      if (obj.length === 0) return true;

      // If it isn't an object at this point
      // it is empty, but it can't be anything *but* empty
      // Is it empty?  Depends on your application.
      if (typeof obj !== 'object') return true;

      // Otherwise, does it have any properties of its own?
      // Note that this doesn't handle
      // toString and valueOf enumeration bugs in IE < 9
      for (const key in obj) {
        if (hasOwnProperty.call(obj, key)) return false;
      }

      return true;
    },

    /*
    Check if time is in certain time range
     */
    timeInTimespan(time, timespan) {
      const today = new Date();
      const travelTime = new Date(time);
      const timespanTemp = [timespan[0].split(':'), timespan[1].split(':')];
      // const timeTemp = time.split(':');

      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDay(), parseInt(timespanTemp[0][0], 10), parseInt(timespanTemp[0][1]), 10);
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDay(), parseInt(timespanTemp[1][0], 10), parseInt(timespanTemp[1][1]), 10);
      const travelDateAsDate = new Date(today.getFullYear(), today.getMonth(), today.getDay(), travelTime.getHours(), travelTime.getMinutes());
      const travelDateAsMoment = moment(travelDateAsDate);

      return travelDateAsMoment.isBetween(moment(startDate), moment(endDate), 'minutes', '[]');
    },

    /*
    Reassemble displayed input destination string
     */
    getDisplayedInputDstStr(city, iata) {
      if (iata === '') {
        return city;
      }
      return `${city} (${iata})`;
    },
    handleScroll() {
      this.hasScrolledDown = (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20);
    },

    /*
    Check if incoming trip detail changes are crucial for the specific page
     */
    relevantTripDetailsChanged(oldTripSections, newTripSections) {
      // new infos are always better than no infos
      if (oldTripSections === null) return true;

      // check for number of sections
      if (oldTripSections.sections.length !== newTripSections.sections.length) return true;

      // check start and end dates of the whole trip
      if (!moment(oldTripSections.startDate).isSame(moment(newTripSections.startDate))) return true;
      if (!moment(oldTripSections.endDate).isSame(moment(newTripSections.endDate))) return true;

      // check relevant details in sections
      for (const oldSection of oldTripSections.sections) {
        const equivalentSections = newTripSections.sections.filter(newSection => (oldSection.location === newSection.location
          && moment(oldSection.startDate).isSame(moment(newSection.startDate))
          && moment(oldSection.endDate).isSame(moment(newSection.endDate))));

        // if there is no equivalent section
        if (equivalentSections === null || equivalentSections.length === 0) return true;
      }

      return false;
    },

    /*
    Get german translation for value
     */
    localiseDE(val) {
      const localisedStr = this.localesDE[val];
      if (localisedStr === null || localisedStr === '') return val;
      return localisedStr;
    },
  },

  filters: {
    currency: val => `${val} €`,
    momentjs: (val, format) => moment(val).format(format),
    inMinutes: val => `${val / 1000 / 60} min`,
  },

  created() {
    // register event listeners for resize event
    window.addEventListener('resize', this.onResize);
    window.dispatchEvent(new Event('resize'));

    // listen to scroll events
    window.addEventListener('scroll', this.handleScroll);
  },
  mounted() {

  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('scroll', this.handleScroll);
  },
};
