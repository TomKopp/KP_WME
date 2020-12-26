Ext.namespace('Documa.util');

Documa.util.ComponentUtil = Ext.extend(Object, (function(){

	/**
	 * Function to get parameters with name and type of a Node
	 *
	 * @param node single DOM Node
	 * @returns {Object} parameters JSON Object containing the parameters
	 */
	function extractNodeParameters(node){
		let parameters = {};
		let params = Array.prototype.slice.call(node.querySelectorAll("parameter"));
		for(let j = 0; j < params.length; j++) {
			let paramName = params[j].getAttribute("name");
			let paramType = params[j].getAttribute("type");
			let parameter = {
				"type": paramType
			};
			parameters[paramName] = parameter;
		}
		return parameters;
	}

	/**
	 * Function that extracts the callbackOperation of an event out of the SMCDL-node
	 *
	 * @param node single DOM Node of an event
	 * @return The name of the callbackOperation or null, if there is no callbackOperation
	 */
	function extractCallbackOperation(node){
		let callbackOperation = null;
		try {
			let tagsCO = Array.prototype.slice.call(node.querySelectorAll("callbackOperation"));
			callbackOperation = tagsCO[0].getAttribute("name");
		} catch (err) {
		}
		return callbackOperation;
	}

	/**
	 * Function to get ids of all capabilities of a Node
	 *
	 * @param node single DOM Node
	 * @returns {Array.<String>} capabilityIDs JSON Object containing the capability ids
	 */
	function extractNodeCapabilityIDs(node){
		let capabilityIDs = [];
		let capabilities = Array.prototype.slice.call(node.querySelectorAll("capability"));
		for(let j = 0; j < capabilities.length; j++) {
			let capID = capabilities[j].getAttribute("id");

			capabilityIDs.push(capID);
		}
		return capabilityIDs;
	}

	/**
	 * Function that extracts the returnEvent of an operation out of the SMCDL-node
	 *
	 * @param node single DOM Node of an operation
	 * @return The name of the returnEvent or null, if there is no returnEvent
	 */
	function extractReturnEvent(node){
		let returnEvent = null;
		try {
			let tagsRE = Array.prototype.slice.call(node.querySelectorAll("returnEvent"));
			returnEvent = tagsRE[0].getAttribute("name");
		} catch (err) {
		}
		return returnEvent;
	}


	/**
	 * Helper Function to extract Viewbindings from the SMCDL to a JSON Object
	 *
	 * @param capChildren Children of Capability Object
	 * @return viewbindings JSON Object with all Viewbindings
	 */
	function extractViewbindings(capChildren){
		let viewbindings = [];
		for(let i = 0; i < capChildren.length; i++) {
			if(capChildren[i] !== null && capChildren[i].tagName.indexOf("viewbinding") !== -1) {
				let vb = null;
				if(capChildren[i].children[0].tagName.indexOf("paralleloperation") !== -1) {
					let elems = capChildren[i].children[0].children;
					for(let j = 0; j < elems.length; j++) {
						vb = {
							"id": elems[j].getAttribute("id"),
							"element": elems[j].getAttribute("element"),
							"modifier": elems[j].getAttribute("modifier")
						};
						viewbindings.push(vb);
					}
				} else {
					vb = {
						"id": capChildren[i].children[0].getAttribute("id"),
						"element": capChildren[i].children[0].getAttribute("element"),
						"modifier": capChildren[i].children[0].getAttribute("modifier")
					};
					viewbindings.push(vb);
				}
			}
		}
		return viewbindings;
	}


	/**
	 * Function to extract Capabilities from the SMCDL to a JSON Object
	 *
	 * @param descriptor SMCDL of the Component
	 * @return capabilities JSON Object with all capabilities
	 */
	function extractCapabilitiesFromSMCDL(descriptor){
		let capabilities = {};
		//extract all Capability DOM Nodes to an Array
		let allCapapabilityNodes = Array.prototype.slice.call(descriptor.querySelectorAll("capability"));
		for(let i = 0; i < allCapapabilityNodes.length; i++) {
			//extract capability attributes
			let capID = allCapapabilityNodes[i].getAttribute("id");
			let capActivity = allCapapabilityNodes[i].getAttribute("activity");
			let capEntity = allCapapabilityNodes[i].getAttribute("entity");
			// extract viewbindings
			let capChildren = Array.prototype.slice.call(allCapapabilityNodes[i].children);
			let viewbindings = extractViewbindings.call(this, capChildren);
			if(viewbindings.length === 0) viewbindings = "noViewbindings";
			/*
			 * test if user interaction is required
			 *
			 * Capability has provider Attribute with system or ui
			 * if provider=ui -> user interaction is required
			 */
			let capUserInteraction = false;
			if(allCapapabilityNodes[i].getAttribute("provider") === "ui") {
				capUserInteraction = true;
			}
			//create JSON Object
			let capability = {
				"activity": capActivity,
				"entity": capEntity,
				"requriesUserInteraction": capUserInteraction,
				"operation": "noOperation",
				"event": "noEvent",
				"viewbindings": viewbindings
			};
			capabilities[capID] = capability;
		}

		//TODO Method assumes that every Capability has a maximum of one event (to work in ExtJS 3.4 Store)
		//add event name to capability Json if event depends on capability
		let j = 0;
		let allEventNodes = Array.prototype.slice.call(descriptor.querySelectorAll("event"));
		for(let i = 0; i < allEventNodes.length; i++) {
			let eventCausedBy = allEventNodes[i].querySelectorAll("causedBy");
			if(eventCausedBy.length > 0) {
				let event_cap;
				for(j = 0; j < eventCausedBy.length; j++) {
					event_cap = eventCausedBy[j].innerHTML;
					if(capabilities[event_cap]) {
						capabilities[event_cap].event = allEventNodes[i].getAttribute("name");
					}
				}
			}
		}
		//TODO Method assumes that every Capability has a maximum of one method (to work in ExtJS 3.4 Store)
		//add operation name to capability Json if capability belongs to operation
		let allOperationsNodes = Array.prototype.slice.call(descriptor.querySelectorAll("operation"));
		for(let i = 0; i < allOperationsNodes.length; i++) {
			let opCapabilityIDs = extractNodeCapabilityIDs(allOperationsNodes[i]);
			if(opCapabilityIDs.length > 0) {
				for(j = 0; j < opCapabilityIDs.length; j++) {
					capabilities[opCapabilityIDs[j]].operation = allOperationsNodes[i].getAttribute("name");
				}
			}
		}
		return capabilities;
	}

	/**
	 * Function to extract Properties from the SMCDL to a JSON Object
	 *
	 * @param descriptor SMCDL of the Component
	 * @return properties JSON Object with all Properties
	 */
	function extractPropertiesFromSMCDL(descriptor){
		let properties = {};
		//extract property DOM Nodes to an Array
		let allPropertyNodes = Array.prototype.slice.call(descriptor.querySelectorAll("property"));
		for(let i = 0; i < allPropertyNodes.length; i++) {
			//extract property attributes
			let propName = allPropertyNodes[i].getAttribute("name");
			let propType = allPropertyNodes[i].getAttribute("type");
			let isRequired = allPropertyNodes[i].getAttribute("required");
			//Get the changeEvent of a property
			let changeEventNode = allPropertyNodes[i].querySelector("changeEvent");
			let changeEvent;
			if(changeEventNode) {
				changeEvent = changeEventNode.getAttribute("name");
			}
			else {
				changeEvent = propName + "Changed";
			}
			//extract value if existing
			let value = '';
			if(allPropertyNodes[i].children !== undefined) {
				if(allPropertyNodes[i].children.length > 0) {
					value = allPropertyNodes[i].children[0].textContent;
				}
			} else {
				// check whether there exits child nodes or not
				if(allPropertyNodes[0].childNodes.length > 0)
					value = allPropertyNodes[0].firstChild.textContent;
			}
			//test if property is a collection
			let isCollection = allPropertyNodes[i].getAttribute("isCollection");
			if(!isCollection) {
				isCollection = false;
			}
			//create JSON Object
			let property = {
				"type": propType,
				"isRequired": isRequired,
				"isCollection": isCollection,
				"value": value,
				"changeEvent": changeEvent
			};
			properties[propName] = property;
		}
		return properties;
	}

	/**
	 * Function to extract Events from the SMCDL to a JSON Object
	 *
	 * @param descriptor SMCDL of the Component
	 * @return events JSON Object with all Events
	 */
	function extractEventsFromSMCDL(descriptor){
		let events = {};
		//extract event DOM Nodes to an Array
		let allEventNodes = Array.prototype.slice.call(descriptor.querySelectorAll("event"));
		for(let i = 0; i < allEventNodes.length; i++) {
			//extract event attributes
			let eventName = allEventNodes[i].getAttribute("name");
			let eventDependsOn = allEventNodes[i].getAttribute("dependsOn");
			//extract parameters
			let eventParameters = extractNodeParameters.call(this, allEventNodes[i]);
			//extract the callbackOperation of the event, if available
			let callbackOperation = extractCallbackOperation.call(this, allEventNodes[i]);
			//create JSON Object
			let event = {
				"dependsOn": eventDependsOn,
				"parameters": eventParameters,
				"callbackOperation": callbackOperation
			};
			events[eventName] = event;
		}
		return events;
	}

	/**
	 * Function to extract Operations from the SMCDL to a JSON Object
	 *
	 * @param descriptor SMCDL of the Component
	 * @return operations JSON Object with all Operations
	 */
	function extractOperationsFromSMCDL(descriptor){
		let operations = {};
		let allOperationsNodes = Array.prototype.slice.call(descriptor.querySelectorAll("operation"));
		for(let i = 0; i < allOperationsNodes.length; i++) {
			//extract operation attributes
			let opName = allOperationsNodes[i].getAttribute("name");
			//extract operation capabilities
			let opCapabilityIDs = extractNodeCapabilityIDs.call(this, allOperationsNodes[i]);
			//extract parameters
			let opParameters = extractNodeParameters.call(this, allOperationsNodes[i]);
			//extract the returnEvent of the operation, if available
			let returnEvent = extractReturnEvent.call(this, allOperationsNodes[i]);
			//create JSON Object
			let operation = {
				"capabilities": opCapabilityIDs,
				"parameters": opParameters,
				"returnEvent": returnEvent
			};
			operations[opName] = operation;
		}
		return operations;
	}

	return {
		/**
		 * Returns Info of component for a given descriptor
		 */
		getComponentInfo: function(descriptor){
			let componentid = descriptor.getAttribute("id");
			let componentName = descriptor.getAttribute("name");
			let isUI = descriptor.getAttribute("isUI");
			let componentInfo = {
				"id": componentid,
				"name": componentName,
				"isUi": isUI,
				"icon": null
			};
			let iconEl = Array.prototype.slice.call(descriptor.querySelectorAll("icon"))[0];
			if(iconEl) {
				componentInfo.icon = iconEl.getAttribute('url');
			}
			return componentInfo;
		},

		/**
		 * Returns capabilities for a given descriptor
		 */
		getComponentCapabilities: function(descriptor){
			let capabilities = extractCapabilitiesFromSMCDL.call(this, descriptor);
			return capabilities;
		},

		/**
		 * Returns properties for a given descriptor
		 */
		getComponentProperties: function(descriptor){
			let properties = extractPropertiesFromSMCDL.call(this, descriptor);
			return properties;
		},

		/**
		 * Returns events for a given descriptor
		 */
		getComponentEvents: function(descriptor){
			let events = extractEventsFromSMCDL.call(this, descriptor);
			return events;
		},

		/**
		 * Returns operations for a given descriptor
		 */
		getComponentOperations: function(descriptor){
			let operations = extractOperationsFromSMCDL.call(this, descriptor);
			return operations;
		}
	};
})());
