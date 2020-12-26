/**
 * @class Documa.ui.sidebar.SidebarMessage
 * This class adds the last messages from each conversation to the sidebar.
 *
 * @author Sergej Hahn
 */
Ext.namespace('Documa.ui.sidebar');

Documa.ui.sidebar.SidebarMessage = Ext.extend(Object, (function () {
	/* private members */
	var TAG = 'Documa.ui.sidebar.SidebarMessage';

	var _messageListTemplate = null;
	var _messageListView = null;
	var _messageListStore = null;
	var _messageComboBox = null;
	var _messageContainer = null;

	var _userArray = null;

	return {
		constructor: function () {

			/**
			 * Message List Template to display the latest messages
			 */
			_messageListTemplate = new Ext.XTemplate(
				'<tpl for=".">',
				'<div class="message-item">',
				'<tpl if="this.checkSender(sender) == false">',
				'<div class="message-not-own">',
				'<div class="message-status read-{read}"></div>',
				'<div class="message-sender">from {[this.getUserName(values.sender)]},</div>',
				'<div class="message-time">{[this.timestampToString(values.timestamp)]}</div>',
				'</div>',
				'</tpl>',
				'<tpl if="this.checkSender(sender) == true">',
				'<div class="message-own">',
				'<div class="message-sender">to {[this.getUserName(values.receiver)]},</div>',
				'<div class="message-time">{[this.timestampToString(values.timestamp)]}</div>',
				'<div class="message-status read-{read}"></div>',
				'</div>',
				'</tpl>',
				'<div class="message-content">{[this.cutContent(values.content)]}</div>',
				'<tpl if="this.checkSender(sender) == false">',
				'<div class="message-open"> <a href="{[this.openMessagePanel(values.sender)]}">Answer</a></div>',
				'</tpl>',
				'<tpl if="this.checkSender(sender) == true">',
				'<div class="message-open"> <a href="{[this.openMessagePanel(values.receiver)]}">Open</a></div>',
				'</tpl>',
				'</div>',
				'</tpl>',
				{

					getUserName: function (id) {
						return Documa.RuntimeManager.getAwarenessManager().getUsernameByID(id);
					},

					checkSender: function (id) {
						if (id == Documa.RuntimeManager.getAuthenticationManager().getCurrentUserContext().getUserId()) {
							return true;
						}
						return false;
					},

					timestampToString: function (timestamp) {
						var date = new Date(timestamp);
						return date.toLocaleString();
					},

					openMessagePanel: function (id) {
						return 'javascript:Documa.RuntimeManager.getUIManager().getMessagePanelController().showMessagePanelByUser(\'' + id + '\');';
					},

					cutContent: function (string) {
						if (string.length > 100) {
							var str = string.substring(0, 100) + ' [...] ';
							return str;
						}
						return string;
					}
				}
			);

			var _comboBoxLabel = new Ext.form.Label({
				text: 'Send new message to: '
			});

			_userArray = [['user_id', 'name']];

			/**
			 * A Combo Box used to select a conversation partner
			 */
			_messageComboBox = new Ext.form.ComboBox({
				id: 'messagelist-combobox',
				store: _userArray,
				lastQuery: '',
				displayField: 'username',
				valueField: 'id',
				mode: 'remote',
				typeAhead: true,
				triggerAction: 'all',
				emptyText: '...',
				selectOnFocus: true,
				width: 110,
				listeners: {
					scope: this,
					'select': function (_this, item, i) {
						var user_id = item['json'][0];
						_this.reset();
						_this.collapse();
						//Documa.RuntimeManager.getUIManager().getMessagePanelController().showMessagePanelByUser(user_id);
					}
				}
			});

			/*
			 * Container dispayed on top of the messages
			 */
			_messageContainer = new Ext.Container({
				id: 'message-action-container',
				autoEl: 'div',
				layout: 'column',
				height: 35,
				items: [_comboBoxLabel, _messageComboBox]
			});

			/**
			 * Message List View shows last messages from store using the template
			 */
			_messageListView = new Ext.DataView({
				autoHeight: true,
				id: 'messagelist-view',
				cls: 'messagelist-view',
				tpl: _messageListTemplate,
				store: _messageListStore
			});

		},

		getMessageListView: function () {
			return _messageListView;
		},

		getContainer: function () {
			return _messageContainer;
		},

		getComboBox: function () {
			return _messageComboBox;
		},

		/*
		 * Method used to update the combo box
		 */
		setUserList: function (newUserList) {
			var data = new Array();
			newUserList.forEach(function (item) {
				data.push([item['json'][0], item['json'][1]]);
			});
			data.sort(function (a, b) {
				if (a[1] > b[1]) {
					return 1;
				}
				return -1;
			});
			_messageComboBox.store.loadData(data, false);
		},

		/*
		 * This function should be called to update the last messages
		 */
		loadData: function () {
			//_messageListView.setStore(Documa.RuntimeManager.getAwarenessManager().updateConversations());
		}
	}
})());
