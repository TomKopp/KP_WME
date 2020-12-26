Ext.namespace('Documa.communication.channels');

Documa.require('Documa.communication.channels.CommunicationPartner');

Documa.communication.channels.Constants = {
	SET_PROPERTY_OPERATION : "setProperty"
};

Documa.communication.channels.Participant = Ext.extend(Documa.communication.channels.CommunicationPartner, (function() {

	var validate = function(valueObj) {
		if (valueObj.cetype !== "property")
			throw new Error("Invalid component interface element! Expected property, got {" + valueObj.cetype + "}");

		if (valueObj.chngev == undefined || valueObj.chngev == null)
			throw new Error("Invalid change event!");
	};

	return {
		constructor : function(valueObj) {
			Documa.communication.channels.Participant.superclass.constructor.call(this, valueObj);
			validate(valueObj);

			this._valueObj = valueObj;
		},

		getPropertyName : function() {
			return this._valueObj.cename;
		},

		getOperationName : function() {
			return Documa.communication.channels.Constants.SET_PROPERTY_OPERATION;
		},

		getEventName : function() {
			return this._valueObj.chngev;
		}

	};
})());
