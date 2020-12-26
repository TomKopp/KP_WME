<template lang="pug">
  .home
    .hero.is-primary
      .hero-body
        .container
          h1.title Flugsuche
            |
            i.fas.fa-plane.title-icon
          h2.subtitle Finde den passenden Flug
    section.notifications
      b-notification(type="is-danger" has-icon :class="[{'hidden': !flightDatesHaveErrors}, 'notification-flight-error']" :closable="false")
        | Flugzeiten in falscher Reihenfolge. Bitte überprüfen Sie Ihre eingegebenen Flugzeiten.
      b-loading(:is-full-page="true" :active.sync="isLoadingResults" :can-cancel="false")

    // search input mask
    section.flight-request-form.section#main
      .container
        .columns.is-variable.is-2.is-mobile.has-text-left(v-for="(flight, index) in inputFlightRoute")
          .column.is-1.is-relative
            .flight-no(:class="'flight-no-' + index")
              | {{ index + 1 }}
          .column(ref="input-from", :class="{ 'expanded': selectedInput.type === InputType.INPUT_FROM && selectedInput.rowIndex === index, 'hidden': selectedInput.type !== InputType.INPUT_FROM && selectedInput.rowIndex === index }")
            b-field(:label="index === 0 ? 'Von' : ''")
              b-autocomplete(
                rounded
                @keyup.enter.native="resetInputSizes"
                @keyup.esc.native="resetInputSizes"
                @click.native="onClickInput(index, InputType.INPUT_FROM)"
                @input="onInputAutocomplete(flight.startLocation.input)"
                v-model="flight.startLocation.input"
                :data="filteredFlightDestinations"
                placeholder="Start Destination"
                @select="option => onSelectLocation(flight.startLocation, option)"
                class="input-location"
                :id="'input-from-' + index")
                template(slot="empty") Keine Ergebnisse gefunden
          .column(ref="input-to" :class="{ 'expanded': selectedInput.type === InputType.INPUT_TO && selectedInput.rowIndex === index, 'hidden': selectedInput.type !== InputType.INPUT_TO && selectedInput.rowIndex === index }")
            b-field(:label="index === 0 ? 'Nach' : ''")
              b-autocomplete(
              rounded
              @click.native="onClickInput(index, InputType.INPUT_TO)"
              @keyup.enter.native="resetInputSizes"
              @keyup.esc.native="resetInputSizes"
              @input="onInputAutocomplete(flight.endLocation.input)"
              v-model="flight.endLocation.input"
              :data="filteredFlightDestinations"
              placeholder="End Destination"
              @select="option => onSelectLocation(flight.endLocation, option)"
              class="input-location")
                template(slot="empty") Keine Ergebnisse gefunden
          .column(ref="input-date" :class="{ 'expanded': selectedInput.type === InputType.TRAVELDATE && selectedInput.rowIndex === index, 'hidden': selectedInput.type !== InputType.TRAVELDATE && selectedInput.rowIndex === index }")
            b-field(:label="index === 0 ? 'Wann' : ''" :type="{'is-danger': flightDatesHaveErrors}")
              b-datepicker(
                rounded
                placeholder="Auswählen ..."
                :min-date="minDate"
                :max-date="maxDate"
                v-model="flight.travelDate"
                :day-names="['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']"
                :mobile-native="false"
                :date-formatter="dateFormattter")
                button.button.is-primary(@click="flight.travelDate = new Date()")
                  b-icon(icon="calendar-today")
                  span Heute
        .columns.is-mobile
          .column
            button.button.is-medium.is-success.is-outlined.is-pulled-right(v-if="isPhoneSize || isTabletSize" @click="onClickFilter")
              | Filter
          .column.is-narrow
            button.button.is-medium.is-success.is-pulled-right(@click="searchFlightRoutes")
              | Suchen

    // main content on the page
    .container
      .columns

        // filter menu
        aside.section.menu.filter-options.column.is-3.has-text-left(v-if="searchedFlightRoute.length > 0 && (!isTabletSize && !isPhoneSize)" :class="!isTabletSize && !isPhoneSize ? 'is-desktop' : 'is-mobile'")
          .filter-option
            p.menu-label.filter-option__header
              | Anzahl Stopover
            .filter-option__body
              b-field
                b-checkbox(v-model="filters.stopovers" native-value="0") 0 Stopover
              b-field
                b-checkbox(v-model="filters.stopovers" native-value="1") 1 Stopover
              b-field
              b-checkbox(v-model="filters.stopovers" native-value="2") 2 Stopover
          .filter-option
            p.menu-label.filter-option__header
              | Reisezeiten
            .filter-option__body
              b-field(v-for="(travelTime, index) in filters.travelTimes" :key="index"
              v-bind:label="searchedFlightRoute[index].startLocation.city + ' - ' + searchedFlightRoute[index].endLocation.city")
                vue-slider(ref="slider" v-model="filters.travelTimes[index]" v-bind="sliderOptions" class="traveltimes-slider")

        // flight route result content
        section.flight-route-results.section.column.is-offset-1-desktop(v-if="filteredFlightRouteList.length" :class="!isTabletSize && !isPhoneSize ? 'is-desktop' : 'is-mobile'")
          b-field.columns.sort-dropdown.has-text-right
            b-select(rounded placeholder="Sort By Criteria" v-model="sortCriteriaKey")
              option(value="0") Nach Preis sortieren
              option(value="1") Nach Reisedauer sortieren
          paginate(v-if="sortedFlightRouteResults !== []" name="sortedFlightRouteResults", :list="sortedFlightRouteResults", class="paginate-list", tag="div", :refreshCurrentPage="true")
            .columns.flight-route-result.has-box-shadow(v-for="(flightRouteResult, flightRouteIndex) in paginated('sortedFlightRouteResults')" :key="flightRouteIndex")
              .column.is-9
                .column
                  .columns.is-multiline.is-mobile.flight-info.is-vh-centered(v-for="(flight, flightIndex) in flightRouteResult.flights" :key="flightIndex")

                    // flight route general details
                    .column.is-12.flight-info-overview
                      .columns
                        .column.is-3.has-text-left
                          .airline-logo(:class="isTabletSize || isPhoneSize ? 'is-mobile' : ''") {{ flight.airline.callsign }}
                        .column.is-7-desktop.is-6-tablet.is-relative
                          p.flight-duration {{ flight.travelTime | inMinutes }}
                          p.stopover-count(v-show="flight.stopoverCount > 0") {{ flight.stopoverCount + ' Stopover' }}
                          .is-vh-centered
                            .flight-start
                              .flight-location {{ getDisplayedInputDstStr(flight.startLocation.city, flight.startLocation.iata) }}
                              .flight-time {{ flight.startDate | momentjs('DD.MM.YY - HH:mm')}}
                            i.flight-hr.fas.fa-plane
                            .flight-end
                              .flight-location {{ getDisplayedInputDstStr(flight.endLocation.city, flight.endLocation.iata) }}
                              .flight-time {{ flight.endDate | momentjs('DD.MM.YY - HH:mm')}}
                                sup(v-if="!isSameDay(flight.startDate, flight.travelTime, flight.endDate)") +1
                        .column.is-12-mobile(v-if="flight.stopoverCount > 0")
                          button.button.is-fullwidth.is-transparent(@click="toggleStopoverDetails(flightRouteIndex, flightIndex)")
                            span.fas(:class="[shouldShowStopoverDetails(flightRouteIndex, flightIndex) ? 'fa-caret-up' : 'fa-caret-down']")

                    // flight route stopover details (if there are stopovers)
                    .column.is-12.flight-info-stopovers(v-show="shouldShowStopoverDetails(flightRouteIndex, flightIndex)")
                      .columns.flight-info-stopover(v-for="flightSegment in flight.flightSegments")
                        .column
                          .columns.is-mobile.is-multiline
                            .column.is-12
                              .columns.is-mobile.is-vcentered
                                .column.is-3.flight-segment-flight-time
                                  | {{ flightSegment.flightTime | inMinutes }}
                                .column.flight-segment-detailed-info
                                  .columns.is-mobile
                                    .column.flight-segment-start-date
                                      | {{ flightSegment.startDate | momentjs('HH:mm') }}
                                    .column.flight-segment-start-location
                                      | {{ getDisplayedInputDstStr(flightSegment.startLocation.city, flightSegment.startLocation.iata) }}
                                  .columns.is-mobile
                                    .column.flight-segment-end-date
                                      | {{ flightSegment.endDate | momentjs('HH:mm') }}
                                    .column.flight-segment-end-location
                                      | {{ getDisplayedInputDstStr(flightSegment.endLocation.city, flightSegment.endLocation.iata) }}
                                .column.is-3.flight-segment-airline.has-text-centered
                                  | Betrieben durch
                                  .airline-logo.flight-segment-airline-logo(:class="isTabletSize || isPhoneSize ? 'is-mobile' : ''")
                                    | {{ flight.airline.callsign }}
                          .columns.is-mobile.flight-segment-stopover(v-if="flightSegment.segmentNo !== flight.stopoverCount")
                            .column.flight-segment-stopover-time.is-3
                              | {{ flight.getStopoverTime(flightSegment.segmentNo) | inMinutes }}
                            .column.stopover
                              | Verbindung am Flughafen

              .column.is-3.is-vh-centered.is-vertically-stacked.flight-route-results__cta(:class="isPhoneSize ? 'is-mobile' : 'is-desktop'")
                .flight-route-price {{ flightRouteResult.price | currency}}
                button.button.is-medium.is-primary(@click="openFlightRouteDetailsModal(flightRouteResult)") Details
          paginate-links(for="sortedFlightRouteResults" :async="true" @change="scrollTop")
        section.flight-route-results.section.column.is-offset-1-desktop(v-else)
          .column
            | Keine Suchergebnisse gefunden

    // modal showing all flight route details
    b-modal(:active.sync="isFlightModalActive")
      .modal-background
      .modal-card
        header.modal-card-head
          p.modal-card-title Flugrouten Details
        section.modal-card-body
          .trip-section
            section.trip-section-content
              .columns
                .column
                  .columns.is-multiline.is-mobile.is-vh-centered(v-for="(flight, flightIndex) in flightRouteModalData.flights" :key="flightIndex")
                    .column.is-12.flight-info-overview
                      .columns
                        .column.has-text-left.has-text-weight-bold
                          | {{ flight.startDate | momentjs('DD.MM.YY') }}:
                          | {{ flight.startLocation.city + ' - ' + flight.endLocation.city }}
                      .columns
                        .column.is-3.has-text-left
                          .airline-logo(:class="isTabletSize || isPhoneSize ? 'is-mobile' : ''") {{ flight.airline.callsign }}
                        .column.is-relative
                          p.flight-duration {{ flight.travelTime | inMinutes }}
                          p.stopover-count(v-show="flight.stopoverCount > 0") {{ flight.stopoverCount + ' Stopover' }}
                          .is-vh-centered
                            .flight-start
                              .flight-location {{ getDisplayedInputDstStr(flight.startLocation.city, flight.startLocation.iata) }}
                              .flight-time {{ flight.startDate | momentjs('DD.MM.YY - HH:mm')}}
                            i.flight-hr.fas.fa-plane
                            .flight-end
                              .flight-location {{ getDisplayedInputDstStr(flight.endLocation.city, flight.endLocation.iata) }}
                              .flight-time {{ flight.endDate | momentjs('DD.MM.YY - HH:mm')}}
                                sup(v-if="!isSameDay(flight.startDate, flight.travelTime, flight.endDate)") +1
                    .column.is-12.flight-info-stopovers(v-if="flight.stopoverCount > 0")
                      .columns.flight-info-stopover(v-for="flightSegment in flight.flightSegments")
                        .column
                          .columns.is-mobile.is-multiline
                            .column.is-12
                              .columns.is-mobile.is-vcentered
                                .column.is-3.flight-segment-flight-time
                                  | {{ flightSegment.flightTime | inMinutes }}
                                .column.flight-segment-detailed-info
                                  .columns.is-mobile
                                    .column.flight-segment-start-date
                                      | {{ flightSegment.startDate | momentjs('HH:mm') }}
                                    .column.flight-segment-start-location
                                      | {{ getDisplayedInputDstStr(flightSegment.startLocation.city, flightSegment.startLocation.iata) }}
                                  .columns.is-mobile
                                    .column.flight-segment-end-date
                                      | {{ flightSegment.endDate | momentjs('HH:mm') }}
                                    .column.flight-segment-end-location
                                      | {{ getDisplayedInputDstStr(flightSegment.endLocation.city, flightSegment.endLocation.iata) }}
                                .column.is-3.flight-segment-airline.has-text-centered
                                  | Betrieben durch
                                  .airline-logo.flight-segment-airline-logo(:class="isTabletSize || isPhoneSize ? 'is-mobile' : ''")
                                    | {{ flight.airline.callsign }}
                          .columns.is-mobile.flight-segment-stopover(v-if="flightSegment.segmentNo !== flight.stopoverCount")
                            .column.flight-segment-stopover-time.is-3
                              | {{ flight.getStopoverTime(flightSegment.segmentNo) | inMinutes }}
                            .column.stopover.is-5.has-text-weight-bold
                              | Verbindung am Flughafen
                            .column.is-offset
                    .column(v-if="flightIndex < flightRouteModalData.flights.length - 1")
                      .trip-section-waiting-time {{ 'Aufenthaltsdauer: ' + getTimeOfStay(flightRouteModalData.flights, flightIndex) + ' Tage' }}

        footer.modal-card-foot.is-horizontal-centered
          button.button.is-primary(@click="onOpenBookingWizard(flightRouteModalData)")
            | Buchen für {{ flightRouteModalData.price | currency }}

    // mobile filter drawer
    aside.nav-drawer-container.has-text-left(v-if="searchedFlightRoute.length > 0 && (isTabletSize || isPhoneSize)" :class="isFilterDrawerActive ? 'is-active' : ''")
      .filter-drawer
        .filter-drawer-header
          h3.filter-drawer-title
            | Filter
          button.button.is-outlined.filter-drawer-btn-close(@click="isFilterDrawerActive = false") Fertig
        .filter-drawer-content
          .filter-option
            p.menu-label.filter-option__header
              | Anzahl Stopover
            .filter-option__body
              b-field
                b-checkbox(v-model="filters.stopovers" native-value="0") 0 Stopover
              b-field
                b-checkbox(v-model="filters.stopovers" native-value="1") 1 Stopover
              b-field
              b-checkbox(v-model="filters.stopovers" native-value="2") 2 Stopover
          .filter-option
            p.menu-label.filter-option__header
              | Reisezeiten
            .filter-option__body
              b-field(v-for="(travelTime, index) in filters.travelTimes" :key="index"
              v-bind:label="searchedFlightRoute[index].startLocation.city + ' - ' + searchedFlightRoute[index].endLocation.city")
                vue-slider(ref="slider" v-model="filters.travelTimes[index]" v-bind="sliderOptions" class="traveltimes-slider", :show="drawerAnimFinished")
