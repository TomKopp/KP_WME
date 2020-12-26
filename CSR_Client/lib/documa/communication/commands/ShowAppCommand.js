Ext.namespace('Documa.communication.commands');

Documa.require('Documa.communication.commands.ExecutableCommand');
Documa.require('Documa.util.Logger');

/**
 * Showing applications after the successful login on the server-side.
 * @class
 * @extends {Documa.communication.commands.ExecutableCommand}
 */
Documa.communication.commands.ShowAppCommand = Ext.extend(Documa.communication.commands.ExecutableCommand, (function () {
	var TAG = "Documa.communication.commands.ShowAppCommand";
	var _msg = null;
	var _log = Documa.util.Logger;
	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {Documa.communication.Message} message
		 */
		constructor: function (message) {
			Documa.communication.commands.ShowAppCommand.superclass.constructor.call(this);
			_msg = message;
		},
		/**
		 * Dtor.
		 */
		destructor: function () {
			_log.debug(TAG, "... releasing resources.");
			_msg = null;
			_log = null;
		},
		/**
		 * Method should take list of applications received from the server and present
		 * them in an appropriate way.
		 */
		execute: function () {
			try {
				_log.debug(TAG, "... presenting applications.");
				Documa.RuntimeManager.onApplicationsReceived(_msg);
				//Documa.RuntimeManager.getUIManager().showApplications(_msg);
			} catch (error) {
				_log.error(TAG, "ERROR: " + error);
			}
		}

	};
})());
