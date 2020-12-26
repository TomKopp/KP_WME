Ext.namespace('Documa.ui.views.capview');

/**
 * @author Annett Kroell, Robert Starke, Sergej Hahn
 * @class Documa.ui.view.capview.CapView
 * @extends Documa.ui.views.capview.BaseView
 *
 * The CapView handles the presentation of the end user view of the composition.
 * It creates component overlays that show the properties and the capabilities of the component.
 * Capabilities of different components can be connected over their connection points.
 */

Documa.require('Documa.RuntimeManager');
Documa.require('Documa.components.ComponentManager');
Documa.require('Documa.util.Logger');
Documa.require('Documa.ui.views.BaseView');
Documa.require('Documa.ui.views.MetaView');
Documa.require('Documa.ui.views.capview.LabelGenerator');

Documa.ui.views.capview.CapView = Ext.extend(Documa.ui.views.BaseView, (function() {
	
	////////////////
	// Attributes //
	////////////////
	
	var TAG = 'Documa.ui.views.capview.CapView';
	var _log = Documa.util.Logger;
	
	var _capabilities = null;
	var _properties = null;
	var _componentName = '';
	var _componentIcon = '';
	
	var _channels = [];
	var _remoteChannel = false;
	
	var _activeRecommendedCapabilityLabels = [];
	
	// ExtJS - objects
	var _superClass = null;
	var _componentManager = null;
	var _configManager = null;
	var _labelGenerator = null;
	var _capViewStore = null;
	var _capViewTemplate = null;
	var _capViewDataView = null;
	
	//Function to create JSON with capabilities and properties for the given component (JSON is then loaded in the components store)
	//var _buildOneJson = null;
	
	// Object which holds the capabilities and properties for the capViewStore
	var _jsonCapsAndProps = [];
	
	// new capview main frame
	var capview_main_frame = null;
	var distributions = null;
	
	var _distributionManager = null;
	
	var _jsPlumb = null;
	var _componentUtil = null;
	var _eventDispatcher = null;
	var _eventBroker = null;
	var _this = null;
	
	///////////////////////
	// Private Functions //
	///////////////////////
	
	/**
	 * Method to get the component manager
	 *
	 * @returns {Object} _componentManager
	 */
	var getComponentManager = function() {
		if(_componentManager === undefined || _componentManager === null) {
			_componentManager = Documa.RuntimeManager.getComponentManager();
		}
		return _componentManager;
	};
	
	/**
	 * Function to retrieve the ComponentID from the instance id of the component.
	 * @param {String} instanceId - Component Instance ID
	 * @returns {String} ComponentID - Returns the ComponentID
	 */
	var getComponentId = function(instanceId) {
		
		for(var i = 0; i < distributions.length; i++) {
			
			for(var j = 0; j < distributions[i].components.length; j++) {
				if(distributions[i].components[j].uid === instanceId) return distributions[i].components[j].id;
			}
		}
	};
	
	/**
	 * Function to reset Connections points, remove class from cap rows and resets labels
	 */
	function removeConnectionPointClassesAndResetLabel() {
		// reset connection points
		jQuery('.connectionPoint.selected').removeClass('selected');
		jQuery('.connectionPoint.recommended').removeClass('recommended');
		
		// remove grayed class from all cap rows
		jQuery('.capRow').removeClass('grayed');
		
		// reset labels
		for(var i = 0; i < _activeRecommendedCapabilityLabels.length; i++) {
			jQuery('#' + _activeRecommendedCapabilityLabels[i].id).children('.label-text').text(_activeRecommendedCapabilityLabels[i].label);
		}
	}
	
	/**
	 * Show and hide properties of a component when the header row is clicked
	 *
	 * @param {String} viewID ID of the current View
	 */
	function toggleProperties(viewID) {
		jQuery('#' + viewID + ' .capRow.property').toggleClass('rowHidden');
	}
	
	/**
	 * Update cap view.
	 */
	function compileView() {
		
		_jsPlumb.empty("capview");
		
		var con = _configManager.getCurrentConfig();
		capview_main_frame.update('<cap-view cols="' + con.cols + '"rows="' + con.rows + '"></cap-view>');
		
		// new stuff
		capview_main_frame.doLayout();
		
		$('cap-view').each(function() {
			var content = $(this);
			angular.element(document).injector().invoke(function($compile) {
				var scope = angular.element(content).scope();
				$compile(content)(scope);
			});
		});
		
		capview_main_frame.show();
		createDistributionArray();
		
	}
	
	/**
	 * Fills the distribution array with values
	 */
	function createDistributionArray() {
		
		var appcontext = Documa.RuntimeManager.getApplicationContext();
		var distributionSet = appcontext.getDistributionManager().getDistributions();
		
		var config_devices = _configManager.getCurrentConfig() ? _configManager.getCurrentConfig().devices : [];
		
		var addToDistribution = (dist_id, device, components, array) => {
			var entry = {
				device: device,
				components: components,
				id: dist_id
			};
			array.push(entry);
		};
		
		var constructComponentEntry = (component_uid, smcd) => ({
			info: _componentUtil.getComponentInfo(smcd),
			cap: _componentUtil.getComponentCapabilities(smcd),
			uid: component_uid,
			id: component_id
		});
		
		// creating the distributions array
		distributions = [];
		
		// clear the local cache, its going to be updated now
		_channels = [];
		
		var environmentContext = Documa.RuntimeManager.getEnvironmentContext();
		
		var components = null;
		var component_id = null;
		var component_uid = null;
		var component_array;
		var result = null;
		
		var smcd = null;
		var dist = null;
		var device = null;
		var j;
		
		var is_in_distribution_set_flag = false;
		var reduced_distribution_set = [];
		
		// check for each distributionSet entry if its part of the config devices array
		for(var i = 0; i < distributionSet.length; ++i) {
			dist = distributionSet[i];
			
			// get updated channels from distributions
			var device_channels = dist.getChannels();
			
			for(var l = 0; l < device_channels.length; l++) {
				
				for(var k = 0; k < device_channels[l]._channelObj.receiver.length; k++) {
					
					// get all the information from the channel object
					var name1 = device_channels[l]._channelObj.receiver[k].cename;
					var type1 = device_channels[l]._channelObj.receiver[k].cetype;
					var instid1 = device_channels[l]._channelObj.receiver[k].instid;
					var name2 = device_channels[l]._channelObj.sender[k].cename;
					var type2 = device_channels[l]._channelObj.receiver[k].cetype;
					var instid2 = device_channels[l]._channelObj.sender[k].instid;
					
					// construct ids for channel endpoints
					var id1 = name1 + "_" + instid1;
					var id2 = name2 + "_" + instid2;
					
					// check which one is operation and which is event
					var eventId = type1 === 'event' ? id1 : id2;
					var operationId = type1 === 'event' ? id2 : id1;
					
					// create new channel object for local cache
					var channel = {
						event: eventId,
						operation: operationId,
					};
					
					// only push if channel is not already in local array
					var channelFound = false;
					
					
					for(var m = 0; m < _channels.length; m++) {
						if(_channels[m].event === channel.event &&
							_channels[m].operation === channel.operation) {
							channelFound = true;
							break;
						}
						
					}
					
					// save channel object in local cache					
					if(!channelFound) _channels.push(channel);
				}
				
			}
			
			
			// 1st: get device from current distribution
			device = environmentContext.getDevice(dist.getSessionId());
			
			if(!is_in_distribution_set_flag && config_devices.indexOf(device.getSessionId()) > -1) {
				is_in_distribution_set_flag = true;
			}
			
			// 2nd: get components from current distribution
			components = dist.getComponents();
			component_array = [];
			for(j = 0; j < components.length; j++) {
				smcd = components[j].getSmcd()[0];
				component_id = components[j]._cid;
				component_uid = components[j]._instid;
				result = constructComponentEntry(component_uid, smcd);
				if(result) {
					component_array.push(result);
				} else {
					_log.error(TAG, '... sorry but this component isn\'t loaded! ComponentID: ' + component_id);
				}
			}
			
			if(is_in_distribution_set_flag && config_devices.indexOf(device.getSessionId()) > -1) {
				addToDistribution(dist.getSessionId(), device, component_array, reduced_distribution_set);
			}
			
			addToDistribution(dist.getSessionId(), device, component_array, distributions);
		}
		
		if(is_in_distribution_set_flag) {
			distributions = reduced_distribution_set;
		}
		
	}
	
	/**
	 * Set a proper configuration.
	 */
	function updateConfig() {
		var appcontext = Documa.RuntimeManager.getApplicationContext();
		var distributionSet = appcontext.getDistributionManager().getDistributions();
		
		var foundConfig = false;
		var device_count;
		if(distributionSet.length > 6) device_count = 6;
		else device_count = distributionSet.length;
		
		//_configManager = Documa.RuntimeManager.getUIManager().getConfigManager();
		
		// if configs are there already, check if the number of devices fits
		if(_configManager.getCurrentConfig() !== null) {
			
			var configs = _configManager.getConfigs();
			for(var k = 0; k < _configManager.getConfigs().length; k++) {
				
				
				// if config has right number of devices, activate it
				if(configs[k].devices.length === device_count) {
					_configManager.activateConfig(k);
					foundConfig = true;
				}
				
			}
		}
		
		// if there is still no config found
		if(!foundConfig) {
			// this is where the dialogue for choosing a config should appear
			
			// for now create a default config
			switch (device_count) {
				case 1:
					_configManager.setConfig("ID1", "default1", "Bob", "Device", 1, 1, [0]);
					break;
				
				case 2:
					_configManager.setConfig("ID2", "default2", "Bob", "Device", 2, 1, [0, 1]);
					break;
				
				case 3:
					_configManager.setConfig("ID3", "default3", "Bob", "Device", 3, 1, [0, 1, 2]);
					break;
				
				case 4:
					_configManager.setConfig("ID4", "default4", "Bob", "Device", 2, 2, [0, 1, 2, 3]);
					break;
				
				case 5:
					_configManager.setConfig("ID5", "default5", "Bob", "Device", 3, 2, [0, 1, 2, 3, 4]);
					break;
				
				case 6:
					_configManager.setConfig("ID6", "default6", "Bob", "Device", 3, 2, [0, 1, 2, 3, 4, 5]);
					break;
			}
		}
	}
	
	/**
	 * Function to create store, template, dataView and panel for each component container.
	 */
	function buildCapView() {
		
		_jsPlumb = jsPlumb.getInstance();
		
		_jsPlumb.bind("connectionDrag", function(connection) {
			$("#" + connection.sourceId).addClass("selected");
			var instanceId = connection.sourceId.split("_")[1];
			var name = connection.sourceId.split("_")[0];
			var cid = getComponentId(instanceId);
			var type = $("#" + connection.sourceId).hasClass("incoming") ? 'operation' : 'event';
			// construct connection point object for recommendation service
			var connectionPoint = {
				'cid': cid,
				'ciid': instanceId,
				'type': type,
				'name': name
			};
			_superClass.requestRecommendation(connectionPoint);
		});
		
		_jsPlumb.bind("connectionDragStop", function(connection) {
			removeConnectionPointClassesAndResetLabel();
		});
		
		// set callbacks for detecting connections
		_jsPlumb.bind("connection", function(info) {
			// reset everything
			removeConnectionPointClassesAndResetLabel();
			// if this connection is runnung through a control point, it has already been registered, so return
			if($("#" + info.targetId).hasClass("controlPoint") || $("#" + info.sourceId).hasClass("controlPoint")) return;
			// if this connection is not allowed, return (same component, operation->operation or event->event)
			if(info.sourceId.split("_")[1] === info.targetId.split("_")[1] ||
				$("#" + info.sourceId).hasClass("outgoing") && $("#" + info.targetId).hasClass("outgoing") ||
				$("#" + info.sourceId).hasClass("incoming") && $("#" + info.targetId).hasClass("incoming")
			) {
				_jsPlumb.detach(info.connection);
				return;
			}
			
			var eventId = null;
			var operationId = null;
			
			// determine which connectionPoint is event and which operation
			if($("#" + info.sourceId).hasClass("outgoing")) {
				eventId = info.sourceId;
				operationId = info.targetId;
			} else {
				eventId = info.targetId;
				operationId = info.sourceId;
			}
			
			// extract component uid 
			var eventCompUid = eventId.split("_")[1];
			var operationCompUid = operationId.split("_")[1];
			
			// save channel locally
			var channel = {
				event: eventId,
				operation: operationId,
			};
			
			var push = true;
			
			// if channel is already registered, don't save it again
			for(var i = 0; i < _channels.length; i++) {
				if(channel.event === _channels[i].event && channel.operation === _channels[i].operation) {
					push = false;
					break;
				}
			}
			
			if(push) {
				// save channel locally
				_channels.push(channel);
				
				// if this is a remote channel, don't send another event for server
				if(!_remoteChannel) {
					
					// convert to old connection point objects 
					// initialize channel creation
					var instanceId1 = channel.event.split("_")[1];
					var name1 = channel.event.split("_")[0];
					var cid1 = getComponentId(instanceId1);
					
					var connectionPoint1 = {
						'cid': cid1,
						'ciid': instanceId1,
						'type': 'event',
						'name': name1
					};
					
					var instanceId2 = channel.operation.split("_")[1];
					var name2 = channel.operation.split("_")[0];
					var cid2 = getComponentId(instanceId2);
					
					var connectionPoint2 = {
						'cid': cid2,
						'ciid': instanceId2,
						'type': 'operation',
						'name': name2
					};
					
					_superClass.initializeChannelCreation(connectionPoint1, connectionPoint2);
				}
			}
			
			// PATHFINDING FOR CHANNELS BEGINS HERE			
			var eventCompPos = document.getElementById("channelRow_" + eventCompUid).getBoundingClientRect();
			var operationCompPos = document.getElementById("channelRow_" + operationCompUid).getBoundingClientRect();
			var eventPos = document.getElementById(eventId).getBoundingClientRect();
			var operationPos = document.getElementById(operationId).getBoundingClientRect();
			
			var leftChannelCompUid = null;
			var rightChannelCompUid = null;
			
			// if channels need to be drawn different than they are already, this will be set true
			var redrawChannels = false;
			
			// check if components are in the same row or not
			if(eventCompPos.left === operationCompPos.left) {
				// components are in the same row
				// use channel row of the lower component
				leftChannelCompUid = eventCompPos.top > operationCompPos.top ? eventCompUid : operationCompUid;
				redrawChannels = true;
				
			} else {
				// components are not in the same row
				
				// check if operation and event are facing each other or not
				if(eventPos.left > operationPos.left) {
					// operation and event are not facing each other
					// use channel rows of both components
					leftChannelCompUid = operationCompUid;
					rightChannelCompUid = eventCompUid;
					
					redrawChannels = true;
				}
			}
			
			if(redrawChannels) {
				// component layout makes it necessary to lay channels into channel rows
				
				// detach user-drawn connection to draw it differently
				_jsPlumb.detach(info.connection);
				
				// define options for left and right control points
				var offset = Math.random() * 0.85;
				
				var leftControlPointOptions = {
					endpoint: "Blank",
					connector: ["Flowchart"],
					connectorStyle: {strokeStyle: "rgba(100,100,100,50)", lineWidth: 2},
					//connectorHoverStyle: { strokeStyle:"rgba(100,100,100,100)", outlineWidth: 1, outlineColor:"red"},
					maxConnections: -1,
					anchor: [0, offset, -1, 0]
				};
				
				var rightControlPointOptions = {
					endpoint: "Blank",
					connector: ["Flowchart"],
					connectorStyle: {strokeStyle: "#000", lineWidth: 2},
					//connectorHoverStyle: { strokeStyle:"rgba(100,100,100,100)", outlineWidth: 1, outlineColor:"red"},
					maxConnections: -1,
					anchor: [1, offset, 1, 0]
				};
				
				// find control points for left channel row and add jsPlumb endpoints
				var leftRowLeftCP = $("#channelRow_" + leftChannelCompUid).children(".left")[0];
				var leftRowRightCP = $("#channelRow_" + leftChannelCompUid).children(".right")[0];
				_jsPlumb.addEndpoint(leftRowLeftCP, {uuid: "leftRowLeftCP" + eventId + operationId}, leftControlPointOptions);
				_jsPlumb.addEndpoint(leftRowRightCP, {uuid: "leftRowRightCP" + eventId + operationId}, rightControlPointOptions);
				
				// do the same for right channel row (if necessary)
				if(rightChannelCompUid != null) {
					var rightRowLeftCP = $("#channelRow_" + rightChannelCompUid).children(".left")[0];
					var rightRowRightCP = $("#channelRow_" + rightChannelCompUid).children(".right")[0];
					_jsPlumb.addEndpoint(rightRowLeftCP, {uuid: "rightRowLeftCP" + eventId + operationId}, leftControlPointOptions);
					_jsPlumb.addEndpoint(rightRowRightCP, {uuid: "rightRowRightCP" + eventId + operationId}, rightControlPointOptions);
					
				}
				
				// ACTUAL DRAWING OF CONNECTIONS BEGINS HERE
				
				// check if only one channel row is used
				if(rightChannelCompUid === null) {
					// draw connection from event through channel row to operation
					
					// event -> right control point
					_jsPlumb.connect({
						uuids: [eventId, "leftRowRightCP" + eventId + operationId],
						detachable: false,
						anchors: ["Right", "Center"]
					});
					
					// right control point -> left control point
					_jsPlumb.connect({
						uuids: ["leftRowRightCP" + eventId + operationId, "leftRowLeftCP" + eventId + operationId],
						detachable: false,
						anchors: ["Center", "Center"]
					});
					
					// left control point -> operation
					_jsPlumb.connect({
						uuids: ["leftRowLeftCP" + eventId + operationId, operationId],
						detachable: false,
						anchors: ["Center", "Left"]
					});
					
				} else {
					// both channel rows are to be used
					// draw connection from event through right channel row & left channel row to operation
					
					// event -> right row right control point
					_jsPlumb.connect({
						uuids: [eventId, "rightRowRightCP" + eventId + operationId],
						detachable: false,
						anchors: ["Right", "Center"]
					});
					
					// right row right control point -> right row left control point
					_jsPlumb.connect({
						uuids: ["rightRowRightCP" + eventId + operationId, "rightRowLeftCP" + eventId + operationId],
						detachable: false,
						anchors: ["Center", "Center"]
					});
					
					// right row left control point -> left row right control point
					_jsPlumb.connect({
						uuids: ["rightRowLeftCP" + eventId + operationId, "leftRowRightCP" + eventId + operationId],
						detachable: false,
						anchors: ["Center", "Center"]
					});
					
					// left row right control point -> left row left control point
					_jsPlumb.connect({
						uuids: ["leftRowRightCP" + eventId + operationId, "leftRowLeftCP" + eventId + operationId],
						detachable: false,
						anchors: ["Center", "Center"]
					});
					
					// left row left control point -> operation
					_jsPlumb.connect({
						uuids: ["leftRowLeftCP" + eventId + operationId, operationId],
						detachable: false,
						anchors: ["Center", "Left"]
					});
				}
			}
		});
		
		_jsPlumb.bind("connectionDetached", function(info) {
		});
		updateConfig();
		compileView();
	}
	
	/**
	 * Function for associations of both Jsons and adjusting the values.
	 * Necessary because ExtJs 3.4 can only handle one-dimensional Jsons.
	 *
	 * @param {Json} capabilityJson - Json with capabities of the current component.
	 * @param {Json} propertyJson - Json with properties of the current component.
	 * @param {String} currentComponentID - ID of the current component.
	 * @param {String} compInstanceID - Instance-ID of the current component.
	 * @param {String} componentIcon - Icon of the current component.
	 * @returns {Json} componentCapabilitiesAndProperties - Conformed Json with capabities and properties of the current component.
	 */
	var _buildOneJson = function(capabilityJson, propertyJson, currentComponentID, compInstanceID, componentIcon) {
		
		var counter = 0;
		var componentCapabilitiesAndProperties = [];
		var capabilityObject = {};
		var propertyObject = {};
		
		// process the capabilities in the capabilityJson
		for(var cap in capabilityJson) {
			var componenttype = 'capability';
			var capFromJson = capabilityJson[cap];
			var capabilityID = cap;
			var activity = capFromJson.activity;
			var entity = capFromJson.entity;
			var requriesUserInteraction = capFromJson.requriesUserInteraction;
			var capOperation = capFromJson.operation;
			var capEvent = capFromJson.event;
			var label = _labelGenerator.getInitialLabelForCapability({'activity': activity, 'entity': entity,});
			var connectionPointID = currentComponentID + '_' + capabilityID;
			var icon = componentIcon;
			
			_log.debug(TAG, " CAP-Label: " + label);
			
			capabilityObject = {
				'componenttype': componenttype,
				'icon': icon,
				'label': label,
				'capID': capabilityID,
				'activity': activity,
				'entity': entity,
				'requriesUserInteraction': requriesUserInteraction,
				'operation': capOperation,
				'event': capEvent,
				'cpID': connectionPointID,
				'compInstanceID': compInstanceID,
			};
			componentCapabilitiesAndProperties[counter] = capabilityObject;
			counter++;
		}
		
		// process the properties in the propertyJson
		for(var prop in propertyJson) {
			var _componenttype = 'property';
			var propFromJson = propertyJson[prop];
			var propertyName = prop;
			var type = propFromJson.type;
			var isRequired = propFromJson.isRequired;
			var isCollection = propFromJson.isCollection;
			var _label = _labelGenerator.getInitialLabelForProperty({'type': type, 'value': propertyName,});
			
			_log.debug(TAG, " PROP-Label: " + _label);
			
			var propOperation = 'Operation';
			var propEvent = 'Event';
			var _connectionPointID = currentComponentID + '_' + propertyName;
			var _icon = componentIcon;
			
			if(!(propertyName == 'title' || propertyName == 'height' || propertyName == 'width')) {
				propertyObject = {
					'componenttype': _componenttype,
					'icon': _icon,
					'label': _label,
					'operation': propOperation,
					'event': propEvent,
					'name': propertyName,
					'type': type,
					'isRequired': isRequired,
					'isCollection': isCollection,
					'cpID': _connectionPointID,
					'compInstanceID': compInstanceID,
				};
				componentCapabilitiesAndProperties[counter] = propertyObject;
				counter++;
			}
		}
		return componentCapabilitiesAndProperties;
	};
	
	
	///////////////////////
	// Public Functions //
	///////////////////////
	
	return {
		constructor: function(layoutManager, viewName) {
			
			/* Reference super class. */
			_superClass = Documa.ui.views.capview.CapView.superclass;
			_superClass.constructor.call(this, layoutManager, viewName);
			
			_labelGenerator = new Documa.ui.views.capview.LabelGenerator();
			_eventDispatcher = Documa.RuntimeManager.getEventDispatcher();
			_eventBroker = Documa.RuntimeManager.getEventBroker();
			_this = this;
			
			capview_main_frame = new Ext.Container({
				id: 'csr-capview-main-container',
				layout: {
					type: 'fit'
				},
				border: false,
				style: {
					width: '100%',
					height: '100%'
				},
			});
			
		},
		
		
		/**
		 * Calls the show - method of the superclass and draws the capView.
		 * Calls the 'buildCapView' - function.
		 * Ownership of the Scroll - function and calls for updating the channel drawing.
		 */
		show: function() {
			if(_configManager === null) {
				_configManager = Documa.RuntimeManager.getUIManager().getConfigManager();
				_configManager.addOnChangeConfig(_this.compileView);
			}
			
			if(_componentUtil === null) {
				_componentUtil = Documa.RuntimeManager.getComponentManager().getComponentUtil();
			}
			
			_eventDispatcher.addEventListener("channelcreated", _this, _this.addRemoteChannel);
			buildCapView();
		},
		
		/**
		 * Calls  the closeView - method of superclass for leaving the capView.
		 */
		closeView: function() {
			//_superClass.closeView.call(this);
			_eventDispatcher.removeEventListener(_this.addRemoteChannel);
			_configManager.removeOnChangeConfig(_this.compileView);
			capview_main_frame.hide();
		},
		
		/**
		 * Function to handle click event of the close button which deletes component
		 *
		 * @param String instanceId belonging to the Component containing the clicked close button
		 */
		onCloseButtonClicked: function(instanceId, componentId) {
			
			var msg = 'Are you sure you want to delete the whole component?';
			var uiManager = Documa.RuntimeManager.getUIManager();
			
			uiManager.showConfirmationDialog.call(this, msg, function(choice) {
				if(choice == 'yes') {
					//uiManager.getActiveView().removeComponent(instanceId);
					
					// remove component and overlay
					getComponentManager().removeComponent(instanceId, componentId, true);
					var successfulOverlayRemove = _superClass.getMetaView().removeComponentOverlay(instanceId);
					
					_superClass.updateView();
					
					return successfulOverlayRemove;
					
				}
			});
		},
		
		/**
		 * Function to handle click event of the minimize button
		 *
		 * @param String instanceId The instanceId of the component whose minimize button was clicked
		 */
		onMinimizeButtonClicked: function(instanceId) {
			
			var icon = document.getElementById("icon_" + instanceId);
			var content = document.getElementById("capContent_" + instanceId);
			var header = document.getElementById("cHeader_" + instanceId);
			
			//Hides Icon and Shows capRows
			if(icon.style.display === 'block') {
				icon.style.visibility = 'hidden';
				icon.style.display = 'none';
				content.style.visibility = 'visible';
				
				//resets height and left
				header.style.height = '26px';
				
				var id = jQuery(content).attr('id');
				jQuery('#' + id + ' .capRow').removeClass('rowHidden');
				jQuery('#' + id + ' .capRow .connectionPoint.incoming').css('left', '');
				jQuery('#' + id + ' .capRow .connectionPoint.outgoing').css('left', '');
			}
			//Shows Icon and Hides Cap Rows
			else if(icon.style.display !== 'block') {
				icon.style.visibility = 'visible';
				icon.style.display = 'block';
				content.style.visibility = 'hidden';
				
				header.style.height = '150px';
				
				// sets height to 0 and centers all connection points
				// so that lines leave and going into the icon
				var id = jQuery(content).attr('id');
				var width = jQuery(content).width();
				jQuery('#' + id + ' .capRow').addClass('rowHidden');
				jQuery('#' + id + ' .capRow .connectionPoint.incoming').css('left', width / 2 + 'px');
				jQuery('#' + id + ' .capRow .connectionPoint.outgoing').css('left', width / 2 + 'px');
			}
			// redraw lines
			_jsPlumb.repaintEverything();
			//_superClass.updateChannels();
		},
		
		/**
		 * Show and hide capabilities of a component when the header row is clicked
		 *
		 * @param {String} compID ID of the current component
		 */
		toggleCapabilities: function(compID) {
			
			$('#capContent_' + compID).find('.capRow.capability').toggleClass('rowHidden');
			
		},
		
		/**
		 * Get the main capview extjs panel
		 */
		getCapViewPanel: function() {
			return capview_main_frame;
		},
		
		/**
		 * Function to remove a component from the view.
		 *
		 * @param {String} instanceId - Instance-ID of the current Component.
		 */
		removeComponent: function(instanceId) {
			_superClass.removeComponent.call(this, instanceId);
		},
		
		/**
		 * Function to redraw all connections.
		 */
		redrawConnections: function() {
			if(_jsPlumb != null) _jsPlumb.repaintEverything();
		},
		
		
		/**
		 * Function to handle Recommendations.
		 *
		 * @param {Json} recommendations
		 */
		handleRecommendation: function(recommendations) {
			
			// gray out all capRows
			jQuery('.capRow').addClass('grayed');
			_activeRecommendedCapabilityLabels = [];
			
			// retrieve all connectionPoints from the current Dom
			var connectionPoints = jQuery('.connectionPoint');
			
			// retrieve information for the current selected connection point
			var selectedCpEntity = jQuery('.connectionPoint.selected').parent().attr('entity');
			var selectedCpActivity = jQuery('.connectionPoint.selected').parent().attr('activity');
			
			var selectedConnectionPointIsSource = false;
			
			// check if the connection point is source or target (relevant for label generation)
			if(jQuery('.connectionPoint.selected').hasClass('outgoing')) {
				selectedConnectionPointIsSource = true;
			}
			
			// find connection points from the recommendation in the retrieved connection points, generate labels and change visual style
			for(var i = 0; i < recommendations.length; i++) {
				for(var j = 0; j < connectionPoints.length; j++) {
					
					// if connection point in the Dom matches connection point in the recommendation
					if(connectionPoints[j].textContent === recommendations[i].name) {
						
						// retrieve IDs of selected and recommended capabilities
						var recommendedCpId = jQuery(connectionPoints[j]).parent().attr('id');
						var selectedCpId = jQuery('.connectionPoint.selected').parent().attr('id');
						
						// if selected and recommended capabilities are in the same component, don't do anything
						if(selectedCpId.split("_")[1] === recommendedCpId.split("_")[1]) continue;
						
						// retrieve information for the currently processing recommended connection point
						var recommendedCpEntity = jQuery(connectionPoints[j]).parent().attr('entity');
						var recommendedCpActivity = jQuery(connectionPoints[j]).parent().attr('activity');
						var recommendedConnectionPointIsSource = false;
						
						// check if the connection point is source or target (relevant for label generation)
						if(jQuery(connectionPoints[j]).hasClass('outgoing')) {
							recommendedConnectionPointIsSource = true;
						}
						
						// get capability information from selected connection point
						var capSelected = {
							'activity': selectedCpActivity,
							'entity': selectedCpEntity,
							'isSource': selectedConnectionPointIsSource
						};
						
						// get capability information from recommended connection point
						var capRecommended = {
							'activity': recommendedCpActivity,
							'entity': recommendedCpEntity,
							'isSource': recommendedConnectionPointIsSource
						};
						
						// retrieves mapping from the recommendation (provided by the server)
						var mapping = recommendations[i].mapping;
						
						// generating label
						var label = _labelGenerator.generateLabelForCapToCapConnection(capSelected, capRecommended, mapping);
						
						// adding class to the recommended connection point to add visual styles
						jQuery(connectionPoints[j]).addClass('recommended');
						
						// save the old label
						var oldLabel = jQuery(connectionPoints[j]).parent().children('.label-text').text();
						_activeRecommendedCapabilityLabels.push({'id': recommendedCpId, 'label': oldLabel});
						
						// changing the label of the capability row of the recommended connection point
						jQuery(connectionPoints[j]).parent().children('.label-text').text(label.mainlabel);
						
					}
				}
			}
			
			// delete grey color from the recommended and selected capRow
			jQuery('.connectionPoint.recommended').parent().removeClass('grayed');
			jQuery('.connectionPoint.selected').parent().removeClass('grayed');
		},
		
		/**
		 * Function to get the connection point.
		 *
		 * @param {String} componentInstanceID - Instance-ID of the current component.
		 * @param {String} attributeName - Name of the attribute.
		 * @param {String} connectionPointType - Type of the connection point.
		 * @returns {String} connectionPoint
		 */
		getConnectionPoint: function(componentInstanceID, attributeName, connectionPointType) {
			var connectionPoint = jQuery('#overlay_' + componentInstanceID + ' #' + attributeName).get(0);
			if(connectionPoint === undefined) {
				console.log('No connection point found.');
			}
			return connectionPoint;
		},
		
		/**
		 * Returns a component list for a given distribution entry.
		 * @param {String} id
		 */
		getDistributionComponents: function(id) {
			if(distributions[id] === undefined) {
				return null;
			}
			return distributions[id].components;
		},
		
		/**
		 * Returns a device list for a given distribution entry.
		 * @param {String} id
		 */
		getDistributionDevice: function(id) {
			if(distributions[id] === undefined) {
				return null;
			}
			return distributions[id].device;
		},
		
		/**
		 * Returns a component list
		 getComponents: function() {
			return components;
		},
		 */
		/**
		 * Returns a String the generated label for the property
		 * @param {String} cap
		 */
		getCapabilityLabel: function(cap) {
			return _labelGenerator.getInitialLabelForCapability(cap);
		},
		
		/**
		 * Returns String the generated label for the property
		 * @param {String} prop
		 */
		getPropertyLabel: function(prop) {
			return _labelGenerator.getInitialLabelForProperty(prop);
		},
		
		/**
		 * Connect two connection points
		 */
		addRemoteChannel: function(result) {
			
			// get necessary information from result & initialize connection
			var instid1 = result.payload.sender[0].instid;
			var name1 = result.payload.sender[0].cename;
			
			var instid2 = result.payload.receiver[0].instid;
			var name2 = result.payload.receiver[0].cename;
			
			_remoteChannel = true;
			_jsPlumb.connect({uuids: [name1 + "_" + instid1, name2 + "_" + instid2]});
			_remoteChannel = false;
			
		},
		
		/**
		 * Create a Channel for a given connection point
		 * @param {String} connectionPoint
		 *
		 * */
		createChannel: function(connectionPoint) {
			return null;
		},
		
		/**
		 * Call the private function compileView()
		 */
		compileView: function() {
			compileView();
		},
		
		/**
		 * Wrapper for the update config function
		 */
		updateConfig: function() {
			updateConfig();
		},
		
		/**
		 * Set incoming Endpoint Options & outgoing Endpoint Options
		 * Add Endpoints & draw the Channels
		 */
		createEndpoints: function() {
			
			// only create endpoints if they are not already there & if cap-labels are already drawn
			if($("#capview").children(".connectionPoint").length === 0 && $("#capview").find(".label-text").length > 0) {
				
				// set container for endpoints
				_jsPlumb.setContainer("capview");
				
				var incomingEndpointOptions = {
					endpoint: "Dot",
					maxConnections: -1,
					anchor: [0.5, 0.5, -1, 0],
					isSource: true,
					isTarget: true,
					paintStyle: {fillStyle: "none", outlineWidth: 0},
					//cssClass:"connectionPoint incoming",
					hoverClass: "connectionPoint incoming",
					connector: ["Flowchart"],
					connectorStyle: {strokeStyle: "rgba(100,100,100,50)", lineWidth: 2},
					//connectorHoverStyle: { strokeStyle:"rgba(100,100,100,100)", outlineWidth: 1, outlineColor:"red"},
					connectorOverlays: [["Arrow", {width: 10, height: 10, direction: -1}]]
				};
				
				var outgoingEndpointOptions = {
					endpoint: "Dot",
					maxConnections: -1,
					anchor: [0.5, 0.5, 1, 0],
					isSource: true,
					isTarget: true,
					paintStyle: {fillStyle: "none", outlineWidth: 0},
					//cssClass:"connectionPoint outgoing",
					hoverClass: "connectionPoint outgoing",
					connector: ["Flowchart"],
					connectorStyle: {strokeStyle: "rgba(100,100,100,50)", lineWidth: 2},
					// connectorHoverStyle: { strokeStyle:"rgba(100,100,100,100)", outlineWidth: 1, outlineColor:"red"},
					connectorOverlays: [["Arrow", {width: 10, height: 10}]]
				};
				
				for(var i = 0; i < distributions.length; i++) {
					
					var comp = distributions[i].components;
					for(var j = 0; j < comp.length; j++) {
						
						var uid = comp[j].uid;
						
						
						for(var cap_id in comp[j].cap) {
							if(!comp[j].cap.hasOwnProperty(cap_id)) continue;
							
							var capability = comp[j].cap[cap_id];
							var id = null;
							
							// if capability has operation, create incoming endpoint
							if(capability.operation != 'noOperation') {
								
								id = capability.operation + "_" + uid;
								// add endpoint
								_jsPlumb.addEndpoint(id, {uuid: id}, incomingEndpointOptions);
							}
							
							// if capability has event, create outgoing endpoint
							if(capability.event != 'noEvent') {
								
								id = capability.event + "_" + uid;
								// add endpoint
								_jsPlumb.addEndpoint(id, {uuid: id}, outgoingEndpointOptions);
							}
						}
					}
				}
				
				// draw all channels that are there already
				for(var i = 0; i < _channels.length; i++) {
					_jsPlumb.connect({uuids: [_channels[i].event, _channels[i].operation]});
				}
				
			}
			
		}
		
	};
	
})());

