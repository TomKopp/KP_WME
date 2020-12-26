Ext.namespace('Documa');

Documa.require('Documa.util.Logger');
Documa.require('Documa.util.Util');
Documa.require('Documa.util.EventUtil');

Documa.require('Documa.components.ComponentManager');

Documa.require('Documa.authentication.AuthenticationManager');

Documa.require('Documa.collaboration.user.Participant');
Documa.require('Documa.collaboration.AccessControlManager');
Documa.require('Documa.collaboration.CoordinationManager');
Documa.require('Documa.collaboration.AwarenessManager');

Documa.require('Documa.ui.UIManager');
Documa.require('Documa.ui.layout.LayoutManager');

Documa.require('Documa.communication.EventBroker');
Documa.require('Documa.communication.events.Event');
Documa.require('Documa.communication.events.SystemEvent');
Documa.require('Documa.communication.events.EventFactory');
Documa.require('Documa.communication.events.EventDispatcher');
Documa.require('Documa.communication.CommunicationManager');
Documa.require('Documa.communication.ServiceAccess');
Documa.require('Documa.communication.protocol.RuntimeResponse');

Documa.require('Documa.interrupt.InterruptController');

Documa.require('Documa.context.RuntimeContext');
Documa.require('Documa.context.UserContext');
Documa.require('Documa.context.EnvironmentContext');
Documa.require('Documa.context.ContextManager');

Documa.require('Documa.recommendation.RecommendationManager');
Documa.require('Documa.recommendation.TriggerManager');

Documa.require('Documa.distribution.Device');
Documa.require('Documa.distribution.Distribution');
Documa.require('Documa.distribution.migration.MigrationPrepareRequest');
Documa.require('Documa.distribution.migration.MigrationCancelRequest');
Documa.require('Documa.distribution.migration.MigrationCommitRequest');
Documa.require('Documa.distribution.realization.RealizationPrepareRequest');
Documa.require('Documa.distribution.realization.RealizationCommitRequest');
Documa.require('Documa.distribution.transaction.CommitResponse');
Documa.require('Documa.deviceservices.DeviceServiceManager');

/**
 * @typedef {object} ApplicationIdentifierType
 * @property {string} version
 * @property {string} id
 * @property {string} instid
 * @property {string} name
 * @property {string} initr
 * @property {string} state
 */


/**
 * Global singleton class responsible for providing access to different runtime interfaces.
 * This class is the single entry point to runtime infrastructure.
 *
 * @class
 * @singleton
 */
