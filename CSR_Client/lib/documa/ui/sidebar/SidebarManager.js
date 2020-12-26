Ext.namespace('Documa.ui.sidebar');
Documa.require('Documa.ui.sidebar.SidebarView');
Documa.require('Documa.ui.sidebar.SidebarRec');

/**
 * @class Documa.sidebar.SidebarManager
 * This class creates and controls the sidebar contents
 *
 * @author Konrad Michalik, Sergej Hahn, Christopher Lienemann
 */
Documa.ui.sidebar.SidebarManager = Ext.extend(Object, ( function () {
	var TAG = 'Documa.ui.sidebar.SidebarManager';
	var _log = Documa.util.Logger;

	var _sidebarWindow = null;
	var _sidebarRec = null;

	return {
		constructor: function () {
			_sidebarWindow = new Documa.ui.sidebar.SidebarView(this);
			_sidebarRec = new Documa.ui.sidebar.SidebarRec(this);
		},

		/**
		 * check if sidebar is visible
		 */
		isVisible: function () {
			return _sidebarWindow.isVisible();
		},

		/**
		 * Method that shows the Ext.Panel with the id buddyPanel
		 */
		show: function () {
			_sidebarWindow.show();
		},

		/**
		 * Method that hides the Ext.Panel with the id buddyPanel
		 */
		hide: function () {
			_sidebarWindow.close();
		},

		/**
		 * show sidebar icons
		 */
		showIcons: function () {
			_sidebarWindow.showIcons();
			// Documa.RuntimeManager.getAwarenessManager().updateMessageNotification();
			// Documa.RuntimeManager.getAwarenessManager().updateConversations();
		},

		/**
		 * toggle sidebar
		 */
		toggle: function () {
			if (_sidebarWindow.isVisible() == true) {
				this.hide();
			} else {
				this.show();
			}
		},

		/**
		 * returns recommendation menu
		 */
		getSidebarRec: function () {
			return _sidebarRec;
		},

		/**
		 * method to switch the tab of the side bar
		 */
		openTab: function (tabIndex) {
			_sidebarWindow.openTab(tabIndex);
		},

		/**
		 * returns user list
		 */
		getUserList: function () {
			return _sidebarWindow.getUserList();
		},

		/**
		 * returns sidebar window
		 */
		getSidebarWindow: function () {
			return _sidebarWindow;
		}
	};
}()));
