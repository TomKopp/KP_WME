Ext.namespace("Documa.communication.events");

Documa.require("Documa.util.Logger");
Documa.require("Documa.communication.events.ApplicationEvent");

/**
 * @class
 * @extends {Documa.communication.events.ApplicationEvent}
 */
Documa.communication.events.ApplicationLifecycleChangedEvent = Ext.extend(Documa.communication.events.ApplicationEvent, function() {
	const TAG = "Documa.communication.events.ApplicationLifecycleChangedEvent";
	const LOG = Documa.util.Logger;
	/////////////////////
	// private methods //
	/////////////////////
	
	
	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {Object|null} message
		 */
		constructor: function(message) {
			Documa.communication.events.ApplicationLifecycleChangedEvent.superclass.constructor.call(this, message);
		},
		
		/**
		 * Returns application's lifecycle state. Possible values: "creating", "starting", "pausing",
		 * "running", "closing".
		 *
		 * @returns {String}
		 */
		getState: function() {
			let payload = this.getPayload();
			return payload.state;
		},
		
		/**
		 * Returns application's substate of current lifecycle state, e. g. Interpreting or Integrating in case of
		 * lifecycle state STARTING.
		 *
		 * @returns {String}
		 */
		getSubstate: function() {
			let payload = this.getPayload();
			return payload.substate;
		}
	};
}());