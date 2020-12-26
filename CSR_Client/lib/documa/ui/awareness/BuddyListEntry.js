/**
 * A global structure for an entry of the recommendation menu represented by an
 * Ext.data.Record
 */
Documa.ui.awareness.BuddyListEntry = Ext.data.Record.create([{
	name : 'userid',
	type : 'string'
}, {
	name : 'username',
	type : 'string'
}, {
	name : 'icon',
	type : 'string'
}, {
	name : 'status',
	type : 'string'
}, {
	name : 'awarenesscolor',
	type : 'string'
}]); 