Ext.namespace('Documa.ui.awareness');
Documa.require("Documa.ui.awareness.BuddyListEntry");

Documa.ui.awareness.BuddyList = Ext.extend(Object, ( function(){
	var TAG = 'Documa.ui.awareness.BuddyList';
	var _log = Documa.util.Logger;

	var _buddyPanel = null;
	var _buddyWindow = null;

	var getBuddyListViewStore = function(){
		if (_buddyWindow != undefined || _buddyWindow != null)
			return Ext.getCmp("buddyListView").getStore();
		return null;
	};

	return {
		constructor: function(){
			var tpl = new Ext.XTemplate(
				'<tpl for=".">',
				'<div class="thumb-wrap buddyContainer">',
				'<div class="buddyicon" style="border-color:{awarenesscolor}"></div>',
				'<p class="buddylabel">{username}</p>',
				'</div>',
				'</tpl>',
				'<div class="x-clear"></div>');

			//create new panel containing a list view
			_buddyPanel = new Ext.Panel({
				title: "Collaboration Partners",
				headerCfg: {
					id: 'buddylist-header',
					tag: 'div',
					cls: 'buddylist-header'
				},
				border: false,
				id: "buddyPanel",
				bodyCssClass: "buddylist-body",
				items: [new Ext.DataView({
					id: 'buddyListView',
					cls: 'buddyListView',
					tpl: tpl,
					store: new Ext.data.Store({
						id: 'dataStore',
						fields: [
							'userid',
							'username',
							'icon',
							'status',
							'awarenesscolor'
						],
						listeners: {
							'load': {
								fn: function(store, record, operation){
									//var df = Ext.getCmp('nameIdDisplayField');
									//df.setValue((store.getCount()==0? '0' : store.getCount()) + ' Components');
									Ext.getCmp('buddyPanel').doLayout();
									Ext.getCmp('buddyListView').refresh();
								}
							}
						}
					})
				})]
			});

			_buddyWindow = new Ext.Window({
				baseCls: "buddyListWindow",
				id: "buddyWindow",
				collapsible: false,
				closable: false,
				resizable: false,
				autoShow: false,
				shadow: false,
				items: [_buddyPanel],
				listeners: {
					'afterrender': {
						scope: this,
						fn: function(p){
							//positioning the rec menu on the right border of the canvas
							p.setPosition(Documa.RuntimeManager.getUIManager().getCanvasWidth() - 152, 80);
						}

					}
				}
			});
			_buddyWindow.hide();
		},

		/**
		 * Show buddy list on canvas
		 */
		show: function(){
			if (_buddyWindow != undefined || _buddyWindow != null)
				_buddyWindow.show();
		},

		/**
		 * @deprecated
		 * Updates the entries of the buddy list.
		 *
		 * @param newBuddies JSON array containing the new content for the buddy list
		 * @param am reference to awareness manager
		 */
		update: function(newBuddies, am){
			// get store of the buddy list's listview
			var store = getBuddyListViewStore();
			if (store == null) {
				_log.error("BUDDYLIST... no store was found while trying to update the buddy list!");
				return;
			}
			//clear store
			store.removeAll();
			//add all new users
			for (var idx = 0; idx < newBuddies.length; idx++){
				var nb = newBuddies[idx];
				//check whether user already has a colormapping
				var color = am.getUserColorMapping(nb.userid);
				if (color == null) {
					//generate new color
					color = createRandomColorCode();
					//add color to colormapping
					am.addUserColorMapping(nb.userid, color);
				}
				var r = new Documa.ui.awareness.BuddyListEntry({
					userid: nb.userid,
					username: nb.username,
					icon: nb.icon,
					status: nb.status,
					awarenesscolor: color
				});
				store.add(r);
			}
			//update window
			_buddyWindow.doLayout();
			_buddyWindow.hide();
		},

		/**
		 * Returns store to modify the list of presented users.
		 *
		 * @return {Ext.data.Store}
		 */
		getStore: function(){
			return getBuddyListViewStore();
		}

	};
}()));