import { AppBar, Button, CssBaseline, Grid, InputAdornment, MenuItem, Paper, TextField, Toolbar, Typography } from '@material-ui/core';
import React, { Component } from 'react';
import Today from '@material-ui/icons/Today';
import Trip from './Trip';

export default class App extends Component {
    constructor(props) {
        super(props);

        this.sortBy = [
            { value: '', label: 'None' }
            , { value: 'price', label: 'Price' }
            , { value: 'rating', label: 'Rating' }
        ];
        this.ratings = [
            { value: 0, label: 'All' }
            , { value: 1, label: '1+' }
            , { value: 2, label: '2+' }
            , { value: 3, label: '3+' }
            , { value: 4, label: '4+' }
            , { value: 5, label: '5' }
        ];

        this.travelCatalog = props.travelCatalog;
        document.addEventListener('onUpdateTripSections', ({ detail: trip }) => this.onUpdateTripSections(trip));

        this.state = {
            currentTrip: null
            , tripList: props.tripList || []
            , sortBy: ''
            , rating: 0
            , arrival: ''
            , departure: ''
            , destination: ''
        };
    }


    filterTrip({ rating, arrival, departure, destination }) {
        return (el) => 'rating' in el && el.rating >= rating;
    }

    handleChange(name) {
        return (event) => this.setState({ [name]: event.target.value });
    }

    setCurrentTrip(trip) {
        this.setState({ currentTrip: trip });
        document.dispatchEvent(new CustomEvent('updateTripSections', { detail: trip }));
    }

    onUpdateTripSections(currentTrip) {
        this.setState({ currentTrip });
    }

    render() {
        return <>
            <CssBaseline />
            <AppBar position="static">
                <Toolbar>
                    <Typography component="h1" variant="h6" color="inherit">{this.travelCatalog.title}</Typography>
                </Toolbar>
            </AppBar>
            <div style={{ padding: '16px', maxWidth: '1050px', margin: 'auto' }}>
                <Paper className="app-filter">
                    <Grid container spacing={16} alignItems="center">
                        <Grid item style={{ flex: '1 1 100%', minWidth: '17em' }}><TextField label="Destination" name="destination" type="search" margin="normal" variant="outlined" fullWidth onChange={this.handleChange('destination')} /></Grid>
                        <Grid item style={{ flex: '1 1 50%', minWidth: '17em' }}><TextField label="Arrival" name="arrival" type="date" margin="normal" variant="outlined" fullWidth onChange={this.handleChange('arrival')} InputLabelProps={{ shrink: true }} InputProps={{ startAdornment: <InputAdornment position="start"><Today /></InputAdornment> }} /></Grid>
                        <Grid item style={{ flex: '1 1 50%', minWidth: '17em' }}><TextField label="Departure" name="departure" type="date" margin="normal" variant="outlined" fullWidth onChange={this.handleChange('departure')} InputLabelProps={{ shrink: true }} InputProps={{ startAdornment: <InputAdornment position="start"><Today /></InputAdornment> }} /></Grid>
                        <Grid item style={{ flex: '1 1 33.33%' }}><TextField label="Rating" select margin="normal" variant="outlined" fullWidth value={this.state.rating} onChange={this.handleChange('rating')}>
                            {this.ratings.map(({ value, label }) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                        </TextField></Grid>
                        <Grid item style={{ flex: '1 1 33.33%' }}><TextField label="Sort By" select margin="normal" variant="outlined" fullWidth value={this.state.sortBy} onChange={this.handleChange('sortBy')}>
                            {this.sortBy.map(({ value, label }) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                        </TextField></Grid>
                        <Grid item container justify="flex-end" style={{ flex: '1 1 33.33%' }}><Button color="primary" variant="contained" size="large">Search/Filter</Button></Grid>
                    </Grid>
                </Paper>
                {this.state.currentTrip && <Trip {...this.state.currentTrip} />}
                {this.state.tripList
                    .filter(this.filterTrip(this.state))
                    .map((el) => <Trip key={el.id} {...el} setCurrentTrip={this.setCurrentTrip.bind(this, el)} />)}
            </div>
            </>;
    }
};
