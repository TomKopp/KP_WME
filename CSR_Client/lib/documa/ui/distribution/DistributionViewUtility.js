Ext.namespace("Documa.ui.distribution");

/**
 * Class containing several utility functions for creating device descriptor
 * entries on ui layer.
 * @singleton
 */
Documa.ui.distribution.DistributionViewUtility = (function() {

	/**
	 * Add here private static functions.
	 */

	return {
		createDeviceEntryStore : function() {
			return new Ext.data.JsonStore({
				autoDestroy : true,
				idProperty : 'sid',
				fields : [{
					name : 'sid', // session id
					type : 'string'
				}, {
					name : 'devmod', // device model
					type : 'string'
				}, {
					name : 'devname', // device name
					type : 'string'
				}, {
					name : 'csrversion', // version of csr client
					type : 'string'
				}, {
					name : 'csrname', // name of csr client
					type : 'string'
				}, {
					name : 'userid', // user id
					type : 'string'
				}, {
					name : 'devpic', // url of device picture
					type : 'string'
				}, {
					name : 'distid', // id of corresponding distribution object
					type : 'string'
				}]
			});
		}

	};
})();
