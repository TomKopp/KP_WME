Ext.namespace('Documa.communication.commands');

Documa.require('Documa.communication.commands.ExecutableCommand');
Documa.require('Documa.util.Logger');

/**
 * @class
 * @extends {Documa.communication.commands.ExecutableCommand}
 */
Documa.communication.commands.PublishRecommendationCommand = Ext.extend(Documa.communication.commands.ExecutableCommand, (function () {
	var TAG = "Documa.communication.commands.PublishRecommendationCommand";
	var _log = Documa.util.Logger;
	var _msg = null;
	//////////////////////
	// public interface //
	//////////////////////
	return {
		/**
		 * @constructs
		 * @param {Documa.communication.Message} message
		 */
		constructor: function (message) {
			Documa.communication.commands.PublishRecommendationCommand.superclass.constructor.call(this);
			_msg = message;
		},

		destructor: function () {
			_log.debug(TAG, "... releasing resources.");
			_msg = null;
		},

		execute: function () {
			try {
				// take recommendations from server and start publishing for ui (display phase handler)
				var displayPhaseHandler = Documa.RuntimeManager.getRecommendationManager().getDisplayPhaseHandler();
				//_log.info("[Publish Recommendation Command] received: "+JSON.stringify(_msg.getPayload()));
				displayPhaseHandler.parseJob(_msg);
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		}
	};
})()); 