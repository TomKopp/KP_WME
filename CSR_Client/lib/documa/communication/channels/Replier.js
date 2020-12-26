Ext.namespace('Documa.communication.channels');

Documa.require('Documa.communication.channels.Subscriber');

Documa.communication.channels.Replier = Ext.extend(Documa.communication.channels.Subscriber, (function() {

	var validate = function(valueObj) {
		if (valueObj.retev == undefined || valueObj.retev == null)
			throw new Error("No return event defined!");
	};

	return {
		constructor : function(valueObj) {
			Documa.communication.channels.Replier.superclass.constructor.call(this, valueObj);
			validate(valueObj);

			this._valueObj = valueObj;
		},

		getReturnEvent : function() {
			return this._valueObj.retev;
		}
	};
})()); 