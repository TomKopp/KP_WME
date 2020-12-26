Ext.namespace('Documa.communication.commands');

Documa.require('Documa.communication.commands.ExecutableCommand');
Documa.require('Documa.util.Logger');

/**
 * @class
 * @extends {Documa.communication.commands.ExecutableCommand}
 */
Documa.communication.commands.IntegrateResourcesCommand = Ext.extend(Documa.communication.commands.ExecutableCommand, (function(){

	var TAG = "Documa.communication.commands.IntegrateResourcesCommand";
	var _message = null;
	var _log = Documa.util.Logger;
	var _componentManager = null;

	/*
	 * ***************** private methods * *****************
	 */

	/*
	 * ***************** public methods ** *****************
	 */
	return {
		/**
		 * @constructs
		 * @param {Documa.communication.Message} message
		 */
		constructor: function(message){
			Documa.communication.commands.IntegrateResourcesCommand.superclass.constructor.call(this);
			_message = message;

			// TODO: get application context from message and retrieve the component manager 
			// from the determined application context
			_componentManager = Documa.RuntimeManager.getComponentManager();
		},

		destructor: function(){
			_log.debug(TAG, "... releasing resources.");
			// release references
			_componentManager = null;
			_message = null;
		},

		/**
		 * This method should only be executed once, because the server
		 * sends all required resources encompassed in a single message.
		 * Hence, from the perspective of the client the set of required
		 * resources is determined.
		 */
		execute: function(){
			try {
				var payload = _message.getPayload();
				if (!payload.resrcs)
					throw new Error("Invalid payload in the received integration command");
				if (!payload.type)
					throw new Error("Invalid type field in received integration commmand!");
				if (!payload.jobid)
					throw new Error("Invalid job id field in received integration command!");
				_log.debug(TAG, "... starting component resources integration!");
				// start integration of components resources
				_componentManager.integrateComponentsResources(payload.jobid, payload.type, payload.resrcs);
			} catch (error) {
				_log.error(TAG, " ERROR: " + error.stack);
			}
		}

	};
})());
