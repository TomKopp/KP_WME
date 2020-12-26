Ext.namespace('Documa.communication.commands');

Documa.require('Documa.communication.commands.ExecutableCommand');
Documa.require('Documa.util.Logger');

/**
 * @class
 * @extends {Documa.communication.commands.ExecutableCommand}
 */
Documa.communication.commands.IntegrateTriggerCommand = Ext.extend(Documa.communication.commands.ExecutableCommand, (function () {
	var TAG = "Documa.communication.commands.IntegrateTriggerCommand";
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
			Documa.communication.commands.IntegrateTriggerCommand.superclass.constructor.call(this);
			_msg = message;
		},

		destructor: function () {
			_log.debug(TAG, "... releasing resources.");
			_msg = null;
		},

		execute: function () {
			try {
				var triggerman = Documa.RuntimeManager.getTriggerManager();
				// take trigger list from server (payload) and start trigger integration via TriggerManager
				triggerman.loadTriggers(_msg.getPayload());
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		}
	};
})()); 