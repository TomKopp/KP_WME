Ext.namespace('Documa.communication.commands');

Documa.require('Documa.communication.commands.ExecutableCommand');
Documa.require('Documa.util.Logger');

Documa.communication.commands.NoChannelCommand = Ext.extend(Documa.communication.commands.ExecutableCommand, (function() {

	var TAG = "Documa.communication.commands.NoChannelCommand";
	var _log = Documa.util.Logger;

	return {
		constructor : function(message) {
			Documa.communication.commands.NoChannelCommand.superclass.constructor.call(this);
		},

		destructor : function() {
			_log = null;
		},

		execute : function() {
			try {
				_log.debug(TAG, "... no channels defined in communication model. Start component initialization immediatley.");
				var compManager = Documa.RuntimeManager.getComponentManager();
				compManager.initializeComponentsWithoutChannels();
			} catch(error) {
				_log.error(TAG," ERROR: "+error);
			}
		}

	};
})()); 