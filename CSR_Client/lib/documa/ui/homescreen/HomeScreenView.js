Ext.namespace('Documa.ui.homescreen');

Documa.require('Documa.util.Logger');
Documa.require('Documa.ui.homescreen.HomeScreenController');

Documa.ui.homescreen.HomeScreenView = Ext.extend(Object, (function () {

	var TAG = "Documa.ui.homescreen.HomeScreenView";
	var _log = Documa.util.Logger;

	// constants
	var VIEWPORT_PANEL_ID = "csr-hs-viewport";
	var APP_PANEL_ID = "csr-app-panel";
	var USER_PANEL_ID = "csr-user-panel";
	var CENTER_PANEL_ID = "csr-center-panel";
	var DIST_CONTAINER_ID = "csr-dist-container";

	// internal vars
	var _availableappStore = null;
	var _joinableappStore = null;
	var _userStore = null;
	var _homescreenPanel = null;

	/**
	 * Helper method to create the listview for presenting all participating users.
	 *
	 * @param {Documa.ui.homescreen.HomeScreenController} controller controlling object
	 */
	function createUserPanel(controller) {
		_userStore = new Ext.data.JsonStore({
			autoDestroy: true,
			idProperty: 'sid',
			fields: [
				{
					name: 'userid',
					type: 'string'
				},
				{
					name: 'username',
					type: 'string'
				},
				{
					name: 'sid',
					type: 'string'
				},
				{
					name: 'initr',
					type: 'boolean'
				}
			]
		});

		return new Ext.Panel({
			id: USER_PANEL_ID,
			region: 'east',
			useSplitTips: true,
			title: 'Participating User',
			layout: 'fit',
			collapsible: true,
			split: true,
			width: 300,
			items: {
				xtype: 'listview',
				store: _userStore,
				columns: [
					{
						header: 'Id',
						width: 0.10,
						dataIndex: 'userid'
					},
					{
						header: 'Name',
						width: 0.35,
						dataIndex: 'username'
					},
					{
						header: 'Session id',
						width: 0.55,
						dataIndex: 'sid'
					}
				]
			}
		});
	};

	/**
	 * Helper method for creating the center panel of the homescreen.
	 *
	 * @param {Documa.ui.homescreen.HomeScreenController} controller controlling object
	 */
	function createCenterPanel(controller) {
		return new Ext.Panel({
			id: CENTER_PANEL_ID,
			autoScroll: 'false',
			region: 'center',
			activeItem: 0,
			layout: {
				type: 'card',
				deferredRender: true,
				layoutOnCardChange: true
			},
			/*
			 defaults: {
			 autoScroll : 'false'
			 }*/
		});
	};

	/**
	 * Helper method for creating the startview panel of the homescreen. It presents
	 * available and inactive applications.
	 *
	 * @param {Documa.ui.homescreen.HomeScreenController} controller controlling object
	 * @param {Ext.Panel} panel container of child panel created during the execution
	 * of this function
	 */
	function createStartView(controller) {
		// define data structure for available application overview
		_availableappStore = new Ext.data.JsonStore({
			autoDestroy: true,
			storeId: 'availableApplicationsStore',
			root: 'payload.userapps',
			idProperty: 'id',
			fields: [
				{
					name: 'id',
					type: 'string'
				},
				{
					name: 'name',
					type: 'string'
				},
				{
					name: 'version',
					type: 'string'
				}
			]
		});

		// define data structure for joinable application overview
		_joinableappStore = new Ext.data.JsonStore({
			autoDestroy: true,
			storeId: 'joinableApplicationsStore',
			root: 'payload.activeapps',
			idProperty: 'itemid',
			fields: [
				{
					name: 'itemid',
					type: 'string',
					convert: function (v, record) {
						record.itemid = record.id + '-' + record.instid;
						return record.itemid;
					}

				},
				{
					name: 'id',
					type: 'string'
				},
				{
					name: 'name',
					type: 'string'
				},
				{
					name: 'version',
					type: 'string'
				},
				{
					name: 'initr',
					type: 'string'
				},
				{
					name: 'instid',
					type: 'string'
				}
			]
		});

		// define list view to show existing applications
		var availableAppView = new Ext.list.ListView({
			store: _availableappStore,
			singleSelect: true,
			flex: 1,
			title: 'Apps',
			columns: [
				{
					header: 'Id',
					width: 0.33,
					dataIndex: 'id'
				},
				{
					header: 'Name',
					width: 0.33,
					dataIndex: 'name'
				},
				{
					header: 'Version',
					width: 0.33,
					align: 'right',
					dataIndex: 'version'
				}
			]
		});

		// define list view to show joinable applications
		var joinableAppView = new Ext.list.ListView({
			store: _joinableappStore,
			flex: 1,
			title: 'Apps',
			singleSelect: true,
			columns: [
				{
					header: 'Id',
					width: 0.10,
					dataIndex: 'id'
				},
				{
					header: 'Name',
					width: 0.30,
					dataIndex: 'name'
				},
				{
					header: 'Version',
					width: 0.10,
					dataIndex: 'version'
				},
				{
					header: 'Initiator',
					width: 0.25,
					dataIndex: 'initr'
				},
				{
					header: 'Instance ID',
					width: 0.25,
					dataIndex: 'instid'
				}
			]
		});

		// put it in a Panel so it looks pretty
		var panel1 = new Ext.Panel({
			flex: 1,
			collapsible: false,
			layout: {
				type: 'vbox',
				align: 'stretch',
				padding: '5'
			},
			title: 'Available Applications',
			items: [availableAppView, {
				xtype: 'button',
				text: 'load',
				margins: {
					top: 5,
					right: 5,
					bottom: 5,
					left: 5
				},
				listeners: {
					'click': {
						fn: function () {
							// get selected composition record
							var selectionArray = availableAppView.getSelectedRecords();
							if (selectionArray.length != 0)
								controller.loadComposition({
									id: selectionArray[0].data.id,
									version: selectionArray[0].data.version,
									name: selectionArray[0].data.name
								});
						}

					}
				}
			}]
		});

		// put it in a Panel so it looks pretty
		var panel2 = new Ext.Panel({
			flex: 1,
			collapsible: false,
			layout: {
				type: 'vbox',
				align: 'stretch'
			},
			title: 'Joinable Applications',
			items: [joinableAppView, {
				xtype: 'button',
				text: 'join',
				margins: {
					top: 5,
					right: 5,
					bottom: 5,
					left: 5
				},
				listeners: {
					'click': {
						fn: function () {
							// get selected composition record
							var selectionArray = joinableAppView.getSelectedRecords();
							if (selectionArray.length != 0) {
								controller.joinApp({
									id: selectionArray[0].data.id,
									version: selectionArray[0].data.version,
									name: selectionArray[0].data.name,
									instid: selectionArray[0].data.instid
								});
							}
						}

					}
				}
			}]
		});

		return new Ext.Panel({
			id: APP_PANEL_ID,
			title: 'Applications',
			layout: {
				type: 'vbox',
				align: 'stretch'
			},
			items: [panel1, panel2]
		});
	};

	return {
		constructor: function (controller, uiManager) {
			// get homescreen controller
			this._homeScreenController = controller;
			this._uiManager = uiManager;
			_homescreenPanel = createStartView.call(this, controller);
		},

		show: function () {
			_homescreenPanel.show();
		},

		hide: function () {
			_homescreenPanel.hide();
		},

		/**
		 * Returns panel of application lists.
		 *
		 * @return {Ext.Panel}
		 */
		getHomeScreenPanel: function () {
			return _homescreenPanel;
		},

		/**
		 * Loads list of application descriptors in to array of available applications.
		 *
		 * @param {Array} apps list of application descriptors
		 */
		loadApps: function (apps) {
			_log.debug(TAG, "... loading applications received from server.");
			_availableappStore.loadData(apps, true);
			_joinableappStore.loadData(apps, true);
			_homescreenPanel.doLayout();
			this.show();
		},

		/**
		 * Loads given application descriptor into list of available applications.
		 *
		 * @param {Object} app application descriptor object
		 */
		loadApp: function (app) {
			_joinableappStore.loadData({
				payload: {
					activeapps: [app]
				}
			}, true);
		},

		unloadApps: function () {
			throw new Error("Not implemented yet!");
		},

		/**
		 * Returns true if specified child is already part of the homescreen view, else
		 * false.
		 * @param {Ext.Component} comp component object
		 *
		 * @return {Boolean}
		 */
		contains: function (comp) {
			// TODO: rework
			if (_viewport.find('id', comp.getId())[0]) {
				return true;
			} else {
				return false;
			}
		},

		/**
		 * Returns child component by its given id.
		 * @param {String} id child component id
		 */
		getComponent: function (id) {
			// TODO: rework
			return _viewport.find('id', id)[0];
		}

	};
})());
