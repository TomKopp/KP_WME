Ext.namespace("Documa.context.ContextManager");

Documa.require("Documa.util.Logger");
Documa.require("Documa.util.Util");
Documa.require("Documa.communication.commands.CommandFactory");
Documa.require("Documa.communication.events.EventFactory");

/**
 * @typedef {Object} ContextCacheEntry
 * @property {Number} timestamp
 * @property {Object} value
 */

/**
 * @class
 */
Documa.context.ContextManager = Ext.extend(Object, function() {
	const TAG = "Documa.context.ContextManager";
	const LOG = Documa.util.Logger;
	const UTIL = Documa.util.Util;
	/////////////////////
	// private methods //
	/////////////////////
	
	/* TODO: add here your private methods */
	
	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 */
		constructor: function() {
			Documa.context.ContextManager.superclass.constructor.call(this);
			
			this._cfactory = new Documa.communication.commands.CommandFactory();
			this._efactory = new Documa.communication.events.EventFactory();
			this._eventDispatcher = Documa.RuntimeManager.getEventDispatcher();
			
			/**
			 * Context cache.
			 * @type {Map.<String, ContextCacheEntry>}
			 * @private
			 */
			this._contextCache = new Map();
		},
		
		/**
		 * Puts given key-value pair into the context cache.
		 * @param {String} key
		 * @param {Object} value
		 */
		putToCache: function(key, value) {
			let timestamp = (new Date()).getTime();
			this._contextCache.set(key, {timestamp: timestamp, value: value});
		},
		
		/**
		 * Returns value from context cache.
		 * @param {String} key
		 * @returns {Object|null}
		 */
		getFromCache: function(key) {
			let cacheEntry = this._contextCache.get(key);
			if(cacheEntry) {
				let ts = cacheEntry.timestamp;
				let now = new Date().getTime();
				
				// duration in milliseconds
				let duration = now - ts;
				if(UTIL.toMin(duration) < 5) {
					return cacheEntry.value;
				}
			}
			return null;
		}
	};
}());