Ext.namespace('Documa.ui.drawing.lines');

Documa.require('Documa.util.Logger');
Documa.require('Documa.ui.drawing.lines.LineDrawingFramework');

/**
 * This class is a wrapper for the RaphaelJS Framework.
 *
 * @class Documa.ui.drawing.lines.RaphaelFramework
 */
Documa.ui.drawing.lines.RaphaelFramework = Ext.extend(Documa.ui.drawing.lines.LineDrawingFramework, (function(){

	//////////////////
	//  Attributes  //
	//////////////////
	
	var TAG = 'Documa.ui.drawing.lines.RaphaelFramework';
	var _log = Documa.util.Logger;
	var _superClass = null;

	// The paper uses to hold the svg graphics.
	var _paper = null;

	// Handels the click event for drawn paths.
	var _clickOnLineHandler = null;

	// Handels the hover event for drawn paths.
	var _clickOnHoverHandler = null;

	/////////////////////////
	//  Private Functions  //
	/////////////////////////

	/**
	 * Handels the mouse over event for a line.
	 */
	function handleMouseOver(line, paper){
		// image used for hover effect
		var pathToBinImage = "http://127.0.0.1:8020/CSR_Desktop_Client/res/img/binChannels.png";
		var img = paper.image(pathToBinImage, 0, 0, 20, 20);
		img.hide();

		var hoverIn = function(event){
			line.attr({"stroke": 'red'});

			var mouseX = event.pageX - jQuery(document).scrollLeft() - jQuery('#metaview').offset().left + 10;
			var mouseY = event.pageY - jQuery(document).scrollTop() - jQuery('#metaview').offset().top;

			img.attr({"x": mouseX, "y": mouseY});
			img.show();
		};

		var hoverOut = function(){
			line.attr({"stroke": '#FFFFFF'});
			img.hide();
		};

		line.hover(hoverIn, hoverOut, line, line);
	}

	////////////////////////
	//  Public Functions  //
	////////////////////////

	return {

		constructor: function(rootContainer, width, height){
			// Reference super class
			_superClass = Documa.ui.drawing.lines.RaphaelFramework.superclass;
			_superClass.constructor.call(this);

			_paper = new Raphael(rootContainer, width, height);
		},

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
		drawLine: function(startX, startY, endX, endY, lineID, options){
			var color = options['color'] || '#FFFFFF';
			var line = _paper.path(["M", startX, startY, "L", endX, endY]).attr({"stroke-width": 5}).attr({"stroke": color}).attr({"arrow-end": 'block-midium-middle'});
			line.node.id = lineID;

			handleMouseOver(line, _paper);

			if (this._clickOnLineHandler) {
				line.mouseup(this._clickOnLineHandler);
			}

			return line;
		},

		/**
		 * Mouse handler used for click on drawn lines
		 *
		 * @param {object} clickOnLineHandler Handler that should be used.
		 */
		setClickOnLineHandler: function(clickOnLineHandler){
			this._clickOnLineHandler = clickOnLineHandler;
		},

		/**
		 * Mouse handler used for hover over drawn lines
		 *
		 * @param {object} hoverOverLineHandler Handler that should be used.
		 */
		setHoverOverLineHandler: function(hoverOverLineHandler){
			this._clickOnHoverHandler = clickOnHoverHandler;
		},

		/**
		 * Clear all lines
		 */
		reset: function(){
			_paper.clear();
		},

	};

})());
