Ext.namespace('Documa.ui.authentication');

Documa.require('Documa.util.Logger');
Documa.require('Documa.authentication.AuthenticationManager');

Documa.ui.authentication.LostPasswordPanel = Ext.extend(Object, ( function () {
	/* private members */
	var TAG = 'Documa.ui.authentication.LostPasswordPanel';
	var _log = Documa.util.Logger;

	/**
	 * @type {Documa.authentication.AuthenticationManager}
	 * @private
	 */
	var _authenticationManager = null;
	var _lostPasswordPanel = null;

	return {
		/**
		 * Ctor.
		 * @param {Documa.authentication.AuthenticationManager} controller
		 */
		constructor: function (controller) {
			_authenticationManager = controller;
			_lostPasswordPanel = new Ext.Window({
				title: 'Verify Identity',
				layout: {
					align: 'stretch',
					type: 'vbox'
				},
				id: '_lostPasswordPanel',
				autoScroll: false,
				width: 280,
				height: 190,
				modal: true,
				shadow: false,
				maximizable: false,
				maximized: false,
				resizable: false,
				draggable: false,
				closable: true,
				closeAction: 'collapse', //replace close action with collapsed which is then
				// used as event to hide the panel
				padding: '5',
				items: [
					{
						xtype: 'textfield',
						id: 'lpp_username',
						emptyText: 'Username',
						minLength: 3,
						allowBlank: false,
						label: 'Username',
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
						id: 'lpp_mail',
						enableKeyEvents: true,
						emptyText: 'Mail Address',
						inputType: 'email',
						vtype: 'email',
						allowBlank: false,
						label: 'Mail Address',
						hideLabel: true,
						height: 45,
						listeners: {
							keyup: {
								fn: function (tfield, e) {
									//start validation if ENTER key is pressed while the mail field is focused
									if (e.getKey() == e.ENTER) {//Verify when Enter is pressed
										var verify = Ext.getCmp('lpp_verifyBtn');
										verify.handler.call(verify.scope);
									}
								}

							}
						}
					},
					{
						xtype: 'button',
						id: 'lpp_verifyBtn',
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
							var emailField = Ext.getCmp('lpp_mail');
							var usernameField = Ext.getCmp('lpp_username');
							if (emailField.validate() && usernameField.validate()) {
								var email = emailField.getValue();
								var username = usernameField.getValue();
								_authenticationManager.verifyUser(username, email);
							} else if (!emailField.validate() && usernameField.validate()) {
								_authenticationManager.getView().showError('Please enter a valid Mail Address.');
							} else if (emailField.validate() && !usernameField.validate()) {
								_authenticationManager.getView().showError('Please enter a valid Username.');
							} else {
								_authenticationManager.getView().showError('Please enter a valid Username and valid Mail Address.');
							}
						}

					}
				],
				listeners: {
					//replace collapse function with hide to return to login
					beforecollapse: function () {
						_authenticationManager.getView().showLogin();
						_authenticationManager.getView().hideLostPassword();
						return false;
					}

				}
			});
		},

		/**
		 * Is called to show the initial register dialog
		 *
		 * @return {void}
		 */
		show: function () {
			_lostPasswordPanel.show();
		},

		hide: function () {
			_lostPasswordPanel.hide();
		},

		close: function () {
			_lostPasswordPanel.close();
		},
		/**
		 * Function to clear the dialog fields.
		 */
		clearFields: function () {
			Ext.getCmp('lpp_mail').reset();
			Ext.getCmp('lpp_username').reset();
		}

	};
}()));