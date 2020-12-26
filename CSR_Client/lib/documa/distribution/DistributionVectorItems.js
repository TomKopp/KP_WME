Ext.namespace("Documa.distribution");

/**
 * This class represents a required device service (runtime container feature) specified by a component representation
 * object as part of the distribution options vector.
 *
 * @class
 */
Documa.distribution.DVFeature = Ext.extend(Object, function(){
	/**
	 * Validates given payload object.
	 *
	 * @param {Object} obj paylaod object
	 */
	function validate(obj){
		if(!obj.fid)
			throw new Error("Missing feature id field!");
		if(!obj.version)
			throw new Error("Missing version field!");
		if(!obj.fclass)
			throw new Error("Missing feature class field!");
	}
	
	return {
		/**
		 * @constructor.
		 */
		constructor: function(obj){
			validate(obj);
			this._payload = obj;
		},
		
		/**
		 * Returns feature id.
		 * @returns {String}
		 */
		getFeatureId: function(){
			return this._payload.fid;
		},
		
		/**
		 * Returns feature version.
		 * @returns {String}
		 */
		getVersion: function(){
			return this._payload.version;
		},
		
		/**
		 * Returns feature class.
		 * @returns {String}
		 */
		getFeatureClass: function(){
			return this._payload.fclass;
		}
	};
}());

/**
 * This class represents a mashup component by specifying its component id and the set of required container features
 * needed for successful component execution.
 *
 * @class
 */
Documa.distribution.DVComponentItem = Ext.extend(Object, function(){
	/**
	 * Validates given payload object.
	 *
	 * @param {Object} obj paylaod object
	 */
	function validate(obj){
		if(!obj.component)
			throw new Error("Missing component id!");
		if(!obj.features)
			throw new Error("Missing component features!");
	}
	
	/**
	 * Returns feature items from serialized component item representation.
	 *
	 * @param {Array} array
	 * @returns {Array.<Documa.distribution.DVFeature>}
	 */
	function getFeatures(array){
		if(!(array instanceof Array)) {
			throw new Error("Invalid feature items!");
		}
		let results = [];
		for(let i = 0; i < array.length; ++i) {
			results.push(new Documa.distribution.DVFeature(array[i]));
		}
		return results;
	}
	
	return {
		/**
		 * @constructor
		 * @param {Object} obj
		 */
		constructor: function(obj){
			validate(obj);
			this._componentId = obj.component;
			this._features = getFeatures(obj.features);
            this._serial = obj;
		},
		
		/**
		 * Returns id of represented component interface.
		 * @returns {String}
		 */
		getComponentId: function(){
			return this._componentId;
		},
		
		/**
		 * Returns array of required container features, which are needed for successful component execution.
		 * @returns {Array.<Documa.distribution.DVFeature>}
		 */
		getFeatures: function(){
			return this._features;
		},

        serialize: function() {
            return this._serial;
        }
	};
}());

/**
 * @class
 */
Documa.distribution.DVCandidateItem = Ext.extend(Object, function(){
	/**
	 * Checks structure of given payload object.
	 * @param {Object} payload
	 */
	function validate(payload){
		if(!payload.candidate) throw new Error("Missing candidate field!");
		if(!payload.degree) throw new Error("Missing degree field!");
	}
	
	return {
		/**
		 * @constructor
		 * @param {Object} payload contains structure information
		 */
		constructor: function(payload){
			validate(payload);
			/** @type {Documa.distribution.DVComponentItem} */
			this._citem = new Documa.distribution.DVComponentItem(payload.candidate);
			/** @type {Number} */
			this._mdegree = payload.degree;
		},
		
		/**
		 * Returns component item.
		 * @returns {Documa.distribution.DVComponentItem}
		 */
		getComponentItem: function(){
			return this._citem;
		},
		
		/**
		 * Returns matching degree of current component item with respect to the associated non-executable component.
		 * @returns {Number}
		 */
		getMatchingDegree: function(){
			return this._mdegree;
		}
	}
}());

/**
 * @class
 */
Documa.distribution.DVReplacementItem = Ext.extend(Object, function(){
	/**
	 * Checks structure of given payload object.
	 * @param {Object} payload
	 */
	function validate(payload){
		if(!payload.component) throw new Error("Missing component field in replacement item payload!");
		if(!payload.mappings) throw new Error("Missing candidates in replacement item payload!");
	}
	
	/**
	 * Returns array of candidate items from array of flat objects.
	 * @param {Array} array contains candidate items as flat objects
	 * @returns {Array.<Documa.distribution.DVCandidateItem>}
	 */
	function getCandidates(array){
		if(!(array instanceof Array))
			throw new Error("Invalid candidates array argument!");
		let results = [];
		for(let i = 0; i < array.length; ++i) {
			results.push(new Documa.distribution.DVCandidateItem(array[i]));
		}
		return results;
	}
	
	return {
		/**
		 * @constructs.
		 * @param {Object} payload contains structural data elements
		 */
		constructor: function(payload){
			validate(payload);
			this._citem = new Documa.distribution.DVComponentItem(payload.component);
			this._candidates = getCandidates(payload.mappings);
            this._serial = payload;
		},
		
		/**
		 * @returns {Documa.distribution.ComponentItem}
		 */
		getComponentItem: function(){
			return this._citem;
		},
		
		/**
		 * @returns {Array.<Documa.distribution.DVCandidateItem>}
		 */
		getCandidates: function(){
			return this._candidates;
		},

        serialize: function() {
            return this._serial;
        }
	};
}());