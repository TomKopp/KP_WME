Ext.namespace("Documa.ui.meta.states");

Documa.require("Documa.util.Logger");
Documa.require("Documa.ui.meta.states.MetaUIState");
Documa.require("Documa.distribution.realization.RealizationPrepareRequest");

/**
 * Represents the configuration of the application's distribution state during the application creation workflow.
 * @class
 * @extends {Documa.ui.meta.states.MetaUIState}
 */
Documa.ui.meta.states.ConfigureDistributionState = Ext.extend(Documa.ui.meta.states.MetaUIState, function(){
	var TAG = "Documa.ui.meta.states.ConfigureDistributionState";
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
		 * @param {Documa.context.ApplicationContext} appctx
		 * @param {Documa.ui.meta.MetaUIController} controller
		 */
		constructor: function(appctx, controller){
			Documa.ui.meta.states.ConfigureDistributionState.superclass.constructor.call(this, appctx, controller);
		},

		/**
		 * Triggers the realization of the application's distribution defined in current meta ui state.
		 * @returns {Promise}
		 */
		realizeDistribution: function(){
			// get those modifications with components
			var modifications = this._appctxt.getDistributionManager().getPreparingModifications().filter(function(mod){
				return mod.getComponents().length > 0;
			});
			_log.debug(TAG, "Start realize the application's distribution state including " + modifications.length + " distributions!");
			// create prepare request
			var sessionid = Documa.RuntimeManager.getRuntimeContext().getDevice().getSessionId();
			var realization = new Documa.distribution.realization.Realization(uuid.v1(), sessionid, this._appctxt, modifications);
			var request = new Documa.distribution.realization.RealizationPrepareRequest(this._appctxt, {
				rrole: Documa.distribution.realization.RealizationRoles.Source,
				realization: realization.serialize()
			});
			var self = this;
			// request to prepare the realization of the application's distribution state
			return new Promise(function(resolve, reject){
				realization = request.getRealization();
				realization.addListener(Documa.distribution.transaction.TransactionEvents.CANCELLED, function(){
					reject(realization);
				});
				realization.addListener(Documa.distribution.transaction.TransactionEvents.COMPLETED, function(){
					resolve(realization);
				});
				self._appctxt.getDistributionManager().onRealizationPrepareRequest(request).catch(reject);
			});
		}
	};
}());