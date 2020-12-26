/**
 * 
 * @class Ext.cruise.client.adapt.impl.ContextManager This class is responsible for managing the local context model, the context monitors and provides access to the remote context model.
 * @public
 * @extends Ext.cruise.client.adapt.IContextManager 
 * @author Carsten Radeck
 */
Ext.cruise.client.adapt.impl.ContextManager = Ext.extend(Ext.cruise.client.adapt.IContextManager, {
	monitors: null,
	context: null,
	state: {
		monitorsReady: false,
		queriesReady: false,
		initCollDone: false
	},
	updateQueue: [],

	constructor: function(logger, adaptman){
		Ext.cruise.client.adapt.impl.ContextManager.superclass.constructor.apply(this, [logger, adaptman]);

		this.monitors= new Array();
		this.context= null;
		/**
		 * @event contextChanged Internal event of the adaptation infrastructure to notify context changes.
		 * @param {String} contextParameter the changed context parameter 
		 */
		this.addEvents("contextChanged");
	},
	
	dispose: function(){
		for(var idx=0; idx< this.monitors.length; ++idx){
			try {
				this.monitors[idx].inst.deactivate();
			}catch(e){this.log.error(e);}
		}
		
		try {
			this.adapter.dispose();
		}catch(Ex){
			this.log.error(Ex);
		}
		this.state.monitorsReady= false;
		this.state.queriesReady= false;
		this.state.initCollDone= false;
		delete this.context;
		delete this.monitors;
	},

	/**
	 * Initialze this class.
	 * @param {Element} domelement
	 * @param {Ext.cruise.client.adapt.IContextServiceAdapter} contextServiceAdapter
	 */
	init: function(domelement, contextServiceAdapter){
		this.adapter= contextServiceAdapter;

		//read monitor-configuration from DOM
		if (!domelement) return;
		var defaultThreshold= domelement.getAttribute('defaultThreshold');
		var defaultConfirm= domelement.getAttribute('defaultConfirmSend');
		var modules = Ext.cruise.client.Utility.getElementsByTagNameNS( 
				Ext.cruise.client.Constants._TSRNS_IE, Ext.cruise.client.Constants._TSRNS_, 'monitor', domelement);
		
		for(var j=0; j< modules.length; ++j){
			var name= modules[j].getAttribute("name");
			var frequence= modules[j].getAttribute("threshold") || defaultThreshold;
			var needsConfirm= modules[j].getAttribute("confirmSend") || defaultConfirm;
			this.log.info("[ContextMan] Monitor:\t",name,frequence, needsConfirm);
			
			var opt;
			var params = Ext.cruise.client.Utility.getElementsByTagNameNS( 
					Ext.cruise.client.Constants._TSRNS_IE, Ext.cruise.client.Constants._TSRNS_, 'parameter', modules[j]);
				
			if (params.length > 0){
				opt={};
				for (var d=0; d<params.length; ++d){
					var pname=params[d].getAttribute("name");
					var pvalue=params[d].firstChild.nodeValue;
					if (!pname || !pvalue) continue;
					try {
						opt[pname]= eval(pvalue);
					} catch (e) {
						opt[pname]= pvalue;
					}
				}
				this.log.debug("[ContextMan] optional config-params:",opt);
			}
			var inst;
			try{
				// instantiate specified Monitor
				inst= eval('new '+name+'(frequence, this, this.log, opt);');
			}catch(e){
				this.log.error(e);
				continue;
			}
			if (!inst) continue;
			// register it
			this.monitors.push({
				inst: inst,
				confirm: needsConfirm=="true"?true:false,
				collected: false
			});
		}
		
		applicationManagerInstance.getEventBroker().subscribe(
			undefined, undefined,'object','runtimeChannel', this._sendQueuedNotifications, this);
	},
	
	// Send contextevents for queued notifications (queuing takes place if the webapp
	// isnt already started completely but croco send callbacks, e.g after a monitor
	// updated the context)
	_sendQueuedNotifications : function(){
		for (var idx=0; idx < this.updateQueue.length; ++idx){
			var path= this.updateQueue[idx];
			this.log.debug("[ContextMan] _sendQueuedNotifications: context changed: ", path);
			
			var msg= new Ext.cruise.client.Message();
			msg.setName("contextChanged");
			msg.appendToBody('contextParameter', path);
			
			this.fireEvent("contextChanged", msg, "contextChanged", "contextChannel");
		}
		
		delete this.updateQueue;
		
		applicationManagerInstance.getEventBroker().unsubscribe('runtimeChannel', this._sendQueuedNotifications, this);
	},


	_queriesReady: function(){
		if (!this.state.initCollDone){
			this.state.queriesReady= true;
			if (this.state.monitorsReady)
				this._initialCollectionDone();
		}
	},
	
	_initialCollectionDone: function(){
		this.state.initCollDone= true;
		// synchronously fetch required context-parameters
		for (var idx = 0; idx < this.requiredContextParams.length; ++idx) {
			this.updateLocalContext(this.requiredContextParams[idx], this.adapter.getContextValue(this.requiredContextParams[idx], this.context.getUri()), undefined, undefined, false);
		}
		this.log.info('[ContextMan] initial contextcollection done...');
		// signal that the context-subsystem is ready
		this.adaptman._rdy(this);
	},
	/**
	 * Tries to receive the UCP of the current user.
	 * @function
	 * @public
	 * @param {String} userid
	 * @return {boolean} true if sucessful, false otherwise
	 */
	receiveUserProfile: function(userid){
		// synchronously fetch user-profile- instance
		var ucp= this.adapter.getProfile(userid);
		if (!ucp){
			this.log.fatal('[ContextMan] Failed to receive and/or create User-context!');
			return false;
		}
		this.context = new Ext.cruise.client.adapt.impl.UserContextProfile(userid,ucp);
		return true;
	},

	/**
	 * @function
	 * @public 
	 * @return {boolean} false if no profile exists and it was impossible to add one
	 */
	collectContext: function(userid, requiredContextParams){
		this.requiredContextParams= requiredContextParams;
		this.log.info('[ContextMan] collecting context data of user',userid);
		// this cache holds all context-parameters which were already queried
		this.context.queried={};
		// subscribe for required parameters
		this.adapter.subscribe( requiredContextParams, this.context.getUri() );
		// invoke monitors, asynchronously
		this._runMonitors();
	},

	_runMonitors: function(){
        this.log.debug("[ContextMan] starting to collect context via monitors...");

        if (this.monitors.length==0){
            this.log.debug("[ContextMan] No monitors registered.");
			this.state.monitorsReady=true;
			if (this.state.queriesReady){
				this._initialCollectionDone();
			}
        }else
	        for (var m=0; m< this.monitors.length; ++m){
            try{
                // activate the monitor assuming that it starts internal contextprovisioning-activities
                // and calls back asynchronously if done (and something changed, what should hold on first
                // measurment)
                this.monitors[m].inst.activate();
            }catch(e){
                this.log.error("[ContextMan] error: "+m+" "+e);
            }
        }
	},

	/**
	 * Activates the specified monitor. 
	 * @function
	 * @public
	 * @param {String} monitorid the ID of the monitor to be activated
	 */
	activateMonitor: function(monitorid){
		for (var m=0; m< this.monitors.length; ++m){
			if (this.monitors[m].inst.getId()== monitorid){
				this.monitors[m].inst.activate();
				return;
			}
		}
		this.log.debug('[ContextMan] activateMonitor: No monitor found for id=',monitorid);
	},
	
	/**
	 * Deactivates the specified monitor.
	 * @function
	 * @public 
	 * @param {String} monitorid the ID of the monitor to be deactivated
	 */
	deactivateMonitor: function(monitorid){
		for (var m=0; m< this.monitors.length; ++m){
			if (this.monitors[m].inst.getId()== monitorid){
				this.monitors[m].inst.deactivate();
				return;
			}
		}
		this.log.debug('[ContextMan] deactivateMonitor: No monitor found for id=',monitorid);
	},

	/**
	 * Synchronously queries the context-model.
	 * It first tries to resolve it based on local information. Iff this doesnt 
	 * deliver a result CroCo is synchronously queried.
	 * @function
	 * @public
	 * @param {String} path the path representing the ontology-concept
	 * @return {Object} the value (single literal or an array of such) or undefined if not available
	 */
	getContextValue: function(path){
		var res= this.handle(path, this.context);
		if (res) return res;
		if (this.context.queried[path]){
			this.log.info("[ContextMan] getContextValue: already asked croco... value undefined");
			return undefined;
		}
		this.log.debug("[ContextMan] getContextValue: unknown... calling croco");
		var ucp= this.context.getUri();

		var ret= this.adapter.getContextValue(path, ucp);
		if(Ext.isArray(ret)){
			this.updateLocalContext(/*Ext.cruise.client.adapt.PathUtils.parsePath(path),*/
				path,
				ret);
			return this.handle(path, this.context);
		}
		return undefined;
	},
	
	/**
	 * @function
	 * @public
	 * @param {String} sparql the query in SPARQL
	 * @return {Array} an array with entries representing the the variables and their bindings.
	 * 			[{ name, instance  }] where name is the variable's name and instance a single string or an array of strings.
	 */
	queryContext: function(sparql){
		if (sparql==undefined || sparql==null) return undefined;
		
		return this.adapter.queryContext(sparql);
	},
	
	temp: [],
	/**
	 * Send context-data to the remote context-model i.e to CroCo
	 * @function
	 * @protected  
	 * @param {Ext.cruise.client.adapt.IContextMonitor} monitor References the monitor that wants to submit context data.
	 * @param {Object} context The context data represented by an array of objects with three obligatory fields: path, value+, confidence
	 */
	updateRemoteContext: function(monitor, context){
		this.log.debug("[ContextMan]",monitor.getId()," wants to send");
		/*
		 * the initial context-collecting is already done. In this case directly send the
		 * altered information via the asynchronously addContext-operation of CroCo.
		 */
		if (this.state.initCollDone){
			this.log.debug("[ContextMan] initColl done... directly sending");
			for (var i=0; i<this.monitors.length; ++i){
				if (this.monitors[i].inst == monitor){
					var allowed = true;
					if (this.monitors[i].confirm == true) {
						allowed = confirm("Monitor '" + monitor.getId() + "' wants to send contextual information to the contextmanagement, if you agree!");
					}
					if (allowed){
						this.log.debug('SendContext==============');
						/*Ext.each(context, function(a){
							this.log.debug(a);
						}, this);*/
						this.adapter.sendContext(context, this.context.getUri(), false);
						this.log.debug('SendContext==============DONE');
					}else {
						this.log.debug("sending disallowed");
					}
					
					this.monitors[i].collected= true;
					break;
				}
			}
		}else {
		/*
		 * the initial context-collecting is ongoing. In this case we use the synchronous 
		 * addContextWithResponse-operation of CroCo to make sure that information are already
		 * in the contextmodel when these are required e.g for contextsensitive initialization of components.  
		 *
		 * To increase performance the contextinformation to be sent are queued and send together when the 
		 * last monitor is ready.
		 */
			this.log.debug("[ContextMan] initColl not done... qeueing");
			var all= true;
			// check whether all monitors initially collected context
			for (var i=0; i<this.monitors.length; ++i){
				if (this.monitors[i].inst == monitor){
					this.temp= this.temp.concat(context);
					this.monitors[i].collected= true;
				}
				all= all && this.monitors[i].collected;	
			}
			
			if (all){
				var confirmation={
					required: false,
					message:""
				};
				for (var s = this.monitors.length - 1; s >= 0; s--){
					if (this.monitors[s].confirm){
						confirmation.required= true;
						confirmation.message+= this.monitors[s].inst.getContextDescription();
					}
				};
				var allowed = true;
				
				if (confirmation.required==true) {
					allowed = confirm("Contextual information are going to be sent to the contextmanagement, if you agree! ("+confirmation.message+")");
				}
				if (allowed){
					this.log.debug('[ContextMan] SendContext==============');
					/*Ext.each(context, function(a){
						this.log.debug(a);
					}, this);*/
					this.adapter.sendContext(this.temp, this.context.getUri(), true);
					this.log.debug('[ContextMan] SendContext==============DONE');
				}else {
					this.log.info("[ContextMan] sending disallowed");
				}
				
				this.log.info("[ContextMan] All monitors initially collected context");
				this.state.monitorsReady= true;
				
				delete this.temp;
				this.temp= undefined;

				if (this.state.queriesReady){
					this._initialCollectionDone();
				}
			}
		}
	},
	
	/**
	 * Updates the local context-model
	 * @function
	 * @protected
	 * @param {String} path the path of the onotology-concept
	 * @param {Array} array The context data represented by an array of objects with two obligatory fields: name, instance+
	 * @param {Ext.cruise.client.adapt.impl.Instance} root (opt) The root relativly to which the path is interpreted. By default the UCP of the current user.
	 * @param {String} rootstring (opt) represents the path of the root-instance. By default the empty string.
	 * @param {bool} fromCroCo (opt) indicates whether this information origin from CroCo
	 */
	updateLocalContext: function(/*parts*/ path, array, /* optional */ root, rootstring, fromCroCo){
		var context= root || this.context;
		
		// parts= [{prop, condition}]
		var parts= Ext.cruise.client.adapt.util.PathUtils.parsePath(path);
		var rooted= rootstring ||"";
		for (var i=0;i< parts.length; ++i){
			// {prop:..., condition:...}
			var part= parts[i];
			var previous= rooted;
			rooted+=part.prop+"/";
			this.log.info('[ContextMan] updateLocalContext', i,part);
			// array= [{name,instance}]
			for(var j=0; j<array.length; ++j){
				
				if (!array[j].instance) {
					//this.log.debug("not set @ croco");
					
					if(fromCroCo==true && i==parts.length-1 
							&& context.get(array[j].name.replace(/\_/g, ":"))){
						// the last part of a strict query contains no result
						// (this value is not set in remote model). 
						// But a value is stored in the local model, i.e
						// CroCo indicates that this value was removed from model
						var nexttolast = this.handle(previous, this.context,true);
						if (nexttolast!=undefined&&nexttolast!=null)
							nexttolast.clear(part.prop, this.adapter.getMultiplicity(rooted));
					}
					break;
				}
				// convert präfix_prop -->> präfix:prop
				var prop= array[j].name.replace(/\_/g, ":");
				
				if (prop== part.prop){
					var multipl= this.adapter.getMultiplicity(rooted);
					var isdt= this.adapter.getIsDatatypeProperty(rooted);
					//this.log.debug("matched:",rooted, multipl, isdt, j, prop);

					var valueToSet= array[j].instance;
					
					if (!isdt && j!= array.length-1 && Ext.isArray(array[j].instance)){
						//this.log.debug("---inner part is multiple -> select matching instance");
						for (var asd=0; asd< array.length; ++asd){
							if ((array[j].name+"2") == array[asd].name){
								//this.log.debug("---real instance==", array[asd].instance);
								valueToSet= array[asd].instance;
							}
						}
					}
					
					
					if (multipl==-1){
						var hasToBeArray= context.get(prop);
						if(hasToBeArray && Ext.isArray(hasToBeArray)){
							// TODO handle case that croco sends null but we have a local value (e.g if the value was removed from model)
							//this.log.debug("set");
							if (part.condition) {
								//this.log.debug("hasCondition");
								var hit = this._handleCondition(hasToBeArray, part.condition);
								//this.log.debug("HIT==", hit);
								
								if (hit){ // there is already an instance matching the condition
									context= hit;
								}else {	// a matchig instance is missing -> create a new one 
									var neu= context.set(prop, valueToSet, true);
									// and append all information concerned by the condition
									Ext.each(part.incondition, function(inner){
										this.updateLocalContext(
													/*Ext.cruise.client.adapt.PathUtils.parsePath(inner)*/
													inner,
													array, neu, rooted);
									}, this);
									context = neu;
								}
							}else {
								//this.log.debug("no condition");// only possible if last part of path
								
								if (!isdt && Ext.isArray(valueToSet)) {
									//this.log.debug(" array@its objecttype ");
									for (var kk = 0; kk < valueToSet.length; ++kk) {
										context.set(prop, valueToSet[kk], true);
									}
									//this.log.debug(" array@its done");
								}
								else {
									var neu = context.set(prop, valueToSet, true);
								//context = neu;
								}
								
							}
						}else {
							//this.log.debug("needs to be set",isdt);
							var neu= context.set(prop, valueToSet, true);
							// and append all information concerned by the condition
							Ext.each(part.incondition, function(inner){
								this.updateLocalContext(
											/*Ext.cruise.client.adapt.PathUtils.parsePath(inner)*/
											inner,
											array, neu, rooted);
							}, this);
							context = neu;
						}
					}
					if (multipl==1){
						var inst= context.get(prop);
						if (!inst) {
							inst= context.set(prop, valueToSet, false);
						} else{
							inst.setUri(valueToSet);
						}
						context= inst;
					}
					break;
				}
			}
		}
		
		if (fromCroCo) 	// indicates that its a callback from croco. 
						// necessary because results of synchronous context-queries (via adapter.getContext)
						// are handeled by this method, too
		{
			if (this.state.initCollDone) {
				this.log.info("[ContextMan] updateLocalContext: context changed: ", path);
				
				var msg= new Ext.cruise.client.Message();
				msg.setName("contextChanged");
				msg.appendToBody('contextParameter', path);
				
				this.fireEvent("contextChanged", msg, "contextChanged", "contextChannel");
			}
			else {
				this.log.info("[ContextMan] updateLocalContext@initialCollection: context changed: ", path);
				this.updateQueue.push(path);
				this.log.info("[ContextMan] queued...",this.updateQueue.length);
			}
		}
		
		this.context.queried[path]=true;
	},
	
	/**
	 * Evaluate the specified path.
	 * @function
	 * @private
	 * @param {String} path
	 * @param {Ext.cruise.client.adapt.impl.Instance} ctx (opt) The root context relativly to which the path is evaluated. By default the UCP of the current user.
	 * @param {bool} getReference (opt) indicates whether the Instance or the value is required
	 */
	handle: function(path, /* Ext.cruise.client.adapt.impl.Instance*/ ctx, getReference){
		var context= ctx || this.context;
		var array= Ext.cruise.client.adapt.util.PathUtils.parsePath(path);
		for (var i=0;i<array.length; ++i){
			var part= array[i];
			var inst= context.get(part.prop);
			//log.debug("handle-->",inst);
			if (!inst)	return undefined;
			context = inst;
			if(part.condition){
				if (!Ext.isArray(inst)) 
					throw "Conditions are only valid on objectproperties with cardinality >1!";
				//this.log.debug(part,part.condition);
				var hit= this._handleCondition(context, part.condition);
				if (hit){
					context=hit;
				}
			}
		};
		
		//this.log.debug("handle",path, context);
		if (getReference == false || getReference==undefined || getReference==null) {
			if (Ext.isArray(context)) // array of Instances to strings
			{
				var res = new Array();
				Ext.each(context, function(entry){
					res.push(entry.getUri());
				});
				return res;
			}
			return context.getUri();
		}else {
			return context;
		}
	},
	
	_handleCondition: function(instances, condition){
		this.log.debug("[ContextMan] there are",instances.length,"instances on which condition",condition,"is evaluated");
		
		for (var idx=0; idx < instances.length; ++idx){
			var instance= instances[idx];
			// filter all path-expressions and resolve them
			var _cond= condition;
			Ext.each(condition.match(/(\/\w+:\w+){1,}/g), function(asd){
				var res=this.handle(asd, instance);
				
				var neu= typeof(res)=='string'?"'"+res+"'":res;
				
				var start= _cond.indexOf(asd);
				_cond= _cond.substring(0,start)+neu+_cond.substring(start+asd.length);
			}, this);
			this.log.debug('[ContextMan] resolved condition=',_cond);
			var bool= false;
			try{
				bool= eval(_cond);
			}catch(e){this.log.error(e);}
			if (bool==true){
				this.log.debug('[ContextMan] this instance matched the condition',instance.getUri());
				return instance;
			}
		}
	}
});

