/**
 * @author <a href="mailto:stefan.pietschmann">Stefan Pietschmann</a>
 * @author Carsten Radeck
  * @author Gerald Hübsch 
 * @author Johannes Waltsgott
  */
Ext.namespace('Ext.cruise.client');
//TODO update in general; replace genericUIC.getComponentConfig and genericUIC.getBinding by calls to proper methods of the componentManager

//OK
Ext.cruise.client.performInitialization = function(genericUIC) {
	var noWaitFct = function(){return true;};

	var initialization = genericUIC.getBinding().getElementsByTagName('initialization')[0];

	if (initialization != undefined && initialization != null && genericUIC != undefined && genericUIC != null) {
		var test = initialization.getAttribute('test');
		var initializationCode = initialization.getElementsByTagName('code')[0].firstChild.nodeValue;
		var result = eval(initializationCode);

		if (result == undefined) {
			log.error('Error processing the initialization routine of '+reqRespObject.id);
			return noWaitFct;
		}
		
		//wait for the initialization to complete before advising the generic UIC to build the wrapped instance
		var waitFct = function(){return Ext.cruise.client.testInitialization(result, test);};
	
		return waitFct;
	}
	
	return noWaitFct;
}

/**
 * PRIVATE
 * This operation implements a mechanism which regulary checks for the completion of a toolkit/UI component 
 * initialization routine. The check is performed by the evaluation of a test expression (the test attribute of the MCDl
 * Binding's 'initialization' element). The evaluation result is returned.
 * 
 * @param targetObj: the object used to evaluate the test expression
 * @param test: the test expression
 */
//OK
Ext.cruise.client.testInitialization = function(targetObj, test) {
	var evaluate = 'targetObj.'+test+';';
	return eval(evaluate);
}

/**
 * PRIVATE
 * This operation builds and executes the constructor code for UI components. It fetches the constructor code template from 
 * the 'constructor' element from the javascript binding (in the MCDL) of the UI component. This template code 
 * is expanded and returned.
 * @param genericUIC: the generic UIC wrapper
 */
//OK
Ext.cruise.client.invokeConstructor = function(genericUIC) {
	var constructor = genericUIC.getBinding().getElementsByTagName('constructor')[0];
	var templateCode = constructor.getElementsByTagName('code')[0].firstChild.nodeValue;
	var instance = null;
	var constructorcode = 'instance = ' + Ext.cruise.client.expandTemplateCode(templateCode, genericUIC.getComponentConfig(), 'instance', null)[0];
	
	constructorcode += ';';
	eval(constructorcode);

	genericUIC.setWrappedInstance(instance);
}

/**
 * PRIVATE
 * This operation expands template code by replacing placeholders in the templates with information from the 
 * ComponentConfig element and the lookupTable. The lookupTable (a keyed array; keys are the placeholders) is 
 * consulted first. Only if it does NOT contain the information, it is taken from the compConfig element. 
 * The lookupTable provides (a) an option to override the content of the compConfig element if necessary, and 
 * (b) the possbility to expand code templates that do not refer to information contained in the compConfig - 
 * e.g. for expanding the postprocessing code with the invocation result of an operation (see Ext.cruise.client.invokeMethod 
 * for an example). An array is returned since one code template can be expanded to multiple pieces of code.
 *
 * @param templateCode: the code template to expand
 * @param compConfigElem: the compConfig element
 * @param name: the name of the variable representing the UI component to resolve @:instance@ placeholders
 * @param lookupTable: the lookup table (see the comments above)
 * @return an array containing the expanded javascript code
 */
//OK
Ext.cruise.client.expandTemplateCode = function(templateCode, compConfigElem, name, lookupTable) {
	var startIndex = 0, endIndex = -1, modCounter = 0, i = 0, j = 0, k = 0, result = new Array(), tmp;
	
	result[0] = '';
	
	while ((i = templateCode.indexOf('@', i)) != -1) {
		//start found 
		if (!(modCounter%2)) {
			startIndex = i;
			for (j = 0; j < result.length; j++) 
				result[j] += templateCode.substring(endIndex+1, startIndex);
		}
		//end found
		if (modCounter%2) {
			endIndex = i;
			//log.error(templateCode.substring(startIndex+1,endIndex));
			tmp = Ext.cruise.client.resolvePlaceholder(templateCode.substring(startIndex+1,endIndex), compConfigElem, name, lookupTable);
			//append all new code fragements to all existing ones
			if (tmp != null) {
				var newlength = tmp.length * result.length;
				
				k = result.length;
				for (j = k; j < newlength; j++)
					result[j] = result[j-k];
				
				for (j = 0; j < result.length; j++)					
					result[j] += tmp[(j%tmp.length)];
			}
		}
		
		i++;
		modCounter++;
	}
	
	for (i = 0; i<result.length; i++)
		result[i] += templateCode.substring(endIndex+1, templateCode.length);
	
	return result;
}
 