Documa.RuntimeManager = (function(){

	/* ************************************************************** */
	/* private static members *************************************** */
	/* ************************************************************** */
	const SOCKET_SERVER_URL = "ws://localhost:8082";
	//var SOCKET_SERVER_URL = "ws://141.76.68.53:8082";

	const TAG = 'Documa.RuntimeManager';
	const LOG = Documa.util.Logger;
	const UTIL = Documa.util.Util;
	var _communicationManager = null;
	var _componentManager = null;
	var _eventBroker = null;

	/**
	 * @type {Documa.communication.events.EventFactory}
	 * @private
	 */
	var _eventFactory = null;

	/**
	 * @type {Documa.communication.events.EventDispatcher}
	 * @private
	 */
	var _eventDispatcher = null;

	/**
	 * @type {Documa.communication.ServiceAccess}
	 * @private
	 */
	var _serviceAccess = null;

	/**
	 * @type {Documa.context.RuntimeContext}
	 * @private
	 */
	var _runtimeContext = null;

	/**
	 * @type {Documa.context.EnvironmentContext}
	 * @private
	 */
	var _environmentContext = null;

	/**
	 * Keeps current application context.
	 * @type {Documa.context.ApplicationContext}
	 * @private
	 */
	var _applicationContext = null;

	/**
	 * Map of application contexts.
	 * @type {Object.<string, Documa.context.ApplicationContext>}
	 * @private
	 */
	var _applicationContextRegister = {};

	var _mediator = null;
	var _authenticationManager = null;
	var _self = null;
	var _accessControlManager = null;

	/** @type {Documa.collaboration.CoordinationManager} */
	var _coordinationManager = null;

	/** @type {Documa.collaboration.AwarenessManager} */
	var _awarenessManager = null;

	/** @type {Documa.ui.UIManager} */
	var _uiManager = null;

	/** @type {Documa.recommendation.RecommendationManager} */
	var _recommendationManager = null;

	/** @type {Documa.recommendation.TriggerManager} */
	var _triggerManager = null;
	var _triggerTest = null;

	/**
	 * @type {Documa.deviceservices.DeviceServiceManager}
	 * @private
	 */
	var _deviceServiceManager = null;

	/**
	 * @type {Documa.context.ContextManager}
	 * @private
	 */
	var _contextManager = null;

	/** ************************************************************** */
	/* private static methods **************************************** */
	/** ************************************************************** */

	/**
	 * Validates the descriptor's structure.
	 * @param {Descriptor} descriptor
	 */
	var validateDescriptor = function(descriptor){
		var test = UTIL.test;
		test("client", descriptor);
		test("services", descriptor);
	};

	/**
	 * TODO: Workaround Helper method returning runtime context.
	 * @returns {Documa.context.RuntimeContext}
	 */
	function getRuntimeContext(){
		if(navigator.userAgent.match(/(iPhone|iPod|Android|BlackBerry|IEMobile)/)) {
			return new Documa.context.SmartphoneRuntimeContext();
		} else {
			return new Documa.context.DesktopRuntimeContext();
		}
	}

	/**
	 * Helper method to validate the structure of given response event.
	 *
	 * @param {Documa.communication.Message} responseEvent
	 */
	function validateRuntimeResponseEvent(responseEvent){
		var payload = responseEvent.getPayload();
		if(!payload)
			throw new Error("No payload in runtime response event defined!");
		if(!payload.action)
			throw new Error("No action in runtime response event defined!");
		if(!payload.reqsndr)
			throw new Error("No request sender in runtime response event defined!");
		if(!payload.reqid)
			throw new Error("No request id in runtime response event defined!");
		if(!payload.resp)
			throw new Error("No payload data in runtime response event defined!");
		if(!payload.status)
			throw new Error("No status in runtime response event defined!");
	}

	/**
	 * Helper method returns runtime response object.
	 *
	 * @returns {Documa.communication.protocol.RuntimeResponse} response
	 */
	function getRuntimeResponseFrom(eventMsg){
		validateRuntimeResponseEvent(eventMsg);
		var payload = eventMsg.getPayload();
		var app = {
			id: payload.id,
			version: payload.version,
			instance: payload.instid
		};
		//create response instance from event
		var runtimeResponse = new Documa.communication.protocol.RuntimeResponse(app, payload.reqsndr, payload.action, payload.reqid);
		runtimeResponse.setStatus(payload.status);
		runtimeResponse.setResponsePayload(payload.resp);
		return runtimeResponse;
	}

	/**
	 * @param {string} sid device session id
	 * @returns {Promise}
	 */
	function wasDeviceLoaded(sid){
		return new Promise(function(fulfill, reject){
			try {
				if(!_environmentContext)
					reject(new Error("Environment context was not loaded!"));
				var wasAddedPromise = _environmentContext.wasAdded(sid);
				if(wasAddedPromise.fulfilled) {
					fulfill(_environmentContext.getDevice(sid));
				} else {
					wasAddedPromise.then(function(){
						fulfill(_environmentContext.getDevice(sid));
					}).catch(reject);
				}
			} catch (error) {
				reject(error);
			}
		});
	}

	return {
		/**
		 * Is called after the runtime environment was initialized.
		 *
		 * @returns {void}
		 */
		initialize: function(){
			LOG.debug(TAG, 'Initializing ...');
			_self = this;
			try {
				// determine runtime context from current browser properties -
				// just a workaround
				// TODO: rework determination of runtime context
				_runtimeContext = getRuntimeContext();
				_environmentContext = new Documa.context.EnvironmentContext();
				_deviceServiceManager = new Documa.deviceservices.DeviceServiceManager();
				_eventBroker = new Documa.communication.EventBroker();
				_communicationManager = new Documa.communication.CommunicationManager();
				_componentManager = new Documa.components.ComponentManager();
				_eventFactory = new Documa.communication.events.EventFactory();
				_eventDispatcher = new Documa.communication.events.EventDispatcher();

				_uiManager = new Documa.ui.UIManager();

				// _authentificationManager = new
				// Documa.authentification.AuthentificationManager();
				_authenticationManager = new Documa.authentication.AuthenticationManager();
				_serviceAccess = new Documa.communication.ServiceAccess(_componentManager);

				// collaboration related managers
				_coordinationManager = new Documa.collaboration.CoordinationManager();
				_awarenessManager = new Documa.collaboration.AwarenessManager();
				_accessControlManager = new Documa.collaboration.AccessControlManager();
				_mediator = new Ext.cruise.client.Mediator(LOG, _serviceAccess, null);
				_contextManager = new Documa.context.ContextManager();

				// init trigger- and recommendationManager
				_recommendationManager = new Documa.recommendation.RecommendationManager(_eventDispatcher, LOG);
				_triggerManager = new Documa.recommendation.TriggerManager(_recommendationManager, _eventDispatcher, LOG);

				// first show login screen to get the user's id
				_authenticationManager.start();

				// register default event handler
				_eventDispatcher.addEventListener(Documa.communication.events.ApplicationEvents.APP_CHANGED,
					this, // scope
					this.onApplicationChanged // handler
				);

				// create mapping between application lifecycle changed event
				// and its handler
				_eventDispatcher.addEventListener(Documa.communication.events.ApplicationEvents.APP_LIFECYCLE_CHANGED,
					this, // scope
					this.onApplicationLifecycleChanged // handler
				);

				// response event on smcdl requests are handeled by the
				// component manager
				_eventDispatcher.addEventListener(Documa.communication.events.ApplicationEvents.ON_REQSMCDLS,
					_componentManager, // scope
					_componentManager.handleEvent // handler
				);
				// create mapping between runtime request-response event and
				// runtime manager
				_eventDispatcher.addEventListener(Documa.communication.events.ApplicationEvents.ON_RUNTIME_RESP,
					this, // scope
					this.onRuntimeResponse // handler
				);

				// bind error event to runtime error handler
				_eventDispatcher.addEventListener(Documa.communication.events.ApplicationEvents.APP_ERROR,
					this, // scope
					this.onApplicationError // handler
				);

				// register to changes of the environment model
				_eventDispatcher.addEventListener(Documa.communication.events.SystemEvents.USABLE_DEVSADDED,
					this, // scope
					this.onUsableDevicesAdded // handler
				);

				_eventDispatcher.addEventListener(Documa.communication.events.SystemEvents.USABLE_DEVSRMVED,
					this, // scope
					this.onUsableDevicesRemoved // handler
				);

				// registerhandler for device descriptor ready event
				_eventDispatcher.addEventListener(Documa.communication.events.SystemEvents.DESCR_READY,
					this, // scope
					this.onDescriptorReady);

				// initialization of internal variables
				/**
				 * @type {{payload:{activeapps:Array, userapps:Array}}}
				 * @private
				 */
				this._applications = null;
			} catch (error) {
				var errorMsg = error;
				if(error.stack)
					errorMsg = error.stack;

				LOG.error(TAG, 'Failure during the initialization: ' + errorMsg);
			}
		},
		/**
		 * Called after the server pushed available or running applications to this client.
		 *
		 * @param {{payload:{activeapps:Array.<ApplicationIdentifierType>, userapps:Array.<ApplicationIdentifierType>}}} message
		 */
		onApplicationsReceived: function(message){
			this._applications = message;
		},
		/**
		 * Sends login to server specified by given server url.
		 *
		 * @param {String} reqtype
		 * @param {String} userid
		 * @param {String} userpwd
		 * @param {String} username
		 * @param {String} passphrase
		 * @param {String} pic
		 * @param {String} serverUrl
		 */
		onSendAuth: function(reqtype, userid, userpwd, username, passphrase, pic, serverUrl){
			try {
				_uiManager.showLoader("... sending login data");

				// initialize runtime context and load attributes
				_runtimeContext.initialize(function(context){
					// context initialized now
					// initialize communication infrastructure &
					// register event handler

					// give userid and runtime descriptor to
					// communication manager
					_communicationManager.init(reqtype, userid, userpwd, username, passphrase, pic,
						context.getAttribute(Documa.context.CONTEXT_ATTR_NAMES.RUNTIME_DESCR_OWL));

					// register handler function of connection state
					// changes
					_communicationManager.register(_self.onConnectionStateChanged);

					// create mappings between potential server-side
					// events and client-side middleware components
					_eventDispatcher.addEventListener(Documa.communication.events.SystemEvents.ONREQUSTSERV,
						_serviceAccess, _serviceAccess.handleEvent);
					// _eventDispatcher.addEventListener(Documa.communication.events.ApplicationEvents.APP_LOADING_INTERRPT,
					// _interruptController,
					// _interruptController.onInterrupt);

					//_communicationManager.open(SOCKET_SERVER_URL);
					_communicationManager.open(serverUrl);
				});
			} catch (error) {
				LOG.trace(TAG, error);
			}
		},
		/**
		 * Is called after the user has logged in successfully.
		 *
		 * @param {Documa.context.UserContext} userContext
		 */
		onSuccessfulLogin: function(userContext){
			var self = this;
			// hiding login loader mask on ui layer
			_uiManager.hideLoader();

			// close Authentication Panels
			_authenticationManager.reset();

			// store active user
			_authenticationManager.onSuccessfulLogin(userContext);

			// initialize awareness infrastructure
			// TODO start this after application was shared with other person
			// _awarenessManager.initialize();
			_uiManager.showMenuBar();

			// init menu view
			var menuman = _uiManager.getMenuManager();
			menuman.getMenuView().updateUserName(userContext.getUserId(), userContext.getUserName());

			// initialize awareness infrastructure
			_awarenessManager.initialize();
			_uiManager.showLoader("Processing device profile ...");
		},
		/**
		 * Is called after the user has refreshed the browser.
		 *
		 * @returns {void}
		 */
		onAlreadyLoggedIn: function(){
			// create and show Main Menu Bar
			// _mainMenu = new Documa.ui.mainmenu.MenuManager();

			// render menu bar to the north panel of the view port
			// var menuPanel = this.getLayoutManager().getMenuPanel();
			// _mainMenu.getTB().render(menuPanel);
			_uiManager.showMenuBar();

			// initialize awareness infrastructure
			// TODO start this after application was shared with other person
			_awarenessManager.initialize();
		},

		/**
		 * Function to show error on authentication sent from the Server
		 *
		 * @param error
		 *            String with error text from the Server
		 */
		onAuthError: function(error){
			// hiding login loader mask on ui layer
			_uiManager.hideLoader();
			_authenticationManager.showError(error);
		},

		/**
		 * Called after a usable device was registered on server-side.
		 * @param {Documa.communication.events.SystemEvent} devicesEvent
		 *              event encapsulates the set of added devices
		 */
		onUsableDevicesAdded: function(devicesEvent){
			LOG.debug(TAG, "Received collection of new usable devices.");
			/**
			 * @type {Documa.util.Util.test|Function}
			 */
			let test = UTIL.test;
			/** @type {Array.<Descriptor>} */
			let clients = devicesEvent.getPayload();
			if(!(clients instanceof Array))
				throw new Error("Invalid collection of device graphs received!");

			// get relevant information from collection of clients
			clients.forEach(function(clientObject){
				// valid client objects structure
				test("client", clientObject);
				test("user", clientObject);

				// getting device object from client object
				/** @type {Descriptor} */
				let clientDescriptor = clientObject.client;

				// validate client descriptor
				test("client", clientDescriptor);
				test("services", clientDescriptor);

				// instantiate corresponding neighbor device object
				let device = new Documa.distribution.Device(clientDescriptor.client);
				// loop over each device service
				clientDescriptor.services.forEach(function(serviceDescriptor){
					// register device service and create associations between each service
					// and its host device
					_deviceServiceManager.loadDeviceService(serviceDescriptor);
					let deviceService = _deviceServiceManager.getService(serviceDescriptor.id);
					device.addDeviceService(deviceService);
				});

				// load device description graph
				device.initialize().then(function(){
					_environmentContext.addNeighborDevice(device);
					_uiManager.getMetaUIController().addDevice(device);
				}).catch(function(error){
					LOG.error(TAG, error.stack);
				});

				// get user information from current client object
				let participant = new Documa.collaboration.user.Participant(clientObject.user, false);
				// add participant to the awareness manager
				_awarenessManager.add(participant);
			});
		},

		/**
		 * Called after a usable device was unregistered on server-side.
		 * @param {Documa.communication.events.SystemEvent} devicesEvent
		 *              event encapsulates the set of removed devices
		 */
		onUsableDevicesRemoved: function(devicesEvent){
			LOG.debug(TAG, "Received collection of unregistered devices.");
			/** @type {Array.<String>} */
			var deviceIds = devicesEvent.getPayload();
			var mui_controller = _uiManager.getMetaUIController();
			if(!(deviceIds instanceof Array))
				throw new Error("Invalid collection of device graphs received!");
			deviceIds.forEach(function(sessionid){
				var device = _environmentContext.getDevice(sessionid);
				if(!device) throw new Error("There is no device with session id: " + sessionid);
				// remove current device session from ui
				mui_controller.removeDevice(sessionid);

				// remove current device from all application contexts
				var applications = Documa.RuntimeManager.getApplicationsFromDevice(device);
				applications.forEach(function(app){
					mui_controller.removeApplicationDevice(app, device.getSessionId());
				});

				var userid = device.getUserId();
				// remove it from environment model
				_environmentContext.removeNeighborDevice(sessionid);
				var participant = _awarenessManager.getFromUserId(userid);
				if(!_environmentContext.hasAvailableDevices(participant)) {
					// remove the session's user from awareness manager when there are no more devices left
					_awarenessManager.remove(userid);
				}
			});
		},

		/**
		 * Called after the device descriptor profile was processed on server-side successfully.
		 *
		 * @param {Documa.communication.events.SystemEvent} readyEvent
		 */
		onDescriptorReady: function(readyEvent){
			var self = this;
			/** @type {Descriptor} */
			var descriptor = readyEvent.getPayload();
			// validating the descriptor's structure
			validateDescriptor(descriptor);
			var runtimeCtxt = this.getRuntimeContext();
			// setting json_ld runtime descriptor
			runtimeCtxt.setAttribute(Documa.context.CONTEXT_ATTR_NAMES.RUNTIME_DESCR_JSONLD, descriptor.client);
			runtimeCtxt.setAttribute(Documa.context.CONTEXT_ATTR_NAMES.RUNTIME_DESCR_SERVICES, descriptor.services);
			runtimeCtxt.loadRuntimeGraph().then(function(device){
				_uiManager.hideLoader();

				// set metaui as startview
				var metauiview = _uiManager.getMetaUIController().getMetaUIView();
				_uiManager.setCenterStageView(metauiview.getContainer());
				metauiview.initialize().then(function(){
					try {
						LOG.debug(TAG, "MetaUI initialized!");

						// show the sidebar
						_uiManager.getSidebarManager().showIcons();

						if(!self._applications) {
							// start listening for application list
							var int_id = setInterval(function(){
								if(self._applications) {
									_uiManager.getMetaUIController().showApplicationList(self._applications);
									clearInterval(int_id);
								}
							}, 500);
						} else {
							_uiManager.getMetaUIController().showApplicationList(self._applications);
						}
					} catch (error) {
						LOG.error(TAG, "Error during MetaUI initialization: " + error.stack);
					}
				}, function(error){
					LOG.error(TAG, "Error during MetaUI initialization: " + error.stack);
				});
			}).catch(function(error){
				LOG.error(TAG, error.stack);
			});
		},

		/**
		 * Sets url of communication proxy.
		 * @param url
		 */
		setProxyUrl: function(url){
			if(!_serviceAccess)
				throw new Error("ServiceAccess object is invalid!");

			_serviceAccess.setProxy(url);
		},

		/**
		 * Method is called before application is destroyed.
		 *
		 * @returns {void}
		 */
		destroy: function(){
			try {
				_communicationManager.unregister(this.onConnectionStateChanged);
				_communicationManager.close();
				// release references - make it easy for the garbage collector
				_communicationManager = null;
				_eventBroker = null;
				_componentManager = null;
				_eventDispatcher = null;
				_serviceAccess = null;
				_runtimeContext = null;
				_mediator = null;
				LOG.debug(TAG, '... destroyed.');
			} catch (error) {
				LOG.error(TAG, error.stack);
			}
		},

		/**
		 * Called after the server has triggered an application lifecycle
		 * changed event. This handler determines the corresponding application
		 * context and triggers the right state transition on client-side.
		 *
		 * @param {Documa.communication.events.ApplicationLifecycleChangedEvent} lfevent
		 *            event object containing information
		 *            of new lifecycle state
		 */
		onApplicationLifecycleChanged: function(lfevent) {
			let self = this;
			let payload = lfevent.getPayload();
			if(!payload)
				throw new Error("No payload in application lifecycle change event defined!");
			
			if(!_applicationContext) {
				// no application context available, i. e. change event represents a notification from another application space
				switch (payload.state) {
					case Documa.context.states.ApplicationStates.CREATING:
						// the creation of an application context was triggered manually
						// get application parameter from event
						let app_id = payload.id;
						let app_instid = payload.instid;
						let app_version = payload.version;
						let app_name = payload.name;
						/** @type {Array.<String>} */
						let app_cntrs = payload.cntrs;
						/** @type {Array.<Documa.distribution.Device>} */
						let containers = [];
						// loop over each session id and get the corresponding device
						app_cntrs.forEach(function(sid){
							containers.push(_environmentContext.getDevice(sid));
						});

						// test if there is already a matching application context
						if(self.retrieveApplicationContext(app_instid)) {
							return; // application context was already created
						}
						// add application into register of user's active applications
						_uiManager.addApplication(payload);

						// get host device
						let hostDevice = Documa.RuntimeManager.getRuntimeContext().getDevice();

						// test whether the current host is not included in the
						// application's environment model
						if(containers.indexOf(hostDevice) >= 0) {
							// create a new application context
							let appContext = new Documa.context.ApplicationContext(
								app_id,
								app_name,
								app_version,
								app_instid,
								containers);
							// set current application state
							appContext.setState(appContext.getCreatedState());
							// register created application context
							self.registerApplicationContext(appContext);
							// set it as current application context
							self.setApplicationContext(appContext);
							// enter the created state
							appContext.getState().created(lfevent);
						}
						break;
					case Documa.context.states.ApplicationStates.STARTING:
						// add application into register of user's active applications on server-side
						_uiManager.addApplication(payload);
						break;
					case Documa.context.states.ApplicationStates.PAUSING:
						LOG.debug(TAG, `Application ${lfevent.getApplicationId()} in state ${lfevent.getState()}`);
						break;
					case Documa.context.states.ApplicationStates.RUNNING:
						LOG.debug(TAG, `Application ${lfevent.getApplicationId()} in state ${lfevent.getState()}`);
						break;
					case Documa.context.states.ApplicationStates.CLOSING:
						LOG.debug(TAG, `Application ${lfevent.getApplicationId()} in state ${lfevent.getState()}`);
						break;
				}
			} else { // application context was already created, e. g. during the explicit application join
				let appInstid = _applicationContext.getValue(Documa.context.ApplicationContextAttributes.APP_INSTID);
				let appName = _applicationContext.getValue(Documa.context.ApplicationContextAttributes.APP_NAME);

				if(!appInstid) {
					// start of application not yet verified from the server -->
					// check session id
					let myid = _communicationManager.getClientID();
					if(myid !== Documa.util.EventUtil.getInitiatorIdFromJoinPayload(payload)) {
						// client is not application's initiator
						throw new Error("... received unknown lifecycle change event!");
					}
				} else if(appInstid !== payload.instid) {
					throw new Error("Received lifecycle change event from different application context!");
				}
				// determine new lifecylce state
				LOG.debug(TAG, "... received lifecycle change of application {" + appName + "}");
				switch (payload.state) {
					case Documa.context.states.ApplicationStates.CREATING:
						if(_applicationContext.getState() === _applicationContext.getCreatedState())
							_applicationContext.getState().created(lfevent);
						break;
					case Documa.context.states.ApplicationStates.STARTING:
						// _applicationContext.onStarting(lifecycleChangeEvent);
						_applicationContext.getState().start(lfevent);
						break;
					case Documa.context.states.ApplicationStates.PAUSING:
						// _applicationContext.onPausing(lifecycleChangeEvent);
						_applicationContext.getState().pause(lfevent);
						break;
					case Documa.context.states.ApplicationStates.RUNNING:
						// _applicationContext.onRunning(lifecycleChangeEvent);
						_applicationContext.getState().run(lfevent);
						break;
					case Documa.context.states.ApplicationStates.CLOSING:
						// _applicationContext.onClosing(lifecycleChangeEvent);
						_applicationContext.getState().close(lfevent);
						break;
				}
			}
		},

		/**
		 * Called after the server has triggered an application changed event,
		 * e. g. a new client joined. This handler determines the correct
		 * application context and triggers the handling of the specified change
		 * event according it's data.
		 *
		 * @param {Documa.communication.events.ApplicationEvent} appchangeEvent
		 *            event containing data of the application
		 *            change
		 */
		onApplicationChanged: function(appchangeEvent){
			var payload = appchangeEvent.getPayload();
			var appInstid = _applicationContext.getValue(Documa.context.ApplicationContextAttributes.APP_INSTID);
			var appName = _applicationContext.getValue(Documa.context.ApplicationContextAttributes.APP_NAME);

			if(appInstid !== payload.instid) {
				LOG.warn(TAG, "... received change event from different application context!");
				return;
			} else {
				LOG.debug(TAG, "... received change event of application {" + appName + "}");
				switch (payload.change) {
					case Documa.context.ApplicationChanges.CLIENT_JOINED:
						// _applicationContext.onJoining(appchangeEvent);
						_applicationContext.getState().join(appchangeEvent);
						break;
					case Documa.context.ApplicationChanges.CLIENT_LEFT:
						// _applicationContext.onLeaving(appchangeEvent);
						_applicationContext.getState().leave(appchangeEvent);
						break;
					case Documa.context.ApplicationChanges.COMPONENT_ADDED:
						_applicationContext.getState().addComponent(appchangeEvent);
						break;
					case Documa.context.ApplicationChanges.COMPONENT_EXCHANGED:
						throw new Error("Not implemented yet!");
						break;
					case Documa.context.ApplicationChanges.COMPONENT_REMOVED:
						_applicationContext.getState().removeComponent(appchangeEvent);
						break;
					case Documa.context.ApplicationChanges.DISTRIBUTION_CHANGED:
						LOG.debug(TAG, "... application's distribution state changed!");
						_applicationContext.getState().updateDistribution(appchangeEvent);
						break;
				}
			}
		},

		/**
		 * Called on received error from server-side runtime.
		 *
		 * @param {Documa.communication.event.ApplicationErrorEvent} errEvt object containing error event message
		 */
		onApplicationError: function(errEvt){
			// TODO: determine application context from application error event
			LOG.warn(TAG, "... received error event from server-side!");
			_applicationContext.error(errEvt);
		},

		/**
		 * Set selected application as current application context.
		 *
		 * @param {Documa.context.ApplicationContext}
		 *            appContext object containing several application
		 *            information, e. g. name, id and version
		 */
		setApplicationContext: function(appContext){
			_applicationContext = appContext;
			LOG.debug(TAG, "... current application context set: id {" + appContext.getValue(Documa.context.ApplicationContextAttributes.APP_NAME) + "}, name {" + appContext.getValue(Documa.context.ApplicationContextAttributes.APP_ID) + "}, version {" + appContext.getValue(Documa.context.ApplicationContextAttributes.APP_VERSION) + "}");
		},

		/**
		 * Returns current application context.
		 * @returns {Documa.context.ApplicationContext}
		 */
		getApplicationContext: function(){
			return _applicationContext;
		},

		/**
		 * Returns these application context objects in which the specified device is used.
		 *
		 * @param {Documa.distribution.Device} device
		 * @returns {Array.<Documa.context.ApplicationContext>}
		 */
		getApplicationsFromDevice: function(device){
			var result = [];
			var instanceIds = Object.keys(_applicationContextRegister);
			for(var i = 0; i < instanceIds.length; ++i) {
				var instid = instanceIds[i];
				var appcontext = _applicationContextRegister[instid];
				if(appcontext.getDistributionManager().getDevice(device.getSessionId())) {
					result.push(appcontext);
				}
			}
			return result;
		},

		/**
		 * Adds given application context into the corresponding registry.
		 * @param {Documa.context.ApplicationContext} appContext
		 */
		registerApplicationContext: function(appContext){
			var name = appContext.getValue(Documa.context.ApplicationContextAttributes.APP_NAME);
			var instid = appContext.getValue(Documa.context.ApplicationContextAttributes.APP_INSTID);
			LOG.debug(TAG, "Registering application context: " + name);
			_applicationContextRegister[instid] = appContext;
		},

		/**
		 * Retrieves application context from its instance identifier.
		 * @param {string} instid
		 * @returns {Documa.context.ApplicationContext}
		 */
		retrieveApplicationContext: function(instid){
			return _applicationContextRegister[instid];
		},

		/**
		 * Called on request from another client-side runtime.
		 *
		 * @param {Documa.communication.protocol.RuntimeRequest} request
		 *            object providing method to determine action,
		 *            parameters and the sender session
		 * @param {Documa.communication.protocol.RuntimeResponse} response
		 *            object providing method to send back response
		 *            data to requesting session
		 */
		onRuntimeRequest: function(request, response){
			var self = this;
			switch (request.getAction()) {
				case Documa.communication.commands.RequestActions.COMT_MODIFYCHANNEL: {
					// get the payload
					var tid = request.getAllParameters().transaction.id;
					var channel = request.getAllParameters().transaction.channel;

					// set type of the channel as a number
					channel.type = new Number(channel.type);

					// if this is part of the creation process, unblock the communication partners of the channel
					if(modificationType == Documa.communication.commands.ChannelModifiyTypes.CREATE) {
						self.getEventBroker().unblockChannelCommunicationPartners(channel);
					}

					// add success status
					response.setStatus(Documa.communication.protocol.RuntimeResponseStatus.SUCCESS);

					// write request response
					response.write({
						tid: tid,
						code: Documa.distribution.transaction.PrepareCodes.CHANNEL_INTEGRATION_SUCCESS,
						data: {}
					});

					break;
				}
				case Documa.communication.commands.RequestActions.PREP_MODIFYCHANNEL: {
					// get the payload
					var tid = request.getAllParameters().transaction.id;
					var channel = request.getAllParameters().transaction.channel;
					var modificationType = request.getAllParameters().transaction.modificationType;

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
							LOG.debug(TAG, "Invalid channel type '" + channel.type + "' given!");
							return;
					}

					// integrate the new channel
					if(modificationType == Documa.communication.commands.ChannelModifiyTypes.CREATE) {
						self.getEventBroker().addChannel(channel, function(success){
							// depending on success, set response codes
							var logMsg = "Notifing server about failed channel integration!";
							var statusCode = Documa.communication.protocol.RuntimeResponseStatus.FAILURE;
							var responseCode = Documa.distribution.transaction.PrepareCodes.CHANNEL_INTEGRATION_FAILURE;
							if(success) {
								logMsg = "Notifing server about successful channel integration.";
								statusCode = Documa.communication.protocol.RuntimeResponseStatus.SUCCESS;
								responseCode = Documa.distribution.transaction.PrepareCodes.CHANNEL_INTEGRATION_SUCCESS;
							}

							// log status
							LOG.debug(TAG, logMsg);

							// set success status
							response.setStatus(statusCode);

							// write back channel name as request response
							response.write({
								tid: tid,
								code: responseCode,
								data: {
									channelName: channel.name
								}
							});

						});
					}
					// remove the channel
					else if(modificationType == Documa.communication.commands.ChannelModifiyTypes.REMOVE) {
						self.getEventBroker().removeChannel(channel);

						// log status
						LOG.debug(TAG, "Notifing server about successful channel deletion.");

						// set success status
						response.setStatus(Documa.communication.protocol.RuntimeResponseStatus.SUCCESS);

						// write back request response
						response.write({
							tid: tid,
							code: Documa.distribution.transaction.PrepareCodes.CHANNEL_INTEGRATION_SUCCESS,
							data: {}
						});
					}
					else {
						LOG.debug(TAG, "Invalid modification type '" + modificationType + "' given!");
						return;
					}

					break;
				}
				case Documa.communication.commands.RequestActions.PREP_MIGRATE: {
					// *********************************
					// MIGRATION PREPARE_PHASE REQUEST *
					// *********************************
					// server-side distribution manager is requesting migration preparation
					var appcontext = this.getApplicationContext();
					var params = request.getAllParameters();

					// create migration prepare request from runtime request message
					var mr = new Documa.distribution.migration.MigrationPrepareRequest(appcontext, params);
					try {
						appcontext.getDistributionManager().onMigrationPrepareRequest(mr, function(prepareResponse){
							// received BEGIN_MIGRATION response as
							// {Documa.distribution.migration.MigrationPrepareResponse}
							// from distribution manager
							LOG.debug(TAG, "... migration ready state determined! Ready state: " + prepareResponse.getReadyCode());

							// set response status
							response.setStatus(Documa.communication.protocol.RuntimeResponseStatus.SUCCESS);

							// write migration-request-response back
							response.write(prepareResponse.getPayload());
						});
					} catch (error) {
						this.getUIManager().showError(error.toString());
						LOG.error(TAG, error.stack);

						// signal request was successful received, but during the migration preparation an error ocurred
						response.setStatus(Documa.communication.protocol.RuntimeResponseStatus.SUCCESS);

						// write back error as request response
						response.write({
							mid: mr.getMigrationId(),
							code: Documa.distribution.transaction.PrepareCodes.NO_COMPONENT_EXECUTABLE,
							data: {
								description: error.name + ": " + error.description,
								execmap: null
							}
						});
					}
					// *************************************
					// EOF MIGRATION PREPARE_PHASE REQUEST *
					// *************************************
					break;
				}
				case Documa.communication.commands.RequestActions.CMIT_MIGRATE: {
					// ********************************
					// MIGRATION COMMIT_PHASE REQUEST *
					// ********************************
					// TODO: get the corresponding application context from the message
					var appcontext = this.getApplicationContext();
					var params = request.getAllParameters();
					// create migration commit request from generic runtime request
					var mr = new Documa.distribution.migration.MigrationCommitRequest(appcontext, params);
					try {
						appcontext.getDistributionManager().onMigrationCommitRequest(mr, function(commitResponse){
							// executed after the integration, initialization and the state injection process
							// were executed successfully
							response.setStatus(Documa.communication.protocol.RuntimeResponseStatus.SUCCESS);

							// write back response
							response.write(commitResponse.getPayload());
							LOG.debug(TAG, "... MIGRATION COMMIT request processed!");
						});
					} catch (error) {
						this.getUIManager().showError(error.toString());
						LOG.error(TAG, error.stack);
					}
					break;
					// ************************************
					// EOF MIGRATION COMMIT_PHASE REQUEST *
					// ************************************
				}
				case Documa.communication.commands.RequestActions.ABRT_MIGRATE: {
					// TODO: get the corresponding application context from the message
					var appcontext = this.getApplicationContext();
					var params = request.getAllParameters();
					var mcr = new Documa.distribution.migration.MigrationCancelRequest(appcontext, params);
					try {
						// call request message handler
						appcontext.getDistributionManager().onMigrationCancelRequest(mcr, function(cancelResponse){
							response.setStatus(Documa.communication.protocol.RuntimeResponseStatus.SUCCESS);
							// write back response payload to server-side
							response.write(cancelResponse.getPayload());
							LOG.debug(TAG, "... migration ABORT request processed!");
						});
					} catch (error) {
						this.getUIManager().showError(error.toString());
						LOG.error(TAG, error.stack);
					}
					break;
					// ************************************
					// EOF MIGRATION ABORT_PHASE REQUEST  *
					// ************************************
				}
				case Documa.communication.commands.RequestActions.PREP_REALIZE: {
					var appctxt = this.getApplicationContext();
					var params = request.getAllParameters();
					// create the prepare request
					var prepareRequest = new Documa.distribution.realization.RealizationPrepareRequest(appctxt, params);
					try {
						// call distribution manager to react on the prepare request
						appctxt.getDistributionManager().onRealizationPrepareRequest(prepareRequest)
							.then(function(transactionResponse){
								// recieved response message from server-side distribution manager
								LOG.debug(TAG, "... distribution state was realized successfully on current host device!");
								response.setStatus(Documa.communication.protocol.RuntimeResponseStatus.SUCCESS);
								response.write(transactionResponse.getPayload());
							})
							.catch(function(error){
								// error during the processing of the PREPARE phase of the distribution realization request
								self.getUIManager().showError(error.toString());
								LOG.error(TAG, error.stack);
								response.setStatus(Documa.communication.protocol.RuntimeResponseStatus.SUCCESS);
								// write back error message to the server-side coordinator
								response.write({
									tid: prepareRequest.getRealization().getId(),
									code: Documa.distribution.transaction.PrepareCodes.NO_COMPONENT_EXECUTABLE,
									data: {
										description: error.name + ": " + error.description,
										execmap: null
									}
								});
							});
					} catch (error) {
						self.getUIManager().showError(error.toString());
						LOG.error(TAG, error.stack);
					}
					break;
					// ***************************************
					// EOF REALIZATION PREPARE_PHASE REQUEST *
					// ***************************************
				}
				case Documa.communication.commands.RequestActions.CMIT_REALIZE: {
					var appctxt = this.getApplicationContext();
					var params = request.getAllParameters();
					var commitRequest = new Documa.distribution.realization.RealizationCommitRequest(appctxt, params);
					try {
						appctxt.getDistributionManager().onRealizationCommitRequest(commitRequest)
							.then(function(commitResponse){
								response.setStatus(Documa.communication.protocol.RuntimeResponseStatus.SUCCESS);
								response.write(commitResponse.getPayload());
								LOG.debug(TAG, "... distribution state realization COMMIT finished!");
							})
							.catch(function(error){
								self.getUIManager().showError(error.toString());
								LOG.error(TAG, error.stack);
							});
					} catch (error) {
						self.getUIManager().showError(error.toString());
						LOG.error(TAG, error.stack);
					}
					break;
					// **************************************
					// EOF REALIZATION COMMIT_PHASE REQUEST *
					// **************************************
				}
				case Documa.communication.commands.RequestActions.ABRT_REALIZE: {
					// TODO: implement here
					throw new Error("Not implemented yet!");
					break;
					// *************************************
					// EOF REALIZATION ABORT_PHASE REQUEST *
					// *************************************
				}
			}
		},

		/**
		 * Called after an incoming runtime response event. It determines the
		 * action that was requested previously and decides which middleware
		 * component is handling the response event, e. g. the distribution
		 * manager processes the response data of a BEGIN_MIGRATION request.
		 *
		 * @param {Documa.communication.events.ApplicationEvent} responseEvent
		 */
		onRuntimeResponse: function(responseEvent){
			LOG.debug(TAG, "... received runtime response event!");
			// get instance of {Documa.communiction.protocol.RuntimeResponse} from event
			var response = getRuntimeResponseFrom.call(this, responseEvent);
			// TODO: use application parameters to get the corresponding
			// application context from
			var appcontext = this.getApplicationContext();
			appcontext.notifyResponseListener(response);
		},

		/**
		 * @param {Number}
		 *            state number indicating the connection state
		 */
		onConnectionStateChanged: function(state, data){
			switch (state) {
				case Documa.communication.ConnectionStates.Connected:
					LOG.debug(TAG, "Initial connection to SRE established!");
					break;
				case Documa.communication.ConnectionStates.Failure:
					LOG.warn(TAG, "SRE connection failure.");
					_uiManager.showError(data);
					break;
				case Documa.communication.ConnectionStates.Closed:
					LOG.debug(TAG, "SRE connection closed!");
					break;
			}
		},

		/**
		 * is called when someone wants to log out of the system.
		 *
		 * @returns {void}
		 */
		logout: function(){
			// clear user data
			this.getAuthenticationManager().onLogout();
			// do a browser refresh
			// TODO: find a better solution to reset the platform and show the
			// loginscreen after log out
			window.location.reload(true);
		},

		/**
		 * Returns the eventbroker instance.
		 *
		 * @returns {Documa.communication.EventBroker} eventbroker instance
		 */
		getEventBroker: function(){
			return _eventBroker;
		},

		/**
		 * Returns authentication manager.
		 *
		 * @returns {Documa.authentication.AuthenticationManager}
		 */
		getAuthenticationManager: function(){
			return _authenticationManager;
		},

		/**
		 * Returns event dispatcher that is used to communicate between
		 * middleware components.
		 *
		 * @returns {Documa.communication.events.EventDispatcher}
		 */
		getEventDispatcher: function(){
			return _eventDispatcher;
		},

		/**
		 * Returns the componentmanager instance.
		 *
		 * @returns {Documa.components.ComponentManager} componentmanager
		 *         instance
		 */
		getComponentManager: function(){
			return _componentManager;
		},

		/**
		 * Returns the recommendationmanager instance.
		 *
		 * @returns {Documa.recommendation.RecommendationManager}
		 */
		getRecommendationManager: function(){
			return _recommendationManager;
		},

		/**
		 * Returns the trigger manager instance.
		 * @returns {Documa.recommendation.TriggerManager}
		 */
		getTriggerManager: function(){
			return _triggerManager;
		},

		/**
		 * Returns the communicationmanager instance.
		 *
		 * @returns {Documa.communication.CommunicationManager}
		 */
		getCommunicationManager: function(){
			return _communicationManager;
		},

		/**
		 * Returns context manager.
		 *
		 * @returns {Documa.context.ContextManager}
		 */
		getContextManager: function(){
			return _contextManager;
		},

		/**
		 * Returns the service access instance.
		 *
		 * @returns {Ext.cruise.client.ServiceAccess}
		 */
		getServiceAccess: function(){
			return _serviceAccess;
		},

		/**
		 * Gets the runtime context.
		 *
		 * @returns {Documa.context.RuntimeContext} the instance of the runtime context object
		 */
		getRuntimeContext: function(){
			return _runtimeContext;
		},

		/**
		 * Set the current runtime context.
		 *
		 * @param {Documa.context.RuntimeContext} contextObj
		 *              object containing runtime context information
		 */
		setRuntimeContext: function(contextObj){
			_runtimeContext = contextObj;
		},

		/**
		 * Returns context object representing the global visible environment model
		 * from the current user's perspective.
		 * @returns {Documa.context.EnvironmentContext}
		 */
		getEnvironmentContext: function(){
			return _environmentContext;
		},

		/**
		 * Returns mediator object.
		 */
		getMediator: function(){
			return _mediator;
		},

		/**
		 * Returns ui manager instance, responsible for the whole presentation
		 * layer of the client runtime environment.
		 *
		 * @returns {Documa.ui.UIManager}
		 */
		getUIManager: function(){
			return _uiManager;
		},

		/**
		 * Returns access control manager instance.
		 *
		 * @returns {Documa.collaboration.AccessControlManager}
		 */
		getAccessControlManager: function(){
			return _accessControlManager;
		},

		/**
		 * Returns application's awareness manager.
		 *
		 * @returns {Documa.collaboration.AwarenessManager}
		 */
		getAwarenessManager: function(){
			return _awarenessManager;
		},

		/**
		 * Returns coordination manager instance.
		 *
		 * @returns {Documa.collaboration.CoordinationManager}
		 */
		getCoordinationManager: function(){
			return _coordinationManager;
		},

		/**
		 * @returns {Documa.deviceservice.DeviceServiceManager}
		 */
		getDeviceServiceManager: function(){
			return _deviceServiceManager;
		}
	};
})();
