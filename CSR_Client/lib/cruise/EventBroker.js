Ext.namespace('Ext.cruise.client');
/**
 * @class Ext.cruise.client.EventBroker
 * This class provides an PubSub event broker for the CRUISe Client Runtime.
 * The events are managed by channels, which are defined by a channel name and a
 * data type.
 *
 * @author <a href="mailto:stefan.pietschmann">Stefan Pietschmann</a>
 * @author Carsten Radeck
 * @author Gerald Huebsch
 * @author Johannes Waltsgott
 */
Ext.cruise.client.EventBroker = Ext.extend(Object, {
	channels : null,
	log : null,
	screenflowManager : null,

	/*
	 * tuple(cid, eventName) --> channel_id*
	 *
	 * structure:
	 * {
	 * 		cid1: {
	 * 				eventName_foo: [channel_1...n],
	 * 				eventName_bar: [channel_m]
	 * 			 },
	 * 		cid2: {
	 * 				eventName_foobar: [channel_b...k]
	 * 			 }
	 * 		...
	 * }
	 *
	 * usage:
	 * var an_array_of_channel_ids= this.___mappings[cid][eventName];
	 */
	___mappings : null,

	/**
	 * The constructor of the Event Broker
	 * @constructor
	 */
	constructor : function(log) {
		/* set up internal data structures */
		this.channels = {};
		this.___mappings = {};

		this.log = log;
		Ext.cruise.client.EventBroker.superclass.constructor.call(this);
	},

	/**
	 * Resets this runtime component to enable the execution of a new application on
	 * the fly.
	 */
	reset : function() {
		for (var cname in this.channels) {
			if (this.channels[cname] && this.channels[cname].isSystemChannel)
				continue;
			try {
				this.removeChannel(cname);
			} catch(e) {
				this.log.fatal(e);
			}
		}
	},

	serializeCommunicationModel : function() {
		var res = "<communicationModel>";
		var cm = applicationManagerInstance.getComponentManager();

		for (var cname in this.channels) {
			var channel = this.channels[cname];
			if (channel.isSystemChannel)
				continue;

			var type = channel.getChannelType();
			res += "<channel xsi:type=\"" + Ext.cruise.client.Constants._CCM_NS_IE + type + "\" name=\"" + cname + "\" ";
			if (type == "BackLink" && channel.syncThreshold != null)
				res += "syncThreshold=\"" + channel.syncThreshold + "\"";
			res += ">";
			if (Ext.isArray(channel.dataType)) {
				for (var idx = 0; idx < channel.dataType.length; ++idx) {
					res += "<parameter type=\"" + channel.dataType[idx] + "\" />";
				}
			} else {
				// currently the channel type is unknown if channels are created from scratch
				// -> workaround: take the type signature of the first listener
				// TODO fix
				var fcid = channel.listeners[0].cid;
				var fcop = channel.listeners[0].operationName;

				var ps = cm.getMediationConfig()[fcid]["operations"][fcop].parameters;
				for (var idx = 0; idx < ps.length; ++idx) {
					res += "<parameter name= \"" + ps[idx].name + "\" type=\"" + ps[idx].type + "\" />";
				}
			}
			for (var lidx = 0; lidx < channel.listeners.length; ++lidx) {
				var listener = channel.listeners[lidx];
				if (type == "BackLink" && listener.callbackId)
					continue;

				var compConfig = cm.getComponentConfig(listener.cid);
				var opName = listener.operationName;
				var i = 0;
				var cops;
				if (type == 'PropertyLink')
					cops = compConfig.getElementsByTagName('property');
				else
					cops = compConfig.getElementsByTagName('operation');

				for (; i < cops.length; ++i) {
					if (cops[i].getAttribute('name') == opName) {
						break;
					}
				}
				switch (type) {
					case 'Link':
						res += "<subscriber operation=\"//@conceptualModel/@components/@component[name='" + cm.getComponentNameByID(listener.cid) + "']/@operation." + i + "\"/>";
						break;
					case 'BackLink':
						res += "<replier operation=\"//@conceptualModel/@components/@component[name='" + cm.getComponentNameByID(listener.cid) + "']/@operation." + i + "\"/>";
						break;
					case 'PropertyLink':
						res += "<participant property=\"//@conceptualModel/@components/@component[name='" + cm.getComponentNameByID(listener.cid) + "']/@property." + i + "\"/>";
						break;
				}
			}

			for (var eidx = 0; eidx < channel.events.length; ++eidx) {
				var event = channel.events[eidx];
				if (type == "BackLink" && !event.callbackId)
					continue;

				var compConfig = cm.getComponentConfig(event.cid);
				var evName = event.name;
				var j = 0;
				var cevs = compConfig.getElementsByTagName('event');
				for (; j < cevs.length; ++j) {
					if (cevs[j].getAttribute('name') == evName) {
						break;
					}
				}
				switch (type) {
					case 'Link':
						res += "<publisher event=\"//@conceptualModel/@components/@component[name='" + cm.getComponentNameByID(event.cid) + "']/@event." + j + "\"/>";
						break;
					case 'BackLink':
						res += "<requestor event=\"//@conceptualModel/@components/@component[name='" + cm.getComponentNameByID(event.cid) + "']/@event." + j + "\"/>";
						break;
				}
			}

			res += "</channel>";
		}

		return res + "</communicationModel>";
	},

	/**
	 * Method to subscribe an operation as an event handler to an event.
	 * Note: the channel, dataType and eventName for this event has to be registered
	 * before.
	 * @param {string} eventName the name of the event
	 * @param {string} dataType the datatype of the args
	 * @param {string} channel the channels name
	 * @param {Object} fn the handler function
	 * @param {Object} scope the scope of the handler function
	 * @param {string} callbackId the id of the associated callback
	 * @function
	 * @public
	 */
	subscribe : function(cid, operationName, dataType, channel, fn, scope, callbackId) {
		this.log.debug('[EvBroker] New event subscription: ', cid, operationName, channel, Ext.isFunction(fn));
		if (this.channels[channel]) {
			if (this.channels[channel].checkType(dataType) == true)
				this.channels[channel].subscribe(cid, operationName, fn, scope, callbackId);
		} else {
			this.log.error('[EvBroker] Channel \'' + channel + '\' unknown!');
		}
	},

	/**
	 * Method to subscribe a operation as an event handler to an event.
	 * Note: the channel, dataType and eventName for this event has to be registered
	 * before.
	 * @param {string} eventName the name of the event
	 * @param {string} channel the channels name
	 * @param {Function} handler the handler function
	 * @param {Object} scope the scope of the handler function
	 * @function
	 * @public
	 */
	unsubscribe : function(channel, handler, scope) {
		if (this.channels[channel]) {
			this.channels[channel].unsubscribe(handler, scope);
		}
	},

	/**
	 * Unsubscribes a component's operations and deregisters its events as
	 * publishers.
	 *
	 * @param {String} cid the component's id
	 */
	deregisterComponent : function(cid) {
		if (!cid)
			return false;
		for (var channelName in this.channels) {
			var channel = this.channels[channelName];
			if (channel == undefined || channel == null || channel.isSystemChannel == true)
				continue;

			var listeners = channel.listeners;
			for (var idx = 0; idx < listeners.length; ++idx) {
				var listener = listeners[idx];

				if (listener.cid == cid) {
					channel.unsubscribe(listener.handler, listener.scope);
				}
			}

			var events = channel.events;
			for (var idy = 0; idy < listeners.length; ++idy) {
				var event = events[idy];

				if (event.cid == cid) {
					channel.removeEvent(event.name);
				}
			}

			// if no publisher or subscriber remains, delete the channel.
			if (listeners.length == 0 || events.length == 0) {
				this.removeChannel(channelName);
			}
		}
		delete this.___mappings[cid];
		return true;
	},

	/**
	 * Method to publish an event.
	 * Note: the channel for this event and data has to be registered before by
	 * calling this.addChannel.
	 * @param {Ext.cruise.client.Message} message a message object
	 * @param {String} cid - Id of the component triggering this event
	 * @function
	 * @public
	 */
	publish : function(message, cid) {
		var channel = null;

		if (cid == undefined || cid == null)
			cid = "___runtime____________";

		/* get channel for tuple{eventName,cid} */
		if (this.___mappings[cid] == undefined || this.___mappings[cid] == null) {
			this.log.error('[EvBroker] Missing mappings for component \'' + cid + '\'.');
			this._recommend(message, cid);
		} else {
			var channel;
			var eName = message.getName();
			//callId = null;
			if (!eName) {
				this.log.info("Callback-Fall todo");
			} else {
				channel = this.___mappings[cid][eName];
				// array
				//this.screenflowManager.changeView(eName);
			}

			if (channel == undefined || channel == null) {
				this.log.error('[EvBroker] Component ', cid, ' isnt supposed to fire event', eName);
				this._recommend(message, cid);
				return;
			}

			//If one message is published on two different channels something goes wrong
			//The body of the message is changed within the channel.publish function so that
			// on the second channel nobody will listen to the message
			//The Backup-Message is used to restore the original body of the message
			//TODO Fix this workaround
			var backupMessage = new Ext.cruise.client.Message();
			backupMessage.setBody(message.getBody());
			backupMessage.setName(message.getName());
			backupMessage.setCallbackId(message.getCallbackId());

			for (var idx = 0; idx < channel.length; ++idx) {
				if (this.channels[channel[idx]] == undefined || this.channels[channel[idx]] == null)
					continue;

				if (idx < 1) {
					this.channels[channel[idx]].publish(message, cid);
					this.log.debug('[EvBroker] Event published: ', eName, cid, channel[idx]);
				} else {
					message.setBody(backupMessage.getBody());
					message.setName(backupMessage.getName());
					message.setCallbackId(backupMessage.getCallbackId());
					this.channels[channel[idx]].publish(message, cid);
					this.log.debug('[EvBroker] Event published: ', eName, cid, channel[idx]);
				}
			}
		}
	},

	/**
	 * @private
	 * @param {Ext.cruise.client.Message} message
	 * @param {String} cid
	 */
	_recommend : function(message, cid) {
		if (applicationManagerInstance.getIsRecommendationEnabled() && applicationManagerInstance.getComponentManager().isReady(cid))
			applicationManagerInstance.getRecommendationManager().recommendComponentsByEvent(cid, message);
	},

	/**
	 * Method to add a channel. It registers the channel name and the data type.
	 * @param {string} name the name of the channel
	 * @param {Array} dataType the sementic data type (array of URIs).
	 * @function
	 * @public
	 */
	addSystemChannel : function(name, dataType) {
		if (this.channels[name] == undefined) {
			this.channels[name] = new Ext.cruise.client.Channel(name, "Link", dataType, true);
			this.log.debug('[EvBroker] Systemchannel \'' + name + '\' added with dataType', dataType);
		} else {
			this.log.warn('[EvBroker] Adding system channel failed: ', name, " already exists.");
		}
	},

	/**
	 * Method to add a channel. It registers the channel name and the data type.
	 * @param {String} name the name of the channel
	 * @param {String} type the channel type (Link, BackLink, PropertyLink)
	 * @param {Array} dataType the sementic data type (array of URIs).
	 * @param {Number} syncThreshold the time intervall for a callback.
	 * @function
	 * @public
	 */
	addChannel : function(name, type, dataType, syncThreshold) {
		if (this.channels[name] == undefined) {
			this.channels[name] = new Ext.cruise.client.Channel(name, type, dataType, false, syncThreshold);
			this.log.debug('[EvBroker] Channel<' + type + '> \'' + name + '\' added with dataType', dataType);
			return true;
		} else {
			this.log.warn('[EvBroker] Adding channel failed: ', name, " already exists.");
			return false;
		}
	},

	/**
	 * Method to remove a channel.
	 * @param {string} name the name of the channel
	 * @function
	 * @public
	 */
	removeChannel : function(name) {
		if (this.channels[name]) {
			var x = this.channels[name];

			/* update ___mappings variable */
			var events = x.events;
			for (var comp in this.___mappings) {
				for (var index = 0; index < events.length; ++index) {
					if (!this.___mappings[comp][events[index].name])
						continue;

					var neu = this.___mappings[comp][events[index].name].remove(name);
					if (neu.length == 0)
						neu = undefined;
					this.___mappings[comp][events[index].name] = neu;
				}
			}

			/* remove all events */
			for (var i = 0; i < x.events.length; ++i) {
				this.removeEventFromChannel(x.events[i].name, name);
			}

			/* remove channel-to-operation-mappings in all affected proxies */
			for (var i = 0; i < x.listeners.length; ++i) {
				if (Ext.isFunction(x.listeners[i].scope.removeOperationMapping))
					x.listeners[i].scope.removeOperationMapping(name);
			}
			x.dispose();
			delete this.channels[name];

			this.log.debug('[EvBroker] Channel removed:', name);
		}
	},

	removeMapping : function(cid, eventName, channelName) {
		var test = this.___mappings[cid][eventName];

		if (test && test.length < 2) {
			this.___mappings[cid][eventName] = null;
		} else {
			var idx = this.___mappings[cid][eventName].indexOf(channelName);
			if (idx != -1)
				this.___mappings[cid][eventName].splice(idx, 1);
		}

		this.log.debug('[EvBroker] Removed Channelmapping for component ' + cid + ' and event ' + eventName);
	},

	/**
	 * Adds an event to a channel
	 * @param {string} name the event name
	 * @param {string} dataType the datatype of the later event data as string
	 * @param {string} channel the channels name
	 * @param {string} instid id of emitting component instance
	 * @param {string} callbackId the id of the associated callback
	 * @function
	 * @public
	 */
	addEventToChannel : function(name, dataType, channel, instid, callbackId) {
		if (this.channels[channel] != undefined && this.channels[channel] != null) {
			if (instid == undefined || instid == null)
				instid = "___runtime____________";

			//this.channels[channel].addEvent(name,dataType,cid);
			this.channels[channel].addEvent(name, cid, callbackId);

			/* update mappings */
			if (this.___mappings[cid] == undefined || this.___mappings[cid] == null) {
				this.___mappings[cid] = {};
			}
			if (this.___mappings[cid][name] == undefined || this.___mappings[cid][name] == null || !Ext.isArray(this.___mappings[cid][name])) {
				this.___mappings[cid][name] = new Array();
			}
			if (this.___mappings[cid][name].indexOf(channel) == -1)
				this.___mappings[cid][name].push(channel);
		}
	},

	/**
	 * Determines all operations registered as subscriber at one or more channels.
	 *
	 * @param {String} cid the component id
	 * @return {Array} array of names of operations which are registered as handlers,
	 * i.e. subscribers, at one or more channels.
	 */
	listHandlers : function(cid) {
		var res = [];
		for (var cname in this.channels) {
			//exclude system channels
			if (this.channels[cname] == undefined || this.channels[cname].isSystemChannel)
				continue;
			var listeners = this.channels[cname].listeners;
			for (var i = listeners.length - 1; i >= 0; i--) {
				var listener = listeners[i];
				if (listener.cid == cid) {
					res.push(listener.operationName);
				}
			};
		}

		return res;
	},

	/**
	 * Removes an event from a channel.
	 * @param {string} name the event name
	 * @param {string} channel the channels name
	 * @function
	 * @public
	 */
	removeEventFromChannel : function(name, channel) {
		if (this.channels[channel] != undefined && this.channels[channel] != null) {
			this.channels[channel].removeEvent(name);
		}
	},

	/**
	 * set the ScreenflowManager
	 * @function
	 * @public
	 * @param {Object} screenflowManager
	 */
	setScreenflowManager : function(screenflowM) {
		this.screenflowManager = screenflowM;
	}

});

