Ext.namespace('Documa.communication.commands');

Documa.require('Documa.communication.commands.Command');

Documa.communication.commands.ApplicationCommands = {
	REQUESTSERV: "reqserv", // command to publish service access requests
	REQUESTSMCDLS: "reqsmcdls", // command to publish component descriptor requests
	CPUBLISH: "cpublish", // command to publish component message publishment
	MODIFYCHANNEL: "modifychannel", // command to create or delete new channels
	CHOICEDIST: "choicedist", // request command from server-side for defining a
	// concrete application distribution state during the loading phase of the
	// application
	SELECTDIST: "selectdist", // response command to the previous distribution state request command
	MIGRATE: "migrate",
	STAR_MIGRATION: "startmigrt",
	REQUESTDIST_MOD: "reqdistmod", // request distribution state modification
	REQUESTDIST_REAL: "reqdistreal", // request distribution state realization
	PUBLISHRECOMMENDATION: "publishrecommendation",
	LOWBATTERY: "lowbattery",
};

/**
 * @class
 * @extends {Documa.communication.commands.Command}
 */
Documa.communication.commands.ApplicationCommand = Ext.extend(Documa.communication.commands.Command, function(){
	return {
		constructor: function(){
			Documa.communication.commands.ApplicationCommand.superclass.constructor.call(this);
		}
	};
}());