/**
 * PRIVATE
 * This operation is used by Ext.cruise.client.expandTemplateCode() to resolve placeholders from code templates 
 * through the ComponentConfig element of the UI component and the lookupTable. The lookupTable (a keyed array; keys 
 * are the placeholders) is consulted first. Only if it does NOT contain the information, it is taken from the 
 * ComponentConfig element (see documentation of Ext.cruise.client.expandTemplateCode). 
 * An array is returned since one placeholder can have multiple resolutions.
 *
 * @param templateCode: the code template to expand
 * @param compConfigEleme: the ComponentConfig element
 * @param name: the name of the variable representing the UI component to resolve @:instance@ placeholders
 * @param lookupTable: the lookup table (see the comments above)
 * @return an array containing the resolved placeholder
 */
//OK
Ext.cruise.client.resolvePlaceholder = function(placeholder, compConfigElement, name, lookupTable) {
	var separatorIndex = placeholder.indexOf(':');
	
	if (separatorIndex == -1) {
		log.error('MCDL Binding Error: placeholder ' + placeholder + 'syntax is incorrect.');
		return null;
	}
	
	var result = new Array();
	
	var placeholderType = placeholder.substring(0, separatorIndex);
	var name = placeholder.substring(separatorIndex+1, placeholder.length);
	
	//resolve the reserved ':instance' placeholder
	if ('instance' == name) {
		result[0] = name;		
		return result;
	}
	
	//first try to resolve any other placeholder via the lookup table instead of the compConfigElement
	if (lookupTable != undefined && lookupTable != null && lookupTable[name] != undefined) { 
		result[0] = lookupTable[name];
		return result;
	}
	var elems = Ext.cruise.client.Utility.getElementsByTagNameNS(Ext.cruise.client.Constants._TSRNS_IE, Ext.cruise.client.Constants._TSRNS_, 'placeholderType', compConfigElement);

	var i, k=0;

	for (i=0; i<elems.length; i++) {
		var elem = elems[i];

		if (name == elem.getAttribute('name')) {
			if ('property' == placeholderType) {
				var value = elem.getAttribute('value');
				//check if value attribute was set, if not, the attribute value is the first child element
				if (value == undefined || value == null) {
					//find the first element node in the list of children
					var children = elem.childNodes;

					for (var j=0; j<children.length; j++)
						if (children[j].nodeType == 1) {
							result[k++] = Ext.cruise.client.serializeDOM(children[j], true);
							break;
						}
				}
				else result[k++] = Ext.cruise.client.adapt.util.PathUtils.expandContextReferences(value,"applicationManagerInstance.getAdaptationManager()");
			}
			if ('event' == placeholderType) result[k++] = elem.getAttribute('channel');
			if ('operation' == placeholderType) result[k++] = elem.getAttribute('channel');
		}
	}
	
	return result;
}

/**
 * PRIVATE
 * This operation builds the rendering code for UI components. It fetches the rendering code template from 
 * the 'rendering' element from the javascript binding (in the MCDL) of the UI component. This template code 
 * is expanded and executed.
 * @param genericUIC: the generic UIC wrapper
 * @param lookupTable: the lookup table (a keyed array; keys are the placeholder names) for overwriting the classbinmding 
 */
//OK
Ext.cruise.client.invokeRenderingCode = function(genericUIC, lookupTable) {
	var rendering = genericUIC.getBinding().getElementsByTagName('rendering')[0];
	var templateCode = rendering.getElementsByTagName('code')[0].firstChild.nodeValue;
	var renderingcode =  Ext.cruise.client.expandTemplateCode(templateCode, genericUIC.getComponentConfig(), 'genericUIC.getWrappedInstance()', lookupTable)[0];
	renderingcode += ';';
	
	eval(renderingcode);
}

