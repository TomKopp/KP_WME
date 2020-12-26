/**
 * @class Ext.cruise.client.AdaptationManager The AdaptationManager is responsible for instantiating the adaptation infrastructure, providing
 * access to the subsystem and manages and coordinates the execution of adaptation techniques.
 * @author Carsten Radeck
  * @author <a href="mailto:stefan.pietschmann">Stefan Pietschmann</a>
 */
Ext.namespace("Ext.cruise.client.adapt.impl","Ext.cruise.client.adapt.comet", "Ext.cruise.client.adapt.util");
Ext.cruise.client.AdaptationManager = Ext.extend(Ext.util.Observable, {
	log: null,
	eventBroker: null,
	contextmgr: null,
	ruleengine: null,
	user: null,
	actions: null,
	contextServiceURL: 'http://localhost:8080/CroCoWS/services/ContextQueryWS.ContextQueryWSHttpSoap12Endpoint/',
	state: {
		disabled: false,
		failed: false,
		collected: false,
		locked: false,
		currAction: null
	},
	temp: null,

	/**
	 * The constructor of the ApplicationManager
	 * @param {Object} logger an instance of the logger
	 * @param {Object} eventBroker an instance of the event broker
	 * @constructor
	 * @public
	 */
	constructor: function(logger, eventBroker){
		this.log = logger;
		this.eventBroker = eventBroker;
		Ext.cruise.client.AdaptationManager.superclass.constructor.call(this);
		this.log.debug('[AdapMan] Starting Adaptation Manager.');
	},

	/**
	 * Resets this runtime component to enable the execution of a new application on the fly.
	 */
	reset: function(){
		try {
			if (this.contextmgr)
				this.contextmgr.dispose();
			if (this.ruleengine)
				this.ruleengine.dispose();
		}catch(exception){
			this.log.error(exception);
		}
		
		this.state.disabled= false;
		this.state.failed= false;
		this.state.locked= false;
		this.state.collected= false;
		this.state.currAction= null;
	},

	/**
	 * Instructs the ApplicationManager with finally starting the application after all contextinformation are collected.
	 * @function
	 * @private
	 */
	startApplication: function(){
		this.log.debug('[AdapMan] All context info collected - starting application.');
		applicationManagerInstance.startApplication();
	},

	/**
	 * Returns the current value of the given path in the user context or undefined. 
	 * 
	 * @param {String} path the path of the ontology concept
	 * @public
	 * @function
	 * @return {Object} the value (single literal or array of such) or undefined if not available 
	 */
	getContextValue: function(path){
		if (this.state.disabled || this.state.failed || !this.state.collected)
			return undefined;
		return this.contextmgr.getContextValue(path);
	},

	/**
	 * Initializes the adaptation infrastructure.
	 * @public
	 * @function 
	 */
	initialize: function(){
		this.log.debug('[AdapMan] Initializing Adaptation Manager');

		// load configuration
        var contextDOM;
        var rules;
        
		var compMgr= applicationManagerInstance.getComponentManager();
		
		this.actions= {};
		this.actions["exchangeComponent"]= new Ext.cruise.client.adapt.impl.ExchangeComponent(this,compMgr, this.contextmgr,  this.log);
		this.actions["removeComponent"]= new Ext.cruise.client.adapt.impl.RemoveComponent(this,compMgr, this.contextmgr,  this.log);

		var con= Ext.cruise.client.Constants;
		var adaptDom;
        var scripts= document.getElementsByTagName('script');
        for(var i=0; i< scripts.length;++i){
			var script= scripts[i];
			if (script.getAttribute('type')== 'xml/cruise/adaptation'){
				var dom= Ext.cruise.client.Utility.parseXMLFromString(script.textContent);
				var temp = Ext.cruise.client.Utility.getElementsByTagNameNS(con._TSRNS_IE, con._TSRNS_, 'adaptation', dom); 
				if (temp.length!=1) break;

				adaptDom= temp[0];
				break;
			}
		}
		// read the configuration DOM
		if (adaptDom){
			if (adaptDom.getAttribute('enabled')=='false'){
				this.state.disabled= true;
			}
			rules = Ext.cruise.client.Utility.getElementsByTagNameNS(con._TSRNS_IE, con._TSRNS_,'rules', adaptDom)[0]; 
			contextDOM = Ext.cruise.client.Utility.getElementsByTagNameNS(con._TSRNS_IE,con._TSRNS_,'monitors', adaptDom)[0];
		}
		if (!adaptDom || this.state.disabled==true){
			this.log.info('[AdapMan] Adaptation is disabled.');
			// start application directly without initializing other components of the
			// adaptatioinfrastructure
			this.startApplication();
			return;
		}
		this.log.info('[AdapMan] Adaptation is enabled.');
		// read ruleset-configuration, load a referenced one
		var ruleset;
		if (rules){
			var ref;
			var temp = Ext.cruise.client.Utility.getElementsByTagNameNS(con._TSRNS_IE,con._TSRNS_, 'ruleSetReference', rules);
			
			if (temp.length > 0) {
				ref = temp[0];
			}
			if (ref){
				ruleset= this._loadRules(ref.firstChild.nodeValue);
			}else{
				temp = Ext.cruise.client.Utility.getElementsByTagNameNS( 
								Ext.cruise.client.adapt.Constants._ADAPTNS_IE, 
 								Ext.cruise.client.adapt.Constants._ADAPTNS_, 
								'RuleSet', rules); 
				
				if (temp.length>0)
					ruleset= temp[0];
			}
		}
		if (!ruleset){
			this.log.error('[AdapMan] No adaptation rule set found... cannot proceed.');
			this.state.failed= true;

			this.startApplication();
			return;
		}
		
		// username is essential...
		var suggest= applicationManagerInstance.getUserID() || "Heinz";
		try{
			// use windows scriptinghost
			var net=new ActiveXObject("WScript.Network");
			if (net){
				suggest= net.UserName;
			}
		}catch(e){}
		this.user= prompt('Please enter your username.', suggest);
		
		if (this.user)
			this.user= utils.trim(this.user);
			applicationManagerInstance.setUserID(this.user);
		if (!this.user || ""== this.user){
			this.log.error('[AdapMan] No username entered! Cannot load user profile. Further processing impossible.');
			this.state.failed= true;

			this.startApplication();
			return;
		}

		// instantiate ContextManager
		this.contextmgr= new Ext.cruise.client.adapt.impl.ContextManager(this.log, this);
		
		this.actions["reconfigureComponent"]= new Ext.cruise.client.adapt.impl.ReconfigureComponent(this,compMgr, this.contextmgr,  this.log);
		this.actions["changeLayout"]= new Ext.cruise.client.adapt.impl.ChangeLayout(this,compMgr, this.contextmgr,  this.log);
		this.actions["setVisibility"]= new Ext.cruise.client.adapt.impl.SetVisibility(this,compMgr, this.contextmgr,  this.log);
		this.actions["removeSubscriber"]= new Ext.cruise.client.adapt.impl.RemoveSubscriber(this,compMgr, this.contextmgr,  this.log);
		this.actions["addSubscriber"]= new Ext.cruise.client.adapt.impl.AddSubscriber(this,compMgr, this.contextmgr,  this.log);
		this.actions["addPublisher"]= new Ext.cruise.client.adapt.impl.AddPublisher(this,compMgr, this.contextmgr,  this.log);
		this.actions["removePublisher"]= new Ext.cruise.client.adapt.impl.RemovePublisher(this,compMgr, this.contextmgr,  this.log);
		this.actions["setMonitorActive"]= new Ext.cruise.client.adapt.impl.SetMonitorActive(this,compMgr, this.contextmgr,  this.log);
		this.actions["fireEvent"]= new Ext.cruise.client.adapt.impl.FireEvent(this,compMgr, this.contextmgr,  this.log);

		
		// instantiate correct Adapter
		var adapter=undefined;
		
		var csa = Ext.cruise.client.Utility.getElementsByTagNameNS(con._TSRNS_IE, con._TSRNS_, 'contextServiceAdapter', adaptDom);
		
		if (csa.length > 0) {
			try {
				var url = csa[0].getAttribute("contextServiceURL");
				// reflexively instantiate the context service adapter
				var adaptername = utils.trim(csa[0].firstChild.nodeValue);
				adapter = eval("new " + adaptername + "(this.log,this.contextmgr, url);");
				this.contextServiceURL = url;
			} 
			catch (exe) {
				this.log.error('[AdapMan]', exe);
			}
		}
		// temporary stores references which are required in method "cometConnected"
		this.temp={
			adapter: adapter,
			ruleset: ruleset,
			contextDOM: contextDOM,
			start: (new Date()).getTime()
		};
		// initialize the adapter. A callback is expected after the comet-connection is established (see method 'cometConnected')
		if (!adapter || !adapter.init(this.user, this)){
			this.log.error('[AdapMan] Initialisation of the context adapter failed... cannot proceed.');
			this.state.failed= true;

			this.startApplication();
			return;
		}
   	},
	
	/**
	 * @return the URL of the Context Service currently in use
	 */
	getContextServiceURL: function(){
		return this.contextServiceURL;
	},
	
	/**
	 * Callback method for the context management to signal that the comet connection is established
	 * @function
	 * @private
	 */
	cometConnected: function(){
		if (this.temp==undefined || this.temp==null) return;
		this.log.debug('[AdapMan] Comet ready after:',(new Date().getTime())-this.temp.start);
        this.contextmgr.init(this.temp.contextDOM, this.temp.adapter);
		
		if (this.contextmgr.receiveUserProfile(this.user)==false){
			this.state.failed= true;
			this.startApplication();
			return;
		}
		
		// instantiate RuleEngine
		this.ruleengine= new Ext.cruise.client.adapt.impl.RuleEngine(this.log, this, this.eventBroker, this.contextmgr);
		// extract relevant context parameters out of the current ruleset
		var relevantContext= this.ruleengine.parseRules(this.temp.ruleset);
		this.log.info('[AdapMan] Relevant context-params:',relevantContext);

		delete this.temp.start;
		delete this.temp.contextDOM;
		delete this.temp.ruleset;
		delete this.temp;

		// collect the user-context
		this.contextmgr.collectContext(this.user, relevantContext);
	},

	/**
	 * Callback for the context manager. Issued when the initial context-collection is done.
	 * @private
	 * @function
	 */
	_rdy: function(obj){
		if (!obj) return;
		if (obj == this.contextmgr){
			this.state.collected= true;

			// everything is initialized... start application
			this.startApplication();
		}
	},

	/**
	 *	Synchronously fetches a referenced ruleset.
	 * @private
	 * @function	  
	 */
	_loadRules: function(url){
		this.log.debug('[AdapMan] Loading reference adaptation rule set ',url);
		// synchronously fetch RuleSet
		var req= applicationManagerInstance.getServiceAccess().createXHR();
		req.open("GET",url,false);
		req.send();
		if(req.status == 200){
			this.log.debug('[AdapMan] Adaptation rules successfully loaded.');
			return req.responseXML;
		} else
			return undefined;
	},
	
	/**
	 * Callback for minimized-button in adaptability-panel.
	 * @private
	 * @function
	 */
	_minimized: function(a){
		var msg = new Ext.cruise.client.Message();
		msg.setName('componentMinimized');
		msg.appendToBody('cid', a.cid);
		
		this.eventBroker.publish(msg, undefined);
	},

	/**
	 * Callback for restore-button in adaptability-panel.
	 * @private
	 * @function
	 */
	_restored: function(a){
		var msg = new Ext.cruise.client.Message();
		msg.setName('componentRestored');
		msg.appendToBody('cid', a.cid);
		
		this.eventBroker.publish(msg, undefined);
	},

	/**
	 * Callback for close-button in adaptability-panel.
	 * @private
	 * @function
	 */
	_remove: function(event, toolEl , panel , tc){
		try {
			this.execute([{
				name: "removeComponent",
				type: "ComponentAction",
				config: {},
				pointcut: [tc.cid]
			}]);
		}catch(exe){this.log.error('[AdapMan]',exe);}
	},
	
	/**
	 * Callback for combo-box of alternative bindings in adaptability-panel.
	 * @private
	 * @function
	 */
	_exchange: function(b){
		try {
		var combo =Ext.get("change_"+b).dom;
		var use_id= combo.options[combo.selectedIndex].value;

		if (use_id=="---choose alternative"){
			return;
		}
		/*var idx= use_id.indexOf('@');
		var id= use_id.substring(idx+1);
		var name=use_id.substring(0,idx);
		this.log.info('[AdapMan] Exchanging component:',name,'id:', id);*/
		this.log.info('[AdapMan] Exchanging component id:', id);

		this.execute(
			 [{
		 			type: "ComponentAction",
		 			name: "exchangeComponent",
		 			config : {
						//id: id
						id: use_id
					},
		 			pointcut: [b]
			 }]
		);
		} catch (e) {
			this.log.error(e);
		}
	},
	
	timer: null,
	queue: [],
	/**
	 * Allowes the Ruleengine to execute the specified actions in sequential order. Therefore these
	 * are queued if necessary and their execution is delegated to a corresponding IAction - implementation. 
	 * 
	 * @protected
	 * @function
	 */
	execute: function(actions){
		/*
		 * actions = [{
		 * 		type,
		 *		name,
		 *		config,
		 *		pointcut
		 * }]
		 */
		if (actions!=undefined && actions!=null && Ext.isArray(actions) && actions.length > 0) {
				for (var o=0; o<actions.length; ++o){
				if (this.queue.indexOf(actions[o])==-1){
					this.queue.push(actions[o]);
				}
			}
			
			// append Actions to queue
			//this.queue= this.queue.concat(actions);
		}
		
		this.log.debug('[AdapMan] Length of action-queue:',this.queue.length);
		// adaptation lock is set -> queue the actions and cyclic check state of lock
		if (this.state.locked==true){
			this.log.debug('[AdapMan] Adaptation lock ... retrying.');
			// retry after 50ms
			if (!this.timer)
				this.timer = new Ext.util.DelayedTask( this.execute, this );
			this.timer.delay(50);
		}else {
			if (this.queue.length==0) return;
			this.state.locked=true;
			// remove the first action
			var _curr= this.queue.shift();
			this.state.currAction= _curr;
			
			// and handle it
			var action= this.actions[_curr.name];
			if (!action){
				this.state.currAction= undefined;
				this.state.locked=false;
				throw "UnknownAction";
			}
			try {
				action.execute(_curr);
			} catch (e) {
				this.log.error('[AdapMan]',e);
				this.state.currAction= undefined;
				this.state.locked=false;
				throw "AdaptationException";
			}
		}
	},
	/**
	 * Callback for actions indicating that they finished.
	 * @private
	 * @function
	 */
	_actionReady: function(action){
		if (action == this.state.currAction){
			this.state.currAction= undefined;
			this.state.locked= false;
			if (this.queue.length>0)
				this.execute(undefined);
			this.log.debug('[AdapMan] Adaptation action completed... unlocking...');
		}else {
			this.log.warn('[AdapMan] Strange:', action, this.state.currAction); }
	}
});

