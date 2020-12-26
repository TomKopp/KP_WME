Ext.namespace("Documa.distribution");

Documa.require("Documa.util.Logger");

/**
 * @callback DistributionCallback
 * @param {Documa.distribution.Distribution} distribution
 */

/**
 * @class
 */
Documa.distribution.DistributionUpdate = Ext.extend(Object, function(){
	var TAG = "Documa.distribution.DistributionUpdate";
	var _log = Documa.util.Logger;
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
		 * @param {Documa.distribution.DistributionModification} modification
		 */
		constructor: function(modification){
			this._modification = modification;

			/**
			 * @type {Function}
			 * @private
			 */
			this._successCb = null;

			/**
			 * @type {Function}
			 * @private
			 */
			this._errorCb = null;
		},

		/**
		 * @returns {Documa.distribution.DistributionModification|*}
		 */
		getModification: function(){
			return this._modification;
		},

		/**
		 * @param {DistributionCallback} callback
		 */
		setSuccessCallback: function(callback){
			this._successCb = callback;
		},

		/**
		 * @returns {DistributionCallback}
		 */
		getSuccessCallback: function(){
			return this._successCb;
		},

		/**
		 * @param {ErrorCallback} callback
		 */
		setErrorCallback: function(callback){
			this._errorCb = callback;
		},

		/**
		 * @returns {ErrorCallback}
		 */
		getErrorCallback: function(){
			return this._errorCb;
		}
	};
}());