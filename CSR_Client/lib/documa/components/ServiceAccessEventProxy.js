Ext.namespace("Documa.components");

Documa.require("Documa.util.Logger");
Documa.require("Documa.components.ComponentEventProxy");
Documa.require("Documa.components.ComponentInputEvent");

/**
 * @class
 * @extends {Documa.components.ComponentEventProxy}
 */
Documa.components.ServiceAccessEventProxy = Ext.extend(Documa.components.ComponentEventProxy, (function () {
	const TAG = "Documa.components.ServiceAccessEventProxy";
	const LOG = Documa.util.Logger;

	/**
	 * Creates XHR wrapper object with given global window object.
	 *
	 * @param {Object} global window namespace object
	 * @returns {XMLHttpRequest}
	 */
	function createXHRWrapper(global) {
		let documa_xhr = global.XMLHttpRequest;
		/** @type Documa.components.ServiceAccessEventProxy */
		let proxy = this;

		// defining constructor of XHR wrapper
		function XMLHttpRequest() {
			// wrapped xhr object
			this.object = new documa_xhr();
			// counting pending requests
			this.requestCounter = 0;
			// representation of blocked state
			this.blocked = false;
			this._payload = null;
			this._responseHandlerRegistry = {};
			let self = this;
			// define binding between wrapper and wrapped xhr object
			// definition of getter and setter-functions of writable properties
			Object.defineProperties(self, {
				timeout: {
					set: function (newValue) {
						self.object.timeout = newValue;
					},
					get: function () {
						return self.object.timeout;
					}
				},
				withCredentials: {
					set: function (newValue) {
						self.object.withCredentials = newValue;
					},
					get: function () {
						return self.object.withCredentials;
					}
				},
				responseType: {
					set: function (newValue) {
						self.object.responseType = newValue;
					},
					get: function () {
						return self.object.responseType;
					}
				}
			});

			// definition of getter-functions of readable properties
			// information source is the wrapped xhr element
			Object.defineProperties(self, {
				status: {
					get: function () {
						return self.object.status;
					}
				},
				statusText: {
					get: function () {
						return self.object.statusText;
					}
				},
				response: {
					get: function () {
						return self.object.response;
					}
				},
				responseText: {
					get: function () {
						return self.object.responseText;
					}
				},
				responseXML: {
					get: function () {
						return self.object.responseXML;
					}
				},
				upload: {
					get: function () {
						return self.object.upload;
					}
				},
				readyState: {
					get: function () {
						return self.object.readyState;
					}
				}
			});

			// notify proxy object about wrapper creation
			proxy.wrapperCreated(this);
		}

		XMLHttpRequest.prototype.onreadystatechange = null;
		XMLHttpRequest.onopen = null;
		XMLHttpRequest.prototype.block = function () {
			this.blocked = true;
		};
		XMLHttpRequest.prototype.unblock = function () {
			this.blocked = false;
		};
		XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
			if (this.constructor.onopen) {
				this.constructor.onopen.apply(this, arguments);
			}
			LOG.debug(TAG, "... calling open function");

			this._payload = {
				method: method,
				url: url,
				user: user,
				password: password
			};

			// calling wrapped open-function
			this.object.open(method, url, async, user, password);
		};

		XMLHttpRequest.onresponse = null;
		XMLHttpRequest.responsehandled = null;
		XMLHttpRequest.onsend = null;
		XMLHttpRequest.prototype.send = function (data) {
			if (this.constructor.onsend) {
				// calling onsend-function of instance
				this.constructor.onsend.apply(this, arguments);
			}
			if (this.onreadystatechange) {
				// response handler defined
				let self = this;
				let eventid = null;
				/*handlerName, arguments, scope, handler*/
				let handlerContext = new Documa.components.ComponentHandlerContext(
					Documa.components.ComponentEventHandlerAttributes.GENERIC_ASYNC_EVENT_HANDLER,
					self._payload.url, // use url as handler context id
					null
				);
				// map response event handler to handler context id
				this._responseHandlerRegistry[handlerContext.getContextID()] = this.onreadystatechange;
				this.object.onreadystatechange = function () {
					let sre = null;
					if (self.readyState === 4) {
						// response was successfully received or an error occured
						if (self.constructor.onresponse) {
							self.constructor.onresponse.call(this, self);
						}

						// *******************************************************************************
						// tracking service response event ***********************************************
						// *******************************************************************************
						sre = new Documa.components.ServiceResponseEvent(handlerContext, self);
						if (proxy._blocked) {
							// response blocked
							proxy._container.getInputEventBuffer().addDownstreamEvent(sre);
							return;
						} else {
							proxy._container.getInputEventBuffer().addActivityEvent(sre);
						}
					}
					self.onreadystatechange();
					--self.requestCounter;
					if (self.readyState === 4) {
						if (self.constructor.responsehandled) {
							self.constructor.responsehandled.call(this, self);
						}
						if(sre !== null){
							proxy._container.getInputEventBuffer().remove(sre);
						}
					}
				};
			}
			LOG.debug(TAG, "... calling send function");
			// calling wrapped send-function
			this.object.send(data);
			++this.requestCounter;
		};

		XMLHttpRequest.onsetRequestHeader = null;
		XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
			if (this.constructor.onsetRequestHeader) {
				this.constructor.onsetRequestHeader.apply(this, arguments);
			}
			LOG.debug(TAG, "... calling setRequestHeader function");
			this.object.setRequestHeader(header, value);
		};

		XMLHttpRequest.prototype.getPendingRequestCount = function () {
			return this.requestCounter;
		};

		XMLHttpRequest.prototype.getResponseHeader = function (header) {
			return this.object.getResponseHeader(header);
		};

		XMLHttpRequest.prototype.getAllResponseHeaders = function () {
			return this.object.getAllResponseHeaders();
		};

		XMLHttpRequest.onabort = null;
		XMLHttpRequest.prototype.abort = function () {
			if (this.constructor.onabort) {
				this.constructor.onabort.apply(this, arguments);
			}
			this.object.abort();
		};

		/**
		 * Creates a new handler context for service response events.
		 *
		 * @param {String} handlerName
		 * @param {String} contextId
		 * @param {Array} arguments
		 */
		XMLHttpRequest.prototype.setHandlerContext = function (handlerName, contextId, arguments) {
			if (!handlerName)
				throw new Error("Invalid handler name!");
			if (!contextId)
				throw new Error("Invalid handler context!");
			if (!arguments)
				throw new Error("Invalid arguments array!");

			this._currentHandlerContext = new Documa.components.ComponentHandlerContext(handlerName, contextId, arguments);
		};

		/**
		 * Returns function registered as handler context.
		 *
		 * @param {String} contextID
		 * @returns {Function}
		 */
		XMLHttpRequest.prototype.getEventHandler = function (contextID) {
			return this._responseHandlerRegistry[contextID];
		};

		XMLHttpRequest.UNSENT = 0;
		XMLHttpRequest.OPENED = 1;
		XMLHttpRequest.HEADERS_RECEIVED = 2;
		XMLHttpRequest.LOADING = 3;
		XMLHttpRequest.DONE = 4;

		// returning wrapping function object
		return XMLHttpRequest;
	}

	// *********************************************************************************
	// *********************************************************************************
	// *********************************************************************************
	return {
		/**
		 * Constructor.
		 * @constructs
		 * @param {Documa.components.ComponentContainer} container
		 */
		constructor: function (container) {
			Documa.components.ServiceAccessEventProxy.superclass.constructor.call(this);
			this._container = container;
			this._wrapperRegistry = [];
		},

		/**
		 * Called on instanciation of XMLHttpRequest object wrapper.
		 *
		 * @param {XMLHttpRequest} xhrWrapper Xhr wrapper object
		 */
		wrapperCreated: function (xhrWrapper) {
			LOG.debug(TAG, "... adding xhr wrapper to component container " + this._container.getComponentInstanceID());
			this._wrapperRegistry.push(xhrWrapper);
		},

		/**
		 * Called during state injection phase. It forwards activity event to component instance despite
		 * the blockade during the migration prepare phase at receiver-side.
		 *
		 * @param {Documa.components.ServiceResponseEvent} inputEvent
		 */
		injectEvent: function (inputEvent) {
			if (!this._blocked) {
				throw new Error("Service response event proxy is not in expected blocking state!");
			}
			let contextId = inputEvent.getHandlerContext().getContextID();
			let handlerFunction = null;
			let scope = null;

			// find handling context in create xmr objects --> assumption here is that the
			// handling context will be reproduced during the state recovery phase
			let xmrs = this._container.getServiceRequestObjects();
			for (let i = 0; i < xmrs.length; ++i) {

				// get function from context id of response event
				handlerFunction = xmrs[i].getEventHandler(contextId);
				scope = xmrs[i];
				if (handlerFunction !== null && handlerFunction !== undefined)
					break;
			}

			if (!handlerFunction) {
				// event handling context still not detected
				for (let i = 0; i < this._xhrWrapper.length; ++i) {
					handlerFunction = this._xhrWrapper[i].getEventHandler(contextId);
					scope = this._xhrWrapper[i];
					if (handlerFunction !== null && handlerFunction !== undefined)
						break;
				}
			}

			if (!handlerFunction)
				throw new Error("Could not determine handler function for service response event: " + inputEvent.getId());

			handlerFunction.call(scope);
		},

		/**
		 * Called at the commitment phase of a running migration transaction on receiver-side.
		 *
		 * @param {Documa.components.ServiceResponseEvent} downstreamEvent
		 */
		injectDownstreamEvent: function (downstreamEvent) {
			if (this._blocked) {
				throw new Error("Unexpected blocking state of service response event proxy!");
			}

			throw new Error("Not implemented yet!");
		},

		destroy: function () {
			delete this._container;
			delete this._blocked;
		},

		createWrapper: function (global) {
			return createXHRWrapper.call(this, global);
		}
	};
})());
