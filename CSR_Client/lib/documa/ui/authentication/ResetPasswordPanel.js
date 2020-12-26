Ext.namespace('Documa.ui.authentication');

Documa.require('Documa.util.Logger');
Documa.require('Documa.authentication.AuthenticationManager');
Documa.require('Documa.authentication.MD5Generator');

Documa.ui.authentication.ResetPasswordPanel = Ext.extend(Object, ( function () {
	/* private members */
	var TAG = 'Documa.ui.authentication.ResetPasswordPanel';
	var _log = Documa.util.Logger;

	/**
	 * @type {Documa.authentication.AuthenticationManager}
	 * @private
	 */
	var _authenticationManager = null;
	var _resetPasswordPanel = null;
	var _md5Gen = null;
	var _email = null;

	return {
		/**
		 * Ctor.
		 * @param {Documa.authentication.AuthenticationManager} controller
		 */
		constructor: function (controller) {
			var self = this;
			_authenticationManager = controller;
			_md5Gen = new Documa.authentication.MD5Generator();
			_resetPasswordPanel = new Ext.Window({
				title: 'Reset Password',
				layout: {
					align: 'stretch',
					type: 'vbox'
				},
				id: '_resetPasswordPanel',
				autoScroll: false,
				width: 280,
				height: 190,
				modal: true,
				shadow: false,
				maximizable: false,
				maximized: false,
				resizable: false,
				draggable: false,
				closable: false,
				padding: '5',
				items: [
					{
						xtype: 'textfield',
						id: 'rpp_passphrase',
						emptyText: 'Pass Phrase',
						Length: 8,
						allowBlank: false,
						label: 'Pass Phrase',
						hideLabel: true,
						height: 45,
						margins: {
							top: 0,
							right: 0,
							bottom: 5,
							left: 0
						}
					},
					{
						xtype: 'textfield',
						id: 'rpp_newPassword',
						enableKeyEvents: true,
						emptyText: 'New Password',
						inputType: 'password',
						minLength: 6,
						allowBlank: false,
						label: 'New Password',
						hideLabel: true,
						height: 45,
						listeners: {
							keyup: {
								fn: function (tfield, e) {
									//start validation if ENTER key is pressed while the password field is focused
									if (e.getKey() == e.ENTER) {//Reset Password when Enter is pressed
										var resetPwd = Ext.getCmp('rpp_resetBtn');
										resetPwd.handler.call(resetPwd.scope);
									}
								}

							}
						}
					},
					{
						xtype: 'button',
						id: 'rpp_resetBtn',
						text: 'Recover Password',
						height: 45,
						scope: this,
						margins: {
							top: 5,
							right: 0,
							bottom: 0,
							left: 0
						},
						handler: function () {
							var passphraseField = Ext.getCmp('rpp_passphrase');
							var passwordField = Ext.getCmp('rpp_newPassword');
							if (passphraseField.validate() && passwordField.validate()) {
								var passphrase = passphraseField.getValue();
								var password = passwordField.getValue();
								//MD5 Hash generation
								var md5pwd = _md5Gen.md5(password);
								_authenticationManager.resetPassword(_email, md5pwd, passphrase);
							} else if (!passphraseField.validate() && passwordField.validate()) {
								_authenticationManager.getView().showError('Please enter the the excact Pass Phrase you recieved via Mail.');
							} else if (passphraseField.validate() && !passwordField.validate()) {
								_authenticationManager.getView().showError('Please enter a Password with at least 6 characters.');
							} else {
								_authenticationManager.getView().showError('Please enter the excact Pass Phrase you recieved via Mail and a Password with at least 6 characters.');
							}
						}

					}
				]
			});
		},

		/**
		 * Is called to show the initial register dialog
		 *
		 * @return {void}
		 */
		show: function () {
			_resetPasswordPanel.show();
		},

		hide: function () {
			_resetPasswordPanel.hide();
		},

		close: function () {
			_resetPasswordPanel.close();
		},

		/**
		 * Function to use mail from user verification as id for password reset
		 *
		 * @param email
		 */
		setMail: function (email) {
			_email = email;
		},
		/**
		 * Function to clear the dialog fields.
		 */
		clearFields: function () {
			Ext.getCmp('rpp_passphrase').reset();
			Ext.getCmp('rpp_newPassword').reset();
		}

	};
}()));
