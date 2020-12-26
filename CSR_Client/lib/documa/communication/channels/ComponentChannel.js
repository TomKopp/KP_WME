Ext.namespace('Documa.communication.channels');

Documa.require('Documa.util.Logger');
Documa.require('Documa.util.Util');

Documa.communication.channels.ChannelTypes = {
	LINK: 0,
	BACKLINK: 1,
	PROPLINK: 2
};

/**
 * @class
 */
Documa.communication.channels.ComponentChannel = Ext.extend(Object, (function() {
	const TAG = "Documa.communication.channels.ComponentChannel";
	const _log = Documa.util.Logger;
	const _util = Documa.util.Util;
	var _cfactory = null;
	
	function validateChannelObject(channelObj) {
		if(!channelObj.type)
			throw new Error("No channel type defined!");
		
		if(!channelObj.name)
			throw new Error("No channel name defined!");
		
		if(!channelObj.sndrr)
			throw new Error("No sender role in channel object defined!");
		
		if(!channelObj.recvr)
			throw new Error("No receiver role in channel object defined!");
		
		if(!channelObj.sender || channelObj.sender.length <= 0)
			throw new Error("No sender component defined in channel object!");
		
		if(!channelObj.receiver || channelObj.receiver.length <= 0)
			throw new Error("No receiver component defined in channel object!");
	}
	
	/**
	 * Check if subscription with specified parameters already exists.
	 *
	 * @param {String} instid id of component instance
	 * @param {String} operationName name of registered operattion
	 * @return {boolean} true if subscription with same given data already exists,
	 * else false
	 */
	function existSubscription(instid, operationName) {
		for(let i = 0; i < this._listener.length; ++i) {
			let subscriber = this._listener[i];
			if(!subscriber)
				continue;
			
			if(subscriber.instid === instid && subscriber.operationName === operationName)
				return true;
		}
		return false;
	}
	
	/**
	 * Returns valid event if given event name and sender id is registered already,
	 * else null.
	 * @param {String} instid id of sender component instance
	 * @param {String} eventName name of message to publish
	 */
	function getValidEvent(instid, eventName) {
		for(let i = 0; i < this._events.length; ++i) {
			let ev = this._events[i];
			if(!ev)
				continue;
			
			if(ev.name === eventName && ev.instid === instid)
				return ev;
		}
	}
	
	return {
		/**
		 * Constructor.
		 *
		 * @constructor
		 * @param {Object} channelObj
		 */
		constructor: function(channelObj) {
			Documa.communication.channels.ComponentChannel.superclass.constructor.call(this);
			_cfactory = new Documa.communication.commands.CommandFactory();
			
			// check internal structure of received channelDecsr object
			validateChannelObject(channelObj);
			
			this._channelObj = channelObj;
			this._id = channelObj.name;
			this._events = [];
			this._listener = [];
			this._mediationInfo = null;
			this._messagebuffer = [];
			this._blocked = false;
		},
		
		/**
		 * Releases internal resources.
		 */
		destroy: function() {
			_log.debug(TAG, "... destroying channel: " + this.getName());
			_util.clearArray(this._events);
			_util.clearArray(this._listener);
			_util.clearArray(this._messagebuffer);
			delete this._channelObj;
			delete this._id;
			delete this._events;
			delete this._listener;
			delete this._messagebuffer;
			delete this._mediationInfo;
			delete _cfactory;
		},
		/**
		 * This channel is blocked during the removal of migrating component.
		 */
		block: function() {
			this._blocked = true;
			_log.debug(TAG, "... channel {" + this.getName() + "} blocked!");
		},
		/**
		 * This channel is unblocked after the migration transaction was completed!
		 */
		unblock: function() {
			this._blocked = false;
			_log.debug(TAG, "... channel {" + this.getName() + "} unblocked!");
			
			// drop buffered messages
			for(let i = 0; i < this._messagebuffer.length; ++i) {
				let obj = this._messagebuffer[i];
				if(obj.local) {
					this.publishLocalMessage(obj.publisher, obj.message);
				} else {
					this.publishRemoteMessage(obj.publisher, obj.message);
				}
			}
		},
		/**
		 * Returns channel's id name.
		 * @returns {String}
		 */
		getName: function() {
			return this._channelObj.name;
		},
		
		getSyncThreshold: function() {
			return this._channelObj.threshold;
		},
		
		getParameterTypes: function() {
			return this._channelObj.params;
		},
		
		/**
		 * Adding event to this channel with given parameter.
		 *
		 * @param {String} instid instance id of emitting component
		 * @param {String} eventName name of event
		 */
		addEvent: function(instid, eventName) {
			let eventItem = {
				'instid': instid,
				'name': eventName
			};
			this._events.push(eventItem);
			_log.info(TAG, '... added event {' + eventName + '} from component instance {' + instid + '}');
		},
		/**
		 * Returns true if this channel includes component with given instance id as subscriber entry.
		 *
		 * @param {String} instid instance id of component
		 * @returns {boolean}
		 */
		containsSubscriber: function(instid) {
			for(let i = 0; i < this._listener.length; ++i) {
				if(this._listener[i].instid === instid)
					return true;
			}
			return false;
		},
		/**
		 * Create subscription to this channel.
		 *
		 * @param {String} instid id of subscriber instance
		 * @param {String} operationName name of operation to be registered as handler
		 * for occurring event
		 * @param {Object} scope execution scope of handler function
		 * @param {Function} handler callback function called on occurring event
		 */
		subscribe: function(instid, operationName, scope, handler) {
			try {
				if(!existSubscription.call(this, instid, operationName)) {
					this._listener.push({
						'instid': instid,
						'operationName': operationName,
						'scope': scope,
						'handler': handler
					});
					_log.debug(TAG, '... operation {' + operationName + '} from component {' + instid + '} subscribed to channel {' + this._id + '}');
				}
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},
		/**
		 * Removes subscription from message receiving component.
		 *
		 * @param {String} instid component instance id
		 * @param {String} operationName name of message processing operation
		 */
		unsubscribe: function(instid, operationName) {
			_log.debug(TAG, "... removing subscription {component: " + instid + ", operation: " + operationName + "}");
			try {
				if(!existSubscription.call(this, instid, operationName)) {
					throw new Error("Subscription from component: " + instid + " does not exist!");
				}
				
				let delIndex = -1;
				for(let i = 0; i < this._listener.length; ++i) {
					let sub = this._listener[i];
					if(sub.instid === instid && sub.operationName === operationName) {
						delIndex = i;
					}
				}
				
				if(delIndex < 0)
					throw new Error("Invalid delete index!");
				
				// remove subscription entry using delete index
				this._listener.splice(delIndex, 1);
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},
		/**
		 * Removes all subscribers from this channel.
		 */
		clearSubscribers: function() {
			_log.debug(TAG, "... clearing all subscribers from channel: " + this._id);
			// remove all entries
			this._listener.splice(0, this._listener.length);
		},
		/**
		 * Component with specified instance id publishes message on this channel and is
		 * executed within the same runtime context. Hence, data mediation must be
		 * executed locally and as part of this method.
		 *
		 * @param {String} instid id of publishing component instance
		 * @param {Ext.cruise.client.Message} message component event message
		 */
		publishLocalMessage: function(instid, message) {
			try {
				_log.debug(TAG, "... publishing local message on channel {" + this._id + "}");
				if(this._blocked) {
					_log.debug(TAG, "... buffering message!");
					this._messagebuffer.push({
						publisher: instid,
						message: message,
						local: true
					});
					return;
				}
				
				let ev = getValidEvent.call(this, instid, message.getName());
				if(!ev) {
					_log.error(TAG, '... component event from instance {' + instid + '} is not valid!');
				}
				
				if(!this._mediationInfo) {
					// getting interface descriptions of each component
					this._mediationInfo = Documa.RuntimeManager.getComponentManager().getMediationConfig();
				}
				
				// getting descriptor config from sender component
				let senderSmcdConfig = this._mediationInfo[instid];
				if(!senderSmcdConfig) {
					_log.error(TAG, '... could not determine smcd configuration for component {' + instid + '}');
				}
				
				if(!senderSmcdConfig.events[ev.name])
					return;
				
				// getting source parameters of current message
				let sourceParameters = senderSmcdConfig.events[ev.name].parameters;
				
				// iterate over set of subscriber enities and call their event handler
				for(let i = 0; i < this._listener.length; ++i) {
					let subscriber = this._listener[i];
					
					if(instid === subscriber.instid) {
						// preventing message cycles
						_log.debug(TAG, "... publishing component is subscribing component, prevented message cycle.");
						continue;
					}
					
					_log.debug(TAG, "... sending message to component {" + subscriber.instid + "}");
					
					// create message copy for modification
					let msg = _util.copyMessage(message);
					
					// test whether the subscriber is locally or remotely executed
					let container = Documa.RuntimeManager.getComponentManager().getContainerElementById(subscriber.instid);
					if(!container) {
						// ***********************************************************************
						// ******* subscriber is executed in a remote execution context **********
						// ***********************************************************************
						msg.setStatus(200);
						msg.setCallbackId(ev.callbackId);
						
						// getting application data for application context identification on server-side
						let appcontext = Documa.RuntimeManager.getApplicationContext();
						let appid = appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_ID);
						let appversion = appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_VERSION);
						let appinstid = appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_INSTID);
						// create publish command from application's and sender component's data
						let publishCmd = _cfactory.createComponentPublishCommand(appid, appversion, appinstid, instid, msg);
						// send command for publishing message on server-side
						Documa.RuntimeManager.getCommunicationManager().sendApplicationLevelMessage(publishCmd);
						_log.debug(TAG, "... publish command sent to server on channel {" + this._id + "}");
					} else {
						// ***********************************************************************
						// ************ subscriber is executed locally ***************************
						// ***********************************************************************
						
						_log.debug(TAG, "... forward message {" + message.getName() + "} to local subscriber component {" + subscriber.instid + "}");
						// getting smcdl descriptor config from subscriber component
						let receiverSmcdConfig = this._mediationInfo[subscriber.instid];
						let targetParameters = null;
						
						// check if subscriber is part of a propertychannel --> a participant
						if(subscriber.operationName.propName) {
							// subscriber is a participant
							targetParameters = receiverSmcdConfig.properties[subscriber.operationName.propName].parameters;
						} else {
							// getting target parameters from subscription operation
							targetParameters = receiverSmcdConfig.operations[subscriber.operationName].parameters;
						}
						
						// create map to get mediated parameters
						let mediatedData = {};
						for(let j = 0; j < sourceParameters.length; ++j) {
							let sourceParamName = sourceParameters[j].name;
							let targetParamName = targetParameters[j].name;
							let stype = sourceParameters[j].type_component;
							let ttype = targetParameters[j].type_component;
							
							// check source parameter type with target parameter type
							if(stype !== ttype) {
								_log.error(TAG, "... type {" + stype + "} of parameter {" + sourceParamName + "} in component {" + instid + "} is different than target type {" + ttype + "} parameter {" + targetParamName + "} in component {" + subscriber.instid + "}");
								throw new Error("Mediation is not yet supported yet!");
								// ****************************************
								// TODO: implement mediation logic here ***
								// ****************************************
							} else {
								// type of source and target parameter are equal
								mediatedData[targetParamName] = message.getBody()[sourceParamName];
							}
						}
						
						msg.setStatus(200);
						// replace old body with mediated data
						msg.setBody(mediatedData);
						msg.setCallbackId(ev.callbackId);
						
						// calling notify method of subscribers communication proxy
						subscriber.handler.call(subscriber.scope, msg, this._id);
					}
				}
			} catch (error) {
				_log.error(TAG, "... (" + instid + ") " + error.stack);
			}
		},
		
		/**
		 * Component with specified instance id publishes message on this channel and it
		 * is executed within a distributed runtime context. Hence, data mediation
		 * happened on server-side during the message forwarding process, i. e. no
		 * mediation logic needed on client-side.
		 *
		 * @param {String} instid id of publishing component instance
		 * @param {Ext.cruise.client.Message} message component event message
		 */
		publishRemoteMessage: function(instid, message) {
			try {
				_log.debug(TAG, "... publishing remote message from distributed sender component {" + instid + "}");
				if(this._blocked) {
					_log.debug(TAG, "... buffering message!");
					this._messagebuffer.push({
						publisher: instid,
						message: message,
						local: false
					});
					return;
				}
				
				let ev = getValidEvent.call(this, instid, message.getName());
				if(!ev) {
					_log.error(TAG, '... component event from instance {' + instid + '} is not valid!');
				}
				
				// iterate over set of subscriber enities and call their event handler
				for(let i = 0; i < this._listener.length; ++i) {
					let subscriber = this._listener[i];
					_log.debug(TAG, "... sending message to component {" + subscriber.instid + "}");
					
					// create message copy for modification
					let msg = _util.copyMessage(message);
					msg.setStatus(200);
					// calling notify method of subscribers communication proxy
					subscriber.handler.call(subscriber.scope, msg, this._id);
				}
			} catch (error) {
				_log.trace(TAG, error);
			}
		},
		/**
		 * Returns subscription entries from specified component instance.
		 *
		 * @param {String} instid component instance id
		 * @returns {Array.<Object.<string, string, object, function>>}
		 */
		getSubscriptions: function(instid) {
			if(!this.containsSubscriber(instid))
				return null;
			
			let result = [];
			for(let i = 0; i < this._listener.length; ++i) {
				let entry = this._listener[i];
				if(entry.instid === instid) {
					result.push(entry);
				}
			}
			return result;
		},
		/**
		 * Determines if a channel is local.
		 * That means that all communication partners are located at this client.
		 *
		 * @returns {Boolean} True if this is a local channel.
		 */
		isLocal: function() {
			// get the client ID from the communication manager
			let thisClientId = Documa.RuntimeManager.getCommunicationManager().getClientID();
			
			// the distribution manager is needed to find client IDs of components
			let distributionManager = Documa.RuntimeManager.getApplicationContext().getDistributionManager();
			
			// compare the client ID to all senders and receivers, this is a local channel if all are equal
			let isLocal = true;
			
			let sender = this._channelObj.sender;
			for(let i = 0; i < sender.length && isLocal; i++) {
				let clientId = distributionManager.getDeviceFromComponent(sender[i].instid).getSessionId();
				isLocal = isLocal && (clientId === thisClientId);
			}
			
			let receiver = this._channelObj.receiver;
			for(let i = 0; i < receiver.length && isLocal; i++) {
				let clientId = distributionManager.getDeviceFromComponent(receiver[i].instid).getSessionId();
				isLocal = isLocal && (clientId === thisClientId);
			}
			
			return isLocal;
		}
	};
})());
