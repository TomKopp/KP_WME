Ext.namespace('Documa.communication.channels');

Documa.require('Documa.communication.channels.CommunicationPartner');

Documa.communication.channels.Publisher = Ext.extend(Documa.communication.channels.CommunicationPartner, (function() {

	var validate = function(valueObj) {
		if (valueObj.cetype !== "event")
			throw new Error("Invalid component interface element type defined! Expected event, got {" + valueObj.cetype + "}");
	};

	return {
		constructor : function(valueObj) {
			Documa.communication.channels.Publisher.superclass.constructor.call(this, valueObj);
			validate(valueObj);

			this._valueObj = valueObj;
		},

		getEventName : function() {
			return this._valueObj.cename;
		}

	};
})()); 