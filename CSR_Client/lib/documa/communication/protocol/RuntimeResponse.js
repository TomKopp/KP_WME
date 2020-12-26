Ext.namespace("Documa.communication.protocol");

Documa.require("Documa.util.Logger");
Documa.require("Documa.communication.commands.CommandFactory");
Documa.require("Documa.communication.events.EventFactory");

Documa.communication.protocol.RuntimeResponseStatus = {
	SUCCESS : 100, // request fully completed
	PARTIAL : 200, // request partially completed --> several response messages possible
	FAILURE : 300 // request could not be completed
};

/**
 * @class
 */
Documa.communication.protocol.RuntimeResponse = Ext.extend(Object, (function() {
	var TAG = "Documa.communication.protocol.RuntimeResponse";
	var _log = Documa.util.Logger;

	function validateApplicationParameters(app) {
		if (!app.id)
			throw new Error("Missing application id!");
		if (!app.instance)
			throw new Error("Missing application instance id!");
		if (!app.version)
			throw new Error("Missing application version!");
	}

	return {
		/**
		 * Constructor.
		 * @constructs
		 * @param {{id:String, version:String, instid:String}} app_params
		 * @param {String} sender
		 * @param {String} action
		 * @param {String} reqtimestamp
		 */
		constructor : function(app_params, sender, action, reqtimestamp) {
			validateApplicationParameters(app_params);
			this._action = action;
			this._responsePayload = null;
			this._app = app_params;
			this._requestSender = sender;
			this._reqid = reqtimestamp;
			this._status = -1;
		},

		/**
		 * @returns {number}
		 */
		getStatus : function() {
			return this._status;
		},

		/**
		 * @param {number} status
		 */
		setStatus : function(status) {
			_log.debug(TAG,"... setting status to: "+status);
			if (status != Documa.communication.protocol.RuntimeResponseStatus.SUCCESS && 
				status != Documa.communication.protocol.RuntimeResponseStatus.PARTIAL && 
				status != Documa.communication.protocol.RuntimeResponseStatus.FAILURE) {
				throw new Error("Invalid status value set!");
			}
			this._status = status;
		},

		/**
		 * @returns {String}
		 */
		getAction : function() {
			return this._action;
		},

		/**
		 * @param {Object} payload
		 */
		setResponsePayload : function(payload) {
			this._responsePayload = payload;
		},

		/**
		 * @returns {Object}
		 */
		getResponsePayload : function() {
			return this._responsePayload;
		},

		/**
		 * @returns {{id: String, version: String, instid: String}|*}
		 */
		getApplicationParameter : function() {
			return this._app;
		},

		/**
		 * @returns {String}
		 */
		getRequestSender : function() {
			return this._requestSender;
		},

		/**
		 * @returns {String}
		 */
		getRequestId : function() {
			return this._reqid;
		},

		/**
		 * Write back given response payload to the requesting runtime context.
		 * The response carrier message is an event that will be forwarded to the requesting
		 * client by the server-side runtime environment.
		 *
		 * @param {Object} response
		 * 						    payload object containing request specific response data,
		 * 						    e. g. the migration ready state during the prepare-phase
		 */
		write : function(response) {
			_log.debug(TAG, "... writing back response to session: " + this._requestSender);

			// check application parameters
			if (!(this._app.id && this._app.version && this._app.instance))
				throw new Error("Some application parameters are missing!");

			var efactory = new Documa.communication.events.EventFactory();
			// create runtime message to send back response payload
			var responseMsg = efactory.createRuntimeResponse(
				this._app.instance, 
				this._app.id, 
				this._app.version, 
				this._requestSender, // requesting sender
				this._action, // requested action
				this._reqid, // id of request
				this._status,
				response);
			// response payload

			// sending back response to previous request message
			// use request creation time as request
			// identifier to map response message to a
			// specific response handler function
			Documa.RuntimeManager.getCommunicationManager().sendApplicationLevelMessage(responseMsg);
		}
	};
})());