</template>

<script>
/* eslint-disable */
// @ is an alias to /src
import BField from 'buefy/src/components/field/Field.vue';
import BAutocomplete from 'buefy/src/components/autocomplete/Autocomplete.vue';
import BDatepicker from 'buefy/src/components/datepicker/Datepicker.vue';
import VueSlider from 'vue-slider-component';
import moment from 'moment';

import * as Helpers from '../lib/helpers';
import BNotification from 'buefy/src/components/notification/Notification';
import { FlightRoute } from '../lib/model';

export default {
  name: 'home',
  components: {
    BNotification,
    BDatepicker,
    BAutocomplete,
    BField,
    VueSlider,
  },
  mixins: [Helpers.mixin],

  data() {

    const today = new Date();

    return {

      name: 'Home',

      // saves which input field is currently selected (important for resizing fields on mobile)
      selectedInput: {},

      // flight route which is input in the form
      inputFlightRoute: [],

      // needed for showing enabling autocompletion on typing start/end location
      flightDestinations: [],
      filteredFlightDestinations: [],
      autocompleteActive: false,

      InputType: {
        INPUT_FROM: 0,
        INPUT_TO: 1,
        TRAVELDATE: 2
      },

      minDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      maxDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 365),

      isLoadingResults: false,
      defaultLoadingDuration: 2000,

      paginate: ['sortedFlightRouteResults'],

      // options for filter travel time sliders
      sliderOptions: {
        data: [],
        tooltipDir: 'bottom',
      },
      // saving selected filter options
      filters: {
        stopovers: ['0', '1'],
        travelTimes: [],
      },
      isFilterDrawerActive: false,
      drawerAnimFinished: false,

      rawFlightRouteResults: [],

      // flight route which was searched for
      searchedFlightRoute: [],

      // selected flight route to be shown in the modal
      flightRouteModalData: {},
      isFlightModalActive: false,

      // all trip sections information
      tripSectionsData: {},

      // price - 0
      // duration - 1
      sortCriteria: ["price", "duration"],
      sortCriteriaKey: "1",

      flightDatesHaveErrors: false,

      // saving which stopover details were opened
      openStopoverDetails: [],
    };
  },
  methods: {
    /*
    show/hide stopover details of specific flight
     */
    toggleStopoverDetails(flightRouteIndex, flightIndex) {
      let openDetails = true;
      let updatedShowStopoverDetails = this.openStopoverDetails;

      // update data structure which saves which stopover details are open
      for (let i = 0; i < this.openStopoverDetails.length; i++) {
        if (this.openStopoverDetails[i].flightRouteIndex === flightRouteIndex
          && this.openStopoverDetails[i].flightIndex === flightIndex) {
          updatedShowStopoverDetails.splice(i, 1);
          openDetails = false;
          break;
        }
      }

      if (openDetails) {
        updatedShowStopoverDetails.push({ flightRouteIndex, flightIndex });
      }

      this.openStopoverDetails = updatedShowStopoverDetails;
    },

    /*
    Checking if stopover details of specific flight should be opened
     */
    shouldShowStopoverDetails(flightRouteIndex, flightIndex) {
      for (let stopoverDetails of this.openStopoverDetails) {
        if (stopoverDetails.flightRouteIndex === flightRouteIndex
        && stopoverDetails.flightIndex === flightIndex) return true;
      }
      return false;
    },

    /*
    Open booking page and save relevant flight infos
     */
    onOpenBookingWizard(flightRouteData) {
      Helpers.saveToLocalStorage(Helpers.LocalStorageKeys.FLIGHTROUTE, flightRouteData);
      this.$router.push({ name: 'booking' })
    },

    /*
    Formatter function for calendar widget
     */
    dateFormattter(date) {
      return moment(date).format("DD-MM-YY")
    },

    /*
    Save clicked input field for resizing on mobile
     */
    onClickInput(rowIndex, type) {
      this.selectedInput = { rowIndex, type };
    },

    /*
    Reset all input field sizes (relevant on mobile)
     */
    resetInputSizes() {
      this.selectedInput = {}
    },

    /*
    Show filter drawer with animation on mobile/tablet
     */
    onClickFilter() {
      this.isFilterDrawerActive = true;
      var self = this;
      setTimeout(function() {
        self.drawerAnimFinished = true;
      }, 400);
    },

    /*
    Show details of selected flight route
     */
    openFlightRouteDetailsModal(flightRouteResult) {
      this.flightRouteModalData = flightRouteResult;
      this.isFlightModalActive = true;
    },

    /*
    Filter destination airports based on user input
     */
    onInputAutocomplete(input) {
        this.filteredFlightDestinations = this.flightDestinationStrings.filter(option => option
        .toString()
        .toLowerCase()
        .indexOf(input.toLowerCase()) >= 0);
    },

    /*
    Update displayed location input when user selected an airport destination
     */
    onSelectLocation(locationObj, option) {
      // must be adapted if displayed string changes
      let iataStr = '';
      let optionSplit = option.split('(');
      if (optionSplit.length > 1) {
        iataStr = optionSplit[1].split(')')[0].trim();
      }
      var cityStr = optionSplit[0].trim();

      locationObj.input = option;
      locationObj.city = cityStr;
      locationObj.iata = iataStr;
    },

    /*
    Handles trip sections update event coming from outside (= another component)
     */
    onUpdateTripSectionsEvent(event) {
      let eventData;
      if (typeof event.data === 'object' || event.data instanceof Object) eventData = event.data;
      else eventData = JSON.parse(event.data);
      //console.log(JSON.stringify(eventData, null, 4));

      if (eventData == null || eventData.sections == null) return;

      if (this.relevantTripDetailsChanged(Helpers.getFromLocalStorage(Helpers.LocalStorageKeys.TRIPSECTIONS), eventData)) {
        this.onUpdateTripSections(eventData);
        this.$toast.open({
          message: 'Flights were updated due to changes in another component',
          type: 'is-warning',
          duration: 4000
        })
      } else {
        Helpers.saveToLocalStorage(Helpers.LocalStorageKeys.TRIPSECTIONS, eventData);
      }
    },

    /*
    Update ui with newly retrieved trip sections data
     */
    onUpdateTripSections(tripSectionsData) {
      let searchSection;
      this.tripSectionsData = tripSectionsData;
      // save trip sections data persistently
      Helpers.saveToLocalStorage(Helpers.LocalStorageKeys.TRIPSECTIONS, tripSectionsData);

      const self = this;

      let searchData = [];

      let i = 0;

      // update flight input mask data
      for (const tripSection of tripSectionsData.sections) {

        switch(i) {
          case 0:
            let exampleIata = "";
            this.flightDestinations.find(location => {
              if(location.city === tripSection.location) {
                exampleIata = location.iata;
                return true;
              }
            });

            searchSection = {
              startLocation: {
                ...Helpers.defaultGermanAirport
              },
              endLocation: {
                city: tripSection.location,
                iata: exampleIata,
                input: self.getDisplayedInputDstStr(tripSection.location, exampleIata)
              },
              travelDate: new Date(tripSection.startDate)
            };

            break;
          default:
            let exampleIataEnd = "";
            this.flightDestinations.find(location => {
              if(location.city === tripSection.location) {
                exampleIataEnd = location.iata;
                return true;
              }
            });

            searchSection = {
              startLocation: {
                city: tripSectionsData.sections[i - 1].location,
                iata: searchData[searchData.length - 1].endLocation.iata,
                input: searchData[searchData.length - 1].endLocation.input
              },
              endLocation: {
                city: tripSection.location,
                iata: exampleIataEnd,
                input: self.getDisplayedInputDstStr(tripSection.location, exampleIataEnd)
              },
              travelDate: new Date(tripSection.startDate)
            };
            break;
        }
        searchData.push(searchSection);
        i++;
      }

      searchSection = {
        startLocation: {
          city: tripSectionsData.sections[tripSectionsData.sections.length - 1].location,
          iata: searchData[searchData.length - 1].endLocation.iata,
          input: searchData[searchData.length - 1].endLocation.input,
        },
        endLocation: {
          ...Helpers.defaultGermanAirport
        },
        travelDate: new Date(tripSectionsData.endDate),
      };

      searchData.push(searchSection);

      this.resetInputSizes();
      this.updateFilterData(searchData);
      this.inputFlightRoute = searchData;
      this.searchFlightRoutes();
    },

    /*
    Update/Refresh displayed filter slider options
     */
    updateFilterData(searchData) {
      let travelTimes = [];
      let travelTime = ["00:00", "23:59"];
      for (var i = 0; i < searchData.length; i++) {
        travelTimes.push(travelTime);
      }
      this.filters.travelTimes = travelTimes;
    },

    // check if flight dates are in the exact order respective trip sections order
    checkValidityOfFlightDates() {
      // check if dates are valid
      let startDate, endDate;
      let errorsOccurred = false;

      for (let i = 0; i < this.inputFlightRoute.length - 1; i++) {
        // avoid array out-of-bound exceptions
        if (this.inputFlightRoute.length === i+1) break;

        startDate = new Date(this.inputFlightRoute[i].travelDate);
        endDate = new Date(this.inputFlightRoute[i+1].travelDate);

        if (moment(startDate).isAfter(moment(endDate))) {
          errorsOccurred = true;
          break;
        }
      }

      this.flightDatesHaveErrors = errorsOccurred;
    },

    /*
    Start search for flight routes conforming the user input data
     */
    searchFlightRoutes() {
      var self = this;

      this.checkValidityOfFlightDates();
      if (this.flightDatesHaveErrors) return;

      this.isLoadingResults = true;

      // timeout for mocking rtt of http request
      setTimeout(() => {
        // to prevent input errors
        for (var inputRow of this.inputFlightRoute) {
          inputRow.startLocation.input = self.getDisplayedInputDstStr(inputRow.startLocation.city, inputRow.startLocation.iata);
          inputRow.endLocation.input = self.getDisplayedInputDstStr(inputRow.endLocation.city, inputRow.endLocation.iata);
        }

        // so that in filter section flight infos get synced
        this.searchedFlightRoute = this.inputFlightRoute.slice();


        // retrieve JSON data
        let resultData = JSON.parse(Helpers.queryFlightRoutes(this.searchedFlightRoute));

        // save data in js class implementation for consistency
        let flightRouteResultsTmp = [];

        for (const result of resultData){
          let flightRouteTmp = Helpers.ResponseJSONToFlightRoute(result);
          flightRouteResultsTmp.push(flightRouteTmp);
        }

        this.rawFlightRouteResults = flightRouteResultsTmp;

        self.isLoadingResults = false;
      }, self.getRandomLoadingDuration())
    },

    getRandomLoadingDuration() {
      return Math.floor(Math.random() * this.defaultLoadingDuration)
    },

    /*
    Collection of sorting functions
     */
    sortByProperty(property) {
      switch(property) {
        case 'price':
          return (a, b) => {
            if (a['price'] < b['price'])
              return -1;
            if (a['price'] > b['price'])
              return 1;
            return 0
          };
        case 'duration':
          return (a, b) => {
            if (a.travelTime < b.travelTime)
              return -1;
            if (a.travelTime > b.travelTime)
              return 1;
            return 0
          };
        default:
          return undefined
      }
    }
  },

  computed: {

    /*
    Transforms order of filtered flight route results according to sorting criterium
     */
    sortedFlightRouteResults() {
        // does the hard sorting work
        var sortedData =  this.filteredFlightRouteList.sort(this.sortByProperty(this.sortCriteria[this.sortCriteriaKey]))

        // now re-enable the reactivity of the data so that the template gets updated
        var refreshedData = []
        for (var result of sortedData) {
          var refreshedResult = FlightRoute.fromJSON(result.toJSON());
          refreshedData.push(refreshedResult)
        }
        return refreshedData
    },

    /*
    Assembles the aiport destination list of the location input fields
     */
    flightDestinationStrings() {
        return this.flightDestinations.map(location => {
          var displayName = location.city;
          if (location.iata !== "")
            displayName += " (" + location.iata + ")";
          return displayName
        });
    },

    /*
    Filter flight route results according to selected filter criteria
     */
    filteredFlightRouteList() {

      // if stopovers are changing
      let filteredList = this.rawFlightRouteResults.filter((flightRouteResult) => {
        for (var flight of flightRouteResult.flights) {
          if (this.filters.stopovers.some(val => val === flight.stopoverCount.toString())) {
            continue;
          }
          return false;
        }
        return true;
      });

      // if travel time range slider is changing
      filteredList = filteredList.filter((flightRouteResult) => {
        let i = 0;
        for (const flight of flightRouteResult.flights) {
          if (this.timeInTimespan(flight.startDate, this.filters.travelTimes[i])
              && this.timeInTimespan(flight.endDate, this.filters.travelTimes[i])) {
            i += 1;
            continue;
          }
          return false;
        }
        return true;
      });

      return filteredList;
    },
  },

  created() {

    this.flightDestinations = Helpers.getAirportList();

    // retrieve saved data if page gets refreshed
    let savedTripSectionsData = Helpers.getFromLocalStorage(Helpers.LocalStorageKeys.TRIPSECTIONS);
    if (savedTripSectionsData !== null) {
      this.onUpdateTripSections(savedTripSectionsData)
    }
    // when page is loaded for the first time use dummy data
    else this.onUpdateTripSections(Helpers.getTripSectionsInitialData());

    // reset saved flight route data
    let localFlightRouteData = Helpers.getFromLocalStorage(Helpers.LocalStorageKeys.FLIGHTROUTE);
    if (localFlightRouteData !== null) Helpers.removeFromLocalStorage(Helpers.LocalStorageKeys.FLIGHTROUTE);
  },

  mounted() {
    // register event listener for documa <-> vue communication
    window.addEventListener('message', this.onUpdateTripSectionsEvent);

    // fill hours for travel time slider sliderOptions
    for (let i = 0; i < 49; i += 1) {
      let time = '';
      if (i === 0) time = '00:00';
      else if (i === 48) time = '23:59';
      else if (i % 2 === 0) {
        if (i < 20) time += '0';
        time += `${i / 2}:00`;
      } else {
        if (i < 20) time += '0';
        time += `${(i - 1) / 2}:30`;
      }
      this.sliderOptions.data[i] = time;
    }
  },

  beforeDestroy() {
    window.removeEventListener('message', this.onUpdateTripSectionsEvent);
  }
};
</script>
<style lang="sass">
.title-icon
  padding-left: .4rem
