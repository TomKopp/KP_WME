Ext.namespace("Documa.distribution.migration");

Documa.require("Documa.util.Logger");
Documa.require("Documa.distribution.transaction.DistributedTransaction");

Documa.distribution.migration.MigrationRoles = {
	Source: "source",
	Target: "target"
};

/**
 * @class
 * @extends {Documa.distribution.transaction.DistributedTransaction}
 */
Documa.distribution.migration.Migration = Ext.extend(Documa.distribution.transaction.DistributedTransaction, (function(){
	return {
		/**
		 * Constructor.
		 * @constructs
		 * @param {String} id migration transaction id
		 * @param {String} srcdevice session id of source device
		 * @param {String} initdevice session id of initiating device
		 * @param {Documa.context.ApplicationContext} appcontext
		 */
		constructor: function(id, srcdevice, initdevice, appcontext){
			Documa.distribution.migration.Migration.superclass.constructor.call(this, id, appcontext, initdevice);
			this._srcdev = srcdevice;
			this._initdev = initdevice;
		},
		
		/**
		 * Returns session id of transaction initiating device.
		 *
		 * @returns {String|*}
		 */
		getInitiatorDevice: function(){
			return this._initdev;
		},
		
		/**
		 * Returns session id of source device.
		 * @returns {String|*}
		 */
		getSourceDevice: function(){
			return this._srcdev;
		},

		/**
		 * Adds distribution modification to this migration.
		 * @param {Documa.distribution.DistributionModification} distmod
		 */
		addModification: function(distmod){
			if (!(distmod instanceof Documa.distribution.DistributionModification))
				throw new Error("Invalid modification argument!");

			this._modifications.push(distmod);
		},
		/**
		 * Removes all modifications from this migration object.
		 * @returns {void}
		 */
		clearModifications: function(){
			while (this._modifications.length > 0) {
				this._modifications.pop();
			}
		},
		/**
		 * Returns this migration as flat serializable object.
		 * @returns {Object}
		 */
		serializable: function(){
			var result = new Array();
			for (var i = 0; i < this._modifications.length; ++i){
				var cur_mod = this._modifications[i];
				// get serializable representation of distribution modification
				result.push(cur_mod.serializable());
			}
			return {
				srcdev: this._srcdev,
				modifications: result
			};
		}
	};
})());