/**
 * 
 * @class Ext.cruise.client.adapt.impl.Instance An instance represents a instance or literal of the ontology-based context model.
 * @public
 */
Ext.cruise.client.adapt.impl.Instance = Ext.extend(Object, {
	instance: null,
	log: null,

	constructor: function(value){
		Ext.cruise.client.adapt.impl.Instance.superclass.constructor.call(this);
		this.instance= value;
		this.log= applicationManagerInstance.getLog();
	},
	/**
	 * @function
	 * @public
	 * @return the value of that instance, which is a String or an Array
	 */
	getUri: function(){
		return this.instance;
	},
	/**
	 * Set the value.
	 * @function
	 * @public
	 */ 
	setUri: function(uri){
		this.instance= uri;
	},
	
	/**
	 * @function
	 * @private
	 * @param {String} prop
	 */
	normalize: function(prop){
		return prop.replace(/\:/g,'$');
	},
	/**
	 * Clear the value for the specified property.
	 * @function
	 * @public
	 * @param {Object} prop
	 * @param {Object} multi
	 */
	clear:function(prop, multi){
		if (multi){
			this[this.normalize(prop)]= new Array();
		}else {
			this[this.normalize(prop)]= undefined;
		}
	},
	/**
	 * Get the Instance for the specified property.
	 * @function
	 * @public
	 * @param {Object} prop
	 */
	get: function(prop){
		if (!prop) return undefined;
		this.log.info('[Instance '+this.instance+'] get',prop);
		
		return this[this.normalize(prop)];
	},
/**
 * Set the value for that property. Instances are creates as required.
 	 * @function
	 * @public

 * @param {Object} prop
 * @param {Object} value
 * @param {Object} multi
 */
	set: function(prop, value, multi){
		if(!prop) return;
		this.log.info('[Instance '+this.instance+'] set',prop,value,multi);
		
		var idx=this.normalize(prop);

		if (multi){
			//log.debug("setting multi ", value);
			if(!this[idx] && multi){
				this[idx]= new Array();
			}
			if (Ext.isArray(value))	{// only datatype-arrays
				//log.debug("...array!");
				for (var i=0; i< value.length; ++i){
					
					var known=false;
					for (var j = this[idx].length - 1; j >= 0; j--){
						if (this[idx][j].getUri() == value) {
							known=true;
							break;
						}
					};
					if (!known) {
						//log.debug("...adding", value[i]);
						this[idx].push(new Ext.cruise.client.adapt.impl.Instance(value[i]));
					}
				}
			}else {
				var known=false;
				for (var i = this[idx].length - 1; i >= 0; i--){
					if (this[idx][i].getUri() == value) {
						known=true;
						
						return this[idx][i];
					}
				};
				//log.debug("...single!",known);
				if (!known) {
					var a1= new Ext.cruise.client.adapt.impl.Instance(value);
					this[idx].push(a1);
					return a1;
				}
			}
		}else {
			//log.debug("setting single ", value);
			this[idx]= new Ext.cruise.client.adapt.impl.Instance(value);
		}

		return this[idx];
	}
});

/**
 * 
 * @class Ext.cruise.client.adapt.impl.UserContextProfile An instance represents the instance of the current users cruise:UserContextProfile 
 * @extends Ext.cruise.client.adapt.impl.Instance
 * @public
 */
Ext.cruise.client.adapt.impl.UserContextProfile = Ext.extend(Ext.cruise.client.adapt.impl.Instance,{
	userId: null,

	constructor: function(userId, value){
		Ext.cruise.client.adapt.impl.UserContextProfile.superclass.constructor.call(this,value);
		this.userId= userId;
	}
});