#nav
  padding: 30px
  a
    font-weight: bold
    color: #2c3e50
    &.router-link-exact-active
      color: #42b983

.flight-no
  position: absolute
  text-align: center
  bottom: 25%
  width: 30px
  height: 30px
  border-radius: 50%
  line-height: 30px
  font-size: .9rem
  border: 1px solid #ccc
  right: 0

.flight-start, .flight-end
  min-width: 40%

.flight-time
  font-size: .8rem

.flight-duration
  font-size: .8rem
  position: absolute
  left: 0
  right: 0
  margin-left: auto
  margin-right: auto
  bottom: 60%

.stopover-count
  font-size: .7rem
  position: absolute
  left: 0
  right: 0
  margin-left: auto
  margin-right: auto
  top: 65%
  color: #693935

.flight-no-0
  bottom: 15%

.flight-request-form
  background-color: aliceblue

.flight-info
  border-bottom: 1px solid #d9d9d9
  &:last-child
    border-bottom: none

.filter-option
  padding-bottom: 2rem
  &:last-child
      padding-bottom: 0

.traveltimes-slider
  padding: 0rem 0 2.5rem 0 !important

.flight-route-result
  margin-bottom: 2rem !important
  border-radius: 5px

.has-box-shadow
  box-shadow: 0px 9px 33px -9px rgba(0,0,0,0.75)
  border: 1px solid rgba(128, 128, 128, 0.13)

