Ext.namespace('Documa.communication.events');

Documa.require('Documa.communication.events.Event');

Documa.communication.events.SystemEvents = {
	ON_HANDSHAKE: "onhandshake",
	AUTH_ERROR: "autherror",
	CMP_INITIALIZED: "componentinitialized",
	CODE_RECIEVED: "codereceived",
	INTGR_ERROR: "integrationerror",
	INSTANT_ERROR: "instantiationerror",
	INIT_ERROR: "initerror",
	INTGR_FINISHED: "integrationfinished",
	CLIENT_INITIALIZED: "clientinitialized",
	ONREQUSTSERV: "onreqserv",
	APPLFCHNG: "applfchng",
	ON_TRIGGER: "ontrigger",
	INIT_TRIGGERS: "inittriggers",
	DEVICE_RMV: "deviceremoved",
	DEVICE_JND: "devicejoined",
	DEVICE_RSC: "deviceresource",
	DEVICE_ENV: "deviceenvironment",
	APP_DIST: "applicationdistribution",
	USABLE_DEVSADDED: "udevs_added",
	USABLE_DEVSRMVED: "udevs_remved",
	DESCR_READY: "descr_ready",
	CONTEXT_CHANGED: "ctxtchanged"
};

Documa.communication.events.HandshakeResponse = {
	HANDSHAKE_CID_HEADER: "sessionid",
	HANDSHAKE_SLIN_HEADER: "sysinput",
	HANDSHAKE_SLOUT_HEADER: "sysoutput",
	HANDSHAKE_ALIN_HEADER: "appinput",
	HANDSHAKE_ALOUT_HEADER: "appoutput",
	HANDSHAKE_DESCR_HEADER: "rtdescr",

	//Type of the response to distinguish authentication types (login, register,
	// verify user, reset password, error)
	HANDSHAKE_RES_TYPE: "restype",
	//authentication payload
	HANDSHAKE_AUTH_PL: "authpl",
};
/**
 * @class
 * @extends {Documa.communication.events.Event}
 */
Documa.communication.events.SystemEvent = Ext.extend(Documa.communication.events.Event, (function(){
	return {
		/**
		 * @constructs
		 * @param {Object} message
		 */
		constructor: function(message){
			Documa.communication.events.SystemEvent.superclass.constructor.call(this, message);
		}
	};
})());
