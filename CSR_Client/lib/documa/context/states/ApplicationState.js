Ext.namespace("Documa.context.states");

Documa.require("Documa.util.Logger");
Documa.require("Documa.util.Util");

Documa.context.states.ApplicationStates = {
	CREATING: "creating",
	STARTING: "starting",
	PAUSING: "pausing",
	RUNNING: "running",
	CLOSING: "closing"
};

/**
 * @typedef {object} JoinedClient
 * @property {ParticipantPayload} user
 * @property {DeviceType} device
 * @property {DistributionVectorType} dvect
 */

/**
 * @typedef {object} JoinedPaylod
 * @property {JoinedClient} jclient
 */

/**
 * @typedef {object} JoinedResponsePayload
 * @property {JoinedClient} jclient
 * @property {JoinedClient} initr
 * @property {Array.<JoinedClient>} prtps
 * @property {Array.<DistributionType>} distset
 */

/**
 * Abstract class representing an application lifecycle state.
 * @class
 */
Documa.context.states.ApplicationState = Ext.extend(Object, (function() {
	const TAG = "Documa.context.states.ApplicationState";
	const _log = Documa.util.Logger;
	const _util = Documa.util.Util;
	
	/**
	 * Helper method to validate the structure of specified join event.
	 *
	 * @param {Documa.communication.events.ApplicationEvent} joinEvent event representing joined client or response message after a client joined an application context
	 */
	function validateJoinEvent(joinEvent) {
		if(!joinEvent.getPayload())
			throw new Error("No payload in join event defined!");
		/** @type {Documa.util.Util.test|Function} */
		let test = _util.test;
		
		/** @type {JoinedPaylod} */
		let payload = joinEvent.getPayload();
		test("jclient", payload);
		test("user", payload.jclient);
		test("device", payload.jclient);
	}
	
	/**
	 * Helper method to create and send JOIN command to server-side.
	 *
	 * @param {Object} payload contains information about application to join
	 */
	function sendJoinCommand(payload) {
		_log.debug(TAG, "... sending JOINAPP command to server");
		// create startapp command object
		let joinAppCmd = this._cfactory.create(Documa.communication.MessageFieldValues.SYS_LEVEL,
			Documa.communication.commands.SystemCommands.JOINAPP, payload);
		
		// send command to server
		Documa.RuntimeManager.getCommunicationManager().sendSystemLevelMessage(joinAppCmd);
	}
	
	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {Documa.context.ApplicationContext} applicationContext
		 */
		constructor: function(applicationContext) {
			Documa.context.states.ApplicationState.superclass.constructor.call(this);
			
			/** @type Documa.context.ApplicationContext */
			this._context = applicationContext;
			this._cfactory = new Documa.communication.commands.CommandFactory();
		},
		
		/**
		 * Requesting the join into the current application context.
		 */
		requestJoin: function() {
			// joining is triggered from client-side, e. g. by pressing join
			// button at the application selection screen
			let appName = this._context.getValue(Documa.context.ApplicationContextAttributes.APP_NAME);
			let appId = this._context.getValue(Documa.context.ApplicationContextAttributes.APP_ID);
			let appVersion = this._context.getValue(Documa.context.ApplicationContextAttributes.APP_VERSION);
			let appInstid = this._context.getValue(Documa.context.ApplicationContextAttributes.APP_INSTID);
			// publish the join to an already existing application
			sendJoinCommand.call(this, {
				id: appId,
				version: appVersion,
				name: appName,
				instid: appInstid
			});
			_log.debug(TAG, " ... joining application: " + appName);
		},
		
		/**
		 * Adding participant and corresponding device to current application context within the current state.
		 * This method should be called only from the different child states.
		 *
		 * @param {Documa.communication.events.ApplicationEvent} joinEvent
		 *          event representing the add of a client fired from server-side within the same application context
		 */
		handleJoinEvent: function(joinEvent) {
			// joining is triggered from server-side, e. g. another client has joined or the response of
			// joining an already existing application was received
			validateJoinEvent(joinEvent);
			
			let environment = Documa.RuntimeManager.getEnvironmentContext();
			let currSid = Documa.RuntimeManager.getCommunicationManager().getClientID();
			let distman = this._context.getDistributionManager();
			let awareman = Documa.RuntimeManager.getAwarenessManager();
			let uiman = Documa.RuntimeManager.getUIManager();
			let util = Documa.util.EventUtil;
			let self = this;
			
			/** @type {JoinedPaylod|JoinedResponsePayload} */
			let payload = joinEvent.getPayload();
			
			// getting application's initiator
			let initiator = this._context.getValue(Documa.context.ApplicationContextAttributes.APP_INITR);
			if(!initiator) { // in this case the client joins a running application
				let sid = Documa.RuntimeManager.getCommunicationManager().getClientID();
				initiator = util.getInitiatorFromJoinPayload(payload);
				//awareman.add(initiator);
				//awareman.getView().getBuddyList().show();
				// save application's initiator as context information
				this._context.put(Documa.context.ApplicationContextAttributes.APP_INITR, initiator);
				// getting device descriptor from event payload
				let initdevice = util.getInitiatorDeviceFromJoinPayload(payload);
				
				// add owner device to distribution manager
				distman.addDevice(initdevice, (sid === initiator.getSessionId()));
				let createdPromise = uiman.getMetaUIController().whenApplicationCreated();
				if(createdPromise.fulfilled) {
					uiman.getMetaUIController().addApplicationDevice(self._context, initdevice);
				} else {
					// add application's initiator device to the metaui
					createdPromise.then(function() {
						uiman.getMetaUIController().addApplicationDevice(self._context, initdevice);
					}).catch(function(error) {
						_log.error(TAG, error.stack);
					});
				}
			}
			
			// determine initiating session id
			let initiatorId = initiator.getSessionId();
			let participant = util.getUserFromJoinPayload(payload, (initiatorId === util.getUserIdFromJoinPayload(payload)));
			participant.addApplication(this._context);
			// add joined client (another user or yourself)
			awareman.add(participant);
			
			// getting device representing object from join response event
			util.getDeviceFromJoinPayload(payload).then(function(device) {
				uiman.getMetaUIController().setApplicationContext(self._context);
				uiman.getMigrationManager().setApplicationContext(self._context);
				// TODO: remove following distribution handling
				// *** potential distribution handling ***
				// creating instance representing the set of executable components of joined runtime environment
				// let pdist = new Documa.distribution.Distribution(payload.jclient.pdist);
				// map potential distribution set to joined device/runtime context
				// distman.updatePotentialDistribution(device, pdist);
				
				// *** distribution options vector associated to current device ***
				// let distributionVector = util.getDistributionOptionsFromJoinPayload(device, payload);
				// create assignment between current device and distribution vector
				// distman.updateDistributionOptions(device, distributionVector);
				
				// get awareness view and show user list on ui layer
				let aview = awareman.getView();
				//aview.getBuddyList().show();
				if(currSid === participant.getSessionId()) { // join response from server to own join request
					_log.debug(TAG, "... received join response from server");
					// adding joined device as your owned device
					distman.addDevice(device, true);
					// set own device as attribute in application context
					self._context.put(Documa.context.ApplicationContextAttributes.APP_DEVICE, device);
					
					if(!payload.distset && !(payload instanceof Array))
						throw new Error("Missing distribution state description!");
					
					// synchronize the distribution state knowledge
					payload.distset.forEach(function(d) {
						if(d.type === "choice" && !d.target)
							return; // current distribution is just choice distribution
						let targetDevice = environment.getDevice(d.target);
						if(!targetDevice)
							throw new Error(`Could not get device descriptor from ${d.target}.`);
						// get corresponding distribution entity
						let distribution = distman.getDistributionFromDevice(targetDevice);
						if(!distribution) {
							let promise = distman.wasAdded(targetDevice.getSessionId());
							promise.then(function() {
								// get corresponding distribution entity
								let distribution = distman.getDistributionFromDevice(targetDevice);
								if(!distribution)
									throw new Error("There is no distribution of target device. " + targetDevice.getSessionId());
								// add unknown component instances
								d.components.forEach(function(c) {
									if(!distribution.containsComponent(c.instance, c.component)) {
										let citem = new Documa.distribution.ComponentItem({
											id: c.instance,
											cid: c.component
										});
										let ci = new Documa.components.ComponentInterface(c.interface);
										citem.setName(ci.getName());
										citem.setIcon(ci.getIcon());
										citem.setSmcd(ci._interface[0]);
										distribution.addComponent(citem);
										
										// register remote component interface descriptors
										let remotedesc = distman.getRemoteComponentDescriptors();
										if(!remotedesc[citem.getComponentId()])
											remotedesc[citem.getComponentId()] = c.interface;
									}
								});
								// add unkown channels
								d.channels.forEach(function(channel) {
									// set type of the channel as a number
									channel.type = new Number(channel.type);
									
									// depending on the channel type instantiate the channel 
									switch (channel.type.valueOf()) {
										case Documa.communication.channels.ChannelTypes.LINK:
											channel = new Documa.communication.channels.LinkChannel(channel);
											break;
										case Documa.communication.channels.ChannelTypes.BACKLINK:
											channel = new Documa.communication.channels.BackLinkChannel(channel);
											break;
										case Documa.communication.channels.ChannelTypes.PROPLINK:
											channel = new Documa.communication.channels.PropertyLinkChannel(channel);
											break;
										default:
											_log.debug(TAG, "Invalid channel type '" + channel.type + "' given!");
											return;
									}
									distribution.addChannel(channel);
								});
							});
						} else {
							// add unknown component instances
							d.components.forEach(function(c) {
								if(!distribution.containsComponent(c.instance, c.component)) {
									let citem = new Documa.distribution.ComponentItem({
										id: c.instance,
										cid: c.component
									});
									let ci = new Documa.components.ComponentInterface(c.interface);
									citem.setName(ci.getName());
									citem.setIcon(ci.getIcon());
									citem.setSmcd(ci._interface[0]);
									distribution.addComponent(citem);
									
									// register remote component interface descriptors
									let remotedesc = distman.getRemoteComponentDescriptors();
									if(!remotedesc[citem.getComponentId()])
										remotedesc[citem.getComponentId()] = c.interface;
								}
							});
							// add unkown channels
							d.channels.forEach(function(channel) {
								// set type of the channel as a number
								channel.type = new Number(channel.type);
								
								// depending on the channel type instantiate the channel 
								switch (channel.type.valueOf()) {
									case Documa.communication.channels.ChannelTypes.LINK:
										channel = new Documa.communication.channels.LinkChannel(channel);
										break;
									case Documa.communication.channels.ChannelTypes.BACKLINK:
										channel = new Documa.communication.channels.BackLinkChannel(channel);
										break;
									case Documa.communication.channels.ChannelTypes.PROPLINK:
										channel = new Documa.communication.channels.PropertyLinkChannel(channel);
										break;
									default:
										_log.debug(TAG, "Invalid channel type '" + channel.type + "' given!");
										return;
								}
								distribution.addChannel(channel);
							});
						}
					});
					
					if(!payload.prtps && !(payload.prtps instanceof Array))
						throw new Error("Could not find array of participants");
					// received response event was triggered by joining an already existing application
					// it is required to add all participants, which are already interacting within the application context
					
					// analyzing list of already participating users
					for(let i = 0; i < payload.prtps.length; ++i) {
						let partObj = payload.prtps[i];
						// creating user and device representation objects
						let cur_part = new Documa.collaboration.user.Participant(partObj.user, (initiatorId == partObj.sid));
						_log.debug(TAG, "... adding registered user to buddy list!");
						
						// add already known client
						awareman.add(cur_part);
						
						// get participants device and add it to the distribution manager as well as to the metaui
						let cur_dev = environment.getDevice(cur_part.getSessionId());
						if(!cur_dev)
							throw new Error("There is no valid device of current participant " + cur_part.getUsername());
						
						_log.debug(TAG, "... adding device of current application context to local device registry!");
						distman.addDevice(cur_dev, false);
						
						// _log.debug(TAG, "... updating potential distribution of registered client!");
						// getting potential distribution from participants payload object
						//let pdist = new Documa.distribution.Distribution(partObj.pdist);
						//distman.updatePotentialDistribution(cur_dev, pdist);
						
						let promise = uiman.getMetaUIController().whenApplicationCreated();
						if(promise.fulfilled) {
							uiman.getMetaUIController().addApplicationDevice(self._context, cur_dev);
						} else {
							// adding participant device to the metaui
							promise.then(function() {
								uiman.getMetaUIController().addApplicationDevice(self._context, cur_dev);
							}).catch(function(error) {
								_log.error(TAG, error.stack);
							});
						}
					}
				} else {// join event from server triggered by another client
					_log.debug(TAG, "... new participant joined!");
					// adding joined device
					distman.addDevice(device, false);
					
					// adding participant device to the metaui
					let promise = uiman.getMetaUIController().whenApplicationCreated();
					if(promise.fulfilled) {
						uiman.getMetaUIController().addApplicationDevice(self._context, device);
					} else {
						// adding participant device to the metaui
						promise.then(function() {
							uiman.getMetaUIController().addApplicationDevice(self._context, device);
						}).catch(function(error) {
							_log.error(TAG, error.stack);
						});
					}
				}
			}).catch(function(error) {
				_log.error(TAG, error.stack);
			});
		},
		
		/**
		 * Called after an application context was created. The respective application is the current application or
		 * another instance. In the last case, the current application is just informed about the lifecycle change of
		 * the neighbour application.
		 *
		 * @param {Documa.communication.events.ApplicationEvent}  createdEvent
		 */
		created: function(createdEvent) {
			throw new Error("Created method not implemented!");
		},
		
		start: function() {
			throw new Error("Start method not implemented!");
		},
		
		/**
		 * @param {Documa.communication.events.ApplicationEvent} runEvent
		 */
		run: function(runEvent) {
			throw new Error("Run method not implemented!");
		},
		
		/**
		 * @param {Documa.communication.events.ApplicationEvent} closeEvent
		 */
		close: function(closeEvent) {
			throw new Error("Close method not implemented!");
		},
		
		/**
		 * @param {Documa.communication.events.ApplicationEvent} pauseEvent
		 */
		pause: function(pauseEvent) {
			throw new Error("Pause method not implemented!");
		},
		
		/**
		 * @param {Documa.communication.events.ApplicationEvent} joinEvent
		 */
		join: function(joinEvent) {
			throw new Error("Join method not implemented!");
		},
		
		/**
		 * @param {Documa.communication.events.ApplicationEvent} leaveEvent
		 */
		leave: function(leaveEvent) {
			throw new Error("Leave method not implemented!");
		},
		
		/**
		 * @param {Documa.communication.events.ApplicationEvent} updateEvent
		 */
		updateDistribution: function(updateEvent) {
			throw new Error("Update distribution method not implemented!");
		},
		
		/**
		 * @param {Documa.communication.events.ApplicationEvent} addEvent
		 */
		addComponent: function(addEvent) {
			throw new Error("Add component method not implemented!");
		},
		
		/**
		 * @param {Documa.communication.events.ApplicationEvent} removeEvent
		 */
		removeComponent: function(removeEvent) {
			throw new Error("Remove component method not implemented!");
		}
		
	};
})());
