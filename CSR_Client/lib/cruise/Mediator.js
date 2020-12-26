/**
 * @author Carsten Radeck
 * @class Ext.cruise.client.Mediator The Mediator is responsible for the execution of XSL-Transformations on the client 
 * Additionally it acts an adapter for the external Mediation Service, which provides up-cast-functionalty. 
 */
Ext.cruise.client.Mediator = Ext.extend(Object, {
	serviceAccess: null,
	log: null,
	/* caches XSLT-Stylesheets that are referenced by URL */
	cache: null,
	/* the URL of the Mediation Service */
	__MEDIATIONSERVICE_URL: "http://localhost:8080/MediationService/services/MediationService",
	
	/**
	 * @constructor
	 * @param {Object} logger
	 * @param {Ext.cruise.client.ServiceAccess} serviceAccess the current service access
	 * @param {String} url (optional) the URL of the Mediation Service, per default 'http://localhost:8080/MediationService/services/MediationService'
	 */
	constructor: function(logger, serviceAccess, url){
		this.log = logger;
		this.serviceAccess = serviceAccess;
		this.cache = {};
		
		if (url != undefined && url != null && url.length > 0) {
			this.__MEDIATIONSERVICE_URL = url;
		}
		
		Ext.cruise.client.Mediator.superclass.constructor.call(this);
		this.log.debug('[Mediator] ... started.');
	},
	
	reset: function(){
		delete this.cache;
		this.cache= {};
	},
	
	/**
	 * Transforms the input via a referenced stylesheet.
	 * 
	 * @param {String} data the data to be transformed
	 * @param {String} xslt_url the URL of a (public available) stylesheet.
	 */
	transformByStylesheetRef: function(data, xslt_url){
		if (!this._checkArgs(data, xslt_url)) return null;
		
		var input;
		try {
			input= Ext.cruise.client.Utility.parseXMLFromString(data);
		}catch(e){
			this.log.error(e);
			return data;
		}
		/* download the stylesheet from the referenced url if not present in cache */
		if (this.cache[xslt_url] == undefined || this.cache[xslt_url] == null) {
			var script= this._receiveXSLT(xslt_url);
			if (script!=null)
				this.cache[xslt_url]= script;
			else
				return data;
		}
		
		try {
			/* apply transformation to the data and serialize the result */
			var t0= +new Date();
			var proc= new XSLTProcessor();
			proc.importStylesheet(this.cache[xslt_url]);
			var result = proc.transformToDocument(input);
			var serial = Ext.cruise.client.Utility.serializeXML(result);
			
			this.log.debug("[Mediator] XSLTbyRef took",(+new Date()-t0));
			return serial;
		} catch (err) {
			this.log.error("[Mediator]",err);
			return data;
		}
	},

	/**
	 * Transforms the input via a stylesheet represented as DOM.
	 * 
	 * @param {String} data the data to be transformed
	 * @param {Document} xslt the stylesheet
	 */
	transformByStylesheet: function(data, xslt){
		if (!this.checkArgs(data,xslt)) return null;
		
		var input;
		try {
			input= Ext.cruise.client.Utility.parseXMLFromString(data);
		}catch(e){
			this.log.error("[Mediator] Failed to parse data to be transformed ",e);
			return data;
		}
		
		var proc= new XSLTProcessor();
		try {
			proc.importStylesheet(xslt);
			var result = proc.transformToDocument(input);
			return Ext.cruise.client.Utility.serializeXML(result);
		} catch (err) {
			this.log.error("[Mediator]",err);
			return data;
		}
	},
	
	/**
	 * Receive an xslt-stylesheet.
	 * @private
	 * @param {String} url
	 */
	_receiveXSLT: function(url){
		var xhr= this.serviceAccess.createXHR();
		/* synch. request */
		xhr.open("GET", url, false);
		xhr.send();
		if (xhr.readyState==4 && xhr.status==200){
			return xhr.responseXML;
		}else {
			this.log.error("[Mediator] failed at receiving",url);
		}
		return null;
	},
	
	/**
	 * checks whether all arguments are set and not null.
	 * @private
	 */
	_checkArgs: function(){
		for (var idx=0; idx < arguments.length; ++idx){
			if (arguments[idx]==undefined || arguments[idx]==null)
				return false;
		}
		return true;
	},
	
	/**
	 * Asynch. conversion procedure.
	 * @param {String} data data to be converted
	 * @param {String} sourceClassURI URI of the concept of the input data
	 * @param {String} targetClassURI URI of the target concept the input data have to be converted to 
	 * @param {Function} callback called when mediation service answers
	 * @param {Object} scope the scope in which 'callback' is executed
	 * @param {Object} args optional parameters handed over to the callback
	 */
	convert: function(data, sourceClassURI, targetClassURI, callback, scope, args){
		if (!this._checkArgs(arguments)){
			if (Ext.isFunction(callback))
				callback.call(scope, data, args);
			return;
		}
		if (!Ext.isFunction(callback)) return;
		
		var xhr= applicationManagerInstance.getServiceAccess().createXHR(this);
		xhr.open("POST", this.__MEDIATIONSERVICE_URL+"/convert");
		xhr.setRequestHeader("Content-Type","application/soap+xml");
		xhr.onreadystatechange= function(response){
			try {
				if (response.readyState == 4) {
					var xml = response.responseXML;
					if (xml != undefined && xml != null) {
						var converted = null;
						var nodelist = xml.getElementsByTagName('ns:return');
						if (nodelist.length == 1) {
							converted = nodelist[0].firstChild.nodeValue;
						}
						callback.call(scope, converted, args);
					}
					else {
						callback.call(scope, null, args);
					}
				}
			}catch(ERR){this.log.error(ERR);}
		};
		var xml= '<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:impl="http://impl.service.mediation.cruise.inf.tudresden.de" xmlns:xsd="http://beans.webservice.croco.inf.tudresden.de/xsd">'+
				'<soapenv:Header/><soapenv:Body><impl:convert><impl:data><![CDATA[';
		xml+=data;
		xml+=']]></impl:data><impl:sourceClassURI>'+sourceClassURI+'</impl:sourceClassURI>'+
         '<impl:targetClassURI>'+targetClassURI+'</impl:targetClassURI></impl:convert></soapenv:Body></soapenv:Envelope>';
		xhr.send(xml);
	},
	
	/**
	 * Synch. conversion procedure.
	 * @param {String} data data to be converted
	 * @param {String} sourceClassURI URI of the concept of the input data
	 * @param {String} targetClassURI URI of the target concept the input data have to be converted to 
	 * @return {String} converted data
	 */
	convertSynch: function(data, sourceClassURI, targetClassURI){
		if (!this._checkArgs(arguments)){return;}

		var xhr= applicationManagerInstance.getServiceAccess().createXHR();
		xhr.open("POST", this.__MEDIATIONSERVICE_URL+"/convert", false);
		xhr.setRequestHeader("Content-Type","application/soap+xml");
		var xml= '<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:impl="http://impl.service.mediation.cruise.inf.tudresden.de" xmlns:xsd="http://beans.webservice.croco.inf.tudresden.de/xsd">'+
				'<soapenv:Header/><soapenv:Body><impl:convert><impl:data><![CDATA[';
		xml+=data;
		xml+=']]></impl:data><impl:sourceClassURI>'+sourceClassURI+'</impl:sourceClassURI><impl:targetClassURI>'+targetClassURI+'</impl:targetClassURI></impl:convert></soapenv:Body></soapenv:Envelope>';
		xhr.send(xml);
		
		if (xhr.readyState == 4) {
			var xml = xhr.responseXML;
			if (xml != undefined && xml != null) {
				var converted = null;
				var nodelist = xml.getElementsByTagName('ns:return');
				if (nodelist.length == 1) {
					converted = nodelist[0].firstChild.nodeValue;
				}
				return converted;
			}
		}
		return null;
	}
});