Ext.namespace('Documa.ui.views');
Documa.require('Documa.RuntimeManager');
Documa.require('Documa.communication.events.EventDispatcher');
Documa.require('Documa.util.Logger');

/**
 * This class is the base class for view that are using component overlays.
 */
Documa.ui.views.BaseView = Ext.extend(Object, (function(){

	//////////////////
	//  Attributes  //
	//////////////////

	var TAG = 'Documa.ui.views.BaseView';
	var _log = Documa.util.Logger;


	var _this = null;

	// Handles recommendation events
	var _eventDispatcher = null;

	// Handles the overlay logic
	var _eventBroker = null;
	var _metaView = null;

	// Provides access to general UI logic
	var _uiManager = null;

	// Reference to the component manager
	var _componentManager = null;

	// Provides line drawing logic
	var _connectionManager = null;

	// Store LayoutManager to get access to the component positions
	var _layoutManager = null;

	//string of subview of baseview (reference to uimanager)
	var _currentSubView = null;

	/////////////////////////
	//  Private Functions  //
	/////////////////////////

	/**
	 * Lazy getter for the connection manager.
	 *
	 * @return {Documa.ui.views.VisualConnectionManager} Instance of the visual connection manager.
	 * @throws Error If the root container is not initialized yet.
	 */
	function getConnectionManager(){
		if (_connectionManager == undefined || _connectionManager == null) {
			var metaViewContainer = _metaView.getMetaViewContainer();

			// Ensure that there is a container to paint on.
			if (metaViewContainer == null) {
				throw new Error("There is no root container to paint on yet.");
			}

			_connectionManager = new Documa.ui.views.VisualConnectionManager(metaViewContainer, _this);
		}

		return _connectionManager;
	}

	/**
	 * Lazy getter for the component manager.
	 *
	 * @return {Documa.components.ComponentManager} Instance of the component manager.
	 */
	function getComponentManager(){
		if (_componentManager == null || _componentManager == undefined) {
			_componentManager = Documa.RuntimeManager.getComponentManager();
		}
		return _componentManager;
	}

	////////////////////////
	//  Public Functions  //
	////////////////////////

	return {

		/**
		 * Constructs this instance.
		 *
		 * @param {Documa.ui.layout.LayoutManager} layoutManager LayoutManager used for organising overlays.
		 * @param {object} currentSubView Instance of the current sub view
		 */
		constructor: function(layoutManager, currentSubView){
			_layoutManager = layoutManager;
			_metaView = new Documa.ui.views.MetaView(layoutManager);
			_uiManager = Documa.RuntimeManager.getUIManager();
			_currentSubView = currentSubView;
			_this = this;

			_eventDispatcher = Documa.RuntimeManager.getEventDispatcher();
			_eventDispatcher.addEventListener("recommendationFound", this, this.receiveRecommendation);
			_eventBroker = Documa.RuntimeManager.getEventBroker();
		},
		
		/**
		 * Can be used to separate the initialization of a view from its construction
		 */
		initialize: function(){
			//do specific init impl here
		},

		/**
		 * Display this view.
		 */
		show: function(){
			if (_metaView) {
				_metaView.show();
			}
		},

		/**
		 * Updates the BaseView.
		 */
		updateView: function(){
			this.closeView();
			Documa.RuntimeManager.getUIManager().setAndShowActiveView(_currentSubView);
		},

		/**
		 * Draw the visual connections for all channels provides by the EventBroker.
		 *
		 * @see "Documa.communication.EventBroker"
		 */
		drawChannels: function(){
			var channels = Documa.RuntimeManager.getEventBroker().getChannels();
			getConnectionManager().drawChannels(channels);
		},

		/**
		 * Returns the DOM element of the specified connection point. Has to be overriden in the subclasses.
		 *
		 * @param componentInstanceID The instance id of the component owning the connection point.
		 * @param attributeName Name of the property or capability (example: locationSelected)
		 * @param connectionPointType The type of the connection point. Is it a event, an operation or a property?
		 */
		getConnectionPoint: function(componentInstanceID, attributeName, connectionPointType){
			throw new Error("Implement in subview.");
		},

		/**
		 * Close or hide view.
		 */
		closeView: function(){
			if (_metaView) {
				_metaView.closeView();
			}

			_connectionManager = null;
		},

		/**
		 * Clears all visual connections.
		 */
		resetVisualConnections: function(){
			if (_connectionManager) {
				_connectionManager.reset();
			}
		},

		/**
		 * Add a new visual connection the view.
		 * @param {Object} channel The communication channel the should be added to the view
		 */
		addVisualConnection: function(channel){
			this.resetVisualConnections();
			this.drawChannels();
		},

		/**
		 * Remove a new visual connection the view.
		 * @param {String} ID of the Channel that should be removed from the view.
		 */
		removeVisualConnection: function(connectionID){
			this.resetVisualConnections();
			this.drawChannels();
		},

		/**
		 * function to request a recommendation if connection point is clicked
		 *
		 * connectionPoint: JSON Object der Form
		 * payload :{
		 *	 event: String (Eventtype for EventDispatcher)
		 *	 subClass: String (for recommendation)
		 *   cid : String (Component ID)
		 *   type : String (Capability/Property/Event/Operation)
		 *   name : String (if Property/Event/Operation else empty)
		 *   id : String (if Capability else empty)
		 * }
		 *
		 * @param connectionPoint JSON Object with cpID, cid, type, name und id
		 */
		requestRecommendation: function(connectionPoint){
			var payload = {};
			var msg = new Documa.communication.events.Event();

			payload['event'] = "capabilitySelected";
			payload['subClass'] = "CapSelection";
			payload['cid'] = connectionPoint.cid;
			payload['type'] = connectionPoint.type;
			payload['name'] = connectionPoint.name;
			payload['id'] = connectionPoint.id;
			msg.setPayload(payload);
			msg.setMessageTag("capabilitySelected");

			_eventDispatcher.dispatchEvent(msg);
		},

		/**
		 * Receiving object with recommended connection points as JSON Object
		 *
		 * connectionPoints:
		 *     cpid:{
		 *       recCpID: { (recommended connection point)
		 *         cid : String (Component ID)
		 *         type : String (Capability/Property/Event/Operation)
		 *         name : String (if Property/Event/Operation else empty)
		 *         id : String (if Capability else empty)
		 *       }
		 *       recCpID2: { ...} (another recommended connection point)
		 *     }
		 *   }
		 */
		receiveRecommendation: function(recommendationObject){
			//Logic to extract data from JSON
			var payloadExtract = recommendationObject['payload'];
			Documa.RuntimeManager.getUIManager().getActiveView().handleRecommendation(payloadExtract);
		},

		/**
		 * Function to minimize the abstract component. gets called after click-event from minimize button.
		 *
		 * @param cid id component
		 */
		minimizeComponent: function(instanceID){
			// change css layout of component, where sub-elements get hidden and abstract component gets resized
			getComponentManager().minimizeComponent(instanceID);
		},


		/**
		 * Removes the specified component overlay.
		 *
		 * @param {String} instanceID Identifier of the component to be removed.
		 * @return {boolean} Returns true if the component could be removed; otherwise false.
		 */
		removeComponent: function(instanceID){

			//check if the removed Component is a Service Component
			var componentId = this.getComponentId(instanceID);
			if (!getComponentManager().isUIC(componentId)) {
				var serviceComponentPanel = _uiManager.getServiceComponentPanel();
				serviceComponentPanel.removeServiceComponentFromStore(instanceID);
			}
			;

			// Where will the component be removed from the DOM?
			getComponentManager().removeComponent(instanceID, componentId, true);

			// Remove component overlay
			var successfulOverlayRemove = _metaView.removeComponentOverlay(instanceID);

			this.updateView();

			return successfulOverlayRemove;
		},

		/**
		 * Creates a new channel between the specified connection points.
		 * @param connectionPoint1 The Sender ConnectionPoint
		 * @param connectionPoint2 The Receiver ConnectionPoint
		 */
		createChannel: function(connectionPoint1, connectionPoint2){
			// TODO Maybe change the parameters of this function to these arrays.
			var sender = [connectionPoint1];
			var receiver = [connectionPoint2];
			
			// TODO Get the channel type from somewhere else.
			var channelType = Documa.communication.channels.ChannelTypes.LINK;
			
			_eventBroker.createChannel(sender, receiver, channelType);
		},

		/**
		 * Removes the specified communication channel.
		 * @param channelName The name of the channel, that should be removed
		 */
		removeChannel: function(channelName){
			_eventBroker.removeChannel(channelName, true);
			getConnectionManager().removeLine(channelName);
		},

		/**
		 * Function to update Channels
		 */
		updateChannels: function(){
			this.resetVisualConnections();
			this.drawChannels();
		},


		/**
		 * Method for passing connection point data to create a channel between two connection points
		 * @param connectionPoint
		 * @param connectionPoint2
		 */
		initializeChannelCreation: function(connectionPoint1, connectionPoint2){
			// works for combination (op,ev)=>(ev,op) and (op,prop)=>(prop,op)
			if (connectionPoint1.type == 'operation') {
				this.createChannel(connectionPoint2, connectionPoint1);
			}
			// works for combination (ev,op) and (ev,prop)
			else if (connectionPoint1.type == 'event') {
				this.createChannel(connectionPoint1, connectionPoint2);
			}
			// works for (prop,ev)=>(ev,prop)
			else if (connectionPoint2.type == 'event') {
				this.createChannel(connectionPoint2, connectionPoint1);
			}
			// works for (prop,prop) and (prop,op)
			else if (connectionPoint1.type == 'property') {
				this.createChannel(connectionPoint1, connectionPoint2);
			}
			// otherwise throw error
			else {
				throw new Error("Channel initialization failed! Connection points have wrong or missing types.");
			}
		},

		/**
		 * Show confirmation dialog.
		 *
		 * @see "Documa.ui.UIManager"
		 */
		showConfirmationDialog: function(msg, callback){		
			_uiManager.showConfirmationDialog(msg, callback);
		},

		/**
		 * Returns an instance of the MetaView.
		 * @return {Documa.ui.views.MetaView} The MetaView
		 */
		getMetaView: function(){
			return _metaView;
		},

		/**
		 * Returns the component id for the specified instance.
		 *
		 * @return {string} Component ID
		 */
		getComponentId: function(instanceID){
			var componentId = getComponentManager().getCid(instanceID);
			return componentId;
		},
	};

})());
