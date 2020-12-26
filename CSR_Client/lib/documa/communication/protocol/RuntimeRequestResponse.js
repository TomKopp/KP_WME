Ext.namespace("Documa.communication.protocol");

Documa.require("Documa.util.Logger");
Documa.require("Documa.communication.commands.CommandFactory");


/**
 * @callback RequestCallback
 * @param {Documa.communication.protocol.RuntimeResponse} response
 * */

/**
 * @class
 */
Documa.communication.protocol.RuntimeRequestResponse = Ext.extend(Object, (function() {
	var TAG = "Documa.communication.protocol.RuntimeRequestResponse";
	var _log = Documa.util.Logger;
	return {
		constructor : function(appcontext) {
			this._appcontext = appcontext;
			this._cfactory = new Documa.communication.commands.CommandFactory();
			this._requestRegistry = {};
		},

		/**
		 * Requesting a specific action in the context of the specified receivers.
		 * @param {String} action action to perform
		 * @param {Object} params action parameter
		 * @param {Array.<String>} receivers collection of receiver runtime container
		 * @param {RequestCallback} successCb
		 * @param {RequestCallback} errorCb
		 */
		doRequest : function(action, params, receivers, successCb, errorCb) {
			var appid = this._appContext.getValue(Documa.context.ApplicationContextAttributes.APP_ID);
			var appversion = this._appContext.getValue(Documa.context.ApplicationContextAttributes.APP_VERSION);
			var appinstid = this._appContext.getValue(Documa.context.ApplicationContextAttributes.APP_INSTID);

			var request = this._cfactory.createRuntimeRequest(appid, appversion, appinstid, receivers, action, params);
			// register request
			this._requestRegistry[request.getTimestamp()] = {
				action : action,
				success : successCb,
				failure : errorCb
			};
			_log.debug(TAG, "... sending RUNTIME REQUEST: " + request.getTimestamp() + "#" + action);
			// send command to server
			Documa.RuntimeManager.getCommunicationManager().sendApplicationLevelMessage(request);
		},

		/**
		 * Called after a response was received.
		 * @param {Documa.communication.protocol.RuntimeResponse} response
		 */
		handleResponse : function(response) {
			var entry = this._requestRegistry[response.getRequestId()];
			if (!entry) {
				throw new Error("No entry in request registry found for response with id {" + response.getRequestId() + "#" + response.getAction() + "}");
			}
			_log.debug(TAG, "... received RUNTIME RESPONSE: " + response.getRequestId() + "#" + response.getAction());
			switch(response.getStatus()) {
				case Documa.communication.protocol.RuntimeResponseStatus.FAILURE:
					entry.failure(response);
					break;
				case Documa.communication.protocol.RuntimeResponseStatus.SUCCESS:
					entry.success(response);
					break;
				case Documa.communication.protocol.RuntimeResponseStatus.PARTIAL:
					throw new Error("Not implemented yet!");
			}
		}
	};
})());
