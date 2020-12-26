Ext.namespace('Documa.context');

Documa.require("Documa.util.Logger");
Documa.require("Documa.util.Util");

Documa.require("Documa.context.states.ApplicationCreated");
Documa.require("Documa.context.states.ApplicationStarting");
Documa.require("Documa.context.states.ApplicationPausing");
Documa.require("Documa.context.states.ApplicationRunning");

Documa.require("Documa.collaboration.user.Participant");
Documa.require("Documa.components.integration.IntegrationJob");

Documa.require("Documa.distribution.DistributionManager");
Documa.require("Documa.communication.commands.CommandFactory");
Documa.require("Documa.communication.events.EventDispatcher");

Documa.context.ApplicationContextAttributes = {
	APP_NAME: 'name',
	APP_ID: 'id',
	APP_VERSION: 'version',
	APP_INITR: 'initr',
	APP_INSTID: 'instid',
	APP_DEVICE: 'device'
};

Documa.context.ApplicationChanges = {
	CLIENT_JOINED: "joined",
	CLIENT_LEFT: "left",
	COMPONENT_ADDED: "cmpadded",
	COMPONENT_EXCHANGED: "cmpxchanged",
	COMPONENT_REMOVED: "cmpremoved",
	DISTRIBUTION_CHANGED: "distchanged"
};

Documa.context.TestCases = {
	MIGRATION_OPTIONS: 101
};


/**
 * @typedef {object} ApplicationUser
 * @property {string} userid
 * @property {string} fname
 * @property {string} lname
 * @property {string} uname
 * @property {string} sid
 * @property {string} status
 * @property {string} icon
 * @property {string} color
 */

/**
 * @typedef {object} ApplicationInitiator
 * @property {ApplicationUser} user
 * @property {Object} device
 */

/**
 * @typedef {object} ApplicationPayload
 * @property {string} id
 * @property {string} name
 * @property {string} version
 * @property {string} instid
 * @property {string} state
 * @property {ApplicationInitiator} initr
 */

/**
 * This class represents an application space on client-side.
 * @class
 */
