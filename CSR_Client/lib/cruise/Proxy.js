Ext.namespace("Ext.cruise.client");
/**
 * @class Ext.cruise.client.CommunicationProxy A proxy for communication between the EventBroker and a UI component.
 *
 * @author <a href="mailto:stefan.pietschmann">Stefan Pietschmann</a>
 * @author Carsten Radeck
 * @author Gerald Hübsch 
 * @constructor
 * @param {Object} componentInstance the component
 * @param {String} cid the ID of the component
 * @param {Ext.cruise.client.EventBroker} ev Reference to the EventBroker
 * @param {Object} log the logger for that proxy
 */
Ext.cruise.client.CommunicationProxy = function(_componentInstance, _cid, _ev, _log ){
	var comp = _componentInstance;
	var cid = _cid;
	var eventBroker = _ev;
	var log = _log;
	var mappings = {};
	var blocked = false;
	var eventQueue= new Array();

	this.setComponentInstance= function(inst){
		comp= inst;
		log.debug('[CProxy] Proxy set up for component with id \''+cid+'\'.');
	};

	/**
	 * Hooks the handler-function for the specified channel.
	 * @function
	 * @public
	 * @param {String} channel ID of the channel
	 * @param {String} opName the Handler-function's name for the specified channel in scope of the component-instance
	 */
	this.addOperationMapping= function( channel, opName ){
		if (opName==undefined||opName==null){
			log.error('[CProxy] Proxy('+cid+'): opName is not set.', opName+'');
			return;
		}

		if (mappings[channel]==undefined||mappings[channel]==null){
			mappings[channel]= new Array();
		}
		mappings[channel].push(opName);	
		
		log.debug('[CProxy] Proxy('+cid+') addedOM ',channel,opName,mappings[channel]);
	};

	/**
	 * Unbinds the handler-function of the specified channel.
	 * @param {String} channel ID of the channel
	 * @param {String} operation name of the operation to be removed as a handler for the channel. If not set, all bound operations are removed. 
	 * @function
	 * @public
	 */
	this.removeOperationMapping= function(channel, operation){
		if (!mappings[channel]){
			log.error('[CProxy] Proxy('+cid+') channel unknown!');
			return;
		}
		if (operation==undefined||operation==null||typeof operation!='string') {
			delete mappings[channel];
			mappings[channel] = new Array();
		}else 
			mappings[channel].remove(operation);

		log.debug('[CProxy] Proxy('+cid+') removedOM ',channel);
	};
	
	/**
	 * @return the id of this proxy's component.
	 */
	this.getComponentId= function(){
		return cid;
	};
	
	/**
	 * 
	 * @param {String} channel
	 * @return {boolean} true if this proxy is registered for the specified channel 
	 */
	this.listensOn= function(channel){
		if (channel==undefined||channel==null||typeof channel!='string')
			return false;
		if (mappings[channel]==undefined||mappings[channel]==null) 
			return false;
		return mappings[channel].length>0;
	};

	/**
	 * Blocks this proxy, i.e all in- and outgoing events are intercepted and
	 * queued internally until the proxy gets unblocked (see CommunicationProxy#free()).
	 * @function
	 * @public
	 */
	this.block= function(){
		blocked= true;
		log.info('[CProxy] ('+cid+') is now BLOCKED');
	};

	/**
	 * Unblocks this proxy, i.e all in- and outgoing events are processed normally.
	 * Internally queued events are transmitted to the underlying component resp. the eventbroker.
	 * @function
	 * @public
	 */
	this.free= function(){
		blocked= false;
		log.info('[CProxy] ('+cid+') is now UNBLOCKED...',eventQueue.length,'events waiting for transmission');

		// transmit queued events
		while(eventQueue.length > 0){
			var event= eventQueue.shift();

			if (event.direction=='IN'){
				this.notify(event.message, event.channel);
			}else {
				this.publish(event.message);
			}
			delete event;
		}
	};
	
	this.highlightComponent= function(){
		// highlight ui component
		if (applicationManagerInstance.getIsAnimationEnabled()==true && applicationManagerInstance.getComponentManager().isUIC(cid)) {
			var panel = applicationManagerInstance.getComponentManager().getAdaptabilityPanel(cid);
			if (panel != undefined && panel != null && panel.header!= undefined&& panel.header!=null) {
                panel.header.animate(
				// animation control objects
				{
                    opacity: {from: 1, to: 0.4}
                }, 
				//animation duration
				0.5, 
				// callback
				function(){
                    panel.header.animate({
                        opacity: {to: 1}
                    },
                    0.3, 
                    null);
                });
			}
		}
	};
	
	/**
	 * Callback-function invoked by the dragZone.
	 * @function
	 * @public
	 * @param {String} operationName
	 * @param {Object} message
	 */
	this.notifyDrag= function(operationName, message){
		if (blocked){
			log.info('[CProxy] ('+cid+') NOTIFY: BLOCKED... queuing event ', eventQueue.length);
			eventQueue.push({
				message: message,
				operation: operationName,
				direction: 'IN'
			});
			return;
		}
		message.setName('');
		
		if (Ext.isFunction(comp.invokeOperation)){
			this.highlightComponent();
			if(typeof(message) == 'object'){
				var body = message.getBody();
				var newBody = new Array();
				var config = applicationManagerInstance.getComponentManager().getComponentConfig(cid);
				var op = config.getElementsByTagName('operation');
				for(var j=0;j<op.length;j++){
					if(op[j].getAttribute('name')==operationName){

						var params = op[j].getElementsByTagName('parameter');
						for(var k=0;k<params.length;k++){
							for(var oldParam in body){
								newBody[params[k].getAttribute('name')] = body[oldParam];
								delete body[oldParam];
								break;
							}
						}
						message.setBody(newBody);
					}
				}
				comp.invokeOperation(operationName,message);
			}
		}		
	};

	/**
	 * Callback-function invoked by the event bus. Its the subscriber-side of a specified channel.
	 * @function
	 * @public
	 * @param {Ext.cruise.client.Message} message a message
	 * @param {String} channel ID of the channel
	 */
	this.notify= function( message, channel ){
		if (blocked){
			log.info('[CProxy] ('+cid+') NOTIFY: BLOCKED... queuing event ', eventQueue.length);
			eventQueue.push({
				message: message,
				channel: channel,
				direction: 'IN'
			});
			return;
		}

		// do fancy additional stuff here:--------
		
		// -------------------------
		
		var callbackId = message.getCallbackId();
		var event = message.getName();

		log.info('[CProxy] ('+cid+') NOTIFY ',event,channel);
		if (Ext.isArray(mappings[channel])){
			// invoke handlers registered for this channel
			for(var i=0; i<mappings[channel].length; ++i){
				try{
					if(typeof(mappings[channel][i]) == 'object'){ // in case of PropertyLinks
						var operation = mappings[channel][i];
						if (Ext.isFunction(comp[operation.opName])){
							var newValue;
							newValue = message.getBody();
							if (Ext.isArray(newValue)) {
								newValue = newValue[operation.propName];
							}
							this.highlightComponent();
							comp[operation.opName](operation.propName,newValue);
						}
					} else {
						if (Ext.isFunction(comp.invokeOperation)){
							this.highlightComponent();
							var body = message.getBody();
							var newBody = [];
							var opName = mappings[channel][i];
							var config = applicationManagerInstance.getComponentManager().getComponentConfig(cid);
							var op = config.getElementsByTagName('operation');
							for(var j=0;j<op.length;j++){
								if(op[j].getAttribute('name')==opName){

									var params = op[j].getElementsByTagName('parameter');
									for(var k=0;k<params.length;k++){
										for(var oldParam in body){
											newBody[params[k].getAttribute('name')] = body[oldParam];
											delete body[oldParam];
											break;
										}
										
									}
									message.setBody(newBody);
									
								}
							}
							comp.invokeOperation(mappings[channel][i],message);
						}
					}
				}catch(exe){
				    log.error("[CProxy] ("+cid+"): an error occured while calling component-method",mappings[channel][i]);
				    log.error(exe);
				}
			}
		}else {
            log.warn('[CProxy] ('+cid+') found no handler for '+event);
		}
	};

	/**
	 * Function that is used to fire an event and invoked by the component. Its the publisher-side of a specified channel.
	 * @function
	 * @public
	 * @param {Ext.cruise.client.Message} message a message object
	 */
	this.publish= function(message){
		if (blocked){
			log.warn('[CProxy] ('+cid+') PUBLISH: BLOCKED... queuing event ', eventQueue.length);
			eventQueue.push({
				message: message,
				direction: 'OUT'
			});
			return;
		}

		// do fancy additional stuff here:--------


		// ---------------------------------------

		try{
			log.warn("[CProxy] ("+cid+") PUBLISH ",message.getName(), cid);
			eventBroker.publish(message, cid);
		}catch(e){log.error("[CProxy] ("+cid+")",e);}
	};
	
	/**
	 * Function that is used to change a component's title (in the surrounding panel). Can be invoked by components
	 * @function
	 * @public
	 * @param {String} title to be shown in the titlebar
	 * @return {booelan} sucess of title setting
	 */
	this.setComponentTitle= function(title){
		if (applicationManagerInstance.getComponentManager().isUIC(cid)) {
			var panel = applicationManagerInstance.getComponentManager().getAdaptabilityPanel(cid);
			panel.setTitle(title);
			return true;
		}
		return false;
	};
	
	/**
	 * Function that is used to retrieve a component's title (in the surrounding panel). Can be invoked by components
	 * @function
	 * @public
	 * @return {String} Title currently shown in the component panel, null if no UI component
	 */
	this.getComponentTitle= function(){
		if (applicationManagerInstance.getComponentManager().isUIC(cid)) {
			var panel = applicationManagerInstance.getComponentManager().getAdaptabilityPanel(cid);
			return panel.title;
		}
		return;
	};
};