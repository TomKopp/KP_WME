Ext.namespace("Documa.components");

Documa.require("Documa.util.Logger");

/**
 * @class
 */
Documa.components.ComponentEventProxy = Ext.extend(Object, (function () {
	const TAG = "Documa.components.ComponentEventProxy";
	const LOG = Documa.util.Logger;
	return  {
		/**
		 * @constructs
		 */
		constructor : function(){
			this._blocked = false;
		},

		/**
		 * Called during state injection phase. It forwards activity event to component instance despite
		 * the blockade during the migration prepare phase at receiver-side.
		 *
		 * @param {Documa.components.ComponentInputEvent} activityEvent
		 */
		injectEvent : function(activityEvent){
			throw new Error("Missing method 'inject event'!");
		},

		/**
		 * Called at the commitment phase of a running migration transaction on receiver-side.
		 *
		 * @param {Documa.components.ComponentInputEvent} downstreamEvent
		 */
		injectDownstreamEvent : function(downstreamEvent) {
			throw new Error("Missing method 'inject downstream event'!");
		},

		/**
		 * Release all internal resources.
		 */
		destroy : function() {
			throw new Error("Missing method 'destroy'!");
		},

		/**
		 * Activates the blockade during the migration prepare phase at sender and receiver-side.
		 */
		block : function() {
			this._blocked = true;
		},

		/**
		 * Deactivates the blockade.
		 */
		unblock : function() {
			this._blocked = false;
		}
	};
})());
