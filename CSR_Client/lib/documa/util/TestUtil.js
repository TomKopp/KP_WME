Ext.namespace("Documa.util");

Documa.require("Documa.util.Logger");
Documa.require("Documa.components.ComponentMessage");
Documa.require("Documa.communication.events.EventFactory");
Documa.require("Documa.distribution.Device");
Documa.require("Documa.util.Asserts");

/**
 * @class
 * @singleton
 */
Documa.util.TestUtil = function(){
	const TAG = "Documa.util.TestUtil";
	const LOG = Documa.util.Logger;
	const TEST = Documa.util.Asserts;

	///////////////////////////
	// private class members //
	///////////////////////////

	/**
	 * @type {Documa.context.ApplicationContext}
	 * @private
	 */
	let _appcontext = null;
	let _eventFactory = new Documa.communication.events.EventFactory();
	let _lowBatteryEvt = new Documa.components.ComponentMessage();
	_lowBatteryEvt.setName("batterylow");
	_lowBatteryEvt.appendToBody("level", 0.2);

	/**
	 * @returns {Documa.context.ApplicationContext}
	 */
	function getApplicationContext(){
		if(!_appcontext) {
			_appcontext = Documa.RuntimeManager.getApplicationContext();
		}
		return _appcontext;
	}

	/**
	 * Helper function loading additional "virtual" devices into the environment
	 * context for testing purposes.
	 *
	 * @returns {Promise.<Array.<Documa.distribution.Device>>}
	 */
	function loadMigrationTargets(){
		// session id defined in the migration options file
		let ids = {
			tablet: "3ff5c8f9-6bde-4a5a-a8b2-1d2ec9350a4d",
			desktop: "3ea63a6e-952c-11e6-ae22-56b6b6499611",
			smartphone: "690cf9bb-47a5-4b4f-8f0d-7fad57268343"
		};
		// device graphs
		let profiles = {
			smartphone: "tests/platform-smartphone.json",
			desktop: "tests/platform-desktop.json",
			tablet: "tests/platform-tablet.json"
		};

		/** @type {Array.<Promise.<{sid:String, payload:Object}>>} */
		let promises = [];
		for(let key in ids) {
			let sid = ids[key];
			let url = profiles[key];
			promises.push(new Promise((fulfill, reject) =>{
				let result = {sid: sid, payload: null};
				// loading current device graph in JSON-LD format
				jQuery.ajax({
					url: url,
					success: function(data, statusText, xhr){
						if(xhr.readyState == 4 && result) {
							if(typeof data == "string")
								data = JSON.parse(data);
							result.payload = data;
							fulfill(result);
						}
					},
					error: function(xhr, statusText, errorText){
						reject(new Error(errorText));
					}
				})
			}));
		}
		return new Promise((fulfill, reject) =>{
			// wait until all promises are fulfilled
			Promise.all(promises).then((results) =>{
				LOG.debug(TAG, "Loaded migration options devices.");

				/** @type{Array.<Promise.<Documa.distribution.Device>>} */
				let allDevs = [];
				LOG.debug(TAG, "Initializing all devices ...");
				// initialize each device and collect its initialization promise
				for(let result of results) {
					// instantiate corresponding neighbor device object using the session id defined
					// in the migration data options file
					let device = new Documa.distribution.Device(result.payload.client, result.sid);
					let p = device.initialize().then((device) =>{
						Documa.RuntimeManager.getEnvironmentContext().addNeighborDevice(device);
						Documa.RuntimeManager.getUIManager().getMetaUIController().addDevice(device);
						return device;
					});
					allDevs.push(p);
				}
				// wait until all initialization actions are completed
				Promise.all(allDevs).then((devices) =>{
					// now each device is initialized
					LOG.debug(TAG, "... all devices initialized!");
					fulfill(devices);
				});
			}).catch((error) =>{
				reject(error);
			});
		});
	}

	/**
	 * Validates given migration options.
	 * @param {Array.<Documa.distribution.migration.options.MigrationOption>} options
	 */
	function validateMigrationOptions(options){
		TEST.assertTrue(options.length == 7);
		/**
		 * Promise handler for comparing given migration options with predefined test data.
		 * @param {{options: Array.<Documa.distribution.migration.options.MigrationOptionType>}} exampleData
		 */
		let handle = (exampleData) =>{
			let i = 0;
			for(let xmo of exampleData.options) {
				let mo = options[i];
				let mc = mo.getCause();
				// comparing migration option instances with sample data
				TEST.assertTrue(mo.getId() === xmo.id, "Invalid migration option id.");
				TEST.assertTrue(mo.getSourceDevice() === xmo.sourceDevice, `Mismatching source devices: ${mo.getSourceDevice()} neq ${xmo.sourceDevice}`);
				// comparing migration cause
				TEST.assertTrue(mc.getDescription() === xmo.cause.cause, "Mismatching cause description.");
				TEST.assertTrue(mc.getSourceLabel() === xmo.cause.source, "Mismatching cause source.");
				// comparing migration effects
				let j = 0;
				for(let xme of xmo.effects) {
					let me = mo.getMigrationEffects()[j];
					TEST.assertTrue(me.getEffectTarget() === xme.target, "Mismatching effect target.");
					TEST.assertTrue(me.getValue() === xme.value, "Mismatching effect value.");
					++j;
				}
				// comparing distribution options
				let k = 0;
				for(let xdv of xmo.distributions) {
					let dv = mo.getDistributionOptions()[k];
					TEST.assertTrue(dv.getDevice().getSessionId() === xdv.container);
					TEST.assertTrue(dv.getExecutables().length === xdv.executables.length);
					TEST.assertTrue(dv.getReplaceables().length === xdv.replaceables.length);
					++k;
				}
				++i;
			}
		};

		// requesting test data
		this.requestMigrationOptions().then(handle).catch((error) =>{
			LOG.error(TAG, error.stack);
		});
	}

	/**
	 * @param {Documa.communication.events.ApplicationEvent} evt
	 */
	function onMigrationOptionsReady(evt){
		/** @type {{options:Array.<Documa.distribution.migration.options.MigrationOption>}} */
		let payload = evt.getPayload();

		// validates data structure of migration options
		validateMigrationOptions.call(this, payload.options);
	}

	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Requesting test data including several migration options.
		 * @returns {Promise}
		 */
		requestMigrationOptions: function(){
			return new Promise((fulfill, reject) =>{
				jQuery.ajax({
					url: "res/migrations/migration_options.json",
					/**
					 * @param {Object} result
					 * @param {String} status
					 * @param {XMLHttpRequest} xhr
					 */
					success: function(result, status, xhr){
						if(xhr.readyState == 4 && result) {
							if(typeof result == "string")
								result = JSON.parse(result);
							fulfill(result);
						}
					},
					/**
					 * @param {XMLHttpRequest} xhr
					 * @param {String} status
					 * @param {String} error
					 */
					error: function(xhr, status, errorTxt){
						reject(new Error(errorTxt));
					}
				});
			});
		},

		/**
		 * Publishes a critical battery context event.
		 */
		testMigrationOptions: function(){
			let self = this;
			LOG.debug(TAG, "Setup environment context ...");

			// setup virtual environment context for testing purposes
			loadMigrationTargets.call(this).then((devices) =>{
				LOG.debug(TAG, "All devices ready!");

				// get active application context
				let appctx = getApplicationContext.call(self);
				let dm = appctx.getDistributionManager();
				let ed = appctx.getEventDispatcher();

				// register each device as distribution target
				for(let dev of devices)
					dm.addDevice(dev);

				// validate data structure of returned migration options
				ed.addEventListener(Documa.communication.events.ApplicationEvents.MIGROPTS_READY,
					this, onMigrationOptionsReady);

				LOG.debug(TAG, "Publishing critical battery context event ...");
				// encapsulate battery-low event as context event
				let contextEvent = _eventFactory.createContextEvent(_lowBatteryEvt);
				ed.dispatchEvent(contextEvent);
			}).catch((error) =>{
				// an error occured during the environment context setup
				if(error.stack) {
					LOG.error(TAG, error.stack);
				} else {
					LOG.error(TAG, error);
				}
			});
		}
	};
}();