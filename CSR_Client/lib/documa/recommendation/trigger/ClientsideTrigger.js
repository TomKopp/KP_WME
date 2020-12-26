Ext.namespace("Documa.recommendation.trigger");

Documa.require("Documa.util.Logger");

/**
 * @class
 */
Documa.recommendation.trigger.ClientsideTrigger = Ext.extend(Object, function() {
	const TAG = "Documa.recommendation.trigger.ClientsideTrigger";
	const LOG = Documa.util.Logger;
	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 */
		constructor: function() {
			Documa.recommendation.trigger.ClientsideTrigger.superclass.constructor.call(this);
			
			/**
			 * Event collection describing the activation state of this trigger
			 * @type {Map}
			 * @private
			 */
			this._startEvents = new Map();
			
			/**
			 * @type {String}
			 * @private
			 */
			this._id = null;
			
			/**
			 * Current application context.
			 * @type {Documa.context.ApplicationContext}
			 * @private
			 */
			this._appcontext = null;
			
			/**
			 * Keeps context manager.
			 * @type {Documa.context.ContextManager}
			 * @private
			 */
			this._contextManger = null;
		},
		
		/**
		 *
		 * @returns {String}
		 */
		getId: function() {
			return this._id;
		},
		
		/**
		 * Initialize this trigger.
		 *
		 * @param {Documa.context.ApplicationContext} appctx
		 * @param {Documa.context.ContextManager} ctxtman
		 */
		init: function(appctx, ctxtman) {
			this._appcontext = appctx;
			this._contextManger = ctxtman;
		},
		
		/**
		 * Adding relevant start events.
		 * @param {Array.<Documa.components.ComponentMessage>} events
		 */
		fillStartEvents: function(events) {
			for(let event of events) {
				this._startEvents.set(event.getName(), event);
			}
		},
		
		/**
		 * @returns {Map.<String, Documa.components.ComponentMessage>}
		 */
		getStartEvents: function() {
			return this._startEvents;
		},
		
		/**
		 * Validates activation conditions.
		 * @param {Documa.components.ComponentMessage} contextEvent
		 * @returns {Promise.<boolean>}
		 */
		checkCondition: function(contextEvent) {
			throw new Error("Not implemented by a specific trigger!");
		},
		
		/**
		 * Handles recommendation request
		 * @param {Documa.components.ComponentMessage} contextEvent
		 * @returns {Promise}
		 */
		requestRecommendations: function(contextEvent) {
			throw new Error("Not implemented by a specific trigger!");
		}
	};
}());