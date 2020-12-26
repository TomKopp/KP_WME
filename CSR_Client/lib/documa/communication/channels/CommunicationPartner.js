Ext.namespace('Documa.communication.channels');

Documa.communication.channels.CommunicationPartner = Ext.extend(Object, (function() {

	var validate = function(valueObj) {
		if (!valueObj.cename)
			throw new Error("No component interface element name defined!");

		if (!valueObj.cetype)
			throw new Error("Invalid component interface element type.");

		if (!valueObj.cid)
			throw new Error("Invalid component identifier!");

		if (!valueObj.instid)
			throw new Error("Invalid component instance identifier!");
	};

	return {
		constructor : function(valueObj) {
			Documa.communication.channels.CommunicationPartner.superclass.constructor.call(this);
			validate(valueObj);

			this._valueObj = valueObj;
		},

		getComponentId : function() {
			return this._valueObj.cid;
		},

		getInstanceId : function() {
			return this._valueObj.instid;
		}

	};
})());
