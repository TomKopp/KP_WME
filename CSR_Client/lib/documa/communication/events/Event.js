Ext.namespace('Documa.communication.events');

Documa.require('Documa.communication.Message');

/**
 * This class represents an event message object that is exchanged between the
 * web- and the native layer of the client side runtime environment. The
 * structure of this class MUST be the same like in the native layer.
 *
 * @class
 * @extends {Documa.communication.Message}
 */
Documa.communication.events.Event = Ext.extend(Documa.communication.Message, (function() {
	return {
		/**
		 * @constructs
		 * @param {Object} data
		 */
		constructor : function(data) {
			Documa.communication.events.Event.superclass.constructor.call(this, data);
		}
	};
})());
