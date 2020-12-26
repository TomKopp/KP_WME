Ext.namespace("Documa.distribution.migration.options");

Documa.require("Documa.util.Logger");

/**
 * @typedef {Object} Documa.distribution.migration.options.MigrationCauseType
 * @property {String} cause
 * @property {String} source
 */

/**
 * @class
 */
Documa.distribution.migration.options.MigrationCause = Ext.extend(Object, function(){
	const TAG = "Documa.distribution.migration.options.MigrationCause";
	const LOG = Documa.util.Logger;
	/////////////////////
	// private methods //
	/////////////////////


	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {String} description
		 * @param {String} srcLabel
		 */
		constructor: function(description, srcLabel){
			Documa.distribution.migration.options.MigrationCause.superclass.constructor.call(this);
			this._description = description;
			this._sourcelbl = srcLabel;
		},

		/**
		 * @returns {String}
		 */
		getDescription: function(){
			return this._description;
		},

		/**
		 * @returns {String}
		 */
		getSourceLabel: function(){
			return this._sourcelbl;
		},

        /**
         * @returns {String}
         */
        getFormattedDescription: function(){
            return this._description[0].toUpperCase() + this._description.substring(1);
        }
	};
}());