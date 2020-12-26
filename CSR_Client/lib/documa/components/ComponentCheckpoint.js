Ext.namespace("Documa.components");

Documa.require("Documa.util.Logger");

Documa.components.ComponentCheckpoint = Ext.extend(Object,(function(){
	var TAG = "Documa.components.ComponentCheckpoint";
	var _log = Documa.util.Logger;
	
	/**
	 * Validates given property data fields.
	 * 
	 * @param {String} name
	 * @param {String} value
	 * @param {String} type
	 */
	function validateProperty(name, value, type){
		if(!name)
			throw new Error("Invalid property name!");
		if(!type)
			throw new Error("Invalid property type!");
	}
	return {
		/**
		 * Constructor.
		 * @param {String} instid
		 * @param {String} cid
		 */
		constructor : function(instid, cid){
			this._instid = instid;
			this._cid = cid;
			this._properties = [];
		},
		/**
		 * Returns id of corresponding component.
		 * @returns {String}
		 */
		getComponentId : function() {
			return this._cid;
		},
		/**
		 * Returns id of corresponding component instance.
		 * @returns {String}
		 */
		getInstanceId : function() {
			return this._instid;
		},
		/**
		 * Adds property element to checkpoint.
		 * @param {String} name
		 * @param {String} value
		 * @param {String} type
		 */
		addProperty : function(name, value, type) {
			_log.debug(TAG,"... adding property to checkpoint");
			// validating property values
			validateProperty(name, value, type);
			// the property fields should be used to retrieve state information 
			// on the migration target runtime
			this._properties.push({
				name : name,
				value : (value == undefined) ? null : value,
				type : type
			});
		},
		/**
		 * Clears checkpoints property array.
		 */
		clear : function(){
			while(this._properties.length > 0){
				this._properties.pop();
			}
		},
		/**
		 * Returns checkpoints property array.
		 * @returns {Array}
		 */
		getProperties : function(){
			return this._properties;
		},
		/**
		 * Serializes current checkpoint's properties.
		 * @returns {String}
		 */
		serialize : function() {
			return JSON.stringify(this._properties);
		}
	};
})());
