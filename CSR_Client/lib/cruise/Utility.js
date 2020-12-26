
/**
 * @author <a href="mailto:stefan.pietschmann">Stefan Pietschmann</a>
 * @author Oliver Mroß
 * @class Ext.cruise.client.Utility
 * @singleton
 * This class is a helper class which encapsulates different implementations dependent on the current browser runtime.
 * Supported browser engines are Webkit, Gecko and IE>= 7.
 */
Ext.namespace("Ext.cruise.client");
Ext.cruise.client.Utility = function(){
	return {
		
		/**
		 * Escapes XML specific symbols by corresponding entities so that it can be embedded in other XML documents as text content without difficulty.
		 * The predefined XML entities are supported: quot ("), amp (&), apos ('), lt (<), gt (>).
		 * 
		 * @param {String} xmlstring a string in XML
		 * @return {String} masked string in XML 			
		 */
		maskString: function(xmlstring){
			if (!xmlstring || xmlstring==null)
				return xmlstring;
				
            xmlstring = xmlstring.replace(/&/g, "&amp;");
			xmlstring = xmlstring.replace(/</g, "&lt;");
			xmlstring = xmlstring.replace(/>/g, "&gt;");
			xmlstring = xmlstring.replace(/"/g, "&quot;");
			xmlstring = xmlstring.replace(/'/g, "&apos;");
			return xmlstring;
		},
		
		/**
		 * @param {String} xmlstring a string in XML
		 * @return {String} the string without namespace declarations 	
		 */
		removeNamespaceDeclarations: function(xmlstring){
			if (!xmlstring || xmlstring==null)
				return xmlstring;
			
			return xmlstring.replace(/xmlns(:\w+)?="[\w\d:\/\\\-=\._%\?]*"/g, "");
		},
		
		/**
		 * This method encapsulates the serialization of an XML document object. 
		 * It detects if the current browser runtime supports the XMLSerializer object. If not it chooses an alternative mechanism.
		 * Supported browser engines are Webkit, Gecko and IE.
		 * @param {DOMDocument} xmldoc a XML document object which needs to be serialized
		 * @return {String} string representation of given XML document object if XML serialization is possible
		 * 			{boolean} false if XML serialization is not possible
		 */
		serializeXML: function(xmldoc){
			try{
				return (new XMLSerializer()).serializeToString(xmldoc); // Gecko, Webkit, IE9
			}
			catch(e){
				try{// IE7, IE8
					return xmldoc.xml;
				}catch(e){
					throw "XML serialization not support in your browser";
				}
			}
			return false;
		},
		
		
		/**
		 * This method returns the recieved XML document object (responseXML) of the given XMLHttpRequest object. In IE7 and IE8 the XMLHttpRequest object needs 
		 * content-type information in response messages from the server to parse the recieved XML document properly.
		 * Supported browser engines are Webkit, Gecko and IE.
		 * @param {XMLHttpRequest} xhr get recieved XML document from this object
		 * @return {DOMDocument} recieved XML document object of given XHR object
		 */
		getXMLDOMFromXHR: function(xhr){
			if (xhr == undefined || xhr == null || !(xhr instanceof Object) || !xhr.responseXML) {
				throw "Illegal argument in method 'Ext.cruise.client.Utility.getXMLDOMFromXHR'";
			}
			
			if(Ext.isIE7 || Ext.isIE8){// IE version < IE9
				xhr.responseXML.loadXML(xhr.responseText); // load responseText explicitly as xml document because server sends no mime type in response header
			}
			
			// Webkit, Gecko, IE9
			return xhr.responseXML;
		},//getXMLDOMFromXHR
		
		
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
			if (!(ns_prefix && ns_value && tag_name && doc)) {
				throw "Illegal argument in method 'Ext.cruise.client.Utility.getElementsByTagNameNS'";
			}
				
			var array = undefined;
			if(doc.getElementsByTagNameNS){ //Gecko, Webkit support this method in html and xml documents, IE9 supports it only in html documents
				return doc.getElementsByTagNameNS(ns_value, tag_name);
			}
			
			var np = ns_prefix.split(':')[0];// get namespace prefix without delimiter
			if(Ext.isIE){
				doc.setProperty("SelectionLanguage", "XPath"); // prepare document for xpath queries
				doc.setProperty("SelectionNamespaces","xmlns:" + np +"='" + ns_value + "'"); // set namespace information into document
				array = doc.selectNodes("//"+ np +":" +tag_name); // evaluate given document with constructed xpath string, e.g. '//ns:application' returns all <ns:application>-elements
			}
			return array;
		},//getElementsByTagNameNS
		
		
		/**
		 * This method encapsulates different variants to get a attribute from an DOM element object by its name including namespace information.
		 * Supported browser engines are Webkit, Gecko and IE.
		 * @param {String} ns_value namespace uri
		 * @param {String} attribute_name the name of attribute to search for
		 * @param {DOMElement} elem element that contains searched attribute
		 * @return {String} value of searched attribute or null if it is not available
		 */
		getAttributeNS: function(ns_value, attribute_name, elem){
			if(elem.getAttributeNS)// not IE
				return elem.getAttributeNS(ns_value, attribute_name);
			
			// IE
			for(var index=0; index < elem.attributes.length; ++index){
				var attr = elem.attributes[index];
				if(attr.namespaceURI && attr.namespaceURI == ns_value)
					return attr.nodeValue;
			}
			return null;
		},//getAttributeNS
		
		
		/**
		 * Helper method to get first child element from given parent in different browser runtimes (Webkit, Gecko, IE).
		 * Supported browser engines are Webkit, Gecko and IE.
		 * @param {DOMElement} elem get first child of this element
		 * @return {DOMElement} first child of given element
		 */
		getFirstElementChild: function(elem){
			if(elem.firstElementChild) // not IE
				return elem.firstElementChild;
			
			if(elem.firstChild)// IE
				return elem.firstChild;
			
			if(elem.children)
				return elem.children[0];
		},//getFirstElementChild
		
		
		/**
		 * Helper method to get next dom sibling. Method is needed because IE has it's own implementation.
		 * Supported browser engines are Webkit, Gecko and IE.
		 * @param {DOMElement} elem next sibling element from this one
		 * @return {DOMElement} next sibling from given element
		 */
		nextElementSibling: function(elem){
			if(elem.nextElementSibling) return elem.nextElementSibling;
			if(elem.nextSibling) return elem.nextSibling;
		},
		
		
		/**
		 * Get textual representation of the given XML document object.
		 * Supported browser engines are Webkit, Gecko and IE.
		 * @param {DOMDocument} xmldoc XML document as DOMDocument
		 * @return {String} textual representation of given XML document object
		 */
		getXML: function(xmldoc){
			if(xmldoc.textContent)// mozilla and webkit
				return xmldoc.textContent;
			
			if(xmldoc.xml)// IE
				return xmldoc.text;
		},//getXML
		
		
		/**
		 * This method encapsulates different variants of namespace lookup mechanism for different browser runtimes (Webkit, Gecko, IE).
		 * @param {String} prefix namespace prefix
		 * @param {DOMNode} node dom node object as reference to lookup the namespace uri
		 * @return {String} namespace uri of given namespace prefix
		 */
		lookupNamespaceURI: function(prefix, node){
			if(node.lookupNamespaceURI)
				return node.lookupNamespaceURI(prefix);
			
			if(node.ownerDocument && node.ownerDocument.documentElement)// IE
				return node.ownerDocument.documentElement.getAttribute("xmlns:"+prefix);
				
			return false;
		},//lookupNamespaceURI
		
		
		/**
		 * Parse XML document object from given textual representation.
		 * Supported browsers are Webkit, Gecko and IE.
		 * @param {String} string textual representation of an XML document.
		 * @return {DOMDocument} XML document object
		 */
		parseXMLFromString: function(string){
			var xml = null;
			
			if (window.DOMParser)
			{
				var parser=new DOMParser();
				xml=parser.parseFromString(string,"text/xml");
			}
			else // IE
			{
				xml=new ActiveXObject("Microsoft.XMLDOM");
				xml.async="false";
				xml.loadXML(string);
			} 
			
			return xml;
		}//parseXMLFromString
	};
}();

/**
 * @class Ext.cruise.client.Constants Encapsulates constants
 * @public
 * @singleton
 */
Ext.cruise.client.Constants = {
	/** @property _RUNTIME_ID @type String */
	_RUNTIME_ID: "TSR",
	/** @property _RUNTIME_VERSION @type String */
	_RUNTIME_VERSION: "1.9",
	/** @property _TSRNS_ @type String */
	_TSRNS_: "http://mmt.inf.tu-dresden.de/cruise/tsr",// Namespace of TSR-compliant placeholders and channeldefinitions
	/** @property _CCM_NS_ @type String */
	_CCM_NS_: 'http://inf.tudresden.de/cruise/compositionmodel/1.9',
	/** @property _TSRNS_IE @type String */
	_TSRNS_IE: 'tsr:',
	/** @property _CCM_NS_IE @type String */
	_CCM_NS_IE: 'mcm:',
	/** @property BEANS_NS @type String */
	BEANS_NS: 'http://matchingresult.beans.integration.cruise.inf.tudresden.de/xsd',
	/** @property BEANS_NS_IE @type String */
	BEANS_NS_IE: 'ax21:',
	/** @property _MCDL_NS_ @type String */
	_MCDL_NS_: 'http://inf.tu-dresden.de/cruise/mcdl',
	/** @property _MCDL_PRE_ @type String */
	_MCDL_PRE_: 'mcdl:',
	/** @property _COMPRE_NS_ @type String */
	_COMPRE_NS_: "http://service.compre.edyra.inf.tudresden.de",
	/** @property _CORE_NS_ @type String */
	_CORE_NS_ : "http://soap.repository.cruise.inf.tudresden.de",
	/** @property _xsiNS_ @type String */
	_xsiNS_: 'http://www.w3.org/2001/XMLSchema-instance',
	/** @property _SMCDL_META_PRE_ @type String */
	_SMCDL_META_PRE_: 'meta:',
	/** @property _SMCDL_META_NS_ @type String */
	_SMCDL_META_NS_: 'http://inf.tu-dresden.de/cruise/mcdl/metadata'
};