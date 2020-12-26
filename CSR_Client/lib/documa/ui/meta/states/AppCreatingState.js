Ext.namespace("Documa.ui.meta.states");

Documa.require("Documa.ui.meta.states.MetaUIState");
Documa.require("Documa.ui.meta.states.ConfigureDistributionState");

/**
 * This class represents the application created state at the beginning of the multi-device application creation workflow.
 * @class
 * @extends {Documa.ui.meta.states.MetaUIState}
 */
Documa.ui.meta.states.AppCreatingState = Ext.extend(Documa.ui.meta.states.MetaUIState, function(){
	const TAG = "Documa.ui.meta.states.AppCreatingState";
	const LOG = Documa.util.Logger;
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
		 * @param {Documa.context.ApplicationContext} appctx
		 * @param {Documa.ui.meta.MetaUIController} controller
		 */
		constructor: function(appctx, controller){
			Documa.ui.meta.states.AppCreatingState.superclass.constructor.call(this, appctx, controller);
		},

		/**
		 * Trigger the activation of the distribution at the end of this current state.
		 */
		configureDistribution: function(){
			this._mainController.getMetaUIView().hideLoader();
			let uiman = Documa.RuntimeManager.getUIManager();
			let distman = this._appctxt.getDistributionManager();

			// get component distribution dialog, which implements the SearchResultView-interface
			let cmpDistribution = this._mainController.getMetaUIView().getDistributionDialog();
			cmpDistribution.setApplicationContext(this._appctxt);
			/** @type {Array.<Documa.distribution.Distribution>} */
			let distributions = distman.getDistributions();
			distributions.forEach(function(distribution){
				let device = distman.getDevice(distribution.getSessionId());
				if (!cmpDistribution.containsDevice(device))
					cmpDistribution.addDevice(device);
			});
			uiman.getMenuManager().setSearchResultView(cmpDistribution);

			// trigger the activation of the distribution view
			this._mainController.getMetaUIView().showDistribution(this._appctxt);
			let newstate = new Documa.ui.meta.states.ConfigureDistributionState(this._appctxt, this._mainController);
			this._mainController.setState(newstate);
		}
	};
}());