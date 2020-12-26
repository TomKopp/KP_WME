Ext.namespace('Documa.ui.mainmenu');

Documa.require('Documa.util.Util');
Documa.require('Documa.util.Logger');

Documa.require('Documa.ui.mainmenu.MenuManager');

/**
 * @class
 */
Documa.ui.mainmenu.Utils = (function(){
	const LOG = Documa.util.Logger;
	const _listEntry = Ext.data.Record.create([
		{name: 'name', type: 'string'},
		{name: 'id', type: 'string'}
	]);


	/**
	 * Data reader able to get component parameter from search component response.
	 * @class
	 * @private
	 */
	var _SPARQLResultXMLReader = Ext.extend(Ext.data.DataReader, {
		/**
		 * This Method extracts Compnents as ListEntries from an XML String
		 * @param {String} rets XML SoapResponse with Components
		 * @return {Array} ret All Components extracted from the XML as ListEntries
		 */
		read: function(rets){
			var ret = [];
			var sparqlRes = Documa.util.Util.parseXMLFromString(rets);
			LOG.debug("sparqlRes: " + sparqlRes);
			var results = sparqlRes.querySelectorAll('result');
			for(var idx = 0; idx < results.length; ++idx) {
				var bindings = results[idx].querySelectorAll('binding');
				if(bindings.length == 0) continue;

				var config = {};
				for(var j = 0; j < bindings.length; ++j) {
					var binding = bindings[j], valueNode = null;

					for(var k = 0; k < binding.childNodes.length; ++k) {
						var child = binding.childNodes[k];
						if(child.nodeType == 1) {//Element node
							if(child.localName == 'uri' || child.localName == 'literal') {
								valueNode = child;
								break;
							}
						}
					}
					config[binding.getAttribute('name')] = valueNode != null ? valueNode.firstChild.nodeValue : null;
				}

				ret.push(new _listEntry(config));
			}
			return {
				success: true,
				records: ret,
				totalRecords: ret.length
			};
		},

		readRecords: function(rets){
			return this.read(rets);
		}
	});

	var SPARQLResultJSONReader = Ext.extend(Object, function(){
		return {
			/**
			 * Returns a matching json object from search response message.
			 *
			 * @param {String} xmlResult
			 * @returns {Array.<{id:string, name:string, icon:string, text:string}>}
			 */
			read: function(xmlResult){
				var jq = jQuery;
				var resultSet = [];
				var xmlDoc = jQuery(jQuery.parseXML(xmlResult));
				var results = xmlDoc.find("results > result");
				// loop over each result element
				results.each(function(index){
					var resultObj = jq(this);
					resultSet.push({
						id: resultObj.find("binding[name='id'] > literal").text(),
						name: resultObj.find("binding[name='name'] > literal").text(),
						icon: resultObj.find("binding[name='url'] > literal").text(),
						text: resultObj.find("binding[name='docu'] > literal").text()
					});
				});
				return resultSet;
			}
		};
	}());

	return {
		getSPARQLResultXMLReader: function(){
			return new _SPARQLResultXMLReader();
		},

		/**
		 * @returns {SPARQLResultJSONReader}
		 */
		getSPARQLResultJSONReader: function(){
			return new SPARQLResultJSONReader();
		},

		/**
		 * This method encapsulates different variants to get children from the given document object by its tagname including namespace information.
		 * Supported browser engines are Webkit, Gecko and IE
		 * @param {String} ns_prefix namespace prefix of child elements tagname
		 * @param {String} ns_value namespace uri of given namespace prefix
		 * @param {String} tag_name name of the child element without namespace prefix
		 * @param {DOMDocument} doc DOM document which contains child element
		 * @return {Array} array of all matching children with given tagname from given document
		 */
		getElementsByTagNameNS: function(ns_prefix, ns_value, tag_name, doc){
			if(!(ns_prefix && ns_value && tag_name && doc)) {
				throw new Error('Illegal argument in method \"Documa.ui.mainmenu.Utils.getElementsByTagNameNS\"');
			}

			var array = undefined;
			if(doc.getElementsByTagNameNS) { //Gecko, Webkit support this method in html and xml documents, IE9 supports it only in html documents
				return doc.getElementsByTagNameNS(ns_value, tag_name);
			}

			var np = ns_prefix.split(':')[0];// get namespace prefix without delimiter
			if(Ext.isIE) {
				doc.setProperty('SelectionLanguage', 'XPath'); // prepare document for xpath queries
				doc.setProperty('SelectionNamespaces', 'xmlns:' + np + '=\"' + ns_value + '\"'); // set namespace information into document
				array = doc.selectNodes('//' + np + ':' + tag_name); // evaluate given document with constructed xpath string, e.g. '//ns:application' returns all <ns:application>-elements
			}
			return array;
		}
	};
})();