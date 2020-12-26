/**
 * @author <a href="mailto:stefan.pietschmann">Stefan Pietschmann</a>
 * @author Carsten Radeck
 * @author Gerald Hübsch 
 * @author Johannes Waltsgott
 * @class Ext.cruise.client.ComponentManager
 * 
 * This class is the central class for instantiating and initialising compnents:
 * Firstly, component definitions are read from the composition model. Then the Integration Manager is called to get the components code
 * - either by ID or template - and the received code is instantiated utilizing the binding information.
 * Finally, the components event handlers are subscribed and the components gets initialised.
 * 
 * Furthermore, the component manager provides functionality required to remove and exchange components at runtime.
 */
Ext.cruise.client.ComponentManager = Ext.extend(Object, {
	eventBroker: null,
	log: null,
	adaptMan: null,
	sac: null,
	intManager: null,
	coordinationManager: null,
	 /**
	  * @property components
	  * the internal datastructure holding information about the components
	  * a single entry is identified by the name of the component 
	  * and structured as follows
	  * <pre><code> 
{
	instance: ,		// the current instance shown in this placeholder
	proxy: ,		// proxy of current instance
	id: ,			// Id of the component
	isUIC: ,		// indicates whether this is an UI component
	functional: ,	// indicates if the component is in the state 'functional', i.e. initialized, rendered etc
	isExcludeDrop:,	// indicates whether the UI component supports no drag and drop at all
	rtid: ,			// the ID of the div element of this UIComponent
	alternatives: [	// array of alternative component, each one...
	{
		name: ,		// with its name
		id: ,		// and  ID 
	}],
	mcdl: ,			// DOMElement representing the MCDL
	compConfig: ,	// representation of the component in the composition model
	adapt: ,		// the encapsulating Ext.Panel for adaptability
	old_instance: ,	// temporary instance, for the purpose of exchanging two components
};
		</code></pre>
	  * @type Object
	  */
	components: null,
	
	mediationConfig: {},
	
	templateCodeUICLoader: null,
	simpleWrapperUICLoader: null,

	/**
	 * Constructor of the Component Manager
	 * @param {Object} logger an instance of the logger
	 * @param {Object} eventBroker an instance of the event broker
	 * @param {Object} intMan an instance of the integration manager
	 * @param {Object} adaptMan an instance of the adaptation manager
	 * @param {Object} sac an instance of the service access 
	 * @constructor
	 */
	constructor: function(logger, eventBroker, intMan, adaptMan, sac, coordinationManager){
		this.eventBroker = eventBroker;
		this.log = logger;
		// set up internal array
		this.components = {};
		this.intManager = intMan;
		this.adaptMan = adaptMan;
		this.sac = sac;
		this.coordinationManager= coordinationManager;
		this.templateCodeUICLoader = new Ext.cruise.client.TemplateCodeUICLoader(logger);
		this.simpleWrapperUICLoader = new Ext.cruise.client.SimpleWrapperUICLoader(logger);
		
		Ext.cruise.client.ComponentManager.superclass.constructor.call(this);
		this.log.debug('[CompMan] ComponentManager started.');
	},
	
	/**
	 * Resets this runtime component to enable the execution of a new application on the fly.
	 */
	reset: function(){
		for (var cid in this.components){
			if (this.components[cid].adapt) {
				var dz= this.components[cid].adapt.dragZone;
				this.components[cid].adapt.destroy();
				if (dz){
					dz.remove();
				}
			}
			var rtid= this.components[cid].rtid;
			try {
				this.removeComponent(cid, true);
			}catch(e){this.log.fatal(e);}
			
			if (rtid){
				var div= Ext.get(rtid);
				if (div){
					Ext.removeNode(div.dom);
				}
			}
		}
		
		delete this.components;
		delete this.mediationConfig;
		
		this.components= {};
		this.mediationConfig= {};
	},
	
	/**
	 * Serializes the components-element of the application's composition model.
	 * @return {String} the serialized composition model
	 */
	serializeComponentModel: function(){
		var res= "<components>";
		
		for (var id in this.components){
			var c= this.components[id];

			//if (c.compConfig && c.mcdl!=c.compConfig){
			//	res+= Ext.cruise.client.Utility.serializeXML(c.compConfig);
			//} else 
			if (c.mcdl){
				var mcdl= c.mcdl;
				res+="<component id=\""+c.id+"\" name=\""+mcdl.getAttribute('name')+"\" xsi:type=\""+Ext.cruise.client.Constants._CCM_NS_IE+(mcdl.getAttribute('isUI')=="true"?"UIComponent":"ServiceComponent");
				res+="\" isRemoveable=\"true\" isTemplate=\"false\">";
				
				var mcdl_props= mcdl.getElementsByTagName("property");
				for (var pi= 0; pi < mcdl_props.length; ++pi){
					var property= mcdl_props[pi];
					var split = property.getAttribute("type").split(':'); 
					var pt = Ext.cruise.client.Utility.lookupNamespaceURI(split[0], property) + split[1];
					var pname= property.getAttribute("name");
					
					// read property and serialize it
					var value= "";
					try {
					value= c.instance.getProperty(pname);
					}catch(e){}
					if (value!=undefined&&value!=null&& typeof value == "string")
						//value= Ext.cruise.client.Utility.maskString(value);
						value= escape(value);
					
					res+="<property name=\""+pname+"\" type=\""+pt+"\" value=\""+value+"\"  />";
				}

				var mcdl_evs= mcdl.getElementsByTagName("event");
				var mcdl_ops= mcdl.getElementsByTagName("operation");
				
				for (var ei= 0; ei < mcdl_evs.length; ++ei){
					var event= mcdl_evs[ei];
					
					res+="<event name=\""+event.getAttribute("name")+"\" ";
					var cbops = event.getElementsByTagName("callbackOperation");
					if (cbops.length==1){
						// build "xpath" for the reference mechanism in the composition model
						var cbn= cbops[0].getAttribute("name"), index=0;
						for (; index<mcdl_ops.length; ++index){
							if (mcdl_ops[index].getAttribute("name")==cbn){
								break;
							}
						}
						var path="//@conceptualModel/@components/@component[name='"+mcdl.getAttribute("name")+"']/@operation."+index;
						res+="callbackOperation=\""+path+"\" ";
					}
					res+=">";
					
					var eparams= event.getElementsByTagName("parameter");
					for(var epi=0; epi< eparams.length; ++epi){
						var eparam= eparams[epi];
						var split = eparam.getAttribute("type").split(':'); 
						var ept = Ext.cruise.client.Utility.lookupNamespaceURI(split[0], eparam) + split[1];
						res+="<parameter name=\""+eparam.getAttribute("name")+"\" type=\""+ept+"\"  />";
					}
					
					res+="</event>";
				}

				for (var oi= 0; oi < mcdl_ops.length; ++oi){
					var operation= mcdl_ops[oi];
					
					res+="<operation name=\""+operation.getAttribute("name")+"\" ";

					var revs = operation.getElementsByTagName("returnEvent");
					if (revs.length==1){
						// build "xpath" for the reference mechanism in the composition model
						var ren= revs[0].getAttribute("name"), index=0;
						for (; index<mcdl_evs.length; ++index){
							if (mcdl_evs[index].getAttribute("name")==cbn){
								break;
							}
						}
						var path="//@conceptualModel/@components/@component[name='"+mcdl.getAttribute("name")+"']/@event."+index;
						res+="returnEvent=\""+path+"\" ";
					}
					res+=">";

					var oparams= operation.getElementsByTagName("parameter");
					for(var opi=0; opi< oparams.length; ++opi){
						var oparam= oparams[opi];
						var split = oparam.getAttribute("type").split(':');
						var opt = Ext.cruise.client.Utility.lookupNamespaceURI(split[0], oparam) + split[1];
						res+="<parameter name=\""+oparam.getAttribute("name")+"\" type=\""+opt+"\"  />";
					}
					res+="</operation>";
				}
				res+="</component>";
			}
		}
		
		return res+ "</components>";
	},
	
	/** @private */
	getCurrentDragSource: function(){
		for(var id in this.components){
			if(this.components[id].currentDragSource)
				return this.components[id];
		}
	},
	/** @private */
	setCurrentDragSource: function(cid){
		var comp = this.components[cid];
		if(comp){
			comp.currentDragSource = true;
		}
	},
	/** @private */
	deleteCurrentDragSource: function(cid){
		var comp = this.components[cid];
		if(comp){
			comp.currentDragSource = false;
		}
	},
	
	/**
	 * Provides access to the Medation Config, i.e the data structure containing information
	 * about the interface of all integrated components viewed from perspective of the composition model
	 * and the necessary mappings to the component's interface. 
	 * @return {Object} the mediation config 
	 * @public
	 * @function
	 */
	getMediationConfig: function(){
		return this.mediationConfig;
	},
	
	/**
	 * Delivers the DOM Element representing the SMCDL of the integrated component with the specified id. 
	 * 
	 * @param {String} cid the component
	 * @return {Document} DOM representation of the SMCDL for a component
	 * @public
	 * @function
	 */
	getSMCDL : function(cid){
		var entry= this._getEntry(cid);
		if (entry!=undefined && entry!=null){
			return entry.mcdl;
		}
		return null;
	},
	
	/**
	 * Invokes the operation of a specific component with given parameters. If necessary, casts are executed by utilizing the Mediator.  
	 * @param {String} component the id
	 * @param {String} operation the operation name
	 * @param {Object} parameters the parameters (associative data structure)
	 * @public
	 * @function
	 */
	invokeOperation: function(component, operation, parameters){
		if (component==undefined|| component== null || operation==undefined||operation==null || parameters==undefined || parameters==null){
			this.log.error('[CompMan] Invalid input', component, operation, parameters);
			return;
		}

		var cinst= this.getComponentInstance(component);
		if (!cinst) return;

		if (!this.mediationConfig[component]){// workaround due to referencing mechanism based on names instead of ids
			component= this._getEntry(component).compConfig.getAttribute("id");
		}
		// variable model_params is an array while we have to build a associative data structure for the message's body
		var model_params= this.mediationConfig[component].operations[operation].parameters;
		for(var idx=0; idx < model_params.length; ++idx){
			var curr_param= model_params[idx];
			if (curr_param.type != curr_param.type_component) {
				this.log.debug("[CompMan] Need a parameter cast to invoke operation "+operation);
				var cidx= curr_param.index_component;
				// determine the corresponding parameter's name
				var _ops= this.getSMCDL(component).getElementsByTagName("operation");
				for (var _opsidx=0; _opsidx < _ops.length; ++_opsidx){
					if (_ops[_opsidx].getAttribute("name")== operation){
						cidx= _ops[_opsidx].getElementsByTagName("parameter")[cidx].getAttribute("name");
						break;
					}
				}
				parameters[cidx]= applicationManagerInstance.getMediator().convertSynch(parameters[cidx], curr_param.type, curr_param.type_component);
			}
		}
		this.log.debug("[CompMan] Invoking",component+"."+operation);
		try {
			var msg= new Ext.cruise.client.Message();
			msg.setBody(parameters);
			cinst.invokeOperation(operation, msg);
		}catch(EXE){
			this.log.error("[CompMan] Error while invoking",component+"."+operation);
			this.log.error(EXE);
		}
	},

	/**
	 * Instructs the Component Manager to commit the ongoing exchange of components. 
	 * It finally disposes and removes the old component.
	 * @param {String} cid the ID of the component
	 * @public
	 * @function
	 */
	commitExchange: function(cid){
		this.log.debug('[CompMan] Committing exchange for component',cid);
		var newInst= this.components[cid].instance;
		var oldInst= this.components[cid].old_instance;
		if (!oldInst){
			this.log.error('[CompMan] There is nothing to commit.');
		}else {
			this.log.debug('[CompMan] Disposing old instance in container',cid);
			var uic= this.components[cid].old_instance;
			
			try {
				 uic.dispose();
			} catch (e) {
				this.log.error("[CompMan] ",e);
			}
			
			delete this.components[cid].old_instance;
			this.components[cid].old_instance= undefined;
		}
	},
	
	/**
	 * Returns all unwired operations for one specific component
	 * 
	 * @param {String} cid the component id
	 * @return {Array} array of string representing operation names
	 */
	getUnwiredOperations: function(cid){
		var mcdl= this.getSMCDL(cid);
		
		var wired= this.eventBroker.listHandlers(cid);	
		var unwired= [];
		var operations= mcdl.getElementsByTagName("operation");
		for (var idx=0; idx < operations.length; ++idx){
			var oname= operations[idx].getAttribute("name");
			if (wired.indexOf(oname)==-1){
				unwired.push(oname);
			}
		}
		
		return unwired;	
	},

	/**
	 * Instructs the Component Manager to abort the ongoing exchange of components. 
	 * Therefore it disposes and removes the new component and sets the proxy's reference to the old one.
	 * @param {String} cid the ID of the component
	 * @public
	 * @function
	 */
	abortExchange: function(cid){
		this.log.debug('[CompMan] Aborting exchange of component ',cid);
		var newInst= this.components[cid].instance;
		var oldInst= this.components[cid].old_instance;
		if (newInst && oldInst){
			try{
				newInst.dispose();
			}catch(exe){}
			
			this.components[cid].proxy.setComponentInstance(oldInst);
			this.components[cid].instance= oldInst;
			this.components[cid].old_instance= undefined;
		}
	},
	
	/**
	 * @param {String} cid the component id
	 * @return true if the component with the given id is integrated, false otherwise
	 */
	componentExists: function(cid){
		return this.components[cid]!=undefined;
	},

	/**
	 * Get the instance for a component id.
	 * @param {String} id the id of the component
	 * @public
	 * @function
	 * @return {Object} the instance object of the component
	 */
	getComponentInstance: function(id){
		var entry= this._getEntry(id);
		if (entry!=undefined && entry!=null){
			return entry.instance;
		}
	},

	/**
	 * Get the representation of a component in the composition model.
	 * @param {String} id the id of the component
	 * @public
	 * @function
	 * @return {Node} the representation of the <component> tag
	 */
	getComponentConfig: function(id){
		var entry= this._getEntry(id);
		if (entry!=undefined && entry!=null){
			return entry.compConfig;
		}
	},
	
	/** @private */
	_getEntry: function(str){
		var cps= this.components;
		if (cps[str] != undefined) {
			return cps[str];
		}
		this.log.warn('[CompMan] Could not find component with id \'' + str + '\'.');
		for (var entry in cps){
			if (Ext.isFunction(cps[entry])) continue;
			if (cps[entry].compConfig.getAttribute('name') == str){
				this.log.warn('[CompMan] Found component with name \'' + str + '\' instead.');
				return cps[entry];
			}
		}
	},
	
	/** @private */
	_getComponentName: function(cid){
		var c= this.components[cid];
		if (c!=undefined){
			if (c.compConfig)
				return c.compConfig.getAttribute("name");
			if (c.mcdl)
				return c.mcdl.getAttribute("name");
		}
		return null;
	},
	
	/**
	 * Get the tsr-provided panel of the UI component with the given ID.
	 * @param {String} id
	 * @return {Ext.Panel} the tsr-provided panel of the UI component with the given ID.
	 */
	getAdaptabilityPanel: function(id){
		var entry= this._getEntry(id);
		if (entry!=undefined && entry!=null){
			return entry.adapt;
		}
	},
	
	/**
	 * @return {Array} array of all 
	 */
	getAllUIComponents: function(){
		var all = new Array();
		for(var id in this.components){
			if(this.isUIC(id))
				all.push(this.getAdaptabilityPanel(id));
		}
		return all;
	},
	
	/**
	 * @private
	 * @param {String} renderTargetId
	 */
	getComponentForRenderTarget: function(renderTargetId){
		for(var id in this.components){
			if(this.components[id].rtid == renderTargetId)
				return this.components[id];
		}
	},
	
	/**
	 * Get the name of component with the given ID.
	 * @param {String} id
	 * @return {String} component's name
	 */
	getComponentNameByID: function(cid){
		if (this.components[cid]!=undefined && this.components[cid]!=null){
			return this.components[cid].mcdl.getAttribute('name');
		}
	},
	
	/**
	 * @public
	 * @function
	 * @param {String} id
	 * @return {boolean} true if specified component is an UI component, false otherwise
	 */
	isUIC: function(id){
		var entry = this._getEntry(id);
		if (entry!=undefined && entry!=null){
			return entry.isUIC;
		}
		return false;
	},
	
	isReady: function(id){
		var entry = this._getEntry(id);
		if (entry!=undefined && entry!=null){
			return entry.functional;
		}
		return false;
	},
	
	/**
	 * Creates and returns a proxy for the component specified by the given ID if there ist none. 
	 * Otherwise the existing one is returned.
	 * 
	 * @private
	 * @function
	 * @param {String} cid The ID of the component for which a proxy should be created.
	 * @return {Ext.cruise.client.CommunicationProxy} the proxy
	 */
	createProxy: function(cid){
		if ( !cid ){
			this.log.error('[CompMan] Error creating proxy: component id ('+cid+') undefined');
			return undefined;
		}
		var c= this.getComponentInstance(cid);
		if (!c){
			this.log.error('[CompMan] Error creating proxy: unknown component id ('+cid+').');
			return undefined;
		}
		//if (this.components[cid].proxy){
		//	this.log.warn('[CompMan] No proxy created for component (id='+cid+'): Proxy already exists.');
		//}else {
		if (this.components[cid].proxy==undefined||this.components[cid].proxy==null){
			this.log.info('[CompMan] Creating new proxy for component with id \''+cid+'\'.');
			this.components[cid].proxy= new Ext.cruise.client.CommunicationProxy(c,cid,this.eventBroker, this.log);
		}
		return this.components[cid].proxy;
	},
	
/*
 * %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
 * some utility methods for publish-subscribe
 * %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
 */
	/**
	 * Register a publisher-component of event <code>eventName</code> on channel <code>channel</code>.
	 * @public
	 * @function
	 * @param {String} cid The ID of the component
	 * @param {String} channel The ID of the channel
	 * @param {String} eventName The name of the event
	 */
	addPublisher: function(cid, channel, eventName, callback){
		if (!cid || !channel || !eventName) return;

		var proxy= this.createProxy(cid);
		if (!proxy) return;
		
		var callId = null;
		if(callback){
			callId = this.generateUniqueCallbackId();
		}
	
		//proxy.registerAsSink(eventName);
		this.eventBroker.addEventToChannel(eventName, undefined, channel, cid, callId);
		if(callId) {
			this.eventBroker.subscribe(cid, callback, undefined, channel, proxy.notify,proxy, callId);
			proxy.addOperationMapping(channel, callback);
		}
	},
	
	/**
	 * Subscribe a component proxy on channel 'channel' and map the events to the compoent method 'opName'.
	 * It is assumed that the handler-function is in the scope of the component-instance.
	 * @public
	 * @function
	 * @param {String} cid The ID of the component
	 * @param {String} channel The ID of the channel
	 * @param {String} opName The name of the handler-function for the channel in scope of the component-instance bound to the proxy
	 */
	addSubscriber: function(cid, channel, opName, returnEvent){
		if (!cid || !channel || !opName) return;
		
		var proxy= this.createProxy(cid);
		if (!proxy) return;

		if(returnEvent)
			this.eventBroker.addEventToChannel(returnEvent, undefined, channel, cid);
		
		this.eventBroker.subscribe(cid, opName, undefined, channel, proxy.notify,proxy);
		//this.eventBroker.subscribe(undefined, undefined, channel, proxy.notify, proxy, undefined);
		proxy.addOperationMapping(channel, opName);
	},
	
	/** @private */
	generateUniqueCallbackId: function(){
		function getRandomNumber(range)
		{
			return Math.floor(Math.random() * range);
		}
		
		function getRandomChar()
		{
			var chars = "0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ";
			return chars.substr( getRandomNumber(62), 1 );
		}
		
		function randomID(size)
		{
			var str = "";
			for(var i = 0; i < size; i++)
			{
				str += getRandomChar();
			}
			return str;
		}
		
		return randomID(10);
	},
	
	/**
	 * Unregisters the component specified by its id as a publisher of the event 'eventName' on channel 'channel'
	 * @public
	 * @function
	 * @param {String} cid The ID of the component
	 * @param {String} channel The ID of the channel
	 * @param {String} eventName The name of the event
	 */
	removePublisher: function(cid, channel, eventName){
		if (!cid || !channel || !eventName) return;

		var proxy= this.createProxy(cid);
		if (!proxy) return;

		//proxy.unregisterAsSink(eventName);

		this.eventBroker.removeEventFromChannel(eventName, channel);
	},
	/**
	 * Unregisters the component specified by its id as a subscriber of events on channel 'channel'
	 * @public
	 * @function
	 * @param {String} cid The ID of the component
	 * @param {String} channel The ID of the channel
	 * @param {String} operation The name of the handler (optional, if not set all operations are removed)
	 */
	removeSubscriber: function(cid, channel, operation){
		if (!cid || !channel) return;
		var proxy= this.createProxy(cid);
		if (!proxy) return;

		proxy.removeOperationMapping(channel, operation);
		if (!proxy.listensOn(channel)){
			this.eventBroker.unsubscribe(channel, proxy.notify, proxy);
		}
	},

/*
 * %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
 * %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%END%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
 * %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
 */

	/**
	 * This routine must be called directly after the HTML document containing component placeholders has been completely loaded by the browser. It
	 * initializes the reference counter, collects all placeholder scripts in the HTML document, extracts the ComponentConfig binding elements and
	 * initiates the loading of the MCDL bindings referenced therein.
	 * 
	 * @param {Array} components Array of all DOM representation of components in this application
	 * @public
	 * @function
	 */
	initializePage: function(components){
		//initialize the reference counter
		this.intManager.initializeReferenceCounter();
		for (var idx=0; idx < components.length; ++idx){
			var component= components[idx];

			if (component.getAttribute("isTemplate")=="true"){
				this.getByTemplate(component);
			}else {
				if (component.getAttribute("isExchangeable") == "true"){
					this.getExchangeableById(component);
				}else
					this.getByID(component);
			}
		}
	},
	
	/**
	 * Starts a special workflow for integrating an exchangeable component by ID.
	 * @param {Element} component the representation in the composition model
	 * @public
	 * @function
	 */
	getExchangeableById: function(component){
		var id= component.getAttribute("id");
		this.log.debug("[CompMan] Getting", id,"(exchangeable) by ID.");
		
		var result = new Ext.cruise.client.MCDLReqRespObject({
			compConfig: component,
			id: id
		});
		result.exchange= true;
		result.name = component.getAttribute('name');
		
		this.intManager.fetchSMCDLByTemplate(result);
	},
	
	/**
	 * Starts the workflow for integrating a component by ID.
	 * @param {Element} component the representation in the composition model
	 * @public
	 * @function
	 */
	getByID: function(component){
		var id= component.getAttribute("id");
		this.log.debug("[CompMan] Getting", id,"by ID.");
		
		// detect logic components (Split/Join) and instantiate the corresponding API classes
		if (id.indexOf("http://inf.tu-dresden.de/cruise/logic/")==0){
			this.importSplitterJoiner(component, id);
			return;
		}

		var result = new Ext.cruise.client.MCDLReqRespObject({
			compConfig: component,
			id: id
		});
		result.name = component.getAttribute('name');
		
		this.intManager.fetchSMCDLByID(result);
	},

	/**
	 * Starts the workflow for integrating a component by template.
	 * @param {Element} component the representation in the composition model
	 * @public
	 * @function
	 */
	getByTemplate: function(component){
		var id= component.getAttribute("id");
		this.log.debug("[CompMan] Getting ", id,"by template.");
		
		var result = new Ext.cruise.client.MCDLReqRespObject({
			compConfig: component,
			id: id
		});
		result.tid= id;
		result.name= component.getAttribute('name');

		this.intManager.fetchSMCDLByTemplate(result);
	},
	
	/**
	 * Processes the candidate list received after the invocation of the CoRe's method 'getComponentsByTemplate'.  
	 * @param {Ext.cruise.client.MCDLReqRespObject} reqRestObj the MCDLReqRespObject used during communication with the CoRe
	 * @public
	 * @function
	 */
	handleCandidateList: function(reqRespObj){
		if (reqRespObj.error==true) {
			this.log.debug("[CompMan] Failed receiving candidate list for template", id);
			return;
		}
		var components= reqRespObj.candidateList.components;
		
		if (components.length > 0) {
			if (reqRespObj.exchange == true) {
				var head = components.shift();
				// store the id of the selected candidate
				reqRespObj.id = head.id;
				reqRespObj.alternatives = components;
				if (reqRespObj.currID!=undefined&&reqRespObj.currID!=null)
					reqRespObj.alternatives.push({ 'id': reqRespObj.currID});
			} else {
				var head = components.shift();
				// store the id of the selected candidate
				reqRespObj.id = head.id;
				reqRespObj.alternatives = components;
			}
			delete reqRespObj.candidateList;
			
			this.intManager.getSMCDLMatch(reqRespObj);
		} else {
			this.log.fatal("[CompMan] No suitable components found for template=",reqRespObj.id);
			var msg = new Ext.cruise.client.Message();
			msg.setName('IntegrationError');
			msg.setBody(reqRespObj);
			this.eventBroker.publish(msg);
		}
	},

	/**
	 * Processes the SMCDL and MatchingResult received after the invocation of the CoRe's method 'getMCDLMatch'.  
	 * @param {Ext.cruise.client.MCDLReqRespObject} reqRestObj the MCDLReqRespObject used during communication with the CoRe
	 * @public
	 * @function
	 */
	handleSMCDLMatch: function(reqRespObj){
		if (reqRespObj.error==true) {
			this.log.debug("[CompMan] Failed receiving SMCDL and MatchingResult for template", reqRespObj.id);
			//if (reqRespObj.exchange==true){
			//	this.log.debug("[CompMan] retrying by getting components by template.");
			//}
			return;
		}
		
		var config= this.generateMediationConfigTemplate(reqRespObj.compConfig, reqRespObj.response, reqRespObj.matchingResult[0]);
		this.mediationConfig[reqRespObj.tid] = config;
		
		this.processDependenciesJS(reqRespObj);
	},

	/**
	 * Queries the SMDL for any declared transformation elements, parses the information and stores them in a JSON object.  
	 *  
	 * @param {Document} mcdl the DOM representation of the SMCDL
	 * @return {Object} a object containing information about declared transformations
	 * @function
	 * @private
	 */
	_handleTransformations: function(mcdl){
		var trafo_config=null;
		
		var trafos= mcdl.getElementsByTagName('transformation');
		var trafos_count= trafos.length;
		if (trafos_count > 0){
			trafo_config= {};
			var trafo;
			for (var idx = 0; idx < trafos_count; ++idx) {
				trafo = trafos[idx];
				var isToInternal = (trafo.getAttribute('xsi:type')== 'FromStdGroundingTransformation');
				
				/* step 1: parse the definition of the transformation */
				var definition= {};
				var temp= trafo.getElementsByTagName('stylesheet');
				if (temp.length == 1) {
					definition.xslt = Ext.cruise.client.Utility.parseXMLFromString(temp[0].textContent);
				}else {
					temp= trafo.getElementsByTagName('stylesheetLocation');
					if (temp.length==1){
						definition.xslt_url= temp[0].textContent;
					} else {
						temp= trafo.getElementsByTagName('code');
						if (temp.length==1){
							definition.code= temp[0].textContent;
						}
					}
				}
				
				/* step 2: parse the references */
				/* handle type references */
				temp= trafo.getElementsByTagName('typeReference');
				if (temp.length==1){
					var typeRef= temp[0];
					// expand QName
					var split = typeRef.getAttribute('type').split(':'); 
					var type = Ext.cruise.client.Utility.lookupNamespaceURI(split[0], typeRef) + split[1];
					if (!trafo_config.byType)
						trafo_config.byType={};
					if (!trafo_config.byType[type])
						trafo_config.byType[type]={};
					if (isToInternal)
						trafo_config.byType[type].set = definition;
					else
						trafo_config.byType[type].get = definition;
				}
				/* handle operation parameter references */
				if (isToInternal){
					if (!trafo_config.byOperation)
						trafo_config.byOperation={};
					temp= trafo.getElementsByTagName('parameterReference');
					for (var opidx = temp.length - 1; opidx >= 0; --opidx){
						var opTrafo= temp[opidx];
						var paramName = opTrafo.getAttribute("parameter");
						
						var targetOps= opTrafo.getElementsByTagName("operation");
						for (var toidx = targetOps.length - 1; toidx >= 0; --toidx){
							var targetOp= targetOps[toidx].textContent;
							
							if (trafo_config.byOperation[targetOp]==undefined)
								trafo_config.byOperation[targetOp]= {};
							var obj=trafo_config.byOperation[targetOp];
							
							if (obj[paramName]==undefined){
								obj[paramName]={};
							}
							obj[paramName]= definition;
						};
					};
				}else {
				/* handle event parameter references */
					if (!trafo_config.byEvent)
						trafo_config.byEvent={};
					temp= trafo.getElementsByTagName('parameterReference');
					for (var opidx = temp.length - 1; opidx >= 0; --opidx){
						var opTrafo= temp[opidx];
						var paramName = opTrafo.getAttribute("parameter");
						
						var targetEvents= opTrafo.getElementsByTagName("event");
						for (var teidx = targetEvents.length - 1; teidx >= 0; --teidx){
							var targetEvent= targetEvents[teidx].textContent;
							
							if (trafo_config.byEvent[targetEvent]==undefined)
								trafo_config.byEvent[targetEvent]= {};
							var obj=trafo_config.byEvent[targetEvent];
							
							if (obj[paramName]==undefined){
								obj[paramName]={};
							}
							obj[paramName]= definition;
						};
					};
				}
				/* handle property reference elements */
				temp= trafo.getElementsByTagName('propertyReference');
				if (temp.length>0){
					if (!trafo_config.byProperty)
						trafo_config.byProperty={};
					for (var v = temp.length - 1; v >= 0; --v){
						var propTrafo= temp[v];
						var propname= propTrafo.getAttribute("property");
						
						if (trafo_config.byProperty[propname]==undefined)
							trafo_config.byProperty[propname]= {};
						var obj=trafo_config.byProperty[propname];
						
						if (isToInternal)
							obj.set= definition;
						else
							obj.get= definition;
					};
				}
			}
		}else {
			this.log.debug("[CompMan] No transformations declared.");
		}
		return trafo_config;
	},
	
	/**
	 * Generates the interface information including mediation specific data, like different orders of parameters, operation names
	 * different types and necessary transformations for properties and parameters.
	 * 
	 * @function
	 * @private
	 * @param {Element} template
	 * @param {Document} mcdl
	 * @param {Element} matchingresult
	 */
	generateMediationConfigTemplate: function(template, mcdl, matchingresult){
		var t0= (new Date()).getTime();
		var wrapperconfig= {};
		
		var con= Ext.cruise.client.Constants;
		var propertyMappings= Ext.cruise.client.Utility.getElementsByTagNameNS(con.BEANS_NS_IE, con.BEANS_NS, 'propertymapping', matchingresult);
		var propertyMappings_count = propertyMappings.length;

        var operationMappings = Ext.cruise.client.Utility.getElementsByTagNameNS(con.BEANS_NS_IE, con.BEANS_NS, 'operationmapping', matchingresult);
        
        var eventMappings = Ext.cruise.client.Utility.getElementsByTagNameNS(con.BEANS_NS_IE, con.BEANS_NS, 'eventmapping', matchingresult);
		
		var t_events= template.getElementsByTagName('event');
		var t_operations= template.getElementsByTagName('operation');
		
		var transformation_config= this._handleTransformations(mcdl) || {};

		wrapperconfig.properties= {};
		wrapperconfig.events= {};
		var iface= mcdl.getElementsByTagName("interface")[0];
		var c_properties= iface.getElementsByTagName('property'), c_properties_count= c_properties.length;
		var property, property_mapsTo;
		for (var idx=0; idx < c_properties_count; ++idx){
			property= c_properties[idx];
			property_mapsTo="";

			var pm, pm_children;
			for(var m=0; m < propertyMappings_count; ++m){
				pm= propertyMappings[m];
				try {
					pm_children= pm.children;
					if (!pm_children){
						pm_children= pm.childNodes;
					}
					if (pm_children[0].firstChild.nodeValue == property.getAttribute('name')) {
						property_mapsTo = pm_children[1].firstChild.nodeValue;
						break;
					}
				}catch(e){
					this.log.error("[CompMan]",e);
				}
			}
			/* expand the QName of the type */
			var split= property.getAttribute('type').split(':');
			var type= Ext.cruise.client.Utility.lookupNamespaceURI(split[0], property) + split[1];
			var name_compo= property.getAttribute('name');
			var parameters= [{
					'index_component': 0,
					'type' : type,
					'type_component' : type,
					'name' : name_compo
				}];
			
			wrapperconfig.properties[property_mapsTo]= {
				'name': name_compo,
				'parameters' : parameters
			}
			
			//add for every property the mediation info for an event because of sync
			var eventName = name_compo + 'Changed';
			wrapperconfig.events[eventName]= {
				'name': eventName,
				'parameters': parameters
			}
			
			/* apply transformation definitions to correct properties */
			if (transformation_config.byType && transformation_config.byType[type]!=undefined){
				Ext.applyIf(wrapperconfig.properties[property_mapsTo], transformation_config.byType[type]);
			}
			if (transformation_config.byProperty && transformation_config.byProperty[name_compo]!=undefined){
				Ext.applyIf(wrapperconfig.properties[property_mapsTo], transformation_config.byProperty[namecompo]);
			}
		}
		try {
			/* generate the mediation config for all operations and events */
			wrapperconfig.operations = {};
			this._handleOperationEvent(iface.getElementsByTagName('operation'), wrapperconfig.operations, t_operations, operationMappings, transformation_config, true);

			this._handleOperationEvent(iface.getElementsByTagName('event'), wrapperconfig.events, t_events, eventMappings, transformation_config, false);
		} catch (e) {
			this.log.error("[CompMan]",e);
		}


		wrapperconfig.needsWrapper= true;
		this.log.debug('Generating mediationConfig(template) took',+new Date()-t0);
		return wrapperconfig;
	},
	
	/**
	 * handle events and operations. called from 'generateMediationConfigTemplate'
	 * @private
	 */
	_handleOperationEvent: function(c_operations, wrapperElement, t_operations, operationMappings, transformation_config, isOperation){
		var operationMappings_count= operationMappings.length;
		var t_operations_count= t_operations.length;
		var c_operations_count= c_operations.length;
		var operation, operation_mapsTo, num_param_mappings;
		for (var oidx=0; oidx < c_operations_count; ++oidx){
			operation= c_operations[oidx];
			operation_mapsTo="";
			num_param_mappings=0;
			var operation_name= operation.getAttribute("name");
			var pm, pm_children;
			/* interpret corresponces */
			for(var m=0; m < operationMappings_count; ++m){
				pm= operationMappings[m];
				pm_children= pm.children;
				if (!pm_children){
					pm_children= pm.childNodes;
				}
				if (pm_children[0].firstChild.nodeValue == operation_name) {
					operation_mapsTo = pm_children[1].firstChild.nodeValue;
					num_param_mappings = pm_children.length-2;
					break;
				}
			}
			this.log.debug("[CompMan] Template:",operation_mapsTo,"component:",operation_name);
			
			var matching_operation_template;
			for(var tidx=0, tmax= t_operations_count; tidx < tmax; ++tidx){
				var t_operation= t_operations[tidx];
				if (t_operation.getAttribute('name') == operation_mapsTo){
					matching_operation_template= t_operation;
					break;
				}
			}
			
			
			var t_operation_params = matching_operation_template.getElementsByTagName('parameter');
			var t_param, t_param_name;
			var t_operation_params_count= t_operation_params.length;
			var parameters= [];
			
			for (var t = 0; t < t_operation_params_count; ++t) {
				t_param = t_operation_params[t];
				t_param_name= t_param.getAttribute('name');
				var param_mapsTo = null;
				var m, p_mapping;
				for (m = 0; m < num_param_mappings; ++m) {
					p_mapping = pm.childNodes[m+2];
					var p_mapping_children= p_mapping.children;
					if (!p_mapping_children){
						p_mapping_children= p_mapping.childNodes;
					}
					if (p_mapping_children[1].firstChild.nodeValue == t_param_name) {
						param_mapsTo = p_mapping_children[0].firstChild.nodeValue;
						break;
					}
				}
				this.log.debug("[CompMan] Parameter template:",t_param_name,"component:",param_mapsTo);


				var o_params = operation.getElementsByTagName('parameter'), o_params_count= o_params.length;
				var o_param;
				var idx;
				for (idx = 0; idx < o_params_count; ++idx) {
					o_param= o_params[idx];
					if (o_param.getAttribute('name') == param_mapsTo) {
						break;
					}
				}
				if (idx==o_params_count) {
					this.log.debug('[Wrapper] parameter',t_param_name,'has no mapping.');
					parameters[t]= {
						'index_component': -1,
						'type' : t_param.getAttribute('type'),
						'type_component' : t_param.getAttribute('type'),
						'name' : t_param_name
					}
				} else {
					/* expand the type's QName */
					var split= o_param.getAttribute('type').split(':');
					var type= Ext.cruise.client.Utility.lookupNamespaceURI(split[0], o_param)+split[1];
					/* store param-infos */
					parameters[t]= {
						'index_component': idx,
						'type' : t_param.getAttribute('type'),
						'type_component' : type,
						'name' : o_param.getAttribute('name')
					}
					
					/* apply transformation definitions to correct parameters of operation/event */ 
					if (transformation_config.byType && transformation_config.byType[type]!=undefined){
						var tdef= transformation_config.byType[type];
						if (isOperation==true && tdef.set) {
							Ext.applyIf(parameters[t], tdef.set);
						}
						if (isOperation==false && tdef.get) {
							Ext.applyIf(parameters[t], tdef.get);
						}
					}
					if (isOperation==true && transformation_config.byOperation && transformation_config.byOperation[operation_mapsTo]!=undefined){
						Ext.applyIf(parameters[t], transformation_config.byOperation[operation_mapsTo]);
					}
					if (isOperation==false && transformation_config.byEvent && transformation_config.byEvent[operation_mapsTo]!=undefined){
						Ext.applyIf(parameters[t], transformation_config.byEvent[operation_mapsTo]);
					}
				}
			}
			
			wrapperElement[operation_mapsTo]= {
				'name': operation_name,
				'parameters': parameters
			}
		}
	},
	
	/**
	 * Generates the interface information including mediation specific data, i.e necessary transformations for properties and parameters.
	 * 
	 * @function
	 * @private
	 * @param {Document} mcdl the component description as DOM
	 */
	generateMediationConfig: function(mcdl){
		var t0= +new Date();
		var transformation_config= this._handleTransformations(mcdl);
		var wrapperconfig= {
			'properties': {},
			'events': {},
			'operations': {},
			'dragsources': {},
			'needsWrapper': transformation_config!=null
		}
		if (transformation_config==null)
			transformation_config= {};
		
		var iface= mcdl.getElementsByTagName("interface")[0];

		/* iterate all properties */
		var c_properties= iface.getElementsByTagName('property');
		for (var idx=0; idx < c_properties.length; ++idx){
			var property= c_properties[idx];
			var propertyName= property.getAttribute('name');
			var split= property.getAttribute('type').split(':');
			var type= Ext.cruise.client.Utility.lookupNamespaceURI(split[0], property)+split[1];
			var parameters= [{
					'index_component': 0,
					'type' : type,
					'type_component' : type,
					'name' : propertyName
				}];
				
			wrapperconfig.properties[propertyName]= {
				'name': propertyName,
				'parameters':parameters
			}
			
			/* 
			 * apply transformation definitions for correct properties
			 */
			if (transformation_config.byType && transformation_config.byType[type]!=undefined){
				Ext.applyIf(wrapperconfig.properties[propertyName], transformation_config.byType[type]);
			}
			if (transformation_config.byProperty && transformation_config.byProperty[propertyName]!=undefined){
				Ext.applyIf(wrapperconfig.properties[propertyName], transformation_config.byProperty[propertyName]);
			}
			
			//add for every property the mediation info for an event because of sync
			var eventName = propertyName + 'Changed';			
			if (transformation_config.byType&&transformation_config.byType[type]!=undefined){
				var tdef= transformation_config.byType[type];
				if (tdef.get) {
					Ext.applyIf(parameters[idx], tdef.get);
				}
			}
			if (transformation_config.byEvent && transformation_config.byEvent[ename]!=undefined){
				Ext.applyIf(parameters[0], transformation_config.byEvent[ename][eventName]);
			}
			
			wrapperconfig.events[eventName]= {
				'name': eventName,
				'parameters': parameters
			}
		}
		
		/* handle dragsources */
		var d_source= iface.getElementsByTagName('dragSource');
		for (var didx=0, d_source_count= d_source.length; didx < d_source_count; ++didx){
			var drag= d_source[didx];
			var dname= drag.getAttribute("name");
			
			var d_params = drag.getElementsByTagName('parameter'), d_params_count= d_params.length;
			var parameters= [];
			for (var idx = 0; idx < d_params_count; ++idx) {
				var d_param = d_params[idx];
				/* expand the type's QName */
				var split= d_param.getAttribute('type').split(':');
				var type= Ext.cruise.client.Utility.lookupNamespaceURI(split[0], d_param)+split[1];
				/* store parameter infos */
				parameters[idx]= {
					'index_component': idx,
					'type' : type,
					'type_component' : type,
					'name' : d_param.getAttribute('name')
				}
				
			}
			wrapperconfig.dragsources[dname]= {
				'name': dname,
				'parameters':parameters
			}
		}

		/* handle operations */
		var c_operations= iface.getElementsByTagName('operation');
		for (var oidx=0, c_operations_count= c_operations.length; oidx < c_operations_count; ++oidx){
			var operation= c_operations[oidx];
			var oname= operation.getAttribute("name");
			
			var o_params = operation.getElementsByTagName('parameter'), o_params_count= o_params.length;
			var parameters= [];
			for (var idx = 0; idx < o_params_count; ++idx) {
				var o_param = o_params[idx];
				var o_param_name= o_param.getAttribute('name');
				/* expand the type's QName */
				var split= o_param.getAttribute('type').split(':');
				var type= Ext.cruise.client.Utility.lookupNamespaceURI(split[0], o_param)+split[1];
				/* store parameter infos */
				parameters[idx]= {
					'index_component': idx,
					'type' : type,
					'type_component' : type,
					'name' : o_param_name
				}
				/* apply transformation definitions for parameters of operations */
				if (transformation_config.byType&&transformation_config.byType[type]!=undefined){
					var tdef= transformation_config.byType[type];
					if (tdef.set) {
						Ext.applyIf(parameters[idx], tdef.set);
					}
				}
				if (transformation_config.byOperation && transformation_config.byOperation[oname]!=undefined){
					Ext.applyIf(parameters[idx], transformation_config.byOperation[oname][o_param_name]);
				}

			}
			
			wrapperconfig.operations[oname]= {
				'name': oname,
				'parameters': parameters
			}
		}
		
		/* handle events */
		var c_events= iface.getElementsByTagName('event');
		for (var eidx=0, c_events_count= c_events.length; eidx < c_events_count; ++eidx){
			var event= c_events[eidx];
			var ename= event.getAttribute("name");
			
			var e_params = event.getElementsByTagName('parameter'), e_params_count= e_params.length;
			var parameters= [];
			for (var idx = 0; idx < e_params_count; ++idx) {
				var e_param = e_params[idx];
				var e_param_name= e_param.getAttribute("name");
				/* expand the type's QName */
				var split= e_param.getAttribute('type').split(':');
				var type= Ext.cruise.client.Utility.lookupNamespaceURI(split[0], e_param)+split[1];
				/* store parameter infos */
				parameters[idx]= {
					'index_component': idx,
					'type' : type,
					'type_component' : type,
					'name' : e_param_name
				}
				/* apply transformation definitions for correct event parameters */
				if (transformation_config.byType&&transformation_config.byType[type]!=undefined){
					var tdef= transformation_config.byType[type];
					if (tdef.get) {
						Ext.applyIf(parameters[idx], tdef.get);
					}
				}
				if (transformation_config.byEvent && transformation_config.byEvent[ename]!=undefined){
					Ext.applyIf(parameters[idx], transformation_config.byEvent[ename][e_param_name]);
				}
			}
			
			wrapperconfig.events[ename]= {
				'name': ename,
				'parameters': parameters
			}
		}
		this.log.debug('[CompMan] Generating mediationConfig took',+new Date()-t0);
		return wrapperconfig;
	},
	
	/** @private */
	importSplitterJoiner: function(componentConfig, id){
		var isSplitter= id.indexOf("http://inf.tu-dresden.de/cruise/logic/eventsplit/")==0,
			properties= componentConfig.getElementsByTagName("property"),
			numprops= properties.length,
			mode= undefined,
			nsDef= [{prefix:'upperactions', ns:'http://mmt.inf.tu-dresden.de/models/activity-actions.owl#'},
			        {prefix:'nfp', ns:'http://mmt.inf.tu-dresden.de/models/nfp.owl#'},
			        {prefix:'mcdl', ns:'http://mmt.inf.tu-dresden.de/models/mcdl.owl#'},
			        {prefix:'travel',ns:'http://mmt.inf.tu-dresden.de/cruise/travel.owl#'},
			        {prefix:'edyraactions', ns:'http://mmt.inf.tu-dresden.de/models/activity-edyraactions.owl#'}],
			params= [];
		for (var idx=0; idx < numprops; ++idx){
			var property = properties[idx];
			
			if ("parameterNames"===property.getAttribute("name")){
				params = Ext.util.JSON.decode(unescape(property.getAttribute("value")));
			}
			if (!isSplitter && "mode"===property.getAttribute("name")){
				mode= property.getAttribute("value");
			}
		}
		this.createLogicComponent(id, params, nsDef, mode);
	},
	
	/**
	 * @public
	 * @param {String} id the logic component's ID
	 * @param {Array} parameters definition of the parameters to be split or joined. each entry corresponds to the following structure: { name: ... , type: ... }
	 * @param {Array} nsDef an array of { prefix: ..., ns: ... } objects defining the namespace declarations necessary for the generation of the SMCDL 
	 * @param {String} (optional) mode the mode of the EventJoiner ("tolerant", "repeating", "queueing"; infos see https://trac.mmt.inf.tu-dresden.de/CRUISe/wiki/runtimes/logic_spec). Defaults to "repeating".
	 */
	createLogicComponent: function(id, parameters, nsDef, mode){
		var isSplitter= id.indexOf("http://inf.tu-dresden.de/cruise/logic/eventsplit/")==0;
		var pcount= parameters.length;
		var smcd= '<smcd ';
		for (var idx=0; idx < nsDef.length; ++idx){
			var def= nsDef[idx];
			smcd+=' xmlns:'+def.prefix+'="'+def.ns+'" ';
		}
		smcd+='isUI="false" id="'+id+'" name="LoCo'+id+'">';
		smcd+='<interface>';
		smcd+='<property name="parameterNames" type="mcdl:hasURI" required="true"><default>';
		var stringifiedParams= '[';
		for (var i=0; i<pcount; ++i){
			if (typeof parameters[i]=="string"){
				stringifiedParams+='"'+parameters[i]+'"';
			}else 
				stringifiedParams+='"'+parameters[i].name+'"';
			if (pcount>0 && i!= pcount-1)
				stringifiedParams+=', ';
		}
		stringifiedParams+=']';
		smcd+=escape(stringifiedParams);
		smcd+='</default></property>';
		
		var toQName= function(uri){
			if(!uri) return;
			var i = nsDef.length;
			while(--i){
				var def= nsDef[i];
				if (uri.indexOf(def.ns)==0){
					return uri.replace(def.ns, def.prefix+':').replace("#","");
				}
			}
		};
		
		if (!isSplitter)
			smcd+='<property name="mode" type="mcdl:hasURI" required="true"><default>'+(mode||'repeating')+'</default></property>';
		if (isSplitter){
			for (var k=0; k<pcount; ++k){
				smcd+='<event name="on'+parameters[k].name+'">';
				smcd+='<parameter name="'+parameters[k].name+'" type="'+toQName(parameters[k].type)+'" />';
				smcd+='</event>';
			}
			smcd+='<operation name="split">';
			for (var j=0; j<pcount; ++j){
				smcd+='<parameter name="'+parameters[j].name+'" type="'+toQName(parameters[j].type)+'" />';
			}
			smcd+='</operation>';
		}else {
			smcd+='<event name="onJoin">';
			for (var j=0; j<pcount; ++j){
				smcd+='<parameter name="'+parameters[j].name+'" type="'+toQName(parameters[j].type)+'" />';
			}
			smcd+='</event>';
			for (var k=0; k<pcount; ++k){
				smcd+='<operation name="join'+parameters[k].name+'">';
				smcd+='<parameter name="'+parameters[k].name+'" type="'+toQName(parameters[k].type)+'" />';
				smcd+='</operation>';
			}
		}
		smcd+='</interface>';
		smcd+='<binding language="javascript" bindingtype="mapping_simplewrapper"><dependencies/><constructor><code>';
		if (isSplitter)
			smcd+= "new Ext.cruise.client.EventSplit()";
		else
			smcd+= "new Ext.cruise.client.EventJoin()";
		smcd+="</code></constructor></binding></smcd>";
		
		var c= Ext.cruise.client.Utility.parseXMLFromString(smcd);
		c= c.getElementsByTagName("smcd")[0];
		var result = new Ext.cruise.client.MCDLReqRespObject({
			compConfig: c,
			id: id
		});
		result.setResponse(c);
		
		var msg = new Ext.cruise.client.Message();
		msg.setBody(result);
		this.processSMCDL(msg);
	},
		
	/**
	 * Import a component using the template-based workflow (-> alternatives and matching result are calculated) 
	 * but with the possibility to get a specific component, not the one with highest rating.
	 * 
	 * Must only be used for exchangeing or re-importing components!
	 *
	 * @param {Document} placeholder the DOM of the placeholder (i.e ComponentConfig)
	 * @param {String} id ID of the component
	 * @param {boolean} addToBlacklist indicates whether the id should be added to the blacklist of this integration request
	 * @param {String} tid the template id
	 */
	importComponent: function(placeholder, id, addToBlacklist, tid, currentReqRespObj){
		this.log.info('[CompMan] Importing component ',id);
		
		/* utilize basic integration workflow for component exchange */
		if (currentReqRespObj){
			currentReqRespObj.exchange= true;
			this.intManager.getSMCDLMatch(currentReqRespObj);
		}else {
			var reqRespObj = new Ext.cruise.client.MCDLReqRespObject({
				compConfig: placeholder,
				id: id
			});
			reqRespObj.exchange= true;
			var name= placeholder.getAttribute("id");
			reqRespObj.currID= this.components[name].id;
			reqRespObj.tid= tid;
			if (addToBlacklist)
				reqRespObj.ignore= [ this.components[name].id ];
	
			reqRespObj.name= placeholder.getAttribute("name");
			
			this.intManager.fetchSMCDLByTemplate(reqRespObj);
		}
	},
	
	/**
    * Hide the component specified by its ID.
    * @function
    * @public
    * @param {String} placeholder ID of the component
    * @return {boolean} true if successful
    */
    hideComponent: function (placeholder) {
        var entry = this._getEntry(placeholder);
		if (entry==undefined||entry==null) {
			this.log.warn("[CompMan] hideComponent: unknown component",placeholder);
			return false;
		}

        try {
            entry.instance.hide();
        } catch (e) {
            this.log.error(e);
        }
        if (entry.isUIC == true && entry.adapt != null && Ext.isFunction(entry.adapt.hide))
            entry.adapt.hide();

        return true;
    },

    /**
    * Show the component specified by its ID.
    * @function
    * @public
    * @param {String} placeholder ID of the component
    * @return {boolean} true if successful
    */
    showComponent: function (placeholder) {
		var entry = this._getEntry(placeholder);
		if (entry==undefined||entry==null) {
			this.log.warn("[CompMan] showComponent: unknown component",placeholder);
			return false;
		}

        try {
            entry.instance.show();
        } catch (e) {
            this.log.error(e);
        }
        if (entry.isUIC == true && entry.adapt != null && Ext.isFunction(entry.adapt.hide))
            entry.adapt.show();

        return true;
    },

	/**
	 * Remove the component specified by its ID.
	 * @function
	 * @public
	 * @param {String} cid ID of the component
	 * @param {Boolean} surpressEvent (optional) if set, the "componentRemoved" event will not be triggered. defaults to false.
	 * @return {boolean} true if successful
	 */
	removeComponent: function(cid, surpressEvent){
		var entry = this._getEntry(cid);
		if (entry==undefined||entry==null) {
			this.log.warn("[CompMan] removeComponent: unknown component",cid);
			return false;
		}
		
		this.unpubsub(cid);
		try {
			entry.instance.dispose();
		} catch (e) {
			this.log.error("[CompMan]",e);
		}
		if (entry.isUIC==true && entry.adapt!=null)
			entry.adapt.destroy();
		
		// remove component from component list
		delete this.components[cid];
		
		if (!surpressEvent){
			var msg = new Ext.cruise.client.Message();
			msg.setName('componentRemoved');
			msg.appendToBody('cid', cid);
			this.eventBroker.publish(msg, undefined);
		}
		
		return true;
	},
	
	/**
	 * @private
	 * @function
	 * This routine initiates the processing of a MCDL binding part
	 * @param reqRespObject: an instance of class Ext.cruise.client.MCDLReqRespObject
	 */
	processSMCDL : function(message) {
		var reqRespObject= message.getBody();
		//if an error occured while loading the MCDL, display an error message and stop the processing
		if (reqRespObject.error) {
			this.log.error('[CompMan] An error occured loading the MCDL binding for id '+reqRespObject.id);
			return;
		}
		
		var config = this.generateMediationConfig(reqRespObject.response, this.mediationConfig[reqRespObject.id]);
		this.mediationConfig[reqRespObject.id] = config;
		
		this.processDependenciesJS(reqRespObject)
	},
	
	/** @private  */
	processDependenciesJS : function(reqRespObject) {
		var jsbinding= reqRespObject.response.getElementsByTagName('binding')[0];
		var dependenciesElem = jsbinding.getElementsByTagName('dependencies')[0];
		var pendingScripts = this.intManager.processDependencies(dependenciesElem);

		this.intManager.postprocessScriptLoad(reqRespObject, pendingScripts);
	},

	/**
	 * Processes the binding information like constructor to initialize the component.
	 * Called after all dependencies have been loaded successfully.
	 * 
	 * @param {Ext.cruise.client.MCDLReqRespObject} reqRespObject the MCDLReqRespObject containing all necessary information
	 */
	processBindingJS : function(reqRespObject) {
		var mcdl = reqRespObject.response;

		var binding = mcdl.getElementsByTagName('binding');

		//get binding type (defaults to 'mapping_simplewrapper', see the SMCDL schema)
		var bindingtype = binding[0].getAttribute('bindingtype');
		if (bindingtype == undefined || bindingtype == null) bindingtype = 'mapping_simplewrapper';

		var wm = this;
		var _processBindingJS_lower = function(x){try {
			wm.processBindingJS_lower(reqRespObject, x);
		}catch(EXE){applicationManagerInstance.getLog().error(EXE);}};

		//start instanciation with the correct UIC loader
		if ('codetemplates' == bindingtype) 
			// TODO check compatibility of template mechanism with current version of runtime 
			this.templateCodeUICLoader.loadInstance(binding[0], reqRespObject.compConfig, _processBindingJS_lower);
		else 
			if ('mapping_simplewrapper' == bindingtype) {
				if (reqRespObject.tid){// use template id
					this.simpleWrapperUICLoader.loadInstance(binding[0], reqRespObject.compConfig, _processBindingJS_lower, this.mediationConfig[reqRespObject.tid]);
				}else
					this.simpleWrapperUICLoader.loadInstance(binding[0], reqRespObject.compConfig, _processBindingJS_lower, this.mediationConfig[reqRespObject.id]);
			}
	},
	
	/** @private */
	processBindingJS_lower : function(reqRespObject, uic) {
		var instID = reqRespObject.compConfig.getAttribute("id");
		if (this.componentExists(instID)){
			instID= reqRespObject.id;
		}
		if (!uic){
			var msg = new Ext.cruise.client.Message();
			msg.setName('InstantiationError');
			msg.appendToBody('cid', instID);
			this.eventBroker.publish(msg, undefined);
			return;
		}
		
		var isUIC= false;
		if (reqRespObject.compConfig.getAttribute('xsi:type')!=null)
			isUIC= reqRespObject.compConfig.getAttribute('xsi:type').indexOf('UIComponent')!=-1;
		if (reqRespObject.compConfig.getAttribute('isUI')!=null)
			isUIC= reqRespObject.compConfig.getAttribute('isUI').toLowerCase()=='true';
		var isExcludeDrop= reqRespObject.compConfig.getAttribute('excludeDrop')?reqRespObject.compConfig.getAttribute('excludeDrop'):false;
		
		var oldId;
		var renderTarget;
		var neu= false;
		if (!this.components[instID]) { // nothing set for this id
			this.components[instID] = {
				instance: uic,
				old_instance: undefined,
				adapt: undefined,
				proxy: null,
				isUIC: isUIC,
				isExcludeDrop: isExcludeDrop,
				functional: false,
				id: reqRespObject.id,
				compConfig: reqRespObject.compConfig
			};
			if (isUIC)
				renderTarget= this.createRenderTarget(instID);
			neu= true;
		} else if ( (this.components[instID] && !this.components[instID].instance)){ // remove-reimport-case
			this.components[instID].instance= uic;
			this.components[instID].name = componentNname;
			this.components[instID].old_instance= undefined;
			this.components[instID].proxy= undefined;
			oldId=this.components[instID].id;
			this.components[instID].id= reqRespObject.id;
			neu= true;
			renderTarget= this.components[instID].rtid;
		}else if (this.components[instID].instance){ // exchange-case
			this.components[instID].old_instance= this.components[instID].instance;
			this.components[instID].instance = uic;
			oldId=this.components[instID].id;
			this.components[instID].id= reqRespObject.id; 
			this.components[instID].proxy.setComponentInstance(uic);
			this.components[instID].compConfig= reqRespObject.compConfig;
			renderTarget= this.components[instID].rtid;
		}
		delete this.components[instID].mcdl;
		this.components[instID].mcdl= reqRespObject.response;

		// handle alternative bindings
		var alternatives= reqRespObject.alternatives;
		if (Ext.isArray(alternatives) && alternatives.length > 0) {
			this.components[instID].alternatives= [];
			for (var l = 0; l < alternatives.length; ++l) {
				var id= alternatives[l].id;
				if (!id) continue;
				this.components[instID].alternatives.push({id:id});
			}
		}
		
		//initialize the component
		if (isUIC == true) {
			if (this.components[instID] && this.components[instID].adapt) { // avoid buggy rendering
				this.components[instID].adapt.expand();
				this.components[instID].adapt.show();
				this.components[instID].adapt.setDisabled(false);
			}
		}
		var proxy= this.createProxy(instID);

		var erroneous=false;		
		var compctx = this.createComponentContext(proxy, renderTarget);
		try {
			uic.init(compctx);
		}catch(exe){
			this.log.error("[CompMan] error during initialization of component",instID,":",exe);
			erroneous= true;
		}

		if (neu) {
			try {
				this.pubsub(instID);
			}catch(err){
				this.log.error("[CompMan] error during registration of",instID,"at the communication infrastructure:",err);
			}
		}

		try {
			//set all properties
			this.setProperties(reqRespObject.compConfig, uic);
		} catch (e) {
			this.log.error('[CompMan] error while setting properties',e);
		}

		if ( isUIC == true && (neu || !this.components[instID].adapt) ) {
			// adaptability-settings for the currently processed ui component
			var config = {};
			var a= reqRespObject.compConfig;
			config.closeable = true;//a.getAttribute("isRemoveable") == "true";
			config.collapsible = a.getAttribute("isMinimizable")==null ||a.getAttribute("isMinimizable") == "true";
			config.draggable = a.getAttribute("isDraggable") == "true";
			config.resizeable = a.getAttribute("isResizable")==null || a.getAttribute("isResizable") == "true";
			config.alternatives = this.components[instID].alternatives;
			if (!this.components[instID].adapt) {
				var apanel= this.addAdaptability(instID, uic, config);
				apanel.show();
				this.components[instID].adapt = apanel;
				if (erroneous==true)
					apanel.setDisabled(true);
			}
		}
		this.components[instID].functional= true;

		var msg = new Ext.cruise.client.Message();
		msg.setName('componentInitialized');
		msg.appendToBody('cid', instID);
		this.eventBroker.publish(msg, undefined);
	},

	/**
	 * Creates a default style for the component initialization
	 * @function
	 * @private 
	 * @return {Ext.cruise.client.BaseContext} Default Style object
	 */
	createDefaultStyle: function(){
		var _def = Ext.cruise.client.BaseContext.PREDEFINED_ATT_NAMES.Style;
		var style = new Ext.cruise.client.BaseContext(_def);
		style.setAttribute(_def.FSIZE, "10pt");
		style.setAttribute(_def.COLOR, "black");
		style.setAttribute(_def.BGCOLOR, "white");
		return style;
	},
	
	/**
	 * @function
	 * @private 
	 * @param {Ext.cruise.client.CommunicationProxy} proxy the proxy of the component
	 * @param {String} rtid the rendering target of an UI component
	 * @return {Ext.cruise.client.BaseContext} new context
	 */
	createComponentContext: function(proxy, rtid){
		var _def = Ext.cruise.client.BaseContext.PREDEFINED_ATT_NAMES.ComponentContext;
		var ctx = new Ext.cruise.client.BaseContext(_def);
		var compStyle = this.createDefaultStyle();
		ctx.setAttribute(_def.LOG, this.log);
		ctx.setAttribute(_def.EVENTHANDLER, proxy);
		ctx.setAttribute(_def.SERVICEACCESS, this.sac);
		ctx.setAttribute(_def.ERRORHANDLER, proxy);
		ctx.setAttribute(_def.LCMANAGER, proxy);
		ctx.setAttribute(_def.STYLE, compStyle);
		ctx.setAttribute(_def.RTID, rtid);
		ctx.setAttribute(_def.APPCONTEXT, applicationManagerInstance.getApplicationContext());
		ctx.setAttribute(_def.XMLUTIL, Ext.cruise.client.Utility);
		return ctx;
	},
	
	/**
	*  creates a div element with generated ID and returns the ID 
	 * @function
	 * @private 
	*/
	createRenderTarget : function(componentID) {
		var div= document.createElement("div");
		var cName= componentID.replace(/\/|:|#|\./g,'');
		var id= "div"+cName+Math.round(Math.random()*100000);
		div.setAttribute("id", id);
		document.getElementsByTagName('body')[0].appendChild(div);
		this.components[componentID].rtid= id;
		return id;
	},
	
	/**
	 *  
	 * @function
	 * @public
	 * @param {String} cid the component's id
	 * @return {String} The id of the HTML div-element that was created for the specified component; or null if the component-ID is unknown or invalid. 
	 */
	getRenderTarget: function(cid){
		if (cid==undefined||cid==null||this.components[cid]==undefined||this.components[cid]==null) return null;
		return this.components[cid].rtid;
	},
	
	/**
	 * sets the properties defined in the compConfig
	 * @function
	 * @private 
	 */
	setProperties : function(compConfig, uic) {
		if (!compConfig || !uic) return;
		
		var properties = compConfig.getElementsByTagName('property');
		for (var i=0; i<properties.length; ++i) {
			var property= properties[i];
			var name = property.getAttribute('name');
			var value = property.getAttribute('value');
			
			if (value == null || value == undefined) {
				var mcdl= this.getSMCDL(compConfig.getAttribute('id'));
				var mproperties = mcdl.getElementsByTagName("property");
				for (var idx = 0, length= mproperties.length; idx < length; ++idx) {
					var curr = mproperties[idx];
					
					if (curr.getAttribute("name") != name) continue;
					
					// get default-value in smcdl
					var def= curr.getElementsByTagName("default");
					if (def.length==1){
						var defaultElem= def[0];
						if (defaultElem.childNodes.length == 1){
							var c0= defaultElem.childNodes[0];
							if (c0.nodeType == 3 || c0.nodeType == 4) { //TEXT or CDATA
								value = c0.nodeValue;
							}
						} else {
							var _node;
							for (var vnc = 0; vnc < defaultElem.childNodes.length; ++vnc) {
								if (defaultElem.childNodes[vnc].nodeType == 1) {//ELEMENT_NODE
									_node = defaultElem.childNodes[vnc];
									break;
								}
							}
							try {
								value = Ext.cruise.client.Utility.serializeXML(_node);
							} catch (F) {
								this.log.warn(F);
							}
						}
					}
					break;
				}
			}
			
			if (name == null || name == undefined || value == null || value == undefined) continue;
			
			value= unescape(value);
			// evaluate referenced context-parameters
			value= Ext.cruise.client.adapt.util.PathUtils.expandContextReferences(value, "applicationManagerInstance.getAdaptationManager()");
			/*value= Ext.util.JSON.decode(value);*/

			this.log.debug(compConfig.getAttribute("id"),"setting",name,value);
			try{
				uic.setProperty(name, value);
			}catch(e){}
		}
	},

	/**
	 * @private 
	 */
	getComponentName: function(ccm_att){
		//regex for component name
		var regexComponent = '\\@component\\[name=\'(.+)\\\'\\]\\/';
		var regex = new RegExp(regexComponent);
		var component = ccm_att.match(regex);
		return component[1];
	},

	/**
	 * @private 
	 */
	getComponentParamName: function(ccm_att, paramType, compConfig){
		//regex for event with numbered ref
		var regexNumber = '\\@'+paramType+'.(\\d+)$';
		//regex for event with named ref
		var regexName = '\\@'+paramType+'\\[name=\'(.+)\\\'';
		
		var regex = new RegExp(regexNumber);
		var match = ccm_att.match(regex);
		
		var result = new Array();
		
		var callbackOperation = null;
		var returnEvent = null;
		
		//decide between numbered or named ref
		if(!match) {
			regex = new RegExp(regexName);
			match = ccm_att.match(regex);
			result.push(match[1]);
		} else {
			var definedParam = compConfig.getElementsByTagName(paramType);
			if (definedParam){
				result.push(definedParam[parseInt(match[1])].getAttribute('name'));
			}	
		}
		
		/*
		 * searching for a changeEvent reference in case of property
		 * or returnEvent in case of operation
		 * or callbackOperation in case of event
		 */
		
		var definedParam = compConfig.getElementsByTagName(paramType);
		for(var i=0; i<definedParam.length;i++){
			if(definedParam[i].getAttribute('name') === result[0]) {
				if(paramType === 'property')
					result.push(definedParam[i].getAttribute('changeEvent'));
				if(paramType === 'operation')
					result.push(definedParam[i].getAttribute('returnEvent'));
				if(paramType === 'event')
					result.push(definedParam[i].getAttribute('callbackOperation'));
			}
		}
		return result;
	},

	/**
	 * @private
	 * @function
	 * Integrates the component specified by its ID into the TSR-eventprocessing
	 *
	 * @param {Element} DOM-Element representing the JavaScript-Binding of the UI-Component
	 * @param {String} cid ID of the component
	 */
	pubsub : function(cid){
		if (!cid) return;
		var communication= applicationManagerInstance.getCompositionModel().getElementsByTagName("communicationModel")[0];
		if(communication != undefined){
			//var mcdl= this.getSMCDL(cid);
			var compConfig= this.getComponentConfig(cid);
			var channels= communication.getElementsByTagName("channel");
			var channel;
			var subscribers, publishers,syncTargets;
			for (var idx=0, length= channels.length; idx < length; ++idx){
				channel= channels[idx];
				var type = Ext.cruise.client.Utility.getAttributeNS(Ext.cruise.client.Constants._xsiNS_,'type', channel).split(':');	
				if(type[1] === 'PropertyLink'){
					this._pupsubPropertyLink(cid,compConfig,channel, false);					
				}
				if(type[1] === 'BackLink'){
					this._pupsubBackLink(cid, compConfig, channel, false);
				}
				if(type[1] === 'Link'){
					this._pupsubLink(cid, compConfig, channel, false);
				}
			}
		}
	},
	
	/**
	 * @private
	 * @function
	 * Finds all informations for a link
	 * 
	 * @param {String} cid
	 * @param {Object} compConfig
	 * @param {Object} channel
	 * @param {Boolean} isUnPupsub
	 */
	_pupsubLink: function(cid, compConfig, channel, isUnPupsub){
		var subscribers, publishers;
		var name = name= channel.getAttribute('name');
		publishers= channel.getElementsByTagName("publisher");
		subscribers= channel.getElementsByTagName("subscriber");
		var _count_publishers= publishers.length;
		var _count_subscribers= subscribers.length;
		
		var comp_name= this._getComponentName(cid);
		var publisher, eventAttribute, event, component;
		for (var i = _count_publishers- 1; i >= 0; --i){
			publisher= publishers[i];
			eventAttribute= publisher.getAttribute("event");
			
			var component = this.getComponentName(eventAttribute);
			
			if (component == null){
				this.log.warn("[CompMan] Invalid publisher-reference!",eventAttribute);
				break;
			}

			if(comp_name!= component) continue;
			var eventName = this.getComponentParamName(eventAttribute,'event',compConfig);
			if(eventName[0] == null) {
				this.log.warn("[CompMan] Invalid event-reference!", eventAttribute);
				break;
			}
			
			this.log.info("[CompMan] Adding publisher",cid,name,eventName[0]);
			if(!isUnPupsub)
				this.addPublisher(cid,name,eventName[0]);
			else
				this.removePublisher(cid, name, eventName[0]);
		};
		
		var subscriber, operationAttribute, operation, operationName;
		for (var i = _count_subscribers - 1; i >= 0; --i){
			subscriber= subscribers[i];
			operationAttribute= subscriber.getAttribute("operation");

			component= this.getComponentName(operationAttribute);
			if(comp_name!= component) continue;
			operationName= this.getComponentParamName(operationAttribute, 'operation', compConfig);
			if(operationName[0] == null) {
				this.log.warn("[CompMan] Invalid event-reference!", eventAttribute);
				break;
			}
			
			this.log.info("[CompMan] Adding subscriber",cid,name, operationName[0]);
			if(!isUnPupsub)
				this.addSubscriber(cid, name, operationName[0]);
			else
				this.removeSubscriber(cid, name);
		};
	},
	
	/**
	 * @private
	 * @function
	 * Finds all informations for a propertylink
	 * 
	 * @param {String} cid
	 * @param {Object} compConfig
	 * @param {Object} channel
	 * @param {Boolean} isUnPupsub
	 */
	_pupsubPropertyLink: function(cid, compConfig, channel, isUnPupsub){
		var subscribers, publishers,syncTargets;
		var name = name= channel.getAttribute('name');
		syncTargets= channel.getElementsByTagName("participant");
		var _count_syncTargets= syncTargets.length;
		var unidirectionalSender = channel.getAttribute('unidirectionalSender');
		
		var comp_name= this._getComponentName(cid);
		for(var i=0;i<_count_syncTargets;i++){
			var syncTarget = syncTargets[i];
			var propertyAttribute = syncTarget.getAttribute('property');
			
			var component= this.getComponentName(propertyAttribute);
			if(comp_name!= component) continue;
			var propertyName= this.getComponentParamName(propertyAttribute, 'property', compConfig);
			var sender = null;
			
			this.log.info("[CompMan] adding syncTarget: ",cid,name,propertyName[0]);
			//adding property to channel
			
			var eventName;
			if(propertyName[1]){
				var _tmpArr = this.getComponentParamName(propertyName[1], 'event', compConfig);
				eventName = _tmpArr[0];
			} else {
				eventName = propertyName[0]+'Changed';
			}
			
			if(!isUnPupsub){
				if(this.coordinationManager.coordinatedChannels[name] == null){
					this.coordinationManager.coordinatedChannels[name] = new Array();
				}
				
				if(unidirectionalSender==null){
					this.eventBroker.channels[name].setIsBidirectional(true);
					
					this.addPublisher(cid,name,eventName);
					this.addSubscriber(cid,name,{opName:'setProperty',propName:propertyName[0]});
					
					this.coordinationManager.coordinatedChannels[name].push({propName:propertyName[0],cid:cid});
				}
				else{
					if(unidirectionalSender == propertyAttribute){
							this.addPublisher(cid,name,eventName);
							this.coordinationManager.coordinatedChannels[name].push({propName:propertyName[0],cid:cid});
					}
					else{
						this.addSubscriber(cid,name,{opName:'setProperty',propName:propertyName[0]});
						this.coordinationManager.coordinatedChannels[name].push({propName:propertyName[0],cid:cid});
					}
				}
			} else {
				this.removePublisher(cid, name, eventName);
				this.removeSubscriber(cid, name);
			}			
		}
	},
	
	/**
	 * @private
	 * @function
	 * Finds all informations for a backlink
	 * 
	 * @param {String} cid
	 * @param {Object} compConfig
	 * @param {Object} channel
	 * @param {Boolean} isUnPupsub
	 */
	_pupsubBackLink: function(cid, compConfig, channel, isUnPupsub){
		var subscribers, publishers;
		var name = name= channel.getAttribute('name');
		publishers= channel.getElementsByTagName("requestor");
		subscribers= channel.getElementsByTagName("replier");
		var _count_publishers= publishers.length;
		var _count_subscribers= subscribers.length;
		
		var comp_name= this._getComponentName(cid);
		var eventAttribute, eventName, component;
		for(var i=0;i<_count_publishers;i++){
			var publisher= publishers[i];
			eventAttribute= publisher.getAttribute("event");

			component= this.getComponentName(eventAttribute);
			if(comp_name!= component) continue;
			eventName= this.getComponentParamName(eventAttribute, 'event', compConfig);

			var selectedOp;
			if(eventName[1]){
				selectedOp = this.getComponentParamName(eventName[1], 'operation', compConfig);
				selectedOp = selectedOp[0];
			}

			this.log.info("[CompMan] adding publisher",cid,name,eventName[0]);
			if(!isUnPupsub)
				this.addPublisher(cid,name,eventName[0],selectedOp);
			else {
				this.removePublisher(cid, name, eventName[0]);
				this.removeSubscriber(cid, name);
			}
		};
		var subscriber, operationAttribute, operation, opName;
		for (var i = _count_subscribers - 1; i >= 0; --i){
			subscriber= subscribers[i];
			operationAttribute= subscriber.getAttribute("operation");

			component= this.getComponentName(operationAttribute);
			if(comp_name!= component) continue;
			opName= this.getComponentParamName(operationAttribute, 'operation', compConfig);

			var selectedEvent;
			if(opName[1]){
				selectedEvent = this.getComponentParamName(opName[1], 'event', compConfig);
				selectedEvent = selectedEvent[0];
			}

			this.log.info("[CompMan] adding subscriber",cid,name);
			if(!isUnPupsub)
				this.addSubscriber(cid, name, opName[0],selectedEvent);
			else {
				this.removeSubscriber(cid, name);
				this.removePublisher(cid, name, selectedEvent);
			}
		};
	},

	/**
	 * @private
	 * @function
	 * Removes the component specified by its ID from TSR-eventprocessing
	 *
	 * @param {String} cid ID of the component
	 */
	unpubsub : function(cid){
		if (!cid) return;
		
		if (this.eventBroker.deregisterComponent(cid)){
			this.log.debug("[CompMan] successful unpubsub for component",cid);
		}else {
			this.log.warn("[CompMan] unpubsub failed for component",cid);
		}
		
		/*var communication= applicationManagerInstance.getCompositionModel().getElementsByTagName("communicationModel")[0];
		if(communication != undefined){
			var mcdl= this.getSMCDL(cid);
			var channels= communication.getElementsByTagName("channel");
			var channel;
			var subscribers, publishers,syncTargets;
			
			for (var idx=0, length= channels.length; idx < length; ++idx){
				channel= channels[idx];
				var type = Ext.cruise.client.Utility.getAttributeNS(Ext.cruise.client.Constants._xsiNS_,'type', channel).split(':');
				if(type[1] === 'PropertyLink'){
					this._pupsubPropertyLink(cid,mcdl,channel, true);
				}
				if(type[1] === 'BackLink'){
					this._pupsubBackLink(cid, mcdl, channel, true);
				}
				if(type[1] === 'Link'){
					this._pupsubLink(cid, mcdl, channel, true);
				}
			}
		}*/
	},
	
	/**
	 * Creates a adaptability-panel for the given placeholder including the dragZone
	 * 
	 * @public
	 * @function
	 * @param {Object} id ComponentID
	 * @param {Object} inst Component instance
	 * @param {Object} config configuration-object containing adaptability-settings
	 * @return {Ext.Panel} the panel
	 */
	addAdaptability: function(id, inst, config){
		var foo;
		if (!inst){
			foo= applicationManagerInstance.getComponentManager().getComponentInstance(id);
		}else
			foo= inst;

		var header;
		if (!config) {
			config = {
				resizable: false,
				draggable: false,
				collapsible: false,
				closeable: false
			};
		}
		var title= foo.getProperty('title') || foo.getProperty('property.title') || ("UI Component '"+id+"'");
		var children= [];
		// add the title
		children.push({
			tag:'span',
			style: 'margin-left:5px; margin-right: 10px;',
			html: title 
		});

		if (config.alternatives){
			var alts= [];
			alts.push({tag: "option", html:"exchange with ..."});
			for(var o=0; o< config.alternatives.length; ++o){
				alts.push({
					tag:"option",
					//html:config.alternatives[o].name+' @'+config.alternatives[o].id
					html: config.alternatives[o].id
				});
			}
			var right= 10+(config.closeable?15:0)+(config.collapsible?15:0);
			children.push({
					tag: 'select',
					style: 'width:140px; position: absolute; top: 0px; right:'+right+'px; font-weight: normal; ',
					//style: 'width:140px; float: right; padding: 2px; margin: 0 5px 0 0; overflow: hidden; color: #36c; font-weight: normal;',
					cls: 'x-panel-header',
					id: 'change_' + id,
					onchange: "applicationManagerInstance.getAdaptationManager()._exchange( '"+id+"')",
					children: alts
				});
		}
		
		header= {
				tag: 'div',
				id : 'header_'+id,
				children: children,
				cls: 'x-panel-header'
			};
			
		var tools= [];
		if (applicationManagerInstance.getIsRecommendationEnabled()) {
			tools.push({
				id: 'gear',
				handler: function(){
					applicationManagerInstance.getRecommendationManager().recommendComponentsByOperations(id, this.getUnwiredOperations(id));
					applicationManagerInstance.getRecommendationManager().recommendAlternatives(id);
				},
				scope: this
			});
		}
		if (config.closeable){
			tools.push({
				id: "close",
				handler: this.adaptMan._remove,
				scope: this.adaptMan,
				cid: id
				});
		}
		
		//Check if Component has coordinable Properties, if yes -> coordination-Button is added to header
		if(this.coordinationManager && this.coordinationManager['coordProperties']){
			if(this.coordinationManager['coordProperties'][id]!=null || this.coordinationManager['coordProperties'][id]!=undefined){
		
				tools.push({
						type:'initCoordination',
						id: "right",
						
						qtip:'Click to create a connection',
						handler: this.coordinationManager._initCoordination,
						
						scope: this.coordinationManager,
						cid: id
				});
				
				tools.push({
						type:'cancelCoordination',
						id : 'minus',
						hidden: true,
						qtip: 'Cancel current Coordinationprocess',
						handler: this.coordinationManager.__clearHeader,
						
						scope: this.coordinationManager,
						cid: id
				});
				
					
			}	
		}
		
		//var showHeader= (config.draggable==true || config.collapsible==true || config.closeable==true || (config.alternatives!=undefined && config.alternatives!=null && config.alternatives.length>0));
		var showHeader= true;
		var width= parseInt(inst.getProperty('property.width')||inst.getProperty('width')||'100');
		var height=parseInt(inst.getProperty('property.height')||inst.getProperty('height')||'100')+(showHeader?25:0);
		var adapt = new Ext.Panel({
			scope: this,
			layout: 'fit',
			draggable: config.draggable,
			collapsible: config.collapsible,
			contentEl: this.getRenderTarget(id),
			header: showHeader,
			border: true,
			title: title,
			//autoScroll: true,
			width: width,
			height: applicationManagerInstance.getIsRecommendationEnabled()?height+25:height,
			headerCfg: header,
			tools: tools,
			cid: id,
			listeners: {
				mousedown: function(evt,comp) {
					this.scope._activateDragZones(this.cid);
				},
		        mouseup: function(){
		        	this.scope._deactivateDragZones(this.cid);
		        }
			},
			bbar: applicationManagerInstance.getIsRecommendationEnabled()? new Ext.Toolbar({
				height: 25,
				buttonAlign: 'right',
				items: [
				{
					xtype: "combo",
					id: id+"ratingCombo",
					mode: 'local',
					width: 50,
				    store: new Ext.data.ArrayStore({
				        id: 0,
				        fields: [
				            'value'
				        ],
				        data: [["5"],["4"],["3"],["2"],["1"]]
				    }),
				    valueField: 'value',
					displayField: 'value',
					listeners: {
						'select': {
							scope: this,
							fn: function(){
								var btn= Ext.getCmp(id+"ratingSendBtn");
								if (btn){
									btn.setDisabled(false);
								}
							}
						}
					}
				},
				{
					xtype: "button",
					text: "Send",
					id: id+"ratingSendBtn",
					disabled: true,
					listeners: {
						'click': {
							scope: this,
							fn: function(button){
								button.setDisabled(true);
								var combo= Ext.getCmp(id+"ratingCombo");
								if (combo){
									var val= combo.getValue();
									combo.setDisabled(true);
									applicationManagerInstance.sendRating(id, val);
								}
							}
						}
					}
				},
				{
					xtype: "label",
					id: id+"ratingLabelLeft",
					text: "0",
					style: {
			                marginRight: '2px',
			                'font-weight':'bold',
			                color: '#003399'
			            }
				},
				{
					xtype:'progress',
				    id: id+'ratingProgress',
				    width:'130',
					labelStyle: {
		                'font-weight':'bold',
		                color: '#003399'
		            },
		            style: {
		                'font-weight':'bold',
		                color: '#003399'
		            }
				},
				{
					xtype: "label",
					id: id+"ratingLabelRight",
					text: "5",
					style: {
		                marginLeft: '2px',
		                'font-weight':'bold',
		                color: '#003399'
		            }
				}
				]
			}): null
		});
		/* Aufgrund des Weiterleitungsproblems der Events, 
		 * werden die Ereignisse direkt am Panel abgegriffen
		 * TODO: Weiterleitung zum Adaptionspanel herstellen. */
		if(inst.panel != null || inst.panel!=undefined) {
			adapt.relayEvents(inst.panel,['mousedown','mouseup']);
			adapt.on('afterrender',this._generateDragZone, this);		
		}		
		adapt.on("collapse", this.adaptMan._minimized, this);
		adapt.on("expand", this.adaptMan._restored, this);		
		return adapt;
	},
	
	/**
	 * Activate all DragZones expect from the given cid. Furthermore the current dragSource is set.
	 * @param {String} cid cid of the dragSource
	 * @private
	 */
	_activateDragZones: function(cid){
		this.setCurrentDragSource(cid);
		var comps = this.getAllUIComponents();
		for(var i=0;i<comps.length;i++){
			var c = comps[i];
			if(c.cid != cid && c.dragZone != null){
				c.dragZone.show();
			}
		}
	},
	
	/**
	 * Deactivate all dragZones and delete the DragSource for the given cid.
	 * @param {String} cid cid of the dragSource
	 * @private
	 */
	_deactivateDragZones: function(cid){
    	var comps = this.getAllUIComponents();
		for(var i=0;i<comps.length;i++){
			if(comps[i].dragZone != null)
				comps[i].dragZone.hide();
		}
		this.deleteCurrentDragSource(cid);
	},
	
	/**
	 * Creates the dragZone for the given component
	 * @param {Element} cmp a html representation of the component
	 * @private
	 */
	_generateDragZone: function(cmp){
		var b = cmp.body;
		if(b){
			cmp.dragZone = Ext.DomHelper.append(b,{
				tag:'panel',
				style: {
					'font-size': '1px',
					border: '0px none',
					overflow: 'hidden',
					color: '#fff',
					position: 'absolute',
					top: '0px',
					left: '0px',
					'background-color': '#fff',
					margin: 0,
					cursor: 'default'
				}
			},true);
			//set correct size and opacity
			var size = cmp.getSize();
			cmp.dragZone.setSize(size);
			cmp.dragZone.setOpacity(0.1);
			
			//add listener for event handling
			cmp.dragZone.on('mouseup',this._processDrop,this);
			cmp.dragZone.on('mouseover',function(ev, cmp){
				var c = this.getComponentForRenderTarget(cmp.previousSibling.id);
				var color="white";
				if (c.isExcludeDrop) 
					color= 'red';
				else {
					var possibleOps = this._getPossibleOps(cmp);
					if (possibleOps.length>0) {
						color= 'green';
					} else
						color= 'orange';
				}
				this.highlightComponent(c.id, color);
			}, this);
			cmp.dragZone.on('mouseout',function(ev, cmp){
				var c = this.getComponentForRenderTarget(cmp.previousSibling.id);
				this.unhighlightComponent(c.id);
			}, this);
			
			//hide the dragZone after initial rendering
			cmp.dragZone.hide();
		}
	},
	
	/**
	 * Delegates the drop to the target operation or invokes a popup window
	 * @param {Object} evt
	 * @param {Element} cmp the dom representation of the dragZone
	 * @private
	 */
	_processDrop: function(evt,cmp){
		var possibleOps= this._getPossibleOps(cmp);
		
		//get the underlying drop target
		var target = this.getComponentForRenderTarget(cmp.previousSibling.id);
		//get the drag source
		var source = this.getCurrentDragSource();
		var message = source.instance.getDragData();
		
		if(possibleOps.length<2 && possibleOps.length>0){
			this._performDrop(message, target, possibleOps[0].name, source.adapt.cid);
		} else if(possibleOps.length>1 && !target.isExcludeDrop) {
			var dlgPopup = this._createPopupWindow(possibleOps ,target, source.adapt.cid);
			dlgPopup.show();
		} else {
			this._deactivateDragZones(source.adapt.cid);
		}
	},
	
	/**
	 * Creates the popup window with a selection of operations.
	 * @private
	 * @param {Array} operations an array of possible operation which contains name and description
	 * @param {Object} target the target component
	 * @param {String} sourceCid the cid of the source component
	 * @return {Ext.Window} returns the created popup window
	 */
	_createPopupWindow: function(operations, target, sourceCid){
		var form = new Ext.form.FieldSet({
			title: 'drop possibilities',
			id: 'dragForm',
			autoHeight: true,
			defaults: {
            	anchor: '-20',
            	border: false
	        },
	        layout: 'column'
		});
																					
		for(var i=0;i<operations.length;i++){
			var radio = new Ext.form.Radio({
				boxLabel: operations[i].name,
				name:'operation', //buttongroup
				cid: target.adapt.cid
			});
			var docu = new Ext.form.DisplayField({
				value: operations[i].desc,
				width: 200,
				style: {'margin': '5px 0px 5px 16px'}
			});
			form.add(radio);
			form.add(docu);
		}											
		
		var dlgPopup = new Ext.Window({
			modal:true,
			layout:'fit',
			width:300,
			autoHeight: true,
			closable:false,
			resizable:false,
			plain:true,
			items:[form],
			buttons:[
				{
				text:'submit',
				ref: '../submitBtn'
				}, {
					text:'close',
					handler:function() {dlgPopup.hide();}
				}]
			});
			dlgPopup.submitBtn.setHandler(function(btn, evt){
				var fs = dlgPopup.get('dragForm');
				var id = null;
				var name= null;
				var cid = null;
				fs.items.each(function(item,index,length){
					if(item.getValue()==true){
						id=index;
						cid=item.cid;
						name=item.boxLabel;
						return false;
					}
				});
				this._performDrop(this.getCurrentDragSource().instance.getDragData(),target,name, sourceCid);
				dlgPopup.hide();
				delete dlgPopup;
			},this);
		return dlgPopup;
	},
	
	/**
	 * Performs the message invokation.
	 * @private
	 * @param {Ext.cruise.client.Message} message message object
	 * @param {Object} target target component
	 * @param {String} op target operation
	 * @param {String} sourceCid cid of the source component
	 */
	_performDrop: function(message, target, op, sourceCid){
		message.setStatus(200);
		if(Ext.isFunction(target.proxy.notifyDrag))
			target.proxy.notifyDrag(op,message);
		
		if(sourceCid)
			this._deactivateDragZones(sourceCid);
	},
	
	/**
	 * Highlights the dragZone.
	 * @param {Object} evt
	 * @param {Element} cmp the dom representation of the dragZone
	 */
	highlightComponent: function(cid, color){
		if (!this.componentExists(cid)) return;
		var panel = this.getAdaptabilityPanel(cid);
		if (panel==undefined || panel== null || !panel.dragZone) return;
		panel.dragZone.applyStyles('background-color:'+(color&&typeof color=="string"?color:"white"));
		panel.dragZone.show();
	},
	
	/** 
	 * Determines compatible operations which may act as a drop target.
	 * @private 
	 */
	_getPossibleOps: function(cmp){
		//get the underlying drop target
		var target = this.getComponentForRenderTarget(cmp.previousSibling.id);
		//get the drag source
		var source = this.getCurrentDragSource();
		var message = source.instance.getDragData();
		
		//choose the operations with identical tpyes
		var mediationConfig = this.getMediationConfig();
		var sourceSourceClass = mediationConfig[source.proxy.getComponentId()].dragsources[message.getName()].parameters;
		var targetOps = mediationConfig[target.proxy.getComponentId()].operations;
		
		var possibleOps = new Array();
		for(var op in targetOps){
			var o_param = targetOps[op].parameters;
			for(var k=0;k<o_param.length;k++){
				/*assume that only identical operations are possible
				TODO: perform a cast and select additionally these operations */
				if(o_param[k].type_component == sourceSourceClass[k].type_component){
					var mcdlOps = target.mcdl.getElementsByTagName('operation');
					for(var j=0;j<mcdlOps.length;j++){
						if(mcdlOps[j].getAttribute('name') == targetOps[op].name){
							possibleOps.push({
								'name':targetOps[op].name,
								'desc':mcdlOps[j].getElementsByTagName('documentation')[0]
							});
						}
					}
				}
			}
		}
		return possibleOps;
	},
	
	/**
	 * Unhighlights the dragZone
	 * @param {String} cid component id
	 * @param {boolean} hide indicates whether the dragzone should be hidden or not
	 */
	unhighlightComponent: function(cid, hide){
		if (!this.componentExists(cid)) return;
		var panel = this.getAdaptabilityPanel(cid);
		if (panel==undefined || panel== null || !panel.dragZone) return;
		panel.dragZone.applyStyles('background-color:white');
		if (hide==true)
			panel.dragZone.hide();
	}
});

/**
* @class Ext.cruise.client.MCDLReqRespObject
 * This class represents the set of parameters and methods necessary to fetch MCDL documents
 * via AJAX requests and to process the AJAX response as well as the MCDL document.
 * @param {Object} config Configuration-object
 */
Ext.cruise.client.MCDLReqRespObject = function(config) {
	//the XML DOM representation of the MCDL document (i.e. the AJAX response)
	var response;
	/* The DOM representation of the placeholder element (see the XSD definition for the MCDL Binding element type)
	 * that binds the component interface to the application logic. The 'componentConfig'-element provides the
	 * binding information, e.g. to resolve the component dependencies. */
	var compConfig = config.compConfig;

	//the ID of the component
	var id = config.id;
	//holds an error message if the AJAX call to retrieve the MCDL document failed
	var error;

	/**
	 * @property response
	 * @type Document
	 */
	this.response = response;
	/**
	 * @property compConfig
	 * @type Document
	 */
	this.compConfig = compConfig;
	/**
	 * @property id
	 * @type String
	 */
	this.id = id;
	/**
	 * @property response
	 * @type String
	 */
	this.error = error;

	/**
	 * PRIVATE
	 * Sets the 'response' property by converting a textual representation of the MCDL document (e.g. from the AJAX response) into a DOM object.
	 * @param responseTxt: the string representation of the MCDL document
	 */
	this.setResponse = function(responseTxt) {
		this.response = responseTxt;
	};
};