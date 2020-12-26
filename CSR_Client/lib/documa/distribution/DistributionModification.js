Ext.namespace("Documa.distribution");

Documa.require('Documa.util.Logger');

Documa.distribution.DistributionModificationTypes = {
	CREATE: "create",
	ADD: "add",
	REM: "rem"
};

/**
 * @typedef {object} ComponentItemType
 * @property {string} instance
 * @property {string} component
 * @property {string} interface
 */

/**
 * @typedef {object} DistributionModificationType
 * @property {string} modid
 * @property {string} type
 * @property {string} target
 * @property {Array.<ComponentItemType>} components
 */

/**
 * An abstract class to represent different distribution modifications.
 * @class
 */
Documa.distribution.DistributionModification = Ext.extend(Object, (function(){
	/**
	 * Validates collection of components.
	 * @param {Array.<Documa.distribution.ComponentItem>} components
	 */
	function validateComponents(components) {
		if (!( components instanceof Array))
			throw new Error("Invalid array of components detected!");
		for (var i = 0; i < components.length; ++i) {
			if (!(components[i] instanceof Documa.distribution.ComponentItem))
				throw new Error("Invalid component item detected!");
		}
	}

	return {
		/**
		 * Constructor.
		 * @constructs
		 * @param {String} id modification id
		 * @param {String} type
		 * @param {Array.<Documa.distribution.ComponentItem>} components array of component items
		 * @param {String} target session id of target device
		 */
		constructor: function(id, type, components, target){
			validateComponents(components);
			/**
			 * @type {String}
			 * @private
			 */
			this._id = id;

			/**
			 * @type {String}
			 * @private
			 */
			this._type = type;

			/**
			 * @type {Array.<Documa.distribution.ComponentItem>}
			 * @private
			 */
			this._components = components;

			/**
			 * @type {String}
			 * @private
			 */
			this._target = target;
		},

		/**
		 * Returns id of this modification object.
		 * @returns {String|*}
		 */
		getId: function(){
			return this._id;
		},

		/**
		 * Returns modification type.
		 *
		 * @returns {String}
		 */
		getType: function(){
			return this._type;
		},

		/**
		 * Returns array of components to be added or remove into or
		 * from the specified distribution.
		 *
		 * @returns {Array.<Documa.distribution.ComponentItem>} contains items as {Documa.distribution.ComponentItem}
		 */
		getComponents: function(){
			return this._components;
		},

		/**
		 * Returns true if this modification includes the specified component instance.
		 *
		 * @param {string} instid
		 * @param {string} cid
		 * @returns {boolean}
		 */
		containsComponent: function(instid, cid){
			var result = this._components.filter(function(citem){
				return (citem.getInstanceId() === instid && citem.getComponentId() === cid);
			});
			return result.length > 0;
		},

		/**
		 * Returns session id of target device.
		 *
		 * @returns {String} session id of target device
		 */
		getTarget: function(){
			return this._target;
		},

		/**
		 * Serializes this modification object as flat serializable object.
		 * @returns {DistributionModificationType}
		 */
		serializable: function(){
			var components = new Array();
			// fill up flat component items array
			for (var i = 0; i < this._components.length; ++i) {
				components.push({
					instance: this._components[i].getInstanceId(),
					component: this._components[i].getComponentId()
				});
			}
			return {
				modid: this._id,
				type: this._type,
				target: this._target,
				components: components
			};
		}
	};
})());
