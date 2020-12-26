import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CountryListHandler } from './country-list.handler';

@Component({
  selector: 'app-booking-dialog-personal-data',
  templateUrl: './booking-dialog-personal-data.component.html',
  styleUrls: ['./booking-dialog-personal-data.component.scss']
})
export class BookingDialogPersonalDataComponent implements OnInit {

  private personalData: PersonalData = new PersonalData();
  private countryListHandler: CountryListHandler = new CountryListHandler();

  public queryString: string = "";

  @Output() personalDataValid: EventEmitter<PersonalData> = new EventEmitter();

  constructor() { }

  ngOnInit() {
  }

  public dataOut(): void {
    if (this.allPersonalDataFilled())
      this.personalDataValid.emit(this.personalData);
    else
      this.personalDataValid.emit(null);
  }

  public allPersonalDataFilled(): boolean {
    for (let key in this.personalData) {
      if (this.personalData[key] == null || this.personalData[key] == "") {
        return false;
      }
    }
    return true;
  }

  public setSex(sex: string): void {
    this.personalData.sex = sex;
    this.dataOut();
  }

  public setFirstname(firstname: string): void {
    this.personalData.firstname = firstname;
    this.dataOut();
  }

  public setLastname(lastname: string): void {
    this.personalData.lastname = lastname;
    this.dataOut();
  }

  public setStreet(street: string): void {
    this.personalData.street = street;
    this.dataOut();
  }

  public setPLZ(plz: string): void {
    this.personalData.plz = plz;
    this.dataOut();
  }

  public setCountry(country: string): void {
    this.personalData.country = country;
    this.dataOut();
  }

  public getAllCountries(): string[] {
    return this.countryListHandler.getCountryList(this.queryString);
  }

}

export class PersonalData {
  public sex: string = "";
  public firstname: string = "";
  public lastname: string = "";
  public street: string = "";
  public plz: string = "";
  public country: string = "";
}