Documa.CSRM.directive('capviewComponent', function() {
	return {
		restrict: 'E',
		templateUrl: 'lib/documa/ui/templates/capview_component.html'
	};
});

Documa.CSRM.directive('capviewDevice', function() {
	return {
		restrict: 'E',
		templateUrl: 'lib/documa/ui/templates/capview_device.html'
	};
});


/**
 * Definition of the capview directive.
 */
Documa.CSRM.directive('capView', function($compile) {
	
	var controller = ['$scope', function($scope) {
		
		$scope.cntr = Documa.RuntimeManager.getUIManager().getCapView();
	}];
	
	
	return {
		restrict: 'E',
		templateUrl: 'lib/documa/ui/templates/capview_main.html',
		controller: controller,
		scope: {
			controller: '=',
			rows: '=',
			cols: '='
		},
		
		/**
		 * @param {$rootScope.Scope} scope
		 * @param {jQuery} elem
		 * @param {Object} attr
		 */
		link: function(scope, elem, attr) {
			setTimeout(Documa.RuntimeManager.getUIManager().getCapView().createEndpoints, 150);
			
			/*
			 var view = new Documa.ui.views.capview.CapView($compile);
			 view.setup(scope, elem, attr);
			 */
			// notify parent scope
			scope.$applyAsync(function() {
				scope.controller = controller;
			});
			
			var watch = scope.$watch(function() {
				return elem.children().length;
			}, function() {
				// Wait for templates to render
				scope.$evalAsync(function() {
					// Finally, directives are evaluated
					// and templates are renderer here
					
				});
			});
			
			
		}
	};
});
