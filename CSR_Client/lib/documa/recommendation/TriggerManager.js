Ext.namespace('Documa.recommendation');
/**
 * @class Documa.recommendation.TriggerManager
 * This class provides a trigger manager for the client side of the csr.
 * Its duties include the initialization, registration and deregistration of triggers for recommendations.
 *
 * @author wagner, siekmann
 */
Documa.require('Documa.util.Logger');
//Documa.require('Documa.recommendation.trigger.capSelection');
Documa.require('Documa.recommendation.trigger.EnergyCriticalTrigger');
Documa.require('Documa.recommendation.trigger.unwiredEvent');
Documa.require('Documa.recommendation.RecommendationManager');
Documa.require('Documa.communication.events.EventFactory');

/**
 * @typedef {Object} TriggerRegistrationEntry
 * @property {Documa.recommendation.trigger.client.ClientsideTrigger} trigger
 * @property {Array.<EventObject>} events
 * @property {Documa.context.ApplicationContext} app
 */

/**
 * @class
 */
Documa.recommendation.TriggerManager = Ext.extend(Object, function(){
	const TAG = "Documa.recommendation.TriggerManager";
	const LOG = Documa.util.Logger;

	/**
	 * Helper method to forward context events from a device service.
	 *
	 * @param {Documa.communication.events.ContextEvent} contextEvt
	 */
	function onContextEvent(contextEvt){
		let self = this;
		let ctxMsg = contextEvt.getContextChange();
		LOG.debug(TAG, `Received context event ${ctxMsg.getName()}`);
		if(this._triggers.size == 0) {
			LOG.debug(TAG, "Currently there are no triggers available!");
			return;
		}
		let recman = this.recMan;
		let triggers = this.getTriggersFromComponentMessage(ctxMsg);
		for(let trigger of triggers) {
			let appcontext = this._triggers.get(trigger.getId()).app;
			trigger.checkCondition(ctxMsg).then((result) =>{
				if(result) {
					trigger.requestRecommendations(ctxMsg).then((result) =>{
						let pl = [];
						result.forEach(option => pl.push(option.serialize()));
						if(trigger instanceof Documa.recommendation.trigger.EnergyCriticalTrigger) {
							let recjob = {
								type: "redistribution",
								name: "Migration options",
								payload: pl
							};
							// firing migration options ready event
							let readyEvent = self._eventFactory.createMigrationOptionsReadyEvent(result);
							appcontext.getEventDispatcher().dispatchEvent(readyEvent);
							// calling the display phase handler for processing the migration options
							recman.getDisplayPhaseHandler().handleJob(recjob);
							// getting communication manager to send request
							// command to server-side
							let _appContext = Documa.RuntimeManager.getApplicationContext();
							let cf = new Documa.communication.commands.CommandFactory();
							// creating payload for event
							let payload = {
								"APP_ID": _appContext.getValue(Documa.context.ApplicationContextAttributes.APP_ID),
								"APP_VERSION": _appContext.getValue(Documa.context.ApplicationContextAttributes.APP_VERSION),
								"APP_INSTID": _appContext.getValue(Documa.context.ApplicationContextAttributes.APP_INSTID),
								"MIGRATION_DATA": pl
							};
							let cmd = cf.create(Documa.communication.MessageFieldValues.APP_LEVEL, Documa.communication.commands.ApplicationCommands.LOWBATTERY, payload);
							// send lowbattery event to server
							Documa.RuntimeManager.getCommunicationManager().sendApplicationLevelMessage(cmd);
							LOG.debug(TAG, "... sent low battery command!");
						}
					}).catch((error) =>{
						let failure = error;
						if(error.stack) {
							failure = error.stack;
						}
						// failure during recommendation request
						LOG.error(TAG, failure);
					});
				}
			})
		}
	}

	return {
		/**
		 * @type {Documa.communication.events.EventDispatcher}
		 * @private
		 */
		eventDispatcher: null,
		/**
		 * @type {Documa.recommendation.RecommendationManager}
		 * @private
		 */
		recMan: null,
		triggers: null,
		triggerCounter: null,
		/**
		 * @type {Documa.util.Logger}
		 * @private
		 */
		log: null,

		/**
		 * Ctor.
		 * @constructs
		 * @param {Documa.recommendation.RecommendationManager} recommendationManager
		 * @param {Documa.communication.events.EventDispatcher} eventDispatcher
		 * @param {Documa.util.Logger} log
		 *
		 * the internal datastructure holding information about triggers
		 * single triggers are accessible via Subclass
		 * <pre><code>
		 *    {
	 *		instance: ,		// the Trigger-instance
	 * 		subC: ,			// subClass of the trigger
	 *		sEvt			// startevents of the Trigger
	 *	  }
		 * </code></pre>
		 */
		constructor: function(recommendationManager, eventDispatcher, log){
			this.eventDispatcher = eventDispatcher;
			this.log = log;
			this.xhrReqArr = [];
			this.triggerCounter = new Documa.recommendation.triggerCounter();
			this.triggers = {}; // no Array --> no Length
			this.fileNames = [];
			this.recMan = recommendationManager;
			Documa.recommendation.TriggerManager.superclass.constructor.call(this);
			this.log.debug(TAG, 'TriggerManager started.');

			/**
			 * @type {Map.<String, TriggerRegistrationEntry>}
			 * @private
			 */
			this._triggers = new Map();

			this._eventFactory = new Documa.communication.events.EventFactory();
		},

		/**
		 * start the integration of all Triggers
		 */
		startIntegration: function(){
			this.wirerecMan();
		},

		/**
		 * Connects the Recommendation Manager to the trigger output channel
		 */
		wirerecMan: function(){
			this.eventDispatcher.addEventListener(
				Documa.communication.events.SystemEvents.ON_TRIGGER,
				this.recMan, // scope
				this.recMan.onTriggerReceived // handler
			);
			this.log.debug("[TriggerManager] RecommendationManager subscribed to event dispatcher (ON_TRIGGER)");
		},

		/**
		 * save all given Trigger-URLs
		 */
		saveTriggerURLs: function(array){
			if(array.length == undefined) {
				return;
			}

			for(let i = 0; i < array.length; i++) {
				this.fileNames.push(array[i]);
			}
		},

		/**
		 * start the loading all triggers
		 */
		loadTriggers: function(payload){
			this.extractInfo(payload);
		},

		/**
		 * extract necessary Information from the descriptions
		 */
		extractInfo: function(triggerList){
			for(let i = 0; i < triggerList.length; i++) {
				let subClass = "" + triggerList[i].id;
				let triggername = subClass.replace("trigger.", "");
				this.triggers[triggername] = {};
				this.triggers[triggername].triggername = triggername;
				this.triggers[triggername].descr = triggerList[i];
				this.instantiateTrigger(triggername);
			}
		},

		/**
		 * waits for the complettion of loading sepcific js-file
		 */
		waitForScripts: function(scriptLoad, scope){
			if(scriptLoad.getReady() == false) {
				setTimeout(function(){
					try {
						// try to find better way of Scoping
						scope.waitForScripts(scriptLoad, scope);
					} catch (E) {
						this.log.debug("[TriggerManager] failed loading triggers");
					}
				}, 100);
				return;
			}
			setTimeout(function(){
				// better scoping
				scope.instantiateTrigger(scriptLoad);
			}, 100);
		},

		/**
		 * instantiates a specific trigger
		 */
		instantiateTrigger: function(triggername){
			if(this.triggers[triggername] != undefined) {
				// get necessary Information
				let descr = this.triggers[triggername].descr;
				let stEvt = descr.startEvents;

				//instantiate Trigger
				let c = "new Documa.recommendation.trigger." + triggername + ";";
				try {
					let instance = eval(c);
					this.log.debug(this.TAG, "[Trigger " + triggername + "] instantiated");
					this.triggers[triggername].instance = instance;

					//initialize Trigger
					instance.init(this.recMan, this.eventDispatcher, this.log);
					//saving all startevents
					this.triggers[triggername].sEvt = new Array(stEvt.length);

					for(let i = 0; i < stEvt.length; i++) {
						//fill all startevents into datastrucuture
						this.triggers[triggername].sEvt[i] = {};
						this.triggers[triggername].sEvt[i].name = stEvt[i].name;
						this.triggers[triggername].sEvt[i].channel = stEvt[i].channel;

					}
					// give startevents to the Trigger
					instance.fillStartEvents(this.triggers[triggername].sEvt);
					this.registerTrigger(this.triggers[triggername].sEvt, descr, instance);
				} catch (error) {
					this.log.error(TAG, error.stack);
				}
			}
		},

		/**
		 * Registers trigger on the startevents or starts the timer.
		 */
		registerTrigger: function(sEvt, descr, instance){
			let subClass = "" + descr.id;
			let triggername = subClass.replace("trigger.", "");

			for(let i = 0; i < this.triggers[triggername].sEvt.length; i++) {
				let evName = sEvt[i].name;
				this.recMan.saveTriggerProperties(evName, triggername);

				this.eventDispatcher.addEventListener(
					evName,
					this.recMan, // scope
					instance.handle // handler
				);
			}
			this.log.debug("[Trigger " + triggername + "] registered on startEvents");
		},

		/**
		 * Registers the given trigger instance.
		 *
		 * @param {Documa.context.ApplicationContext} appcontext
		 * @param {Documa.recommendation.trigger.ClientsideTrigger} trigger
		 */
		registerClientsideTrigger: function(appcontext, trigger){
			trigger.init(appcontext, Documa.RuntimeManager.getContextManager());
			this._triggers.set(trigger.getId(), {
				trigger: trigger,
				events: trigger.getStartEvents(),
				app: appcontext
			});

			let eventDispatcher = appcontext.getEventDispatcher();

			// register for context events published within the given application context
			eventDispatcher.addEventListener(Documa.communication.events.SystemEvents.CONTEXT_CHANGED,
				this, onContextEvent.bind(this));
		},

		/**
		 * Returns the collection of triggers that are listening for the given event.
		 *
		 * @param {Documa.components.ComponentMessage} message
		 * @returns {Array.<Documa.recommendation.trigger.ClientsideTrigger>}
		 */
		getTriggersFromComponentMessage: function(message){
			/** @type {Array.<Documa.recommendation.trigger.ClientsideTrigger>} */
			let result = [];
			/** @type {Iterator.<TriggerRegistrationEntry>} */
			let triggers = this._triggers.values();
			for(let regEntry of triggers) {
				let trigger = regEntry.trigger;
				let startEvents = trigger.getStartEvents();
				// get names of start events
				let eventNames = Array.from(startEvents.keys());
				if(eventNames.includes(message.getName())) {
					result.push(trigger);
				}
			}
			return result;
		},

		/**
		 * returns all currently registered Triggers
		 */
		getTriggers: function(){
			return this.triggers;
		}
	}
}());


