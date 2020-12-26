Ext.namespace('Documa.communication.commands');

Documa.require('Documa.communication.commands.ExecutableCommand');
Documa.require('Documa.util.Logger');
Documa.require('Documa.communication.channels.LinkChannel');
Documa.require('Documa.communication.channels.BackLinkChannel');
Documa.require('Documa.communication.channels.PropertyLinkChannel');

Documa.communication.commands.AddChannelCommand = Ext.extend(Documa.communication.commands.ExecutableCommand, (function() {

	var TAG = "Documa.communication.commands.AddChannelCommand";
	var _log = Documa.util.Logger;

	var PROP_LINK = "PropertyLink";
	var LINK = "Link";
	var BACK_LINK = "BackLink";

	return {
		constructor : function(message) {
			Documa.communication.commands.AddChannelCommand.superclass.constructor.call(this);
			this._msg = message;
		},

		destructor : function() {
			_log.debug(TAG, "... releasing resources.");
			delete this._msg;
			this._msg = null;
		},

		execute : function() {
			try {
				var payload = this._msg.getPayload();

				if (!payload.jobid)
					throw new Error("Invalid job id field in received integration command!");
				if (!payload.type)
					throw new Error("Invalid integration type in INTEGRATE CHANNEL command defined!");
				if (!payload.chtype)
					throw new Error("Invalid channel type in INTEGRATE CHANNEL command defined!");
				if (!payload.name)
					throw new Error("Invalid channel name in INTEGRATE CHANNEL command defined!");
				if (!payload.params)
					throw new Error("Invalid channel parameter in INTEGRATE CHANNEL command defined!");

				// creating channel object from payload
				var channel = null;
				switch(payload.chtype) {
					case LINK:
						channel = new Documa.communication.channels.LinkChannel(payload);
						break;
					case BACK_LINK:
						channel = new Documa.communication.channels.BackLinkChannel(payload);
						break;
					case PROP_LINK:
						channel = new Documa.communication.channels.PropertyLinkChannel(payload);
						break;

				}
				Documa.RuntimeManager.getEventBroker().addChannel(channel);
			} catch(error) {
				_log.error(TAG, "ERROR: " + error);
			}
		}
	};
})());
