/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
Ext.namespace('Documa.util');
Documa.util.CommandUtil = (function() {
	return {
		/**
		 * Validate given command against a defined structure. It is important
		 * that the command has a valid structure, because the serverside
		 * expects well defined commands.
		 *
		 * @param {Documa.communication.Command}
		 *            command to check
		 * @return {bool} returns true if command is valid */
		validateCommand : function(command) {
			if (command == null || command == undefined)
				throw new Error("Invalid argument exception!");

			if (!command.head)
				throw new Error("Invalid command structure: No head defined in command!");

			if (!command.head.type)
				throw new Error("Invalid command structure: No command type defined!");
			if (!command.head.timestamp)
				throw new Error("Invalid command structure: No command timestamp defined!");

			if (!command.body)
				throw new Error("Invalid command structure: No body defined in command!");

			return true;
		}

	};
})();