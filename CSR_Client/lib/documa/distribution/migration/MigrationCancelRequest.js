Ext.namespace("Documa.distribution.migration");

Documa.require("Documa.util.Logger");
Documa.require("Documa.distribution.migration.MigrationRequest");

Documa.distribution.migration.MigrationCancelRequest = Ext.extend(Documa.distribution.migration.MigrationRequest, (function () {
	var TAG = "Documa.distribution.migration.MigrationCancelRequest";
	var _log = Documa.util.Logger;

	/**
	 * Helper to validate cancellation parameters.
	 *
	 * @param {{crole:{string}, migration:{object}}} params
	 */
	function validateParams(params) {
		if (!params.crole)
			throw new Error("Missing migration role field!");

		if(!params.reason){
			throw new Error("Missing migration cancellation reason field!");
		}

		if (params.crole === Documa.distribution.migration.MigrationRoles.Source) {
			if (!params.migration.modifications)
				throw new Error("No modifications array in ABORT MIGRATION request parameters defined!");
		} else if (params.crole !== Documa.distribution.migration.MigrationRoles.Target) {
			throw new Error("Unknown migration role detected!");
		}
	}

	return {
		/**
		 * @constructor.
		 * @param {Documa.context.ApplicationContext} appcontext application context that is responsible to handle this request
		 * @param {Array} params array of parameters
		 */
		constructor: function (appcontext, params) {
			Documa.distribution.migration.MigrationCancelRequest.superclass.constructor.call(this, appcontext, params);
			this._migration = this.createMigration(params.migration);
			this._reason = params.reason;
		},
		/**
		 * Returns migration instance.
		 *
		 * @returns {Documa.distribution.migration.Migration}
		 */
		getMigration: function () {
			return this._migration;
		},
		/**
		 * Returns description of cancellation reason.
		 * @returns {String}
		 */
		getReason: function() {
			return this._reason;
		}
	};
})());
