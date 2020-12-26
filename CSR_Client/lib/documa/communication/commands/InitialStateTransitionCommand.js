Ext.namespace('Documa.communication.commands');

Documa.require('Documa.util.Logger');
Documa.require('Documa.communication.protocol.Operation');

Documa.communication.commands.InitialStateTransitionCommand = Ext.extend(Documa.communication.commands.ExecutableCommand, (function() {
	var _payload = null;

	return {
		constructor : function(message) {
			Documa.communication.commands.InitialStateTransitionCommand.superclass.constructor.call(this);
			_payload = message.getPayload();
		},

		destructor : function() {
			_payload = null;
		},

		execute : function() {
			try {
				if (!_payload.operations) {
					throw new Error("Invalid payload received.");
				}

				// create list of operation objects
				var operations = new Array();
				for (var i = 0; i < _payload.operations.length; ++i) {
					operations.push(new Documa.communication.protocol.Operation(_payload.operations[i]));
				}

				// TODO: get application context from message and retrieve the component manager
				// from the determined application context

				// perform all operations to reach applications initial state
				Documa.RuntimeManager.getComponentManager().performInitialStateTransition(operations);
			} catch(error) {
				_log.error(TAG, " ERROR: " + error);
			}
		}

	};
})());
