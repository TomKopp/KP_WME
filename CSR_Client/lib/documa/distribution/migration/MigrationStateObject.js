Ext.namespace("Documa.distribution.migration");

Documa.distribution.migration.MigrationStateObject = Ext.extend(Object, (function() {
	/**
	 * Helper method to validate structure of state item.
	 */
	function validate(stateitem) {
		if (!stateitem.cinstance)
			throw new Error("No component instance id defined in state item!");
		if (!stateitem.checkpoint || !(stateitem.checkpoint instanceof Array))
			throw new Error("Invalid checkpoint defined in state item!");
		if (!stateitem.events && !(stateitem.checkpoint instanceof Array))
			throw new Error("Invalid input events defined in state item!");
	}

	return {
		/**
		 * Constructor.
		 * @param {Object} stateitem object containing state information
		 *
		 * {
		 *		cinstance : instid,
		 *		checkpoint : [{
		 * 			name:<propertyname>,
		 * 			type:<propertytype>,
		 * 			value:<propertyvalue>
		 *   	},{
		 * 			...
		 *   	}, ...],
		 *	 	events : [{
		 * 			event:<type_string>,
		 * 			timestamp: <timeinmillis-since-1/1/1970>
		 * 			...
		 * 			<specific
		 * 		 	 event
		 * 		 	 parameter>
		 * 			...
		 *   	}]
		 * 	}
		 *
		 */
		constructor : function(stateitem) {
			validate(stateitem);
			this._stateitem = stateitem;
		},
		/**
		 * Returns component instance id.
		 * @returns {String}
		 */
		getInstanceId : function() {
			return this._stateitem.cinstance;
		},
		/**
		 * Returns components input events.
		 * @returns {Array}
		 */
		getInputEvents : function() {
			return this._stateitem.events;
		},
		/**
		 * Returns array of component properties.
		 * @returns {Array}
		 */
		getCheckpoint : function() {
			return this._stateitem.checkpoint;
		}
	};
})());
