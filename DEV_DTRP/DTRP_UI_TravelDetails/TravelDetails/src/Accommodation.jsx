import { Button, Grid, Paper, Typography } from '@material-ui/core';
import { CalendarToday, EuroSymbol, Place, Star } from '@material-ui/icons';
import MediaList from './MediaList';
import React from 'react';

export const Offer = ({ name, availabilities = [], pricePerNight }) => <Grid container spacing={8}>
    <Grid item xs={6}><Typography variant="button">{name}</Typography></Grid>
    <Grid item xs={6}><Typography><EuroSymbol />{pricePerNight}€</Typography></Grid>
    <Grid item xs={12}>{availabilities.map(({ startDate, endDate }, key) => <Typography key={key} component="span" className="ico-string"><CalendarToday />{startDate.toDateString()} - {endDate.toDateString()}</Typography>)}</Grid>
</Grid>;

export default ({ name, city: location, bookingStart: startDate, bookingEnd: endDate, offers = [], hotelFeatureList = [], hotelImageUrls = [], rating }) => <Paper className="paper" component="article">
    <Grid container spacing={16}>
        <Grid item xs={12}>
            <Typography gutterBottom variant="h5" component="h1">{name}</Typography>
        </Grid>
        <Grid item xs={12} sm={5}>
            <MediaList children={hotelImageUrls.map((el) => ({ type: 'img', src: el }))} />
        </Grid>
        <Grid item container xs={12} sm={7} spacing={8}>
            <Grid item xs={6}><Typography>{startDate && <span className="ico-string"><CalendarToday />Begin: {(new Date(startDate)).toDateString()}</span>}</Typography></Grid>
            <Grid item xs={6}><Typography>{endDate && <span className="ico-string"><CalendarToday />End: {(new Date(endDate)).toDateString()}</span>}</Typography></Grid>
            <Grid item xs={6}><Typography>{rating && <span className="ico-string"><Star />Rating: {rating}</span>}</Typography></Grid>
            <Grid item xs={6}><Typography>{location && <span className="ico-string"><Place />{location}</span>}</Typography></Grid>
            <Grid item xs={12}><Typography gutterBottom>{hotelFeatureList && <span>Features: {hotelFeatureList.map((el) => el.name).join(', ')}</span>}</Typography></Grid>
            <Grid item xs={12}>{offers.map((el, key) => <Offer key={key} {...el} />)}</Grid>
        </Grid>
        <Grid item container justify="flex-end">
            <Button variant="contained" color="primary">Change</Button>
        </Grid>
    </Grid>
</Paper>;