/**
 * PRIVATE
 * This operation constructs the javascript code for accessing a property of a UI component. It fetches the 
 * accessor code template from the 'invocation' element for the operation to be invoked from the interface binding. 
 * This template code is expanded and returned.
 * 
 * @param binding: the DOM representation of the interface binding element of the UI component (from MCDL)
 * @param compConfig: the DOM representation of the ComponentConfig element
 * @param name: the name of the variable representing the UI component whose property is to be accessed
 * @param propertyName: the name of the property (as specified in the MCDL) to be accessed
 * @param paramList (Array): the list containing the parameter value access code
 * @param direction: determines if the parameter is read or set (possible values: 'get', 'set')
 * @return the executable javascript code (expanded template code) to access the property
 */
//OK
Ext.cruise.client.buildAccessorCode = function(binding, compConfig, name, propertyName, paramList, direction) {
	var i, accessorElem, templateCode;
	var accessorElems = binding.getElementsByTagName('accessor');
	for (i=0; i<accessorElems.length; i++) 
		if (propertyName == accessorElems[i].getAttribute('property') && direction == accessorElems[i].getAttribute('type')) {
			templateCode = accessorElems[i].getElementsByTagName('code')[0].firstChild.nodeValue;
			break;
		}
	
	if (templateCode == undefined) {
		//log.error('ERROR (Ext.cruise.client.buildAccessorCode): No template code found for '+direction+'ting the property '+propertyName);
		return null;
	}

	var accessorcode = Ext.cruise.client.expandTemplateCode(templateCode, compConfig, name, paramList)[0];
	accessorcode += ';';
	
	return accessorcode;	
}

/**
 * PUBLIC
 * Use this operation to set a property of a UI component declared in the MCDL  description of the component. 
 * Example: Assume that uic represents a GenericUIComponent instance for which a property named 'color' 
 * (declared in the component's MCDL description) is to be set.
 * 
 * The property is set as follows:
 * 
 * Ext.cruise.client.setProperty(uic, 'color', 'green');
 * 
 * 
 * @param genericUIC: the generic UIC wrapper 
 * @param propertyName: the name of the property (as specified in the MCDL) to be set
 * @param value: the value to which the property is to be set
 */
//OK
Ext.cruise.client.setProperty = function(genericUIC, propertyName, value) {
	var paramList = null;
	var paramAccessCode = null;
	
	if (value != undefined) {
		paramList = new Array();
		paramList[propertyName] = value;
		
		paramAccessCode = new Array();
		paramAccessCode[propertyName] = 'paramList[propertyName]'; 
	}

	var code = Ext.cruise.client.buildAccessorCode(genericUIC.getBinding(), genericUIC.getComponentConfig(), 'genericUIC.getWrappedInstance()', propertyName, paramAccessCode, 'set');

	if (code == null) return;

	eval(code);
}

/**
 * PUBLIC
 * Use this operation to get a property of a UI component declared in the MCDL description of the UI component. 
 * Example: Assume that uic represents GenericUIComponent instance from which a property named 'color' 
 * (declared in the component's MCDL description) is to be read.
 * 
 * The property is read as follows:
 * 
 * Ext.cruise.client.getProperty(uic, 'color');
 * 
 * @param genericUIC: the generic UIC wrapper
 * @param propertyName: the name of the property (as specified in the MCDL) to be set
 * @return the value of the property
 */
//OK
Ext.cruise.client.getProperty = function(genericUIC, propertyName) {
	var code = Ext.cruise.client.buildAccessorCode(genericUIC.getBinding(), genericUIC.getComponentConfig(), 'genericUIC.getWrappedInstance()', propertyName, undefined, 'get');
	
	if (code == null) return undefined;
	
	var result = eval(code);

	//build and execute the postprocessing code (usually performs data conversion from component-internal data format to an XML Schema instance)
	var accessorElems = genericUIC.getBinding().getElementsByTagName('accessor');

	var i, tmp, postprocessingTemplateCode;

	for (i=0; i<accessorElems.length; i++) 
		if (propertyName == accessorElems[i].getAttribute('property') && 'get' == accessorElems[i].getAttribute('type')) {
			tmp = accessorElems[i].getElementsByTagName('postprocessing');
			if (tmp[0] != undefined && tmp[0] != null) {
				postprocessingTemplateCode = tmp[0].firstChild.nodeValue;
				
				var paramList = new Array();
				var paramAccessCode = new Array();
				
				paramList['return'] = result;
				paramAccessCode['return'] = 'paramList[\'return\']'; 
				
				code = Ext.cruise.client.expandTemplateCode(postprocessingTemplateCode, genericUIC.getComponentConfig(), 'genericUIC.getWrappedInstance()', paramAccessCode)[0];
				result = eval(code);
				break;
			}
		}
	
	return result;
}

