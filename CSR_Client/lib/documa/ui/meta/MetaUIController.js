Ext.namespace("Documa.ui.meta");

Documa.require("Documa.util.Logger");
Documa.require("Documa.util.TimedTask");
Documa.require("Documa.communication.commands.CommandFactory");
Documa.require("Documa.ui.meta.MetaUIView");
Documa.require("Documa.ui.meta.subview.StartView");
Documa.require("Documa.ui.meta.directives.DragNDrop");
Documa.require("Documa.ui.meta.directives.DistributionDialog");
Documa.require("Documa.ui.meta.states.AppCreatingState");

Documa.ui.meta.MetaUIEvents = {
	CTRLINIT: "ctrlinit",
	MAIN_LOADED: "mui_mainloaded",
	START_LOADED: "mui_startloaded",
	DISTV_LOADED: "mui_distvloaded",
	DISTDIALOG_LOADED: "mui_distdialogloaded",
	LOADV_LOADED: "mui_loadvloaded",
	DISTITEM_CREATED: "distitemcreated",
	DISTITEM_CLOSED: "distitemclosed",
	ITEM_CLOSED: "mui_itemclosed"
};

Documa.ui.meta.MetaUiStates = {
	INIT: 'initialising',
	UPD: 'updating',
	RDY: 'ready'
};

Documa.ui.meta.ViewNames = {
	DEV_OWN: 'deviceowner',
	DIST: 'distribution',
	EXTCAP: 'extendedcap'
};

Documa.ui.meta.DnD = {
	TEXT: "text"
};

/**
 * Class controlling the interaction between the view and model layer.
 * @class
 */
