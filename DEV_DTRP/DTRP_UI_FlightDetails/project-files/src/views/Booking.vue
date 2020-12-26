<template lang="pug">
  .booking
    .hero.is-primary
      .hero-body
        .container.is-fluid.has-text-centered
          a.button.is-pulled-left.is-transparent.btn-back(@click="onUserCancelBooking")
            span(style="font-size: 1.8rem;")
              i.fas.fa-chevron-left
          h1.title Buchung
            |
            i.fas.fa-clipboard.title-icon
          h2.subtitle Gleich Geschafft
    .form-wizard
      form-wizard(title="", subtitle="", stepSize="xs", color="#7957d5", errorColor="#ff3860", finishButtonText="Complete Booking", ref="wizard" :class="{'scrolled-down': hasScrolledDown && (isPhoneSize || isTabletSize)}", @on-change="scrollTop")

        // First tab: Options
        tab-content(title='Options' :before-change="() => validateStep('sliderOptions')")
          section.section.trip-section-content(v-if="!isEmpty(flightRouteData)")
            .container
              .title.has-text-left Flugdaten
              .trip-section-wrapper.has-box-shadow
                .columns
                  .column
                    .columns.is-multiline.is-mobile.flight-info.is-vh-centered(v-for="(flight, flightIndex) in flightRouteData.flights" :key="flightIndex")
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
          section.section.further-options-content
            .container
              .title.has-text-left Weitere Optionen
              b-field( horizontal label="Gepäckoption")
                b-select(v-model="model.sliderOptions.luggageOption")
                  option(v-for="option in luggageOptions", :value="option.id", :key="option.id") {{ option.id }}
              b-field( horizontal label="Sitzplatzreservierung", class="has-text-left")
                b-switch(v-model="model.sliderOptions.seatReservation")

        // Second Tab: Personal Details
        tab-content(title='Persönliche Angaben', :before-change="() => validateStep('personalDetails')")
          .section.has-text-left
            .container.container-max-width
              .title Persönliche Daten
              .field.is-horizontal
                .field-label.is-normal
                  label.label Name
                .field-body
                  .field
                    p.control.is-expanded.has-icons-right
                      input.input(type="text" placeholder="Nachname", v-model.trim="model.personalDetails.lastName", @input="$v.model.personalDetails.lastName.$touch()", :class="{'is-danger': $v.model.personalDetails.lastName.$error}")
                      span.icon.is-small.is-right(v-if="$v.model.personalDetails.lastName.$error")
                        i.fas.fa-exclamation-triangle
                    p.help.is-danger(v-if="$v.model.personalDetails.lastName.$error") Der Nachname ist invalide
                  .field
                    p.control.is-expanded.has-icons-right
                      input.input(type="text" placeholder="Vorname", v-model.trim="model.personalDetails.firstName", @input="$v.model.personalDetails.firstName.$touch()", :class="{'is-danger': $v.model.personalDetails.firstName.$error}")
                      span.icon.is-small.is-right(v-if="$v.model.personalDetails.firstName.$error")
                        i.fas.fa-exclamation-triangle
                    p.help.is-danger(v-if="$v.model.personalDetails.firstName.$error") Der Vorname ist invalide
              .field.is-horizontal
                .field-label.is-normal
                  label.label Tel
                .field-body
                  .field
                    p.control.is-expanded.has-icons-right
                      input.input(type="tel" placeholder="(+49) 12345678", v-model.trim="model.personalDetails.tel", @input="$v.model.personalDetails.tel.$touch()", :class="{'is-danger': $v.model.personalDetails.tel.$error}")
                      span.icon.is-small.is-right(v-if="$v.model.personalDetails.tel.$error")
                        i.fas.fa-exclamation-triangle
                    p.help.is-danger(v-if="$v.model.personalDetails.tel.$error") Die Telefonnummer ist invalide
              .field.is-horizontal
                .field-label.is-normal
                  label.label Geburtsdatum
                .field-body
                  .field
                    p.control.is-expanded.has-icons-right
                      input.input(type="date" placeholder="2018-01-01", min="1940-01-01", max="2000-01-01", v-model.trim="model.personalDetails.birthdate", @input="$v.model.personalDetails.birthdate.$touch()", @change="$v.model.personalDetails.birthdate.$touch()", :class="{'is-danger': $v.model.personalDetails.birthdate.$error}")
                      span.icon.is-small.is-right(v-if="$v.model.personalDetails.birthdate.$error")
                        i.fas.fa-exclamation-triangle
                    p.help.is-danger(v-if="$v.model.personalDetails.birthdate.$error") Das Geburtsdatum ist invalide
              .field.is-horizontal
                .field-label.is-normal
                  label.label Email
                .field-body
                  .field
                    p.control.is-expanded.has-icons-right
                      input.input(type="email" placeholder="max.muster@gmx.de", v-model.trim="model.personalDetails.email", @input="$v.model.personalDetails.email.$touch()", :class="{'is-danger': $v.model.personalDetails.email.$error}")
                      span.icon.is-small.is-right(v-if="$v.model.personalDetails.email.$error")
                        i.fas.fa-exclamation-triangle
                    p.help.is-danger(v-if="$v.model.personalDetails.email.$error") Die Email-Adresse ist invalide

        // 3rd Tab: Payment
        tab-content(title='Zahlung', :before-change="() => validateStep('paymentDetails')")
          .section.has-text-left
            .container.container-max-width
              .title Zahlungsinformationen
              b-notification
                | Derzeit akzeptieren wir nur Kreditkarten als Zahlungsmöglichkeit. Wir entschuldigen uns für jegliche Unannehmlichkeiten.
              .field.is-horizontal
                .field-label.is-normal
                  label.label Name des Kartenbesitzers
                .field-body
                  .field
                    p.control.is-expanded.has-icons-right
                      input.input(type="text" placeholder="Nachname", v-model.trim="model.paymentDetails.lastName", @input="$v.model.paymentDetails.lastName.$touch()", :class="{'is-danger': $v.model.paymentDetails.lastName.$error}")
                      span.icon.is-small.is-right(v-if="$v.model.paymentDetails.lastName.$error")
                        i.fas.fa-exclamation-triangle
                    p.help.is-danger(v-if="$v.model.paymentDetails.lastName.$error") Der Nachname ist invalide
                  .field
                    p.control.is-expanded.has-icons-right
                      input.input(type="text" placeholder="Vorname", v-model.trim="model.paymentDetails.firstName", @input="$v.model.paymentDetails.firstName.$touch()", :class="{'is-danger': $v.model.paymentDetails.firstName.$error}")
                      span.icon.is-small.is-right(v-if="$v.model.paymentDetails.firstName.$error")
                        i.fas.fa-exclamation-triangle
                    p.help.is-danger(v-if="$v.model.paymentDetails.firstName.$error") Der Vorname ist invalide
              .field.is-horizontal
                .field-label.is-normal
                  label.label Kartennummer
                .field-body
                  .field
                    p.control.is-expanded.has-icons-right
                      input.input(type="number" placeholder="0123456789", v-model.trim="model.paymentDetails.cardNumber", @input="$v.model.paymentDetails.cardNumber.$touch()", :class="{'is-danger': $v.model.paymentDetails.cardNumber.$error}")
                      span.icon.is-small.is-right(v-if="$v.model.paymentDetails.cardNumber.$error")
                        i.fas.fa-exclamation-triangle
                    p.help.is-danger(v-if="$v.model.paymentDetails.cardNumber.$error") Die Kartennummer ist invalide
              .field.is-horizontal
                .field-label.is-normal
                  label.label Ablaufdatum
                .field-body
                  .field
                    p.control.is-expanded.has-icons-right
                      input.input(type="text" placeholder="03/18", v-model.trim="model.paymentDetails.expirationDate", @input="$v.model.paymentDetails.expirationDate.$touch()", :class="{'is-danger': $v.model.paymentDetails.expirationDate.$error}")
                      span.icon.is-small.is-right(v-if="$v.model.paymentDetails.expirationDate.$error")
                        i.fas.fa-exclamation-triangle
                    p.help.is-danger(v-if="$v.model.paymentDetails.expirationDate.$error") Das Ablaufdatum ist invalide
              .field.is-horizontal
                .field-label.is-normal
                  label.label Sicherheitscode
                .field-body
                  .field
                    p.control.is-expanded.has-icons-right.security-code-input
                      input.input(type="number" placeholder="123", v-model.trim="model.paymentDetails.securityCode", @input="$v.model.paymentDetails.securityCode.$touch()", :class="{ 'is-danger': $v.model.paymentDetails.securityCode.$error}")
                      span.icon.is-small.is-right(v-if="$v.model.paymentDetails.securityCode.$error")
                        i.fas.fa-exclamation-triangle
                    p.help.is-danger(v-if="$v.model.paymentDetails.securityCode.$error") Der Sicherheitscode ist invalide


        // 4th Tab: Recheck
        tab-content(title='Überprüfung')
          section.section.trip-section-content


            // Flight Details
            .container.has-text-left.final-step__flight-info.container-max-width
              .title Flugdaten
              .columns.is-multiline.is-mobile.flight-info.is-vh-centered(v-for="(flight, flightIndex) in flightRouteData.flights" :key="flightIndex")
                .column.is-12.flight-info-overview
                  .columns
                    .column.has-text-left.has-text-weight-bold
                      .flight-title
                        | {{ flight.startDate | momentjs('DD.MM.YY') }}:
                        | {{ flight.startLocation.city + ' - ' + flight.endLocation.city }}
                  .columns
                    .column.is-7-desktop.is-6-tablet.is-relative
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
                        .column.stopover
                          | Verbindung am Flughafen

          // Personal Details
          section.section.trip-section-content
            .container.has-text-left
              .title Persönliche Daten
              .final-step__personal-details(v-for="(val, key) in model.personalDetails")
                .columns.is-mobile
                  p.column.is-5-mobile.is-2-tablet
                    b {{ localiseDE(key) }}
                  p.column.is-6-mobile
                    | {{ val }}

          // Payment Details
          section.section.trip-section-content
            .container.has-text-left
              .title Zahlungsinformationen
              .final-step__personal-details(v-for="(val, key) in model.paymentDetails")
                .columns.is-mobile
                  p.column.is-5-mobile.is-2-tablet
                    b {{ localiseDE(key) }}
                  p.column.is-6-mobile(v-if="key === 'cardNumber'")
                    | {{ val | concealNumber }}
                  p.column.is-6-mobile(v-else)
                    | {{ val }}
              hr
              .final-step__price {{ '= ' + flightRouteData.price + " €"}}
        template(slot='footer', slot-scope='props')
          .wizard-footer-left
            wizard-button(v-if='props.activeTabIndex > 0 && !props.isLastStep', :style='props.fillButtonStyle', @click.native='props.prevTab()') Zurück
          .wizard-footer-right
            wizard-button(v-if='!props.isLastStep', @click.native='props.nextTab()', :style='props.fillButtonStyle') Weiter
            wizard-button.finish-button(v-else='', @click.native="onFinishBooking", :style='props.fillButtonStyle') {{props.isLastStep ? 'Zahlen' : 'Weiter'}}

