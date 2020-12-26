Ext.namespace('Documa.recommendation');

Documa.require('Documa.communication.commands.Command');
Documa.require('Documa.recommendation.DisplayPhaseHandler');
Documa.require('Documa.communication.commands.CommandFactory');

/**
 * @class Documa.recommendation.RecommendationManager
 * This class provides an recommendation manager for the CRUISe/EDYRA Client Runtime.
 *
 *  @author wagner, siekmann
 */
Documa.recommendation.RecommendationManager = Ext.extend(Object, {
	triggerProperties: null,
	eventDispatcher: null,
	displayPhaseHandler: null,
	cmdfac: null,
	recToggler: true,
	
	/**
	 * Ctor.
	 * @constructs
	 * @param {Documa.communication.events.EventDispatcher} eventDispatcher
	 * @param {Documa.util.Logger} log
	 */
	constructor: function(eventDispatcher, log) {
		/**
		 * @type {Documa.util.Logger}
		 */
		this.log = log;
		
		/**
		 * @type {Array}
		 */
		this.triggerProperties = [];
		
		/**
		 * @type {Documa.communication.events.EventDispatcher}
		 */
		this.eventDispatcher = eventDispatcher;
		
		/**
		 * @type {Documa.recommendation.DisplayPhaseHandler}
		 */
		this.displayPhaseHandler = new Documa.recommendation.DisplayPhaseHandler(eventDispatcher);
		//this.recMenu = recMenu.getRecommendationMenu();
		
		/**
		 * @type {Documa.communication.commands.CommandFactory}
		 */
		this.cmdfac = new Documa.communication.commands.CommandFactory();
	},
	
	/**
	 * Saves the incoming superclass, subclass an recoType
	 */
	saveTriggerProperties: function(evt, id) {
		this.triggerProperties[evt] = {
			id: id,
			//rectypes : recoType,
			//priority: this.classPriority[superClass],
			//hidden:	  false,
		};
	},
	
	onTriggerReceived: function(trigger) {
		this.log.debug("Documa.recommendation.RecommendationManager", "Trigger received!");
	},
	
	/**
	 * Fires a recommendation request to the server-side.
	 * @param msg message object including addition recommendation parameters
	 * @param level message level
	 */
	serveRecommendationRequest: function(msg, level) {
		let appcontext = Documa.RuntimeManager.getApplicationContext();
		let triggerid = this.triggerProperties[msg.tag].id;
		let message = {
			triggerid: triggerid,
			data: msg.payload,
			APP_ID: appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_ID),
			APP_INSTID: appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_INSTID),
			APP_VERSION: appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_VERSION)
			
		};
		console.log("Requesting recommendation from server:");
		console.log(message);
		let srrc = this.cmdfac.create(level, "serverecommendationrequest", message);
		let comMan = Documa.RuntimeManager.getCommunicationManager();
		comMan.sendApplicationLevelMessage(srrc);
	},
	
	/**
	 * @returns {Documa.recommendation.DisplayPhaseHandler}
	 */
	getDisplayPhaseHandler: function() {
		return this.displayPhaseHandler;
	},
	
	/**
	 * @returns {boolean}
	 */
	getRecToggler: function() {
		return this.recToggler;
	},
	
	/**
	 * Toggles the recommendation state.
	 * @param {boolean} reconoff
	 */
	setRecToggler: function(reconoff) {
		this.recToggler = reconoff;
	}
});



