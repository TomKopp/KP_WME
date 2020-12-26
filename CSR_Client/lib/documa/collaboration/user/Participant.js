Ext.namespace('Documa.collaboration.user');

Documa.require("Documa.util.Logger");

/**
 * @typedef {object} ParticipantPayload
 * @property {string} userid
 * @property {string} fname
 * @property {string} lname
 * @property {string} uname
 * @property {string} sid
 * @property {string} status
 * @property {string} icon
 * @property {string} color
 */

/**
 * This class represents a user participating in a distributed application.
 *
 * @class
 */
Documa.collaboration.user.Participant = Ext.extend(Object, (function(){

	/**
	 * Helper method to validate payload object received from the server.
	 * @param {Object} payload object containing user information (sessionid, name,
	 * user id, status, ...)
	 */
	function validatePayload(payload) {
		if (!payload.fname)
			throw new Error("No first name defined!");
		if (!payload.lname)
			throw new Error("No last name defined!");
		if (!payload.uname)
			throw new Error("No user name defined!");
		if (!payload.sid)
			throw new Error("No session id defined!");
		if (!payload.status)
			throw new Error("No status defined!");
		if (!payload.userid)
			throw new Error("No user id defined!");
		if (!payload.icon)
			throw new Error("No user icon defined!");
		if (!payload.color)
			throw new Error("No user color defined!");
	};

	return {
		/**
		 * Constructor.
		 *
		 * @param {ParticipantPayload} payload object containing client data
		 * @param {boolean} initiator flag representing the initiator state
		 */
		constructor: function(payload, initiator){
			Documa.collaboration.user.Participant.superclass.constructor.call(this);
			validatePayload(payload);
			this._payloadObj = payload;
			this._isInitiator = initiator;

			/**
			 * Application registry.
			 * @type {Object.<string, Documa.context.ApplicationContext>}
			 * @private
			 */
			this._applications = {};
		},

		/**
		 * Returns first name.
		 *
		 * @return {String}
		 */
		getFirstName: function(){
			return this._payloadObj.fname;
		},

		/**
		 * Returns last name.
		 *
		 * @return {String}
		 */
		getLastName: function(){
			return this._payloadObj.lname;
		},

		/**
		 * Returns user's name.
		 */
		getUsername: function(){
			return this._payloadObj.uname;
		},

		/**
		 * Returns session id.
		 *
		 * @return {String}
		 */
		getSessionId: function(){
			return this._payloadObj.sid;
		},

		/**
		 * Returns status string.
		 *
		 * @return {String}
		 */
		getStatus: function(){
			return this._payloadObj.status;
		},

		/**
		 * Returns user id.
		 *
		 * @return {String}
		 */
		getUserId: function(){
			return this._payloadObj.userid;
		},

		/**
		 * Returns users awareness color.
		 *
		 * @return {number}
		 */
		getColor: function(){
			return this._payloadObj.color;
		},

		/**
		 * Returns user's icon.
		 */
		getIcon: function(){
			return this._payloadObj.icon;
		},

		/**
		 * Returns initiator flag.
		 *
		 * @returns {Boolean} true if this object is the applications' initiator, else
		 * false
		 */
		isInitiator: function(){
			return this._isInitiator;
		},

		/**
		 * Register associated application context.
		 * @param {Documa.context.ApplicationContext} application
		 */
		addApplication: function(application){
			/** @type {string} */
			var app_instid = application.getValue(Documa.context.ApplicationContextAttributes.APP_INSTID);
			this._applications[app_instid] = application;
		},

		/**
		 * @returns {Array.<Documa.context.ApplicationContext>}
		 */
		getApplications: function(){
			/** @type {Array.<Documa.context.ApplicationContext>} */
			var results = [];
			for (var key in this._applications){
				var app = this._applications[key];
				results.push(app);
			}
			return results;
		},

		/**
		 * Returns application context from it's instance identifier.
		 * @param {string} appinstid
		 * @returns {Documa.context.ApplicationContext}
		 */
		getApplication: function(appinstid){
			return this._applications[appinstid];
		},

		/**
		 * Removes application association.
		 * @param {Documa.context.ApplicationContext} application
		 */
		removeApplication: function(application){
			var app_instid = application.getValue(Documa.context.ApplicationContextAttributes.APP_INSTID);
			delete this._applications[app_instid];
		}
	};
})());
