Ext.namespace('Documa.context.states');

Documa.require('Documa.util.Logger');
Documa.require('Documa.util.Util');
Documa.require('Documa.context.states.ApplicationState');

/**
 * @class
 */
Documa.context.states.ApplicationRunning = Ext.extend(Documa.context.states.ApplicationState, (function(){
	var TAG = "Documa.context.states.ApplicationRunning";
	var _log = Documa.util.Logger;
	return {
		/**
		 * @constructs
		 * @param {Documa.context.ApplicationContext} appContext
		 */
		constructor: function(appContext){
			Documa.context.states.ApplicationRunning.superclass.constructor.call(this, appContext);
		},

		/**
		 * @param {Documa.communication.events.ApplicationEvent} startEvent
		 */
		start: function(startEvent){
			_log.debug(TAG, "... calling start");
			throw new Error("Not implemented yet!");
		},

		/**
		 * @param {Documa.communication.events.ApplicationEvent} runEvent
		 */
		run: function(runEvent){
			_log.debug(TAG, "... calling run");

			// create binding between component manager and layout manager
			var componentManager = this._context.getComponentManager();
			var layoutManager = Documa.RuntimeManager.getUIManager().getLayoutManager();

			// define listening relation between layout manager and component manager
			// events, event handler function, scope of handler function
			componentManager.addListener(Documa.components.CompositionChangedEvents.ADDED, layoutManager.onComponentAdded, layoutManager);
			componentManager.addListener(Documa.components.CompositionChangedEvents.REMOVED, layoutManager.onComponentRemoved, layoutManager);
		},

		/**
		 * @param {Documa.communication.events.ApplicationEvent} closeEvent
		 */
		close: function(closeEvent){
			_log.debug(TAG, "... calling close");
			//throw new Error("Not implemented yet!");

			var componentManager = this._context.getComponentManager();
			var layoutManager = Documa.RuntimeManager.getUIManager().getLayoutManager();

			// dissolve binding between component- and layout manager
			componentManager.removeListener(Documa.components.CompositionChangedEvents.ADDED, layoutManager.onComponentAdded, layoutManager);
			componentManager.removeListener(Documa.components.CompositionChangedEvents.REMOVED, layoutManager.onComponentAdded, layoutManager);
		},

		/**
		 * @param {Documa.communication.events.ApplicationEvent} pauseEvent
		 */
		pause: function(pauseEvent){
			_log.debug(TAG, "... calling pause");
			throw new Error("Not implemented yet!");
		},

		/**
		 * @param {Documa.communication.events.ApplicationEvent} joinEvent
		 */
		join: function(joinEvent){
			_log.debug(TAG, "... calling join");
			if (joinEvent) {
				var initiator = this._context.getValue(Documa.context.ApplicationContextAttributes.APP_INITR);
				if (!initiator) {
					var util = Documa.util.EventUtil;
					var payload = joinEvent.payload;
					var distman = this._context.getDistributionManager();
					var sid = Documa.RuntimeManager.getCommunicationManager().getClientID();
					if (!payload)
						throw new Error("No payload in join event defined!");

					var appinitiator = util.getInitiatorFromJoinPayload(payload);
					// adding application's owner to awareness buddy list
					var awareman = Documa.RuntimeManager.getAwarenessManager();
					awareman.add(appinitiator);
					//awareman.getView().getBuddyList().show();
					// save application's initiator as context information
					this._context.put(Documa.context.ApplicationContextAttributes.APP_INITR, appinitiator);
					// getting device descriptor from event payload
					util.getInitiatorDeviceFromJoinPayload(payload).then(function(initdevice){
						// add owner device to distribution manager
						distman.addDevice(initdevice, (sid === appinitiator.getSessionId()));
					});
				}
				// join event triggered from server-side runtime environment
				this.handleJoinEvent(joinEvent);
			} else {
				throw new Error("Empty join event detected during appliation's running state!");
			}
		},

		leave: function(leaveEvent){
			_log.debug(TAG, "... calling leave");
			throw new Error("Leave method not implemented!");
		},

		/**
		 * Called after a distribution state update was requested.
		 * @param {Documa.communication.events.ApplicationEvent} updateEvent
		 */
		updateDistribution: function(updateEvent){
			_log.debug(TAG, "... updating local distribution overview!");
			// event contains distribution state calculated during the starting phase
			var payload = updateEvent.getPayload();

			// getting array of distribution instances (each is from type Documa.distribution.Distribution)
			var distributions = Documa.util.Util.getDistributions(payload);

			// updating changed distribution set
			this._context.getDistributionManager().updateDistributions(distributions);
		},

		addComponent: function(addEvent){
			throw new Error("Add component method not implemented!");
		},

		removeComponent: function(removeEvent){
			throw new Error("Remove component method not implemented!");
		}

	};
})());