Documa.context.ApplicationContext = Ext.extend(Object, (function(){
	const TAG = "Documa.context.ApplicationContext";
	const _log = Documa.util.Logger;
	var _cfactory = null;

	/**
	 * Helper method to register given listener to the specified request action.
	 *
	 * @param {String} requestAction requested action
	 * @param {Documa.communication.protocol.RuntimeRequestResponse} listener
	 *                object supporting the request-response communication
	 *                paradigm between at least two client-side runtime
	 *                contexts
	 */
	function addResponseListener(requestAction, listener){
		if(!( listener instanceof Documa.communication.protocol.RuntimeRequestResponse))
			throw new Error("Invalid listener argument defined!");

		let listeners = this._responseListener[requestAction];
		if(!listeners) {
			// no listener for the specified request registered
			this._responseListener[requestAction] = [listener];
		} else {
			this._responseListener[requestAction].push(listener);
		}
	}

	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {String} id
		 * @param {String} name
		 * @param {String} version
		 * @param {String} appinstid
		 * @param {Array.<Documa.distribution.Device>} [devices] optional device collection
		 */
		constructor: function(id, name, version, appinstid, devices){
			this._attributes = {};
			this._attributes.name = name;
			this._attributes.id = id;
			this._attributes.version = version;
			this._attributes.instid = appinstid;
			this._createdState = new Documa.context.states.ApplicationCreated(this);
			this._startingState = new Documa.context.states.ApplicationStarting(this);
			this._pausingState = new Documa.context.states.ApplicationPausing(this);
			this._runningState = new Documa.context.states.ApplicationRunning(this);
			this._currentState = this._startingState;
			this._eventDispatcher = new Documa.communication.events.EventDispatcher();
			this._interruptController = new Documa.interrupt.InterruptController();
			this._distributionManager = new Documa.distribution.DistributionManager(this);
			this._isInitiator = false;
			this._responseListener = {};
			_cfactory = new Documa.communication.commands.CommandFactory();
			let self = this;

			// test whether several devices should be used as application runtime container
			if(devices) {
				// init device register of current distribution manager
				devices.forEach(function(device){
					self._distributionManager.addDevice(device, false);
				});
			}

			// register response listener here
			// note: all response listener should be
			// subclass of {Documa.communication.protocol.RuntimeRequestResponse}
			addResponseListener.call(this, Documa.communication.commands.RequestActions.PREP_MIGRATE,
				this._distributionManager);
			addResponseListener.call(this, Documa.communication.commands.RequestActions.CMIT_MIGRATE,
				this._distributionManager);

			// register for distribution change events
			this._eventDispatcher.addEventListener(Documa.communication.events.ApplicationEvents.ON_SDISTCHNGD,
				this._distributionManager, this._distributionManager.updateSingleDistribution);

			// register for migration completed events
			this._eventDispatcher.addEventListener(Documa.communication.events.ApplicationEvents.ON_TRANSACTION_COMPLETED,
				this._distributionManager, this._distributionManager.onTransactionCompleted);

			// register for added channel event
			this._eventDispatcher.addEventListener(Documa.communication.events.ApplicationEvents.CHANNEL_CREATED,
				this._distributionManager, this._distributionManager.onChannelCreated);

			// register for environment model changes
			this._eventDispatcher.addEventListener(Documa.communication.events.SystemEvents.USABLE_DEVSADDED,
				this, function(event){
					try {
						/** @type {Array.<Descriptor>} */
						let clients = event.getPayload();
						clients.forEach(function(descriptor){
							let sid = descriptor.client.sid;
							let promise = Documa.RuntimeManager.getEnvironmentContext().wasAdded(sid);
							if(promise.fulfilled) {
								let device = Documa.RuntimeManager.getEnvironmentContext().getDevice(sid);
								self._distributionManager.addDevice(device, false);
							} else {
								promise.then(function(){
									let device = Documa.RuntimeManager.getEnvironmentContext().getDevice(sid);
									self._distributionManager.addDevice(device, false);
								}).catch(function(error){
									_log.error(TAG, error.stack);
								});
							}
						})
					} catch (error) {
						_log.error(TAG, error.stack);
					}
				});

			// remove the device and its corresponding distribution from application's distribution state layer
			this._eventDispatcher.addEventListener(Documa.communication.events.SystemEvents.USABLE_DEVSRMVED,
				this, function(event){
					try {
						/** @type {Array.<String>} */
						let deviceIds = event.getPayload();
						deviceIds.forEach(function(sid){
							let device = self._distributionManager.getDevice(sid);
							if(device) {
								self._distributionManager.removeDevice(sid);
							}
						});
					} catch (error) {
						_log.error(TAG, error.stack);
					}
				});

			// receive a low battery trigger event
			this._eventDispatcher.addEventListener(Documa.communication.events.ApplicationEvents.LOWBATTERY,
				this, function(event){
					try {
						_log.debug(TAG, 'Recieved CriticalEnergyTrigger');
						let data = event.getPayload().MIGRATION_DATA;
						// create a new job for the display phase handler
						let migjob = {
							type: "redistribution",
							name: "Migration options",
							payload: data
						};
						// send job for displaying to the display handler
						Documa.RuntimeManager.getRecommendationManager().getDisplayPhaseHandler().handleJob(migjob);
					} catch (error) {
						_log.error(TAG, error.stack);
					}
				});

			//receive a migration option selected event
			this._eventDispatcher.addEventListener(Documa.communication.events.ApplicationEvents.OPTIONSELECTED,
				this, function(event){
					try {
						_log.debug(TAG, 'received migration options selected event: ' + event.getPayload().MIGRATION_OPTION);

						// start migration
						Documa.RuntimeManager.getUIManager().getMigrationManager().startMigration(new Documa.distribution.migration.options.MigrationOption(event.getPayload().MIGRATION_OPTION));
					} catch (error) {
						_log.error(TAG, error.stack);
					}
				});

			// register for migration progress update events
			this._eventDispatcher.addEventListener(Documa.communication.events.ApplicationEvents.UPDATE_MIGRATIONPROGRESS,
				this, function(event){
					try {
						let _migrationOption = event.getPayload().update;

						// update migration
						Documa.RuntimeManager.getUIManager().getMigrationManager().getProgressManager().update(_migrationOption);
					} catch (error) {
						_log.error(TAG, error.stack);
					}
				});

			// register for cancel migration process events
			this._eventDispatcher.addEventListener(Documa.communication.events.ApplicationEvents.CANCEL_MIGRATIONPROGRESS,
				this, function(event){
					try {
						let cancelEvent = event.getPayload();

						// cancel migration
						Documa.RuntimeManager.getUIManager().getMigrationManager().cancelMigration(cancelEvent);
					} catch (error) {
						_log.error(TAG, error.stack);
					}
				});

			// register for reverse migration progress events
			this._eventDispatcher.addEventListener(Documa.communication.events.ApplicationEvents.REVERSE_MIGRATIONPROGRESS,
				this, function(event){
					try {
                        let _migrationOption = event.getPayload().reverse;

                        // reverse migration
                        Documa.RuntimeManager.getUIManager().getMigrationManager().getProgressManager().reverse(_migrationOption);
					} catch (error) {
						_log.error(TAG, error.stack);
					}
				});

			// register for close migration window events
			this._eventDispatcher.addEventListener(Documa.communication.events.ApplicationEvents.CLOSE_MIGRATIONWINDOW,
				this, function(event){
					try {
                        // close migration
                        Documa.RuntimeManager.getUIManager().getMigrationManager().closeMigration();
						_log.debug(TAG, "CLOSE_MIGRATIONWINDOW event received.");
					} catch (error) {
						_log.error(TAG, error.stack);
					}
				});
		},

		/**
		 * Triggers the server-side application loading process.
		 */
		start: function(){
			try {
				let appName = this.getValue(Documa.context.ApplicationContextAttributes.APP_NAME);
				let appId = this.getValue(Documa.context.ApplicationContextAttributes.APP_ID);
				let appVersion = this.getValue(Documa.context.ApplicationContextAttributes.APP_VERSION);
				// create initial component integration job
				let init_integration = new Documa.components.integration.IntegrationJob(window.uuid.v1(),
					Documa.components.ComponentIntegrationTypes.INITIATION, null);
				// register job for initial component integration
				Documa.RuntimeManager.getComponentManager().addIntegrationJob(init_integration);
				// send system level command to server
				let startapp = _cfactory.createApplicationStartCommand(appId, appVersion, appName, init_integration.getId());
				Documa.RuntimeManager.getCommunicationManager().sendSystemLevelMessage(startapp);
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},

		run: function(){
			try {
				this._currentState.run(null);
			} catch (error) {
				_log.trace(TAG, error);
			}
		},

		pause: function(){
			try {
				this._currentState.pause(null);
			} catch (error) {
				_log.trace(TAG, error);
			}
		},

		close: function(){
			try {
				this._currentState.close(null);
			} catch (error) {
				_log.trace(TAG, error);
			}
		},

		join: function(){
			try {
				this._currentState.join(null);
			} catch (error) {
				_log.trace(TAG, error);
			}
		},

		leave: function(){
			try {
				this._currentState.leave(null);
			} catch (error) {
				_log.trace(TAG, error);
			}
		},

		/**
		 * Called on error event from server-side.
		 *
		 * @param {Documa.communication.event.ApplicationErrorEvent} errorEvt
		 */
		error: function(errorEvt){
			try {
				var uiman = Documa.RuntimeManager.getUIManager();
				uiman.showError(errorEvt.getDescription());
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},

		/**
		 * @returns {Documa.collaboration.user.Participant}
		 */
		getInitiator: function(){
			/** @type {Documa.collaboration.user.Participant} */
			var initiator = this.getValue(Documa.context.ApplicationContextAttributes.APP_INITR);
			return initiator;
		},

		/**
		 * Returns application's participants.
		 * @returns {Array.<Documa.collaboration.user.Participant>}
		 */
		getParticipants: function(){
			var awarenessManager = Documa.RuntimeManager.getAwarenessManager();
			return awarenessManager.fromApplication(this);
		},

		/**
		 * Notifies all internal runtime response event listeners.
		 *
		 * @param {Documa.communication.protocol.RuntimeResponse} response
		 *            response message received from remote client on a request message
		 */
		notifyResponseListener: function(response){
			if(!( response instanceof Documa.communication.protocol.RuntimeResponse))
				throw new Error("Invalid response message argument!");

			var requestAction = response.getAction();
			var listeners = this._responseListener[requestAction];
			if(!listeners || listeners.length === 0) {
				_log.debug(TAG, "... no listener for RUNTIME RESPONSE message {" + requestAction + "} registered!");
				return;
			} else {
				for(var i = 0; i < listeners.length; ++i) {
					listeners[i].handleResponse(response);
				}
			}
		},


		/**
		 * Returns attribute value from given name.
		 *
		 * @param {String} name name of context attribute, e. g. the 'appid'
		 * @return {Object} attribute value
		 */
		getValue: function(name){
			return this._attributes[name];
		},

		/**
		 * Create mapping between key and its value.
		 * @param {Object} name attribute name of application context
		 * @param {Object} value attribute value of application context
		 */
		put: function(name, value){
			this._attributes[name] = value;
		},

		/**
		 * Sets new applications state.
		 *
		 * @param {Documa.context.states.ApplicationState} state new application state
		 */
		setState: function(state){
			this._currentState = state;
		},

		/**
		 * Returns current application state.
		 * @returns {Documa.context.states.ApplicationState}
		 */
		getState: function(){
			return this._currentState;
		},

		/**
		 * @returns {Documa.context.states.ApplicationCreated}
		 */
		getCreatedState: function(){
			return this._createdState;
		},

		/**
		 * Returns starting state of current application context.
		 * @returns {Documa.context.states.ApplicationStarting}
		 */
		getStartingState: function(){
			return this._startingState;
		},

		/**
		 * Returns pausing state of current application context.
		 * @returns {Documa.context.states.ApplicationPausing}
		 */
		getPausingState: function(){
			return this._pausingState;
		},

		/**
		 * Returns running state of current application context.
		 * @returns {Documa.context.states.ApplicationRunning}
		 */
		getRunningState: function(){
			return this._runningState;
		},

		/**
		 * Presents applications loading screen.
		 *
		 * @param {String} message info message to be presented during the loading phase
		 */
		showStartingView: function(message){
			var uiman = Documa.RuntimeManager.getUIManager();

			// shows component loader panel
			uiman.getComponentsLoadView().show(uiman.getCenterStage());
		},

		/**
		 * Closes applications loading screen.
		 */
		closeStartingView: function(){
			var uiman = Documa.RuntimeManager.getUIManager();
			setTimeout(function(){
				// hides component loader panel
				uiman.getComponentsLoadView().hide();
			}, 500);
		},

		/**
		 * Returns interrupt controller object.
		 *
		 * @return {Documa.interrupt.InterruptController}
		 */
		getInterruptController: function(){
			return this._interruptController;
		},

		/**
		 * Returns distribution manager.
		 *
		 * @return {Documa.distribution.DistributionManager}
		 */
		getDistributionManager: function(){
			return this._distributionManager;
		},

		/**
		 * Returns component manager of this application context, which
		 * only manages application-specific component instances.
		 *
		 * @return {Documa.components.ComponentManager}
		 */
		getComponentManager: function(){
			// TODO: return application context-specific component manager instance
			return Documa.RuntimeManager.getComponentManager();
		},

		/**
		 * Returns application context specific event dispatcher.
		 *
		 * @returns {Documa.communication.events.EventDispatcher}
		 */
		getEventDispatcher: function(){
			return this._eventDispatcher;
		},

		/**
		 * Returns flag showing if application context was initiated by current runtime
		 * or not.
		 *
		 * @return {Boolean} true if application context was initiated by current runtime
		 * else false
		 */
		initiatedByClient: function(){
			return this._isInitiator;
		}
	};
})());
