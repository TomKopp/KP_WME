/**
 * @author Johannes Waltsgott, Carsten Radeck
 * @class Ext.cruise.client.ServiceAccess
 * This class provides a connection between the applications service access components and the proxys of the CRUISe Integration Service
 */
Ext.namespace("Ext.cruise.client");
Ext.cruise.client.ServiceAccess = Ext.extend(Object, {
	log: null,
	proxy: "/Proxy",
	
	/**
	 * Constructor of the Service Access
	 * @param {Object} logger an instance of the logger
	 * @param {Object} eventBroker an instance of the event broker
	 * @constructor
	 */
	constructor: function(logger){
		Ext.cruise.client.ServiceAccess.superclass.constructor.call(this);
		this.log = logger;
		this.log.debug('[ServiceAcc] Init successful.');
	},
	
	/**
	 * Set the reference to the proxy that ought to be used. 
	 * @param {String} url the URL of the proxy
	 */
	setProxy: function(url){
		if (url!=undefined && url!=null && url.length>0)
			this.proxy= url;
		this.log.debug("[ServiceAcc] Current proxy setting:",this.proxy);
	},

	/**
	 * Creates a {@link Ext.cruise.client.XMLHTTPRequest} object.
	 * @param {Object} scope (optional) the scope in which {@link Ext.cruise.client.XMLHTTPRequest#onreadystatechange onreadystatechange} is executed (only relevant for async. communication)
	 * @return {Ext.cruise.client.XMLHTTPRequest} the new XHR
	 */
	createXHR: function(scope){
		return new Ext.cruise.client.XMLHTTPRequest(this.proxy, scope);
	},
	
	/**
	 * Creates a SOAP message with an empty header given the payload (content of the SOAP body). 
	 * Additionally, a number of namespaces are declared:
	 * <ul style="list-style-type:disc; margin-left:30px">
	 *  <li> configurable application namespace (see parameters)
	 *  <li> XML schema namespace (prefix <code>xsd</code>).
	 *  <li> SOAP 1.2 namespace (prefix <code>soapenv</code>).
	 * </ul>
	 * 
	 * @public 
	 * @function
	 * @param {String} payload the actual message body
	 * @param {String} target_prefix (optional) target namespace. defaults to 'http://soap.repository.cruise.inf.tudresden.de'
	 * @param {String} target_ns (optional) target namespace's prefix. defaults to 'q0'
	 * @return {String} the soap message
	 */
	buildSOAPEnvelope: function(payload, target_prefix, target_ns){
		return '<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://www.w3.org/2003/05/soap-envelope" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:'
				+(target_prefix || 'q0')
				+'="'
				+(target_ns || Ext.cruise.client.Constants._CORE_NS_)
				+'"><soapenv:Body>'+payload+'</soapenv:Body></soapenv:Envelope>';
	}
});

/**
 * @class Ext.cruise.client.XMLHTTPRequest Wraps a native XMLHTTPRequest-Object to ensure that the request is redirected to a proxy.
 * Only for internal usage. Instances have to be created via the method {@link Ext.cruise.client.ServiceAccess#createXHR} of the current Ext.cruise.client.ServiceAccess.
 * <br/><br/>For further documentation c.f <a href="http://www.w3.org/TR/XMLHttpRequest">W3C XMLHTTPRequest</a>
 * @author Carsten Radeck
 * @param {String} proxy
 * @param {Object} scope
 */
Ext.cruise.client.XMLHTTPRequest= function(proxy, scope){
	var _xhr= utils.createRequestObj();
	if (_xhr==undefined||_xhr==null) throw "Cannot create XHR-Object";

	/**
	 * @property onreadystatechange
	 * Event listener that is invoked every time the {@link #readyState} changes 
	 * if it is an asynchronous request (see parameter 'async' of {@link #open}).
	 * @type Function
	 */
	this.onreadystatechange=null;
	/**
	 * @property readyState
	 * @type int
	 */
  	this.readyState=0;
	
	var isAsync= true;
	
	var wrapper= this;
	
	_xhr.onreadystatechange= function(){
		copyState();
		if (typeof wrapper.onreadystatechange == "function") {
			if (scope!=undefined && scope!=null)
				wrapper.onreadystatechange.call(scope, wrapper);
			else
				wrapper.onreadystatechange.call(wrapper, wrapper);
		}
	};

	/**
	 * 
	 * @param {String} method the HTTP method
	 * @param {String} url the URL
	 * @param {boolean} async (optional) default: true
	 * @param {String} user (optional)
	 * @param {String} password (optional)
	 */
  	this.open= function(method, url, async, user, password){
		var finalurl= url;
		var idx= url.lastIndexOf("?");
		var params= {};
		if (idx != -1) {
			var query = url.substring(idx+1);
			params = Ext.urlDecode(query);
			params.uri= url.substring(0,idx);
		}else {
			params.uri= url;
		}
		finalurl= proxy +"?"+ Ext.urlEncode(params);
		
		if (async==undefined||async==null)
			async= true;
		isAsync= async;
		
		_xhr.open(method, finalurl, async, user, password);
	};

	/**
	 * 
	 * @param {String} header
	 * @param {String} value
	 */
  	this.setRequestHeader= function(header, value){
		_xhr.setRequestHeader(header, value);
	};
	/**
	 * 
	 * @param {Object} data
	 */
  	this.send= function(data){
		_xhr.send(data);
		
		if (isAsync==false) copyState();
	};
	/**
	 * 
	 */
  	this.abort= function(){
		_xhr.abort();
	};

	/**
	 * @property status
	 * @type int
	 */
	this.status;
	/**
	 * @property statusText
	 * @type String
	 */
  	this.statusText;
	/**
	 * @property responseText
	 * @type String
	 */
  	this.responseText;
	/**
	 * @property responseXML
	 * @type Document
	 */
  	this.responseXML;
	
	/**
	 * 
	 * @param {String} header
	 * @return {Object} the value
	 */
  	this.getResponseHeader= function(header){
		return _xhr.getResponseHeader(header);
	};
	/**
	 * @return {Array} the header names
	 */
  	this.getAllResponseHeaders=function(){
		return _xhr.getAllResponseHeaders();
	};
	
	function copyState(){
		if (_xhr.readyState == '4') {
		wrapper.readyState= _xhr.readyState;
		wrapper.status = _xhr.status;
		wrapper.statusText = _xhr.statusText;
		wrapper.responseText= _xhr.responseText;
		wrapper.responseXML= _xhr.responseXML;
		}
	};
};

