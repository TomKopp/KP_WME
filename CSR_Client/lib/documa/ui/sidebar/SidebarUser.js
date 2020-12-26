/**
 * @class Documa.ui.sidebar.SidebarUser
 * This class adds the user list to the sidebar.
 *
 * @author Sergej Hahn
 */
Ext.namespace('Documa.ui.sidebar');

Documa.ui.sidebar.SidebarUser = Ext.extend(Object, (function () {
	/* private members */
	var TAG = 'Documa.ui.sidebar.SidebarUser';

	var _userListTemplate = null;
	var _userListView = null;
	var _userListStore = null;
	var _awarenessController = null;

	return {
		constructor: function () {

			/**
			 * User List Template to show collaboration partners from store
			 */
			_userListTemplate = new Ext.XTemplate(
				'<tpl for=".">',
				'<div id="{userid}" class="userlist-item userlist-app-{sharing}">',
				'<div class="user-color" style="background-color:{awarenesscolor}"></div>',
				'<div class="user-avatar" style="background-image: url({icon})"></div>',
				'<div class="user-items">',
				'<div class="user-label"><div class="user-status online-{status}"></div>{username}</div>',
				'<div class="user-item user-message"><div class="user-message-icon"></div><a href="javascript:Documa.RuntimeManager.getUIManager().getMessagePanelController().showMessagePanelByUser(\'{userid}\');">Message</a></div>',
				'<div class="user-item user-share"><div class="user-share-icon"></div><a href="javascript:Documa.RuntimeManager.getUIManager().getSharePanelController().showShareTripleView();">Share</a></div>',
				'</div>',
				'</div>',
				'</tpl>'
			);

			// data structure
			var rt = Ext.data.Record.create([{
				name: 'userid',
				type: 'string'
			}, {
				name: 'username',
				type: 'string'
			}, {
				name: 'icon',
				type: 'string'
			}, {
				name: 'status',
				type: 'string'
			}, {
				name: 'awarenesscolor',
				type: 'string'
			}, {
				name: 'sharing',
				type: 'string'
			}]);

			/**
			 * User List Store contains all users
			 */
			_userListStore = new Ext.data.Store({
				id: 'userlist-store',
				fields: ['userid', 'username', 'icon', 'status', 'awarenesscolor', 'sharing'],
				reader: new Ext.data.ArrayReader(
					{
						idIndex: 0  // id for each record will be the first element
					},
					rt
				)
			});

			/**
			 * User List View shows users from store using the template
			 */
			_userListView = new Ext.DataView({
				autoHeight: true,
				id: 'userlist-view',
				cls: 'userlist-view',
				tpl: _userListTemplate,
				store: _userListStore
			});
		},

		getUserListView: function () {
			return _userListView;
		}
	}
})());
