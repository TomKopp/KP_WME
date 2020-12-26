Ext.namespace("Documa.distribution.migration");

Documa.require("Documa.util.Logger");

/**
 * This class represents a component migration request.
 * @class
 */
Documa.distribution.migration.MigrationRequest = Ext.extend(Object, (function(){
	var TAG = "Documa.distribution.migration.MigrationRequest";
	var _log = Documa.util.Logger;

	function validateParameters(params){
		//if (!params.components)
		//	throw new Error("No components field in PREPARE MIGRATION request parameters defined!");
		if (!params.crole)
			throw new Error("No container role in MIGRATION request parameters defined!");
		if (!params.migration)
			throw new Error("No migration description object in MIGRATION request parameters defined!");
		if (!params.migration.mid)
			throw new Error("No migration id field in MIGRATION request parameters defined!");
		if (!params.migration.initdev)
			throw new Error("No migration initiating device field in MIGRATION request parameters defined!");
		if (!params.migration.srcdev)
			throw new Error("No migration source device field in MIGRATION request parameters defined!");
	}

	return {
		/**
		 * Constructor.
		 * @constructs
		 * @param {Documa.context.ApplicationContext} appcontext application context that is responsible to handle this request
		 * @param {Array} params array of parameters
		 */
		constructor: function(appcontext, params){
			try {
				Documa.distribution.migration.MigrationRequest.superclass.constructor.call(this);
				this._appcontext = appcontext;
				validateParameters(params);
				this._params = params;
				this._role = params.crole;
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},
		/**
		 * Returns id of migration process.
		 *
		 * @return {String} id of migration process
		 */
		getMigrationId: function(){
			return this._params.migration.mid;
		},
		/**
		 * Returns role of current runtime container within the distributed migration transaction.
		 * Possible values are "source" or "target".
		 *
		 * @returns {String} possible values are "source" or "target"
		 */
		getRuntimeRole: function(){
			return this._role;
		},
		/**
		 * Returns device object that sends the migrating components.
		 *
		 * @returns {Documa.distribution.Device}
		 */
		getSenderDevice: function(){
			return this._appcontext.getDistributionManager().getDevice(this._params.srcdev);
		},

		/**
		 * Returns device object that has initiated the migration transaction.
		 *
		 * @returns {Documa.distribution.Device}
		 */
		getInitiatingDevice: function(){
			return this._appcontext.getDistributionManager().getDevice(this._params.initdev);
		},

		/**
		 * Helper method creates migration instance object using given payload object.
		 *
		 * @param {Object} obj payload object of COMMIT_MIGRATION request.
		 */
		createMigration: function(obj){
			var migration = new Documa.distribution.migration.Migration(obj.mid, obj.srcdev, obj.initdev, this._appcontext);
			if (obj.modification) {
				var m = obj.modification;
				var citems = [];
				// create component items array from payload data
				for (var j = 0; j < m.components.length; ++j){
					var c = m.components[j];
					var item = new Documa.distribution.ComponentItem({
						id: c.instance,
						cid: c.component
					});
					citems.push(item);
				}
				migration.addModification(new Documa.distribution.DistributionModification(m.modid, m.type, citems, m.target));
			} else if (obj.modifications) {
				// for each modification create an modification instance and adds it into the migration object
				for (var i = 0; i < obj.modifications.length; ++i){
					var m = obj.modifications[i];
					var citems = [];

					// create component items array from payload data
					for (var j = 0; j < m.components.length; ++j){
						var c = m.components[j];
						var item = new Documa.distribution.ComponentItem({
							id: c.instance,
							cid: c.component
						});
						citems.push(item);
					}
					// create single modification object mapping several components to a single target runtime container
					// and add modification object to migration instance
					migration.addModification(new Documa.distribution.DistributionModification(m.modid, m.type, citems, m.target));
				}
			} else {
				throw new Error("No modification description in COMMIT MIGRATION request parameters defined!");
			}
			return migration;
		}

	};
})());