/**
 * PUBLIC
 * Use this operation to invoke an operation declared in the MCDL description of the component.  
 * Example: Assume that a variable uic represents a GenericUIComponent instance for which an operation named 'op.setVisibility' 
 * is declared in its MCDL description that takes one boolean input parameter named 'visible' 
 * and returns the visibility status of the component before invoking setVisibility, i.e. a boolean value. 
 * The operation is invoked as follows:
 * 
 * var parameterTable = new Array();
 * parameterTable['visible'] = true;
 * var result = Ext.cruise.client.invokeMethod(uic, 'op.setVisibility', parameterTable);
 * 
 * @param genericUIC: the generic UIC wrapper
 * @param operationName: the name of the operation (as specified in the MCDL) to be invoked
 * @param paramList (Array): the list of parameters (as specified in the MCDL) to be passed to the operation (parameter names as array keys)
 * @return the return value of the operation
 */
//OK
Ext.cruise.client.invokeMethod = function(genericUIC, operationName, paramList) {
	//build the javascript code to invoke the operation by expanding the appropriate javascript code template
	var paramAccessCode = new Array();
	
	for (var key in paramList) paramAccessCode[key] = 'paramList[\''+key+'\']';
	
	var code = Ext.cruise.client.buildInvocationCode(genericUIC.getBinding(), genericUIC.getComponentConfig(), 'genericUIC.getWrappedInstance()', operationName, paramAccessCode);

	if (code == null) return undefined;

	//invoke the method
	var result = eval(code);

	/* Build and execute the postprocessing code. The postprocessing code (see MCDL 'postprocessing' element) 
	 * is usually used data conversion purposes, i.e. to convert the result returned by the operation into 
	 * an XML schema instance. */ 
	var invocationElems = genericUIC.getBinding().getElementsByTagName('invocation');
	
	var i, postprocessingTemplateCode, tmp; 
	
	var postProcessingParamList = new Array();
	
	//find the postprocessing code for the operation that was invoked
	for (i=0; i<invocationElems.length; i++) 
		//if a code template with postprocessing instructions is found for the operation, build and execute the postprocessing code 
		if (operationName == invocationElems[i].getAttribute('operation')) {
			var tmp = invocationElems[i].getElementsByTagName('postprocessing');
			
			if (tmp != null && tmp != undefined && tmp[0] != null && tmp[0] != undefined) {
				postprocessingTemplateCode = tmp[0].firstChild.nodeValue;
				postProcessingParamList['return'] = result;
				
				paramAccessCode.clear;
				
				//add the access code for the return parameter
				paramAccessCode['return'] = 'postProcessingParamList[\'return\']';
				
				//build the postprocessing code from its code template
				code = Ext.cruise.client.expandTemplateCode(postprocessingTemplateCode, genericUIC.getComponentConfig(), 'genericUIC.getWrappedInstance()', paramAccessCode)[0];
				code += ';';

				//execute the postprocessing code for the result
				result = eval(code);
			}

			break;
		}	

	//return the (converted) result
	return result;
}

/**
 * PRIVATE
 * This operation constructs the javascript code for invoking an operation on a UI component. It fetches the 
 * invocation code template from the 'invocation' element for the operation to be invoked from the javascript binding. 
 * The template code is then expanded and returned.
 * 
 * @param binding: the DOM representation of the binding element of the component (from MCDL)
 * @param compConfig: the DOM representation of the compConfig element 
 * @param name: the name of the variable representing the UI component on which the operation is to be invoked
 * @param operationName: the name of the operation (as specified in the MCDL) to be invoked
 * @param paramList (Array): the list of parameters (as specified in the MCDL) to be passed to the operation (parameter names as array keys)
 * @return the executable javascript code (expanded template code) to invoke the operation on the UI component
 */
//OK
Ext.cruise.client.buildInvocationCode = function(binding, compConfig, name, operationName, paramList) {
	var i, invocationElem, templateCode;
	var invocationElems = binding.getElementsByTagName('invocation');
	//find the code template for invoking the operation
	for (i=0; i<invocationElems.length; i++) 
		if (operationName == invocationElems[i].getAttribute('operation')) {
			templateCode = invocationElems[i].getElementsByTagName('code')[0].firstChild.nodeValue;
			break;
		}
	
	if (templateCode == undefined) {
		log.error('ERROR (Ext.cruise.client.buildInvocationCode): No template code found for operation '+operationName);
		return null;
	}

	var invocationcode = Ext.cruise.client.expandTemplateCode(templateCode, compConfig, name, paramList)[0];
	invocationcode += ';';
		
	return invocationcode;
}

