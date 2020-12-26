Ext.namespace("Documa.communication.events");

Documa.require("Documa.util.Logger");
Documa.require("Documa.communication.events.SystemEvent");

/**
 * @class
 * @extends {Documa.communication.events.SystemEvent}
 */
Documa.communication.events.ContextEvent = Ext.extend(Documa.communication.events.SystemEvent, function() {
	const TAG = "Documa.communication.events.ContextEvent";
	const LOG = Documa.util.Logger;
	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @param {Documa.components.ComponentMessage} cmsg
		 * @constructs
		 */
		constructor: function(cmsg) {
			Documa.communication.events.ContextEvent.superclass.constructor.call(this, null);
			this.setMessageTag(Documa.communication.events.SystemEvents.CONTEXT_CHANGED);
			this.setPayload({message: cmsg});
			this.setTimestamp(new Date().getTime());
		},
		
		/**
		 * Returns the context change as component message.
		 * @return {Documa.components.ComponentMessage}
		 */
		getContextChange: function() {
			return this.getPayload().message;
		},
		
		/**
		 * Returns description of causing context event.
		 * @returns {String}
		 */
		getDescription: function() {
			return this.getContextChange().getDescription();
		}
	};
}());