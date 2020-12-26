/**
 * @class Ext.cruise.client.adapt.impl.ExchangeComponent
 * This Action is responsible for exchanging two components.
 * It implements the specified protocol [Radeck2010]
 * @extends Ext.cruise.client.adapt.IAction
 * 
 * @author Carsten Radeck
 * @author <a href="mailto:stefan.pietschmann">Stefan Pietschmann</a>
 */
Ext.cruise.client.adapt.impl.ExchangeComponent = Ext.extend(Ext.cruise.client.adapt.IAction, {
	
	constructor: function(adaptMan, componentMan, contextMgr, logger){
		Ext.cruise.client.adapt.impl.ExchangeComponent.superclass.constructor.apply(this,[adaptMan, componentMan, contextMgr, logger]);
	},
	
	execute: function(action){
		var id= action.config.id;
		var b= action.pointcut[0];
		var combo_id= 'change_'+b;
		var combo;
		var combo_elem = Ext.get(combo_id);
		if (combo_elem)
			combo= combo_elem.dom;
		
		var cm= this.componentMan;
		var cinstance= cm.getComponentInstance(b);

		// make sure that the destinated component isnt already in that placeholder 
		// (which may occur if the exchange-rule triggered before) 
		if (cm.components[b].id == id) {
			this.log.info("[ExchangeComponent] Equal URIs for placeholder",b,". Exchange aborted.");
			this.adaptMan._actionReady(action);
			return;
		}

		if (combo!=undefined && combo!=null){
			// clear combo-box-entries
			var rem=[];
			Ext.each(combo.childNodes, function(c){
				if (c.nodeName=="OPTION"){
					rem.push(c);
				}
			});
			Ext.each(rem, function(f){
				combo.remove(f);
			});
		}

		// invoke the prepare-method
		// TODO make it asynch.
		if (Ext.isFunction(cinstance.prepare))
			cinstance.prepare();
		
		// get the state of the old component
		var state= Ext.cruise.client.adapt.impl.ExchangeComponent.GETSTATE(cinstance, b);
		
		// block the proxy
		cm.components[b].proxy.block();
		// hide the old component
		if (this.componentMan.isUIC(b))
			cinstance.hide();
		
		var me= this;
		
		function compready(msg){
			var cid = msg.getBody()["cid"];
			var eventName= msg.getName();
			if (cid!= b) {me.log.debug("[ExchangeComponent] compready",cid,"but expected",b); return;}
			
			// implicit ABORT from the Component Manager
			if (eventName== "IntegrationError" || eventName== "InstantiationError" 
					|| eventName== "AccessDeniedError" || eventName== "NotFoundError"){
				me.log.debug("[ExchangeComponent] CM sends abort");
				
				cm.abortExchange(b);
			}
			
			// implicit READY from the Component Manager
			if (eventName == "componentInitialized") {
				me.log.debug("[ExchangeComponent] CM sends ready");
				try {
					var asd = cm.getComponentInstance(b);
					
					if (!combo){
						var temp = Ext.get('change_'+b);
						if (temp)
							combo= temp.dom;

					}

					if (combo) {
						var alts = cm.components[b].alternatives;

						if (!alts) 
							combo.hidden = true;
						else {
							combo.hidden = false;
							var opt = document.createElement("option");
							opt.appendChild(document.createTextNode("exchange with ..."));
							combo.appendChild(opt);
							for (var n = 0; n < alts.length; ++n) {
								var opt = document.createElement("option");
								//opt.appendChild(document.createTextNode(alts[n].name + " @" + alts[n].id));
								opt.appendChild(document.createTextNode(alts[n].id));
								combo.appendChild(opt);
							}
						}
					}else { // this case may occure if an adaptationrule triggers "too early" and
							// there is no DOM-representation of the adaptability-panel (and thus the 
							// combo-box of alternatives) yet. Thats why we delay the clearance and 
							// refilling of the combo-box, assuming that it is rendered afterwards. 
						new Ext.util.DelayedTask( function(placeholder){
							try {
								me.log.debug("[ExchangeComponent] retry setting of alternatives for placeholder",placeholder);
								var combo;
								var temp = Ext.get('change_'+placeholder);
								if (temp)
									combo= temp.dom;
								if (combo == undefined || combo == null) {
									me.log.debug("[ExchangeComponent] combo still undefined");
									return;
								}
								// clear combo-box-entries
								var rem=[];
								Ext.each(combo.childNodes, function(c){
									if (c.nodeName=="OPTION"){
										rem.push(c);
									}
								});
								Ext.each(rem, function(f){
									combo.remove(f);
								});
								delete rem;
								// set alternatives
								var alts = cm.components[placeholder].alternatives;
								if (!alts) 
									combo.hidden = true;
								else {
									combo.hidden = false;
									var opt = document.createElement("option");
									opt.appendChild(document.createTextNode("exchange with ..."));
									combo.appendChild(opt);
									for (var n = 0; n < alts.length; ++n) {
										var opt = document.createElement("option");
										//opt.appendChild(document.createTextNode(alts[n].name + " @" + alts[n].id));
										opt.appendChild(document.createTextNode(alts[n].id));
										combo.appendChild(opt);
									}
								}
							} catch (e) {
								me.log.error(e);
							}
						}, this, [b]).delay(1000);
					}
					Ext.cruise.client.adapt.impl.ExchangeComponent.SETSTATE(asd, state, b);
					
					cm.commitExchange(b);
					
					applicationManagerInstance.getEventBroker().unsubscribe('errorChannel', this, this);
					applicationManagerInstance.getEventBroker().unsubscribe('componentLCChannel', this, this);
				}
				catch (e) {
					me.log.error(e);
				}
			}
			
			//unblock proxy
			applicationManagerInstance.getComponentManager().components[b].proxy.free();
			
			// signal that execution completed
			me.adaptMan._actionReady(action);
			
		};

		// Listen for events on errorChannel to receive the status of the Component Manager and handle them in the above function 'compready'.
		// Error events regarding the ID of the current component are interpreted as ABORT, 'componentInitialized' as READY.
		applicationManagerInstance.getEventBroker().subscribe(
			undefined, undefined, 'object', 'errorChannel', compready, compready);
		applicationManagerInstance.getEventBroker().subscribe(
			undefined, undefined, 'object', 'componentLCChannel', compready, compready);

		// the Component Manager tries to integrate the new component
		cm.importComponent(cm.getSMCDL(b),//cm.getComponentConfig(b),
				id, true, b, action.config.reqRespObj);
	}
});
/**
 * Function to set the state of the specified component based on the memento. 
 * @function
 * @private
 */
