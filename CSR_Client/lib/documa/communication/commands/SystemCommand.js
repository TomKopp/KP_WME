Ext.namespace('Documa.communication.commands');

Documa.require('Documa.communication.commands.Command');

Documa.communication.commands.SystemClientCommands = {
	INIT: "__documa__init",
	OPEN: "__documa__open",
	CLOSE: "__documa__close",
	SEND_MSG: "__documa__send",
	EXIT: "__documa__exit"
};

Documa.communication.commands.SystemCommands = {
	PUBLISH: "publish",
	SUBSCRIBE: "subscribe",
	UNSUBSCRIBE: "unsubscribe",
	COMMIT: "commit",
	ABORT: "abort",
	DISCONNECT: "disconnect",
	HANDSHAKE: "handshake",
	SHOWAPPS: "showapps",
	STARTAPP: "startapp",
	JOINAPP: "joinapp",
	JOINCOLLAB: "joincollaboration",
	SEARCHCORE: "searchcore",
	SHOWSEARCHRESULTS: "showsearchresults",
	LOGIN: "login",
	INTEGRRES: "integrateres",
	INTEGRCOMP: "integratecmp",
	INTTRIGGER: "integratetriggers",
	ADDCHANNEL: "addchannel",
	NOCHANNEL: "nochannels",
	OPENSERV: "openserv",
	REQUESTSERV: "reqserv",
	INITSTATE: "initstate",
	LAYOUT: "layout",
	CREATEAPP: "createapp",
	PAUSEAPP: "pauseapp",
	CLOSEAPP: "closeapp",
	RESUMEAPP: "resumeapp",
	SHAREOBJECT: "shareobject",
	DISTRIBUTEMESSAGE: "distributemessage",
	SETPROPERTY: "setproperty",
	UPDATEBUDDIES: "updatebuddylist",
	GETPROPERTIES: "getproperties",
	UPDATERIGHT: "updateright",
	REGDEVS: "regdevs"
};

/**
 * @class
 * @extends {Documa.communication.commands.Command}
 */
Documa.communication.commands.SystemCommand = Ext.extend(Documa.communication.commands.Command, (function () {
	return {
		/**
		 * @constructs
		 */
		constructor: function () {
			Documa.communication.commands.SystemCommand.superclass.constructor.call(this);
		}
	};
})());
