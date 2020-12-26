Ext.namespace('Documa.communication.commands');

Documa.require('Documa.distribution.DistributionOption');
Documa.require('Documa.communication.commands.ExecutableCommand');
Documa.require('Documa.util.Logger');

Documa.communication.commands.ChoiceDistCommand = Ext.extend(Documa.communication.commands.ExecutableCommand, (function() {
	var _msg = null;

	return {
		constructor : function(message) {
			Documa.communication.commands.ChoiceDistCommand.superclass.constructor.call(this);
			_msg = message;
		},

		destructor : function() {
			_msg = null;
			_log = null;
		},
		
		/**
		 * This command is executed during the starting phase of the current application.
		 */
		execute : function() {
			var appContext = Documa.RuntimeManager.getApplicationContext();
			var distman = appContext.getDistributionManager();
			
			// close starting view 
			appContext.closeStartingView();
			distman.addSelectableDistribution(new Documa.distribution.DistributionOption(_msg.getPayload()));
		}
	};
})());
