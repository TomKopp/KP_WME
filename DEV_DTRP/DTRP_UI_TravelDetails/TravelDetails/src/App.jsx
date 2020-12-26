/* eslint-disable no-mixed-operators */
import { AppBar, CssBaseline, Toolbar, Typography } from '@material-ui/core';
import React, { Component } from 'react';
import Trip from './Trip';
import TripSection from './TripSection';

export default class App extends Component {
    constructor(props) {
        super(props);

        this.travelDetails = props.travelDetails;
        document.addEventListener('onUpdateTripSections', ({ detail: trip }) => this.onUpdateTripSections(trip));

        this.state = {
            trip: props.trip
        };
    }

    get title() {
        return this.state.trip && this.state.trip.title || 'No Trip Selected';
    }
    get sectionsList() {
        return this.state.trip && this.state.trip.sections || [];
    }

    updateTrip(trip) {
        this.setState({ trip });
        document.dispatchEvent(new CustomEvent('updateTripSections', { detail: trip }));
    }

    onUpdateTripSections(trip) {
        this.setState({ trip });
    }

    render() {
        return <>
            <CssBaseline />
            <AppBar position="static">
                <Toolbar>
                    <Typography component="h1" variant="h6" color="inherit">{this.title}</Typography>
                </Toolbar>
            </AppBar>
            <div style={{ padding: '16px', maxWidth: '1050px', margin: 'auto' }}>
                {!this.state.trip && <Typography variant="h3" color="inherit">{this.title}</Typography>}
                {/* eslint-disable-next-line no-magic-numbers */}
                {this.sectionsList.length > 1 && <Trip {...this.state.trip} />}
                {this.sectionsList.map((el) => <TripSection key={el.id} {...el} />)}
            </div>
            </>;
    }
};
