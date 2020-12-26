Ext.namespace('Documa.communication');

Documa.require('Documa.util.Logger');
Documa.require('Documa.util.Util');
Documa.require('Documa.communication.commands.CommandFactory');
Documa.require('Documa.components.ComponentEventProxy');
Documa.require('Documa.components.ServiceResponseEvent');

Documa.communication.XMLMessageRequest = Ext.extend(Documa.components.ComponentEventProxy, (function () {

	var TAG = "Documa.communication.XMLMessageRequest";
	var _log = Documa.util.Logger;
	var _util = Documa.util.Util;

	var RESP_TYPE_TEXT = "text";
	var RESP_TYPE_JSON = "json";
	var RESP_TYPE_DOC = "document";

	var onUNSENT = function () {
		this.readyState = 0;
		this.status = 0;
		this.statusText = "";
		this.responseText = undefined;
		this.responseXML = undefined;
		this.response = undefined;
	};

	var onOPENED = function () {
		this.readyState = 1;
		this.status = 0;
		this.statusText = "";
		this.responseText = undefined;
		this.responseXML = undefined;
		this.response = undefined;
	};

	var CRITICAL_HEADER = [
		"accept-charset",
		"accept-encoding",
		"connection",
		"content-length",
		"content-transfer-encoding",
		"date",
		"expect",
		"host",
		"keep-alive",
		"referer",
		"te",
		"trailer",
		"transfer-encoding",
		"upgrade",
		"via"
	];

	/**
	 *
	 */
	var onHeadersReceived = function (headers) {

		for (var header in headers) {
			var val = headers[header];

			if (header.toLowerCase() === 'content-type') {

				if (this.readyState == 3 || this.readyState == 4) {
					throw new Error("Invalid state error: current ready state is " + this.readyState);
				}

				if (this._error) {
					this.responseType = "";
				}

				if (val.indexOf('text/plain') >= 0) {
					this.responseType = RESP_TYPE_TEXT;

				} else if (val.indexOf('/xml') >= 0 || val.indexOf('+xml') >= 0) {
					this.responseType = RESP_TYPE_DOC;

				} else if (val.indexOf('/html') >= 0) {
					this.responseType = RESP_TYPE_DOC;

				} else if (val.indexOf('/json') >= 0) {
					this.responseType = RESP_TYPE_JSON;
				} else {
					throw new Error("Received unsupported content as response on service access.");
				}
			}
		}

		this.readyState = 2;

		if (this.responseText) {
			// response was received before response headers

			// set last received response and status as valid response state
			onResponseReceived.call(this, this.responseText, this.status);
			return;
		}
	};

	/**
	 *
	 */
	var onResponseReceived = function (response, status) {
		if (typeof response != "string")
			throw new Error("InvalidResponseError");

		// set actual response status
		this.status = status;
		this.responseText = response;

		if (this.readyState == 1) {
			// no header received --> wait on header
			return;
		}

		try {
			switch (this.responseType) {
				case RESP_TYPE_DOC:
					this.responseXML = Ext.cruise.client.Utility.parseXMLFromString(this.responseText);
					this.response = this.responseXML;
					break;
				case RESP_TYPE_JSON:
					this.response = JSON.parse(response);
					break;
			}
		} catch (error) {
			_log.error(TAG, "... error during receiving response " + error);
			this.response = null;
			this.responseText = null;
			this.responseXML = null;
		}

		this.readyState = 4;
		//if (!this._async)
		//	this._block = false;

		_log.debug(TAG, "... received service access response {" + this.responseText + "}");
	};

	/**
	 *
	 */
	var onCancelledReceived = function (status) {
		this.responseText = undefined;
		this.responseXML = undefined;
		this._error = true;
		this.status = status;
		this.readyState = 4;
		this.responseType = null;
		//if (!this._async)
		//	this._block = false;

		_log.warn(TAG, "... service access was cancelled!");
	};

	/**
	 *
	 */
	var onErrorReceived = function (error, status) {
		this.status = status;
		this.responseText = undefined;
		this.responseXML = undefined;
		this._error = true;
		this.readyState = 4;
		this.responseType = null;
		//if (!this._async)
		//	this._block = false;

		_log.error(TAG, "... error during service access: " + error);
	};

	/**
	 * Helper method to handle given server-side event.
	 *
	 * @param {Documa.communication.events.Event} evt
	 */
	var handleEvent = function (evt) {
		var payload = evt.getPayload();

		if (payload.error) {
			// server-side error happened
			onErrorReceived.call(this, payload.error);
		} else {
			if (payload.cancelled) {
				// request was cancelled
				onCancelledReceived.call(this, payload.status);
			} else {
				if (payload.header) {
					// header response received
					onHeadersReceived.call(this, payload.resp);
				} else {
					// TODO: remove this workaround
					if (typeof payload.resp != "string") {
						payload.resp = Ext.encode(payload.resp);
					}

					// service access response received
					onResponseReceived.call(this, payload.resp, payload.status);
				}
			}
		}
	};

	/**
	 * Helper method to sort given array of server-side events according to their
	 * temporal order.
	 */
	var sortExecutionOrder = function (eventArray) {
		if (!eventArray instanceof Array)
			throw new Error("InvalidArgumentError");

		eventArray.sort(function (e1, e2) {
			if (!e1 instanceof Documa.communication.events.Event || !e2 instanceof Documa.communication.events.Event) {
				throw new Error("Invalid events in given array found");
			}

			var rt1 = e1.getPayload().reqtime;
			var rt2 = e2.getPayload().reqtime;

			return rt1 - rt2;
		});
	};

	/**
	 * Helper method validate header.
	 */
	function isCritial(header) {
		for (var i = 0; i < CRITICAL_HEADER.length; ++i) {
			if (CRITICAL_HEADER[i] === header) {
				return true;
			}
		}

		return false;
	};

	return {
		/**
		 * Constructor.
		 * @param {Documa.communication.ServiceAccess} serviceAccess
		 * @param {Documa.components.ComponentContainer} container
		 * @param {Object} scope component instance scope
		 */
		constructor: function (serviceAccess, container, scope) {
			Documa.communication.XMLMessageRequest.superclass.constructor.call(this);
			this._cf = new Documa.communication.commands.CommandFactory();
			this._payload = null;
			this._requestHeaders = {};
			this._responseHeaders = {};
			this._async = true;
			this._reqTime = -1;
			this._serviceAccess = serviceAccess;
			this._requestQueue = new Array();
			this._execQueue = new Array();
			this._scope = scope;
			this._requestCounter = 0;
			this._container = container;
			this._responseHandlerRegistry = {};

			/** @type Documa.components.ComponentHandlerContext */
			this._currentHandlerContext = null;

			onUNSENT.call(this);
			_log.debug(TAG, "... constructed.");
		},

		/**
		 * Releases all internal resources.
		 */
		destroy: function () {
			delete this._container;
			delete this._requestHeaders;
			delete this._responseHeaders;
			delete this._serviceAccess;

			_util.clearArray(this._requestQueue);
			delete this._requestQueue;

			_util.clearArray(this._execQueue);
			delete this._execQueue;
			delete this._scope;
		},

		/** ***********
		 * properties *
		 * ************/
		responseText: undefined,
		responseXML: undefined,
		response: undefined,
		responseType: "",
		statusText: "",
		status: 0,
		onreadystatechange: null,
		readyState: 0, // possible values: (UNSET 0, OPENED 1, HEADERS_RECEIVED 2, LOADING 3, DONE 4)

		/**
		 *
		 * @param {String} method the HTTP method
		 * @param {String} url the URL
		 * @param {boolean} async (optional) default: true
		 * @param {String} user (optional)
		 * @param {String} password (optional)
		 */
		open: function (method, url, async, user, password) {
			if (!method || !url)
				throw new Error("Invalid XHR connection arguments");

			if (method.toLowerCase() !== "get" && method.toLowerCase() !== "post")
				throw new Error("InvalidHttpMethodError");

			if (async === false)
				throw new Error("Synchronous communication is not supported.");

			if (async == undefined || async == null)// default is true
				this._async = true;

			if (!user || !password) {
				user = null;
				password = null;
			}

			this._payload = {
				method: method,
				url: url,
				user: user,
				password: password
			};

			// open method successfully executed --> XHR is on state 1
			onOPENED.call(this);
		},

		send: function (data) {
			if (this.readyState != 1) {
				throw new Error("INVALID_STATE_ERR: current state is " + this.readyState);
			}

			if ((data != undefined || data != null) && !data instanceof String) {
				throw new Error("NotSupportedContentError");
			}

			this._payload.body = data || "";
			this._payload.headers = this._requestHeaders;

			/*handlerName, arguments, scope, handler*/
			this._currentHandlerContext = new Documa.components.ComponentHandlerContext(
				Documa.components.ComponentEventHandlerAttributes.GENERIC_ASYNC_EVENT_HANDLER,
				this._payload.url,
				null
			);

			// map request url to response handler function
			this._responseHandlerRegistry[this._currentHandlerContext.getContextID()] = this.onreadystatechange;

			var command = this._cf.create(Documa.communication.MessageFieldValues.APP_LEVEL, Documa.communication.commands.SystemCommands.REQUESTSERV, this._payload);
			this._reqTime = command.getTimestamp();

			// add mapping between request and this XMR object --> mark this object as request origin
			this._serviceAccess.add(this._reqTime, this);
			++this._requestCounter;

			if (this._blocked) {
				// in blocked state XMR should not send any request
				_log.debug(TAG, "... component blocked!");
				return;
			}

			Documa.RuntimeManager.getCommunicationManager().sendApplicationLevelMessage(command);
		},

		setRequestHeader: function (header, value) {
			if (this.readyState != 1) {
				throw new Error("INVALID_STATE_ERR: current state is " + this.readyState);
			}

			if (!header)
				throw new Error("SYNTAX_ERR");

			if (!value)
				return;

			var lc_header = header.toLowerCase();
			if (isCritial(lc_header)) {
				_log.warn(TAG, "... prevented header configuration: (" + header + ":" + value + ")");
				return;
			}
			this._requestHeaders[header] = value;
		},

		abort: function () {
			throw new Error("Not implemented yet!");
		},

		getResponseHeader: function (header) {
			if (this.readyState == 0 || this.readyState == 1 || this._error == true)
				throw new Error("INVALID_STATE_ERR");

			if (header.toLowerCase() == "set-cookie" || header.toLowerCase() == "set-cookie2")
				return null;

			return this._responseHeaders[header];
		},

		getAllResponseHeaders: function () {
			if (this.readyState == 0 || this.readyState == 1 || this._error == true)
				return "";

			var h = {};

			// filter out set-cookie headers
			for (var header in this._responseHeaders) {
				if (header.toLowerCase() === "set-cookie" || header.toLowerCase() === "set-cookie2") {
					continue;
				}
				h[header] = this._responseHeaders[header];
			}

			return h;
		},
		/**
		 * Called after the receiving of a service response.
		 *
		 * @param {Documa.communication.events.SystemEvent} evt
		 */
		handleServiceAccessEvent: function (evt) {
			if (!evt instanceof Documa.communication.events.SystemEvent)
				throw new Error("Invalid event argument to handle. Wrong Event attached to the ServiceAccess component.");

			// handling response event from server-side
			handleEvent.call(this, evt);

			if (!this.onreadystatechange) {
				_log.warn(TAG, "... no readystatechange event handler defined.");
				return;
			}

			// *******************************************************************************
			// tracking service response event ***********************************************
			// *******************************************************************************
			// add service response input event into container event buffer
			var sre = new Documa.components.ServiceResponseEvent(this._currentHandlerContext, this);
			if (this._blocked) {
				this._container.getInputEventBuffer().addDownstreamEvent(sre);
				return;
			} else {
				this._container.getInputEventBuffer().addActivityEvent(sre);
			}

			this.onreadystatechange.call(this._scope, this);

			// removing response event from buffer, cause it was handled
			this._container.getInputEventBuffer().remove(sre);

			--this._requestCounter;
		},

		getRequestTime: function () {
			return this._reqTime;
		},

		/**
		 * Returns count of current pending requests.
		 *
		 * @return {Number} count of pending requests
		 */
		getPendingRequestCount: function () {
			return this._requestCounter;
		},
		/**
		 * Returns execution scope of ready state change event handler.
		 *
		 * @return {Object} scope of ready state change
		 */
		getScope: function () {
			return this._scope;
		},
		/**
		 * Returns response event handler function from given handler context id.
		 *
		 * @param {String} handlerContextId
		 * @returns {Function}
		 */
		getEventHandler: function (handlerContextId) {
			return this._responseHandlerRegistry[handlerContextId];
		},
		/**
		 * Defines current handler context of future service response.
		 *
		 * @param {String} handlerName
		 * @param {String} contextId
		 * @param {Array} arguments
		 */
		setHandlerContext: function (handlerName, contextId, arguments) {
			if (!handlerName)
				throw new Error("Invalid handler name!");
			if (!contextId)
				throw new Error("Invalid handler context!");
			if (!arguments)
				throw new Error("Invalid arguments array!");

			this._currentHandlerContext = new Documa.components.ComponentHandlerContext(handlerName, contextId, arguments);
		}
	};
})());
