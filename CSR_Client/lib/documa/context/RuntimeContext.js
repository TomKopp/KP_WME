Ext.namespace('Documa.context');

Documa.require("Documa.util.Logger");
Documa.require("Documa.distribution.Device");

Documa.context.CONTEXT_ATTR_NAMES = {
	RUNTIME_DESCR_OWL: "rtd_owl",
	RUNTIME_DESCR_JSONLD: "rtd_jsonld",
	RUNTIME_DESCR_SERVICES: "rtd_services",
	RUNTIME_TYPE: "CSR"
};

/**
 * Abstract class providing the access methods to the device context.
 *
 * @class
 * @extends {Ext.cruise.client.BaseContext}
 */
Documa.context.RuntimeContext = Ext.extend(Ext.cruise.client.BaseContext, (function () {
	const TAG = "Documa.context.RuntimeContext";
	const CONFIG_PATH = "res/discovery/config.json";
	const LOG = Documa.util.Logger;
	const UTIL = Documa.util.Util;
	const RDF_NS = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
	const jq = jQuery;
	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 */
		constructor: function () {
			Documa.context.RuntimeContext.superclass.constructor.call(this);
			var self = this;
			this._config = null;
			this._prefixMap = {
				com: "http://mmt.inf.tu-dresden.de/documa/ontologies/platform/common#",
				dev: "http://mmt.inf.tu-dresden.de/documa/ontologies/platform/device#",
				soft: "http://mmt.inf.tu-dresden.de/documa/ontologies/platform/software#"
			};
			/**
			 * Object encapsulating device-specific information.
			 * @type {Documa.distribution.Device}
			 * @private
			 */
			this._device = null;
			jq.ajax(CONFIG_PATH).then(function (data) {
				self._config = data;
				LOG.debug(TAG, 'Config file successfully readed. CONFIG = ' + JSON.stringify(self._config));
			}, function (xhr) {
				LOG.error(TAG, 'Could not read config file from path: ' + CONFIG_PATH + ' ' + JSON.parse(xhr.responseText));
			});
		},

		/**
		 * Triggers the loading of the runtime descriptor file.
		 *
		 * @param {Function} callback function to call after the runtime context object was
		 * initialized successfully.
		 */
		initialize: function (callback) {
			throw new Error("Override method <<initialize>>");
		},

		/**
		 * Returns object containing several platform ontology prefixes.
		 * @returns {{com:string, dev:string, soft:string}}
		 */
		getPrefixMap: function () {
			return this._prefixMap;
		},

		/**
		 * Loading runtime descriptor graph during the initialization phase.
		 * @returns {Promise}
		 */
		loadRuntimeGraph: function () {
			var descriptor = this.getRuntimeDescriptorJSONLD();
			this._device = new Documa.distribution.Device(descriptor);
			var services = this.getRuntimeDescriptorServices();
			var dsm = Documa.RuntimeManager.getDeviceServiceManager();
			var self = this;
			services.forEach(function(descriptor){
				dsm.loadDeviceService(descriptor);
				var service = dsm.getService(descriptor.id);

				// registering host device's services
				self._device.addDeviceService(service);
			});
			var promises = jsonld.promises;
			return this._device.initialize();
		},

		/**
		 * Returns the runtime descriptor object in rdf/xml format based on OWL DL.
		 *
		 * @return {String}
		 */
		getRuntimeDescriptorOWL: function () {
			return this.getAttribute(Documa.context.CONTEXT_ATTR_NAMES.RUNTIME_DESCR_OWL);
		},

		/**
		 * Returns the runtime descriptor object in JSONLD format. It includes three sections: device, client and os.
		 * The device section references a JSONLD graph describing the current device; the client section provides a
		 * graph describing the csr client and the last section's graph is describing the operating system.
		 *
		 * @returns {object}
		 */
		getRuntimeDescriptorJSONLD: function () {
			return this.getAttribute(Documa.context.CONTEXT_ATTR_NAMES.RUNTIME_DESCR_JSONLD);
		},

		/**
		 * @returns {Array.<DeviceServiceDescriptor>}
		 */
		getRuntimeDescriptorServices: function(){
			return this.getAttribute(Documa.context.CONTEXT_ATTR_NAMES.RUNTIME_DESCR_SERVICES);
		},

		/**
		 * Method to individualize the given client runtime descriptor.
		 *
		 * @param {String} descriptor client runtime descriptor to individualize
		 * @param {String} device_id
		 * @param {String} csr_id
		 */
		individualizeDescriptor: function (descriptor, device_id, csr_id) {
			let dom_descr = UTIL.parseXMLFromString(descriptor);
			let desktop_query = "//*[@rdf:about=\"" + device_id + "\"]";
			let desktop_query2 = "//*[@rdf:resource=\"" + device_id + "\"]";
			let csr_query = "//*[@rdf:about=\"" + csr_id + "\"]";
			let csr_query2 = "//*[@rdf:resource=\"" + csr_id + "\"]";

			let resolver = function (prefix) {
				if (prefix === "rdf") {
					return RDF_NS;
				}
				return null;
			};

			// getting device description
			let d_result = dom_descr.evaluate(desktop_query, dom_descr.documentElement, resolver, XPathResult.ANY_TYPE, null);
			let d_elem = d_result.iterateNext();

			// getting csr client description
			let c_result = dom_descr.evaluate(csr_query, dom_descr.documentElement, resolver, XPathResult.ANY_TYPE, null);
			let c_elem = c_result.iterateNext();

			// getting timebased uuid and append it to the expected individuals
			let uuid = window.uuid.v1();
			d_elem.setAttribute("rdf:about", device_id + "-" + uuid);
			c_elem.setAttribute("rdf:about", csr_id + "-" + uuid);

			/** @type {XPathResult} */
			let d_result2 = dom_descr.evaluate(desktop_query2, dom_descr.documentElement, resolver, XPathResult.ANY_TYPE, null);

			/** @type {XPathResult} */
			let c_result2 = dom_descr.evaluate(csr_query2, dom_descr.documentElement, resolver, XPathResult.ANY_TYPE, null);

			/** @type {Array.<Node>} */
			let dev_ref_nodes = [];
			/** @type {Array.<Node>} */
			let cl_ref_nodes = [];

			/**
			 * @param {XPathResult} iterator
			 * @param {Array.<Node>} collection
			 */
			let collect = function(iterator, collection){
				let r = iterator.iterateNext();
				while (r) {
					collection.push(r);
					r = iterator.iterateNext();
				}
			};

			collect(d_result2, dev_ref_nodes);
			collect(c_result2, cl_ref_nodes);

			// modify nodes
			for(let d of dev_ref_nodes) {
				d.setAttribute("rdf:resource", device_id + "-" + uuid);
			}
			for(let c of cl_ref_nodes) {
				c.setAttribute("rdf:resource", csr_id + "-" + uuid);
			}

			let result = UTIL.serializeXML(dom_descr);

			// remove whitespaces
			result = result.replace(/\s{2}/g, "");
			LOG.debug(TAG, "... count of descriptor chars: " + result.length);

			return result;
		},

		/**
		 * Returns version number of runtime.
		 *
		 * @returns {String}
		 */
		getRuntimeVersion: function(){
			return this._device.getRuntimeVersion();
		},

		/**
		 * Returns runtime name.
		 * @returns {String}
		 */
		getRuntimeName: function(){
			return this._device.getRuntimeName();
		},

		/**
		 * Returns type of current runtime. In this case it's the CSR (client-side) runtime.
		 * @returns {string}
		 */
		getRuntimeType: function(){
			return "CSR";
		},

		/**
		 * Returns device descriptor object of this runtime context.
		 * @returns {Documa.distribution.Device}
		 */
		getDevice: function () {
			return this._device;
		}
	};
})());
