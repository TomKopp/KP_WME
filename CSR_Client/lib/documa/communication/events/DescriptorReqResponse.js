Ext.namespace("Documa.communication.events");

Documa.require("Documa.util.Logger");

Documa.communication.events.DescriptorReqResponse = Ext.extend(Object, (function() {

	function validate(payload) {
		if (!payload.reqtime)
			throw new Error("Invalid request timestamp in respone message!");
		if (!payload.smcdls && !(payload.smcdls instanceof Array))
			throw new Error("No valid set of component descriptors found!");
	}

	return {
		constructor : function(payload) {
			Documa.communication.events.DescriptorReqResponse.superclass.constructor.call(this);
			validate.call(this, payload);
			this._reqtime = payload.reqtime;
			this._descriptors = payload.smcdls;
		},

		/**
		 * Returns timestamp of previous descriptor request.
		 *
		 * @return {Number} request timestamp as number
		 */
		getRequestTimestamp : function() {
			return this._reqtime;
		},

		/**
		 * Returns string array of component descriptors.
		 *
		 * @return {Array} array of component descriptors each formatted as string
		 */
		getDescriptorItems : function() {
			return this._descriptors;
		}

	};
})());
