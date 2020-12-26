Ext.namespace('Documa.communication.events');

Documa.require('Documa.util.Logger');

Documa.communication.EventBroker = Ext.extend(Object, (function () {

	var TAG = 'Documa.communication.EventBroker';
	var _log = Documa.util.Logger;

	/* private Attributes ****/

	/**
	 * internal channel registry
	 */
	var _channels = {};

	/**
	 * This array contains the names of all channels that were added successfully.
	 */
	var _addedChannels = [];

	/**
	 * Contains reference to current EventBroker instance.
	 */
	var _self = null;

	/**
	 * Registry of pubisher components containing for each event-name a list of
	 * channels, which should be used for transmission of the event during its
	 * publication.
	 */
	var _publisherRegistry = {};

	/* private Methods ****/

	/**
	 * Helper method to calculate unique callback id.
	 *
	 * @return {String} random unique callback id
	 */
	function generateUniqueCallbackId() {
		function getRandomNumber(range) {
			return Math.floor(Math.random() * range);
		}

		function getRandomChar() {
			var chars = "0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ";
			return chars.substr(getRandomNumber(62), 1);
		}

		function randomID(size) {
			var str = "";
			for (var i = 0; i < size; i++) {
				str += getRandomChar();
			}
			return str;
		}

		return randomID(10);
	}

	/**
	 * For each event of a publisher component there will be an entry containing all
	 * channels, which
	 * will be used to transmit the event to several subscriber components. This
	 * method is responsible
	 * for the creation of such an entry.
	 *
	 * @param {String} instid id of publisher component
	 * @param {String} eventName name of publishers event
	 * @param {Documa.communication.channels.ComponentChannel} channel communication
	 * link that shoud be used to transmit the event
	 * @return {void}
	 */
	function registerEvent(instid, eventName, channel) {
		_log.debug(TAG, "... register event " + eventName + " of publisher component " + instid);
		if (!_publisherRegistry[instid]) {
			// no mapping exists
			_publisherRegistry[instid] = {};
		}

		var senderMap = _publisherRegistry[instid];
		if (!senderMap[eventName]) {// no entry found for given event name
			// create list of channels that should be used for transmitting the specified
			// event
			senderMap[eventName] = [];
		}

		// getting list of channels from event name
		var channelArray = senderMap[eventName];
		if (channelArray.indexOf(channel) == -1) {
			// channel isn't registered yet
			channelArray.push(channel);
		}
	}

	/**
	 * Helper method to add component as event publisher.
	 *
	 * @param {Documa.communiction.channels.Publisher} publisher object representing
	 * publisher component
	 * @param {Documa.communication.channels.ComponentChannel} channel
	 * @return {void}
	 */
	function addPublisher(publisher, channel) {
		var instid = publisher.getInstanceId();
		var evName = publisher.getEventName();

		// 1st add event to channel
		if (publisher instanceof Documa.communication.channels.Requestor) {
			// getting component container of publisher component
			var container = Documa.RuntimeManager.getComponentManager().getContainerElementById(instid);
			if (!container) {
				throw new Error("Could not find container of publisher component with id {" + instid + "}");
			}

			// getting application event proxy from component container
			var proxy = container.getApplicationEventProxy();

			// add mapping between channel and callback operation
			proxy.addOperationMapping(channel.getName(), publisher.getCallbackOperation());

			// create subscription for replier event and use proxy of publisher component to
			// handle the event
			_self.subscribe(instid, channel.getName(), publisher.getCallbackOperation(), proxy, proxy.notify);
		}

		// registering event to internal publisher registry and add it to the channel
		registerEvent(instid, evName, channel);
		channel.addEvent(instid, evName);
	}

	/**
	 * Helper method to add subscriptions.
	 * @return {void}
	 */
	function addSubscriber(subscriber, channel) {
		var instid = subscriber.getInstanceId();

		if (subscriber instanceof Documa.communication.channels.Replier) {
			// register return event on given channel
			var returnEventName = subscriber.getReturnEvent();
			registerEvent(instid, returnEventName, channel);
			channel.addEvent(instid, returnEventName);
		}

		var operation = null;
		if (subscriber instanceof Documa.communication.channels.Participant) {
			// in case of a property link the communication proxy has to use a property
			// specific invocation mechanism,
			// therefore we need an entry describing which property has to be changed
			operation = {
				opName: subscriber.getOperationName(), // participant returns 'setProperty'
				propName: subscriber.getPropertyName()
			};
		} else {
			operation = subscriber.getOperationName();
		}

		var container = Documa.RuntimeManager.getComponentManager().getContainerElementById(instid);
		if (!container) {
			_log.debug(TAG, "... could not determine local container from component instance {" + instid + "}");
			// register a remote subscriber without any proxy information
			_self.subscribe(instid, channel.getName(), operation, null, null);
		} else {
			// container and it's component are integrated locally
			// getting proxy from subscriber component
			var proxy = container.getApplicationEventProxy();

			// map channel to operation for later event notification
			proxy.addOperationMapping(channel.getName(), operation);

			// create subscription for given subscriber element
			_self.subscribe(instid, channel.getName(), operation, proxy, proxy.notify);
		}
	}

	/**
	 * Helper method to add link channel events and subscriptions.
	 *
	 * @param {Documa.communication.channels.LinkChannel} channel link channel to
	 * register
	 * @return {void}
	 */
	function addLinkChannel(channel) {
		// getting publishers for registration of publisher events
		var publishers = channel.getPublisherList();
		var subscribers = channel.getSubscriberList();

		// iterate over publisher set of given channel and add each into internal
		// publisher registry
		for (var i = 0; i < publishers.length; ++i) {
			addPublisher(publishers[i], channel);
		}

		// iterate over subscriber set and add each into internal subscriber registry
		for (var i = 0; i < subscribers.length; ++i) {
			addSubscriber(subscribers[i], channel);
		}
	}

	/**
	 * Helper method for adding and registration of given backlink channel.
	 *
	 * @param {Documa.communication.channels.BackLinkChannel} channel backlink
	 * channel to register
	 * @return {void}
	 */
	function addBacklinkChannel(channel) {
		var rqList = channel.getRequestorList();
		var rpList = channel.getReplierList();

		for (var i = 0; i < rqList.length; ++i) {
			var requestor = rqList[i];
			addPublisher(requestor, channel);
		}

		for (var j = 0; j < rpList.length; ++j) {
			var replier = rpList[j];
			addSubscriber(replier, channel);
		}
		_log.debug(TAG, "... back link channel {" + channel.getName() + "} added");
	}

	/**
	 * Helper method for adding and registration of given property link channel.
	 *
	 * @param {Documa.communication.channels.PropertyLinkChannel} channel property
	 * link channel to register
	 * @return {void}
	 */
	function addProplinkChannel(channel) {
		/* instid, cid, channelName, eventName, clbOpName */
		for (var i = 0; i < channel.getParticipantList().length; ++i) {
			var participant = channel.getParticipantList()[i];
			addPublisher(participant, channel);
			addSubscriber(participant, channel);
		}
		_log.debug(TAG, "... property link channel {" + channel.getName() + "} added");
	}

	/**
	 * Helper method to determine whether specified communication partner was
	 * instantiated locally or not.
	 *
	 * @param {Documa.communication.channels.CommunicationPartner} partner
	 * communication partner from channel object to be tested
	 */
	function isCommunicationPartnerLocal(partner) {
		// ask the ComponentManager if it knows the specified communication partner, if
		// not it must be a remote communication partner
		var container = Documa.RuntimeManager.getComponentManager().getContainerElementById(partner.getInstanceId());
		if (!container) {
			return false;
		}
		return true;
	}

	/**
	 * Removes communication partner objects from channel, which are executed on a
	 * remote runtime context and therefore not part accessible in current runtime.
	 *
	 * @param {Documa.communication.channels.ComponentChannel} channel object
	 * representing a channel between local or remote mashup components
	 */
	function removeRemoteCommunicationPartners(channel) {
		if (channel instanceof Documa.communication.channels.LinkChannel) {
			// remove remote publisher or subscribers
			var publishers = channel.getPublisherList();
			var subscribers = channel.getSubscriberList();
			var remotePublishers = [];
			var remoteSubscribers = [];

			// adding remote publishers to removal list
			for (var i = 0; i < publishers.length; ++i) {
				if (!isCommunicationPartnerLocal(publishers[i])) {
					remotePublishers.push(publishers[i]);
				}
			}

			// adding remote subscribers to removal list
			for (var i = 0; i < subscribers.length; ++i) {
				if (!isCommunicationPartnerLocal(subscribers[i])) {
					remoteSubscribers.push(subscribers[i]);
				}
			}

			// removing all remote publishers
			for (var i = 0; i < remotePublishers.length; ++i) {
				publishers = Documa.util.Util.removeElement(remotePublishers[i], publishers);
			}
			// set list containing local publishers only
			channel.setPublisherList(publishers);

			// removing all remote subscribers
			for (var i = 0; i < remoteSubscribers.length; ++i) {
				subscribers = Documa.util.Util.removeElement(remoteSubscribers[i], subscribers);
			}
			// set list containing local subscribers only
			channel.setSubscriberList(subscribers);
		} else if (channel instanceof Documa.communication.channels.BackLinkChannel) {
			// remove remote requestor or repliers
			throw new Error("Not implemented yet!");
		} else if (channel instanceof Documa.communication.channels.PropertyLinkChannel) {
			// remove remote participants
			throw new Error("Not implemented yet!");
		} else {
			throw new Error("Unknown channel type not supported!");
		}
	}

	/**
	 * Test if component with instance id is an element of the array of communication partners
	 * @param {String} instid component instance id
	 * @param {Array} partners array of communication partners
	 */
	function containsCommunicationPartner(instid, partners) {
		for (var i = 0; i < partners.length; ++i) {
			/** @type Documa.communication.channels.CommunicationPartner */
			var cp = partners[i];
			if (instid === cp.getInstanceId())
				return true;
		}
		return false;
	}

	/**
	 * Test whether channel is a remote communication channel, including only the component with given
	 * instance id as publisher or subscriber.
	 *
	 * @param {String} instid component's instance id
	 * @param {Documa.communication.channels.ComponentChannel} channel
	 * @returns {Boolean}
	 */
	function isRemoteChannel(instid, channel) {
		var partners = null;
		if (channel instanceof Documa.communication.channels.LinkChannel) {
			var publisher = channel.getPublisherList();
			var subscriber = channel.getSubscriberList();
			partners = publisher.concat(subscriber);
		} else if (channel instanceof Documa.communication.channels.BackLinkChannel) {
			var requestor = channel.getRequestorList();
			var replier = channel.getReplierList();
			partners = requestor.concat(replier);
		} else if (channel instanceof Documa.communication.channels.PropertyLinkChannel) {
			partners = channel.getParticipantList();
		} else {
			throw new Error("Unknown channel type");
		}
		for (var i = 0; i < partners.length; ++i) {
			/** @type Documa.communication.channels.CommunicationPartner */
			var cp = partners[i];
			if (cp.getInstanceId() === instid)
				continue;

			var container = Documa.RuntimeManager.getComponentManager().getContainerElementById(cp.getInstanceId());
			if (container) {
				// a local publisher or subscriber is referenced
				return false;
			}
		}
		return true;
	}

	/* public Methods ****/
	return {
		constructor: function () {
			Documa.communication.EventBroker.superclass.constructor.call(this);
			_self = this;
			_log.debug(TAG, '... constructing');
		},
		/**
		 * Manages the distribution of new channels on server-side. 
		 * Integrates local channels instantly and notifies the server about it.
		 * 
		 * @param {Documa.communication.channels.ComponentChannel} the new channel to be distributed
		 */
		createChannel: function (sender, receiver, channelType) {				
			// create a new channel
			var channelPayload = {
				type: new Number(channelType),
				name: uuid.v1(),
				sender: [],
				receiver: []
			};
			
			// add the senders to the channel
			for(var i=0; i<sender.length; i++) {
				channelPayload.sender.push({
					cetype: sender[i].type,
					cename: sender[i].name,
					cid: sender[i].cid,
					instid: sender[i].ciid
				});
			}
			
			// add the receivers to the channel
			for(var i=0; i<receiver.length; i++) {
				channelPayload.receiver.push({
					cetype: receiver[i].type,
					cename: receiver[i].name,
					cid: receiver[i].cid,
					instid: receiver[i].ciid
				});
			}

			// depending on the type, instantiate a new channel
			switch(channelType) {
				case Documa.communication.channels.ChannelTypes.LINK:
					channelPayload.sndrr = "publisher";
					channelPayload.recvr = "subscriber";
					channel = new Documa.communication.channels.LinkChannel(channelPayload);
					break;
				case Documa.communication.channels.ChannelTypes.BACKLINK:
					channelPayload.sndrr = "requestor";
					channelPayload.recvr = "replier";
					channel = new Documa.communication.channels.BackLinkChannel(channelPayload);
					break;
				case Documa.communication.channels.ChannelTypes.PROPLINK:
					channelPayload.sndrr = "participant";
					channelPayload.recvr = "participant";
					channel = new Documa.communication.channels.PropertyLinkChannel(channelPayload);
					break;
				default:
					_log.debug(TAG, "No valid type for added channel!");
					return;
			}

			// get information about the app context to prepare message sending
			var appcontext = Documa.RuntimeManager.getApplicationContext();
			var appid = appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_ID);
			var appversion = appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_VERSION);
			var appinstid = appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_INSTID);
			
			// local channels are integrated directly
			if(channel.isLocal()) {
				// try to integrate the new channel
				this.addChannel(channel, function(success) {
					if(success) {
						// unblock the communication partners on success
						_self.unblockChannelCommunicationPartners(channel._channelObj);
						
						// notify the server on success
						var eventFactory = new Documa.communication.events.EventFactory();
						var channelAddedEvent = eventFactory.create(
							Documa.communication.MessageFieldValues.APP_LEVEL, 
							Documa.communication.events.ApplicationChangeType.LOCAL_CHANNEL_ADDED, 
							{
								id: appid,
								version: appversion,
								instid: appinstid,
								channel: channel._channelObj
							}
						);
						Documa.RuntimeManager.getCommunicationManager().sendApplicationLevelMessage(channelAddedEvent);
					}
				});
			}
			// distributed channels send messages to the server
			else {
				// send a command to start integration on other clients
				var commandFactory = new Documa.communication.commands.CommandFactory();
				var modifyChannelCommand = commandFactory.createModifyChannelCommand(
					appid, appversion, appinstid, // required parameters for commands
					Documa.communication.commands.ChannelModifiyTypes.CREATE, // channel creation
					channel._channelObj // the new channel object
				);
				Documa.RuntimeManager.getCommunicationManager().sendApplicationLevelMessage(modifyChannelCommand);
			}
		},
		/**
		 * Manages the distribution of deleted channels on server-side. 
		 */
		deleteChannel: function (channel) {
			// get information about the app context to prepare message sending
			var appcontext = Documa.RuntimeManager.getApplicationContext();
			var appid = appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_ID);
			var appversion = appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_VERSION);
			var appinstid = appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_INSTID);
			
			// local channels are deleted directly
			if(channel.isLocal()) {
				// notify the server about the deletion
				var eventFactory = new Documa.communication.events.EventFactory();
				var channelRemovedEvent = eventFactory.create(
					Documa.communication.MessageFieldValues.APP_LEVEL, 
					Documa.communication.events.ApplicationChangeType.LOCAL_CHANNEL_REMOVED, 
					{
						id: appid,
						version: appversion,
						instid: appinstid,
						channel: channel._channelObj
					}
				);
				Documa.RuntimeManager.getCommunicationManager().sendApplicationLevelMessage(channelRemovedEvent);
				
				// remove the channel
				this.removeChannel(channel);
			}
			// distributed channels send messages to the server
			else {
				// send a command to start deletion on other clients
				var commandFactory = new Documa.communication.commands.CommandFactory();
				var modifyChannelCommand = commandFactory.createModifyChannelCommand(
					appid, appversion, appinstid, // required parameters for commands
					Documa.communication.commands.ChannelModifiyTypes.REMOVE, // channel removal
					channel._channelObj // the channel to be removed
				);
				Documa.RuntimeManager.getCommunicationManager().sendApplicationLevelMessage(modifyChannelCommand);
			}
		},
		/**
		 * Registers channel internally and create linking between publishing and
		 * subscribing components.
		 *
		 * @param {Documa.communication.channels.ComponentChannel} channel communication
		 * link between publishing and subscribing components
		 */
		addChannel: function (channel, callback) {
			_log.debug(TAG, "... adding channel " + channel.getName());
			try {
				if (_channels[channel.getName()]) {
					if (_addedChannels.indexOf(channel.getName()) >= 0) {
						// adding an already added channel is not allowed and indicates an
						// error
						throw new Error("Channel {" + channel.getName() + "} was already added. Duplicates are not allowed!");
					}
					_log.debug(TAG, "... channel {" + channel.getName() + "} was registered, but is not added yet.");
				} else {
					// register unknown channel
					_log.debug(TAG, "... register unknown channel " + channel.getName());
					_channels[channel.getName()] = channel;
				}

				if (!Documa.RuntimeManager.getComponentManager().areComponentsInstantiated()) {
					// not all components are initialized yet --> start channel integration after the
					// last component was instantiated.
					_log.debug(TAG, "... not all components were instantiated yet! Channel integration will be continued after the last component was instantiated.");
					return false;
				}

				/*********************************************************************************/
				// all components are initialized yet --> no reason to wait for channel integration
				/*********************************************************************************/

				if (channel instanceof Documa.communication.channels.LinkChannel) {
					// register and add link channel
					addLinkChannel(channel);
				} else if (channel instanceof Documa.communication.channels.BackLinkChannel) {
					// register and add backlink channel
					addBacklinkChannel(channel);
				} else if (channel instanceof Documa.communication.channels.PropertyLinkChannel) {
					// register and add property link channel
					addProplinkChannel(channel);
				} else {
					throw new Error("Unknown channel type not supported!");
				}

				_addedChannels.push(channel.getName());
				
				// add the new channel to the distribution
				var clientId = Documa.RuntimeManager.getCommunicationManager().getClientID();
				var distManager = Documa.RuntimeManager.getApplicationContext().getDistributionManager(); 
				var currentDist = distManager.getDistribution(clientId);
				currentDist.addChannel(channel);
				
				// notify caller about successful channel integration
				if(callback) callback(true);
			}
			catch (error) {
				_log.error(TAG, error.stack);
				
				// notify caller about failed channel integration
				if(callback) callback(false);
			}
		},
		/**
		 * Removes given channel object from internal registries.
		 * @param {Documa.communication.channels.ComponentChannel} channel
		 */
		removeChannel: function (channel) {
			// remove the channel from the distribution
			var clientId = Documa.RuntimeManager.getCommunicationManager().getClientID();
			var distManager = Documa.RuntimeManager.getApplicationContext().getDistributionManager(); 
			var currentDist = distManager.getDistribution(clientId);
			currentDist.addChannel(channel);
			
			// remove channel from channel registry
			delete _channels[channel.getName()];

			// remove channel name from internal register
			var index = _addedChannels.indexOf(channel.getName());
			_addedChannels.splice(index, 1);

			// destroying channel
			channel.destroy();
		},
		/**
		 * Unblocks all communication partners of the given channel.
		 * @param {String} channelObj The data of the channel.
		 */
		unblockChannelCommunicationPartners: function (channelObj) {
			// get some channel information
			var channel = _channels[channelObj.name];
			var sender = channel._channelObj.sender;
			var receiver = channel._channelObj.receiver;
			
			// find all communication partners of the channel
			var comPartners = [];
			for (var i=0; i<sender.length; i++) comPartners.push(sender[i]); 
			for (var i=0; i<receiver.length; i++) comPartners.push(receiver[i]); 
			
			// unlock each communication partner
			var cmpManager = Documa.RuntimeManager.getComponentManager();
			for (var i=0; i<comPartners.length; i++) {
				var cmpContainer = cmpManager.getContainerElementById(comPartners[i].instid);
				cmpContainer.unblock();
			}
		},
		/**
		 * Updates subscriptions of specified channel.
		 *
		 * @param {Documa.communication.channels.ComponentChannel} channel
		 */
		updateSubscriptions: function (channel) {
			_log.debug(TAG, "... updating subscriptions of channel: " + channel.getName());
			try {
				// clear subscriptions
				channel.clearSubscribers();
				// updates new subscriptions
				if (channel instanceof Documa.communication.channels.LinkChannel) {
					addLinkChannel(channel);
				} else if (channel instanceof Documa.communication.channels.BackLinkChannel) {
					addBacklinkChannel(channel);
				} else if (channel instanceof Documa.communication.channels.PropertyLinkChannel) {
					addProplinkChannel(channel);
				} else {
					throw new Error("Unknown channel type!");
				}
			} catch (error) {
				_log.debug(TAG, error.stack);
			}
		},
		/**
		 * Removes remote channels, which are referencing the component instance with given instance id.
		 *
		 * @param {String} instid component instance id
		 * @returns {void}
		 */
		removeChannelsFromComponent: function (instid) {
			_log.debug(TAG, "... removing channels from component: " + instid);
			if (_publisherRegistry[instid]) {
				// component is a registered publisher
				delete _publisherRegistry[instid];
			}

			// contains channels, which are referencing component with given instance id
			var channels = [];
			for (var channelName in _channels) {
				/** @type Documa.communication.channels.ComponentChannel */
				var channel = _channels[channelName];

				// test whether channel is a remote channel including
				// only migrating component instance
				if (!isRemoteChannel(instid, channel))
					continue;

				// add relevant channel into array
				channels.push(channel);
			}

			// remove each channel
			for (var i = 0; i < channels.length; ++i) {
				this.removeChannel(channels[i]);
			}
		},
		/**
		 * Publishing message from sender component represented by specified instance id.
		 *
		 * @param {String} instid instance-id of publisher component
		 * @param {Ext.cruise.client.Message} message component event message
		 * @return {boolean}
		 */
		publish: function (instid, message) {
			// getting list of channels from publisher's id
			var senderMap = _publisherRegistry[instid];
			if (!senderMap) {
				_log.warn(TAG, "... could not find any channel registration for publisher component {" + instid + "}.");
				return false;
			}

			// getting registered channel from message name
			var channelArray = senderMap[message.getName()];
			if (!channelArray) {
				_log.warn(TAG, "... could not find channel on publisher {" + instid + "} and event {" + message.getName() + "}");
				return false;
			}

			//If one message is published on two different channels something goes wrong
			//The body of the message is changed within the channel.publish function so that
			// on the second channel nobody will listen to the message
			//The Backup-Message is used to restore the original body of the message
			//TODO: Fix this workaround
			var backupMessage = new Ext.cruise.client.Message();
			backupMessage.setBody(message.getBody());
			backupMessage.setName(message.getName());
			backupMessage.setCallbackId(message.getCallbackId());

			for (var i = 0; i < channelArray.length; ++i) {
				var channel = channelArray[i];
				if (!channel) {
					_log.warn(TAG, "... empty channel detected!");
					continue;
				}

				if (i > 1) {
					// make sure message uses everytime the same data
					message.setBody(backupMessage.getBody());
					message.setName(backupMessage.getName());
					message.setCallbackId(backupMessage.getCallbackId());
				}
				// differentiate between following cases
				// 1st case: sender is a local integrated component
				// 2nd case: sender is a remote integrated component
				var container = Documa.RuntimeManager.getComponentManager().getContainerElementById(instid);
				if (container) {
					// *** sender component is integrated locally ***
					// publish local message on channel
					channel.publishLocalMessage(instid, message);
				} else {
					// ***  sender component must be integrated remotely ***
					// publish message from remote sender component specifically
					channel.publishRemoteMessage(instid, message);
				}
			}
			return true;
		},
		/**
		 * Create subscription for subscriber component represented by its instance id to
		 * specified operationName. The subscribed event is handled by the given handler
		 * in the context of the specified scope.
		 *
		 * @param {String} instid instance id of subscriber component
		 * @param {String} channelName name of channel to subscribe for
		 * @param {String} operationName name of operation
		 * @param {Object} scope execution scope of handler function
		 * @param {Function} handler function for processing published event
		 */
		subscribe: function (instid, channelName, operationName, scope, handler) {
			var channel = _channels[channelName];
			if (channel) {
				// create subscription to specific channel
				channel.subscribe(instid, operationName, scope, handler);
			} else {
				_log.trace(TAG, "... channel {" + channelName + "} is not registered yet!");
			}
		},
		/**
		 * Returns channel with given name.
		 *
		 * @param {String} channelName name of channel to retrieve
		 * @return {Documa.communication.channels.ComponentChannel} corresponding channel
		 * object with given name
		 */
		getChannel: function (channelName) {
			if (!_channels[channelName]) {
				_log.warn(TAG, "... could not find channel with name {" + channelName + "}");
				return null;
			}

			return _channels[channelName];
		},
		/**
		 * Returns channel registry containing for each channel an entry consisting of
		 * the channel name and the channel object itself.
		 *
		 * @return {Object} map that contains for each name the corresponding channel
		 * object
		 */
		getChannels: function () {
			return _channels;
		},
		/**
		 * Returns true if a channel with the given name was already added, else false.
		 * @param {String} channelName
		 * @return {boolean} true if channel with name was added, else false
		 */
		wasChannelAdded: function (channelName) {
			for (var i = 0; i < _addedChannels.length; ++i) {
				if (channelName === _addedChannels[i]) {
					return true;
				}
			}
			return false;
		},
		/**
		 * Returns true if all channels were add, else false.
		 *
		 * @return {boolean}
		 */
		areChannelsAdded: function () {
			for (var channelName in _channels) {
				var channel = _channels[channelName];
				// check channel existence
				if (!channel) {
					return false;
				}
				// check if channel was successfully added --> use 'added-channel'-list
				if (_addedChannels.indexOf(channelName) < 0) {
					// channel name was not in list of added channels, i.e. channel was not
					// successfully added
					return false;
				}
			}
			// all channels were added
			return true;
		},

		/**
		 * Blocks all channels which are including references to the specified subscriber/message receiving
		 * component instance.
		 *
		 * @param {String} instid component instance id
		 */
		blockChannelsOfSubscriber: function (instid) {
			for (var channelName in _channels) {
				/** @type Documa.communication.channels.ComponentChannel */
				var channel = _channels[channelName];
				var ref = false;
				if (channel instanceof Documa.communication.channels.LinkChannel) {
					var subscribers = channel.getSubscriberList();
					ref = containsCommunicationPartner(instid, subscribers);
				} else if (channel instanceof  Documa.communication.channels.BackLinkChannel) {
					var repliers = channel.getReplierList();
					ref = containsCommunicationPartner(instid, repliers);
				} else if (channel instanceof Documa.communication.channels.Documa.communication.channels.PropertyLinkChannel) {
					var partners = channel.getParticipantList();
					ref = containsCommunicationPartner(instid, partners);
				} else {
					throw new Error("Unknown channel type!");
				}

				if (ref) {
					channel.block();
				}
			}
		},

		/**
		 * Unblocks all channels which are including references to the specified subscriber component instance.
		 *
		 * @param {String} instid component instance id
		 */
		unblockChannelsOfSubscriber: function (instid) {
			for (var channelName in _channels) {
				/** @type Documa.communication.channels.ComponentChannel */
				var channel = _channels[channelName];
				var ref = false;
				if (channel instanceof Documa.communication.channels.LinkChannel) {
					var subscribers = channel.getSubscriberList();
					ref = containsCommunicationPartner(instid, subscribers);
				} else if (channel instanceof  Documa.communication.channels.BackLinkChannel) {
					var repliers = channel.getReplierList();
					ref = containsCommunicationPartner(instid, repliers);
				} else if (channel instanceof Documa.communication.channels.Documa.communication.channels.PropertyLinkChannel) {
					var partners = channel.getParticipantList();
					ref = containsCommunicationPartner(instid, partners);
				} else {
					throw new Error("Unknown channel type!");
				}
				if (ref) {
					channel.unblock();
				}
			}
		}

	};
})());
