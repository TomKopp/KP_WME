Ext.namespace('Documa.ui.views');

Documa.require('Documa.util.Logger');
Documa.require('Documa.ui.drawing.lines.LineDrawingFrameworkFactory');
Documa.require('Documa.ui.views.VisualConnection');

Documa.ui.views.VisualConnectionManager = Ext.extend(Object, (function() {

  //////////////////
  //  Attributes  //
  //////////////////

  var TAG = 'Documa.ui.views.VisualConnectionManager';
  var _log = Documa.util.Logger;

  // wrapper class for the used graphic framework
  var _lineDrawer = null;

  // This is the view that uses the connection manager
  var _view = null;

  // This hash contains all visible visual connections.
  var _visualConnections = {};

  /////////////////////////
  //  Private Functions  //
  /////////////////////////

  /**
   * Handels the click event for a line.
   */
  function clickOnLineHandler(e) {
    Documa.RuntimeManager.getUIManager().showConfirmationDialog("Do you really want to delete this connection?", function (choice) {
  	  if(choice == 'yes'){
         Documa.RuntimeManager.getUIManager().getActiveView().removeChannel(e.target.id);
      };
    });
  }

  /**
   * Initializes the line draweInitializes the line drawer.
   */
  function initializeLineDrawer( rootContainer ) {
    _lineDrawer = (new Documa.ui.drawing.lines.LineDrawingFrameworkFactory()).lineDrawingFrameworkFactoryMethod( rootContainer );
    _lineDrawer.setClickOnLineHandler(clickOnLineHandler);
  }

  /**
   * Retrieves the information provider for the start of the line
   *
   * @param {object} channel communication channel objectcommunication channel object.
   * @return {Documa.communication.channels.CommunicationPartner} The information provider for the start of the line
   */
  function getChannelSource( channel ) {
    switch(channel.getType()){
      case Documa.communication.channels.ChannelTypes.LINK: return channel.getPublisherList()[0]; break;
      case Documa.communication.channels.ChannelTypes.BACKLINK: return channel.getRequestorList()[0]; break;
      case Documa.communication.channels.ChannelTypes.PROPLINK: return channel.getParticipantList()[0]; break;
    }
  }

  /**
   * Retrieves the information provider for the end of the line
   *
   * @param {object} channel communication channel objectcommunication channel object.
   * @return {Documa.communication.channels.CommunicationPartner} The information provider for the end of the line
   */
  function getChannelTarget( channel ) {
    switch(channel.getType()){
      case Documa.communication.channels.ChannelTypes.LINK: return channel.getSubscriberList()[0];
      case Documa.communication.channels.ChannelTypes.BACKLINK: return channel.getReplierList()[0];
      case Documa.communication.channels.ChannelTypes.PROPLINK: return channel.getParticipantList()[1]; break;
    }
  }

  /**
   * Draw the specified line.
   *
   * @param {string} connectionID Specifies the line to be drawn.
   */
  function drawLine( connectionID ) {
    _visualConnections[connectionID].draw();
  }

  /**
   * Checks for hidden connection points.
   *
   * @param {boolean} name description
   * @return {boolean} true if none of the parents are hidden; otherwise false
   */
  function checkForHiddenConnectionPoint( startConnectionPoint, endConnectionPoint ) {
      if(jQuery(startConnectionPoint).parent().hasClass('hidden') ||
        jQuery(endConnectionPoint).parent().hasClass('hidden')){
        return false;
      }
      return true;
    }

  ////////////////////////
  //  Public Functions  //
  ////////////////////////

  return {

    /**
     * Initializes this instance.
     *
     * @param {object} rootContainer The root DOM container used for drawing.
     * @param {object} callerView A reference to the source view object.
     */
    constructor : function ( rootContainer, callerView ) {
      this._view = callerView;
      initializeLineDrawer( rootContainer );
    },

    /**
     * Draw the specified channels.
     *
     * @param {object} channels Channels to be drawn
     *
     */
    drawChannels: function (channels) {
      for (var index in channels) {
        this.drawChannel(channels[index]);
      }
    },

    /**
     * Draw the specified channel.
     *
     * @param {object} channel Channel to be drawn
     *
     */
    drawChannel: function (channel) {
      var startConnectionPoint = null;
      var endConnectionPoint = null;

      var startConnectionPoint_instid;
      var startConnectionPoint_cename;

      var endConnectionPoint_instid;
      var endConnectionPoint_cename;


      // Try to retrieve all necessary connection data
      try {
        // Retrieve data for the start point
        channelSource = getChannelSource(channel);
        startConnectionPoint_instid = channelSource._valueObj.instid;
        startConnectionPoint_cename = channelSource._valueObj.cename;
        startConnectionPoint = this._view.getConnectionPoint( startConnectionPoint_instid, startConnectionPoint_cename, channelSource._valueObj.cetype);

        // Retrieve data for the end point
        channelTarget = getChannelTarget(channel);
        endConnectionPoint_instid = channelTarget._valueObj.instid;
        endConnectionPoint_cename = channelTarget._valueObj.cename;
        endConnectionPoint = this._view.getConnectionPoint( endConnectionPoint_instid, endConnectionPoint_cename, channelTarget._valueObj.cetype);

      } catch (e) {
        console.log('Connectiontype is not supported yet.');
        return;
      }

      // Create the unique connection id used to identify the visual connection.
      var connectionID = channel.getName();
      var visualConnection = new Documa.ui.views.VisualConnection(connectionID, channel.getType(), startConnectionPoint, endConnectionPoint, _lineDrawer);

      // Store the visual connection and draw it.
      _visualConnections[connectionID] = visualConnection;
      drawLine(connectionID);

    },

    /**
     * Removes the line with the specified id.
     *
     * @param {string} connectionID Specifies the line to be removed.
     */
    removeLine: function ( connectionID ) {
      // removes the graphical channel
      _visualConnections[connectionID].remove();
      delete _visualConnections[connectionID];
    },

    /**
     * Resets all lines and the line drawer.
     */
    reset: function () {
      _visualConnections = {};
      _lineDrawer.reset();
    },

    /*
     * Updates the existing visual connections.
     */
    update: function () {
      _lineDrawer.reset();

      // redraw all exiting connections
      for (var index in _visualConnections) {
        drawLine(index);
      }
    },

  };

})());
