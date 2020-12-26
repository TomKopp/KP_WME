Ext.namespace('Documa.communication.commands');

Documa.require('Documa.communication.commands.ExecutableCommand');
Documa.require('Documa.util.Logger');

Documa.communication.commands.SearchCoReCommand = Ext.extend(Documa.communication.commands.ExecutableCommand, (function() {

	var TAG = "Documa.communication.commands.SearchCoReCommand";
	var _msg = null;
	var _log = Documa.util.Logger;

	return {

		constructor : function(message) {
			Documa.communication.commands.SearchCoReCommand.superclass.constructor.call(this);
			_msg = message;
		},

		destructor : function() {
			_log.debug(TAG, "... releasing resources.");
			_msg = null;
			_log = null;
		},

		/**
		 * Method should take list of search results received from the server and present
		 * them in an appropriate way.
		 */
		execute : function() {
			try {
				_log.debug(TAG, "... presenting Search Results.");
				if (Documa.RuntimeManager.onShowSearchResults)
					Documa.RuntimeManager.onShowSearchResults(_msg);
			} catch(error) {
				_log.error(TAG, "ERROR: " + error);
			}
		}

	};
})());