Ext.cruise.client.adapt.impl.ExchangeComponent.SETSTATE= function(component, memento, cid){
	// DOM-representation of the interface-binding of that uic
	var cm= applicationManagerInstance.getComponentManager();
	var mcdl = cm.getSMCDL(cid);
	var defs= cm.getMediationConfig();

	// DOM-representation of entry in composition model
	var componentconfig= cm.getComponentConfig(cid);
	// object that contains all properties
	var phprops=null;
	
	var log= applicationManagerInstance.getLog();
	
	function getDefault(curr){
		var def= curr.getElementsByTagName("default");
		var defaultValue;
		if (def.length==1){
			var defaultValue;
			var defaultElem= def[0];
			if (defaultElem.childNodes.length == 1 && defaultElem.childNodes[0].nodeType == 3) {//TEXT_NODE
				defaultValue = defaultElem.childNodes[0].nodeValue;
			} else {
				// there seems to be at least one element
				var _node;
				for (var vnc = 0; vnc < defaultElem.childNodes.length; ++vnc) {
					if (defaultElem.childNodes[vnc].nodeType == 1) {//ELEMENT_NODE
						_node = defaultElem.childNodes[vnc];
						break;
					}
				}
				try {
					defaultValue = new XMLSerializer().serializeToString(_node);
				} catch (F) {
					log.warn(F);
				}
			}
		}
		return defaultValue;
	};

	//var handled= [];
	for (var name in defs[cid].properties){
		var component_prop_name= defs[cid].properties[name].name;
		log.debug("[SETSTATE] setting ", name,"->",component_prop_name);

		// use properties stored in the memento
		if (memento!=undefined && memento!=null && memento[name]){
			log.debug("[SETSTATE] found in memento");
			log.debug("[SETSTATE] setting",name, memento[name]);
			component.setProperty(name, memento[name]);
			//handled.push(component_prop_name);
		} else {
			if (phprops==null) { //lazy loading
				phprops= {};
				log.debug("[SETSTATE] querying properties in smcdl since",name,"is not set in the memento.");
				
				var temp = Ext.cruise.client.Utility.getElementsByTagNameNS(Ext.cruise.client.Constants._CCM_NS_IE, Ext.cruise.client.Constants._CCM_NS_, 'property', componentconfig);
				for (var k=0; k< temp.length; ++k){
					var _name= temp[k].getAttribute("name");
					if (!phprops[_name]){
						phprops[_name]= temp[k].getAttribute("value");
					}
				}
			}

			// first try to extract the value out of the composition model
			if (phprops[name]){
				log.debug("[SETSTATE] found in composition model");
				// check for context-parameters
				var value= Ext.cruise.client.adapt.util.PathUtils.expandContextReferences(phprops[name], "applicationManagerInstance.getAdaptationManager()");
				value= Ext.util.JSON.decode(value);
				log.debug("[SETSTATE] setting",name, value);
				component.setProperty(name, value);
				//handled.push(component_prop_name);
			// if not set there use the default-value defined in the SMCDL's interface
			} else {
				log.debug("[SETSTATE] using default value from SMCDL");
				
				var curr;
				var pelems= mcdl.getElementsByTagName("property");
				for (var cp = pelems.length - 1; cp >= 0; --cp){
					if (pelems[cp].getAttribute("name") == component_prop_name ) {
						curr= pelems[cp];
						break;
					}
				};
				
				var defaultValue = getDefault(curr);
				log.debug("[SETSTATE] setting",name, defaultValue);
				component.setProperty(name, defaultValue);
				//handled.push(component_prop_name);
			}
		}
	}
	
	/* 
	 * handle properties not matched by the template but with a default value (unmatched properties without default value
	 *   are not possible since the matching sorts such candidates out).
	 */
	/*var properties = mcdl.getElementsByTagName("property");
	for (var idx = 0; idx < properties.length; ++idx) {
		var curr= properties[idx];
		var name= curr.getAttribute("name");
		
		if (handled.indexOf(name)!=-1){ continue; }
		
		var defaultValue= getDefault(curr);
		log.debug("[SETSTATE] setting default value ", defaultValue, "to property",name," which is not part of the template.");
		component.setProperty(name, defaultValue);
	}*/
};
/**
 * Gets the state of the specified component. This includes contacting the CIS to receive the non-transient properties of the component's class(es)
 * @function
 * @private
 * @deprecated
 * @param {Object} component
 * @param {Object} id
 */
