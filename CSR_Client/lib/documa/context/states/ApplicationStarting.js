Ext.namespace('Documa.context.states');

Documa.require('Documa.util.Logger');
Documa.require('Documa.util.Util');
Documa.require('Documa.context.states.ApplicationState');
Documa.require("Documa.communication.commands.CommandFactory");

Documa.context.states.StartingSubstates = {
	INTERPRETING: "interpreting",
	CALCULATING: "calculating",
	INTEGRATING: "integrating"
};

/**
 * Application state representing the application's loading behaviour.
 * @class
 * @extends {Documa.context.states.ApplicationState}
 */
Documa.context.states.ApplicationStarting = Ext.extend(Documa.context.states.ApplicationState, (function() {
	const TAG = "Documa.context.states.ApplicationStarting";
	const _log = Documa.util.Logger;
	var _communicationManager = null;
	var _cfactory = null;
	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Constructor.
		 * @constructs
		 * @param {Documa.context.ApplicationContext} appContext application attributes
		 */
		constructor: function(appContext) {
			Documa.context.states.ApplicationStarting.superclass.constructor.call(this, appContext);
			_communicationManager = Documa.RuntimeManager.getCommunicationManager();
			_cfactory = new Documa.communication.commands.CommandFactory();
		},
		
		/**
		 * Called after the server-side application manager was created and the application's starting state was entered.
		 *
		 * @param {Documa.communication.events.ApplicationLifecycleChangedEvent} startEvent
		 *      containing server-side start information, e. g. possible substate identifier
		 */
		start: function(startEvent) {
			let payload = startEvent.payload;
			let appName = this._context.getValue(Documa.context.ApplicationContextAttributes.APP_NAME);
			let distman = this._context.getDistributionManager();
			let sid = Documa.RuntimeManager.getCommunicationManager().getClientID();
			let util = Documa.util.EventUtil;
			
			_log.debug(TAG, "... calling start");
			_log.debug(TAG, " ... starting application: " + appName);
			
			if(!this._context.getValue(Documa.context.ApplicationContextAttributes.APP_INSTID)) {
				// set application's instance id to application context
				this._context.put(Documa.context.ApplicationContextAttributes.APP_INSTID, payload.instid);
			}
			
			if(!startEvent.getSubstate()) { // application context has entered starting state
				// reception of first application lifecycle change event
				_log.debug(TAG, "... received application's owner user and device meta information!");
				if(this._context.getValue(Documa.context.ApplicationContextAttributes.APP_INITR)) {
					return;
				}
				
				// getting application's initiator meta data
				// participant will be added to the buddy list
				let appInitiator = util.getInitiatorFromJoinPayload(payload);
				// save application's initiator as context information
				this._context.put(Documa.context.ApplicationContextAttributes.APP_INITR, appInitiator);
				
				// adding application's owner to awareness buddy list
				let awareman = Documa.RuntimeManager.getAwarenessManager();
				awareman.add(appInitiator);
				let idevice = Documa.RuntimeManager.getEnvironmentContext().getDevice(appInitiator.getSessionId());
				idevice.initialize().then(function() {
					// add owner device to distribution manager
					distman.addDevice(idevice, (sid === appInitiator.getSessionId()));
				}).catch(function(error) {
					_log.error(TAG, error.stack);
				});
			}
			
			let participant = this._context.getValue(Documa.context.ApplicationContextAttributes.APP_INITR);
			_log.debug(TAG, "... application with id {" + payload.id + "} in version {" + payload.version + "} starting ...");
			if(sid !== participant.getSessionId()) {
				this._isInitiator = false;
			} else {
				this._isInitiator = true;
				_log.debug(TAG, "... client is initiating runtime!");
			}
			
			if(startEvent.getSubstate()) {
				_log.debug(TAG, "... entering starting substate {" + payload.substate + "}");
				// received substate transition
				switch (startEvent.getSubstate()) {
					case Documa.context.states.StartingSubstates.INTERPRETING:
						_log.debug(TAG, "... application context is in interpreting state!");
						Documa.RuntimeManager.registerApplicationContext(this._context);
						break;
					case Documa.context.states.StartingSubstates.CALCULATING:
						_log.debug(TAG, "... application context is in distribution calculating state!");
						
						// get potential distribution from event and give it to the distribution manager
						_log.debug(TAG, "... updating potential distribution of application's owner device.");
						if(!this._isInitiator) {
							let uiman = Documa.RuntimeManager.getUIManager();
							uiman.showLoader("Calculating application's distribution ...");
						}
						
						// getting device from initiator's session id
						let initiator = this._context.getValue(Documa.context.ApplicationContextAttributes.APP_INITR);
						distman.wasAdded(initiator.getSessionId()).then(function() {
							let device = distman.getDevice(initiator.getSessionId());
							// update potential distribution of application's initiator device
							distman.updatePotentialDistribution(device, new Documa.distribution.Distribution(payload.pdist));
						}).catch((error) => {
							LOG.error(TAG, error.stack);
						});
						break;
					case Documa.context.states.StartingSubstates.INTEGRATING:
						_log.debug(TAG, "... application context is in component integrating state!");
						// handle transition into integrating substate
						// hide distribution selection view
						distman.closeChoiceDistributionView();
						let uiman = Documa.RuntimeManager.getUIManager();
						if(!this._isInitiator) {
							uiman.hideLoader();
						}
						
						let layoutManager = uiman.getLayoutManager();
						// adding panel of components to the homescreen
						let viewStack = layoutManager.getViewStack();
						// activate viewstack
						uiman.getCenterStage().getLayout().setActiveItem(uiman.getChildId(viewStack));
						// create layout selection ui elements
						layoutManager.initializeLayoutSelectionElements();
						
						// show loader mask
						this._context.showStartingView(appName + ": Mashup components integrating ...");
						break;
				}
			}
		},
		
		/**
		 * Called after the application changes into it's running state.
		 * @param {Documa.communication.events.ApplicationEvent} runEvent
		 */
		run: function(runEvent) {
			_log.debug(TAG, "... calling run");
			this._context.closeStartingView();
			this._context.setState(this._context.getRunningState());
			Documa.RuntimeManager.getUIManager().getLayoutManager().layoutComponents();
		},
		
		/**
		 * @param {Documa.communication.events.ApplicationEvent} closeEvent
		 */
		close: function(closeEvent) {
			_log.debug(TAG, "... calling close");
			throw new Error("Not implemented yet!");
		},
		
		/**
		 * @param {Documa.communication.events.ApplicationEvent} pauseEvent
		 */
		pause: function(pauseEvent) {
			_log.debug(TAG, "... calling pause");
			this._context.closeStartingView();
			this._context.setState(this._context.getPausingState());
			this._context.getInterruptController().onInterrupt(pauseEvent);
		},
		
		/**
		 * This method is called in following cases:
		 * a) The user wants to join an already active application. In this case the join event is null, because no change event occurs on server-side.
		 *    As next step the client sends a join command to the server and it responds with an event containing information of all participants,
		 *    which are taking part in the application context already.
		 * b) The user is already an application participant and the client is notified about join events from the server-side.
		 */
		join: function(joinEvent) {
			_log.debug(TAG, "... calling join");
			try {
				if(!joinEvent) {
					// joining is triggered from client-side, e. g. by pressing join
					// button at the application selection screen
					this.requestJoin();
					if(!this._isInitiator) {
						let uiman = Documa.RuntimeManager.getUIManager();
						uiman.showLoader("Calculating application's distribution ...");
					}
				} else {
					// calling method of superclass to add the joined client
					// to the current application context or to handle a join
					// response event
					this.handleJoinEvent(joinEvent);
				}
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},
		
		/**
		 * @param {Documa.communication.events.ApplicationEvent} leaveEvent
		 */
		leave: function(leaveEvent) {
			_log.debug(TAG, "... calling leave");
			throw new Error("Leave method not implemented!");
		},
		
		/**
		 * Called after a distribution change occurs on server-side.
		 *
		 * @param {Documa.communication.events.ApplicationEvent} updateEvent event object representing change of the application's distribution state
		 */
		updateDistribution: function(updateEvent) {
			// event contains distribution state calculated during the starting phase
			let payload = updateEvent.getPayload();
			
			// getting array of distribution instances (each is from type Documa.distribution.Distribution)
			let distributions = Documa.util.Util.getDistributions(payload);
			
			// updating changed distribution set
			this._context.getDistributionManager().updateDistributions(distributions);
		},
		
		/**
		 * Called after a component was added on server-side.
		 *
		 * @param {Documa.communication.events.ApplicationEvent} addEvent event object representing the extension of the application's composition state
		 */
		addComponent: function(addEvent) {
			throw new Error("Not implemented yet!");
		},
		
		/**
		 * Called after a component was removed on server-side.
		 *
		 * @param {Documa.communication.events.ApplicationEvent} removeEvent event object representing the reduction of the application's composition state
		 */
		removeComponent: function(removeEvent) {
			throw new Error("Not implemented yet!");
		}
		
	};
})());