/**
 * @class Ext.cruise.client.Channel Represents a single communication channel.
 * For internal usage only.
 * @private
 */
Ext.cruise.client.Channel = Ext.extend(Object, {
	id : null,
	dataType : null,
	type : null,
	events : null,
	listeners : null,
	mediationInfo : null,
	mediator : null,
	isSystemChannel : false,
	syncThreshold : null,
	syncTimestamps : null,
	isBidirectional : false,

	constructor : function(id, type, dataType, isSystemChannel, syncThreshold) {
		this.isSystemChannel = isSystemChannel || false;
		this.id = id;
		this.type = type;
		this.dataType = dataType;
		this.events = new Array();
		this.listeners = new Array();
		this.syncThreshold = syncThreshold;
		if (syncThreshold)
			this.syncTimestamps = new Array();
		this.log = log4javascript.getDefaultLogger();
		Ext.cruise.client.Channel.superclass.constructor.call(this);
	},

	dispose : function() {
		delete this.events;
		delete this.listeners;
		delete this.callbacks;
		delete this.mediationInfo;
		delete this.mediator;
		delete this.syncThreshold;
		delete this.syncTimestamps;
	},

	setIsBidirectional : function(bool) {
		this.isBidirectional = bool;
	},

	getChannelType : function() {
		return this.type;
	},

	/**
	 * Remove the event with the given channel-wide unique name.
	 * @param {String} name
	 */
	removeEvent : function(name) {
		var hit = -1;
		for (var i = 0, length = this.events.length; i < length; ++i) {
			var event = this.events[i];
			if (event.name == name) {
				if (event.callback != undefined || event.callback != null) {
					//handle error case and inform non-callback-listener because this is the response
					// component
					var message = new Ext.cruise.client.Message();
					message.setStatus(410);
					message.setName(event.name);
					this.publish(message, null, event.cid, true);
					delete message;
				}
				hit = i;
				break;
			}
		}
		if (hit != -1) {
			this.events.splice(hit, 1);
		}
	},

	/**
	 * Add the event with the given channel-wide unique name and the instance ID of
	 * the
	 * publisher.
	 * @param {String} name
	 * @param {String} instid
	 * @param {String} callbackId
	 */
	addEvent : function(name, instid, callbackId) {
		var event = {
			'name' : name,
			'instid' : instid,
			'callbackId' : callbackId
		};

		this.events.push(event);
		this.log.debug('[Channel \'' + this.id + '\'] Added event \'' + name + '\' (instid: \'' + instid + '\') to channel \'' + this.id + "'");
	},

	/**
	 * Subscribe for events on that channel.
	 * @param {String} instid the ID of the subscriber
	 * @param {String} operationName the name of the operation connected to the
	 * channel (viewed from composition model)
	 * @param {Function} fn the handler, i.e proxy.notify
	 * @param {Object} scope the scope, i.e the proxy
	 * @param {String} callbackId
	 */
	subscribe : function(instid, operationName, fn, scope, callbackId) {
		try {
			var known = false;
			// iterate over set of subscribers and check for possible duplicates
			for (var i = 0, length = this.listeners.length; i < length; ++i) {
				var x = this.listeners[i];

				if (x == undefined || x == null)
					continue;

				// check if there is a subscription from a component with given instid operation
				// and handler
				if (x.instid == instid && x.operationName == operationName && x.handler == fn && x.scope == scope) {
					known = true;
					this.log.warn('[Channel \'', this.id, '\'] subscription already known: ', cid, operationName);
					break;
				}
			}

			// no previous subscription found
			if (known == false) {
				this.listeners.push({
					'instid' : instid,
					'operationName' : operationName,
					'handler' : fn,
					'scope' : scope,
					'callbackId' : callbackId
				});

				this.log.debug('[EvBroker] Operation "' + operationName + '" (' + instid + ') subscribed to channel ' + this.id + '.');
			}
		} catch(e) {
			this.log.error("[Channel '" + this.id + "']", e);
		}
	},

	/**
	 * Remove a subscriber.
	 * @param {Function} handler the handler, i.e proxy.notify
	 * @param {Object} scope the scope, i.e proxy
	 */
	unsubscribe : function(handler, scope) {
		var index = -1, entry = null;

		// iterate over set of registered subscribers
		for (var idx = 0, length = this.listeners.length; idx < length; ++idx) {
			entry = this.listeners[idx];
			if (entry.handler == handler && entry.scope == scope) {
				// found index of given handler to unsubscribe
				index = idx;
				break;
			}
		}

		if (index != -1) {
			// index found -> there is a handler to unsubscribe
			this.log.debug('[Channel \'' + this.id + '\'] unsubscribe ', entry.instid);

			// remove subscription on determined index
			this.listeners.splice(index, 1);
		}
	},

	/**
	 * This method checks whether the type of the specified data matches the expected
	 * type.
	 *
	 * @function
	 * @private
	 */
	checkType : function(data) {
		// hm... well, do some more sophisticated stuff here ;)
		return true;
	},

	checkTypeSingle : function(data, idx) {
		return true;
	},
	
	/**
	 * Checks whether the synchronisation for propertyLink is necessary.
	 * @function
	 * @private
	 * @param {String} value the new value for the property
	 * @param {String} property the name of the property
	 * @param {String} cid  the id of the component
	 * @returns {Boolean}
	 */
	isSyncNecessary : function(value, property, cid) {
		var c = applicationManagerInstance.getComponentManager().getComponentInstance(cid);
		var oldValue = c.getProperty(property);
		if (oldValue == value)
			return false;
		return true;
	},
	/**
	 * Checks whether the synchronisation for propertyLink is necessary.
	 * @function
	 * @private
	 * @param {String} value the new value for the property
	 * @param {String} property the name of the property
	 * @param {String} cid  the id of the component
	 * @returns {Boolean}
	 */
	isValidSyncIntervall : function(cid, time) {
		if (!this.syncTimestamps)
			this.syncTimestamps = new Array();

		for (var i = 0; i < this.syncTimestamps.length; i++) {
			if (this.syncTimestamps[i].cid == cid) {
				var diff = (time.getTime() - this.syncTimestamps[i].lastTime.getTime());
				if (diff < (this.syncThreshold * 1000))
					return false;
				else {
					this.syncTimestamps[i].lastTime = time;
					return true;
				}
			}
		}
		this.syncTimestamps.push({
			"cid" : cid,
			"lastTime" : time
		});
		return true;
	},

	/**
	 * Publish an event on this channel.
	 * @param {Ext.cruise.client.Message} message a message object
	 * @param {String} instid the component instance that fires the event
	 * @param {Boolean} isChannelTriggered indicates that the invocation is triggered
	 * from the channel an the message status should not be changed
	 */
	publish : function(message, instid, isChannelTriggered) {
		var validEvent = false;
		var validCallback = false;
		var timestamp = new Date();

		var eventName = message.getName(), eventData = message.getBody(), callback = message.getCallbackId();

		var callback, callbackListener, eventCallbackId;

		/* validate the request */
		for (var j = 0, length = this.events.length; j < length; ++j) {
			var b = this.events[j];
			if (b == undefined || b == null)
				continue;

			if (b.name == eventName && b.instid == instid) {
				validEvent = true;
				eventCallbackId = b.callbackId;

				//check for callback
				if (callback) {
					for (var i = 0, length = this.listeners.length; i < length; ++i) {
						var l = this.listeners[i];
						if (l == undefined || l == null)
							continue;

						if (l.callbackId == callback) {
							validCallback = true;
							callbackListener = l;
							break;
						}
					}
				}
				break;
			}
		}

		if (validEvent == false) {
			this.log.fatal("[Channel '" + this.id + "'] invalid event", eventName, "fired by", instid);
		}

		this.log.debug("[Channel '" + this.id + "'] publishing", eventName, "fired by", instid);

		if (this.isSystemChannel == true) {
			/* if this is a system channel, there is at the moment no semantic type to
			 * compare. thus, we simply forward the data. */
			if (this.checkType(eventData)) {
				this.log.debug('[Channel \'' + this.id + '\'] System Component ', instid, ' publishing ' + eventName + ': ' + eventData);

				for (var idx = 0, listeners_length = this.listeners.length; idx < listeners_length; ++idx) {
					var listener = this.listeners[idx];
					try {
						listener.handler.call(listener.scope, message, this.id);
					} catch(EXE) {
						this.log.error('[Channel ' + this.id + ']', EXE);
					}
				}
			}
		} else if (validEvent && !callback) {
			/* in case of application channels check whether conversion of parameters are
			 * necessary */
			if (this.mediator == null) {
				this.mediator = applicationManagerInstance.getMediator();
			}
			if (this.mediationinfo == null) {
				this.mediationInfo = applicationManagerInstance.getComponentManager().getMediationConfig();
			}
			if (this.mediationInfo[instid] == undefined) {
				this.log.fatal("[Channel '" + this.id + "'] No mediation-config for", cid);
				return;
			}
			this.log.debug('[Channel \'' + this.id + '\'] Component ', instid, ' publishing ' + eventName);

			/* assume that #fired parameters= #channel parameter = #receiver parameters in
			 * composition model */
			var sourceParameters = this.mediationInfo[instid].events[eventName].parameters;
			var dataCache = {};

			/* iterate all subscribers of this channel */
			var isListenerWithoutCallback = false;

			for (var idx = 0, listeners_length = this.listeners.length; idx < listeners_length; ++idx) {
				var listener = this.listeners[idx];
				if (listener.instid == undefined) {
					/* in this case we assume that it is a system component (e.g the rule engine) and
					 * simply forward data */
					try {
						listener.handler.call(listener.scope, message, this.id);
					} catch (EXE) {
						this.log.error('[Channel \'' + this.id + '\']', EXE);
					}
				} else {
					var opName = listener.operationName;
					var callbackIdListener = listener.callbackId;

					if ((callbackIdListener != null || callbackIdListener != undefined))
						continue;

					isListenerWithoutCallback = true;

					var targetParameters;
					if ( typeof (opName) == 'object') {
						targetParameters = this.mediationInfo[listener.instid].properties[opName.propName].parameters;
					} else {
						targetParameters = this.mediationInfo[listener.instid].operations[opName].parameters;
					}

					var mediated_eventData = {};
					for (var g = 0, sp_length = sourceParameters.length; g < sp_length; ++g) {
						if (isChannelTriggered)
							break;

						/* find corresponding index in operation parameters */
						var targetIdx;
						for ( targetIdx = targetParameters.length - 1; targetIdx >= 0; --targetIdx) {
							if (targetParameters[targetIdx].index_component == g)
								break;
						};

						var sourceParamName = sourceParameters[g].name;
						var targetParamName = targetParameters[g].name;

						if (targetIdx == -1) {
							mediated_eventData[g] = eventData[g];
							continue;
						}

						var sourceClassURI = sourceParameters[g].type_component;
						var targetClassURI = targetParameters[g].type_component;
						if (sourceClassURI != targetClassURI) {
							/* check whether the data were already transformed for this target class (only
							 * possible if there are multiple subscribers) */
							if (!dataCache[g] || !dataCache[g][targetClassURI]) {
								this.log.info('cast required', sourceClassURI, targetClassURI);
								// TODO use async. version
								var converted = this.mediator.convertSynch(eventData[sourceParamName], sourceClassURI, targetClassURI);
								if (converted == null) {
									this.log.error('[Channel \'' + this.id + '\'] cast failed... sending original data...');
									converted = eventData[sourceParamName];
								}
								dataCache[g] = {};
								dataCache[g][targetClassURI] = converted;
							}
							/* copy (converted) data to the array with resulting event data */
							mediated_eventData[targetParamName] = dataCache[g][targetClassURI];
						} else {
							// TODO typecheck versus XSD
							mediated_eventData[targetParamName] = eventData[sourceParamName];
						}
					}

					if ( typeof (opName) == 'object' && !this.isSyncNecessary(mediated_eventData[opName.propName], opName.propName, listener.instid)) {
						continue;
					}

					try {
						/* forward resulting event data to the handler of the subscriber, i.e the notifiy
						 * method of the proxy */
						if (!isChannelTriggered)
							message.setStatus(200);

						message.setCallbackId(eventCallbackId);
						message.setBody(mediated_eventData);

						if (this.syncThreshold)
							message.setSyncThreshold(this.syncThreshold);

						listener.handler.call(listener.scope, message, this.id);
					} catch (EXE) {
						this.log.error('[Channel \'' + this.id + '\']', EXE);
					}
				}
			}

			if (!isListenerWithoutCallback && (eventCallbackId != null || eventCallbackId != undefined)) {
				/* no listener exists - message 404 */
				message.setStatus(404);
				message.setCallbackId(eventCallbackId);
				this.publish(message, instid, true);
			}
		} else if (validEvent && callbackListener) {
			if (this.syncThreshold != null || this.syncThreshold != undefined) {
				if (!this.isValidSyncIntervall(instid, timestamp))
					return;
			}
			//TODO: mediation hinzuf�gen
			try {
				/* forward resulting event data to the handler of the subscriber, i.e the notifiy
				 * method of the proxy */
				if (!isChannelTriggered)
					message.setStatus(200);
				message.setCallbackId(undefined);
				callbackListener.handler.apply(callbackListener.scope, [message, this.id]);
			} catch (EXE) {
				this.log.error('[Channel \'' + this.id + '\']', EXE);
			}
		}
	}

});