/**
 * @class Ext.cruise.client.SOAPProxy Basic implementation of Ext.data.DataProxy for SOAP web services. Intended to be used in conjunction with
 * Stores and Readers of Ext. 
 */
Ext.cruise.client.SOAPProxy= Ext.extend(Ext.data.DataProxy, {
	operation: null,
	namespace: null,
	sac: null,
	
	constructor: function(options){
		Ext.cruise.client.SOAPProxy.superclass.constructor.call(this, options);
		
		Ext.apply(this, options, {
			/**
			 * @cfg {String} url
			 * The URL of the SOAP web service to be used.
			 */
			/**
			 * @cfg {String} operation
			 * The name of the SOAP operation to be called. Defaults to "query"
			 */
			operation: 'query',
			/**
			 * @cfg {String} namespace
			 * The namespace of the SOAP web service to be invoked. Defaults to "http://soap.repository.cruise.inf.tudresden.de"
			 */
			namespace: 'http://soap.repository.cruise.inf.tudresden.de',
			/**
			 * @cfg {String} prefix
			 * Prefix of the namespace. Defaults to "q0"
			 */
			prefix: 'q0',
			/**
			 * @cfg {String} resultElementName
			 * The element name to be selected from the response's SOAP envelope. Defaults to "return"
			 */
			resultElementName: 'return'
		});
		
		this.sac= applicationManagerInstance.getServiceAccess();
		this.defReader= new Ext.cruise.client.SPARQLResultXMLReader();
	},
	
	/**
	 * @private
	 */
	openEnvelope: function(prefix, namespace){
		return '<soapenv:Envelope xmlns:soapenv="http://www.w3.org/2003/05/soap-envelope" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:'+prefix+'="'+namespace+'" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><soapenv:Body>';
	},
	
	/**
	 * @private
	 */
	closeEnvelope: function(env){
		return env+="</soapenv:Body></soapenv:Envelope>";
	},
	
	 /**
     * SOAPProxy implementation of DataProxy#doRequest
     * 
     * @param {String} action The crud action type (create, read, update, destroy)
     * @param {Ext.data.Record/Ext.data.Record[]} rs If action is load, rs will be null
     * @param {Object} params An object containing properties which are to be used as HTTP parameters
     * for the request to the remote server.
     * @param {Ext.data.DataReader} reader The Reader object which converts the data
     * object into a block of Ext.data.Records.
     * @param {Function} callback
     * <div class="sub-desc"><p>A function to be called after the request.
     * The <tt>callback</tt> is passed the following arguments:<ul>
     * <li><tt>r</tt> : Ext.data.Record[] The block of Ext.data.Records.</li>
     * <li><tt>options</tt>: Options object from the action request</li>
     * <li><tt>success</tt>: Boolean success indicator</li></ul></p></div>
     * @param {Object} scope The scope (<code>this</code> reference) in which the callback function is executed. Defaults to the browser window.
     * @param {Object} arg An optional argument which is passed to the callback as its second parameter.
     * @protected
     */
    doRequest : function(action, rs, params, reader, cb, scope, arg) {
    	if (!reader)
    		reader= this.defReader;
    	
    	// build SOAP envelope
    	var xml= this.openEnvelope(this.prefix, this.namespace);
    	xml+="<"+this.prefix+":"+this.operation+">"
    	for (var param in params) {
    		xml+="<"+this.prefix+":"+param+">"+params[param]+"</"+this.prefix+":"+param+">";
    	}
    	xml+="</"+this.prefix+":"+this.operation+">";
    	xml= this.closeEnvelope(xml);
    	
    	var xhr= this.sac.createXHR(this);
		xhr.open('POST', this.url);
		xhr.setRequestHeader("Content-Type","application/soap+xml");
		xhr.onreadystatechange= function(){
			if (xhr.readyState == 4){
				if (xhr.status==200){
					var respxml = xhr.responseXML;
					if (respxml == null) 
						return;
					var result= Ext.cruise.client.Utility.getElementsByTagNameNS(this.prefix,this.namespace,this.resultElementName,respxml);
					if (result.length==1 && result[0].getAttribute("xsi:nil") == 'true') {
						cb.call(scope||window, [], params, true, arg);
					} else {
						try {
							var results= reader.read(result);
							this.fireEvent('load', this, results, params);
							
							cb.call(scope||window, results, arg, true);
						}catch(E){
							this.fireEvent('exception', this, E, params);
						}
					}
				} else {
					this.fireEvent('exception', xhr.status);
				}
			}
		};
		xhr.send(xml);
    }
});