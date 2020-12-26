Ext.namespace('Documa.distribution');

/**
 * Represents a component instance executed on a specific device.
 * @class
 */
Documa.distribution.ComponentItem = Ext.extend(Object, (function(){

	function validate(cmp) {
		if (!cmp.id)
			throw new Error("Component item is missing instance id!");
		if (!cmp.cid)
			throw new Error("Component item is missing component id!");
	}

	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {{id:string, cid:string}} cmp
		 */
		constructor: function(cmp){
			Documa.distribution.ComponentItem.superclass.constructor.call(this);
			validate(cmp);
			this._instid = cmp.id;
			this._cid = cmp.cid;

			/**
			 *
			 * @type {Array.<{activity:string, entity:string, operation:string}>}
			 * @private
			 */
			this._caps = [];
		},

		/**
		 * @returns {Documa.distribution.ComponentItem}
		 */
		copy: function(){
			var copy = new Documa.distribution.ComponentItem({id: uuid.v1(), cid: this._cid});
			copy.setIcon(this.getIcon());
			copy.setName(this.getName());
			copy.setDescription(this.getDescription());
			copy.setSmcd(this.getSmcd());
			this._caps.forEach(function(cap){
				copy.addCapability(cap.activity, cap.entity, cap.operation);
			});
			return copy;
		},

		/**
		 * @param {String} name
		 */
		setName: function(name){
			this._name = name;
		},

		/**
		 * @returns {String}
		 */
		getName: function(){
			return this._name;
		},

		/**
		 * @param {String} text
		 */
		setDescription: function(text){
			this._text = text;
		},

		/**
		 * @returns {String}
		 */
		getDescription: function(){
			return this._text;
		},

		/**
		 * @param {String} iconUrl
		 */
		setIcon: function(iconUrl){
			this._iconUrl = iconUrl;
		},

		/**
		 * @returns {String}
		 */
		getIcon: function(){
			return this._iconUrl;
		},

		/**
		 * @returns {string}
		 */
		getInstanceId: function(){
			return this._instid;
		},

		/**
		 * @returns {string}
		 */
		getComponentId: function(){
			return this._cid;
		},

		/**
		 * @param {smcdl} smcd
		 */
		setSmcd: function(smcd) {
			this._smcd = smcd;	
		},

		/**
		 * @returns {smcdl}
		 */
		getSmcd: function() {
			return this._smcd;
		},

		/**
		 * @returns {Array.<{entity:string, activity:string, operation:string}>}
		 */
		getCapabilities: function(){
			return this._caps;
		},

		/**
		 * @param {string} activity
		 * @param {string} entity
		 * @param {string} operationName
		 */
		addCapability: function(activity, entity, operationName){
			this._caps.push({
				entity: entity,
				activity: activity,
				operation: operationName
			});
		}
	};
})());
