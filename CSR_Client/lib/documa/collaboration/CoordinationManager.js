Ext.namespace('Documa.collaboration');

Documa.require('Documa.communication.commands.CommandFactory');
Documa.require('Documa.ui.awareness.WorkspaceAwarenessUtility');
Documa.require('Documa.context.ApplicationContext');

Documa.collaboration.CoordinationManager = Ext.extend(Object, ( function() {
		var TAG = 'Documa.collaboration.CoordinationManager';
		var _log = Documa.util.Logger;

		var _sharingWindow = null;
		var _cfactory = null;
		var _communicationManager = null;
		var _runtimeManager = null;
		var _componentManager = null;
		var _initializedComponentsStore = null;
		var _workspaceAwarenessUtilty = null;

		var _accessRightsStore = new Ext.data.ArrayStore({
			fields : ['AccessRight'],
			data : [['reshare'], ['reconfigure'], ['contribute'], ['consume']]
		});

		var _test = new Ext.data.ArrayStore({
			fields : ['Test'],
			data : [['property 1'], ['property 2'], ['property 3']]
		});

		/**
		 * TODO: Rework required! 
		 */
		var componentRepresentedName = function(name) {
			switch (name) {
				case "http://cruise/ui/xima/vvo/hotelList/ExtHotelList":
					return "Hotel List";
					break;
				case "http://mmt.inf.tu-dresden.de/EDYRA/prototype/Map":
					return "Google Map";
					break;
				case "http://cruise/services/hotels/ean":
					return "Expedia Hotel Service";
				default:
					return name;
			}
		};

		/**
		 * Helper method to create and send the SHAREOBJECT command.
		 * 
		 * @param {Object} payload object containing payload information
		 */
		var sendShareObjectCommand = function(payload) {
			// create SHAREOBJECT command object
			var shareobjectcmd = _cfactory.create(Documa.communication.MessageFieldValues.SYS_LEVEL, 
				Documa.communication.commands.SystemCommands.SHAREOBJECT, 
				payload);
			
			// sending command to server
			_communicationManager.sendSystemLevelMessage(shareobjectcmd);
		};

		/**
		 * Helper method to create and send the UPDATERIGHT command object.
		 * 
		 * @param {Object} payload object containing payload information
		 */
		var sendUpdateRightCommand = function(payload) {
			// create UPDATERIGHT command object
			var updaterightcmd = _cfactory.create(Documa.communication.MessageFieldValues.SYS_LEVEL, 
				Documa.communication.commands.SystemCommands.UPDATERIGHT, 
				payload);
			
			_communicationManager.sendSystemLevelMessage(updaterightcmd);
		};

		var getPropertiesNames = function(instance) {
			var propertiesCheckboxItems = [];
			var propertiesNames = _componentManager.getInstancePropertiesNames(instance);
			for (var i = 0; i < propertiesNames.length; ++i) {
				propertiesCheckboxItems.push({
					boxLabel : propertiesNames[i],
					name : propertiesNames[i],
					id : instance + propertiesNames[i],
				});
			}
			return propertiesCheckboxItems;
		};

		return {
			constructor : function() {
				// nothing todo here
			},

			initialize : function() {
				_cfactory = new Documa.communication.commands.CommandFactory();
				_communicationManager = Documa.RuntimeManager.getCommunicationManager();
				_runtimeManager = Documa.RuntimeManager;
				_componentManager = Documa.RuntimeManager.getComponentManager();
				_initializedComponentsStore = _componentManager.getComponentsStore();
				//_workspaceAwarenessUtilty = new Documa.collaboration.awareness.WorkspaceAwarenessUtility();
				_workspaceAwarenessUtilty = Documa.RuntimeManager.getAwarenessManager().getAwarenessUtility();
				_accessControlManager = Documa.RuntimeManager.getAccessControlManager();

				var checkboxitems = [];

				var user = _accessControlManager.getUserId();

				// Create checkbox items for separate initialized components, but add only that
				// components to the checkboxitems, which the current user has a right to share:
				// a) userRight == null, it means that the component has been initialized within
				// the client environment, but not shared before =>
				// user can share this private components, in this case he becomes an owner

				// b) userRight == "own", it means that the component has been already shared
				// with some users and the current user is an owner of this shared component,
				// he can share it again with other new users

				// c) userRight == "reshare", it means that the component has been already shared
				// with some users and the current user has a right to share this component with
				// new users (this right for him was defined by an owner of the shared component)

				Ext.each(_initializedComponentsStore.getRange(), function(item) {
					var instance = item.data.id;
					var propertiesNames = _componentManager.getInstancePropertiesNames(instance);
					var userRight = _accessControlManager.getUserRight(instance, user);
					if (userRight == null || userRight == "own" || userRight == "reshare") {
						checkboxitems.push({
							xtype : 'checkboxgroup',
							columns : 1,
							items : [{
								xtype : 'checkbox',
								boxLabel : "<b>" + componentRepresentedName(item.data.name) + "</b>",
								name : item.data.name,
								itemId : instance,
								id : instance,
								listeners : {
									check : function(checkbox, value) {
										if (value) {
											// if a component is checked then make all its properties also checked
											for (var i = 0; i < propertiesNames.length; ++i) {
												Ext.getCmp(instance + propertiesNames[i]).setValue(true);
											}
										} else {
											for (var i = 0; i < propertiesNames.length; ++i) {
												Ext.getCmp(instance + propertiesNames[i]).setValue(false);
											}
										}
									}

								}
							}, {
								xtype : 'checkboxgroup',
								fieldLabel : 'Properties',
								columns : 3,
								items : getPropertiesNames(item.data.id),
							}]
						});
					}
				});

				//sharing window
				if (checkboxitems.length != 0) {

					_sharingWindow = new Ext.Window({
						baseCls : "sharingWindow",
						title : 'Sharing Mode',
						id : 'sharing_window',
						headerCfg : {
							id : 'sharingWindow-header',
							tag : 'div',
							cls : 'sharingWindow-header'
						},
						modal : true,
						closable : true,
						autoScroll : true,
						resizable : false,
						draggable : false,

						items : new Ext.Panel({
							bodyCssClass : "sharingWindow-body",
							margins : {
								left : 20
							},
							items : [{
								title : 'Select application part to share or to change access rights',
								headerCfg : {
									id : 'section-header1',
									tag : 'div',
									cls : 'section-header'
								}
							}, {
								xtype : 'fieldset',
								cls : 'checkbox-fieldset',
								layout : 'anchor',
								border : false,
								items : [{
									id : 'componentsCheckboxGroup',
									xtype : 'checkboxgroup',
									itemCls : 'x-check-group-alt',
									items : checkboxitems
								}, {
									id : 'channelCheckbox',
									xtype : 'checkbox',
									boxLabel : '<b>Provide Input From Private Space</b>',
									cls : 'checkbox',
									name : 'channel',
								}, {
									id : 'compositionCheckbox',
									xtype : 'checkbox',
									boxLabel : '<b>Whole Composition</b>',
									cls : 'checkbox',
									name : 'composition',
									listeners : {
										check : function(checkbox, value) {
											if (value) {
												Ext.getCmp('componentsCheckboxGroup').disable();
												Ext.getCmp('channelCheckbox').disable();
											} else {
												Ext.getCmp('componentsCheckboxGroup').enable();
												Ext.getCmp('channelCheckbox').enable();
											}
										}

									}

								}],

							}, {
								title : 'Define collaboration partners and their access rights',
								headerCfg : {
									id : 'section-header2',
									tag : 'div',
									cls : 'section-header'
								},
							}, {
								xtype : 'fieldset',
								border : false,
								items : [{
									xtype : 'textfield',
									id : 'firstUserNameField',
									fieldLabel : 'First User',
									height : 25,
									value : 'gregor.blichmann@tu-dresden.de',
									allowBlank : false,
									inputType : 'email',
									vtype : 'email',
								}, {
									id : 'firstAccessRightsComboBox',
									xtype : 'combo',
									fieldLabel : 'Access Right',
									typeAhead : true,
									triggerAction : 'all',
									height : 25,
									lazyRender : true,
									value : 'consume',
									allowBlank : false,
									mode : 'local',
									store : _accessRightsStore,
									valueField : 'AccessRight',
									displayField : 'AccessRight'
								}, {
									xtype : 'textfield',
									id : 'secondUserNameField',
									fieldLabel : 'Second User',
									height : 25,
									value : 'robert@robert.de',
									allowBlank : false,
									inputType : 'email',
									vtype : 'email',
								}, {
									id : 'secondAccessRightsComboBox',
									xtype : 'combo',
									fieldLabel : 'Access Right',
									typeAhead : true,
									triggerAction : 'all',
									height : 25,
									lazyRender : true,
									value : 'consume',
									allowBlank : false,
									mode : 'local',
									store : _accessRightsStore,
									valueField : 'AccessRight',
									displayField : 'AccessRight'
								}],

							}],

						}),

						buttons : [{
							text : 'SHARE',
							scope : this,
							handler : function() {
								// 1. Define selected components that an owner wants to share and info about
								// channels
								var checkedComponents = {};
								var channelOnInputData = "";

								if (Ext.getCmp('compositionCheckbox').getValue()) {
									//get all components and set that all channels also have to be shared
									Ext.each(_initializedComponentsStore.getRange(), function(item) {
										checkedComponents[item.data.name] = item.data.id;
									});
									channelOnInputData = "allChannels";
								} else {
									/*var components = Ext.getCmp('componentsCheckboxGroup').getValue();
									 //get selected components and if necessary set that channels on input data have
									// to be shared
									 Ext.each(components, function (item) {
									 checkedComponents[item.getName()] = item.getItemId();
									 });*/

									Ext.each(_initializedComponentsStore.getRange(), function(item) {
										var instance = item.data.id;
										if (Ext.getCmp(instance) != undefined) {
											if (Ext.getCmp(instance).getValue()) {
												checkedComponents[item.data.name] = instance;
											}
										}
									});

									if (Ext.getCmp('channelCheckbox').getValue()) {
										channelOnInputData = "channelOnInputData";
									} else {
										channelOnInputData = "noChannels";
									}
								}

								// 2. Create a new Access Control List (user-right relations) and add invited
								// users and their access rights the new ACL
								var newACL = {};

								var firstNameField = Ext.getCmp('firstUserNameField');
								var firstRightField = Ext.getCmp('firstAccessRightsComboBox').getValue();
								var secondNameField = Ext.getCmp('secondUserNameField');
								var secondRightField = Ext.getCmp('secondAccessRightsComboBox').getValue();

								if (firstNameField.validate()) {
									newACL[firstNameField.getValue()] = firstRightField;
								}
								if (secondNameField.validate()) {
									newACL[secondNameField.getValue()] = secondRightField;
								}

								// 3. If at least one component has been selected and at least one invited user
								// with his right has been defined,
								// before send the Share Object command define for each component among the
								// selected component whether it has been already shared or
								// not yet (in case when a component has been already shared, propose a person
								// who tries to make sharing again (owner or user with "reshare" right)
								// change users' rights to it, but do not realise sharing again)
								if ((checkedComponents.length != 0 && firstNameField.validate()) || (checkedComponents.length != 0 && secondNameField.validate())) {
									for (var componentid in checkedComponents) {
										var componentToShare = {};
										var propertiesNames = [];
										var transmittedACL = {};
										var instance = checkedComponents[componentid];
										var instanceACL = _accessControlManager.getACL(instance);

										// get app instance data
										var appid = Documa.RuntimeManager.getApplicationContext().getValue(Documa.context.ApplicationContextAttributes.APP_ID);
										var appname = Documa.RuntimeManager.getApplicationContext().getValue(Documa.context.ApplicationContextAttributes.APP_NAME);
										var appversion = Documa.RuntimeManager.getApplicationContext().getValue(Documa.context.ApplicationContextAttributes.APP_VERSION);
										var instid = Documa.RuntimeManager.getApplicationContext().getValue(Documa.context.ApplicationContextAttributes.APP_INSTID);

										if (instanceACL == null) {
											// 3.1. Component instance has been not shared before, because there is no
											// existent ACL for this instance in the aclRegistry:
											// a) set a current user as an owner of this shared instance
											var owner = _accessControlManager.getUserId();
											newACL[owner] = "own";

											// b) register the new ACL by the Access Control Manager
											_accessControlManager.registerComponentACL(instance, newACL);
											_accessControlManager.userAccessRightControl(instance);

											// c) send the Shared Object command with the new ACL to the server
											componentToShare[componentid] = instance;
											propertiesNames = _componentManager.getInstancePropertiesNames(instance);

											sendShareObjectCommand({
												"id" : appid,
												"name" : appname,
												"version" : appversion,
												"instid" : instid,
												"component" : componentToShare,
												"channel" : channelOnInputData,
												"acl" : newACL,
												"propertiesNames" : propertiesNames
											});

											_workspaceAwarenessUtilty.notify("The component " + componentid + " has been shared with selected users.");

										} else {
											// 3.2. Component instance has been already shared -> check users with whom a
											// person (owner or user with "reshare" right) tries to shared this instance
											// again
											// a) if with a user, with whom the instance has been shared before, do not send
											// the Shared Object command
											// but propose the person to change user's right to this instance, since it has
											// been already shared with this user
											// b) if with a new user, then realize sharing
											for (invitedUser in newACL) {
												var invitedUserInInstanceACL = false;

												for (user in instanceACL) {
													if (invitedUser == user) {
														invitedUserInInstanceACL = true;
													}
												}

												if (invitedUserInInstanceACL) {
													_workspaceAwarenessUtilty.notify("The component " + componentid + " has been already shared with " + invitedUser + " with access right " + instanceACL[invitedUser] + ". You can change " + invitedUser + " right to this component!");
												} else {
													_accessControlManager.updateACL(instance, invitedUser, newACL[invitedUser]);
													componentToShare[componentid] = instance;
													propertiesNames = _componentManager.getInstancePropertiesNames(instance);
													transmittedACL[invitedUser] = newACL[invitedUser];

													sendShareObjectCommand({
														"id" : appid,
														"name" : appname,
														"version" : appversion,
														"instid" : instid,
														"component" : componentToShare,
														"channel" : channelOnInputData,
														"acl" : transmittedACL,
														"propertiesNames" : propertiesNames
													});
												}
											}
										}
									}
									_sharingWindow.close();
								} else {
									_workspaceAwarenessUtilty.notify("Sorry, the form is not valid!");
								}
							}

						}, {
							text : 'CHANGE RIGHT',
							handler : function() {

								// 1. Define selected components to which a person with correspondent access
								// right (own or reshare) wants to change users' access rights
								var checkedComponents = {};
								if (Ext.getCmp('compositionCheckbox').getValue()) {
									//get all components
									Ext.each(_initializedComponentsStore.getRange(), function(item) {
										checkedComponents[item.data.name] = item.data.id;
									});
								} else {
									//var components = Ext.getCmp('componentsCheckboxGroup').getValue();
									//get defined components
									/*Ext.each(components, function (item) {
									 checkedComponents[item.getName()] = item.getItemId();
									 });*/

									Ext.each(_initializedComponentsStore.getRange(), function(item) {
										var instance = item.data.id;
										if (Ext.getCmp(instance) != undefined) {
											if (Ext.getCmp(instance).getValue()) {
												checkedComponents[item.data.name] = instance;
											}
										}
									});
								}

								// 2. Create a new Access Control List -- new user-right relations
								var newACL = {};

								var firstNameField = Ext.getCmp('firstUserNameField');
								var firstRightField = Ext.getCmp('firstAccessRightsComboBox').getValue();
								var secondNameField = Ext.getCmp('secondUserNameField');
								var secondRightField = Ext.getCmp('secondAccessRightsComboBox').getValue();

								if (firstNameField.validate()) {
									newACL[firstNameField.getValue()] = firstRightField;
								}
								if (secondNameField.validate()) {
									newACL[secondNameField.getValue()] = secondRightField;
								}

								// 3. If at least one component has been selected and at least one invited user
								// with a new right has been defined,
								// before send the Update Right command define for each component among the
								// selected component whether it has been already shared or
								// not yet: in case when a component has been already shared (ACL exists), define
								// users whose access rights have been changed
								// and whether this component has been already shared with this specific user
								if ((checkedComponents.length != 0 && firstNameField.validate()) || (checkedComponents.length != 0 && secondNameField.validate())) {
									for (var componentid in checkedComponents) {
										var sendCommand = false;
										var transmittedACL = {};
										var instance = checkedComponents[componentid];
										var instanceACL = _accessControlManager.getACL(instance);

										if (instanceACL == null) {
											_workspaceAwarenessUtilty.notify("The component " + componentid + " has not been shared yet. You can shared it with defined users rights.");
										} else {
											for (invitedUser in newACL) {
												var userRight = instanceACL[invitedUser];
												if (userRight != undefined) {
													if (userRight != newACL[invitedUser] && userRight != "own") {
														_accessControlManager.updateACL(instance, invitedUser, newACL[invitedUser]);
														sendCommand = true;
														transmittedACL[invitedUser] = newACL[invitedUser];
													} else if (userRight != newACL[invitedUser] && userRight == "own") {
														_workspaceAwarenessUtilty.notify("The owner\'s access right can not be changed!");
													} else {
														_workspaceAwarenessUtilty.notify("The access right of " + invitedUser + " has not been changed!");
													}
												} else {
													_workspaceAwarenessUtilty.notify("The component " + componentid + " has not been shared yet with " + invitedUser + "! You can share it with defined access right.");
												}
											}
										}

										// 4. If at least right of one user has been changed to the specific component
										// instance, send the update right command
										if (sendCommand) {
											// get app instance data
											var appid = Documa.RuntimeManager.getApplicationContext().getValue(Documa.context.ApplicationContextAttributes.APP_ID);
											var appname = Documa.RuntimeManager.getApplicationContext().getValue(Documa.context.ApplicationContextAttributes.APP_NAME);
											var appversion = Documa.RuntimeManager.getApplicationContext().getValue(Documa.context.ApplicationContextAttributes.APP_VERSION);
											var instid = Documa.RuntimeManager.getApplicationContext().getValue(Documa.context.ApplicationContextAttributes.APP_INSTID);

											sendUpdateRightCommand({
												"id" : appid,
												"name" : appname,
												"version" : appversion,
												"instid" : instid,
												"instance" : instance,
												"acl" : transmittedACL
											});
										}
									}
									_sharingWindow.close();
								} else {
									_workspaceAwarenessUtilty.notify("Sorry, the form is not valid!");
								}
							}

						}, {
							text : 'CLOSE',
							handler : function() {
								_sharingWindow.close();
							}

						}]

					});

				} else {

					_sharingWindow = new Ext.Window({
						baseCls : "sharingWindow",
						title : 'Sharing Mode',
						id : 'sharing_window',
						headerCfg : {
							id : 'sharingWindow-header',
							tag : 'div',
							cls : 'sharingWindow-header'
						},
						modal : true,
						closable : true,
						autoScroll : true,
						resizable : false,
						draggable : false,

						items : new Ext.Panel({
							bodyCssClass : "sharingWindow-body",
							margins : {
								left : 20
							},
							items : [{
								title : 'You have no components to share!',
								headerCfg : {
									id : 'section-header1',
									tag : 'div',
									cls : 'section-header'
								}
							}],
						})
					});
				}

			},

			//Is called to show the sharing window
			showSharingScreen : function() {
				_sharingWindow.show();
			}

		};
	}())); 