Ext.cruise.client.adapt.impl.ExchangeComponent.GETSTATE= function(component, name){
	var defs= applicationManagerInstance.getComponentManager().getMediationConfig();
	
	var log= applicationManagerInstance.getLog();
	var memento= {};
	if (defs[name] != undefined && defs[name]!=null){
		var properties= defs[name].properties;
		for(var prop in properties){
			var value=null;
			try {
				value = component.getProperty(prop);
			}catch (e) {}
			
			log.debug("[GETSTATE] storing:",prop,value);
			memento[prop]= value;
		}
	}
	return memento;
};


/**
 * @class Ext.cruise.client.adapt.impl.ReconfigureComponent Action for reconfiguring components
 * @extends Ext.cruise.client.adapt.IAction
 * @author Carsten Radeck
 */
Ext.cruise.client.adapt.impl.ReconfigureComponent = Ext.extend(Ext.cruise.client.adapt.IAction, {
	
	constructor: function(adaptMan, componentMan, contextMgr, logger){
		Ext.cruise.client.adapt.impl.ReconfigureComponent.superclass.constructor.apply(this,[adaptMan, componentMan, contextMgr, logger]);
	},
	
	execute: function(action){
		var pname= action.config.property;
		var pvalue=action.config.value;
		var pointcut= action.pointcut;
		// iterate the pointcut
		for (var idx=0; idx < pointcut.length; ++idx){
			var comp= this.componentMan.getComponentInstance(pointcut[idx]);
			if (!comp) continue;
			// resolve referenced context-parameters
			if (action.config.isPrimitive == true) {
				pvalue = Ext.cruise.client.adapt.util.PathUtils.expandContextReferences(pvalue, "applicationManagerInstance.getAdaptationManager()");
				pvalue = eval(pvalue);
			} else {
				pvalue = Ext.cruise.client.adapt.util.PathUtils.expandContextParams(pvalue, this.contextMgr);
			}
			// set the value
			comp.setProperty(pname, pvalue);
		}
		
		// signal that execution completed
		this.adaptMan._actionReady(action);
	}
});

