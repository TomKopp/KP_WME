Ext.namespace('Documa.communication.commands');

Documa.require('Documa.communication.Message');

Documa.communication.commands.Commands = {
	REQRUNTIME : "reqrt" // command to publish requests to several client-side runtimes
};

/**
 * @class
 * @extends {Documa.communication.Message}
 */
Documa.communication.commands.Command = Ext.extend(Documa.communication.Message, (function() {
	return {
		/**
		 * @constructs
		 */
		constructor : function() {
			Documa.communication.commands.Command.superclass.constructor.call(this);
			this.type = Documa.communication.MessageTypes.COMMAND_MSG_TYPE;
		}
	};
})());
