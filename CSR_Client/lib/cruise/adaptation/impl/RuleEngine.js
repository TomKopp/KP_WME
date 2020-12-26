/**
 * @class Ext.cruise.client.adapt.impl.RuleEngine The basic implementation of Ext.cruise.client.adapt.IRuleEngine. A RuleEngine
 * is responsible for calulating rules that trigger for certain events.
 * @extends Ext.cruise.client.adapt.IRuleEngine
 * @public
 * @author Carsten Radeck
 */
Ext.cruise.client.adapt.impl.RuleEngine = Ext.extend(Ext.cruise.client.adapt.IRuleEngine, {
	eventbroker: null,

	constructor: function(log, adaptman, broker, contextMgr){
		Ext.cruise.client.adapt.impl.RuleEngine.superclass.constructor.apply(this, [log,adaptman,contextMgr]);
		this.eventbroker= broker;
		
		this.contextMgr.on("contextChanged", this.handleEvent, this);
		
		// register for "integrationFinished" to check for flagged rules (which indicates, that they have to be 
		// evaluated once).
		broker.subscribe(undefined, undefined,'object','runtimeChannel', this._handleFlaggedRules, this);
	},

	/**
	 * Handle rules that should be evaluated at startup.
	 * @private
	 * @function
	 */
	_handleFlaggedRules: function(){
		this.log.debug("[RuleEngine] searching for special rules");
		
		var triggering= new Array();
		for (var idx=0; idx < this.rules.length; ++idx){
			var rule= this.rules[idx];
			if (rule.flag==true){
				if (this._validateCondition(rule.condition.js)==true){
					this.log.debug("[RuleEngine] Rule id=",rule.id,"triggers!");
					
					triggering.push(rule);
				}
			}
		}
		triggering= this._sort(triggering);
		
		this._executeRules(triggering);
		//this.eventbroker.unsubscribe(undefined, 'runtimeChannel', this._handleFlaggedRules, this);
		this.eventbroker.unsubscribe('runtimeChannel', this._handleFlaggedRules, this);
	},
	
	/**
	 * Execute triggering rules.
	 * @param {Array} triggering rules that trigger
	 * @private
	 * @function
	 */
	_executeRules: function(triggering){
		// execute all actions of sorted triggering rules; assume that actions are already sorted
		Ext.each(triggering, function(rule){
			try {
				this.adaptman.execute(rule.actions);
			}catch(e){
				this.log.fatal("[RuleEngine] error",e);
				if (!rule.errorcount) rule.errorcount=1;
				else
					rule.errorcount+=1;
				if (rule.errorcount>= Ext.cruise.client.adapt.Constants.ERRORTHRESHOLD){
					this.log.fatal("[RuleEngine] Rule(id="+rule.id+") caused "+rule.errorcount+" errors and is removed now!");
					this.rules.remove(rule);
					delete rule;
				}
			}
		}, this);
	},
	
	/**
	 * Resets this runtime component to enable the execution of a new application on the fly.
	 */
	dispose: function(){
		Ext.cruise.client.adapt.impl.RuleEngine.superclass.dispose.call(this);
		this.eventbroker.deregisterComponent("ruleengine");
	},
	
	/**
	 * Eventhandler that processes application and runtime events from the event broker
	 * as well as context events from the Context Manager.
	 * 
	 * @param {Ext.cruise.client.Message} message a message object
	 * @param {Object} channel name of the channel
	 */
	handleEvent: function( message, channel ){
		var eventname= message.getName();
		var data= message.getBody();
		this.log.debug("[RuleEngine] handleEvent:",eventname,"@",channel);
		
		var triggering= new Array();
		for(var i=0; i < this.rules.length; ++i){
			var rule= this.rules[i];
			if (rule.event.name == eventname){
				// handle the reserved contextevent
				if (eventname=="contextChanged"){
					if (rule.event.param!= data.contextParameter){
						continue;
					}
				}
				
				if (rule.condition){ // ECA-Rule
					if (this._validateCondition(rule.condition.js, data)==true){
						this.log.debug("[RuleEngine] Rule id=",rule.id,"triggers!");
						
						triggering.push(rule);
					}
				}else { // EA-Rule
					this.log.debug("[RuleEngine] Rule id=",rule.id,"triggers!");
					triggering.push(rule);
				}
			}
		}
		// sort the rules descending by priority
		triggering= this._sort(triggering);
		
		this._executeRules(triggering);
	},
	
	/**
	 * Add a rule
	 * @param {Object} rule the rule
	 * @public
	 * @function
	 */
	addRule: function(rule){
		// TODO to be implemented
		this.log.fatal("[RuleEngine] addRule: not yet supported");
	},
	/**
	 * Remove a rule specified by ID
	 * @public
	 * @function 
	 * @param {Object} id ID of the rule
	 */
	removeRule: function(id){
		for (var i=0; i<this.rules.length; ++i){
			if (this.rules[i].id == id){
				this.rules.remove(this.rules[i]);
				break;
			}
		}
	},

	/**
	 * Parses the given ruleset and returns required (i.e referenced) context-parameters
	 * 
	 * @param {Object} domelement the DOM representing the ruleset
	 * @public
	 * @function
	 */
	parseRules: function(domelement){
		if (!domelement) return;

		var _start= new Date();
		var relevantContext= new Array();
		var rules = Ext.cruise.client.Utility.getElementsByTagNameNS( 
						Ext.cruise.client.adapt.Constants._ADAPTNS_IE, 
						Ext.cruise.client.adapt.Constants._ADAPTNS_, 
						'Rule', domelement);
		
		for (var i=0; i< rules.length; ++i){
			var curr= rules[i];
			
			var rule= {};
			rule.id= curr.getAttribute("id");
			rule.priority= parseInt(curr.getAttribute("priority"));
			// assume exactly one Event-Element
            var list = Ext.cruise.client.Utility.getElementsByTagNameNS( 
							Ext.cruise.client.adapt.Constants._ADAPTNS_IE, 
							Ext.cruise.client.adapt.Constants._ADAPTNS_, 
							'ApplicationEvent', curr);
			
			var type= Ext.cruise.client.adapt.Constants.APP_EVENT;
			if (list.length == 0) {
                list = Ext.cruise.client.Utility.getElementsByTagNameNS(
								Ext.cruise.client.adapt.Constants._ADAPTNS_IE,
								Ext.cruise.client.adapt.Constants._ADAPTNS_,
								'ContextEvent', curr);
				
				type= Ext.cruise.client.adapt.Constants.CTX_EVENT;
				if (list.length == 0) {
					list = Ext.cruise.client.Utility.getElementsByTagNameNS(
									Ext.cruise.client.adapt.Constants._ADAPTNS_IE,
									Ext.cruise.client.adapt.Constants._ADAPTNS_,
									'RuntimeEvent', curr);
					type= Ext.cruise.client.adapt.Constants.RT_EVENT;
				}
			}
			if (list.length==0) {
				this.log.error("[RuleEngine] Invalid event-part of rule(id="+rule.id+")");
				continue;
			}
			
			var ctx;
			var concreteEvent=list[0];
			ctx= list[0];
			rule.event= {};
			if (type == Ext.cruise.client.adapt.Constants.CTX_EVENT) {// ContextEvent
				rule.event.name = "contextChanged";
				rule.event.param= concreteEvent.getAttribute("contextParam");
				if (!rule.event.param) {
					this.log.error("[RuleEngine] Missing context-parameter!");
					continue;
				}
				Ext.cruise.client.adapt.util.PathUtils.extractContextParams("$"+rule.event.param+"$", relevantContext);
			}else{ // ApplicationEvent or RuntimeEvent (same scheme)
				rule.event.name = concreteEvent.getAttribute("name");
				rule.event.channel= concreteEvent.getAttribute("channel");
				if (!rule.event.channel) {
					this.log.error("[RuleEngine] Missing channel!");
					continue;
				}
			}

			if (!rule.event.name) {
				this.log.error("[RuleEngine] Missing event-name!");
				continue;
			}
			
			// handle condition part============================================
			var condition = Ext.cruise.client.Utility.getElementsByTagNameNS(
									Ext.cruise.client.adapt.Constants._ADAPTNS_IE,
									Ext.cruise.client.adapt.Constants._ADAPTNS_,
									'Condition', curr);
			if (condition.length==1){
				rule.condition={};
				var builtCondition= this._buildCondition(condition[0]);
				rule.condition.js= builtCondition.js;

				this.log.debug("[RuleEngine] unfold condition to: "+rule.condition.js);
				if (!rule.condition.js) {
					this.log.error("[RuleEngine] Invalid conditionpart!");
					continue;
				}
				ctx= condition[0];
				// extract req. contextparams
				if (type == Ext.cruise.client.adapt.Constants.CTX_EVENT) {
					var temp = builtCondition.contextparams;
					// check if contextparam of ContextEvent appears in condition too
					// -> special case; we fake a context-update afterwards
					for (var idx = 0; idx < temp.length; ++idx) {
						var now= temp[idx];
						if (relevantContext.indexOf(now)==-1)
							relevantContext.push(now);
						if (rule.event.param == now){
							rule.flag= true;
							break;
						}
					}
				}else {
					for (var ii = builtCondition.contextparams.length - 1; ii >= 0; ii--){
						var ccp= builtCondition.contextparams[ii];
						if (relevantContext.indexOf(ccp)==-1)
							relevantContext.push(ccp);
					};
				}
			}
			// =================================================================
			
			
			//handle action-part ===============================================
			rule.actions= [];
			while((ctx= ctx.nextSibling)){
				var localname= ctx.localName;
				
				var _action=undefined;
				switch(localname){
					case 'ComponentAction':
					case 'ChannelAction':
					case 'MixedAction':
						_action= {};
						_action.type= localname;
						break;
				}
				
				if (_action){
					_action.priority= parseInt(ctx.getAttribute("priority")||1);
					
					var pointcut= ctx.getAttribute("pointcut");
					if (pointcut){
						_action.pointcut= pointcut.split(" ");
					}
					
					// handle Elements
					for (var k=0; k< ctx.childNodes.length; ++k){
						var node= ctx.childNodes[k];
						// nodeType of Element-nodes == 1 (see DOM-spec)
						if (node.nodeType != 1) continue;
						
						_action.config= {};
						_action.name= node.localName;
						switch(node.localName){
							case "exchangeComponent":
								// this prototype only supports 1:1 exchange of components
								var nc = Ext.cruise.client.Utility.getElementsByTagNameNS(
											Ext.cruise.client.adapt.Constants._ADAPTNS_IE,
											Ext.cruise.client.adapt.Constants._ADAPTNS_,
											'newComponent', node)[0];
								//_action.config.cclass= nc.getAttribute("cclass");
								_action.config.id= nc.getAttribute("id");
								break;
							case "reconfigureComponent":
								_action.config.property= node.getAttribute("property");
								var _valuenode = Ext.cruise.client.Utility.getElementsByTagNameNS(
														Ext.cruise.client.adapt.Constants._ADAPTNS_IE,
														Ext.cruise.client.adapt.Constants._ADAPTNS_,
														'value', node)[0];
								
								if (_valuenode.childNodes.length==1 && _valuenode.childNodes[0].nodeType == 3) {//TEXT_NODE
									_action.config.value = _valuenode.childNodes[0].nodeValue;
									_action.config.isPrimitive= true;
								}else {
									var _node;
									for (var vnc = 0; vnc < _valuenode.childNodes.length; ++vnc) {
										if(_valuenode.childNodes[vnc].nodeType==1){//ELEMENT_NODE
											_node= _valuenode.childNodes[vnc];
											break;
										}
									}
									try{
										_action.config.value=new XMLSerializer().serializeToString(_node);
										_action.config.isPrimitive= false;
									}catch(F){
										this.log.warn(F);
									}
								}
								// search for referenced context parameters in the action-part
								Ext.cruise.client.adapt.util.PathUtils.extractContextParams(_action.config.value, relevantContext);
								break;
							case "setVisibility":
								_action.config.visible= node.getAttribute("visible")=="true"?true: false;
								break;
							case "fireEvent":
								_action.config.eventname= node.getAttribute("eventname");
								var asd = Ext.cruise.client.Utility.getElementsByTagNameNS( 
													Ext.cruise.client.adapt.Constants._ADAPTNS_IE, 
													Ext.cruise.client.adapt.Constants._ADAPTNS_, 
													'value', node);
								
								if (asd.length==1)
									_action.config.value= asd[0].firstChild.nodeValue;
								break;
							case "changeLayout":
								// changeLayout is "anyType", but in case of the TSR we assume a simple string containing the JSON
								_action.config.params= Ext.util.JSON.decode(node.firstChild.nodeValue);

								/*_action.config.type= node.getAttribute("type");
								var params= node.getElementsByTagNameNS(Ext.cruise.client.adapt.Constants._ADAPTNS_,"parameter");
								_action.config.params= {};
								for(var p=0;p<params.length;++p){
									var ps= params[p];
									var prop= ps.getAttribute("property");
									var val= ps.getElementsByTagNameNS(Ext.cruise.client.adapt.Constants._ADAPTNS_,"value")[0].firstChild.nodeValue;
									// search for referenced context parameters in the action-part
									//Ext.cruise.client.adapt.util.PathUtils.extractContextParams(val, relevantContext);
									try{val= Ext.util.JSON.decode(val);}catch(E){this.log.error(E);}

									_action.config.params[prop]= val;
								}*/
								break;
							case "updateContext":
								_action.config.contextparam= node.getAttribute("contextParam");
								_action.config.value= node.getAttribute("value");
								// search for referenced context parameters in the action-part
								Ext.cruise.client.adapt.util.PathUtils.extractContextParams(_action.config.value, relevantContext);
								break;
							case "addSubscriber":
								_action.config.handler= node.getAttribute("handler");
							case "removeSubscriber":
								_action.config.component=node.getAttribute("component");
								break;
							case "setMonitorActive":
								_action.config.active= node.firstChild.nodeValue=="true"?true:false;
								break;
							case "addPublisher":
							case "removePublisher":
								_action.config.component= node.getAttribute("component");
								_action.config.eventname=node.getAttribute("eventname");
								break;
						}
						break;
					}
					
					//this.log.debug(_action,_action.pointcut,_action.config);
					rule.actions.push(_action);					
				}
			}
			
			rule.actions= this._sort(rule.actions);
			// =================================================================
			
			// register for notification at the eventbroker
			if (type==Ext.cruise.client.adapt.Constants.APP_EVENT || type==Ext.cruise.client.adapt.Constants.RT_EVENT){
				this._subscribe(rule.event.name, rule.event.channel);
			}
			
			// add the rule
			this.log.debug("[RuleEngine] adding rule",rule);
			this.rules.push(rule);
		}
		
		this.log.info("[RuleEngine] parsed Rules in",(new Date()).getTime()- _start.getTime(),"ms");
		return relevantContext;
	},
	
	/**
	 *	helper-function to flatten the recursive structure to a single piece of javascript
	 * @private
	 * @function 
	 */  
	_buildCondition: function(condition, op, yes){
		if (!condition) return;
		
		var ctxparams= [];
		var result="";
		var first= (yes==undefined||yes==null)? true: yes;
		for (var i=0; i<condition.childNodes.length; ++i){
			var node= condition.childNodes[i];
			switch(node.localName){
				case "and":
					var a= this._buildCondition(node, "&&", true);
					if(!a) return undefined;
					for (var g = a.contextparams.length - 1; g >= 0; g--){
						var h= a.contextparams[g];
						if (ctxparams.indexOf(h)==-1)
							ctxparams.push(h);
					};
					result+= ( op&&!first?op:"" ) +"("+a.js+")";
					first= false;
					break;
				case "or":
					var b=  this._buildCondition(node, "||", true);
					if (!b) return undefined;
					for (var g2 = b.contextparams.length - 1; g2 >= 0; g2--){
						var t= b.contextparams[g2];
						if (ctxparams.indexOf(t)==-1)
							ctxparams.push(t);
					};
					result+= ( op&&!first?op:"" ) +"("+b.js+")";
					first= false;
					break;
				case "term":
					var operator=node.getAttribute("operator");
					switch(operator){
						case 'eq':operator="==";break;
						case 'neq':operator="!=";break;
						case 'lt':operator="<";break;
						case 'gt':operator=">";break;
						case 'lte':operator="<=";break;
						case 'gte':operator=">=";break;
					}
					
					var literal="";
					var operand="";
					for (var idx=0; idx<node.childNodes.length;++idx){
						var cur =node.childNodes[idx];
						if (cur.localName=="Literal"){
							literal= cur.firstChild.nodeValue;
							literal= utils.trim(literal);
						}
						if (cur.localName=="ContextParam"){
							var param= cur.firstChild.nodeValue;
							param= utils.trim(param);
							if (ctxparams.indexOf(param)==-1)
								ctxparams.push(param);
							operand = "contextMgr.getContextValue('"+param+"')";
						}
						if (cur.localName=="EventParam"){
							var param= cur.firstChild.nodeValue;
							param= utils.trim(param);
							operand = "getEventValue(eventData,'"+param+"')";
						}
						if (cur.localName=="SparqlQuery"){
							var param= cur.firstChild.nodeValue;
							param= utils.trim(param);
							operand= "contextMgr.queryContext(\""+param+"\")";
						}
					}
					if (!operator || !literal || !operand) return undefined;
					
					// parse keywords
					// TODO parse TYPE and ISA keywords -> realize e.g via contextMgr.queryContext
					if (operator == "contains") {
						result= result+ ( !first?op:"" ) + "contains("+operand+"," + literal + ")";
					} else if (operator == "notcontains") {
						result= result+ ( !first?op:"" ) + "!contains("+operand+"," + literal + ")";
					} else {
						// standard-case
						result = result + ( !first?op:"" ) + operand + " " + operator + " " + literal;
					}
					
					first= false;
					break;
			}
		}
		
		return {
			js: result,
			contextparams: ctxparams
		};
	},

	/**
	 * helper-function to validate the condition (javascript expression) 
	 *  
	 * @private
	 * @function
	 * @return boolean value; true iff condition holds 
	 */ 
	_validateCondition: function(condition, eventData){
		var contextMgr = this.contextMgr;
		var getEventValue= this._getEventValue;
		var contains= this._contains;
		
		var res;
		try{
			this.log.info("[RuleEngine] evaluating condition=",condition);
			var res= eval(condition) || false;
		}catch(e){
			this.log.fatal(e);
			res= false;
		}
		this.log.debug("[RuleEngine] VALIDATE result=",res);
		return res;
	},
	/**
	 * helper-function to subscribe for a given event and channel at the eventbroker
	 * @private
	 * @function 
	 */
	_subscribe: function(eventname, channel){
		if (this.eventbroker && eventname){
			this.log.debug("[RuleEngine] subscribing",eventname,channel);
			//this.eventbroker.subscribe(eventname, undefined, channel, this.handleEvent, this);
			this.eventbroker.subscribe("ruleengine", "handleEvent", undefined, channel, this.handleEvent, this);
		}
	},
	
	/**
	 * helper-function that sorts an array of objects where each object has an member named 'priority'
	 * @private
	 * @function 
	 */ 	
	_sort: function(array){
		if (array.length<=1) return array;
		
		// define the comparator for given objects
		function sortDescByPriority(a, b) {
		    var x = a.priority;
		    var y = b.priority;
		    return ((x < y) ? 1 : ((x > y) ? -1 : 0));
		}
		// use the native sorting algorithm provided by the browser
		array.sort(sortDescByPriority);
		
		return array;
	},
	
	/**
	 * helper-function to process referenced EventParameters in condition-parts of rules
	 * @private
	 * @function 
	 */ 
	_getEventValue: function(eventData, param){
		var resolved;
		// try to resolve it by interpreting it as the index
		try{
			if (Ext.isArray(eventData)){
				var idx=parseInt(param);
				if (idx && idx > 0 && idx < eventData.length){
					resolved= eventData[idx];
				}
			}
		}catch(e){}
		
		if (!resolved) {
			// second try... interprete it as the parameter-name this time
			try {
				if (eventData) 
					resolved = eventData[param];
			} catch(e) {}
		}
		return resolved;
	},
	/**
	 * helper-function to process the 'CONTAINS' and 'NOTCONTAINS' operator of condition-parts of rules
	 * @private
	 * @function 
	 */ 	
	_contains: function(datastructure, value){
		if (!datastructure||!value) return false;
		if (!Ext.isArray(datastructure)) return false;
		return datastructure.indexOf(value)!=-1;
	}
});