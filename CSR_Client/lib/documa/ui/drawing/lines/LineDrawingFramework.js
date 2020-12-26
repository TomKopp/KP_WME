Ext.namespace('Documa.ui.drawing.lines');

Documa.require('Documa.util.Logger');

/**
 * Represents an interface for line drawing frameworks
 *
 * @class Documa.ui.drawing.lines.LineDrawingFramework
 */
Documa.ui.drawing.lines.LineDrawingFramework = Ext.extend(Object, (function(){
	var TAG = 'Documa.ui.drawing.lines.LineDrawingFramework';
	var _log = Documa.util.Logger;

	return {

		/**
		 * Draws a line from the specified start to the end point.
		 * It is possible to specify the line color via the options parameter.
		 *
		 * @param {number} startX x-coordinate of the start point
		 * @param {number} startY y-coordinate of the start point
		 * @param {number} endX x-coordinate of the end point
		 * @param {number} endY y-coordinate of the end point
		 * @param {string} lineID Line identifier
		 * @param {object} options The options hash. At the moment it is possible to specify a line color.
		 */
		drawLine: function(startX, startY, endX, endY, lineID){
			throw new Error("Not implemented yet.");
		},

		/**
		 * Mouse handler used for click on drawn lines
		 *
		 * @param {object} clickOnLineHandler Handler that should be used.
		 */
		setClickOnLineHandler: function(clickOnLineHandler){
			throw new Error("Not implemented yet.");
		},

		/**
		 * Mouse handler used for hover over drawn lines
		 *
		 * @param {object} hoverOverLineHandler Handler that should be used.
		 */
		setHoverOverLineHandler: function(hoverOverLineHandler){
			throw new Error("Not implemented yet.");
		},

		/**
		 * Clear all lines
		 */
		reset: function(){
			throw new Error("Not implemented yet.");
		}
	};

})());