/**
 * @class Ext.cruise.client.adapt.impl.ChangeLayout Action for changing the layout
 * @author Carsten Radeck
 * @extends Ext.cruise.client.adapt.IAction 
 */
Ext.cruise.client.adapt.impl.ChangeLayout = Ext.extend(Ext.cruise.client.adapt.IAction, {
	
	constructor: function(adaptMan, componentMan, contextMgr, logger){
		Ext.cruise.client.adapt.impl.ChangeLayout.superclass.constructor.apply(this,[adaptMan, componentMan, contextMgr, logger]);
	},
	
	execute: function(action){
		var params= action.config.params;
		if (Ext.isArray(action.pointcut)) {
			// iterate the pointcut
			for (var idx = 0; idx < action.pointcut.length; ++idx) {
				try {
					// simply delegate to the layout-manager, passing all parameters in JSON
					applicationManagerInstance.layoutManager.setLayoutHierarchy(action.pointcut[idx], params);
				} 
				catch (e) {
					this.log.error(e);
				}
			}
		}

		// signal that execution completed
		this.adaptMan._actionReady(action);
	}
});


/**
 * @class Ext.cruise.client.adapt.impl.RemoveComponent Action for removing components
 * @extends Ext.cruise.client.adapt.IAction 
 * @author Carsten Radeck
 */
Ext.cruise.client.adapt.impl.RemoveComponent = Ext.extend(Ext.cruise.client.adapt.IAction, {
	
	constructor: function(adaptMan, componentMan, contextMgr, logger){
		Ext.cruise.client.adapt.impl.RemoveComponent.superclass.constructor.apply(this,[adaptMan, componentMan, contextMgr, logger]);
	},
	
	execute: function(action){
		try{
			if (Ext.isArray(action.pointcut)) {
				// iterate the pointcut
				for (var idx = 0; idx < action.pointcut.length; ++idx) {
					var cid= action.pointcut[idx];
					// due to the fact that the DOM-representation of the component config
					// is going to be deleted while removing the component, we have to store it
					var compEntry= this.componentMan.getComponentInstance(cid);
					if (compEntry==undefined||compEntry==null){
						this.log.error("[RemoveComponentAction] Unknown component",cid,"Aborting....");
						this.adaptMan._actionReady(action);
						return;
					}
					applicationManagerInstance.getLayoutManager().removeComponent(cid);
					//var compConfig= this.componentMan.getComponentConfig(cid);
					// remove the component via the Component Manager
					if (!this.componentMan.removeComponent(cid)){
						this.log.error("[RemoveComponent] ComponentMgr was unable to remove ",cid);
					}
					// add the option to reimport this component to a combo-box
					//Ext.cruise.client.adapt.impl.ReimportHandler.addReimportOption(cid,compConfig);
				}
			}
		}catch(e){this.log.error(e);}

		// signal that execution completed
		this.adaptMan._actionReady(action);
	}
});
/**
 * @class Ext.cruise.client.adapt.impl.SetVisibility Action for hiding or showing components
 * @extends Ext.cruise.client.adapt.IAction
 * @author Carsten Radeck
 */
