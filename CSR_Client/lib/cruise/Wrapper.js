/**
 * @class Ext.cruise.client.Wrapper The wrapper is responsible for execution of transformations declared 
 * in the component's binding and (in case of integration by template) the mapping of the interface specified
 * by the composition model to the one of the current component and vice versa. This includes renaming of operations,
 * events and properties as well as reordering and filtering of parameters. 
 * 
 * @author Carsten Radeck
 */
Ext.namespace("Ext.cruise.client");
Ext.cruise.client.Wrapper = function( instance, mediation_config ) {
	var wrappedInstance = instance;
	var mediation_config= mediation_config;
	var proxy= null;
	var me= this;
	var mediator= applicationManagerInstance.getMediator();
	var log = applicationManagerInstance.getLog();
	
	/* apply the specified transformation to the given data */
	function executeTransformation(value, config){
		if (config.xslt_url) {
			/* use a referenced xslt stylesheet */
			return mediator.transformByStylesheetRef(value, config.xslt_url);
		}else if (config.xslt){
			/* use an xslt stylesheet represented as DOM */
			return mediator.transformByStylesheet(value, config.xslt);
		}else if (config.code){
			/* use a codetemplate */
			var code= config.code;
			code= code.replace(/@data@/gi, 'value');
			var result= null;
			try {
				result= eval(code) || value;
			}catch(E){log.error("[Wrapper] error while interpreting the code template:",E);}
			return result;
		}
		return value;
	};

	/*
	 * operations defined by the component model 
	 */
	
	/**
	 * Prepare the component for a coming exchange
	 */
	this.prepare= function(){
		if (typeof wrappedInstance.prepare == "function")
			wrappedInstance.prepare(ctx);
	}

	/**
	 * the initialization method of the component
	 * @param {Ext.cruise.client.BaseContext} ctx
	 */
	this.init = function(ctx) {
		if (typeof wrappedInstance.init == "function") {
			/* replace event handler by wrapper */
			proxy= ctx.getAttribute("EventHandler");
			ctx.setAttribute(Ext.cruise.client.BaseContext.PREDEFINED_ATT_NAMES.ComponentContext.EVENTHANDLER, me);
			
			wrappedInstance.init(ctx);
		}
	}
	
	/**
	 * the show method of the UI component
	 */
	this.show = function() {
		if (typeof wrappedInstance.show == "function")
			wrappedInstance.show();
	}			
	
	/**
	 * the hide method of the UI component
	 */
	this.hide = function() {
		if (typeof wrappedInstance.hide == "function")
			wrappedInstance.hide();
	}
	
	/**
	 * the enable method of the UI component
	 */
	this.enable = function() {
		if (typeof wrappedInstance.enable == "function")
			wrappedInstance.enable();
	}			
	
	/**
	 * the disable method of the UI component
	 */
	this.disable = function() {
		if (typeof wrappedInstance.disable == "function")
			wrappedInstance.disable();
	}
	
	/**
	 * the getDragObject method of the UI component
	 */
	this.getDragObject = function() {
		if (typeof wrappedInstance.getDragObject == "function")
			wrappedInstance.getDragObject();
	}
	
	/**
	 * the dispose method of the component
	 */
	this.dispose = function() {
		if (typeof wrappedInstance.dispose == "function")
			wrappedInstance.dispose();
		delete proxy;
		delete wrappedInstance;
		delete mediation_config;
	}
		
	/**
	 * the method for setting any property of this component
	 * @param {String} propName the name of the property to be set
	 * @param {Object} propValue the value to be set
	 */
	this.setProperty = function(propName, propValue) {
		if (typeof wrappedInstance.setProperty == "function") {
			var propertyinfo= mediation_config.properties[propName];
			if (propertyinfo == undefined) {
				/* this should only happen if there is a component property that has no match in the template
				 * but a default value. In this case the property's name is unknown from the perspective of the 
				 * composition model and therefore, propertyinfo is undefined. */
				wrappedInstance.setProperty(propName, propValue);
				return;
			}
			/* execute transformation if necessary */
			if (propertyinfo.set!=undefined){
				propValue= executeTransformation(propValue, propertyinfo.set);
			}
			/* set the correct named property */
			wrappedInstance.setProperty(propertyinfo.name, propValue);
		}
	}

	/**
	 * the getter method for reading any property of this component
	 * @param {String} propName the name of the property to be returned
	 */
	this.getProperty = function(propName) {
		if (typeof wrappedInstance.getProperty == "function") {
			var propertyinfo= mediation_config.properties[propName];
			if (propertyinfo == undefined) {
				log.warn("[Wrapper] getProperty: No mediationinfo found for property", propName);
				return undefined;
			}
			/* get the correct named property */
			var value= wrappedInstance.getProperty(propertyinfo.name);
			/* execute transformation if necessary */
			if (propertyinfo.get!=undefined){
				value= executeTransformation(value, propertyinfo.get);
			}
			return value;
		}
	}

	/**
	 * the invokeOperation method to invoke any operation of this component
	 * @param {String} opName the name of the operation to be invoked
	 * @param {Ext.cruise.client.Message} message an array of parameters to be passed to the operation
	 */
	this.invokeOperation = function(opName, message) {
		if (typeof wrappedInstance.invokeOperation == "function") {
			var opinfo= mediation_config.operations[opName];
			
			var mediated_params= [];
			/* check for all operation parameters if a transformation is necessary. furthermore,
			 * superfluous parameters are dropped and the correct order is guaranteed. */
			var original_params= message.getBody();
			var idx = 0;
			for (var item in original_params) {
				if(idx > opinfo.parameters.length-1)
					continue;
				var paraminfo= opinfo.parameters[idx];
				if (paraminfo.index_component==-1){
					log.debug("[Wrapper] dropping parameter",idx);
					continue;
				}
				var value= original_params[item];
				value= executeTransformation(value, paraminfo);
				mediated_params[paraminfo.name] = value;
				idx++;
			}
			
			/* invoke the correct operation */
			log.debug("[Wrapper] invokeoperation: ",opName," --> ",opinfo.name);
			message.setBody(mediated_params);
			wrappedInstance.invokeOperation(opinfo.name, message);
		}
	}

	/*
	 * event handler interface
	 */
	
	/**
	 * Called by the wrapped component for publishing an event.
	 * @param {Ext.cruise.client.Message} message a message object
	 */
	this.publish= function(message){
		if (proxy==undefined||proxy==null|| typeof proxy.publish != "function"){
			log.error("[Wrapper] no suitable event handler is registered.");
		}
		log.debug("[Wrapper] trying to publish",message.getName());

		var eventinfo=null;
		var eventname = message.getName();
		/* holds the matching name of the event as defined by the composition model */
		var ccm_event=null;
		var ccm_property = null;
		/* search the matching entry in the mediation configuration */
		for (ccm_event in mediation_config.events){
			if (mediation_config.events[ccm_event].name == eventname) {
				eventinfo = mediation_config.events[ccm_event];
				log.debug("[Wrapper] hit found for",ccm_event);
				break;
			}
		}
		
		if (eventinfo==null){
			for (ccm_property in mediation_config.properties){
				ccm_event = mediation_config.properties[ccm_property].name+"Changed";
				if (ccm_event == event) {
					eventinfo = mediation_config.properties[ccm_property];
					ccm_event = ccm_property + "Changed";
					log.debug("[Wrapper] hit found for property ",ccm_property);
					break;
				}
			}
			if(eventinfo==null){
				log.error("[Wrapper] unknown event",eventname);
				return;
			}
		}
		/* check for all event parameters if a transformation is necessary. furthermore,
		 * superfluous parameters are dropped and the correct naming is guaranteed. */
		var mediated_params= [];
		for (var idx = 0; idx < eventinfo.parameters.length; ++idx) {
			var paraminfo= eventinfo.parameters[idx];
			if (paraminfo.index_component==-1){
				log.debug("[Wrapper] dropping parameter",idx);
				continue;
			}
			var value= (message.getBody())[paraminfo.name];
			value= executeTransformation(value, paraminfo);
			mediated_params[paraminfo.name]=value;
		}
		/* fire the event with the correct name */
		message.setName(ccm_event);
		message.setBody(mediated_params);
		proxy.publish(message);
	};
}