Documa.ui.meta.MetaUIController = Ext.extend(Object, (function() {
	const TAG = 'Documa.ui.meta.MetaUIController';
	const LOG = Documa.util.Logger;
	
	////////////////////////////////
	// private controller methods //
	////////////////////////////////
	
	/**
	 * Called after an application was created on server- and client-side.
	 * @param {Documa.communication.events.ApplicationEvent} event
	 */
	function onApplicationCreated(event) {
		let self = this;
		let payload = event.getPayload();
		if(payload.state === Documa.context.states.ApplicationStates.CREATING) {
			// received created event as application participant
			
			// get the corresponding application context from the
			// runtime manager and active the distribution view
			// setTimeout(() => {
			// make sure the runtime manager has processed the event
			// before the activation of the distribution view
			let appcontext = Documa.RuntimeManager.retrieveApplicationContext(event.getApplicationInstanceId());
			if(!appcontext) {
				LOG.warn(TAG, "... there is no application context: " + event.getApplicationInstanceId());
				return;
			}
			// test if current host device is an participant of created application context
			let hostDevice = Documa.RuntimeManager.getRuntimeContext().getDevice();
			let device = appcontext.getDistributionManager().getDevice(hostDevice.getSessionId());
			if(device) {
				LOG.debug(TAG, "Starting the distribution configuration of current application.");
				// application context includes current host device --> activate the distribution view
				self._currentState.setApplicationContext(appcontext);
				// start with the configuration of the application's distribution
				self._currentState.configureDistribution();
			}
			// }, 100);
		}
	}
	
	///////////////////////////////
	// public controller methods //
	///////////////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {Documa.ui.UIManager} uiManager
		 */
		constructor: function(uiManager) {
			let self = this;
			/**
			 * @type {Documa.communication.commands.CommandFactory}
			 * @private
			 */
			this._commandFactory = new Documa.communication.commands.CommandFactory();
			/**
			 * Meta ui view container.
			 * @type {Documa.ui.meta.MetaUIView}
			 * @private
			 */
			this._metaUiView = new Documa.ui.meta.MetaUIView(this);
			
			/**
			 * MetaUIs scope.
			 * @type {$rootScope.Scope}
			 * @private
			 */
			this._scope = null;
			
			/**
			 * Keeps reference to the global ui manager instance.
			 * @type {Documa.ui.UIManager}
			 */
			this._uiManager = uiManager;
			
			/**
			 * @type {Documa.ui.meta.states.MetaUIState}
			 * @private
			 */
			this._currentState = new Documa.ui.meta.states.AppCreatingState(null, self);
			
			/**
			 * References the application created event handler
			 * @type {Function}
			 * @private
			 */
			this._createdEventHandler = onApplicationCreated.bind(this);
			
			/**
			 * @type {Promise}
			 * @private
			 */
			this._applicationCreatedPromise = new Promise(function(resolve, reject) {
				try {
					if(self._currentState instanceof Documa.ui.meta.states.ConfigureDistributionState) {
						resolve();
						self._applicationCreatedPromise.fulfilled = true;
					} else {
						let fn = self._createdEventHandler;
						self._createdEventHandler = function(event) {
							fn(event);
							resolve();
							self._applicationCreatedPromise.fulfilled = true;
						}
					}
				} catch (error) {
					reject(error);
				}
			});
			
			// register event handler at the central event dispatcher
			let eventDispatcher = Documa.RuntimeManager.getEventDispatcher();
			
			// listen for application lifecycle changes
			eventDispatcher.addEventListener(Documa.communication.events.SystemEvents.APPLFCHNG, self,
				/** @param {Documa.communication.events.ApplicationEvent} event */
				function(event) {
					if(self._createdEventHandler) {
						Documa.RuntimeManager.getUIManager().getMenuManager().getMenuView().showAppItems();
						self._createdEventHandler(event);
					}
				});
			
			// listen for application changes
			eventDispatcher.addEventListener(Documa.communication.events.ApplicationEvents.ON_SDISTCHNGD, self,
				/** @param {Documa.communication.events.ApplicationEvent} event */
				function(event) {
					// called after a distribution entity was changed
					let payload = event.getPayload();
					
				});
		},
		
		/**
		 * @returns {Promise}
		 */
		whenApplicationCreated: function() {
			return this._applicationCreatedPromise;
		},
		
		/**
		 * Returns meta ui's scope object.
		 *
		 * @returns {$rootScope.Scope}
		 */
		getScope: function() {
			return this._scope;
		},
		
		/**
		 * Sets current metaui state.
		 * @param {Documa.ui.meta.states.MetaUIState} state
		 *            application creation workflow state
		 */
		setState: function(state) {
			this._currentState = state;
		},
		
		/**
		 * Returns current application create workflow state.
		 * @returns {Documa.ui.meta.states.MetaUIState}
		 */
		getState: function() {
			return this._currentState;
		},
		
		/**
		 * Triggers the view change on the mainstage
		 * @param  {String} view new view name
		 */
		changeView: function(view) {
			this._metaUiView.changeView(view);
		},
		
		/**
		 * Show the mainframe panel.
		 */
		show: function() {
			this._metaUiView.show();
		},
		
		/**
		 * Adds device to the metaui.
		 * @param {Documa.distribution.Device} device
		 */
		addDevice: function(device) {
			let self = this;
			let readyPromise = this._metaUiView.whenReady();
			if(readyPromise.fulfilled) {
				this._metaUiView.addVisibleDevice(device);
			} else {
				readyPromise.then(function() {
					self._metaUiView.addVisibleDevice(device);
				}).catch(function(error) {
					LOG.error(TAG, error.stack);
				});
			}
		},
		
		/**
		 * Adds device to the application context on the metaui layer.
		 * @param {Documa.context.ApplicationContext} appcontext
		 * @param {Documa.distribution.Device} device
		 */
		addApplicationDevice: function(appcontext, device) {
			LOG.debug(TAG, "... adding device " + device.getSessionId() + " to the metaui.");
			let self = this;
			let readyPromise = this._metaUiView.whenReady();
			if(readyPromise.fulfilled) {
				this._metaUiView.addApplicationDevice(appcontext, device);
			} else {
				readyPromise.then(function() {
					self._metaUiView.addApplicationDevice(appcontext, device);
				}).catch(function(error) {
					LOG.error(TAG, error.stack);
				});
			}
		},
		
		/**
		 * Removes specified device from the metaui.
		 * @param {String} sid device session id
		 */
		removeDevice: function(sid) {
			let device = Documa.RuntimeManager.getEnvironmentContext().getDevice(sid);
			this._metaUiView.removeVisibleDevice(device);
		},
		
		/**
		 * @param {Documa.context.ApplicationContext} appcontext
		 * @param {string} sid device session id
		 */
		removeApplicationDevice: function(appcontext, sid) {
			let device = Documa.RuntimeManager.getEnvironmentContext().getDevice(sid);
			this._metaUiView.removeApplicationDevice(appcontext, device);
		},
		
		/**
		 * Adds list of server-side registered application to the metaui.
		 *
		 * @param {{payload:{activeapps:Array, userapps:Array}}} message
		 */
		showApplicationList: function(message) {
			let activeApps = message.payload.activeapps;
			let userApps = message.payload.userapps;
			// add predefined applications of current device owner
			for(let i = 0; i < userApps.length; i++) {
				this._metaUiView.addLoadableApplication(
					userApps[i].id,
					userApps[i].name,
					userApps[i].version
				);
			}
			// add runing applications to the metaui
			for(let i = 0; i < activeApps.length; i++) {
				// name, id, version, initr, instid
				this._metaUiView.addRunningApplication(
					activeApps[i].id,
					activeApps[i].name,
					activeApps[i].version,
					activeApps[i].initr,
					activeApps[i].instid,
					activeApps[i].state
				);
			}
		},
		
		/**
		 * Returning the view layer of the meta ui.
		 * @returns {Documa.ui.meta.MetaUIView}
		 */
		getMetaUIView: function() {
			return this._metaUiView;
		},
		
		/**
		 * Sets application context.
		 *
		 * @param {Documa.context.ApplicationContext} appcontext
		 */
		setApplicationContext: function(appcontext) {
			this._currentState.setApplicationContext(appcontext);
			this._metaUiView.changeApplicationContext(appcontext);
		},
		
		/**
		 * Creates a new empty application.
		 * @param {String} id
		 * @param {String} name
		 * @param {String} version
		 * @param {Array.<Documa.distribution.Device>} devices
		 * @param {Number} testcase
		 * @returns {Promise}
		 */
		createApplication: function(id, name, version, devices, testcase) {
			let self = this;
			/** @type {Array.<String>} */
			let sessionIds = [];
			devices.forEach(function(device) {
				sessionIds.push(device.getSessionId());
			});
			return new Promise(function(resolve, reject) {
				let jobid = uuid.v1();
				let eventDispatcher = Documa.RuntimeManager.getEventDispatcher();
				
				// override created event handler
				/** @param {Documa.communication.events.ApplicationEvent} event */
				self._createdEventHandler = function(event) {
					try {
						let payload = event.getPayload();
						// test application lifecycle state
						switch (payload.state) {
							case Documa.context.states.ApplicationStates.CREATING:
								// received an application created event
								if(!payload.jobid || payload.jobid.length === 0)
									throw new Error("Invalid job identifier!");
								
								// compare current creation process id and the event delivered id
								if(payload.jobid === jobid) {
									// make sure that this event processing happens after the
									// processing in the runtime manager context
									setTimeout(function() {
										// get corresponding application context
										let appcontext = Documa.RuntimeManager.retrieveApplicationContext(event.getApplicationInstanceId());
										appcontext.setState(appcontext.getCreatedState());
										resolve(appcontext);
										Promise.resolve(self._applicationCreatedPromise);
										self._applicationCreatedPromise.fulfilled = true;
									}, 100);
								}
								break;
						}
					} catch (error) {
						reject(error);
					}
				};
				
				// get application creation command
				let createCommand = null;
				if(testcase > 0) {
					// eof event handler
					createCommand = self._commandFactory.createApplicationCreateCommand(id, version, name, sessionIds,
						jobid, testcase);
				} else {
					// eof event handler
					createCommand = self._commandFactory.createApplicationCreateCommand(id, version, name, sessionIds,
						jobid);
				}
				self._metaUiView.showLoader("Initiating distributed application ...");
				// trigger application process
				Documa.RuntimeManager.getCommunicationManager().sendSystemLevelMessage(createCommand);
			});
		},
		
		/**
		 * Starts an available application from the application list.
		 * @param  {String} id      Application ID
		 * @param  {String} name    Application name
		 * @param  {String} version Application version
		 */
		loadComposition: function(id, name, version) {
			// create application context object that encapsulates several application
			// lifecycle states
			let appctxt = new Documa.context.ApplicationContext(id, name, version, null);
			Documa.RuntimeManager.setApplicationContext(appctxt);
			// calling start on application context
			// Documa.RuntimeManager.getApplicationContext().start();
			// create promise object handling asynchronous application starting process
			return new Promise((fulfill, reject) => {
				let jobid = uuid.v1();
				/**
				 * @param {Documa.communication.events.ApplicationLifecycleChangedEvent} event
				 * @private
				 */
				self._startingEventHandler = (event) => {
					try {
						let payload = event.getPayload();
						switch (payload.state) {
							case Documa.context.states.ApplicationStates.STARTING:
								if(event.getSubstate() === Documa.context.states.StartingSubstates.INTEGRATING) {
									// received an application created event
									if(!payload.jobid || payload.jobid.length === 0)
										throw new Error("Invalid job identifier!");
									
									if(payload.jobid === jobid) {
										setTimeout(() => {
											let appinstid = event.getApplicationInstanceId();
											let appcontext = Documa.RuntimeManager.retrieveApplicationContext(appinstid);
											if(!appcontext) {
												reject(new Error(`Could not retrieve matching application context from id: ${appinstid}`));
											}
											fulfill(appcontext);
										}, 100);
									}
								}
								break;
						}
					} catch (error) {
						reject(error);
					}
				};
				// calling start on application context
				appctxt.start(jobid);
			});
		},
		
		/**
		 * Joins an executed application from the application list
		 * @param  {String} id      application ID
		 * @param  {String} name    application name
		 * @param  {String} version application version
		 * @param  {String} instid  application Instance id
		 * @param  {String} state   application lifecycle state
		 */
		joinApp: function(id, name, version, instid, state) {
			LOG.debug(TAG, "... joining application {id: " + id + ", name: " + name + " version: " + version + " state: " + state + "}");
			if(!state) throw new Error("Undefined application state detected!");
			// create application context object that encapsulates several application
			// lifecycle states
			let appcontext = new Documa.context.ApplicationContext(id, name, version, instid);
			// test current application lifecycle state
			switch (state) {
				case Documa.context.states.ApplicationStates.CREATING:
					// set representation explicitly
					appcontext.setState(appcontext.getCreatedState());
					break;
				case Documa.context.states.ApplicationStates.STARTING:
					appcontext.setState(appcontext.getStartingState());
					break;
				case Documa.context.states.ApplicationStates.PAUSING:
					appcontext.setState(appcontext.getPausingState());
					break;
				case Documa.context.states.ApplicationStates.RUNNING:
					appcontext.setState(appcontext.getRunningState());
					break;
			}
			Documa.RuntimeManager.setApplicationContext(appcontext);
			Documa.RuntimeManager.registerApplicationContext(appcontext);
			this.setApplicationContext(appcontext);
			// calling join on application context
			appcontext.join();
		},
		
		/**
		 * Consider given distribution state transaction.
		 * @param {Documa.distribution.transaction.DistributedTransaction} transaction
		 */
		consider: function(transaction) {
			let self = this;
			transaction.addListener(Documa.distribution.transaction.TransactionEvents.PREPARING, function() {
				if(transaction instanceof Documa.distribution.realization.Realization) {
					self._metaUiView.showLoader("Integrating components ...");
				}
			});
			
			transaction.addListener(Documa.distribution.transaction.TransactionEvents.COMPLETED, function() {
				if(transaction instanceof Documa.distribution.realization.Realization) {
					self._metaUiView.showLoader("... finished!");
					let task = new Documa.util.TimedTask();
					task.wait(800).then(function() {
						self._metaUiView.hideLoader();
					});
				}
			});
		}
	};
})());