/**
 * PUBLIC
 * Use this operation to register an MCDL-compliant event handler with all events produced by a UI component. 
 * 
 * Example: Assume that a variable uic represents GenericUIComponent instance to which an event handler 
 * implemented by myHandler. 
 * 
 * 
 * The event handler is registered as follows:
 * 
 * Ext.cruise.client.registerForAllEvents(genericUIC, myHandler);	
 * 
 * @param genericUIC: the generic UIC wrapper
 * @param handlerObj: a pointer to the event handler object
 */
Ext.cruise.client.registerForAllEvents = function (genericUIC, handlerObj) {
	//get all events produced by the component from its MCDL Binding
	var eventsinks = genericUIC.getBinding().getElementsByTagName('eventsink');
	
	if (eventsinks.length == 0) {
		log.info('INFO (Ext.cruise.client.registerForAllEvent): No event sinks found.');
		return;
	}
	
	var i, eventsink = null;
	
	for (i=0; i<eventsinks.length; i++) 
		Ext.cruise.client.registerForEvent(genericUIC, eventsinks[i].getAttribute('event'), handlerObj, eventsinks);
}

/**
 * PUBLIC
 * Use this operation to register a MCDL-compliant event handler with a UI component. 
 * 
 * Example: Assume that a variable uic represents GenericUIComponent instance for which an event handler implemented by a 
 * myHandler is to be registered for an event named 'event.simple'. 
 * 
 * 
 * The event handler is registered as follows:
 * 
 * Ext.cruise.client.registerForEvent(genericUIC, 'event.simple', myHandler);	
 * 
 * @param genericUIC: the generic UIC wrapper
 * @param eventName: the name of the event (as specified in the MCDL)
 * @param handlerObj: a pointer to the event handler object
 * @param {NodeList} eventsinks (optional) list of sinks
 */
Ext.cruise.client.registerForEvent = function (genericUIC, eventName, handlerObj, eventsinks) {
	if (eventsinks==undefined||eventsinks==null)
		eventsinks = genericUIC.getBinding().getElementsByTagName('eventsink');

	if (eventsinks.length == 0) {
		log.info('INFO (Ext.cruise.client.registerForEvent): No event sinks found.');
		return;
	}
	
	var i, eventsink = null;
	
	for (i=0; i<eventsinks.length; i++) {
		eventsink = eventsinks[i];
		if (eventsink.getAttribute('event') == eventName) break;
	}
		
	if (eventsink == null) {
		log.info('INFO (Ext.cruise.client.registerForEvent): No event sink found for event name '+eventName);
		return;
	}

	var j, handlerTemplateCode = null, registerTemplateCode = null, handlers = null, registers = null;

	handlers = eventsink.getElementsByTagName('handler');
	if (handlers != undefined && handlers != null && handlers.length > 0) 
		handlerTemplateCode = handlers[0].getElementsByTagName('code')[0].firstChild.nodeValue;

	registers = eventsink.getElementsByTagName('register');
	if (registers == undefined && registers == null) {
		log.error('ERROR in MCDL Binding: Missing register element!');
		return;
	}
	registerTemplateCode = registers[0].getElementsByTagName('code')[0].firstChild.nodeValue;
		
	var paramAccessCode = new Array();
	paramAccessCode[eventName] = 'handlerObj';

	if (handlerTemplateCode != undefined && handlerTemplateCode != null) {
		handlers = Ext.cruise.client.expandTemplateCode(handlerTemplateCode, genericUIC.getComponentConfig(), 'genericUIC.getWrappedInstance()', paramAccessCode);
	
		if (handlers != undefined && handlers != null) {
			for (i=0; i<handlers.length; i++) 
				eval('handlers[i] = '+handlers[i]);
			
			for (i=0; i<handlers.length; i++) {
				paramAccessCode.clear;
				paramAccessCode[eventName] = 'handlers[i]';
				
				registers = Ext.cruise.client.expandTemplateCode(registerTemplateCode, genericUIC.getComponentConfig(), 'genericUIC.getWrappedInstance()', paramAccessCode);
				
				if (registers != null && registers != undefined)
					for (j=0; j<registers.length; j++) eval(registers[j] +';');
			}	
		}
	} else {
		registers = Ext.cruise.client.expandTemplateCode(registerTemplateCode, genericUIC.getComponentConfig(), 'genericUIC.getWrappedInstance()', paramAccessCode);
		for (i=0; i<registers.length; i++) eval(registers[i] +';');
	}			
}

