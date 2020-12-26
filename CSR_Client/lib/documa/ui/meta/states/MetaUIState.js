Ext.namespace("Documa.ui.meta.states");

/**
 * This class represents an abstract state of the metaui. It provides basic members, e. g. the main controller object
 * the current application context.
 *
 * @class
 */
Documa.ui.meta.states.MetaUIState = Ext.extend(Object, function(){
	const TAG = "Documa.ui.meta.states.MetaUIState";
	const LOG = Documa.util.Logger;
	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {Documa.context.ApplicationContext} appctxt
		 * @param {Documa.ui.meta.MetaUIController} controller
		 */
		constructor: function(appctxt, controller){
			/**
			 * @type {Documa.context.ApplicationContext}
			 * @private
			 */
			this._appctxt = appctxt;
			/**
			 * @type {Documa.ui.meta.MetaUIController}
			 * @protected
			 */
			this._mainController = controller;
		},

		/**
		 * Sets current application context.
		 * @param {Documa.context.ApplicationContext} appctxt
		 */
		setApplicationContext: function(appctxt){
			this._appctxt = appctxt;
		},

		/**
		 * Triggers the configuration of the application's distribution state.
		 */
		configureDistribution: function(){
			throw new Error("The distribution state configuration is not supported in current metaui state.");
		},

		/**
		 * Triggers the realization of the configured application distribution state.
		 * @returns {Promise}
		 */
		realizeDistribution: function(){
			throw new Error("The distribution state realization is not supported in current metaui state.");
		},

		/**
		 * Triggers the configuration of the application's communication relations.
		 */
		configureCommunication: function(){
			throw new Error("The configuration of application's communication channels is not supported in current metaui state.");
		},

		/**
		 * Triggers the completion of current application configuration workflow.
		 */
		completeConfiguration: function(){
			throw new Error("The completion of current application's configuration is not supported in current metaui state.");
		}
	};
}());