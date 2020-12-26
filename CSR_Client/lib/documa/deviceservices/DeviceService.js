Ext.namespace("Documa.deviceservices");

Documa.require("Documa.util.Logger");

/**
 * @typedef {object} DeviceServiceType
 * @property {string} id
 * @property {string} dsid
 * @property {string} interface
 */

Documa.deviceservices.Namespaces = {
	METADATA: "http://mmt.inf.tu-dresden.de/smcdl/1.16/metadata",
	SMCDL: "http://mmt.inf.tu-dresden.de/smcdl/1.16",
	PLATFORM: "http://mmt.inf.tu-dresden.de/documa/ontologies/platform#",
	SOFT: "http://mmt.inf.tu-dresden.de/documa/ontologies/platform/software#",
	DEVICE: "http://mmt.inf.tu-dresden.de/documa/ontologies/platform/device#"
};

/**
 * @class
 */
Documa.deviceservices.DeviceService = Ext.extend(Object, function(){
	var TAG = "Documa.deviceservices.DeviceService";
	var _log = Documa.util.Logger;
	/////////////////////
	// private methods //
	/////////////////////

	/* TODO: add here your private methods */

	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {String} id
		 * @param {String} sessionid
		 * @param {jQuery} smcd
		 */
		constructor: function(id, sessionid, smcd){
			this._id = id;
			this._sid = sessionid;
			this._smcd = smcd;
		},

		/**
		 * Destructor.
		 */
		release: function(){
			this._id = null;
			this._sid = null;
			this._smcd = null;
		},

		/**
		 * @returns {String}
		 */
		getId: function(){
			return this._id;
		},

		/**
		 * @returns {String}
		 */
		getSessionID: function(){
			return this._sid;
		},

		/**
		 * @returns {jQuery}
		 */
		getSmcd: function(){
			return this._smcd
		},

		/**
		 * Returns icon url.
		 * @returns {String}
		 */
		getIcon: function(){
			return d3.select(this._smcd.get(0)).select("metadata > icons > icon").attr("url");
		}
	};
}());