/**
 * @author Gerald Huebsch
 * @author <a href="mailto:stefan.pietschmann">Stefan Pietschmann</a>
 * @author Carsten Radeck
 */
Ext.namespace("Ext.cruise.client");

Ext.cruise.client.GenericUIComponent = function() { 
	var wrappedInstance = null;
	var binding = null;
	var compConfig = null;
	
	var sinkTable = new Array();

	this.prepare= function(){
		//TODO
	}
	
	this.getWrappedInstance = function() {
		return wrappedInstance;
	}

	this.setWrappedInstance = function(val) {
		wrappedInstance = val;
	}

	this.getBinding = function() {
		return binding;
	}

	this.setBinding = function(val) {
		binding = val;
	}
	
	this.getComponentConfig = function() {
		return compConfig;
	}
	
	this.setComponentConfig = function(val) {
		compConfig = val;
	}

	this.setBindings = function(mcdlBinding, cBinding) {
		binding = mcdlBinding;
		compConfig = cBinding;
	}

	this.buildInstance = function(nextFctPtr) {
		if (wrappedInstance != null) return;
		var testFctPtr = Ext.cruise.client.performInitialization(this);
		this.buildWrappedInstance(testFctPtr, nextFctPtr);
	}
	
	this.buildWrappedInstance = function(testFctPtr, nextFctPtr) {
		var x = this;
				
		if (!testFctPtr()) {
			setTimeout(function(){x.buildWrappedInstance(testFctPtr, nextFctPtr);}, 100);
			return;
		}
		
		Ext.cruise.client.invokeConstructor(this);
		setTimeout(function(){nextFctPtr(x);}, 0);
	}
	
	/**
	 * the initialization method of the UI component
	 * @param {Object} ctx
	 */
	this.init = function(ctx) {
		//TODO: implement
		if (typeof wrappedInstance.init == "function")
			wrappedInstance.init(ctx);
	}
	
	/**
	* the show method of the UI component
	*/
	this.show = function() {
		Ext.cruise.client.invokeRenderingCode(this, null);
	}			
	
	/**
		* the hide method of the UI component
	*/
	this.hide = function() {
		Ext.cruise.client.hide(this, null);
	}
	
	/**
		* the dispose method of the UI component
	*/
	this.dispose = function() {
		Ext.cruise.client.dispose(this, null);
	}
		
	/**
		* the method for setting any property of this UI component
		* @param propName: the name of the property to be set
		* @param propValue: the value to be set
	*/
	this.setProperty = function(propName, propValue) {
		Ext.cruise.client.setProperty(this, propName, propValue);
	}

	/**
		* the getter method for reading any property of this UI component
		* @param propName: the name of the property to be returned
	*/
	this.getProperty = function(propName) {
		return Ext.cruise.client.getProperty(this, propName);
	}

	/**
		* the invokeOperation method to invoke any operation of this UI component
		* @param opName: the name of the operation to be invoked
		* @param params: an associative array (param names as keys) of parameters to be passed to the operation
	*/
	this.invokeOperation = function(opName, params) {	
		return Ext.cruise.client.invokeMethod(this, opName, params);
	}

	/**
		* the setEventSinkSelective method to selectively subscribe one event sink to events published by this UI component, selection is done through the event's name
		* @param sink: The event sink to be registered as a subscriber. The sink must be a function with the signature (eventName, String[] eventData). 
		* 			   A registered event sink is unsubscribed by passing null for sink.
		* @param eventName: the name of the event for which the sink is to be registered
	*/
	this.setEventSinkSelective = function(sink, eventName) {				
		if (sink != undefined) {
			if (sink != null) {
				//determine all events published by this UIC and register the sink
				try {
					Ext.cruise.client.registerForEvent(this, eventName, sink);
				} catch(e) {
					return;
				}
				//store hander ref in sinkTable
				sinkTable[eventName] = sink; 
			} 
			else {
				try {
					Ext.cruise.client.unregisterFromEvent(this, eventName, sinkTable[eventName]);
				} catch(e) {
					return;
				}
				//remove hander ref from sinkTable
				sinkTable[eventName] = null; 
			}
		}		
	}

	/**
		* the setEventSink method to subscribe one event sink to all events published by this UI component
		* @param sink: The event sink to be registered as a subscriber. The sink must be a 'publish' function with the signature (eventName, String[] eventData). 
		* 			   A registered event sink is unsubscribed by passing null for sink.
	*/
	this.setEventSink = function(sink) {
		if (sink != null) {
			Ext.cruise.client.registerForAllEvents(this, sink);
		} 
		else {		
			for (eventName in sinkTable) {
				if (sinkTable[eventName] != null) {
					try {
						Ext.cruise.client.unregisterFromEvent(this, eventName, sinkTable[eventName]);
					} catch(e) {}				     
					sinkTable[eventName] = null;
				}
			}				
		}
	}

	/**
		* the getNonTransientProperties returns the names of all non-transient properties of this UI component
		* @return: the names of all properties which are non-transient as an array of strings
	*/
	this.getNonTransientProperties = function() {
		var result = new Array();
		
		//TODO: implement
		
		return result;
	}

}
