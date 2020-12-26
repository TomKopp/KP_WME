Ext.namespace("Documa.communication.protocol");

Documa.require("Documa.util.Logger");

Documa.communication.protocol.RuntimeRequest = Ext.extend(Object, (function() {
	/**
	 * Validates structure of request message. Following structure is expected:
	 * {
	 * 		id : appid,
	 *		version : appversion,
	 *		instid : appinstid,
	 * 		action: <string>,
	 * 		params: {
	 * 			<string>:{...},
	 * 			<string>:{...}
	 * 		},
	 * 		recvs: [<string>, <string>, ...]
	 *
	 * }
	 * @param {Object} payload
	 */
	function validateRequest(payload) {
		if (!payload.id)
			throw new Error("No application id in runtime request defined!");
		if (!payload.version)
			throw new Error("No application version in runtime request defined!");
		if (!payload.instid)
			throw new Error("No application instance id in runtime request defined!");
		if (!payload.action)
			throw new Error("No action field in runtime request defined.");
		if (!payload.params)
			throw new Error("No action parameters in runtime request defined!");
		if (!payload.recvs)
			throw new Error("No receivers set in runtime requests defined!");
	}

	return {
		constructor : function(sender, timestamp, payload) {
			validateRequest(payload);
			this._payload = payload;
			this._sender = sender;
			this._timestamp = timestamp;
		},

		/**
		 * Returns application parameter.
		 *
		 * @return {Object} application parameters {
		 * 		id:<string>,
		 * 		instance: <string>,
		 * 		version: <string>
		 * }
		 */
		getApplicationParameter : function() {
			return {
				id : this._payload.id,
				instance : this._payload.instid,
				version : this._payload.version
			};
		},

		/**
		 * Returns session id of sender session.
		 *
		 * @return {String}
		 */
		getSender : function() {
			return this._sender;
		},

		/**
		 * Returns creation time value used as request timestamp within the sender context.
		 * 
		 * @returns {String}
		 */
		getTimestamp : function() {
			return this._timestamp;
		},

		/**
		 * Returns action name.
		 *
		 * @return {String}
		 */
		getAction : function() {
			return this._payload.action;
		},

		/**
		 * Returns parameter value.
		 * @param {String} name parameter name
		 * @return {Object} parameter value object
		 */
		getParameter : function(name) {
			return this._payload.params[name];
		},

		/**
		 * Returns all parameters.
		 *
		 * @return {Object} parameter map object
		 */
		getAllParameters : function() {
			return this._payload.params;
		},

		/**
		 * Returns receivers.
		 *
		 * @return {Array} array of session ids
		 */
		getReceivers : function() {
			return this._payload.recvs;
		}
	};
})());
