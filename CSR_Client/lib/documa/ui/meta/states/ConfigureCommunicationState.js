Ext.namespace("Documa.ui.meta.states");

Documa.require("Documa.ui.meta.states.MetaUIState");

/**
 * Represents the state of configuring the communication relations between distributed mashup components.
 * @class
 * @extends {Documa.ui.meta.states.MetaUIState}
 */
Documa.ui.meta.states.ConfigureCommunicationState = Ext.extend(Documa.ui.meta.states.MetaUIState, function(){
	var TAG = "Documa.ui.meta.states.ConfigureCommunicationState";
	var _log = Documa.util.Logger;
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
		 * @param {Documa.context.ApplicationContext} appctxt
		 * @param {Documa.ui.meta.MetaUIController} controller
		 */
		constructor: function(appctxt, controller){
			Documa.ui.meta.states.ConfigureCommunicationState.superclass.constructor.call(this, appctxt, controller);
		}
	};
}());