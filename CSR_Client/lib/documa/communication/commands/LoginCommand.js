Ext.namespace('Documa.communication.commands');

Documa.require('Documa.util.Logger');
Documa.require('Documa.context.UserContext');
Documa.require('Documa.communication.commands.ExecutableCommand');

/**
 * @class
 */
Documa.communication.commands.LoginCommand = Ext.extend(Documa.communication.commands.ExecutableCommand, (function(){
	var TAG = "Documa.communication.commands.LoginCommand";
	var _msg = null;
	var _log = Documa.util.Logger;

	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {Documa.communication.Message} message
		 */
		constructor: function(message){
			Documa.communication.commands.LoginCommand.superclass.constructor.call(this);
			_msg = message;
		},

		/**
		 * Destructor.
		 */
		destructor: function(){
			_log.debug(TAG, "... releasing resources.");
			_msg = null;
			_log = null;
		},

		/**
		 * Method should take Server Authentication Message and log the user in.
		 */
		execute: function(){
			try {
				_log.debug(TAG, "... Login.");
				if (Documa.RuntimeManager.onSuccessfulLogin) {
					var userContext = new Documa.context.UserContext(_msg.getPayload());
					Documa.RuntimeManager.onSuccessfulLogin(userContext);
				}
			} catch (error) {
				_log.error(TAG, "ERROR: " + error.stack);
			}
		}
	};
})());
