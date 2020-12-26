Ext.namespace('Documa.communication.events');

Documa.require('Documa.communication.events.ApplicationEvent');

Documa.communication.events.ApplicationErrorEvent = Ext.extend(Documa.communication.events.ApplicationEvent, (function(){
	
	function validatePayload(payload){
		if(!payload.edescr) throw new Error("No error description in payload defined!");
	}
	
	return {
		constructor : function(message) {
			Documa.communication.events.ApplicationErrorEvent.superclass.constructor.call(this, message);
			var payload = this.getPayload();
			validatePayload(payload);
		},
		/**
		 * Returns error description from server-side error message.
		 * 
		 * @returns {String} 
		 */
		getDescription : function() {
			return this.getPayload().edescr;
		}
	};
})());
