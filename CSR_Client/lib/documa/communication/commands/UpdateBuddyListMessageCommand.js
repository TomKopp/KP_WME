Ext.namespace('Documa.communication.commands');

Documa.require('Documa.communication.commands.ExecutableCommand');
Documa.require('Documa.util.Logger');
Documa.require('Ext.cruise.client.Message');
Documa.require('Documa.communication.protocol.Operation');


Documa.communication.commands.UpdateBuddyListMessageCommand = Ext.extend(Documa.communication.commands.ExecutableCommand, (function() {

	var TAG = "Documa.communication.commands.UpdateBuddyListMessageCommand";
	var _msg = null;
	var _log = null;

	return {

		constructor : function(message) {
			Documa.communication.commands.UpdateBuddyListMessageCommand.superclass.constructor.call(this);
			_msg = message;
			_log = Documa.util.Logger;
		},

		destructor : function() {
			_log.debug(TAG, "... releasing resources.");
			_msg = null;
			_log = null;
		},

		/**
		 * Method should take list of applications received from the server and present
		 * them in an appropriate way.
		 */
		execute : function() {
			try {
					_log.debug(TAG, "... execute update buddy list");
					var am = Documa.RuntimeManager.getAwarenessManager();
					if(am){
						var newBuddies = _msg.getPayload().users;
						am.getBuddyList().update(newBuddies,am);
					}
				} catch(error) {
				_log.error(TAG, "ERROR: " + error);
			}
		}

	};
})());
