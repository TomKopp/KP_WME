Ext.namespace("Documa.distribution.migration");

Documa.require("Documa.util.Logger");
Documa.require("Documa.distribution.migration.MigrationRequest");
Documa.require("Documa.distribution.migration.Migration");
Documa.require("Documa.distribution.DistributionModification");
Documa.require("Documa.distribution.ComponentItem");

Documa.distribution.migration.MigrationCommitRequest = Ext.extend(Documa.distribution.migration.MigrationRequest, (function () {
	var TAG = "Documa.distribution.migration.MigrationCommitRequest";
	var _log = Documa.util.Logger;

	/**
	 * Helper method for validating COMMIT request parameters.
	 *
	 * @param {{
	 *      crole:{string},
	 *      migration:{object},
	 *      devents:{array} }} params
	 */
	function validateRequestParameters(params) {
		if (!params.crole)
			throw new Error("Missing migration role field!");

		if (params.crole === Documa.distribution.migration.MigrationRoles.Source) {
			if (!params.migration.modifications)
				throw new Error("No modifications array in COMMIT MIGRATION request parameters defined!");
		} else if (params.crole === Documa.distribution.migration.MigrationRoles.Target) {
			if (!params.devents)
				throw new Error("No component downstream events in COMMIT MIGRATION request parameters defined!");
		} else {
			throw new Error("Unknown migration role detected!");
		}
	}

	return {
		/**
		 * Constructor.
		 *
		 * @constructor.
		 * @param {Documa.context.ApplicationContext} appcontext application context that is responsible to handle this request
		 * @param {Array} params array of parameters
		 */
		constructor: function (appcontext, params) {
			Documa.distribution.migration.MigrationCommitRequest.superclass.constructor.call(this, appcontext, params);
			validateRequestParameters(params);
			this._migration = this.createMigration(params.migration);

			switch (params.crole) {
				case Documa.distribution.migration.MigrationRoles.Source:
					// nothing to do here yet!
					break;
				case Documa.distribution.migration.MigrationRoles.Target:
					this._devents = params.devents;
			}
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
		 * Returns an array of downstream events for each migrated component.
		 *
		 * @returns {Array.<Object.<string, array>>}
		 */
		getDownstreamEvents: function () {
			return this._devents;
		}
	};
})());
