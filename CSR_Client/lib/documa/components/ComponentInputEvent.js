Ext.namespace("Documa.components");

Documa.components.ComponentInputEventTypes = {
	CALLEVENT: "callEvent",
	SERVICEEVENT: "serviceEvent",
	RUNTIMEEVENT: "runtimeEvent",
	USEREVENT: "userEvent",
	TIMEREVENT: "timerEvent",
	INTERVALEVENT: "intervalEvent",
	STARTINTERVAL: "startInterval"
};

Documa.components.ComponentEventHandlerAttributes = {
	GENERIC_ASYNC_EVENT_HANDLER: "onAsyncEvent"
};

Documa.components.ComponentHandlerContext = Ext.extend(Object, (function () {
	return {
		/**
		 * Constructor.
		 *
		 * @param {String} handlerName
		 * @param {String} ctxId
		 * @param {Array} arguments
		 * @param {Object} scope
		 * @param {Function} handler
		 */
		constructor: function (handlerName, ctxId, arguments) {
			this._handlerName = handlerName;
			this._arguments = arguments;
			this._contextId = ctxId;

			/** @type {Object} */
			this._scope = null;

			/** @type {Function} */
			this._handler = null;
		},
		/**
		 * Returns name of public visible event handler.
		 * @returns {String|*}
		 */
		getHandlerName: function () {
			return this._handlerName;
		},
		/**
		 * Returns handler context id.
		 * @returns {String|*}
		 */
		getContextID: function () {
			return this._contextId;
		},
		/**
		 * Sets array of arguments to event handler context.
		 *
		 * @returns {Array|*}
		 */
		getArguments: function () {
			return this._arguments;
		},
		/**
		 * Sets scope of handler context.
		 *
		 * @param {Object} scope
		 */
		setHandlerScope: function (scope) {
			this._scope = scope;
		},
		/**
		 * Returns scope of handler context.
		 *
		 * @returns {Object}
		 */
		getHandlerScope: function () {
			return this._scope;
		},
		/**
		 * Set handler function.
		 * @param {Function} handler
		 */
		setHandler: function (handler) {
			this._handler = handler;
		},
		/**
		 * Returns handler function.
		 * @returns {Function}
		 */
		getHandler: function () {
			return this._handler;
		},
		/**
		 * Serializes handler context.
		 * @returns {Object.<string, string>}
		 */
		serialize: function () {
			return JSON.stringify({
				handlerName: this._handlerName,
				contextId: this._contextId,
				arguments: this._arguments
			});
		}
	};
})());

Documa.components.ComponentInputEvent = Ext.extend(Object, (function () {
	return {
		/**
		 * Constructor.
		 * @param {Documa.components.ComponentHandlerContext}  context
		 */
		constructor: function (context) {
			Documa.components.ComponentInputEvent.superclass.constructor.call(this);
			this._timestamp = new Date().getTime();
			this._id = window.uuid.v1();
			this._context = context;
		},
		getTimestamp: function () {
			return this._timestamp;
		},
		getId: function () {
			return this._id;
		},
		setTimestamp: function (timestamp) {
			if (typeof timestamp === "string")
				timestamp = parseInt(timestamp);
			this._timestamp = timestamp;
		},
		serialize: function () {
			throw new Error("Please implement the serialize method in your subclass of class: Documa.components.ComponentInputEvent!");
		},
		/**
		 * Returns handler context of input event.
		 * @returns {Documa.components.ComponentHandlerContext|*}
		 */
		getHandlerContext: function () {
			return this._context;
		}
	};
})());
