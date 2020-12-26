import { Button, Divider, Grid, Paper, Typography } from '@material-ui/core';
import { CalendarToday, EuroSymbol, Place, Star } from '@material-ui/icons';
import MediaList from './MediaList';
import React from 'react';

export default ({ location, startDate, endDate, content, mediaList, rating, price }) => {
    const [title = 'Generic Title', ...contentList] = content;

    return <Paper className="paper" component="article">
        <Grid container spacing={16}>
            <Grid item xs={12}><Typography gutterBottom variant="h5" component="h1">{title}</Typography></Grid>
            <Grid item xs={12} sm={5}>
                <MediaList children={mediaList} />
            </Grid>
            <Grid item container xs={12} sm={7} spacing={8}>
                <Grid item xs={6}><Typography>{startDate && <span className="ico-string"><CalendarToday />Begin: {(new Date(startDate)).toDateString()}</span>}</Typography></Grid>
                <Grid item xs={6}><Typography>{endDate && <span className="ico-string"><CalendarToday />End: {(new Date(endDate)).toDateString()}</span>}</Typography></Grid>
                <Grid item xs={6}><Typography>{rating && <span className="ico-string"><Star />Rating: {rating}</span>}</Typography></Grid>
                <Grid item xs={6}><Typography>{price && <span className="ico-string"><EuroSymbol />Price: {price}</span>}</Typography></Grid>
                <Grid item xs={12}><Typography>{location && <span className="ico-string"><Place />{location}</span>}</Typography></Grid>
                <Grid item xs={12}><Divider /></Grid>
                <Grid item xs={12}><Typography gutterBottom>{contentList.map((el, key) => <Typography key={key} gutterBottom component="span">{el}</Typography>)}</Typography></Grid>
            </Grid>
            <Grid item container justify="flex-end">
                <Button variant="contained" color="primary">Change</Button>
            </Grid>
        </Grid>
    </Paper>;
};
