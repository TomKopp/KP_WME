Ext.namespace('Documa.collaboration');

Documa.collaboration.AccessControlManager = Ext.extend(Object, ( function() {
		var TAG = 'Documa.collaboration.AccessControlManager';
		var _log = Documa.util.Logger;

		/**
		 * This registry is filled during the reception of the INTEGRATECMP command. It
		 * defines the shared component's Access Control List (ACL). Each entry of this
		 * registry describes an application component by its instance id and ACL.
		 */
		var _aclRegistry = null;

		var _userId = null;

		return {
			constructor : function() {
				_log.debug(TAG, '... constructing');
				_aclRegistry = {};
			},

			/**
			 * Setting user id (user email passed during logging in to the system)
			 *
			 * @param {String}
			 *            user id
			 */
			setUserId : function(userMail) {
				_userId = userMail;
			},

			/**
			 * Returns id of the current user
			 *
			 */
			getUserId : function() {
				return _userId;
			},

			/**
			 * Returns an access right of the defined user
			 *
			 */
			getUserRight : function(instance, user) {
				var userRight = null;
				for (var instanceid in _aclRegistry) {
					if (instanceid == instance) {
						for (var userid in _aclRegistry[instanceid]) {
							if (userid == user) {
								userRight = _aclRegistry[instanceid][userid];
							}
						}
					}
				}
				return userRight;
			},

			/**
			 * Returns ACL of the defined component instance
			 *
			 */
			getACL : function(instance) {
				var acl = null;
				for (var instanceid in _aclRegistry) {
					if (instanceid == instance) {
						acl = _aclRegistry[instanceid];
					}
				}
				return acl;
			},

			/**
			 * Registration of component's ACL
			 * 1) when receiving an integrate component command in case of loading an
			 * application
			 * 2) after pressing button "share" in case of sharing by the owner
			 *
			 * @param {String}
			 *            component's instance id
			 * @param {Object}
			 *            acl defines users and their rights to a specific component
			 */
			registerComponentACL : function(instanceid, acl) {
				if (_aclRegistry[instanceid]) {
					// TODO
					throw new Error("Not implemented yet!");
				} else {
					var componentACL = {};
					for (user in acl) {
						var userRight = acl[user];
						componentACL[user] = userRight;
					}
					_aclRegistry[instanceid] = componentACL;
				}
			},

			/**
			 * Checking user's access rights to the shared components and display them
			 * 1) after all new shared components have been successfully initialized in case
			 * of loading an application by the invited user or dynamic sharing
			 * 2) after pressing button "share" in case of sharing by the owner
			 *
			 * @param {String}
			 *            initialized component's instance
			 */

			userAccessRightControl : function(initializedInstance) {
				try {
					for (var instanceid in _aclRegistry) {
						if (instanceid == initializedInstance) {
							var acl = _aclRegistry[instanceid];
							var userRight = acl[_userId];
							_log.debug(TAG, '... Access right of user {' + _userId + '} to component {' + instanceid + '} is {' + userRight + '}.');

							// If user has right only to view a component, add transparent div on top of the
							// integrated component
							if (userRight == "consume") {
								Documa.RuntimeManager.getUIManager().addTransparentDiv(instanceid);
							}

							// Display user's right to a specific component
							Documa.RuntimeManager.getUIManager().displayUserRight(instanceid, userRight);
						}
					}
				} catch(error) {
					_log.trace(TAG, error);
				}
			},

			updateUserRight : function(instance, newRight) {
				try {
					for (var instanceid in _aclRegistry) {
						if (instanceid == instance) {
							var userRight = _aclRegistry[instanceid][_userId];
							if (userRight == "consume") {
								Documa.RuntimeManager.getUIManager().removeTransparentDiv(instanceid);
							}
							if (newRight == "consume") {
								Documa.RuntimeManager.getUIManager().addTransparentDiv(instanceid);
							}

							//Update user's right in the component's acl and display it
							_aclRegistry[instanceid][_userId] = newRight;
							Documa.RuntimeManager.getUIManager().displayUserRight(instanceid, newRight);
							_log.debug(TAG, '... Access right of user {' + _userId + '} to component {' + instanceid + '} has been changed to {' + _aclRegistry[instanceid][_userId] + '}.');
						}
					}
				} catch(error) {
					_log.trace(TAG, error);
				}
			},

			/**
			 * Updating components' ACLs when an owner changes users' rights to components
			 *
			 * @param {String} component's instance to which an access right has been changed
			 * @param {String} user whose access right has been changed
			 * @param {String} new access right
			 */
			updateACL : function(instance, user, newRight) {
				try {
					var usersInRegistry = [];
					var workspaceAwarenessUtilty = Documa.RuntimeManager.getAwarenessManager().getAwarenessUtility();
					var container = Documa.RuntimeManager.getComponentManager().getContainerElementById(instance);
					var componentid = container.getComponentID();

					for (var instanceid in _aclRegistry) {
						if (instanceid == instance) {
							for (userid in _aclRegistry[instanceid]) {
								usersInRegistry.push(userid);
							}
							if (usersInRegistry.indexOf(user) == "-1") {
								workspaceAwarenessUtilty.notify("The component " + componentid + " has been shared with " + user + " with access right: " + newRight);
							} else {
								workspaceAwarenessUtilty.notify("The access right of " + user + " to the component " + componentid + " has been changed to " + newRight);
							}
							_aclRegistry[instanceid][user] = newRight;
						}
					}
				} catch(error) {
					_log.trace(TAG, error);
				}
			},

		};
	}()));

