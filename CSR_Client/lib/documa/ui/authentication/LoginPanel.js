Ext.namespace('Documa.ui.authentication');

Documa.require('Documa.util.Logger');

Documa.require('Documa.context.DesktopRuntimeContext');
Documa.require('Documa.context.SmartphoneRuntimeContext');
Documa.require('Documa.authentication.AuthenticationManager');
Documa.require('Documa.authentication.MD5Generator');

Documa.ui.authentication.LoginPanel = Ext.extend(Object, ( function () {
	/* private members */
	var TAG = 'Documa.ui.authentication.LoginPanel';
	var _log = Documa.util.Logger;

	/**
	 *
	 * @type {Documa.authentication.AuthenticationManager}
	 * @private
	 */
	var _authenticationManager = null;
	var _loginPanel = null;
	var _md5generator = null;

	return {
		/**
		 * Ctor.
		 * @param {Documa.authentication.AuthenticationManager} controller
		 */
		constructor: function (controller) {
			var self = this;
			_authenticationManager = controller;
			_md5generator = new Documa.authentication.MD5Generator();
			this._serverUrl = "ws://localhost:8082";

			_loginPanel = new Ext.Window({
				title: 'Login',
				layout: {
					//align: 'stretch',
					type: 'vbox'
				},
				id: 'lp_authentication',
				autoScroll: false,
				width: 300,
				height: 350,
				modal: true,
				shadow: false,
				maximizable: false,
				maximized: false,
				resizable: false,
				draggable: false,
				closable: false,
				padding: '5',
				bbar: {
					dock: 'bottom',
					items: [
						{
							text: 'Lost Password',
							handler: function () {
								_authenticationManager.getView().showLostPassword();
								_loginPanel.hide();
							}

						},
						'->',
						{
							text: 'Sign Up',
							handler: function () {
								_authenticationManager.getView().showRegister();
								_loginPanel.hide();
							}

						}
					]
				},
				items: [
					{
						xtype: 'textfield',
						id: 'lp_serverUrl',
						emptyText: 'Server IP-address',
						label: 'Server Address',
						value: self._serverUrl,
						allowBlank: false,
						hideLabel: true,
						height: 50,
						cls: 'form-control',
						margins: {
							top: 0,
							right: 0,
							bottom: 5,
							left: 0
						},
						listeners: {
							render: function (field) {
								try {
									// init server url of authentication manager
									_authenticationManager.setServerUrl(self._serverUrl);
								} catch (error) {
									_log.error(TAG, error.stack);
									Documa.ui.UIManager.showError(error.toString());
								}
							},
							change: function (field, newValue, oldValue) {
								_log.debug(TAG, "... changed server address to: " + newValue);
								self._serverUrl = newValue;
								try {
									// hand over server url to authentication manager
									_authenticationManager.setServerUrl(newValue);
								} catch (error) {
									_log.error(TAG, error.stack);
									Documa.ui.UIManager.showError(error.toString());
								}
							}
						}
					},
					{
						xtype: 'textfield',
						id: 'lp_authenticationMail',
						emptyText: 'Mail Address',
						label: 'Mail Address',
						//value : 'oliver.mross@tu-dresden.de',
						value: 'bob',
						//value: 'gregor.blichmann@tu-dresden.de',
						//value : 'kateryna@edyra.de',
						//inputType : 'email',
						//vtype : 'email',
						allowBlank: false,
						hideLabel: true,
						height: 50,
						cls: 'form-control',
						margins: {
							top: 0,
							right: 0,
							bottom: 5,
							left: 0
						}
					},
					{
						xtype: 'textfield',
						id: 'lp_authenticationPassword',
						enableKeyEvents: true,
						emptyText: 'Password',
						inputType: 'password',
						//value: 'edyra!',
						//value : 'edyra',
						value: 'alice',
						//value : '123456',
						allowBlank: false,
						label: 'Password',
						hideLabel: true,
						cls: 'form-control',
						height: 50,
						listeners: {
							keyup: {
								fn: function (tfield, e) {
									//start validation if ENTER key is pressed while the password field is focused
									if (e.getKey() == e.ENTER) {//Login when Enter is pressed
										var login = Ext.getCmp('lp_loginBtn');
										login.handler.call(login.scope);
									}
								}

							}
						}
					},
					{
						xtype: "button",
						text: 'Submit',
						id: 'defaultLoginButton1',
						width: 150,
						margins: {top: 0, right: 0, bottom: 15, left: 0},
						listeners: {
							render: function (component) {
								//component.getEl().on('click', function(){
								Ext.get('defaultLoginButton1').on('click', function () {
									var mail = Ext.getCmp('lp_authenticationMail');
									var pwd = Ext.getCmp('lp_authenticationPassword');
									var serverUrl = Ext.getCmp('lp_serverUrl');
									if (mail.validate() && pwd.validate()) {
										// TODO: just for testing multi-device scenarios
										Documa.RuntimeManager.setRuntimeContext(new Documa.context.DesktopRuntimeContext());
										_authenticationManager.sendLogin(serverUrl.getValue(), mail.getValue(), _md5generator.md5(pwd.getValue()));

										// Pass main value (which is userId) to the client's Access Control Manager to
										// provide later the access control functionality
										Documa.RuntimeManager.getAccessControlManager().setUserId(mail.getValue());
									} else if (mail.validate() && !pwd.validate()) {
										_authenticationManager.showError('Please enter a Password.');
									} else if (!mail.validate() && pwd.validate()) {
										_authenticationManager.getView().showError('Please enter a valid Mail Address.');
									} else {
										_authenticationManager.getView().showError('Please fill in your Mail Address and Password.');
									}
								});
							}

						}
					},
					{
						xtype: "button",
						text: 'Submit Smartphone',
						id: 'defaultLoginButton2',
						width: 150,
						listeners: {
							render: function (component) {
								//component.getEl().on('click', function(){
								Ext.get('defaultLoginButton2').on('click', function () {
									var mail = Ext.getCmp('lp_authenticationMail');
									var pwd = Ext.getCmp('lp_authenticationPassword');
									var serverUrl = Ext.getCmp('lp_serverUrl');
									if (mail.validate() && pwd.validate()) {
										// TODO: just for testing multi-device scenarios
										Documa.RuntimeManager.setRuntimeContext(new Documa.context.SmartphoneRuntimeContext());
										_authenticationManager.sendLogin(serverUrl.getValue(), mail.getValue(), _md5generator.md5(pwd.getValue()));

										// Pass main value (which is userId) to the client's Access Control Manager to
										// provide later the access control functionality
										Documa.RuntimeManager.getAccessControlManager().setUserId(mail.getValue());
									} else if (mail.validate() && !pwd.validate()) {
										_authenticationManager.showError('Please enter a Password.');
									} else if (!mail.validate() && pwd.validate()) {
										_authenticationManager.getView().showError('Please enter a valid Mail Address.');
									} else {
										_authenticationManager.getView().showError('Please fill in your Mail Address and Password.');
									}
								});
							}

						}
					}
				]
			});
		},

		show: function () {
			_loginPanel.show();
		},

		hide: function () {
			_loginPanel.hide();
		},

		close: function () {
			_loginPanel.close();
		}

	};
}()));
