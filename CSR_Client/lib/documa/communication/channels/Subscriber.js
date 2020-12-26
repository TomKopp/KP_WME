Ext.namespace('Documa.communication.channels');

Documa.require('Documa.communication.channels.CommunicationPartner');

Documa.communication.channels.Subscriber = Ext.extend(Documa.communication.channels.CommunicationPartner, (function() {

	var validate = function(valueObj) {
		if (valueObj.cetype !== "operation")
			throw new Error("Invalid component interface element type. Expected operation element, but got {" + valueObj.cetype + "}");
	};

	return {
		constructor : function(valueObj) {
			Documa.communication.channels.Subscriber.superclass.constructor.call(this, valueObj);
			validate(valueObj);

			this._valueObj = valueObj;
		},

		getOperationName : function() {
			return this._valueObj.cename;
		}

	};
})()); 