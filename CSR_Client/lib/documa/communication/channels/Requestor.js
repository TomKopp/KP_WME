Ext.namespace('Documa.communication.channels');

Documa.require('Documa.communication.channels.Publisher');

Documa.communication.channels.Requestor = Ext.extend(Documa.communication.channels.Publisher, (function() {

	var validate = function(valueObj) {
		if (valueObj.clbop == undefined || valueObj.clbop == null)
			throw new Error("Invalid callback operation defined!");
	};

	return {
		constructor : function(valueObj) {
			Documa.communication.channels.Requestor.superclass.constructor.call(this, valueObj);
			validate(valueObj);

			this._valueObj = valueObj;
		},

		getCallbackOperation : function() {
			return this._valueObj.clbop;
		}

	};
})()); 