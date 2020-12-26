Ext.namespace("Documa.distribution.migration");

Documa.require("Documa.util.Logger");
Documa.require("Documa.distribution.DistributionModification");
Documa.require("Documa.distribution.ComponentItem");
Documa.require("Documa.distribution.migration.Migration");
Documa.require("Documa.distribution.migration.MigrationRequest");

/**
 * Request object for preparing a migration transaction.
 * @class
 */
Documa.distribution.migration.MigrationPrepareRequest = Ext.extend(Documa.distribution.migration.MigrationRequest, (function() {
	var TAG = "Documa.distribution.migration.MigrationPrepareRequest";
	var _log = Documa.util.Logger;

	function validateMigration(migration) {
		if (!migration.modifications)
			throw new Error("No modifications in PREPARE MIGRATION request parameters defined!");
		if (!migration.mid)
			throw new Error("No migration id field in PREPARE MIGRATION request parameters defined!");
	}

	function validateModification(modification) {
		if (!modification.type)
			throw new Error("No modification type defined!");
		if (!modification.components || modification.components.length === 0)
			throw new Error("No array of components in modification defined!");
		if (!modification.target)
			throw new Error("No distribution target in modification defined!");
		if (!modification.modid)
			throw new Error("No id in modification defined!");
	}

	function validateRequestParameters(params) {
		//if (!params.components)
		//	throw new Error("No components field in PREPARE MIGRATION request parameters defined!");
		if (!params.crole)
			throw new Error("No container role in PREPARE MIGRATION request parameters defined!");

		if (!params.migration)
			throw new Error("No migration description object in PREPARE MIGRATION request parameters defined!");

		// validate source-specific parameters
		if (params.crole === Documa.distribution.migration.MigrationRoles.Source) {
			if (!params.migration)
				throw new Error("No migration description object in PREPARE MIGRATION request parameters defined!");
			if (!params.migration.modifications)
				throw new Error("No modifications array in PREPARE MIGRATION request parameters defined!");
		}

		// validate target-specific parameters
		if (params.crole === Documa.distribution.migration.MigrationRoles.Target) {
			if (!params.migration.modification)
				throw new Error("No modification description object in PREPARE MIGRATION request parameters defined!");
			if (!params.cstates)
				throw new Error("No component states in PREPARE MIGRATION request parameters defined!");
		}

		if (!params.migration.mid)
			throw new Error("No migration id field in PREPARE MIGRATION request parameters defined!");
		if (!params.migration.initdev)
			throw new Error("No migration initiating device field in PREPARE MIGRATION request parameters defined!");
		if (!params.migration.srcdev)
			throw new Error("No migration source device field in PREPARE MIGRATION request parameters defined!");

		switch(params.crole) {
			case Documa.distribution.migration.MigrationRoles.Source:
				// validate migration object
				validateMigration(params.migration);
				break;
			case Documa.distribution.migration.MigrationRoles.Target:
				// validate modification object
				validateModification(params.migration.modification);
				break;
		}
	}

	function createComponentsArray(components) {
		var result = new Array();
		for (var i = 0; i < components.length; ++i) {
			if (!components[i].component)
				throw new Error("No component id defined");
			if (!components[i].instance)
				throw new Error("No component instance id defined!");

			result.push(new Documa.distribution.ComponentItem({
				id : components[i].instance,
				cid : components[i].component
			}));
		}
		return result;
	}

	function createModifications(array) {
		var resultSet = [];
		for (var i = 0; i < array.length; ++i) {
			var modobj = array[i];
			validateModification(modobj);
			// transform serialized components into object representation
			var cmps = createComponentsArray(modobj.components);
			// type, components, target
			resultSet.push(new Documa.distribution.DistributionModification(modobj.modid, modobj.type, cmps, modobj.target));
		}
		return resultSet;
	}

	return {
		/**
		 * Constructor.
		 * @constructs
		 * @param {Documa.context.ApplicationContext} appcontext application context that is responsible to handle this request
		 * @param {Array} params array of parameters
		 */
		constructor : function(appcontext, params) {
			try {
				Documa.distribution.migration.MigrationPrepareRequest.superclass.constructor.call(this, appcontext, params);
				validateRequestParameters(params);
				this._modifications = null;
				switch(this._role) {
					case Documa.distribution.migration.MigrationRoles.Source:
						// get modifications from whole migration object
						this._modifications = createModifications(params.migration.modifications);
						break;
					case Documa.distribution.migration.MigrationRoles.Target:
						// test if component states are serialized as string or not
						if ( typeof this._params.cstates === "string") {
							this._params.cstates = JSON.parse(this._params.cstates);
						}
						// get modification from parameters object directly
						this._modifications = createModifications([params.migration.modification]);
						break;
				}
			} catch(error) {
				_log.error(TAG, error.stack);
			}
		},

		/**
		 * Returns array of distribution state modifications.
		 *
		 * @returns {Array.<Documa.distribution.DistributionModification>} array of distribution modification descriptions
		 */
		getModifications : function() {
			return this._modifications;
		},

		/**
		 * Returns component state data.
		 *
		 * @returns {Array}
		 */
		getStateData : function() {
			return this._params.cstates;
		}
	};
})());
