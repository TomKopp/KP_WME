import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { HotelListComponent } from './hotel-list/hotel-list.component';

import { MatListModule, MatCardModule, MatIconModule, MatButtonModule, MatExpansionModule, MatCheckboxModule, MatTooltipModule, MatDialogModule, MatStepperModule, MatInputModule, MatFormFieldModule, MatSelectModule, MatRadioModule, MatAutocompleteModule } from '@angular/material';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HotelDetailComponent } from './hotel-detail/hotel-detail.component';
import { SlideshowModule } from 'ng-simple-slideshow';
import { HotelDetailFeaturesComponent } from './hotel-detail-features/hotel-detail-features.component';
import { HotelRatingComponent } from './hotel-rating/hotel-rating.component';
import { HotelOffersComponent } from './hotel-offers/hotel-offers.component';
import { TripOverviewComponent } from './trip-overview/trip-overview.component';
import { TripSectionOverviewComponent } from './trip-section-overview/trip-section-overview.component';
import { DummyHotelService } from './dummy-hotel.service';
import { HttpClientModule } from '@angular/common/http';
import { BookingDialogComponent } from './booking-dialog/booking-dialog.component';
import { BookingDialogPersonalDataComponent } from './booking-dialog/booking-dialog-personal-data/booking-dialog-personal-data.component';
import { BookingDialogPaymentComponent } from './booking-dialog/booking-dialog-payment/booking-dialog-payment.component';
import { BookingDialogReadyComponent } from './booking-dialog/booking-dialog-ready/booking-dialog-ready.component';
import { FormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';

@NgModule({
  declarations: [
    AppComponent,
    HotelListComponent,
    HotelDetailComponent,
    HotelDetailFeaturesComponent,
    HotelRatingComponent,
    HotelOffersComponent,
    TripOverviewComponent,
    TripSectionOverviewComponent,
    BookingDialogComponent,
    BookingDialogPersonalDataComponent,
    BookingDialogPaymentComponent,
    BookingDialogReadyComponent
  ],
  imports: [
    HttpClientModule,
    BrowserModule,
    MatListModule,
    MatCardModule,
    MatIconModule,
    MatCheckboxModule,
    MatButtonModule,
    MatExpansionModule,
    MatTooltipModule,
    MatDialogModule,
    MatStepperModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatRadioModule,
    MatAutocompleteModule,
    MatSnackBarModule,
    SlideshowModule,
    BrowserAnimationsModule,
    FormsModule
  ],
  entryComponents: [
    BookingDialogComponent
  ],
  providers: [
    DummyHotelService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
