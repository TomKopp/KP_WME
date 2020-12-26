Ext.namespace('Documa.ui.authentication');

Documa.require('Documa.util.Logger');
Documa.require('Documa.authentication.AuthenticationManager');
Documa.require('Documa.authentication.MD5Generator');

Documa.ui.authentication.RegisterPanel = Ext.extend(Object, (function () {
	/* private members */
	var TAG = 'Documa.ui.authentication.RegisterPanel';
	var _log = Documa.util.Logger;

	/**
	 * @type {Documa.authentication.AuthenticationManager}
	 * @private
	 */
	var _authenticationManager = null;
	var _registerPanel = null;
	var _md5Gen = null;
	var _dropzone = null;
	var fileUpload = null;

	/**
	 * Function to create new dimensions for resizing
	 *
	 * @param file Uploaded Picture used to get the original dimensions and ratio
	 * @returns info Object containing the new dimensions to which the picture gets resized
	 */
	var dimensions = function (file) {
		var info, ratio;
		var maxWidth = 40;
		var maxHeight = 80;
		info = {
			srcX: 0,
			srcY: 0,
			srcWidth: file.width,
			srcHeight: file.height,
			trgX: 0,
			trgY: 0,
			trgWidth: file.width,
			trgHeight: file.height
		};

		ratio = file.width / file.height;

		if (ratio >= 1 && file.width > maxWidth) {
			info.trgWidth = maxWidth;
			info.trgHeight = info.trgWidth / ratio;
		}

		if (ratio < 1 && file.height > maxHeight) {
			info.trgHeight = maxHeight;
			info.trgWidth = info.trgHeight * ratio;
		}

		_log.debug("original file size: " + info.srcWidth + "x" + info.srcHeight + " new file size: " + info.trgWidth + "x" + info.trgHeight);

		return info;
	};

	/**
	 * Function to resize an uploaded picture
	 *
	 * @param file Uploaded Picture which should be resized
	 * @returns Data Url created for the resized picture
	 */
	var resizePicture = function (file) {
		var fileReader = new FileReader();

		//creating a jquery deferred object to make sure picture is completely processed before returning
		var deferred = jQuery.Deferred();
		fileReader.onload = function () {
			var img;
			img = new Image;
			img.onload = function () {
				var canvas, ctx, resizeInfo, _ref, _ref1, _ref2, _ref3;
				file.width = img.width;
				file.height = img.height;
				resizeInfo = dimensions(file);
				canvas = document.createElement("canvas");
				ctx = canvas.getContext("2d");
				canvas.width = resizeInfo.trgWidth;
				canvas.height = resizeInfo.trgHeight;
				ctx.drawImage(img,
						(_ref = resizeInfo.srcX) != null ? _ref : 0,
						(_ref1 = resizeInfo.srcY) != null ? _ref1 : 0,
					resizeInfo.srcWidth,
					resizeInfo.srcHeight,
						(_ref2 = resizeInfo.trgX) != null ? _ref2 : 0,
						(_ref3 = resizeInfo.trgY) != null ? _ref3 : 0,
					resizeInfo.trgWidth,
					resizeInfo.trgHeight);
				//creates data url from resized picture and bind it to the deferred object
				deferred.resolve(canvas.toDataURL("image/png"));
			};
			img.src = fileReader.result;
		};
		fileReader.readAsDataURL(file);

		//returning resolved deferred object with data url bound to it
		return deferred.promise();
	};

	return {
		/**
		 * Ctor.
		 * @param {Documa.authentication.AuthenticationManager} controller
		 */
		constructor: function (controller) {

			_authenticationManager = controller;
			_md5Gen = new Documa.authentication.MD5Generator();

			_registerPanel = new Ext.Window({
				title: 'Register as new User',
				layout: {
					align: 'stretch',
					type: 'hbox'
				},
				id: '_registerPanel',
				autoScroll: false,
				width: 437,
				height: 238,
				modal: true,
				shadow: false,
				maximizable: false,
				maximized: false,
				resizable: false,
				draggable: false,
				closable: true,
				closeAction: 'hide', //replace close action with hide
				padding: '5',
				items: [
					{
						xtype: 'panel',
						layout: {
							align: 'stretch',
							type: 'vbox'
						},
						flex: 1,
						border: false,
						bodyStyle: 'background:none',
						margins: {top: 0, right: 5, bottom: 0, left: 0},
						items: [
							{
								xtype: 'textfield',
								id: 'rp_registerName',
								emptyText: 'Name',
								minLength: 3,
								allowBlank: false,
								label: 'Name',
								hideLabel: true,
								height: 45,
								margins: {top: 0, right: 0, bottom: 5, left: 0}
							},
							{
								xtype: 'textfield',
								id: 'rp_registerMail',
								emptyText: 'Mail Address',
								inputType: 'email',
								vtype: 'email',
								allowBlank: false,
								label: 'Mail Address',
								hideLabel: true,
								height: 45,
								margins: {top: 0, right: 0, bottom: 5, left: 0}
							},
							{
								xtype: 'textfield',
								id: 'rp_registerPassword',
								emptyText: 'Password',
								inputType: 'password',
								enableKeyEvents: true,
								minLength: 6,
								allowBlank: false,
								label: 'Password',
								hideLabel: true,
								height: 45,
								margins: {top: 0, right: 0, bottom: 5, left: 0},
								listeners: {
									keyup: {
										fn: function (tfield, e) {
											//start validation if ENTER key is pressed while the password field is focused
											if (e.getKey() == e.ENTER) { //Verify when Enter is pressed
												var register = Ext.getCmp('rp_registerBtn');
												register.handler.call(register.scope);
											}
										}
									}
								}
							},

							{
								xtype: 'button',
								id: 'rp_registerBtn',
								text: 'Register',
								height: 45,
								scope: this,
								handler: function () {
									//Validating user data
									var emailField = Ext.getCmp('rp_registerMail');
									var passwordField = Ext.getCmp('rp_registerPassword');
									var nameField = Ext.getCmp('rp_registerName');

									if (emailField.validate() && passwordField.validate() && nameField.validate()) {
										var email = emailField.getValue();
										var pwd = passwordField.getValue();
										var name = nameField.getValue();
										//MD5 Hash generation
										var md5pw = _md5Gen.md5(pwd);

										//check if user uploaded a picture
										if (_dropzone.files.length < 1) {
											_authenticationManager.sendRegistration(email, md5pw, name, "");
										} else {
											//get picture from dropzone
											var file = _dropzone.files[0];
											//resize the picture and save it into a new variable 
											var promise = resizePicture(file);
											//checks if the deferred object in the resize function was resolved and loads the bound picture
											promise.done(function (picture) {
												_authenticationManager.sendRegistration(email, md5pw, name, picture);
											});
										}
									}
									else if (!emailField.validate() && passwordField.validate() && nameField.validate()) {
										_authenticationManager.getView().showError('Registration could not be completeted. Please enter a valid Mail Address.');
									}
									else if (emailField.validate() && !passwordField.validate() && nameField.validate()) {
										_authenticationManager.getView().showError('Registration could not be completeted. Please enter a Password with at least 6 characters.');
									}
									else if (emailField.validate() && passwordField.validate() && !nameField.validate()) {
										_authenticationManager.getView().showError('Registration could not be completeted. Please enter your Name.');
									}
									else if (!emailField.validate() && !passwordField.validate() && nameField.validate()) {
										_authenticationManager.getView().showError('Registration could not be completeted. Please enter a valid Mail Address and a Password with at least 6 characters');
									}
									else if (!emailField.validate() && passwordField.validate() && !nameField.validate()) {
										_authenticationManager.getView().showError('Registration could not be completeted. Please enter a valid Mail Address and your Name');
									}
									else if (emailField.validate() && !passwordField.validate() && !nameField.validate()) {
										_authenticationManager.getView().showError('Registration could not be completeted. Please enter a Password with at least 6 characters and your Name');
									}
									else {
										_authenticationManager.getView().showError('Registration could not be completeted. Please fill the fields with your Mail Address, a Password with at least 6 characters and your Name.');
									}
								}
							}
						]
					},
					{
						xtype: 'panel',
						layout: {
							align: 'stretch',
							type: 'vbox'
						},
						width: 150,
						border: false,
						bodyStyle: 'background:none',
						items: [
							//Dropbox element
							{
								xtype: 'panel',
								id: 'rp_userPic',
								html: '<form id=\"userpic\" class=\"dropzone\"></form>',
								height: 195,
								border: false,
								bodyStyle: 'background:none'
							}
						]
					}
				],
				listeners: {
					beforehide: function () {
						_authenticationManager.getView().showLogin();
						return true;
					},
					afterrender: function () {
						/**
						 * Dropzone initialization after the panel is rendered
						 * needs to be after rendering the panel because HTML is generated at this point of time
						 */
						_dropzone = new Dropzone('#userpic', {
							url: '/',
							maxFilesize: '0.2', // 200KB max file size
							parallelUploads: 1,
							uploadMultiple: false,
							addRemoveLinks: true,
							autoProcessQueue: false, //added pictures will not upload automatically
							createImageThumbnails: false,
							clickable: true,
							acceptedFiles: 'image/*'
						});
						_log.debug(TAG + '... dropzone initialized!');

						/**
						 * Function to limit amount of pictures to 1
						 */
						_dropzone.on('addedfile', function (file) {
							var files = _dropzone.getQueuedFiles();
							for (var i = 0; i < files.length; i++) {
								_dropzone.removeFile(files[i]);
							}
						});
					}
				}
			});
		},

		show: function () {
			_registerPanel.show();
		},

		hide: function () {
			_registerPanel.hide();
		},

		close: function () {
			_registerPanel.close();
		},
		/**
		 * Function to clear the dialog fields.
		 */
		clearFields: function () {
			Ext.getCmp('rp_registerMail').reset();
			Ext.getCmp('rp_registerPassword').reset();
			Ext.getCmp('rp_registerName').reset();
		},

		uploadPic: function (mail) {
			_email = mail;
			fileUpload();
		}
	};
}()));