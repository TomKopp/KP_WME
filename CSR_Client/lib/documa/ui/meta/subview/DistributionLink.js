Ext.namespace("Documa.ui.meta.subview");

/**
 * Enum of different link types.
 */
Documa.ui.meta.subview.DistributionLinkTypes = {
	EXECUTESCMP: 0,
	HASDSERVICE: 1,
	ONEWAYCOMM: 2,
	TWOWAYCOMM: 3,
	HASDEVICE: 4,
	NODES: 5
};

/**
 * @class
 */
Documa.ui.meta.subview.DistributionLink = Ext.extend(Object, function(){
	var TAG = "Documa.ui.meta.subview.DistributionLink";
	var _log = Documa.util.Logger;
	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {object} src
		 * @param {object} trgt
		 * @param {Number} type
		 */
		constructor: function(src, trgt, type){
			/**
			 * @type {string}
			 * @private
			 */
			this._id = uuid.v1();
			/**
			 * @type {Object}
			 * @private
			 */
			this._src = src;
			/**
			 * @type {Object}
			 * @private
			 */
			this._trgt = trgt;
			/**
			 * @type {Number}
			 * @private
			 */
			this._type = type;
		},

		/**
		 * @returns {string}
		 */
		getId: function(){
			return this._id;
		},

		/**
		 * @returns {Object}
		 */
		getSource: function(){
			return this._src;
		},

		/**
		 * @returns {Object}
		 */
		getTarget: function(){
			return this._trgt;
		},

		/**
		 * @returns {Number}
		 */
		getType: function(){
			return this._type;
		},

		/**
		 * @type {Number|Object}
		 */
		source: -1,

		/**
		 * @type {Number|Object}
		 */
		target: -1
	};
}());