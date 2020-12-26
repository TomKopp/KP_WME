"use strict";
Ext.namespace('Documa.communication');

Documa.require('Documa.util.Logger');
Documa.require('Documa.util.Util');
Documa.require('Documa.components.ComponentCallEvent');
Documa.require('Documa.components.ComponentMessage');
Documa.require('Documa.components.ComponentEventProxy');

/**
 * @class
 * @extends {Documa.components.ComponentEventProxy}
 */
Documa.components.ApplicationEventProxy = Ext.extend(Documa.components.ComponentEventProxy, (function(){
	const TAG = "Documa.components.ApplicationEventProxy";
	const LOG = Documa.util.Logger;
	const UTIL = Documa.util.Util;
	return {
		/**
		 * Constructor of communication proxy.
		 *
		 * @param {Documa.components.ComponentContainer} container
		 */
		constructor: function(container){
			Documa.components.ApplicationEventProxy.superclass.constructor.call(this);
			this._container = container;
			this._comp = container.getComponentInstance();
			this._cid = container.getComponentID();
			this._instid = container.getComponentInstanceID();
			this._eventBroker = Documa.RuntimeManager.getEventBroker();
			this._eventQueue = [];
			this._mappings = {};
			this._inputEventBuffer = container.getInputEventBuffer();
			this._eventHandlerRegistry = {};
		},

		destroy: function(){
			delete this._container;
			delete this._comp;
			delete this._eventBroker;
			UTIL.clearArray(this._eventQueue);
			delete this._eventQueue;
			delete this._mappings;
			delete this._inputEventBuffer;
		},

		setComponentInstance: function(inst){
			this._comp = inst;
			LOG.debug(TAG, '... proxy set up for component with id \'' + this._cid + '\'.');
		},

		/**
		 * Called during state injection phase. It forwards activity event to component instance despite
		 * the blockade during the migration prepare phase at receiver-side.
		 *
		 * @param {Documa.components.ComponentCallEvent} inputEvent
		 */
		injectEvent: function(inputEvent){
			if(!this._blocked) {
				throw new Error("Call event proxy is not in expected blocking state!");
			}

			LOG.debug(TAG, "... injecting call event!");
			let message = inputEvent.getMessage();
			let elemName = inputEvent.getElementName();
			// decide between an operation or a property
			switch (inputEvent.getElementType()) {
				case Documa.components.InterfaceElements.PROPERTY:
					LOG.debug(TAG, "... calling property: " + elemName);
					// *************************************************
					// CALL PROPERTY EVENT *****************************
					// *************************************************
					let newValue = message.getBody();
					// determine property value
					if(Ext.isObject(newValue) || Ext.isArray(newValue)) {
						newValue = newValue[elemName];
					}
					// set property
					this._container.setProperty(elemName, newValue);
					break;
				case Documa.components.InterfaceElements.OPERATION:
					LOG.debug(TAG, "... calling operation: " + elemName);
					// *************************************************
					// CALL OPERATION EVENT ****************************
					// *************************************************
					// invoking operation with the help of the current container instance
					this._container.invokeOperationWithMessage(elemName, message);
					break;
			}
		},

		/**
		 * Called at the commitment phase of a running migration transaction on receiver-side.
		 *
		 * @param {Documa.components.ComponentCallEvent} downstreamEvent
		 */
		injectDownstreamEvent: function(downstreamEvent){
			if(this._blocked) {
				throw new Error("Unexpected blocking state of service response event proxy!");
			}

			throw new Error("Not implemented yet!");
		},

		/**
		 * Hooks the handler-function for the specified channel.
		 *
		 * @public
		 * @param {String} channelName ID of the channel
		 * @param {Object} handleObj an object encapsulating the Handler-function's name for the specified channel
		 * in scope of the component-instance
		 */
		addOperationMapping: function(channelName, handleObj){
			if(!handleObj) {
				LOG.error(TAG, '... proxy(' + this._instid + '): handle object is not set.');
				return;
			}

			if(!this._mappings[channelName]) {
				this._mappings[channelName] = [];
			}
			this._mappings[channelName].push(handleObj);
			LOG.debug(TAG, '... proxy(' + this._instid + ') added mapping ' + channelName + ' ' + handleObj + ' ' + this._mappings[channelName]);
		},

		/**
		 * Unbinds the handler-function of the specified channel.
		 * @param {String} channel ID of the channel
		 * @param {String} operation name of the operation to be removed as a handler for
		 * the channel. If not set, all bound operations are removed.
		 * @function
		 * @public
		 */
		removeOperationMapping: function(channel, operation){
			if(!this._mappings[channel]) {
				LOG.error(TAG, ' ... proxy (' + this._instid + ') channel unknown!');
				return;
			}
			if(operation === undefined || operation === null || typeof operation !== 'string') {
				delete this._mappings[channel];
				this._mappings[channel] = [];
			} else
				this._mappings[channel].remove(operation);

			LOG.debug(TAG, '... proxy(' + this._instid + ') removedOM ', channel);
		},

		/**
		 * @return the id of this proxy's component.
		 */
		getComponentId: function(){
			return this._cid;
		},

		/**
		 * @return the instance id of this proxy's component
		 */
		getComponentInstanceId: function(){
			return this._instid;
		},

		/**
		 *
		 * @param {String} channel
		 * @return {boolean} true if this proxy is registered for the specified channel
		 */
		listensOn: function(channel){
			if(channel === undefined || channel === null || typeof channel !== 'string')
				return false;
			if(this._mappings[channel] === undefined || this._mappings[channel] === null)
				return false;
			return this._mappings[channel].length > 0;
		},

		/**
		 * Blocks this proxy, i.e all in- and outgoing events are intercepted and
		 * queued internally until the proxy gets unblocked (see
		 * CommunicationProxy#free()).
		 * @function
		 * @public
		 */
		block: function(){
			LOG.debug(TAG, "... blocking call events on application layer for component {" + this._instid + "}");
			this._blocked = true;
		},

		/**
		 * Unblocks this proxy, i.e all in- and outgoing events are processed normally.
		 * Internally queued events are transmitted to the underlying component resp. the
		 * eventbroker.
		 * @function
		 * @public
		 */
		unblock: function(){
			this._blocked = false;
			LOG.debug(TAG, "... component {" + this._instid + "} is now unblocked!");

			// transmit queued events
			while (this._eventQueue.length > 0) {
				let event = this._eventQueue.shift();
				if(event.direction === 'IN') {
					this.notify(event.message, event.channel);
				} else {
					this.publish(event.message);
				}
			}
		},

		highlightComponent: function(){
			throw new Error("Not implemented yet!");
		},

		/**
		 * Callback-function invoked by the dragZone.
		 * @function
		 * @public
		 * @param {String} operationName
		 * @param {Object} message
		 */
		notifyDrag: function(operationName, message){
			throw new Error("Not implemented yet!");
		},

		/**
		 * Function that is used to fire an event and invoked by the component. Its the
		 * publisher-side of a specified channel.
		 * @function
		 * @public
		 * @param {Ext.cruise.client.Message} message a message object
		 */
		publish: function(message){
			// notify container about output event on application layer
			let index = message.getName().indexOf("Changed");
			if(index > 0) {
				let propertyName = message.getName().substring(0, index);
				let newValue = message.getBody()[propertyName];
				this._container.onComponentPropertyChanged(propertyName, newValue);
			}
			if(this._blocked) {
				// check outgoing messages from component instance
				switch (message.getName()) {
					case Documa.components.ComponentLifecycleEvents.BLOCKED:
						// forward message to the component container
						this._container.onComponentLifecycleEvent(message);
						break;
				}
				return;
			}
			// do fancy additional stuff here:--------
			// check for component life cycle events
			switch (message.getName()) {
				case Documa.components.ComponentLifecycleEvents.INITIALIZED:
					this._container.onComponentLifecycleEvent(message);
					return;
				case Documa.components.ComponentLifecycleEvents.PROCESSED:
					this._container.onComponentLifecycleEvent(message);
					return;
				// TODO: add further cases for other life cycle events
			}
			// ---------------------------------------
			try {
				LOG.info(TAG, "... component {" + this._instid + "} publishes " + message.getName());
				this._eventBroker.publish(this._instid, message);
			} catch (error) {
				LOG.error(TAG, error.stack);
			}
		},

		/**
		 * Function that is used to change a component's title (in the surrounding
		 * panel). Can be invoked by components
		 * @function
		 * @public
		 * @param {String} title to be shown in the titlebar
		 * @return {booelan} sucess of title setting
		 */
		setComponentTitle: function(title){
			throw new Error("Not implemented yet!");
		},

		/**
		 * Function that is used to retrieve a component's title (in the surrounding
		 * panel). Can be invoked by components
		 * @function
		 * @public
		 * @return {String} Title currently shown in the component panel, null if no UI
		 * component
		 */
		getComponentTitle: function(){
			throw new Error("Not implemented yet!");
		},

		/**
		 * Method is invoked by the event bus and notifies all on the channel subscribing
		 * components.
		 *
		 * @param {Ext.cruise.client.Message} message
		 *                        message object instance containing
		 *                        all required information
		 * @param {Object} channelName
		 *                        name of the channel the
		 *                        message is send on
		 */
		notify: function(message, channelName){
			let ev = message.getName();
			LOG.info(TAG, '... (' + this._instid + ') notify ' + ev + ' on channel ' + channelName);

			if(Ext.isArray(this._mappings[channelName])) {
				// invoke handlers registered for this channel
				for(let i = 0; i < this._mappings[channelName].length; ++i) {
					try {
						if(typeof (this._mappings[channelName][i]) === 'object') {// in case of
							// PropertyLinks
							let operation = this._mappings[channelName][i];
							if(Ext.isFunction(this._comp[operation.opName])) {
								let newValue = message.getBody();
								if(Ext.isObject(newValue) || Ext.isArray(newValue)) {
									newValue = newValue[operation.propName];
								}
								// ***********************************************************************
								// CALL EVENT BUFFERING **************************************************
								// ***********************************************************************
								/*handlerName, arguments, scope, handler*/
								let handlerContext = new Documa.components.ComponentHandlerContext("", ev, [operation.propName, newValue]);
								if(!this._eventHandlerRegistry[handlerContext.getContextID()]) {
									this._eventHandlerRegistry[handlerContext.getContextID()] = this._container.getComponentInstance().setProperty;
								}
								let callEvent = new Documa.components.ComponentCallEvent(handlerContext, this._instid, this._cid, operation.propName, Documa.components.InterfaceElements.PROPERTY, message);
								// check if component is blocked
								if (this._blocked || !this._container.isInitialized()) {
									LOG.debug(TAG, "... component {" + this._instid + "} is blocked, buffering call event!");
									// adding current event is collected as downstream event, due to the component blocking
									this._inputEventBuffer.addDownstreamEvent(callEvent);
									return;
								} else {
									// current event represent a component's activity
									this._inputEventBuffer.addActivityEvent(callEvent);
								}
								LOG.debug(TAG, "... setting value {" + newValue + "} property {" + operation.propName + "}");
								// calling 'setProperty' of component instance
								this._container.setProperty(operation.propName, newValue, callEvent.getId());
							} else {
								throw new Error("Invalid component implementation! Missing obligatory component function: " + operation.opName);
							}
						} else {
							if(Ext.isFunction(this._comp.invokeOperation)) {
								let opName = this._mappings[channelName][i];
								let body = message.getBody();
								let newBody = {};
								// getting component default configuration based on the composition model
								let config = Documa.RuntimeManager.getComponentManager().getComponentConfig(this._cid, this._instid);
								let operation = config.operations[opName];
								if(!operation) {
									throw new Error("Could not find operation {" + opName + "} in components {" + this._instid + "} configuration settings.");
								}
								// copy values of previous parameters to a new message body
								// containing the same parameter values with names determined
								// from the subscriber component configuration
								for(let paramName in operation) {
									for(let p in body) {
										if (body[paramName]) {
											newBody[paramName] = body[paramName];
											delete body[paramName];
										} else {
											newBody[paramName] = body[p];
											delete body[p];
										}
										break;
									}
								}
								// set new parameter settings into the message body
								message.setBody(newBody);
								// ***********************************************************************
								// CALL EVENT BUFFERING **************************************************
								// ***********************************************************************
								/*handlerName, arguments, scope, handler*/
								let handlerContext = new Documa.components.ComponentHandlerContext("", ev, [message]);

								if(!this._eventHandlerRegistry[handlerContext.getContextID()]) {
									this._eventHandlerRegistry[handlerContext.getContextID()] = this._container.getComponentInstance().invokeOperation;
								}
								// create component call event and add it into the component's event buffer
								let callEvent = new Documa.components.ComponentCallEvent(handlerContext, this._instid, this._cid, opName, Documa.components.InterfaceElements.OPERATION, message);
								// check if component is blocked
								if(this._blocked) {
									this._inputEventBuffer.addDownstreamEvent(callEvent);
									LOG.debug(TAG, "... component {" + this._instid + "} is blocked, buffering call event!");
									return;
								} else {
									this._inputEventBuffer.addActivityEvent(callEvent);
								}
								// calling operation
								this._container.invokeOperationWithMessage(opName, message, callEvent.getId());
							}
						}
					} catch (error) {
						LOG.trace(error);
					}
				}
			} else {
				LOG.warn(TAG, '... (' + this._instid + ') could not find handler for ' + ev);
			}
		},

		/**
		 * Creates a component message instance.
		 * @returns {Documa.components.ComponentMessage}
		 */
		createMessage: function(){
			return new Documa.components.ComponentMessage();
		}
	};
})());
