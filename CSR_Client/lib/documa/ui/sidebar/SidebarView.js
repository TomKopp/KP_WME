Ext.namespace('Documa.ui.sidebar');

Documa.require('Documa.util.Logger');
Documa.require('Documa.ui.sidebar.SidebarManager');
Documa.require('Documa.ui.sidebar.SidebarUser');
Documa.require('Documa.ui.sidebar.SidebarMessage');

/**
 * @class Documa.sidebar.SidebarView
 * This class is responsible for creating the rudimentary sidebar and sidebar icons
 *
 * @author Konrad Michalik, Sergej Hahn, Christopher Lienemann
 */
Documa.ui.sidebar.SidebarView = Ext.extend(Object, (function () {
	/* private members */
	var TAG = 'Documa.ui.sidebar.SidebarView';
	var _log = Documa.util.Logger;

	var _visible = false;
	var _userList = null;
	var _messageList = null;
	var _sidebarIcons = null;
	var _sidebarPanel = null;
	var _sidebarPanelController = null;
	var _tabPanel = null;

	return {
		constructor: function (controller) {
			_sidebarPanelController = controller;
			_userList = new Documa.ui.sidebar.SidebarUser();
			_messageList = new Documa.ui.sidebar.SidebarMessage();

			// create sidebar icons: Recommendations, Messages, Buddies
			_sidebarIcons = new Ext.Window({
				id: 'sidebar-icons',
				baseCls: "sidebar",
				header: true,
				collapsible: false,
				hidden: true,
				closable: false,
				resizable: false,
				draggable: true,
				shadow: false,
				width: 50,
				height: 135,
				items: [
					{
						xtype: 'button',
						id: 'sb_recBtn',
						height: 30,
						tooltip: 'Recommendations',
						handler: function (button) {
							var tabPanel = Ext.getCmp('sidebar-tabs');
							var activeTab = tabPanel.items.indexOf(tabPanel.getActiveTab());
							_sidebarPanel.setTitle('Recommendations');
							tabPanel.setActiveTab(0);
							if (activeTab == 0 || _visible == false) {
								_sidebarPanelController.toggle();
							}
							if (_visible == false) {
								$('#sb_recBtn button').css('background-color', '');
							} else {
								$('#sb_recBtn button').css('background-color', 'white');
								$('#sb_buddiesBtn button').css('background-color', '');
								$('#sb_messageBtn button').css('background-color', '');
							}
						},

					}, {
						xtype: 'button',
						id: 'sb_messageBtn',
						height: 30,
						tooltip: 'Messages',
						handler: function (button) {
							var tabPanel = Ext.getCmp('sidebar-tabs');
							var activeTab = tabPanel.items.indexOf(tabPanel.getActiveTab());
							_sidebarPanel.setTitle('Messages');
							tabPanel.setActiveTab(1);
							if (activeTab == 1 || _visible == false) {
								_sidebarPanelController.toggle();
							}
							if (_visible == false) {
								$('#sb_messageBtn button').css('background-color', '');
							} else {
								$('#sb_messageBtn button').css('background-color', 'white');
								$('#sb_recBtn button').css('background-color', '');
								$('#sb_buddiesBtn button').css('background-color', '');
								// reload user and message data on open
								_messageList.loadData();
								_messageList.setUserList(_userList.getUserListView().store.data.items);
							}
						},
					}, {
						xtype: 'button',
						id: 'sb_buddiesBtn',
						height: 30,
						tooltip: 'Buddies',
						handler: function (button) {
							var tabPanel = Ext.getCmp('sidebar-tabs');
							var activeTab = tabPanel.items.indexOf(tabPanel.getActiveTab());
							_sidebarPanel.setTitle('Userlist');
							tabPanel.setActiveTab(2);
							if (activeTab == 2 || _visible == false) {
								_sidebarPanelController.toggle();
							}
							if (_visible == false) {
								$('#sb_buddiesBtn button').css('background-color', '');
							} else {
								$('#sb_buddiesBtn button').css('background-color', 'white');
								$('#sb_messageBtn button').css('background-color', '');
								$('#sb_recBtn button').css('background-color', '');
							}
						}
					}
				],
				listeners: {
					'move': function (window, x, y) {
						// collision detection with canvas borders
						if (y < 50 || y > Documa.RuntimeManager.getUIManager().getCanvasHeight() - 135) {
							window.setPosition(0, 50);
						}
					}
				}
			});

			// create sidebar tabs: Recommendations, Messages, Buddies
			_tabPanel = new Ext.TabPanel({
				id: "sidebar-tabs",
				activeTab: 0,
				items: [{
					id: 'tabRec',
					layout: 'accordion',
					layoutConfig: {
						animate: true,
					},
					title: 'Recommendations',
					listeners: {
						'beforeshow': {
							scope: this,
							fn: function (window) {
								window.setHeight(Documa.RuntimeManager.getUIManager().getCanvasHeight() - 81);
							}
						}
					}
				}, {
					title: 'Messages',
					autoHeight: true,
					items: [_messageList.getContainer(), _messageList.getMessageListView()]
				}, {
					title: 'Userlist',
					items: [_userList.getUserListView()]
				}],
			});

			// create sidebar window
			_sidebarPanel = new Ext.Window({
				id: 'sidebar-window',
				title: 'Sidebar',
				autoScroll: true,
				baseCls: "sidebar", //baseClass
				collapsible: false,
				hidden: true,
				closable: false,
				resizable: false,
				draggable: false,
				shadow: false,
				width: 250,
				minHeight: 150,
				height: 500,
				items: [_tabPanel],
				tools: [{
					id: 'sidebar-close-button',
					type: 'refresh',
					tooltip: 'Refresh form Data',
					handler: function (event, toolEl, panel) {
						_sidebarPanel.hide();
						_visible = false;
						$("#sidebar-icons").animate({
							'marginRight': "-=250px"
						});
						$('#sb_buddiesBtn button').css('background-color', '');
						$('#sb_messageBtn button').css('background-color', '');
						$('#sb_recBtn button').css('background-color', '');
					}
				}],
				listeners: {
					'beforeshow': {
						scope: this,
						fn: function (window) {
							//positioning the window on the right border of the canvas
							window.setPosition($('#MainMenuToolBar').height(), 50);
							//sets the height of the window to 100% of the canvas
							window.setHeight(Documa.RuntimeManager.getUIManager().getCanvasHeight() - 50);
						}
					}
				}
			});
		},

		/**
		 * show sidebar icons
		 */
		showIcons: function () {
			_sidebarIcons.show();
		},

		/**
		 * show sidebar
		 */
		show: function () {
			if (!_sidebarPanel.isVisible()) {
				_sidebarPanel.show();
				_visible = true;
				$("#sidebar-icons").animate({
					'marginRight': "+=250px"
				});
			}
		},

		/**
		 * close sidebar
		 */
		close: function () {
			_sidebarPanel.hide();
			_visible = false;
			$("#sidebar-icons").animate({
				'marginRight': "-=250px"
			});
		},

		/**
		 * check if sidebar is visible
		 */
		isVisible: function () {
			return _visible;
		},

		/**
		 * add notification icon
		 * @param {String} recommendation type = {recommendation, message}
		 * @param {String} number for notification
		 */
		addNotification: function (type, number) {
			// remove old notification
			this.removeNotification(type);
			var icons = document.getElementById('sidebar-icons');
			var circle = document.createElement('div');
			circle.className = 'notification';
			circle.innerHTML = number;
			if (type == 'recommendation') {
				circle.id = 'recNotification';
				circle.style.top = '47px';
				circle.style.left = '2px';
			}
			else if (type == 'message') {
				circle.id = 'messageNotification';
				circle.style.top = '83px';
				circle.style.left = '2px';
			}
			else {
				console.error('Undefined notification type!');
			}
			icons.appendChild(circle);
		},

		/**
		 * remove notification icon
		 * @param {String} recommendation type = {recommendation, message}
		 */
		removeNotification: function (type) {
			if (type == 'recommendation') {
				$('#recNotification').remove();
			}
			else if (type == 'message') {
				$('#messageNotification').remove();
			}
			else {
				console.error('Undefined notification type!');
			}
		},

		/**
		 * returns user list
		 */
		getUserList: function () {
			return _userList;
		},

		/**
		 * opens a specifiv tab
		 *  @param {Integer} the tab index to open
		 */
		openTab: function (tabIndex) {
			this.show();
			_tabPanel.setActiveTab(tabIndex);
		}

	};
})());
