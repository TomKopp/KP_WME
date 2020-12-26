import { Business, Class, EuroSymbol, Flight as FlightIco, FlightLand, FlightTakeoff } from '@material-ui/icons';
import { Button, Grid, Paper, Typography } from '@material-ui/core';
import React from 'react';

export const FlightSegment = ({ startDate, endDate, startLocation, endLocation, flightNo, airline, cabinClass }) => <Grid container spacing={16}>
    <Grid item xs={12}><Typography gutterBottom>{flightNo && <b className="ico-string"><FlightIco />Flight number: {flightNo} - From: {startLocation.city} To: {endLocation.city}</b>}</Typography></Grid>
    <Grid item xs={6}><Typography gutterBottom>{startDate && <span className="ico-string"><FlightTakeoff />Begin: {(new Date(startDate)).toDateString()}</span>}</Typography></Grid>
    <Grid item xs={6}><Typography gutterBottom>{endDate && <span className="ico-string"><FlightLand />End: {(new Date(endDate)).toDateString()}</span>}</Typography></Grid>
    <Grid item xs={6}><Typography gutterBottom>{cabinClass && <span className="ico-string"><Class />Cabin class: {cabinClass}</span>}</Typography></Grid>
    <Grid item xs={6}><Typography gutterBottom>{airline && <span className="ico-string"><Business />Airline: {airline.name}</span>}</Typography></Grid>
</Grid>;

export const Flight = ({ flightSegments }) => flightSegments.map((el) => <FlightSegment key={el.segmentNo} {...el} />);

export default ({ type: title = 'Generic Title', price, flights = [] }) => <Paper className="paper" component="article">
    <Grid container spacing={16}>
        <Grid item xs={12}>
            <Typography gutterBottom variant="h5" component="h1">{title}</Typography>
        </Grid>
        {flights.map((el, key) => <Grid key={key} item xs={12} className="flight"><Flight {...el} /></Grid>)}
        <Grid item xs={12} container justify="flex-end">
            <Typography variant="button" gutterBottom>{price && <span className="ico-string"><EuroSymbol />Total: {price}€</span>}</Typography>
        </Grid>
        <Grid item container justify="flex-end">
            <Button variant="contained" color="primary">Change</Button>
        </Grid>
    </Grid>
</Paper>;
