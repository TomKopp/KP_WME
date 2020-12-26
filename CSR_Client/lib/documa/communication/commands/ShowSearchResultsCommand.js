Ext.namespace('Documa.communication.commands');

Documa.require('Documa.communication.commands.ExecutableCommand');
Documa.require('Documa.util.Logger');

/**
 * @class
 */
Documa.communication.commands.ShowSearchResultsCommand = Ext.extend(Documa.communication.commands.ExecutableCommand, (function(){

	var TAG = "Documa.communication.commands.ShowSearchResultsCommand";
	var _msg = null;
	var _log = Documa.util.Logger;

	return {
		/**
		 * Ctor..
		 * @constructs
		 * @param {Documa.communication.Message} message
		 */
		constructor: function(message){
			Documa.communication.commands.ShowSearchResultsCommand.superclass.constructor.call(this);
			_msg = message;
		},

		destructor: function(){
			_log.debug(TAG, "... releasing resources.");
			_msg = null;
		},

		/**
		 * Method should take list of search results received from the server and present
		 * them in an appropriate way.
		 */
		execute: function(){
			try {
				_log.debug(TAG, "... presenting Search Results.");
				if (Documa.RuntimeManager.getUIManager().showSearchResults) {
					Documa.RuntimeManager.getUIManager().showSearchResults(_msg);
				}
				else {
					throw new Error("Couldn't display search results on ui-layer!");
				}
			} catch (error) {
				_log.error(TAG, "ERROR: " + error.stack);
			}
		}

	};
})());
