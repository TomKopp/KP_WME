Ext.namespace("Documa.ui.authentication");

Documa.require("Documa.ui.authentication.LoginPanel");
Documa.require("Documa.ui.authentication.RegisterPanel");
Documa.require("Documa.ui.authentication.LostPasswordPanel");
Documa.require("Documa.ui.authentication.ResetPasswordPanel");
Documa.require("Documa.ui.authentication.SuccessPanel");
Documa.require("Documa.ui.authentication.ErrorPanel");

Documa.ui.authentication.AuthenticationView = Ext.extend(Object, (function() {

	var _loginPanel = null;
	var _registerPanel = null;
	var _lostPasswordPanel = null;
	var _resetPasswordPanel = null;
	var _errorPanel = null;
	var _successPanel = null;
	var _runtimeManager = null;

	return {
		constructor : function(authManager) {
			Documa.ui.authentication.AuthenticationView.superclass.constructor.call(this);
			//Initialization of the authentication panels
			_loginPanel = new Documa.ui.authentication.LoginPanel(authManager);
			_registerPanel = new Documa.ui.authentication.RegisterPanel(authManager);
			_lostPasswordPanel = new Documa.ui.authentication.LostPasswordPanel(authManager);
			_resetPasswordPanel = new Documa.ui.authentication.ResetPasswordPanel(authManager);
			_errorPanel = new Documa.ui.authentication.ErrorPanel(authManager);
			_successPanel = new Documa.ui.authentication.SuccessPanel(authManager);
		},

		showLogin : function() {
			_loginPanel.show();
		},

		hideLogin : function() {
			_loginPanel.hide();
		},

		closeLogin : function() {
			_loginPanel.close();
		},

		showRegister : function() {
			_registerPanel.show();
		},

		hideRegister : function() {
			_registerPanel.hide();
		},

		clearRegister : function() {
			_registerPanel.clearFields();
		},

		closeRegister : function() {
			_registerPanel.close();
		},

		showLostPassword : function() {
			_lostPasswordPanel.show();
		},

		hideLostPassword : function() {
			_lostPasswordPanel.hide();
		},

		clearLostPassword : function() {
			_lostPasswordPanel.clearFields();
		},

		closeLostPassword : function() {
			_lostPasswordPanel.close();
		},

		setResetPasswordMail : function(emailaddress) {
			_resetPasswordPanel.setMail(emailaddress);
		},

		showResetPassword : function() {
			_resetPasswordPanel.show();
		},

		hideResetPassword : function() {
			_resetPasswordPanel.hide();
		},

		clearResetPassword : function() {
			_resetPasswordPanel.clearFields();
		},

		closeResetPassword : function() {
			_resetPasswordPanel.close();
		},

		showError : function(errorTxt) {
			_errorPanel.show(errorTxt);
		},

		hideError : function() {
			_errorPanel.hide();
		},

		closeError : function() {
			_errorPanel.close();
		},

		showSuccess : function(successTxt) {
			_successPanel.show(successTxt);
		},

		hideSuccess : function() {
			_successPanel.hide();
		},

		closeSuccess : function() {
			_successPanel.close();
		}
	};
})());
