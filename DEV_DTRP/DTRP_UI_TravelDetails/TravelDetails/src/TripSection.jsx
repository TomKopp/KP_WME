import { Button, Grid, Paper, Typography } from '@material-ui/core';
import { FlightLand, FlightTakeoff, Hotel, Place, Star } from '@material-ui/icons';
import Accommodation from './Accommodation';
import Activity from './Activity';
import MediaList from './MediaList';
import React from 'react';
import Transport from './Transport';

export default ({ location, startDate, endDate, content = [], mediaList, rating, transport, hotel = [], activities = [] }) => {
    const [title = 'Generic Title', ...contentList] = content;
    const hotelsNameList = hotel
        .map((el) => el.name)
        .join(', ');

    return <Paper className="section" component="article">
        <Grid container spacing={16} className="section-summary">
            <Grid item xs={12} sm={5}>
                <MediaList children={mediaList} />
            </Grid>
            <Grid item container xs={12} sm={7}>
                <Grid item xs={12}><Typography gutterBottom variant="h4" component="h1">{title}</Typography></Grid>
                <Grid item xs={6}><Typography gutterBottom>{startDate && <span className="ico-string"><FlightTakeoff />{(new Date(startDate)).toDateString()}</span>}</Typography></Grid>
                <Grid item xs={6}><Typography gutterBottom>{endDate && <span className="ico-string"><FlightLand />{(new Date(endDate)).toDateString()}</span>}</Typography></Grid>
                <Grid item xs={6}><Typography gutterBottom>{hotelsNameList && <span className="ico-string"><Hotel />{hotelsNameList.name}</span>}</Typography></Grid>
                <Grid item xs={6}><Typography gutterBottom>{rating && <span className="ico-string"><Star />Rating: {rating}</span>}</Typography></Grid>
                <Grid item xs={6}><Typography gutterBottom>{location && <span className="ico-string"><Place />{location}</span>}</Typography></Grid>
                <Grid item xs={12}><Typography gutterBottom>
                    {contentList.map((el, key) => <Typography key={key} gutterBottom component="span">{el}</Typography>)}
                </Typography></Grid>
                <Grid item container justify="flex-end">
                    <Button variant="contained" color="primary">Change</Button>
                </Grid>
            </Grid>
        </Grid>

        <Transport {...transport} />
        {hotel.map((el) => <Accommodation key={el.id} {...el} />)}
        {activities.map((el) => <Activity key={el.id} {...el} />)}
    </Paper>;
};
