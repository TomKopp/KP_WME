Ext.namespace("Documa.distribution");

/**
 * @typedef {Object} Documa.distribution.DVFeatureType
 * @property {String} fid
 * @property {String} version
 * @property {Array} fclass
 */

/**
 * @typedef {Object} Documa.distribution.DVComponentItemType
 * @property {String} instance
 * @property {String} component
 * @property {Array.<Documa.distribution.DVFeatureType>} features
 */

/**
 * @typedef {Object} Documa.distribution.DVCandidateItemType
 * @property {Documa.distribution.DVComponentItemType} candidate
 * @property {Number} degree
 */

/**
 * @typedef {Object} Documa.distribution.DVReplacementItemType
 * @property {Documa.distribution.DVComponentItemType} component
 * @property {Array.<Documa.distribution.DVCandidateItemType>} mappings
 */

/**
 * @typedef {Object} Documa.distribution.DistributionOptionsVectorType
 * @property {String} container
 * @property {Array.<Documa.distribution.DVComponentItemType>} executables
 * @property {Array.<Documa.distribution.DVComponentItemType>} nonexecutables
 * @property {Array.<Documa.distribution.DVReplacementItemType>} replaceables
 */

/**
 * @class
 */
Documa.distribution.DistributionOptionsVector = Ext.extend(Object, function(){
	return {
		/**
		 * @constructs
		 * @param {Documa.distribution.Device} device
		 * @param {Array.<Documa.distribution.DVComponentItem>} execs
		 * @param {Array.<Documa.distribution.DVComponentItem>} nonexecs
		 * @param {Array.<Documa.distribution.DVReplacementItem>} replaceables
		 */
		constructor: function (device, execs, nonexecs, replaceables) {
			this._execs = execs;
			this._nonexecs = nonexecs;
			this._replaceables = replaceables;
			this._device = device;
		},
		
		/**
		 * Returns associated runtime context from this distribution vector.
		 * @returns {Documa.distribution.Device}
		 */
		getDevice: function () {
			return this._device;
		},
		
		/**
		 * Returns executable components with respect to current
		 * device (component runtime container).
		 * @returns {Array.<Documa.distribution.DVComponentItem>}
		 */
		getExecutables: function () {
			return this._execs;
		},
		
		/**
		 * Returns set of non executable components with respect to
		 * current device (component runtime container).
		 * @returns {Array.<Documa.distribution.DVComponentItem>}
		 */
		getNonExecutables: function () {
			return this._nonexecs;
		},
		
		/**
		 * Returns set of replacement mappings and each contains a set of usable
		 * components associated to a nonexecutable component.
		 * @returns {Array.<Documa.distribution.DVReplacementItem>}
		 */
		getReplaceables: function () {
			return this._replaceables;
		},

        /**
		 * Returns component item of distribution option.
         * @param {string} componentId
         * @returns {Documa.distribution.DVComponentItem | Documa.distribution.DVReplacementItem | boolean}
         */
        getComponentItem: function (componentId) {
            // iterate over executables
            for (let executeKey in this._execs) {
                if (this._execs.hasOwnProperty(executeKey)) {
                    if (this._execs[executeKey].getComponentId() == componentId) {
                        return this._execs[executeKey];
                    }
                }
            }

            // iterate over nonexecutables
            for (let noexecuteKey in this._nonexecs) {
                if (this._nonexecs.hasOwnProperty(noexecuteKey)) {
                    if (this._nonexecs[noexecuteKey].getComponentId() == componentId) {
                        return this._nonexecs[noexecuteKey];
                    }
                }
            }

            // iterate over replaceables
            for (let replaceKey in this._replaceables) {
                if (this._replaceables.hasOwnProperty(replaceKey)) {
                    if (this._replaceables[replaceKey].getComponentItem().getComponentId() == componentId) {
                        return this._replaceables[replaceKey];
                    }
                }
            }

            return false;
        },
	};
}());