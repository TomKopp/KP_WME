if (!window.Documa) {
	window.Documa = {components: {}}
} else if (!window.Documa.components) {
	window.Documa.components = {};
}

/**
 * @class
 */
Documa.components.ComponentMessage = (function () {
	return class {
		/**
		 * @constructs
		 */
		constructor() {
			this.message = {"header": {}, "body": {}};
		}

		/**
		 * Adds a new data to the body. Data is represented as a key-value-pair.
		 * @param {String} name the name which was declared in the mcdl for the parameter
		 * @param {String|Number} value
		 */
		appendToBody(name, value) {
			if (this.message.body != null || this.message.body !== undefined) {
				this.message.body[name] = value;
			}
		}

		/**
		 * Sets a complete data array as body. The array should contain key-value-pairs for every item.
		 * The name of a key is identical with the declared parameter name in the mcdl.
		 * @param {Array} value an associatives array with key-value-pairs
		 */
		setBody(value) {
			if (this.message.body != null || this.message.body !== undefined) {
				this.message.body = value;
			}
		}

		/**
		 * Returns the body.
		 * @return {Object}
		 */
		getBody() {
			if (this.message.body != null || this.message.body !== undefined) {
				return this.message.body;
			} else return null;
		}
		/**
		 * Sets the Status of a message object.
		 * @param {Number} number
		 */
		setStatus(number) {
			if (this.message.header != null || this.message.header !== undefined) {
				this.message.header.status = number;
			}
		}
		/**
		 * Returns the Status of a message.
		 * @returns {Number}
		 */
		getStatus() {
			if (this.message.header != null || this.message.header !== undefined) {
				if (this.message.header.status != null || this.message.header.status !== undefined)
					return this.message.header.status;
			}
			return null;
		}
		/**
		 * Sets the callbackId for a message. Normally this is done by the runtime.
		 * @param {String} callbackId
		 */
		setCallbackId(callbackId) {
			if (this.message.header != null || this.message.header !== undefined) {
				this.message.header.callbackId = callbackId;
			}
		}
		/**
		 * Returns the CallbackId of a message.
		 * @returns {String}
		 */
		getCallbackId() {
			if (this.message.header != null || this.message.header !== undefined) {
				if (this.message.header.callbackId != null || this.message.header.callbackId !== undefined)
					return this.message.header.callbackId;
			}
			return null;
		}
		/**
		 * Sets a error desription. Normally this is done by the runtime.
		 * @param {String} text
		 */
		setDescription(text) {
			if (this.message.header != null || this.message.header !== undefined) {
				this.message.header.description = text;
			}
		}
		/**
		 * Returns the descrioption.
		 * @return {String}
		 */
		getDescription() {
			if (this.message.header != null || this.message.header !== undefined) {
				if (this.message.header.description != null || this.message.header.description !== undefined)
					return this.message.header.description;
			}
			return null;
		}
		/**
		 * Sets the name of the event.
		 * @param {String} name
		 */
		setName(name) {
			if (this.message.header != null || this.message.header !== undefined) {
				this.message.header.name = name;
			}
		}
		/**
		 * Returns the Name.
		 * @return {String}
		 */
		getName() {
			if (this.message.header != null || this.message.header !== undefined) {
				if (this.message.header.name != null || this.message.header.name !== undefined)
					return this.message.header.name;
			}
			return null;
		}
		/**
		 * Sets the data type of the body.
		 * @param {String} type
		 */
		setDatatype(type) {
			if (this.message.header != null || this.message.header !== undefined) {
				this.message.header.datatype = type;
			}
		}
		/**
		 * Returns the data type of the body.
		 * @return {String}
		 */
		getDatatype() {
			if (this.message.header != null || this.message.header !== undefined) {
				if (this.message.header.datatype != null || this.message.header.datatype !== undefined)
					return this.message.header.datatype;
			}
			return null;
		}
		/**
		 * Sets the time intervall for a asynchronous feedback. Normally this is done by the runtime.
		 * @param {Number} time in seconds
		 */
		setSyncThreshold(time) {
			if (this.message.header != null || this.message.header !== undefined) {
				this.message.header.syncThreshold = time;
			}
		}
		/**
		 * Returns the time intervall for a asychronous feedback.
		 * @return {Number}
		 */
		getSyncThreshold() {
			if (this.message.header != null || this.message.header !== undefined) {
				if (this.message.header.syncThreshold != null || this.message.header.syncThreshold !== undefined)
					return this.message.header.syncThreshold;
			}
			return null;
		}
	};
}());