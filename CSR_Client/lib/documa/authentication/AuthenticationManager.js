Ext.namespace('Documa.authentication');

Documa.require('Documa.util.Logger');
Documa.require('Documa.RuntimeManager');
Documa.require('Documa.communication.commands.CommandFactory');
Documa.require('Documa.context.UserContext');
Documa.require('Documa.ui.authentication.AuthenticationView');

/**
 * Entity encapsulating the authentication logic.
 * @class
 */
Documa.authentication.AuthenticationManager = Ext.extend(Object, ( function () {
	/* private members */
	var TAG = 'Documa.authentication.AuthenticationManager';
	var _log = Documa.util.Logger;
	var _authView = null;

	/* public members */
	return {
		/**
		 * Ctor.
		 * @constructs
		 */
		constructor: function () {
			this._runtimeManager = Documa.RuntimeManager;
			this._authView = new Documa.ui.authentication.AuthenticationView(this);
			this._serverUrl = null;
			this._currentUser = null;
		},

		/**
		 * Sets address of server for login.
		 * @param {String} serverUrl
		 */
		setServerUrl: function (serverUrl) {
			if (!(serverUrl.indexOf("ws://") == 0 || serverUrl.indexOf("wss://") == 0)) {
				throw new Error("Server url invalid! It should specify a websocket " +
					"endpoint starting with 'ws://' or 'wss://' protocol.");
			}

			this._serverUrl = serverUrl;
			_log.debug(TAG, "... changed server url to: " + serverUrl);
		},

		/**
		 * Returns address of server for login.
		 * @returns {String}
		 */
		getServerUrl: function () {
			return this._serverUrl;
		},

		/**
		 * Returns authentication view.
		 *
		 * @return {Documa.ui.authentication.AuthenticationView}
		 */
		getView: function () {
			return this._authView;
		},

		/**
		 * Start user authentication - user has to login.
		 */
		start: function () {
			this._authView.showLogin();
		},

		/**
		 * Resets all authentication fields.
		 */
		reset: function () {
			this._authView.closeLogin();
			this._authView.closeRegister();
			this._authView.closeLostPassword();
			this._authView.closeResetPassword();
		},

		/**
		 * Function to prepare the login.
		 *
		 * @param {String} serverUrl
		 * @param {String} email
		 * @param {String} pwd
		 */
		sendLogin: function (serverUrl, email, pwd) {
			var reqtype = 'login';
			var userid = email;
			var username = '';
			var userpwd = pwd;
			var phrase = '';
			var pic = '';
			this._runtimeManager.onSendAuth(reqtype, userid, userpwd, username, phrase, pic, serverUrl);
		},

		/**
		 * Function to prepare the registration.
		 *
		 * @param {String} email
		 * @param {String} pwd
		 * @param {String} name
		 * @param {String} userpic
		 */
		sendRegistration: function (email, pwd, name, userpic) {
			var reqtype = 'newuser';
			var userid = email;
			var username = name;
			var userpwd = pwd;
			var phrase = '';
			this._runtimeManager.onSendAuth(reqtype, userid, userpwd, username, phrase, userpic, this.getServerUrl());
		},

		/**
		 * Function to prepare the user verification. It is the first step of the
		 * LostPassword procedure.
		 *
		 * @param {String} name
		 * @param {String} email
		 */
		verifyUser: function (name, email) {
			var reqtype = 'verifyuser';
			var userid = email;
			var username = name;
			var userpwd = '';
			var phrase = '';
			var pic = '';
			this._runtimeManager.onSendAuth(reqtype, userid, userpwd, username, phrase, pic, this.getServerUrl());
		},

		/**
		 * Function to prepare the password reset. It is the second and last step of the
		 * LostPassword procedure.
		 *
		 * @param {String} email
		 * @param {String} pwd
		 * @param {String} passphrase
		 */
		resetPassword: function (email, pwd, passphrase) {
			var reqtype = 'setnewpwd';
			var userid = email;
			var username = '';
			var userpwd = pwd;
			var phrase = passphrase;
			var pic = '';
			this._runtimeManager.onSendAuth(reqtype, userid, userpwd, username, phrase, pic, this.getServerUrl());
		},

		/**
		 * Function to create an error message for the specific type of request that
		 * failed on server side.
		 *
		 * @param authPl Payload sent from the Server containing type of authentication
		 * request which failed.
		 */
		onAuthError: function (authPl) {
			Documa.RuntimeManager.getUIManager().hideLoader();
			_log.error(TAG, 'error ' + authPl);
			var errormsg = 'An Error occured';
			var reqTypes = {
				'login': function () {
					errormsg += ' on Login. Please check your Credentials again.';
				},
				'newuser': function () {
					errormsg += ' on Registration. Please  try again.';
				},
				'verifyuser': function () {
					errormsg += ' on User Verification. Please check your Username and Mail Address again.';
				},
				'setnewpwd': function () {
					errormsg += ' on Password Reset. Please check the Pass Phrase again.';
				},
				'error': function () {
					errormsg += '.';
				}
			};

			if (reqTypes[authPl]) {
				reqTypes[authPl]();
			} else {
				reqTypes['error']();
			}

			this._authView.showError(errormsg);
		},

		/**
		 * Error message which is shown if the user entered a mail address that is
		 * already registered in the database.
		 */
		onUsernameTaken: function () {
			Documa.RuntimeManager.getUIManager().hideLoader();
			var errormsg = 'An Account is already registered on the Mail Address you entered.';
			this._authView.showError(errormsg);
		},

		/**
		 * Error message which is shown if the user tried to log in Edyra with an
		 * unconfirmed Account.
		 */
		onUnconfirmedMail: function () {
			Documa.RuntimeManager.getUIManager().hideLoader();
			var errormsg = 'The Mail Address you used is not confirmed yet.';
			this._authView.showError(errormsg);
		},

		onSuccessfulRegister: function () {
			Documa.RuntimeManager.getUIManager().hideLoader();
			this._authView.clearRegister();
			this._authView.hideRegister();
			this._authView.showLogin();
			var successmsg = 'The Registration was completed successfully. Please check your Mails to confirm your Account.';
			this._authView.showSuccess(successmsg);
		},

		onSuccessfulVerification: function (email) {
			Documa.RuntimeManager.getUIManager().hideLoader();
			this._authView.clearLostPassword();
			this._authView.hideLostPassword();
			this._authView.showResetPassword();
			this._authView.setResetPasswordMail(email);
			var successmsg = 'The Verification was completed successfully. Please check your Mails for the Pass Phrase you will need in the next step.';
			this._authView.showSuccess(successmsg);
		},

		onSuccessfulPwdReset: function () {
			Documa.RuntimeManager.getUIManager().hideLoader();
			this._authView.clearResetPassword();
			this._authView.hideResetPassword();
			this._authView.showLogin();
			var successmsg = 'Your password was changed. You can now use it for the Login.';
			this._authView.showSuccess(successmsg);
		},

		/**
		 * Called after the users login data was validated successfully.
		 *
		 * @param {Documa.context.UserContext} userContext
		 */
		onSuccessfulLogin: function(userContext){
			// store current user
			this._currentUser = userContext;
		},

		/**
		 * Called after the has loged out.
		 */
		onLogout: function () {
			this._currentUser = null;
		},

		/**
		 * Returns the current user context.
		 *
		 * @returns {Documa.context.UserContext}
		 */
		getCurrentUserContext: function(){
			return this._currentUser;
		}
	};
}()));
