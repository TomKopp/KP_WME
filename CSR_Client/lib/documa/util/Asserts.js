Ext.namespace("Documa.your.namespace");

/**
 * @class
 * @singleton
 */
Documa.util.Asserts = function() {
	const TAG = "Documa.util.Asserts";
	/////////////////////
	// private methods //
	/////////////////////
	
	/* TODO: add here your private methods */
	
	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * @param {Object} arg
		 * @param {String} [errorMsg]
		 */
		assertNotNull: function(arg, errorMsg = null) {
			if(!errorMsg) errorMsg = "Given argument is null!";
			if(!arg) throw new Error(errorMsg);
		},
		
		/**
		 * @param {boolean} condition
		 * @param {String} [errorMsg]
		 */
		assertTrue: function(condition, errorMsg = null) {
			if(!errorMsg) errorMsg = "Current assertion is not met!";
			if(!condition)  throw new Error(errorMsg);
		},
		
		/**
		 * @param {boolean} condition
		 * @param {String} [errorMsg]
		 */
		assertFalse: function(condition, errorMsg = null) {
			if(!errorMsg) errorMsg = "Current assertion is not met!";
			if(condition)  throw new Error(errorMsg);
		}
	}
}();