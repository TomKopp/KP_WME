Ext.namespace('Documa.communication.events');

Documa.require('Documa.communication.events.Event');

Documa.communication.events.ApplicationEvents = {
	APP_LIFECYCLE_CHANGED: "applfchng",
	APP_CHANGED: "appchanged",
	APP_ERROR: "apperror",
	ON_SDISTCHNGD: "sdistchngd",
	ON_REQSMCDLS: "onreqscmdls",
	ON_MIGRATE_READYRESP: "onmigrateresp",
	ON_TRANSACTION_COMPLETED: "trscmpltd",
	ON_RUNTIME_RESP: "onruntimeresp",
    CHANNEL_CREATED: "channelcreated",
    CHANNEL_REMOVED: "channelremoved",
	MIGROPTS_READY: "migroptsrdy",
	HISTUPDATE: "distributionHistory",
	HISTINIT: "migrationHistoryInit",
	LOWBATTERY: "lowbattery", // migration cause
	OPTIONSELECTED: "optionselected",
	MIGRATIONCANCEL: "migrationcancel",
	MIGRATIONEND: "migrationend",
    UPDATE_MIGRATIONPROGRESS: "updatemigrationprogress", // event for an update in the migration progress
	CANCEL_MIGRATIONPROGRESS: "cancelmigrationprogress",
	REVERSE_MIGRATIONPROGRESS: "reversemigrationprogress",
	CLOSE_MIGRATIONWINDOW: "closemigrationwindow",
};

Documa.communication.events.ApplicationChangeType = {
	CLIENT_JOINED: "joined",
	CLIENT_LEFT: "left",
	CMP_LIFECYCLE_CHANGED: "cmplfchng",
	CMP_ADDED: "cmpadded",
	CMP_REMOVED: "cmpremoved",
	CMP_XCHANGED: "cmpxchanged",
	LOCAL_CHANNEL_ADDED: "localchanneladded",
	LOCAL_CHANNEL_REMOVED: "localchannelremoved"
};

/**
 * An event concerning a specific application space.
 * @class
 * @extends {Documa.communication.events.Event}
 */
Documa.communication.events.ApplicationEvent = Ext.extend(Documa.communication.events.Event, (function(){
	return {
		/**
		 * @constructs
		 * @param {Object} message
		 */
		constructor: function(message){
			Documa.communication.events.ApplicationEvent.superclass.constructor.call(this, message);
		},

		/**
		 * @returns {String}
		 */
		getApplicationInstanceId: function(){
			let payload = this.getPayload();
			if (!payload.instid)
				throw new Error("No application instance id in application event defined!");

			return payload.instid;
		},

		/**
		 * @returns {String}
		 */
		getApplicationId: function(){
			let payload = this.getPayload();
			if (!payload.id)
				throw new Error("No application instance id in application event defined!");
			return payload.id;
		},

		/**
		 * @returns {String}
		 */
		getApplicationVersion: function(){
			let payload = this.getPayload();
			if (!payload.version)
				throw new Error("No application version in application event defined!");
			return payload.version;
		}
	};
})());