</template>

<script>
import { required, numeric, email } from 'vuelidate/lib/validators';
import moment from 'moment';
import BNotification from 'buefy/src/components/notification/Notification.vue';
import * as Helpers from '../lib/helpers';
import { FlightRoute } from '../lib/model';

export default {
  name: 'Booking',
  components: { BNotification },
  mixins: [Helpers.mixin],
  data() {
    const today = new Date();

    return {
      hasScrolledDown: false,

      tripSectionsData: {},
      flightRouteData: {},

      luggageOptions: [
        {
          id: '1x Handgepäck, 1x Reisegepäck (max. 23kg)',
        },
        {
          id: '1x Carry-On Baggage (max. 10kg)',
        },
      ],

      localesDE: {
        firstName: 'Vorname',
        lastName: 'Nachname',
        tel: 'Tel',
        birthdate: 'Geburtsdatum',
        email: 'Email',
        seatReservation: 'Sitzplatzreservierung',
        luggageOption: 'Gepäckoption',
        cardNumber: 'Kartennummer',
        expirationDate: 'Ablaufdatum',
        securityCode: 'Sicherheitscode',
      },

      model: {
        personalDetails: {
          firstName: '',
          lastName: '',
          tel: '',
          birthdate: '',
          email: '',
        },
        sliderOptions: {
          seatReservation: false,
          luggageOption: '',
        },
        paymentDetails: {
          firstName: '',
          lastName: '',
          cardNumber: '',
          expirationDate: '',
          securityCode: '',
        },
      },
    };
  },
  validations: {
    model: {
      personalDetails: {
        firstName: {
          required,
        },
        lastName: {
          required,
        },
        birthdate: {
          required,
        },
        tel: {
          required,
          numeric,
        },
        email: {
          required,
          email,
        },
      },
      sliderOptions: {

      },
      paymentDetails: {
        firstName: {
          required,
        },
        lastName: {
          required,
        },
        cardNumber: {
          required,
          numeric,
        },
        securityCode: {
          required,
          numeric,
        },
        expirationDate: {
          required,
        },
      },
    },
  },
  methods: {
    /*
    Show confirmation dialog if user really wants to cancel the booking
     */
    onUserCancelBooking() {
      this.$dialog.confirm({
        title: 'Buchung abbrechen',
        message: 'Möchten Sie wirklich den aktuellen Buchungsprozess abbrechen?',
        type: 'is-info',
        onConfirm: () => this.$router.push({ name: 'home' }),
      });
    },
    /*
    Handle the update trip sections event coming from outside (= other component)
     */
    onUpdateTripSectionsEvent(event) {
      let eventData;
      if (typeof event.data === 'object' || event.data instanceof Object) eventData = event.data;
      else eventData = JSON.parse(event.data);
      //console.log(JSON.stringify(eventData, null, 4));

      if (eventData == null || eventData.sections == null) return;

      if (this.relevantTripDetailsChanged(Helpers.getFromLocalStorage(Helpers.LocalStorageKeys.TRIPSECTIONS), eventData)) {
        this.onUpdateTripSections(eventData);
      } else {
        Helpers.saveToLocalStorage(Helpers.LocalStorageKeys.TRIPSECTIONS, eventData);
      }
    },

    /*
    If incoming trip detail changes are crucial, abort the booking process
     */
    onUpdateTripSections(tripSectionsData) {
      Helpers.saveToLocalStorage(Helpers.LocalStorageKeys.TRIPSECTIONS, tripSectionsData);
      this.onAbortBooking();
    },

    /*
    Abort booking process
     */
    onAbortBooking() {
      this.$dialog.alert({
        title: 'Tripänderung',
        message: 'Der Buchungsprozess wurde abgebrochen, da am Trip Änderungen in einer anderen Komponente unternommen wurden. Sie werden zurück zur Flugsuche geleitet.',
        type: 'is-warning',
        hasIcon: true,
        icon: 'exclamation-triangle',
        iconPack: 'fa',
        onConfirm: () => {
          this.$router.push({ name: 'home' });
        },
      });
    },

    /*
    Check if user is in last step
     */
    isLastStep() {
      if (this.$refs.wizard) {
        return this.$refs.wizard.isLastStep;
      }
      return false;
    },

    /*
    Validate step when user wants to go on with the next one
     */
    validateStep(stepName) {
      this.$v.model[stepName].$touch();
      const isValid = !this.$v.model[stepName].$invalid;
      return isValid;
    },

    /*
    Handle situation when user wants to finish the booking
     */
    onFinishBooking(event) {
      const self = this;

      this.flightRouteToTripDetails(this.flightRouteData);

      console.log(`updateTripSections with: ${JSON.stringify(this.tripSectionsData, null, 4)}`);
      window.parent.postMessage(this.tripSectionsData, '*');

      this.$toast.open({
        message: 'Buchung war erfolgreich.',
        type: 'is-success',
      });
      this.$router.push({ name: 'home' });
    },
    // update trip sections data according to data model (see composition model uml)
    flightRouteToTripDetails(flightRouteData) {
      const prunedFlightRouteData = flightRouteData.toJSON();

      for (let i = 0; i < this.tripSectionsData.sections.length; i++) {
        this.$set(this.tripSectionsData.sections[i], 'transport', {
          type: 'plane',
          price: prunedFlightRouteData.price,
          flights: [prunedFlightRouteData.flights[i], prunedFlightRouteData.flights[i + 1]],
        });
      }

      return this.tripSectionsData;
    },
  },
  filters: {
    /*
    Only show the last three digits of a secure number
     */
    concealNumber(val) {
      let concealedNumber = '';
      if (val.length > 0) {
        const splitDigits = [val.substring(0, val.length - 2), val[val.length - 1]];
        concealedNumber = splitDigits[0].replace(/[0-9]/g, '*') + splitDigits[1];
      }
      return concealedNumber;
    },
  },
  created() {
    // preselect luggage option
    this.model.sliderOptions.luggageOption = this.luggageOptions[0].id;

    // retrieve saved data
    const localTripData = Helpers.getFromLocalStorage(Helpers.LocalStorageKeys.TRIPSECTIONS);
    if (localTripData !== null) this.tripSectionsData = localTripData;

    const localFlightRouteData = Helpers.getFromLocalStorage(Helpers.LocalStorageKeys.FLIGHTROUTE);
    if (localFlightRouteData !== null) this.flightRouteData = FlightRoute.fromJSON(localFlightRouteData);
  },
  mounted() {
    window.addEventListener('message', this.onUpdateTripSectionsEvent);
  },
  destroyed() {
    window.removeEventListener('message', this.onUpdateTripSectionsEvent);
  },
};
</script>

