Ext.namespace('Documa.ui.views');

Documa.require('Documa.util.Logger');

/**
 * Represents an abstract representation of a visual connection between components.
 *
 * @class Documa.ui.views.VisualConnection
 */
Documa.ui.views.VisualConnection = Ext.extend(Object, (function() {

  //////////////////
  //  Attributes  //
  //////////////////

  // UI Manager to access helper functions
  var _uiManager = null;

  // This connection point marks the start of the line
  var _startConnectionPoint = null;

  // This connection point marks the end of the line
  var _endConnectionPoint = null;

  // wrapper class for the used graphic framework
  var _lineDrawer = null;

  // graphical line object
  var _drawnLine = null;

  // This id is used to mark the drawn line
  var _id = null;

  // Describes the connection type: Link, Backlink, PropertyLink
  var _type = null;

  // Store a reference to the communication channel object
  var _communicationChannel = null;

  /////////////////////////
  //  Private Functions  //
  /////////////////////////


  ////////////////////////
  //  Public Functions  //
  ////////////////////////A

  return {

    /**
     * Initializes a VisualConnection.
     *
     * @param {string} id Identifier used to mark the drawn line
     * @param {string} type Describes the connection type: Link, Backlink, PropertyLink
     * @param {object} startConnectionPoint This connection point marks the start of the line.
     * @param {object} endConnectionPoint This connection point marks the end of the line.
     * @param {object} lineDrawer Line drawing frame work used to draw the lines.
     *
     * @throw {Error} Throws an error if one of the connection points is missing.
     */
    constructor : function ( id, type, startConnectionPoint, endConnectionPoint, lineDrawer ) {
      // Ensure that there are a start and an end point
      if (startConnectionPoint == undefined || startConnectionPoint == null) {
        throw new Error("The start connection point must be defined.");
      }

      if (endConnectionPoint == undefined || endConnectionPoint == null) {
        throw new Error("The end connection point must be defined.");
      }

      _uiManager = Documa.RuntimeManager.getUIManager();

      _startConnectionPoint = startConnectionPoint;
      _endConnectionPoint = endConnectionPoint;
      _lineDrawer = lineDrawer;
      _id = id;
      _type = type;
    },

    /**
     * Returns the DOM element of the start connection point
     *
     * @return {object} Start connection point
     */
    getStartConnectionPoint: function ( ) {
      return _startConnectionPoint;
    },

    /**
     * Returns the DOM element of the end connection point
     *
     * @return {object} End connection point
     */
    getEndConnectionPoint: function ( ) {
      return _endConnectionPoint;
    },

    /**
     * Returns the coordinates of the start point.
     *
     * @return {object} Return an hash with the following keys: x ,y
     */
    getStartPoint: function ( ) {
      return {x: _uiManager.findPosX(_startConnectionPoint) + jQuery(_startConnectionPoint).width(), y: _uiManager.findPosY(_startConnectionPoint)};
    },

    /**
     * Returns the coordinates of the end point.
     *
     * @return {object} Return an hash with the following keys: x ,y
     */
    getEndPoint: function ( ) {
      return {x: _uiManager.findPosX(_endConnectionPoint), y: _uiManager.findPosY(_endConnectionPoint)};
    },

    /**
     * Returns the id of this connection.
     */
    getID: function ( ) {
      return _id;
    },

    /**
     * Sets the communication channel for this visual connection.
     *
     * @param {object} communicationChannel The used communication channel.
     */
    setCommunicationChannel: function ( communicationChannel ) {
      _communicationChannel = communicationChannel;
    },

    /**
     * Gets the communication channel for this visual connection.
     *
     * @return {object} communicationChannel The used communication channel.
     */
    getCommunicationChannel: function () {
      return _communicationChannel;
    },

    /**
     * Draws the connection.
     */
    draw: function () {
      var start = this.getStartPoint();
      var end   = this.getEndPoint();
      _drawnLine = _lineDrawer.drawLine(start.x, start.y, end.x, end.y, this.getID(), this.getDrawingOptions());
    },

    /**
     * Return the drawing options as hash. (e.g. color)
     */
    getDrawingOptions: function () {
      var options = {};

      switch(_type){
        case Documa.communication.channels.ChannelTypes.LINK:
          options['color'] = '#FFFFFF';
          break;
        case Documa.communication.channels.ChannelTypes.BACKLINK:
          options['color'] = '#e59400';
          break;
        case Documa.communication.channels.ChannelTypes.PROPLINK:
          options['color'] = '#558cff';
          break;
      }

      return options;
    },

    /**
     * Removes this connection.
     *
     */
    remove: function () {
      if (_drawnLine != null) {
        _drawnLine.remove();
      }
    },

  };

})());
