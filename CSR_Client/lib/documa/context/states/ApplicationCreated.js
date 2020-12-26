Ext.namespace("Documa.context.states");

Documa.require("Documa.util.Logger");
Documa.require("Documa.util.Util");
Documa.require("Documa.context.states.ApplicationState");
Documa.require("Documa.collaboration.user.Participant");
Documa.require("Documa.recommendation.trigger.EnergyCriticalTrigger");

/**
 * @class
 * @extends {Documa.context.states.ApplicationState}
 */
Documa.context.states.ApplicationCreated = Ext.extend(Documa.context.states.ApplicationState, function() {
	const TAG = "Documa.context.states.ApplicationCreated";
	const _log = Documa.util.Logger;
	const _util = Documa.util.Util;
	
	/**
	 * @type {Documa.util.Util.test|Function}
	 */
	const test = Documa.util.Util.test;
	/////////////////////
	// private methods //
	/////////////////////
	
	/**
	 * Validates event structure.
	 *
	 * @param {Documa.communication.events.ApplicationEvent} createdEvent
	 */
	function validateEvent(createdEvent) {
		var payload = createdEvent.getPayload();
		test("jobid", payload);
		test("initr", payload);
		test("name", payload);
		test("cntrs", payload);
	}
	
	/**
	 * Helper method to create and send JOIN command to server-side.
	 *
	 * @param {Object} payload contains information about application to join
	 */
	function sendJoinCommand(payload) {
		_log.debug(TAG, "... sending JOINAPP command to server");
		// create startapp command object
		var joinAppCmd = this._cfactory.create(Documa.communication.MessageFieldValues.SYS_LEVEL,
			Documa.communication.commands.SystemCommands.JOINAPP, payload);
		
		// send command to server
		Documa.RuntimeManager.getCommunicationManager().sendSystemLevelMessage(joinAppCmd);
	}
	
	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {Documa.context.ApplicationContext} appcontext
		 */
		constructor: function(appcontext) {
			Documa.context.states.ApplicationCreated.superclass.constructor.call(this, appcontext);
		},
		
		/**
		 * Called after an application context was created.
		 * @param {Documa.communication.events.ApplicationEvent} createdEvent
		 */
		created: function(createdEvent) {
			validateEvent(createdEvent);
			var payload = createdEvent.getPayload();
			
			var app_instid = this._context.getValue(Documa.context.ApplicationContextAttributes.APP_INSTID);
			// get application parameter to identify the addressed application context
			if(app_instid === createdEvent.getApplicationInstanceId()) {
				// current event addresses the current application context
				var awarenessman = Documa.RuntimeManager.getAwarenessManager();
				// getting application's initiator metadata
				test("user", payload.initr);
				var participant = new Documa.collaboration.user.Participant(payload.initr.user, true);
				awarenessman.add(participant);
				participant.addApplication(this._context);
				this._context.put(Documa.context.ApplicationContextAttributes.APP_INITR, participant);
				
				
				// transition into the following application state
				this._context.setState(this._context.getStartingState());
				
				var uiman = Documa.RuntimeManager.getUIManager();
				// create binding between component manager and layout manager
				var componentManager = this._context.getComponentManager();
				var layoutManager = Documa.RuntimeManager.getUIManager().getLayoutManager();
				// create layout selection ui elements
				layoutManager.initializeLayoutSelectionElements();
				// define listening relation between layout manager and component manager
				// events, event handler function, scope of handler function
				componentManager.addListener(Documa.components.CompositionChangedEvents.ADDED, function(container) {
					setTimeout(function() {
						// adding panel of components to the homescreen
						var viewStack = layoutManager.getViewStack();
						// activate viewstack
						uiman.getCenterStage().getLayout().setActiveItem(uiman.getChildId(viewStack));
						layoutManager.onComponentAdded(container);
					}, 1000);
				}, this);
				componentManager.addListener(Documa.components.CompositionChangedEvents.REMOVED, layoutManager.onComponentRemoved, layoutManager);
				
				uiman.getMigrationManager().setApplicationContext(this._context);
				// of client side triggers
				let energyCriticalTrigger = new Documa.recommendation.trigger.EnergyCriticalTrigger();
				Documa.RuntimeManager.getTriggerManager().registerClientsideTrigger(this._context, energyCriticalTrigger);
			} else {
				throw new Error("Not implemented yet!");
			}
		},
		
		/**
		 * Called after a new device joins the application space.
		 * @param {Documa.communication.events.ApplicationEvent} joinEvent
		 */
		join: function(joinEvent) {
			try {
				if(!joinEvent) {
					// send application join request to the server-side
					this.requestJoin();
				} else {
					// calling method of superclass to add the joined client
					// to the current application context or to handle a join
					// response event
					this.handleJoinEvent(joinEvent);
				}
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		}
	};
}());