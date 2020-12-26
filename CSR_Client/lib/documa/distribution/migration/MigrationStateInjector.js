Ext.namespace("Documa.distribution.migration");

Documa.require("Documa.util.Logger");
Documa.require("Documa.distribution.migration.MigrationStateObject");
Documa.require("Documa.components.ComponentCallEvent");
Documa.require("Documa.components.TimeoutInputEvent");

Documa.distribution.migration.MigrationStateInjector = Ext.extend(Object, (function () {
	var TAG = "Documa.distribution.migration.MigrationStateInjector";
	var _log = Documa.util.Logger;

	/**
	 * Validates structure of serialized message object.
	 */
	function validateMessageObject(message) {
		if (!message.message)
			throw new Error("Invalid message object detected!");
		if (!message.message.header)
			throw new Error("No header in message defined!");
		if (!message.message.body)
			throw new Error("No body in message defined!");
		if (!message.message.header.name)
			throw new Error("No message name defined!");
		if (!message.message.header.status)
			throw new Error("No message status defined!");
	}

	/**
	 * Factory method to create a CRUISe component
	 * message from the given flat object representation.
	 *
	 * @param {Object} message flat representation of a component message
	 * @returns {Ext.cruise.client.Message}
	 */
	function createComponentMessage(message) {
		validateMessageObject(message);
		var msg = new Ext.cruise.client.Message();
		message = message.message;
		msg.setName(message.header.name);
		msg.setBody(message.body);
		msg.setCallbackId(message.header.callbackId);
		msg.setDescription(message.header.description);
		msg.setDatatype(message.header.datatype);
		msg.setSyncThreshold(message.header.syncThreshold);
		msg.setStatus(message.header.status);
		return msg;
	}

	/**
	 * Helper to validate serialized representation of given property.
	 *
	 * @param {Object} property property payload object
	 */
	function validateProperty(property) {
		if (!("name" in property))
			throw new Error("No property name defined!");
		if (!("value" in property))
			throw new Error("No property value defined!");
		if (!("type" in property))
			throw new Error("No property type defined!");
	}

	/**
	 * Helper method to validate serialized representation of given call event.
	 *
	 * @param {Object} event call event payload object
	 */
	function validateCallEvent(event) {
		if (!event.componentid)
			throw new Error("Component id not in call event defined!");
		if (!event.instanceid)
			throw new Error("Instance id not in call event defined!");
		if (!event.name)
			throw new Error("Element name not in call event defined!");
		if (!event.type)
			throw new Error("Element type not in call event defined!");
		if (!event.message)
			throw new Error("Element message not in call event defined!");
	}

	/**
	 * Helper method for validating structure of given interval event.
	 *
	 * @param {Object} event interval event payload object
	 */
	function validateIntervalEvent(event) {
		if (!("iid" in event))
			throw new Error("No interval id field in interval event defined!");
		if (!("interval" in event))
			throw new Error("No interval field in interval event defined!");
		if (!("count" in event))
			throw new Error("No count field in interval event defined!");
		if (!("arguments" in event))
			throw new Error("No parameter arguments field in interval event defined!");
		if (!("handlerId" in event))
			throw new Error("No handler id in interval event defined!");
	}

	/**
	 * Helper method for validating given interval event.
	 *
	 * @param {Object} startEvent
	 */
	function validateStartIntervalEvent(startEvent) {
		if (!("intervalId" in startEvent))
			throw new Error("No intervalId field in start interval event defined!");
		if (!("delay" in startEvent))
			throw new Error("No delay field in start interval event defined!");
		if (!("handlerContext" in startEvent))
			throw new Error("No intervalId field in start interval event defined!");
	}

	/**
	 * Helper method for validating structure of given timeout event.
	 *
	 * @param {Object} event timeout event payload object
	 */
	function validateTimeoutEvent(event) {
		if (!("tid" in event))
			throw new Error("No timeout id field in timeout event defined!");
		if (!("delay" in event))
			throw new Error("No delay field in timeout event defined!");
		if (!("arguments" in event))
			throw new Error("No parameter arguments field in timeout event defined!");
		if (!("handlerId" in event))
			throw new Error("No handler id in timeout event defined!");
	}

	/**
	 * Helper method to validate given service response event.
	 *
	 * @param {Object} event service response event descriptor
	 */
	function validateServiceResponseEvent(event) {
		if (!("state" in event))
			throw new Error("No state field in service response event defined");
		if (!("status" in event))
			throw new Error("No status field in service response event defined");
		if (!("statusText" in event))
			throw new Error("No statusText field in service response event defined");
		if (!("response" in event))
			throw new Error("No response field in service response event defined");
		if (!("responseType" in event))
			throw new Error("No responseType field in service response event defined");
		if (!("responseHeaders" in event))
			throw new Error("No responseHeaders field in service response event defined");
	}

	/**
	 * Helper method to set checkpoint properties to component instance
	 * executed within the given container.
	 *
	 * @param {Array.<Object.<name, type, value>>} checkpoint array of component properties
	 *  {
	 * 		name:<propertyname>,
	 * 		type:<propertytype>,
	 * 		value:<propertyvalue>
	 *	}
	 * @param {Documa.components.ComponentContainer} container component container
	 * @param {Function} callback
	 */
	function setCheckpoint(checkpoint, container, callback) {
		var propertyCheckList = {};

		// define propertychange-event listener
		var observer = {
			scope: this,
            /**
             * Property changed event handler function.
             *
             * @param {String} propertyName
             * @param {String} value
             */
			handler: function (propertyName, value) {
				_log.debug(TAG, "... handling changed-event of property " + propertyName + " and its new value: " + value);
				// block component again after property was changed
				container.block();
				// check if propertyName is part of the checkpoint list
				if (propertyName in propertyCheckList) {
					// map handler to property name
					propertyCheckList[propertyName] = observer.handler;
				}
				for (var j = 0; j < checkpoint.length; ++j) {
					var pn = checkpoint[j].name;
					if (!(pn in propertyCheckList) || !propertyCheckList[pn]) {
						// found not checked property
						_log.debug(TAG, "... detected unhandled property " + pn);
						_log.debug(TAG, " ... waiting for " + pn + " change event! ...");
						return;
					}
				}
				// all property changed events detected
				// removing all property change observer
				for (var pn in propertyCheckList) {
					var h = propertyCheckList[pn];
					if (typeof h !== "function") {
						throw new Error("Invalid property change handler detected!");
					}
					_log.debug(TAG, "... removing propertyChangeListener of property: " + pn);
					// remove observer entity to avoid multiple notifications
					container.removePropertyChangeListener(h);
				}

				_log.debug(TAG, "... all checkpoint properties recovered!");
				// all properties are checked now
				// execute setCheckpoint-completed callback
				callback();
			}
		};
		// add 'onPropertyChanged-Listener' to the container
		// only if all properties were set execute the specified callback
		// function
		container.addPropertyChangeListener(observer);

		for (var i = 0; i < checkpoint.length; ++i) {
			var property = checkpoint[i];
			validateProperty(property);
			// init check list value as negative entity
			propertyCheckList[property.name] = null;
			// unblocking component to recover original state
			container.unblock();
			_log.debug(TAG, "... reset migrating component property " + property.name + " to " + property.value);
			container.setProperty(property.name, property.value);
		}
	}

	/**
	 * Returns handler context from given input event descriptor.
	 * @param {Object} inputEvent
	 * @returns {Documa.components.ComponentHandlerContext}
	 */
	function getHandlerContext(inputEvent) {
		if (!("handlerContext" in inputEvent))
			throw new Error("Could not determine handler context from input event descriptor!");

		var handlerCtxt = JSON.parse(inputEvent.handlerContext);
		/*handlerName, contextId, arguments*/
		return new Documa.components.ComponentHandlerContext(handlerCtxt.handlerName, handlerCtxt.contextId, handlerCtxt.arguments);
	}

	/**
	 * Factory method for creating a corresponding input event instance with specific access methods.
	 *
	 * @param {Object} eventDescrObj event descriptor object
	 * {
	 * 	event:<type_string>,
	 * 	timestamp: <timeinmillis-since-1/1/1970>
	 * 	...
	 * 	<specific
	 * 	 event
	 * 	 parameter>
	 * 	...
	 * }
	 */
	function createInputEvent(evtObj) {
		if (!evtObj.event)
			throw new Error("Missing event type field!");
		if (!evtObj.timestamp)
			throw new Error("Missing event timestamp field!");

		var handlerContext = getHandlerContext.call(this, evtObj);
		switch (evtObj.event) {
			case Documa.components.ComponentInputEventTypes.CALLEVENT:
				validateCallEvent(evtObj);
				// create cruise message object
				var msg = createComponentMessage(evtObj.message);
				// create call event on the basis of the created cruise event
				var evt = new Documa.components.ComponentCallEvent(handlerContext, evtObj.instanceid, evtObj.componentid, evtObj.name, evtObj.type, msg);
				evt.setTimestamp(evtObj.timestamp);
				return evt;
			case Documa.components.ComponentInputEventTypes.SERVICEEVENT:
				validateServiceResponseEvent(evtObj);

				// creating xhr descriptor
				var xhrDescriptor = {
					readyState: evtObj.state,
					status: evtObj.status,
					response: evtObj.response,
					responseType: evtObj.responseType,
					getAllResponseHeaders: function () {
						return evtObj.responseHeaders;
					}
				};

				// creating service response event instance
				var evt = new Documa.components.ServiceResponseEvent(handlerContext, xhrDescriptor);
				evt.setTimestamp(evtObj.timestamp);
				return evt;
			case Documa.components.ComponentInputEventTypes.RUNTIMEEVENT:
				throw new Error("Not implemented yet!");
				break;
			case Documa.components.ComponentInputEventTypes.INTERVALEVENT:
				validateIntervalEvent(evtObj);
				// create new instance
				var evt = new Documa.components.IntervalInputEvent(handlerContext, evtObj.iid, evtObj.interval, evtObj.count, evtObj.params, evtObj.handlerId);
				evt.setTimestamp(evtObj.timestamp);
				return evt;
			case Documa.components.ComponentInputEventTypes.TIMEREVENT:
				validateTimeoutEvent(evtObj);
				var evt = new Documa.components.TimeoutInputEvent(handlerContext, evtObj.tid, evtObj.delay, evtObj.params, evtObj.handlerId);
				evt.setTimestamp(evtObj.timestamp);
				return evt;
			case Documa.components.ComponentInputEventTypes.USEREVENT:
				throw new Error("Not implemented yet!");
				break;
			case Documa.components.ComponentInputEventTypes.STARTINTERVAL:
				validateStartIntervalEvent(evtObj);
				var evt = new Documa.components.StartIntervalEvent(handlerContext, evtObj.intervalId, evtObj.delay);
				evt.setTimestamp(evtObj.timestamp);
				return evt;
		}
	}

	/**
	 * Returns array of state object items.
	 *
	 * @param {Array.<Object>} statedata
	 * @return {Array.<Documa.distribution.migration.MigrationStateObject>}
	 */
	function initStateObjectArray(statedata) {
		var resultSet = [];

		// state data are nullable
		if (statedata) {
			for (var i = 0; i < statedata.length; ++i) {
				resultSet.push(new Documa.distribution.migration.MigrationStateObject(statedata[i]));
			}
		}
		return resultSet;
	}

	return {
		/**
		 * Constructor.
		 * @constructor.
		 *
		 * @param {Array} statedata array of component state data
		 * @param {Documa.components.ComponentManager} componentManager object
		 *                        managing the life cycle of
		 *                        all local integrated components
		 */
		constructor: function (statedata, componentManager) {
			this._statedata = initStateObjectArray(statedata);
			this._componentManager = componentManager;
		},
		/**
		 * Start injection of component state data into the components defined during
		 * the construction of this object. The state inject process includes in general
		 * two information sets. The first is a checkpoint for each component. It
		 * includes every component property. The second are captured input events recorded
		 * during the execution within the source context. Those events will be reinjected
		 * by using generic component functions, e. g. timer-event hanlder operation etc.
		 *
		 * @param {Function} callback handler executed after all state data were injected
		 *              into each corresponding component instance.
		 * @returns {void}
		 */
		injectState: function (callback) {
			var self = this;
			try {
				for (var i = 0; i < this._statedata.length; ++i) {
					_log.debug(TAG, "... injecting component state data " + (1 + i) + "/" + this._statedata.length);
					var stateobj = this._statedata[i];
					var container = this._componentManager.getContainerElementById(stateobj.getInstanceId());

					// check availability of container
					if (!container)
						throw new Error("Could not determine container from component's instance id: " + stateobj.getInstanceId());

					container.setCurrentState(Documa.components.ComponentContainerStates.STATERECVRY);
					_log.debug(TAG, "... injecting checkpoint into container: " + stateobj.getInstanceId());
					// inject state into component container

					// 1st checkpoint --> create basic component state for input event replication
					setCheckpoint.call(this, stateobj.getCheckpoint(), container, function () {
						try {
							// 2nd recall input events in correct order
							var events = stateobj.getInputEvents();
							events.sort(function (e1, e2) {
								// sorting events in ascending order --> last input event has the highest index
								return  (e1.timestamp - e2.timestamp);
							});

							_log.debug(TAG, "... injecting input events into container: " + stateobj.getInstanceId());
							for (var j = 0; j < events.length; ++j) {
								// create event instance and determine handler function
								var inputEvent = createInputEvent.call(self, events[j]);
								if (inputEvent instanceof Documa.components.ComponentCallEvent) {
									_log.debug(TAG, "... injecting call event.");
									container.getApplicationEventProxy().injectEvent(inputEvent);
								} else if (inputEvent instanceof Documa.components.ServiceResponseEvent) {
									_log.debug(TAG, "... injecting service response event.");
									container.getServiceEventProxy().injectEvent(inputEvent);
								} else if (inputEvent instanceof Documa.components.IntervalInputEvent) {
									_log.debug(TAG, "... injecting interval event.");
									container.getRuntimeEventProxy().injectEvent(inputEvent);
								} else if (inputEvent instanceof Documa.components.TimeoutInputEvent) {
									_log.debug(TAG, "... injecting timer event.");
									container.getRuntimeEventProxy().injectEvent(inputEvent);
								} else if (inputEvent instanceof Documa.components.StartIntervalEvent) {
									container.getRuntimeEventProxy().injectEvent(inputEvent);
								} else {
									throw new Error("Input event currently not supported yet!");
								}
							}

							// all events were injected
							callback.call(self, true, stateobj);
							//self.onStateInjectionCompleted();
						} catch (error) {
							_log.error(TAG, error.stack);
							callback.call(self, false, error);
							//self.onStateInjectionFailure(error);
						}
					});
				}
			} catch (error) {
				_log.error(TAG, error.stack);
				callback.call(self, false, error);
				//self.onStateInjectionFailure(error);
			}
		},
		/**
		 * Injects downstream event to component instance with specified instance id.
		 *
		 * @param {Documa.components.ComponentContainer} container component instance encapsulating container
		 * @param {Array} downstreamEvents
		 */
		injectDownstreamEvents: function (container, downstreamEvents) {
			_log.debug(TAG, "... injecting downstream events into component: " + container.getComponentInstanceID());
			for (var i = 0; i < downstreamEvents.length; ++i) {
				var inputEvent = createInputEvent.call(this, downstreamEvents[i]);
				if (inputEvent instanceof Documa.components.ServiceResponseEvent) {
					container.getServiceEventProxy().injectDownstreamEvent(inputEvent);
				} else if (inputEvent instanceof Documa.components.IntervalInputEvent) {
					container.getRuntimeEventProxy().injectDownstreamEvent(inputEvent);
				} else if (inputEvent instanceof Documa.components.TimeoutInputEvent) {
					container.getRuntimeEventProxy().injectDownstreamEvent(inputEvent);
				} else if (inputEvent instanceof Documa.components.StartIntervalEvent) {
					container.getRuntimeEventProxy().injectDownstreamEvent(inputEvent);
				} else if (inputEvent instanceof Documa.components.ComponentCallEvent) {
					throw new Error("Unexpected call event detected during migration commit phase on receiver-side!");
				} else {
					throw new Error("Not supported input event detected!");
				}
			}
		},
		/**
		 * Returns array of component state items. Each contains the checkpoints and events as well as the
		 * component instance id.
		 *
		 * @returns {Array.<Documa.distribution.migration.MigrationStateObject>}
		 */
		getStateObjects: function () {
			return this._statedata;
		}
	};
})());
