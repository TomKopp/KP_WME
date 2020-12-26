Ext.namespace('Documa.communication.commands');

Documa.require('Documa.communication.commands.ExecutableCommand');
Documa.require('Documa.util.Logger');

Documa.communication.commands.ComponentMessagePublishCommand = Ext.extend(Documa.communication.commands.ExecutableCommand, (function() {
	var TAG = "Documa.communication.commands.ComponentMessagePublishCommand";
	var _log = Documa.util.Logger;
	var _msg = null;

	/**
	 * Helper method to validate given message payload.
	 *
	 * @param {Object} payload object containing payload data to be validated
	 */
	function validateMessagePayload(payload) {
		if (!payload.message)
			throw new Error("Message payload data are missing!");

		if (!payload.sender)
			throw new Error("Missing instance id of sender component!");

		var msg = payload.message;

		if (!msg.header)
			throw new Error("Missing message header field!");
		if (!msg.body)
			throw new Error("Missing message body field!");

		var header = msg.header;
		if (!header.name)
			throw new Error("Missing name in message header field!");
		if (!header.hasOwnProperty("callbackId"))
			throw new Error("Missing callbackId in message header field!");
		if (!header.hasOwnProperty("description"))
			throw new Error("Missing description in message header field!");
		if (!header.hasOwnProperty("datatype"))
			throw new Error("Missing datatype in message header field!");
		if (!header.hasOwnProperty("syncThreshold"))
			throw new Error("Missing syncThreshold in message header field!");
	};

	/**
	 * Returns CRUISe message object from given CSR message object.
	 *
	 * @param {Documa.communication.Message} message object containing component
	 * event message as payload data
	 */
	function getCruiseMessage(message) {
		var msg = message.getPayload().message;
		var header = msg.header;
		var result = new Ext.cruise.client.Message();
		result.setBody(msg.body);
		result.setName(header.name);
		result.setCallbackId(header.callbackId);
		result.setDescription(header.description);
		result.setDatatype(header.datatype);
		result.setSyncThreshold(header.syncThreshold);
		return result;
	};

	return {
		constructor : function(message) {
			_msg = message;
		},

		destructor : function() {
			_msg = null;
		},

		execute : function() {
			try {
				validateMessagePayload(_msg.getPayload());
				var message = getCruiseMessage(_msg);

				// getting instance id of sender component
				var instid = _msg.getPayload().sender;
				_log.debug(TAG,"... publish component message from sender component {"+instid+"}");
				
				// publish received message as normal component message
				Documa.RuntimeManager.getEventBroker().publish(instid, message);
			} catch(error) {
				_log.trace(TAG, error);
			}
		}

	};
})());
