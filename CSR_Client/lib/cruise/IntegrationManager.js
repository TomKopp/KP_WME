Ext.namespace("Ext.cruise.client");
/**
 * @author <a href="mailto:stefan.pietschmann">Stefan Pietschmann</a>
 * @author Carsten Radeck
 * @author Gerald Hübsch 
 * @author Johannes Waltsgott
 * @class Ext.cruise.client.IntegrationManager
 * The IntegrationManager connects the Client Runtime and the CRUISe Integration Service.
 * It receives the JavaScript code for an UI Component and manages its required libraries
 * and CSS files. Identical ressources (compared by the uri of the file) are only integrated once.
 */
Ext.cruise.client.IntegrationManager = Ext.extend(Object, {
	url: null,
	log: null,
	eventBroker: null,
	serviceAccess:null,
	referenceCounter: null,
	ADDITIONAL_WAITING_TIME: 300,
	
	/**
	 * Instantiates a new integration manager.
	 * @param {string} url the url of the CoRe's Integration Service
	 * @param {Object} logger a logger instance as Object
	 * @param {Object} eventBroker an event broker instance as Object
	 * @param {Object} serviceAccess an event broker instance as Object
	 * @constructor
	 */
	constructor: function(url, logger, eventBroker, serviceAccess){
		this.url= url;
		this.eventBroker = eventBroker;
		this.serviceAccess= serviceAccess;
		Ext.cruise.client.IntegrationManager.superclass.constructor.call(this);
		this.log = logger;
		this.log.debug('[IntMan] Init successful with CoRe url ', this.url);

		this.referenceCounter= new Ext.cruise.client.ReferenceCounter();
	},
	
	/**
	 *
	 * method to publish an event via the provided event broker
	 * @function
	 * @private
	 * @param {string} eventName the name of the event
	 * @param {Object} eventData the event data
	 */
	triggerEvent: function(eventName, data){
		// check if event broker is available 
		if (this.eventBroker != null){
			this.log.debug('[IntMan] publishing through EventBroker...');

			var msg = new Ext.cruise.client.Message();
			msg.setName(eventName);
			msg.setBody(data);
			this.eventBroker.publish(msg, undefined);
		}
	},
	
	/**
	 * This routine initializes the reference counter with the script and CSS elements that are already contained in the unprocessed HTML document. 
	 * The URIs of the scripts and CSS files are used as the keys for the reference counter.
	 * @function
	 * @public
	 * @param {ReferenceCounter} refCounter The referenceCounter to be initialized
	 */
	initializeReferenceCounter : function(refCounter) {
		//initialize the reference counter
		var head= document.getElementsByTagName('head')[0];
		var sElements = head.getElementsByTagName('script');
		var lElements = head.getElementsByTagName('link');

		var i=0;

		for (i = 0; i < sElements.length; ++i) {
			var sElement= sElements[i];
			if (sElement.getAttribute('src') != undefined && sElement.getAttribute('src') != '') 
				this.referenceCounter.addReference(sElement.getAttribute('src'), sElement);
		}
		
		for (i = 0; i < lElements.length; ++i) {
			var lElement= lElements[i];
			if (lElement.getAttribute('href') != undefined && lElement.getAttribute('href') != '') 
				this.referenceCounter.addReference(lElement.getAttribute('href'), lElement);
		}
	},

	/**
	 * This operation analyzes the 'dependencies' elements of a MCDL description, initiates the loading of scripts 
	 * using the Ext.ux.integration.addDependency and Ext.ux.integration.fetchScript operations, and collects the 
	 * objects representing the scripts being loaded (see Ext.ux.integration.ScriptLoadObject). 
	 * 
	 * @function
	 * @public
	 * @param {Element} dependenciesElement the 'dependencies' DOM-element of the MCDL description being processed
	 * @return an array of Ext.ux.integration.ScriptLoadObject describing the scripts that are being loaded
	 */
	processDependencies : function(dependenciesElement) {
		if (dependenciesElement == undefined) return null;
		
		var scriptsLoading = new Array();
		
		var dependencies = dependenciesElement.getElementsByTagName('dependency');

		for (var i=0, length= dependencies.length; i < length; ++i) {
			var dependencyElem = dependencies[i];
			var scriptLoad = this.addDependency(dependencyElem);
			//nothing to load (an already integrated script)
			if (scriptLoad == null) continue;
			
			scriptsLoading.push(scriptLoad);
		}
		return scriptsLoading;
	},

	/**
	 * This operation processes a 'dependency' elements of a MCDL description, checks if the CSS/script has already been loaded 
	 * using the reference counter. If necessary, it creates the HTML element to hold the script/CSS and returns a script load 
	 * object with information about the script being loaded.  
	 * (see Ext.ux.integration.ScriptLoadObject). 
	 * 
	 * @function
	 * @private
	 * @param {Element} dependencyElement a 'dependency' DOM-element of the MCDL description being processed
	 * @return an array of Ext.ux.integration.ScriptLoadObject describing the scripts that are being loaded
	 */
	addDependency : function(dependencyElem) {
		var dep= dependencyElem.getElementsByTagName("url")[0];
		var uri = dep.firstChild.nodeValue;
		
		if (uri){ // ignore libraries already provided by runtime 
			if (uri.search(/ext\-base.*\.js/)!=-1 ||
					uri.search(/ext\-core.*\.js/)!=-1 ||
					uri.search(/ext\-all.*\.js/)!=-1 ||
					uri.search(/maps\.google\.com/)!=-1){
				this.log.info('[IntMan] Dependency '+uri+' ignored!');
				return null;
			}
		}
		
		var type = dependencyElem.getAttribute('language');
		var scriptLoad = null;
		
		//register the uri in the reference counter
		var count = this.referenceCounter.getReferenceCount(uri);
		
		//the first reference to this uri was added
		if (count == 0 || count == undefined) {
			var headElem = document.getElementsByTagName('head')[0];
			var newElem, attr;

			if ('javascript' == type) {
				newElem = document.createElement('script');
				
				attr = document.createAttribute('type');
				attr.nodeValue='text/javascript';
				newElem.setAttributeNode(attr);

				scriptLoad = new Ext.cruise.client.ScriptLoadObject({uri:uri});
				
				//update the reference counter
				this.referenceCounter.addReference(uri, newElem, scriptLoad);
				
				newElem.onload = scriptLoad.setReady;
				newElem.src = uri;
			}
			else if ('css' == type) {
				newElem = document.createElement('link');

				attr = document.createAttribute('href');
				attr.nodeValue=uri;
				newElem.setAttributeNode(attr);

				attr = document.createAttribute('rel');
				attr.nodeValue='stylesheet';
				newElem.setAttributeNode(attr);
				
				attr = document.createAttribute('type');
				attr.nodeValue='text/css';
				newElem.setAttributeNode(attr);
				
				//update the reference counter
				this.referenceCounter.addReference(uri, newElem);
			}

			headElem.appendChild(newElem);
		} else {
			// store a reference to the ScriptLoad-Object of an already queued script in the list of scripts to be loaded for this component. otherwise, the particular script is regarded as already loaded, potentially leading to erroneous behavior.
			// for example, if one component is instantiated multiple times in the mashup, all the component's instances require the same scripts. Neglecting the following lines would result in instantiation errors due to
			// an empty "scriptsLoading"-Array (see method "processDependencies") for component instance n (n>1).
			var temp= this.referenceCounter.getScriptLoad(uri);
			if (temp!=undefined && !temp.getReady())
				scriptLoad= temp;
			
			this.referenceCounter.addReference(uri, this.referenceCounter.getReferenceValue(uri));
		}

		return scriptLoad;
	},

	/**
	 * This operation removes a dependency by updating the reference object and deleting the HTML element containing the script. It 
	 * is the inverse operation of Ext.ux.integration.addDependency.
	 * 
	 * @function
	 * @private
	 * @param {String} uri the uri of the script to be removed 
	 */
	removeDependency : function(uri) {
		var removedElem = this.referenceCounter.getReferenceValue(uri);
		
		if (removedElem != undefined) {
			this.referenceCounter.removeReference(uri);
			var count = this.referenceCounter.getReferenceCount(uri);
			//the last reference to this uri was removed, so we remove the element from the document
			if (count == 0) 
				removedElem.parentNode.removeChild(removedElem);
		}
	},

	/**
	 * This operation initiates an AJAX call that loads a (S)MCDL file from the repository.
	 * triggerEvent is invoked to process the result.
	 *
	 * @function
	 * @public
	 * @param {MCDLReqRespObject} reqRespObj an instance of class {@link Ext.cruise.client.MCDLReqRespObject}
	 */
	fetchSMCDLByID : function(reqRespObj) {
		var id= reqRespObj.id, ind= id.indexOf('#');
		if (ind!=-1){
			id= id.substring(0,ind);
		}
		var xml= this.serviceAccess.buildSOAPEnvelope('<q0:getMcdlByID><q0:componentID>'+id+'</q0:componentID></q0:getMcdlByID>');

		var xhr= this.serviceAccess.createXHR(this);
		xhr.open('POST', this.url, false);
		xhr.setRequestHeader("Content-Type","application/soap+xml");
		xhr.send(xml);
		if (xhr.readyState ==4 && xhr.status==200){
			var respxml= Ext.cruise.client.Utility.getXMLDOMFromXHR(xhr);
			if (respxml==null) return;
			var result= Ext.cruise.client.Utility.getElementsByTagNameNS('ns:',Ext.cruise.client.Constants._CORE_NS_,'return',respxml)[0];
			if (result.getAttribute('xsi:nil') == 'true') {
				this.log.error("[IntMan] Component with ID",reqRespObj.id,"unknown at CoRe!");
				reqRespObj.error=true;
				this.triggerEvent('IntegrationError', reqRespObj);
			} else {
				var xmldoc = Ext.cruise.client.Utility.getXML(result); 
				var smcd = Ext.cruise.client.Utility.parseXMLFromString(xmldoc);
				smcd= smcd.getElementsByTagName('smcd')[0];
				reqRespObj.setResponse(smcd);
				if (!reqRespObj.compConfig){
					reqRespObj.compConfig= smcd;
					reqRespObj.name= smcd.getAttribute("name");
				}
				/**
				 * @event codeReceived
				 * Fired if the MCDL could successfully be loaded (see method {@link Ext.cruise.client.IntegrationManager#fetchMCDLBinding}).
				 * @param {Object} reqRespObj An Object containing the Components ID as string, the URL of the UISs as string and the Ajax call status as string
				 */
				this.triggerEvent('codeReceived', reqRespObj);
			}
		} else {
			this.log.error('[IntMan] Couldn\'t retrieve binding with id '+reqRespObj.id+' from CoRe ('+this.url+'). HTTP response status code: '+xhr.status); 
			reqRespObj.error=true;
			/**
			 * @event IntegrationError
			 * Fired if there is an error while integrating a component
			 * @param {Object} reqRespObj An Object containing the Components ID as string, the URL of the UISs as string and the Ajax call status as string
			 */
			this.triggerEvent('IntegrationError', reqRespObj);
		}
	},
	
	/**
	 * Queries the CoRe for a candidatelist for a given template (referenced in the RequestObject).  
	 * @function
	 * @public
	 * @param {Object} reqRespObj the RequestObject
	 * @param {Function} handler (optional) function handling the candidate list
	 * @param {Object} scope (optional) the handler's scope 
	 */
	fetchSMCDLByTemplate: function(reqRespObj, handler, scope){
		var ccm= applicationManagerInstance.getCompositionModel();
		var component= reqRespObj.compConfig;
		
		/* step 1: generate integration request */
		var rankingRules= ccm.getElementsByTagName("rankingRule");
		var events= component.getElementsByTagName('event');
		var operations=component.getElementsByTagName('operation');
		var properties=component.getElementsByTagName('property');
		var functionality=new Array();
		for (var idx=0; idx<component.childNodes.length; ++idx){
			var node= component.childNodes[idx];
			if (node.nodeType==1){//element node
				if (node.nodeName=="capability"){
					functionality.push(node);
				}
			}
		}
		var rr_attribute= component.getAttribute("rankingRule");

		var integrationRequest= "<integrationRequest xmlns:template=\"http://inf.tu-dresden.de/cruise/template\" xmlns:ccm=\"http://inf.tu-dresden.de/cruise/template\" xmlns=\"http://inf.tu-dresden.de/cruise/template\">";
		var type= "";
		var isMCDL= false;
		if (component.getAttribute('xsi:type')!=null){ // CCM
			if (component.getAttribute('xsi:type').indexOf("UIComponent")==-1)
				type= "false";
			else
				type= "true";
		} else {// MCDL
			type= component.getAttribute('isUI');
			isMCDL= true;
		}
		var template= "<template id=\""+component.getAttribute('id')+"\" isUI=\""+type+"\">";
		
		/* add interface to template */
		template+="<interface>";
		for (var idx=0, length=properties.length; idx < length; ++idx){
			template+="<property type=\""+properties[idx].getAttribute('type')+"\"  name=\""+properties[idx].getAttribute('name')+"\" />";
		}
		/* copy events and operations */
		for (var idx=0, length= events.length; idx < length; ++idx){
			template+= Ext.cruise.client.Utility.serializeXML(events[idx]);
		}
		for (var idx=0, length=operations.length; idx < length; ++idx){
			template+= Ext.cruise.client.Utility.serializeXML(operations[idx]);
		}
		template+="</interface>";

		/* add rankingrules to template */
		template+="<rankingRules>";
		var alreadyAdded= [];
		if (rr_attribute!=undefined && rr_attribute!=null){
			var ruleIDs= rr_attribute.split(" ");
			for (var i=0; i< ruleIDs.length; ++i){
				var idx= parseInt(ruleIDs[i].charAt(ruleIDs[i].length-1));
				if (alreadyAdded.indexOf(idx)!=-1) continue;
				template+=Ext.cruise.client.Utility.serializeXML(rankingRules[idx]);
				alreadyAdded.push(idx);
			}
		}
		for (var j = rankingRules.length - 1; j >= 0; --j){
			var rule= rankingRules[j];
			if (rule.getAttribute('isGlobal')=='true' && alreadyAdded.indexOf(j)==-1){
				this.log.debug("[IntMan] Adding global ranking rule",rule.getAttribute("id"));
				template += Ext.cruise.client.Utility.serializeXML(rule);
			}
		};
		template+="</rankingRules>";

		
		/* add functionalities to template */
		for (var idx=0; idx < functionality.length; ++idx){
			template+= Ext.cruise.client.Utility.serializeXML(functionality[idx]);
		}
		if (isMCDL){
			template= Ext.cruise.client.Utility.removeNamespaceDeclarations(template);
		}
		
		/* append runtime and user specific information */
		integrationRequest+=template+"</template><runtime id=\""+Ext.cruise.client.Constants._RUNTIME_ID+"\"  version=\""+Ext.cruise.client.Constants._RUNTIME_VERSION+"\" /><userContext userID=\""+applicationManagerInstance.getUserID()+"\" contextServiceURL=\""+applicationManagerInstance.getAdaptationManager().getContextServiceURL()+"\"/>";
		/* append the blacklist */
		if (Ext.isArray(reqRespObj.ignore)){
			integrationRequest+="<exclude>";
			for (var idx = reqRespObj.ignore.length - 1; idx >= 0; --idx){
				integrationRequest+=reqRespObj.ignore[idx];
				if (idx!=0)
					integrationRequest+=" ";
			};
			integrationRequest+="</exclude>";
		}
		integrationRequest+="<maxCandidates>10</maxCandidates></integrationRequest>";
		
		// in case of MCDL we have to expand all QNames
		if (isMCDL){
			for (var attidx= 0; attidx< component.attributes.length; ++attidx){
				var att= component.attributes[attidx];
				if ("xmlns"==att.prefix){
					integrationRequest= integrationRequest.replace(new RegExp(att.localName+"\:","g"), att.nodeValue);
				}
			}
		}

		/* step 2: send the integration request to CoRe */
		var that= this;
		var xml= this.serviceAccess.buildSOAPEnvelope('<q0:getComponentsByTemplate><q0:integrationRequest><![CDATA['+integrationRequest+']]></q0:integrationRequest></q0:getComponentsByTemplate>');
		
		var xhr= utils.createRequestObj();
		xhr.open('POST',this.url, true);
		xhr.setRequestHeader("Content-Type","application/soap+xml");
		xhr.onreadystatechange= function(){
			if (xhr.readyState == 4 && xhr.status == 200) {
				var respxml = Ext.cruise.client.Utility.getXMLDOMFromXHR(xhr);
				if (respxml == null) 
					return;
				var result = Ext.cruise.client.Utility.getElementsByTagNameNS('ns:',Ext.cruise.client.Constants._CORE_NS_,'return',respxml)[0];
				if (result.getAttribute("xsi:nil") == 'true') {
					that.log.error('[IntMan] received empty candidate list for template (id=' + component.getAttribute('id') + "')");
					reqRespObj.error = true;
					that.triggerEvent('IntegrationError', reqRespObj);
				} else {
					var components = Ext.util.JSON.decode(result.firstChild.nodeValue);
					that.log.info("[IntMan] received a candidate list of size", components.components.length, "for template id=", component.getAttribute('id'));
					reqRespObj.candidateList = components;
				}
				if (!handler || typeof handler != "function")
					applicationManagerInstance.getComponentManager().handleCandidateList(reqRespObj);
				else {
					handler.call(scope||window, reqRespObj);
				}
			}
		}
		xhr.send(xml);
	},
	
	/**
	 * Query the SMCDL and the matching result for a given template and component-id (part of the RequestObject)
	 * 
 	 * @function
	 * @public
	 * @param {Object} reqRespObj the RequestObject
	 */
	getSMCDLMatch: function(reqRespObj){
		var template = reqRespObj.compConfig;
		
		var xml= this.serviceAccess.buildSOAPEnvelope('<soap:getSMCDLMatch><soap:templateID>'+
				template.getAttribute("id")+
				'</soap:templateID>'+
				'<soap:componentID>'+
				reqRespObj.id+
				'</soap:componentID></soap:getSMCDLMatch>', 'soap');
		
		var xhr= utils.createRequestObj();
		xhr.open('POST',this.url, true);
		xhr.setRequestHeader("Content-Type","application/soap+xml");
		xhr.onreadystatechange= function(){
			if (xhr.readyState==4 && xhr.status==200){
				var con = Ext.cruise.client.Constants;
				var respdoc = Ext.cruise.client.Utility.getXMLDOMFromXHR(xhr);
				var nodelist = Ext.cruise.client.Utility.getElementsByTagNameNS(
								con.BEANS_NS_IE,
								con.BEANS_NS,
								'smcdl', respdoc);
				
				if (nodelist.length == 1) {
					var result = nodelist[0];
					var match = Ext.cruise.client.Utility.getElementsByTagNameNS(con.BEANS_NS_IE,  
							con.BEANS_NS,  
							'matchingResult', respdoc); 
					
					var mcdl = Ext.cruise.client.Utility.parseXMLFromString(result.textContent);
					mcdl = mcdl.getElementsByTagName('smcd')[0];
					
					reqRespObj.setResponse(mcdl);
					reqRespObj.matchingResult = match;
				}else {
					reqRespObj.error= true;
				}
				applicationManagerInstance.getComponentManager().handleSMCDLMatch(reqRespObj);
			}
		};
		xhr.send(xml);
	},

	/**
	 * This operation waits until all pending AJAX calls that load scripts have completed. If there are 
	 * pending downloads (i.e. the script load object is not flagged as ready, see Ext.ux.integration.fetchScript) 
	 * it schedules its own re-execution. After all scripts have been loaded, the script text is appended to the 
	 * HTML elements created in Ext.ux.integration.addDependency(). Finally, Ext.ux.integration.processBindingJS() 
	 * is invoked (starting step 2, see documentation of the operation for details).
	 *
	 * @function
	 * @public
	 * @param {MCDLReqRespObject} reqRespObj an instance of class {@link Ext.cruise.client.MCDLReqRespObject}
	 * @param {Array} pendingScripts an array of ScriptLoadObject objects describing the scripts 
	 *                        that are being loaded
	 */
	postprocessScriptLoad : function(reqRespObject, pendingScripts) {
		if (pendingScripts == undefined || pendingScripts == null) {
			/*
			 * If no dependencies must be processed, go straight back to the processing of the MCDL, 
			 * and continue with the UI component/toolkit initialization phase.
			 */
			applicationManagerInstance.getComponentManager().processBindingJS(reqRespObject);
		}
		
		//wait for load completion
		var isComplete = true;
		var i;
		for (i=0; i<pendingScripts.length; i++) {
			isComplete = isComplete && pendingScripts[i].getReady();
		}
		
		//try again in 100 ms if there are still scripts pending are not yet finished
		if (!isComplete) {
			setTimeout(function() {
				try {
				applicationManagerInstance.getIntegrationManager().postprocessScriptLoad(reqRespObject, pendingScripts);
				}catch(E){applicationManagerInstance.getLog().fatal("[IntMan] load script:", E);}
			}, 100);
			return;
		}

		/*
		 * Go back to the processing of the MCDL. This time the dependencies are processed and we can 
		 * continue with the UI component/toolkit initialization phase.
		 */
		setTimeout(function() {
			//although the browser reports the script as completely ready, some additional delay seems to be necessary. e.g. for FireFox 
			applicationManagerInstance.getComponentManager().processBindingJS(reqRespObject);
		}, this.ADDITIONAL_WAITING_TIME);
	}
});