<style lang="sass">
.button.is-transparent
  background-color: transparent
  border: 0

.btn-back
  color: #fff
  position: absolute
  left: 0

.container-max-width
  max-width: 800px !important

.wizard-header
  display: none
.wizard-navigation
  margin: .2rem 0 2rem 0!important

.scrolled-down
  .wizard-nav, .wizard-nav-pills
    position: fixed !important
    top: 0
    width: 100%
    padding: 20px 0
    background-color: #fff
    z-index: 1
    border-bottom: 4px solid rgb(121, 87, 213)
  .wizard-progress-bar
    visibility: hidden
  .wizard-tab-content
    padding-top: 30px !important
.wizard-tab-content
  padding-top: 0 !important
.trip-section-content
  .container
    max-width: 800px !important

.flight-title
  font-size: 1.2rem

.flight-segment-stopover
  margin: 0 !important
.final-step__flight-info
  .flight-info
    border-left: 6px solid #d8d8d8
    margin-bottom: 2rem !important
    border-bottom: 0
    &:last-child
      margin-bottom: 0


.trip-section-wrapper
  padding: 2rem
@media screen and (max-width: 600px)
  .section
    padding: 3rem .5rem
.security-code-input
  width: 5rem

.final-step__plane-icon
  margin: 0 1rem

.final-step__flight
  margin-bottom: 1rem

.final-step__price
  font-size: 2rem
  text-decoration: double underline

.finish-button
  background-color: #20bc56 !important
  border-color: #20bc56 !important

</style>