/**
 * PRIVATE
 * This operation builds and executes the code for hiding UI components. It fetches the rendering code template from 
 * the 'hide' element of the javascript binding (in the MCDL) of the UI component. 
 * @param genericUIC: the generic UIC wrapper
 * @param lookupTable: the lookup table (a keyed array; keys are the placeholder names) for overwriting the classbinmding 
 */
//OK
Ext.cruise.client.hide = function(genericUIC, lookupTable) {
	var hide = genericUIC.getBinding().getElementsByTagName('hide')[0];
		
	if (hide != null && hide != undefined) {
		var templateCode = hide.getElementsByTagName('code')[0].firstChild.nodeValue;

		if (templateCode != null && templateCode != undefined) {
			var hidecode =  Ext.cruise.client.expandTemplateCode(templateCode, genericUIC.getComponentConfig(), 'genericUIC.getWrappedInstance()', lookupTable)[0];
			hidecode += ';';
			
			eval(hidecode);
		}
	}
}

/**
 * PRIVATE
 * This operation builds and executes the code for disposing UI components. It fetches the dispose code template from 
 * the 'dispose' element of the javascript binding (in the MCDL) of the UI component. 
 * @param genericUIC: the generic UIC wrapper
 * @param lookupTable: the lookup table (a keyed array; keys are the placeholder names) for overwriting the classbinmding 
 */
Ext.cruise.client.dispose = function(genericUIC, lookupTable) {
	var dispose = genericUIC.getBinding().getElementsByTagName('destructor')[0];
		
	if (dispose != null && dispose != undefined) {
		var templateCode = dispose.getElementsByTagName('code')[0].firstChild.nodeValue;

		if (templateCode != null && templateCode != undefined) {
			var disposecode =  Ext.cruise.client.expandTemplateCode(templateCode, genericUIC.getComponentConfig(), 'genericUIC.getWrappedInstance()', lookupTable)[0];
			disposecode += ';';
			eval(disposecode);
		}
	}
}

/**
 * PUBLIC
 * Use this operation to unregister a MCDL-compliant event handler from a UI component. 
 * 
 * Example: Assume that a variable uic represents GenericUIComponent instance from which an event handler 
 * myHandler is to be unregistered from an event named 'event.simple'. 
 * 
 * 
 * The event handler is unregistered as follows:
 * 
 * Ext.cruise.client.unregisterFromEvent(genericUIC, 'event.simple', myHandler);
 * 
 * @param genericUIC: the generic UIC wrapper
 * @param eventName: the name of the event (as specified in the MCDL)
 * @param handlerObj: a pointer to the event handler object
 */
Ext.cruise.client.unregisterFromEvent = function (genericUIC, eventName, handlerObj) {
	var eventsinks = genericUIC.getBinding().getElementsByTagName('eventsink');

	if (eventsinks.length == 0) {
		log.info('INFO (Ext.cruise.client.unregisterFromEvent): No event sinks found.');
		return;
	}
	
	var i, eventsink = null;
	
	for (i=0; i<eventsinks.length; i++) {
		eventsink = eventsinks[i];
		if (eventsink.getAttribute('event') == eventName) break;
	}

	if (eventsink == null) {
		log.error('ERROR (Ext.cruise.client.unregisterFromEvent): No event sink found for event name '+eventName);
		return;
	}

	var j, handlerTemplateCode = null, unregisterTemplateCode = null, unregisters = null;

	unregisters = eventsink.getElementsByTagName('unregister');
	if (unregisters == undefined && unregisters == null) {
		log.error('ERROR in MCDL Binding: Missing unregister element!');
		return;
	}
	unregisterTemplateCode = unregisters[0].getElementsByTagName('code')[0].firstChild.nodeValue;
		
	var paramAccessCode = new Array();
	paramAccessCode[eventName] = 'handlerObj';

	unregisters = Ext.cruise.client.expandTemplateCode(unregisterTemplateCode, genericUIC.getComponentConfig(), 'genericUIC.getWrappedInstance()', paramAccessCode);
	for (i=0; i<unregisters.length; i++) eval(unregisters[i] +';');
}

