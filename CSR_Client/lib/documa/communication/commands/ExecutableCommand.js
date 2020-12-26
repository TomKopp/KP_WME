Ext.namespace('Documa.communication.commands');

Documa.require('Documa.util.Destroyable');

/**
 * @class
 * @extends {Documa.util.Destroyable}
 */
Documa.communication.commands.ExecutableCommand = Ext.extend(Documa.util.Destroyable, (function(){
	var TAG = "Documa.communication.commands.ExecutableCommand";
	var _log = Documa.util.Logger;

	return {
		/**
		 * Constructor.
		 * @constructs
		 * @param {Documa.communication.Message} message
		 */
		constructor: function(message){
			Documa.communication.commands.ExecutableCommand.superclass.constructor.call(this);
			if (!message instanceof Documa.communication.Message)
				_log.error(TAG, "Invalid constructor message parameter.");
		},
		execute: function(){
			throw new Error("Execute()-operation not implemented in your command class!");
		}
	};
})());