Ext.cruise.client.adapt.impl.DND= Ext.extend(Object, {
	target: null,
	init: false,
	start_x: 0,
	start_y:0,
	dragging: false,
	
	constructor: function(obj){
		if (obj==undefined||obj==null) return;
		if (this.init==true) return;
		this.target= obj;
		this.init= true;
		this.target.onmousedown= this.onmousedown.createDelegate(this);
		this.target.onmousemove= this.onmousemove.createDelegate(this);
		this.target.onmouseup= this.onmouseup.createDelegate(this);
		if (this.target.style.zIndex < 100)
			this.target.style.zIndex= 1000;
	},
	
	onmousedown: function(event){
		var mouse_x= document.all?window.event.clientX:event.pageX;
		var mouse_y= document.all?window.event.clientY:event.pageY;
		this.start_x= mouse_x- this.target.offsetLeft;
		this.start_y= mouse_y- this.target.offsetTop;
		this.dragging= true;
	},
	
	onmousemove: function(event){
		if (this.dragging!=true) return;
		if(this.target != undefined && this.target != null) {
			var mouse_x= document.all?window.event.clientX:event.pageX;
			var mouse_y= document.all?window.event.clientY:event.pageY;
			var w= parseInt(this.target.style.width);
			var h= parseInt(this.target.style.height);
			var x= (mouse_x-this.start_x);
			if (x<0) x=0; if (x+w> window.innerWidth) x= window.innerWidth-w;
			var y=(mouse_y-this.start_y);
			if (y<0) y=0; if (y+h> window.innerHeight) y= window.innerHeight-h;

	  		this.target.style.left=x+"px";
			this.target.style.top=y+"px";
		}
	},
	onmouseup:function(event){
		this.dragging= false;
	}
});

