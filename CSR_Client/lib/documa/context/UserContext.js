Ext.namespace('Documa.context');

Documa.require("Documa.util.Logger");
Documa.require("Documa.util.Util");

/**
 * @typedef {Object} UserPayload
 * @property {String} userid
 * @property {String} username
 * @property {String} useremail
 * @property {String} usericon
 */

/**
 * User representation on the context layer.
 * @class
 */
Documa.context.UserContext = Ext.extend(Object, function(){
	var _log = Documa.util.Logger;
	var _util = Documa.util.Util;
	var TAG = "Documa.context.UserContext";
	var test = _util.test;

	/////////////////////
	// private methods //
	/////////////////////

	/**
	 * @param {UserPayload} userPayload
	 */
	function validateUserPayload(userPayload){
		test("userid", userPayload);
		test("username", userPayload);
		test("usericon", userPayload);
		test("useremail", userPayload);
	}

	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {UserPayload} userPayload
		 */
		constructor: function(userPayload){
			validateUserPayload(userPayload);
			this._userid = userPayload.userid;
			this._username = userPayload.username;
			this._usericon = userPayload.usericon;
			this._useremail = userPayload.useremail;
			_log.debug(TAG, "... new user context created for userid: " + this._userid + " !");
		},

		/**
		 * Returns the user's id.
		 *
		 * @return {String}
		 */
		getUserId: function(){
			return this._userid;
		},

		/**
		 * Returns the user's name.
		 *
		 * @return {String}
		 */
		getUserName: function(){
			return this._username;
		},

		/**
		 * Returns the user's email.
		 *
		 * @return {String}
		 */
		getUserEmail: function(){
			return this._useremail;
		},

		/**
		 * Returns a URL to the user's icon.
		 *
		 * @return {String}
		 */
		getUserIcon: function(){
			return this._usericon;
		}
	};
}());