.flight-route-results__cta
  &.is-mobile
    border-top: 5px dashed #d2dae2
  &.is-desktop
    border-left: 5px dashed #d2dae2

.is-vh-centered
  display: flex
  align-items: center
  justify-content: center

.is-vertical-centered
  display: flex
  align-items: center

.is-horizontal-centered
  display: flex
  justify-content: center

.flight-start, .flight-end, .flight-hr
  display: inline-block

.flight-hr
  padding: 0 1.5rem

.flight-info-overview
  padding: 1.25rem .75rem .75rem .75rem !important
  &:first-child
    padding-bottom: 1.25rem !important

.flight-info-stopovers
  margin: 1rem 0

.is-vertically-stacked
  flex-direction: column

.flight-route-price
  font-size: 2rem
  font-weight: bold

.flight-segment-airline
  font-size: .8rem

.flight-segment-stopover
  background-color: #e4edf4
  margin-bottom: .25rem !important
  margin-top: calc(1.5rem - 0.75rem) !important

.modal
  .flight-segment-stopover
    background-color: transparent

.flight-segment-detailed-info
  border-left: 2px dashed #bfc8ce

.flight-segment-flight-time, .flight-segment-stopover-time
  font-weight: bold

.is-relative
  position: relative

.airline-logo
  background-color: #d0ffcf
  padding: .5rem .7rem
  word-break: break-word
  font-weight: bold
  display: inline-block
  font-size: .5rem
  text-transform: none
  line-height: .8rem