/**
 * The ReimportHandler is responsible for managing information about removed components to
 * allow the subsequent reintegration. Thus, it provides a simple combo-box and delegates
 * reimport-requests to the component manager. 
 */
/*Ext.cruise.client.adapt.impl.ReimportHandler= {
	reimportDiv: null,
	reimportCombo: null,
	reimports: {
		count: 0
	},
	
	addReimportOption: function(id,compConfig){
		try{
		if (!this.reimportCombo){
			var div= document.createElement("div");
			div.setAttribute("style","zIndex: 1000;padding: 1px; border-style:solid; border-width: 1px; position: absolute; top:500px; width:210px; height: 35px; border-color: black; overflow:hidden; background-color: #FFCC33;cursor:move");
			this.reimportCombo= document.createElement("select");
			this.reimportCombo.setAttribute("style", "min-width:200px;");
			new Ext.cruise.client.adapt.impl.DND(div);
			var p = document.createElement("p");
			var txt = document.createTextNode("Re-Import this component:");
			p.appendChild(txt);
			p.setAttribute("style","font-weight:bold; font-size: 0.8em; font-family: Arial;");
			div.appendChild(p);
			div.appendChild(this.reimportCombo);
			document.getElementsByTagName('body')[0].appendChild(div);
			
			this.reimportDiv = div;
		}
		if (this.reimports && !this.reimports[id]){
			var wm= applicationManagerInstance.getComponentManager();
			
			this.reimports[id]= {
				id: wm.components[id].id,
				compConfig: compConfig
			};
			this.reimports.count+=1;
			this.reimportDiv.style.visibility= "visible";
			
			var entry= document.createElement("option");
			entry.setAttribute("value",id);
			entry.appendChild( document.createTextNode(id) );
			entry.setAttribute("onclick", "Ext.cruise.client.adapt.impl.ReimportHandler.reimport(\""+id+"\")");
			this.reimportCombo.appendChild(entry);
		}
		}catch(e){alert(e);}
	},
	
	reimport: function(id){
		var entry= this.reimports[id];
		if (entry){
			var component= entry.compConfig;
			var cm= applicationManagerInstance.getComponentManager();
			// the Component Manager tries to integrate the component
			//applicationManagerInstance.getComponentManager().importComponent(this.reimports[id].compConfig, this.reimports[id].id);
			if (component.getAttribute("isTemplate")=="true"){
				cm.importComponent(component, id, false);
			}else
				cm.getByID(component);
			this.removeReimportOption(id);
		}
	},

	removeReimportOption: function(id){
		try{
		if (this.reimports && this.reimports[id]){
			delete this.reimports[id];
			this.reimports[id]= undefined;
			this.reimports.count-=1;
			if (this.reimportCombo){
				for (var i=0; i < this.reimportCombo.childNodes.length; ++i){
					var entry= this.reimportCombo.childNodes[i];
					if (entry.getAttribute("value")==id){
						this.reimportCombo.removeChild(entry);
						break;
					}
				}
				if (this.reimports.count==0){
					this.reimportDiv.style.visibility= "hidden";
				}
			}
		}
		}catch(e){this.log.error('[AdapMan]',e);}
	}
};*/