/**
 * @class Ext.cruise.client.ReferenceCounter
 * A reference counter class for values identified by keys. The reference counter stores the value corresponding to the key.
 * References are added with the addReference method. Values are only stored once for each key, i.e. if there is no value 
 * registered under the key passed to addReference. In all other cases, the reference counter is incremented.  
 * References are removed with the removeReference method using the key, decrementing the reference counter by 1. 
 * When the reference counter equals zero, the value stored under the key is deleted from the internal store of the reference counter. 
 * Attempts to remove non-existing references are ignored.
 *
 * @private
 */
Ext.cruise.client.ReferenceCounter= function() {
	/**
	 * @private
	 * The array used to store the key/value pairs. Values are stores as Ext.ux.integration.Reference objects.
	 */
	var refArray = new Array();
	this.refArray = refArray;
	
	/**
	 * @private
	 * @function
	 * Adds a reference. Values are only stored once for each key, i.e. there is no value 
	 * registered under the key. In all other cases, only the reference counter for the key 
	 * is incremented and the stored value will not be changed.
	 * @param {String} key the key under which the value is to be stored by the reference counter
	 * @param {Object} value the value to be stored 
	 */
	this.addReference = function(key, value, scriptLoad) {
		if (refArray[key] != undefined){ 
			refArray[key].counter += 1;
		} else {
			var newRef = new Ext.cruise.client.Reference(value);
			newRef.counter = 1;
			refArray[key] = newRef;
			refArray[key].scriptLoad= scriptLoad;
		}
	};
	
	/**
	 * @private
	 * @function
	 * Removes a reference to the value identified by the key by decrementing its reference counter. 
	 * If the reference counter equals zero, the value is deleted from the internal storage of the reference counter.
	 * @param {String} key the key identifying the reference to be removed 
	 */
	this.removeReference = function(key) {
		if (refArray[key] == undefined) return;
		if (refArray[key].counter != 0) refArray[key].counter -= 1;
		if (refArray[key].counter == 0) {
			refArray[key].value = undefined;
			refArray[key].scriptLoad = undefined;
		}
	};
	
	/**
	 * @private
	 * @function
	 * Gets the reference count for a key.
	 * @return The number of reference to the value stored under key or undefined if no value has been stored under the key before. 
	 */
	this.getReferenceCount = function(key) {
		if (refArray[key] == undefined) return undefined;
		return refArray[key].counter;
	};
	
	/**
	 * @private
	 * @function
	 * Gets the value stored for the key by the reference counter.
	 * @param {String} key the key identifying under which the value is registered 
	 * @return the value stored for the key 
	 */
	this.getReferenceValue = function(key) {
		if (refArray[key] == undefined) return undefined;
		return refArray[key].value;
	};
	
	this.getScriptLoad= function(key) {
		return refArray[key].scriptLoad;
	}
};

/** 
 * @private
 * @class Ext.cruise.client.Reference
 * This class is used internally by Ext.ux.ReferenceCounter to store a value together with its reference counter.
 * @param {Object} theValue the value object for which the reference is to be created   
 */
Ext.cruise.client.Reference = function(theValue) {
	var counter = 0;
	var value = theValue;
	this.value = value;
	this.counter = counter;
};

/**
 * @private
 * @class ScriptLoadObject
 * This class represents the set of parameters necessary to load script files. 
 * It is used by the integration manager to load script files referenced by the dependency elements in MCDL documents. 
 * @param {Object} config The configuration-object for this instance
 */
Ext.cruise.client.ScriptLoadObject = function(config) {
	//the URI of the script file
	var uri = config.uri;
	/*  A flag indicating the status of the script load from uri. */ 
	var ready = false;

	this.uri = uri;
	
	this.setReady = function() {
		ready = true;
	};
	
	this.getReady = function() {
		return ready;
	}
};