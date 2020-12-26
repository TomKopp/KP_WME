import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-hotel-rating',
  templateUrl: './hotel-rating.component.html',
  styleUrls: ['./hotel-rating.component.scss']
})
export class HotelRatingComponent implements OnInit {

  constructor() { }

  @Input('numberOfStars') numberOfStars: number = 0;

  ngOnInit() {
  }

}