//###############################################################################
Documa.recommendation.TriggerLoadObject = function(uri, subClass){
	/*  A flag indicating the status of the script load from uri. */
	let ready = false;

	//the URI of the script file
	this.uri = uri;
	this.subClass = subClass;

	this.setReady = function(){
		ready = true;
	};

	this.getReady = function(){
		return ready;
	};
};

Documa.recommendation.triggerCounter = function(){
	/**
	 * @private
	 * The array used to store the key/value pairs. Values are scripts
	 */
	let refArray = [];
	this.refArray = refArray;

	/**
	 * @private
	 * @function
	 * Adds a reference. Values are only stored once for each key, i.e. there is no value
	 * registered under the key. In all other cases, only the reference counter for the key
	 * is incremented and the stored value will not be changed.
	 * @param {String} key the key under which the value is to be stored by the reference counter
	 * @param {Object} value the value to be stored
	 */
	this.addReference = function(key, value){
		if(refArray[key] != undefined) {
			refArray[key].counter += 1;
		} else {
			let newRef = new Documa.recommendation.triggerReference(value);
			newRef.counter = 1;
			refArray[key] = newRef;
		}
	};

	/**
	 * @private
	 * @function
	 * Removes a reference to the value identified by the key by decrementing its reference counter.
	 * If the reference counter equals zero, the value is deleted from the internal storage of the reference counter.
	 * @param {String} key the key identifying the reference to be removed
	 */
	this.removeReference = function(key){
		if(refArray[key] == undefined) return;
		if(refArray[key].counter != 0) refArray[key].counter -= 1;
		if(refArray[key].counter == 0) {
			refArray[key].value = undefined;
			//refArray[key].scriptLoad = undefined;
		}
	};

	/**
	 * @private
	 * @function
	 * Gets the reference count for a key.
	 * @return The number of reference to the value stored under key or undefined if no value has been stored under the key before.
	 */
	this.getReferenceCount = function(key){
		if(refArray[key] == undefined) return undefined;
		return refArray[key].counter;
	};

	/**
	 * @private
	 * @function
	 * Gets the value stored for the key by the reference counter.
	 * @param {String} key the key identifying under which the value is registered
	 * @return the value stored for the key
	 */
	this.getReferenceValue = function(key){
		if(refArray[key] == undefined) return undefined;
		return refArray[key].value;
	};
};

Documa.recommendation.triggerReference = function(theValue){
	let counter = 0;
	let value = theValue;
	this.value = value;
	this.counter = counter;
};