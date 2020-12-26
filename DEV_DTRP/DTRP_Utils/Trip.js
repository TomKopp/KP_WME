// Mock data for a Trip
export default {
    id: 0
    , title: 'Holliday at Mallorca'
    , sender: 'HotelDetails'
    , startDate: new Date('2019-01-15T13:53:25.836Z')
    , endDate: new Date('2019-01-15T13:53:25.836Z')
    , sections: [
        {
            id: 0
            , startDate: new Date('2019-01-15T13:53:25.836Z')
            , endDate: new Date('2019-01-15T13:53:25.836Z')
            , content: [
                'Flight'
                , 'from Frankfurt to Malle'
                , 'from Malle to Frankfurt'
            ]
            , mediaList: [
                {
                    type: 'img'
                    , src: 'https://images.unsplash.com/photo-1483450388369-9ed95738483c?ixlib=rb-1.2.1&auto=format&fit=crop&w=3150&q=80'
                    , description: 'Airplane aisle during flight'
                }
            ]
            , location: 'Frankfurt'
            , rating: 2
            , transport: {
                type: 'plane'
                , flights: [
                    {
                        startDate: new Date('2019-01-04T15:20:00.000Z')
                        , endDate: new Date('2019-01-04T17:00:00.000Z')
                        , flightNo: 'ABM65813'
                        , airline: {
                            name: 'Aero Albatros'
                            , country: 'Spain'
                            , iata: ''
                            , icao: 'ABM'
                            , alias: '\\N'
                            , callsign: 'ALBATROS ESPANA'
                            , airlineId: 20
                            , active: 'N'
                        }
                        , cabinClass: 'Economy'
                        , flightSegments: [
                            {
                                startLocation: {
                                    city: 'Berlin'
                                    , iata: 'SXF'
                                    , input: 'Berlin (SXF)'
                                }
                                , endLocation: {
                                    city: 'Madrid'
                                    , iata: ''
                                    , input: 'Madrid ()'
                                }
                            }
                        ]
                        , travelDate: new Date('2019-01-17T14:26:47.037Z')
                        , travelTime: 100
                    }
                    , {
                        startDate: new Date('2019-01-01T13:50:00.000Z')
                        , endDate: new Date('2019-01-01T15:45:00.000Z')
                        , flightNo: 'ABM06453'
                        , airline: {
                            name: 'Aero Albatros'
                            , country: 'Spain'
                            , iata: ''
                            , icao: 'ABM'
                            , alias: '\\N'
                            , callsign: 'ALBATROS ESPANA'
                            , airlineId: 20
                            , active: 'N'
                        }
                        , cabinClass: 'Economy'
                        , flightSegments: [
                            {
                                startLocation: {
                                    city: 'Madrid'
                                    , iata: ''
                                    , input: 'Madrid ()'
                                }
                                , endLocation: {
                                    city: 'Berlin'
                                    , iata: 'SXF'
                                    , input: 'Berlin (SXF)'
                                }
                            }
                        ]
                        , travelDate: new Date('2019-01-26T23:00:00.000Z')
                        , travelTime: 115
                    }
                ]
            }
        }
        , {
            id: 1
            , startDate: new Date('2019-01-15T13:53:25.836Z')
            , endDate: new Date('2019-01-24T23:00:00.000Z')
            , content: [
                'Hotel 1'
                , 'Am Ballermann'
                , 'Nur 3m vom Strand entfernt.'
            ]
            , mediaList: [
                {
                    type: 'img'
                    , src: 'https://images.unsplash.com/photo-1521090029433-afd0d68460f4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80'
                    , description: 'South Beach, Miami Beach, United States'
                }
            ]
            , location: 'Mallorca'
            , rating: 4
            , hotel: {
                id: 'hotel_1'
                , name: 'Hotel 1'
                , img: 'img-src.de'
                , bookingStart: '2019-01-01'
                , bookingEnd: '2019-02-01'
                , hotelFeatureList: [
                    {
                        id: 'random_Id'
                        , name: 'Pool'
                        , icon: 'pool'
                    }
                ]
                , hotelImageUrls: []
                , rating: 3
                , offers: [
                    {
                        img: ''
                        , name: '2 Bett Suite'
                        , pricePerNight: 322
                        , availabilities: [
                            {
                                startDate: '2019-01-01'
                                , endDate: '2019-01-03'
                            }
                        ]
                    }
                ]
                , city: 'barcelona'
            }
        }
        , {
            id: 2
            , startDate: new Date('2019-01-16T13:53:25.836Z')
            , endDate: new Date('2019-01-15T16:53:25.836Z')
            , content: ['Sightseeing at planet earth.']
            , mediaList: [
                {
                    type: 'img'
                    , src: 'https://images.unsplash.com/photo-1472108653939-927cd6aba6d6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80'
                    , description: 'Quiet holiday beach'
                }
                , {
                    type: 'img'
                    , src: 'https://images.unsplash.com/photo-1526819945808-268890ae8b32?ixlib=rb-1.2.1&auto=format&fit=crop&w=934&q=80'
                    , description: 'Woman with fashionable stylish rattan bag and silk'
                }
            ]
            , location: 'Planet Earth'
            , rating: 5
        }
        , {
            id: 3
            , startDate: new Date('2019-01-24T23:00:00.000Z')
            , endDate: new Date('2019-01-24T23:00:00.000Z')
            , content: ['Flight 2', 'to Frankfurt']
            , mediaList: [
                {
                    type: 'img'
                    , src: 'https://images.unsplash.com/photo-1415859295608-27921edab0ac?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80'
                    , description: 'Before take-off'
                }
            ]
            , location: 'Malle'
            , rating: 3
            , transport: {
                type: 'plane'
                , flights: [
                    {
                        startDate: new Date('2019-01-04T15:20:00.000Z')
                        , endDate: new Date('2019-01-04T17:00:00.000Z')
                        , flightNo: 'ABM65813'
                        , airline: {
                            name: 'Aero Albatros'
                            , country: 'Spain'
                            , iata: ''
                            , icao: 'ABM'
                            , alias: '\\N'
                            , callsign: 'ALBATROS ESPANA'
                            , airlineId: 20
                            , active: 'N'
                        }
                        , cabinClass: 'Economy'
                        , flightSegments: [
                            {
                                startLocation: {
                                    city: 'Berlin'
                                    , iata: 'SXF'
                                    , input: 'Berlin (SXF)'
                                }
                                , endLocation: {
                                    city: 'Madrid'
                                    , iata: ''
                                    , input: 'Madrid ()'
                                }
                            }
                        ]
                        , travelDate: new Date('2019-01-17T14:26:47.037Z')
                        , travelTime: 100
                    }
                    , {
                        startDate: new Date('2019-01-01T13:50:00.000Z')
                        , endDate: new Date('2019-01-01T15:45:00.000Z')
                        , flightNo: 'ABM06453'
                        , airline: {
                            name: 'Aero Albatros'
                            , country: 'Spain'
                            , iata: ''
                            , icao: 'ABM'
                            , alias: '\\N'
                            , callsign: 'ALBATROS ESPANA'
                            , airlineId: 20
                            , active: 'N'
                        }
                        , cabinClass: 'Economy'
                        , flightSegments: [
                            {
                                startLocation: {
                                    city: 'Madrid'
                                    , iata: ''
                                    , input: 'Madrid ()'
                                }
                                , endLocation: {
                                    city: 'Berlin'
                                    , iata: 'SXF'
                                    , input: 'Berlin (SXF)'
                                }
                            }
                        ]
                        , travelDate: new Date('2019-01-26T23:00:00.000Z')
                        , travelTime: 115
                    }
                ]
            }
        }
    ]
}