Ext.cruise.client.adapt.impl.SetVisibility = Ext.extend(Ext.cruise.client.adapt.IAction, {
	
	constructor: function(adaptMan, componentMan, contextMgr, logger){
		Ext.cruise.client.adapt.impl.SetVisibility.superclass.constructor.apply(this,[adaptMan, componentMan, contextMgr, logger]);
	},
	
	execute: function(action){
		try{
			if (Ext.isArray(action.pointcut)) {
				// iterate the pointcut
				for (var idx = 0; idx < action.pointcut.length; ++idx) {
					var cid= action.pointcut[idx];
					// simply delegate to the Component Manager
					if (action.config.visible) {
						this.componentMan.getComponentInstance(cid).show();
						this.componentMan.getAdaptabilityPanel(cid).show();
					}else {
						this.componentMan.getComponentInstance(cid).hide();
						this.componentMan.getAdaptabilityPanel(cid).hide();
					}
				}
			}
		}catch(e){this.log.error(e);}

		// signal that execution completed
		this.adaptMan._actionReady(action);
	}
});

/**
 * @class Ext.cruise.client.adapt.impl.AddSubscriber Action for adding a component as subscriber of channels
 * @extends Ext.cruise.client.adapt.IAction
 * @author Carsten Radeck
 */
Ext.cruise.client.adapt.impl.AddSubscriber = Ext.extend(Ext.cruise.client.adapt.IAction, {
	
	constructor: function(adaptMan, componentMan, contextMgr, logger){
		Ext.cruise.client.adapt.impl.AddSubscriber.superclass.constructor.apply(this,[adaptMan, componentMan, contextMgr, logger]);
	},
	
	execute: function(action){
		try{
			if (Ext.isArray(action.pointcut)) {
				// iterate the pointcut
				for (var idx = 0; idx < action.pointcut.length; ++idx) {
					var channel= action.pointcut[idx];
					// delegate to the Component Manager
					//cid, channel, opName
					this.componentMan.addSubscriber(action.config.component,
						channel, action.config.handler);
				}
			}
		}catch(e){this.log.error(e);}

		// signal that execution completed
		this.adaptMan._actionReady(action);
	}
});

/**
 * @class Ext.cruise.client.adapt.impl.RemoveSubscriber Action for removing a component as subscriber of channels
 * @extends Ext.cruise.client.adapt.IAction
 * @author Carsten Radeck
 */
Ext.cruise.client.adapt.impl.RemoveSubscriber = Ext.extend(Ext.cruise.client.adapt.IAction, {
	
	constructor: function(adaptMan, componentMan, contextMgr, logger){
		Ext.cruise.client.adapt.impl.RemoveSubscriber.superclass.constructor.apply(this,[adaptMan, componentMan, contextMgr, logger]);
	},
	
	execute: function(action){
		try{
			if (Ext.isArray(action.pointcut)) {
				// iterate the pointcut
				for (var idx = 0; idx < action.pointcut.length; ++idx) {
					// delegate to the Component Manager
					this.componentMan.removeSubscriber(action.config.component,	action.pointcut[idx]);
				}
			}

		// signal that execution completed
		this.adaptMan._actionReady(action);
		}catch(e){this.log.error(e);}
	}
});

/**
 * @class Ext.cruise.client.adapt.impl.AddPublisher Action for adding a component as publisher on channels
 * @extends Ext.cruise.client.adapt.IAction
 * @author Carsten Radeck
 */
