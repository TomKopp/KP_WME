Ext.namespace('Documa.communication');

Documa.communication.MessageFields = {
	SENDER_ID : "senderid",
	PAYLOAD : "payload",
	TIMESTAMP : "timestamp",
	MSG_TAG : "tag",
	TYPE : "type"
};

Documa.communication.MessageFieldValues = {
	APP_LEVEL : 1,
	SYS_LEVEL : 2,
	DSTID_DOCUMA_SERVER : "__documa__server",
	DSTID_DOCUMA_CLIENT : "__documa__client",
	SENDR_DOCUMA_CLIENT : "__documa__client"
};

Documa.communication.MessageTypes = {
	EVENT_MSG_TYPE : "event",
	COMMAND_MSG_TYPE : "command"
};

/**
 * @class
 */
Documa.communication.Message = Ext.extend(Object, (function() {
	/**
	 * @param {Object} object value object to validate
	 */
	var validateObject = function(object) {
		var fields = Documa.communication.MessageFields;
		if (object[fields.SENDER_ID] == undefined) {
			throw new Error("Invalid value object, no sender id defined!");
		} else if (object[fields.PAYLOAD] == undefined) {
			throw new Error("Invalid value object, no payload defined!");
		} else if (object[fields.TIMESTAMP] == undefined) {
			throw new Error("Invalid value object, no timestamp defined!");
		} else if (object[fields.MSG_TAG] == undefined) {
			throw new Error("Invalid value object, no tag defined!");
		}
	};

	/**
	 * Helper method to copy values.
	 *
	 * @param {Object} object object to grab values from
	 */
	var grabValues = function(scope, object) {
		for (var p in object) {
			if (!object.hasOwnProperty(p))
				continue;

			// copy values
			scope[p] = object[p];
		}
	};
	// public methods
	return {
		/**
		 * Constructor.
		 * @constructs
		 * @param {Object} data
		 */
		constructor : function(data) {
			Documa.communication.Message.superclass.constructor.call(this);
			if (data == undefined || data == null)
				return;
			validateObject(data);
			// copy data
			grabValues(this, data);
		},

		/**
		 * @returns {String}
		 */
		getSenderId : function() {
			return this[Documa.communication.MessageFields.SENDER_ID];
		},

		/**
		 * @param {String} senderid
		 */
		setSenderId : function(senderid) {
			this[Documa.communication.MessageFields.SENDER_ID] = senderid;
		},

		/**
		 * @returns {Number}
		 */
		getTimestamp : function() {
			return this[Documa.communication.MessageFields.TIMESTAMP];
		},

		/**
		 * @param {Number} timestamp
		 */
		setTimestamp : function(timestamp) {
			this[Documa.communication.MessageFields.TIMESTAMP] = timestamp;
		},

		/**
		 * @returns {Object}
		 */
		getPayload : function() {
			return this[Documa.communication.MessageFields.PAYLOAD];
		},

		/**
		 * @param {Object} payload
		 */
		setPayload : function(payload) {
			this[Documa.communication.MessageFields.PAYLOAD] = payload;
		},

		/**
		 * @param {String} tag
		 */
		setMessageTag : function(tag) {
			this[Documa.communication.MessageFields.MSG_TAG] = tag;
		},

		/**
		 * @returns {String}
		 */
		getMessageTag : function() {
			return this[Documa.communication.MessageFields.MSG_TAG];
		},

		/**
		 * @returns {String}
		 */
		toString : function() {
			return Ext.encode(this);
		}
	};
})());
