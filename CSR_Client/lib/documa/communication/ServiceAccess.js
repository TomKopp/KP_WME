Ext.namespace('Documa.communication');

Documa.require('Documa.util.Logger');
Documa.require('Documa.util.Util');
Documa.require('Documa.communication.XMLMessageRequest');

Documa.communication.ServiceAccess = Ext.extend(Object, (function () {

	var TAG = "Documa.communication.ServiceAccess";
	var _log = Documa.util.Logger;
	var _xmrList = {};
	var _initRequestCounter = 0;
	var _initRequestListeners = [];
	var _timeout = null;
	var _self = null;
	var _doInit = true;

	/**
	 * Helper method to sort given array of server-side events according to their
	 * temporal order.
	 *
	 * @param {Array} eventArray list of events to be sorted to their temporal order
	 * accordingly
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
	 * Helper method to notify all waiting init request listeners.
	 */
	var notifyInitRequestListeners = function () {
		for (var i = 0; i < _initRequestListeners.length; ++i) {
			_initRequestListeners[i]();
		}
	};

	return {
		/**
		 * Constructor.
		 * @constructs
		 * @param {Documa.components.ComponentManager} componentManager
		 */
		constructor: function (componentManager) {
			Documa.communication.ServiceAccess.superclass.constructor.call(this);
			_self = this;
			_doInit = true;
			this._componentManager = componentManager;
		},

		createXHR: function (scope) {
			_log.debug(TAG, "... XMR object created!");
			// retrieve corresponding component container from specified component scope
			var container = this._componentManager.getContainerFromComponent(scope);
			if (!container) {
				_log.error(TAG, new Error("Could not determine matching component container"));
			}
			var xhr = new Documa.communication.XMLMessageRequest(this, container, scope);
			// add request object to component container
			container.addServiceRequestObject(xhr);
			return xhr;
		},

		buildSOAPEnvelope: function (payload, target_prefix, target_ns) {
			var message = "<?xml version=\"1.0\" encoding=\"UTF-8\"?";
			message += "<soapenv:Envelope xmlns:soapenv=\"http://www.w3.org/2003/05/soap-envelope\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" xmlns: ";
			message += (target_prefix || "q0");
			message += (target_ns || Ext.cruise.client.Constants._CORE_NS_);
			message += "\"><soapenv:Body>" + payload + "</soapenv:Body></soapenv:Envelope>";

			return message;
		},

		onInitialRequestsFinished: function (fnct) {
			if (!fnct instanceof Function)
				throw new Error("InvalidArgumentError");

			_initRequestListeners.push(fnct);
		},

		/**
		 * Method is called before a message is send to the server-side service access
		 * component.
		 *
		 * @param {Object} timestamp creation time of message
		 * @param {Documa.communication.XMLMessageRequest} xmr related xmr object instance at the specified time
		 * @param {Object} async flag that indicates if the service request should be
		 * process synchronously
		 */
		add: function (timestamp, xmr) {
			if (!timestamp instanceof Number || !( xmr instanceof Documa.communication.XMLMessageRequest))
				throw new Error("InvalidArgumentError");
			_xmrList[timestamp] = xmr;

			if (_doInit) {
				++_initRequestCounter;
			}
		},

		/**
		 * Method is registered at the eventddispatcher object by the runtime manager. It
		 * is called after the communication
		 * manager receives a ONSERVREQ server-side event that should be handled by the
		 * serice access component.
		 *
		 * @param {Documa.communication.events.SystemEvent} evt server-side systemlevel
		 * event fired after receiving a service access response
		 */
		handleEvent: function (evt) {
			if (!evt instanceof Documa.communication.events.SystemEvent)
				throw new Error("Invalid event to handle in ServiceAccess component.");

			var payload = evt.getPayload();

			if (!payload)
				throw new Error("Invalid payload error");

			try {
				var reqTime = payload.reqtime;
				_xmrList[reqTime].handleServiceAccessEvent(evt);

				if (_doInit && !payload.header) {
					// just count down on responses
					--_initRequestCounter;

					if (_initRequestCounter == 0) {
						_doInit = false;
						notifyInitRequestListeners();
					}
				}
			} catch (error) {
				_log.trace(TAG, error);
			}
		},

		/**
		 * Returns the count of pending initial requests.
		 *
		 * @return {Number}
		 */
		getPendingInitialRequestsCount: function () {
			return _initRequestCounter;
		}
	};
})());