Ext.cruise.client.adapt.impl.AddPublisher = Ext.extend(Ext.cruise.client.adapt.IAction, {
	
	constructor: function(adaptMan, componentMan, contextMgr, logger){
		Ext.cruise.client.adapt.impl.AddPublisher.superclass.constructor.apply(this,[adaptMan, componentMan, contextMgr, logger]);
	},
	
	execute: function(action){
		try{
			if (Ext.isArray(action.pointcut)) {
				for (var idx = 0; idx < action.pointcut.length; ++idx) {
					this.componentMan.addPublisher(action.config.component, action.pointcut[idx], action.config.eventname);
				}
			}
		}catch(e){this.log.error(e);}

		// signal that execution completed
		this.adaptMan._actionReady(action);
	}
});
/**
 * @class Ext.cruise.client.adapt.impl.RemovePublisher Action for removing a component as publisher on channels
 * @extends Ext.cruise.client.adapt.IAction
 * @author Carsten Radeck
 */
Ext.cruise.client.adapt.impl.RemovePublisher = Ext.extend(Ext.cruise.client.adapt.IAction, {
	
	constructor: function(adaptMan, componentMan, contextMgr, logger){
		Ext.cruise.client.adapt.impl.RemovePublisher.superclass.constructor.apply(this,[adaptMan, componentMan, contextMgr, logger]);
	},
	
	execute: function(action){
		try{
			if (Ext.isArray(action.pointcut)) {
				for (var idx = 0; idx < action.pointcut.length; ++idx) {
					this.componentMan.removePublisher(action.config.component, action.pointcut[idx], action.config.eventname);
				}
			}
		}catch(e){this.log.error(e);}

		// signal that execution completed
		this.adaptMan._actionReady(action);
	}
});
/**
 * @class Ext.cruise.client.adapt.impl.FireEvent Action for firing a event on channels
 * @extends Ext.cruise.client.adapt.IAction
 * @author Carsten Radeck
 */
Ext.cruise.client.adapt.impl.FireEvent = Ext.extend(Ext.cruise.client.adapt.IAction, {
	
	constructor: function(adaptMan, componentMan, contextMgr, logger){
		Ext.cruise.client.adapt.impl.RemovePublisher.superclass.constructor.apply(this,[adaptMan, componentMan, contextMgr, logger]);
	},
	
	execute: function(action){
		try{
			if (Ext.isArray(action.pointcut)) {
				for (var idx = 0; idx < action.pointcut.length; ++idx) {
					applicationManagerInstance.getEventBroker().publish(action.config.eventname, action.config.value, action.pointcut[idx]);
				}
			}
		}catch(e){this.log.error(e);}

		// signal that execution completed
		this.adaptMan._actionReady(action);
	}
});
/**
 * @class Ext.cruise.client.adapt.impl.SetMonitorActive Action for setting monitors active or deactive
 * @extends Ext.cruise.client.adapt.IAction
 * @author Carsten Radeck
 */
Ext.cruise.client.adapt.impl.SetMonitorActive = Ext.extend(Ext.cruise.client.adapt.IAction, {
	
	constructor: function(adaptMan, componentMan, contextMgr, logger){
		Ext.cruise.client.adapt.impl.SetMonitorActive.superclass.constructor.apply(this,[adaptMan, componentMan, contextMgr, logger]);
	},
	
	execute: function(action){
		try{
			if (Ext.isArray(action.pointcut)) {
				for (var idx = 0; idx < action.pointcut.length; ++idx) {
					if (action.config.active) {
						this.contextMgr.activateMonitor(action.pointcut[idx]);
					}else {
						this.contextMgr.deactivateMonitor(action.pointcut[idx]);
					}
				}
			}
		}catch(e){this.log.error(e);}

		// signal that execution completed
		this.adaptMan._actionReady(action);
	}
});