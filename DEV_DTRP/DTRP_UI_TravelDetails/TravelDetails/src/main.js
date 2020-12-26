/* eslint-disable no-underscore-dangle */
import './main.css';
import App from './App';
import React from 'react';
import ReactDOM from 'react-dom';

window.TravelDetailsRender = function TravelDetailsRender(DocumaComponentsTravelDetails) {
    ReactDOM.render(
        <App travelDetails={DocumaComponentsTravelDetails} />
        , document.getElementById(DocumaComponentsTravelDetails._renderTargetId)
    );
};
