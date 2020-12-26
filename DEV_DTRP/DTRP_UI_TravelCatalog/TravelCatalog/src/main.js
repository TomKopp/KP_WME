/* eslint-disable no-underscore-dangle */
import './main.css';
import App from './App';
import React from 'react';
import ReactDOM from 'react-dom';
import Trips from 'tripslist';

window.TravelCatalogRender = function TravelCatalogRender(DocumaComponentsTravelCatalog) {

    ReactDOM.render(
        <App travelCatalog={DocumaComponentsTravelCatalog} tripList={Trips} />
        , document.getElementById(DocumaComponentsTravelCatalog._renderTargetId)
    );
};
