Ext.namespace("Documa.communication.commands");

Documa.require("Documa.util.Logger");
Documa.require("Documa.communication.protocol.RuntimeRequest");
Documa.require("Documa.communication.protocol.RuntimeResponse");

Documa.communication.commands.RuntimeRequestCommand = Ext.extend(Documa.communication.commands.ExecutableCommand, (function() {
	var TAG = "Documa.communication.commands.RuntimeRequestCommand";
	var _log = Documa.util.Logger;

	return {
		constructor : function(message) {
			Documa.communication.commands.RuntimeRequestCommand.superclass.constructor.call(this, message);
			this._msg = message;
		},

		destructor : function() {
			delete this._msg;
		},

		execute : function() {
			try {
				// create request object from message payload
				var request = new Documa.communication.protocol.RuntimeRequest(
					this._msg.getSenderId(),
					this._msg.getTimestamp(),
					this._msg.getPayload());
				// create response object to write response payload back to requesting runtime
				var response = new Documa.communication.protocol.RuntimeResponse(
					request.getApplicationParameter(), 
					request.getSender(), 
					request.getAction(),
					request.getTimestamp());
				// initialize status code of response --> failure assumption 
				response.setStatus(Documa.communication.protocol.RuntimeResponseStatus.FAILURE);
				// handle request
				Documa.RuntimeManager.onRuntimeRequest(request, response);
			} catch(error) {
				_log.error(TAG, error.stack);
			}
		}
	};
})());
