Ext.namespace('Documa.ui.layout.strategy');

Documa.require('Documa.util.Logger');

Documa.ui.layout.strategy.LocalPreferences = Ext.extend(Object, (function () {
	var TAG = "Documa.ui.layout.strategy.LocalPreferences";
	var _log = Documa.util.Logger;

	return {
		constructor: function () {
			Documa.ui.layout.strategy.LocalPreferences.superclass.constructor.call(this);

			/**
			 * @type {Array.<{context:Documa.ui.layout.strategy.LayoutContextState, strategyId:string, creationTime:date}>}
			 * @private
			 */
			this._preferences = new Array();
			this._cfactory = new Documa.communication.commands.CommandFactory();
		},
		/**
		 * Adding preference object into internal preference registry.
		 * @param {Documa.ui.layout.strategy.LayoutContextState} paramContext
		 * @param {String} paramStrategyId
		 */
		updatePreference: function (contextState, paramStrategyId) {
			var creationDate = new Date();
			_log.debug("Adding preference " + contextState.viewportWidth + " " + contextState.viewportHeight + " " + paramStrategyId + " " + creationDate.getTime());
			var payload = {
				context: contextState,
				strategyId: paramStrategyId,
				creationTime: creationDate.getTime()
			};
			this._preferences.push(payload);
			var updatePreferenceCmd = this._cfactory.create(Documa.communication.MessageFieldValues.SYS_LEVEL, Documa.communication.commands.SystemCommands.UPDATEPREFERENCE, payload);
			Documa.RuntimeManager.getCommunicationManager().sendSystemLevelMessage(updatePreferenceCmd);
		},
		/**
		 * Returns preference object from preference context.
		 * @param paramContext
		 * @returns {{context:Documa.ui.layout.strategy.LayoutContextState, strategyId:string, creationTime:date}}
		 */
		getPreference: function (paramContext) {
			if(!paramContext)
				throw new Error("Invalid preference argument detected!");

			for (var i = 0; i < this._preferences.length; ++i) {
				var preference = this._preferences[i];
				_log.debug(TAG, "Possible preference to get: " + preference.context.viewportWidth + " "
					+ paramContext.viewportWidth + " " + preference.context.viewportHeight + " "
					+ paramContext.viewportHeight + " " + preference.strategyId);

				// test preference context attributes
				if (preference.context.viewportWidth == paramContext.viewportWidth &&
					preference.context.viewportHeight == paramContext.viewportHeight) {
					return preference;
				}
			}
			_log.debug(TAG, "... could not determine preference object from context attributes {viewport-width: " + paramContext.viewportWidth + ", viewport-height: " + paramContext.viewportHeight + "}");
			return null;
		}
	};
})()); 