.filter-options
  &.is-desktop

.trip-section-title
  text-align: left
  font-weight: bold

.trip-section-waiting-time
  font-weight: bold
  background-color: rgb(232, 240, 246)
  border-radius: 10px
  padding: 1rem 0

@media screen and (min-width: 1024px)
  .modal-card, .modal-content
    width: 800px

body.no-scrolling
  overflow-x: hidden
  overflow-y: scroll !important

.nav-drawer-container
  position: absolute
  height: 100%
  width: 100%
  background-color: aliceblue
  z-index: 10000
  top: 0
  left: -100%
  transition: .4s ease
  position: fixed
  overflow: hidden
  &.is-active
    left: 0

.nav-drawer-container
  padding: 2rem

.filter-drawer
  max-width: 600px
  margin: 0 auto

.filter-drawer-header
  padding-bottom: 1rem
  position: relative

.filter-drawer-title
  font-weight: bold
  font-size: 1.7rem
  text-align: center

.filter-drawer-btn-close
  position: absolute
  top: 0
  right: 0
  background-color: transparent

.paginate-links .left-arrow,
.paginate-links .right-arrow
  display: inline-flex
  a
    padding: .5rem 1rem

.paginate-links .right-arrow
  margin-left: -1.25rem

.sort-dropdown
  display: flex
  justify-content: flex-end
  margin-bottom: 2rem !important

@media screen and (max-width: 768px)
  .hidden
    display: none

.notification-flight-error
  border-radius: 0px
  &.hidden
    display: none

</style>
