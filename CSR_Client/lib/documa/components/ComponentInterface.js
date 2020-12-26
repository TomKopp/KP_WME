Ext.namespace("Documa.components");

/**
 * @class
 */
Documa.components.ComponentInterface = Ext.extend(Object, function() {
	const TAG = "Documa.components.ComponentInterface";
	const _log = Documa.util.Logger;
	/////////////////////
	// private methods //
	/////////////////////
	
	/* TODO: add here your private methods */
	
	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {string|object} smcd component interface description
		 */
		constructor: function(smcd) {
			Documa.components.ComponentInterface.superclass.constructor.call(this);
			if(!smcd)
				throw new Error("Invalid component descriptor!");
			
			let parsed = null;
			if(typeof smcd == "string") {
				/** @type {jQuery} */
				parsed = jQuery.parseXML(smcd);
			} else if(smcd.getAttribute) { // smcd is a DOM element
				parsed = smcd.ownerDocument; // get the owner document
			}
			
			/**
			 * @type {d3.Selection<any>}
			 * @private
			 */
			this._interface = d3.select(parsed).select("component");
		},
		
		/**
		 * @returns {string}
		 */
		getId: function() {
			return this._interface.attr(id);
		},
		
		/**
		 * @returns {string}
		 */
		getName: function() {
			return this._interface.attr("name");
		},
		
		/**
		 * @returns {string}
		 */
		getIcon: function() {
			/** @type {d3.Selection<any>} */
			let iconEl = this._interface.select("metadata > icons > icon");
			if(!iconEl || iconEl.empty())
				return null;
			return iconEl.attr("url");
		}
		
		// add here further interface elements //
	};
}());