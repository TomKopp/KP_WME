Ext.namespace("Documa.ui.views.profview");

Documa.require('Documa.ui.views.BaseView');
Documa.require('Documa.ui.views.MetaView');
Documa.require('Documa.util.Logger');

Documa.ui.views.profview.ProfView = Ext.extend(Documa.ui.views.BaseView, (function() {

    
	/* ****************************************************************************************
	 * private attributes
	 * ****************************************************************************************/
    var TAG = 'Documa.ui.view.profview.ProfView';
	var _log = Documa.util.Logger;
	
	
	
	
	/**
	 * provides BaseView for some methods
	 */
	var _superClass = null;
	
	
	
	/**
	 * contains all properties, events and operations for each component.
	 * gets initialized in constructor with the buildStoreDataJson-method
	 */
	var _storeDataJson = null;

	 /**
	  * contains currently selected connection point
	  */
	var connectionPoint = null;   
	   
	/**
	 * Template for displaying properties, events and operations. 
	 * Includes header and data rows.
	 */
	var _xTemplate = new Ext.XTemplate(
		'<div class="profPanel">',
		'<tpl>',
			'<div class="property-header profRow">',
				'<span>Properties</span>',
			'</div>',
		'</tpl>',
		'<tpl for=".">',
			'<tpl if="type == \'property\'">',
				'<div class="property profRow dataRow" id="{ciid}_{cid}_{name}">',
		        	'<div class="property_name"><div class="connectionPoint incoming tip-right" data-tip="{parameters}"></div>{name}:</div>',
		        	'<div class="property_value"><input type="text" value="{value}"/><div class="connectionPoint outgoing tip-left" data-tip="{parameters}"></div></div>',
		        	'<div class="textarea"></div>',
		        '</div>',
			'</tpl>',	
		'</tpl>',
		
		'<tpl>',
			'<div class="eo-header profRow">',
				'<span>Operations and Events</span>',
			'</div>',
		'</tpl>',
		'<tpl for=".">',
			'<tpl if="type == \'operation\'">',
		        '<div class="operation profRow dataRow" id="{ciid}_{cid}_{name}">{name}',
					'<div class="connectionPoint incoming tip-right" data-tip="{parameters}"></div>',
				'</div>',
			'</tpl>',
			'<tpl if="type == \'event\'">',
		        '<div class="event profRow dataRow" id="{ciid}_{cid}_{name}" callbackOperation="{callbackOperation}">{name}',
					'<div class="connectionPoint outgoing tip-left" data-tip="{parameters}"></div>',
				'</div>',
			'</tpl>',
	    '</tpl>',
		'</div>',{
          compiled:true
        }
	); 
	
	
    
	//***************************************************************************
	//* public members and methods **********************************************
	//***************************************************************************
    
			
	return {
		constructor : function(layoutManager, viewName) {
			
			_componentManager = Documa.RuntimeManager.getComponentManager();
			_uiManager = Documa.RuntimeManager.getUIManager();	
			
            // Reference super class (=baseclass)
            _superClass = Documa.ui.views.profview.ProfView.superclass;
            _superClass.constructor.call(this, layoutManager, viewName);
            
            // manager for connections
            _eventBroker = Documa.RuntimeManager.getEventBroker();
			
            // build json of all property, event, operation data for EXTJs-store
			this.buildStoreDataJson();
            
            
		},
		

		/**
		 * method for getting superclass (here the BaseView)
		 * @returns instance of current BaseView
		 */
		getSuperclass : function(){
			
			return this._superClass;
			
		},
		
		/**
		 * renders menus, panels and scrollbar
		 */
		show : function() {
            _superClass.show.call(this);

			//create component overlay elements with the help of the meta view class
			var metaView = _superClass.getMetaView();
			metaView.createComponentOverlays();
            
            this.showMenu();
			this.renderPanels();
			
		
			jQuery('.profPanel').mCustomScrollbar({
	    		horizontalScroll: false,
	    		mouseWheel: true,
	    		autoHideScrollbar: true,
	    		scrollButtons:{
	    		    enable: false
	    		},
	    		callbacks:{
	    			onScrollStart: function(){_superClass.resetVisualConnections();},
					onScroll: function(){_superClass.drawChannels();},
	    		},
	    	});
			
			// Click listener to show/hide properties. Triggers when clicked on header.
			$('.property-header').click(function(){
				 $(this).nextAll('.property').toggleClass('rowHidden');
				
				 _superClass.updateChannels();
			});
			
			// Click listener to show/hide events and operations. Triggers when clicked on header.
			$('.eo-header').click(function(){
				 $(this).nextAll('.operation').toggleClass('rowHidden');
				 $(this).nextAll('.event').toggleClass('rowHidden');
				
				 _superClass.updateChannels();
			});
			
			_superClass.drawChannels();
		},


		
		/**
		 * calls closeView-method of superclass to let vanish ProfView 
		 */
		closeView: function() {
          _superClass.closeView.call(this);
    	},
		
    	
    	/**
    	 * Extracts necessary data about operations, events and properties and produces json-object.
    	 * The produced JSON-data is used for creating the store for component-data.
    	 */
		buildStoreDataJson: function(){
			_storeDataJson = {};
			
			// Get all ui components from componentManager and create for each component a json abject with all events, operations and properties. 
			// Add this json object to the global json array, which contains all components.
			var containers = _componentManager.getContainers();	
			for (var i = 0; i < containers.length; i++) {
				var cid = containers[i].getComponentID();
				var ciid = containers[i].getComponentInstanceID();
				var properties = _componentManager.getProperties(cid);
				var events = _componentManager.getEvents(cid);
				var operations = _componentManager.getOperations(cid);
				
				var storeDataJson = [];
				
				this.addProperties(cid, ciid, properties, storeDataJson);
				this.addOperations(cid, ciid, operations, storeDataJson);
				this.addEvents(cid, ciid, events, storeDataJson);
				
				_storeDataJson[ciid] = storeDataJson;
			}
			
			/*
			// Get all service components from componentManager and create for each component a json abject with all events, operations and properties. 
			// Add this json object to the global json array, which contains all components.
			var serviceComponents = _componentManager.getServiceComponents();	
			for (var i = 0; i < serviceComponents.length; i++) {
				var ciid = serviceComponents[i].instanceId;
				var cid = _componentManager.getCid(ciid);
				var properties = _componentManager.getProperties(cid);
				var events = _componentManager.getEvents(cid);
				var operations = _componentManager.getOperations(cid);
				
				var storeDataJson = new Array();
				
				this.addProperties(cid, ciid, properties, storeDataJson);
				this.addOperations(cid, ciid, operations, storeDataJson);
				this.addEvents(cid, ciid, events, storeDataJson);
				
				_storeDataJson[ciid] = storeDataJson;
			}
			*/
		},
	
		/**
		 * Get all attributes from properties object and add them to the given json object.
		 * @param cid The component id
		 * @param ciid The component instance id
		 * @param properties The properties of the component
		 * @param storeDataJson The json object where the attributes are added to
		 */
		addProperties: function(cid, ciid, properties, storeDataJson){
			for(var property in properties) {
			    if(properties.hasOwnProperty(property)) {
			    	//filter out title, height and width property
			    	if(property != 'title' && property != 'height' && property != 'width' ){
			    		var parameters = properties[property].type; // properties only have types, no additional parameters
				    	storeDataJson.push({ 
				    		'name' : property,
				    		'value' : properties[property].value,
				    		'type' : 'property',
				    		'propType' : properties[property].type,
				    		'isRequired' : properties[property].isRequired,
				    		'isCollection' : properties[property].isCollection,
				    		'cid' : cid,
				    		'ciid' : ciid,
				    		'parameters' : parameters
				        });
			    	}
			    }
			}
		},
		
		/**
		 * Get all attributes from operations object and add them to the given json object.
		 * @param cid The component id
		 * @param ciid The component instance id
		 * @param operations The operations for the component
		 * @param storeDataJson The json object where the attributes are added to
		 */
		addOperations: function(cid, ciid, operations, storeDataJson){
			for(var operation in operations) {
			    if(operations.hasOwnProperty(operation)) {
			    	// Generate a string with all parameters and types
			    	var parameters = this.getParametersFromJson(operations[operation].parameters); 
			    	
			    	storeDataJson.push({ 
			    		'type' : 'operation',
			    		'name' : operation,
			    		'cid' : cid,
			    		'ciid' : ciid,
			    		'callbackOperation' : operations[operation].callbackOperation,
			    		'parameters' : parameters
			        });
			    }
			}
		},
		
		/**
		 * Get all attributes from events object and add them to the given json object.
		 * @param cid The component id
		 * @param ciid The component instance id
		 * @param events The events for the component
		 * @param storeDataJson  The json object where the attributes are added to
		 */
		addEvents: function(cid, ciid, events, storeDataJson){
			//add events
			for(var event in events) {
			    if(events.hasOwnProperty(event)) {
			    	// Generate a string with all parameters and types
			    	var parameters = this.getParametersFromJson(events[event].parameters);
			    	
			    	storeDataJson.push({ 
			    		'type' : 'event',
			    		'name' : event,
			    		'cid' : cid,
			    		'ciid' : ciid,
			    		'callbackOperation' : events[event].callbackOperation,
			    		'parameters' : parameters
			        });
			    }
			}
		},
		
		/**
    	 * fills store for ExtJS MVC-Model with JSON-data.
    	 * data includes properties, events, operations and id's of component and instance.
    	 * @returns JSONStore store
    	 */
		buildStore: function(ciid){
			var store = new Ext.data.JsonStore({
			    data: _storeDataJson,
			    fields: [
			        'type', 'name', 'cid', 'ciid', 'callbackOperation', 'parameters', 'isRequired', 'isCollection', 'value'
			    ],
			    root: ciid
			});
			return store;
		},
		
		
		/**
		 * renders menu for each component with title and functionality for minimizing, deleting component.
		 * in ProfView additional menu for showing metadata of component.
		 * @returns
		 */
		showMenu: function(){
			
			   var containers = _componentManager.getContainers(); 
			   
			   
			   
			   //creat MetaHead to contain close button of Metainfor
			   
			   jQuery('<div/>')  
	            .attr('id', 'metaHead')  
	            .css({
	            	//'width' : '500px',
	            	'height' : '30px', 
	                //'border': '1px solid #000000',
	                'position' : 'absolute',
	                //'background-color' : 'blue',
	                'opacity' : '0.95',
	                'display' : 'none'
	            }).appendTo('#metaview'); 
			   
			   
			   // close Button
			   jQuery('<a/>')
	        	.click( function() {$('#metadataContent').empty();
	        						$("#metaPopUp").css('display','none');
	        						$("#metaHead").css('display','none'); return; } )
	        	.css({
	        		'position':'relativ',
	            	'width' : '30px',
	            	'height' : '30px', 
	            	'background' : ' url("http://127.0.0.1:8020/CSR_Desktop_Client/res/img/close.png") no-repeat scroll 0 0 transparent',
	            	'float' : ' left',
	            	'cursor' : ' pointer'
	            }).appendTo('#metaHead');	
			   
			   
			   //creates unique metadata popup and adds it to metaView. 
			   //for design: either change css here or use #metaPopUp class in baseview.css			  			 
			 	jQuery('<div/>')  
	            .attr('id', 'metaPopUp')  
	            .css({
	            	//'width' : '500px',
	            	'height' : '250px', 
	                'border': '1px solid #000000',
	                'position' : 'absolute',
	                'background-color' : 'rgba(0, 0, 10, 10)',
	                'opacity' : '0.95',
	                'display' : 'none'
	            }).appendTo('#metaview'); 
	 	
			   jQuery('<div/>').attr('id','metadataContent').appendTo('#metaPopUp');
			   
			   jQuery("[id=metaPopUp]").mCustomScrollbar({
		    		horizontalScroll: false,
		    		mouseWheel: true,
		    		autoHideScrollbar: true,
		    		scrollButtons:{
		    		    enable: false
		    		},
		    		callbacks:{
		    		    onScrollStart: function(){},
		    			onScroll: function(){}
		    		},
		    	});
			   
			   
			   //creating menubar for each component
			   for (var i = 0; i < containers.length; i++) {
				   //gets instance id for each component
			        var ciid = containers[i].getComponentInstanceID();
			        
			        //create button and logic for metadata-popup
			        var metainfButton = document.createElement('div');
			        metainfButton.className = 'iInfo';			       
			        	//logic
				        metainfButton.onclick = function(e){
				        	// getting overlay-id for boundings
				        	var parent_id = e.target.parentNode.id;
				        	var ciid = parent_id.substr(parent_id.indexOf("_")+1);
				        	var cid = _componentManager.getCid(ciid);
				        	var component = document.getElementById('overlay_' +ciid);
				        	
				        	//Postion of Metainfolayer
				        	var xPos = _uiManager.findPosX(component);
				        	var yPos = _uiManager.findPosY(component);
				        	var yNew = yPos - 35; 
				            			        	
				        	//reset content of metadata layer
				        	$('#metadataContent').empty();
				        	$("#metaHead").css('display','none');
				        	$("#metaPopUp").css('display','none');
				        	
				       		        
				        	//filling and repositioning of metadata layer
				            var htmlmetadata = _uiManager.getActiveView().getMetadataAsHTML(cid);
				            jQuery(htmlmetadata).appendTo('#metadataContent');
				            jQuery('#metaHead').css({'display':'inline', 'left' : xPos,'top' : yNew});
				            jQuery('#metaPopUp').css({'display':'inline', 'left' : xPos,'top' : yPos});
				            
				        };
			        if(document.getElementById('overlay_' + ciid) != null){			        	
			         document.getElementById('overlay_' + ciid).appendChild(metainfButton);
			        }
			        
			        
			        
			        
			        //creating button for removing component
			        var closeDiv = document.createElement('div');
			        closeDiv.className = 'cClose';
			        
				        closeDiv.onclick = function(e){	
				        	var msg = 'Are you sure you want to delete the whole component?';
							
							var parent_id = e.target.parentNode.id;
				        	var ciid = parent_id.substr(parent_id.indexOf("_")+1);

							_superClass.showConfirmationDialog.call(this, msg, function(choice){

								if(choice == 'yes'){
									_uiManager.getActiveView().removeComponent(ciid);
									activeView.removeComponent(instanceId);
								}

							});
				        	
				        				        	
				        };
			        if(document.getElementById('overlay_' + ciid) != null){
			        	document.getElementById('overlay_' + ciid).appendChild(closeDiv);
				    }
			        
			        
			        
			       
					//creating button for minimizing component
			        var minDiv = document.createElement('div');
			        minDiv.className = 'cMinimize';
			       
			        minDiv.onclick = function(e){
			        	var overlay = e.target.parentNode; // The overlay for the selected component, including menu, icon and all data
			        	var profRow = $(overlay).find('.profRow'); // All profRow's, including header in data rows
			        	var profPanel = $(overlay).find(".profPanel"); // The content, including all rows
			        	var iconDiv = $(overlay).find(".iconClass"); // The component icon

			        	// If component icon is displayed (component is minimized), show component data and hide icon.
			        	if (iconDiv.css('display') != 'none') {
			        		iconDiv.css('visibility', 'hidden');
			        		iconDiv.css('display', 'none');
							
							profPanel.css('visibility', 'visible');
							profRow.removeClass('rowHidden');
							
							// Reset row height and position
							profRow.css('left', '');
							profRow.css('width', '');
			        	} else { //  Otherwise component is not minimized, hide component data and show icon.
			        		iconDiv.css('visibility', 'visible');
			        		iconDiv.css('display', 'block');
							
							profPanel.css('visibility', 'hidden');
							profRow.addClass('rowHidden');
							
							// Use icon div width to adjust row with. This is needed to let the visual channels point to the icon.
							var width = iconDiv.width();
							profRow.css('left', width / 2 + 'px');
							profRow.css('width', 0 + 'px');
			        	}
						
						_superClass.updateChannels();

			        };
						
			        if(document.getElementById('overlay_' + ciid) != null){
			        	/* Can be used to hide the the component in the background
			        	$(minDiv).bind('click', {ciid: ciid}, function(event) {
			        		_uiManager.getActiveView().minimizeComponent(event.data.ciid);
			        	});
			        	*/
				        document.getElementById('overlay_' + ciid).appendChild(minDiv);
				    }
			        
			        
			       
			        //creating the header
			        var headerDiv = document.createElement('div');
			        headerDiv.className = 'cHeader';			        
			        var _componentContainerList = _componentManager.getContainers();
					var currentComponentID = _componentContainerList[i].getComponentID();
					//componentInfo: 'id', 'name', 'icon' 
					//_componentName = _componentManager.getComponentInfo(currentComponentID).name;
					_componentName = "testigo";

			        headerDiv.innerHTML = _componentName;
			        if(document.getElementById('overlay_' + ciid) != null){
				         document.getElementById('overlay_' + ciid).appendChild(headerDiv);
				    }
				        
		        }
		},
		
		
		/**
		 * Iterates over each ui and service component and calls the method to create the container for each component 
		 */
		renderPanels: function(){
			// ui components
			var store = null;
			var containers = _componentManager.getContainers();
			for (var i = 0; i < containers.length; i++) {
				var ciid = containers[i].getComponentInstanceID();
				store = this.buildStore(ciid);
				
				this.createComponentContainer(ciid, store, 'overlay_');
			}
			
			// servoce components
			/*
			var serviceStore = null;
			var serviceComponents = _componentManager.getServiceComponents();	
			for (var i = 0; i < serviceComponents.length; i++) {
				var ciid = serviceComponents[i].instanceId;		
				serviceStore = this.buildStore(ciid);
				
				this.createComponentContainer(ciid, serviceStore, 'overlay_service-');
			}
			*/
		},
		
		/**
		 * Creates a component container for the given component
		 * @param ciid The component instance id
		 * @param store The store with the events, operations and properties for the current component
		 * @param renderDivId The div id where the container should be rendered in
		 */
		createComponentContainer: function(ciid, store, renderDivId){
			var _this = this;
			
			//checks if component container exists 
			if(document.getElementById(renderDivId + ciid) != null){
				// Create and add component icon to the container, the icon is shown if the component is minimized 
				var iconDiv = document.createElement('div');
				iconDiv.className = "iconClass";
				
				var iconImg = document.createElement('img');
				var icon = _componentManager.getComponentInfo(_componentManager.getCid(ciid)).icon; // Get the component icon url
				iconImg.src = icon;
				
				iconDiv.appendChild(iconImg);
				document.getElementById(renderDivId + ciid).appendChild(iconDiv);
				
				/*
				 * Create an Ext.Container with an Ext.DataView to render the component data.
				 * The DataView gets the data from the given store and is using the defined XTemplate.
				 * The DataView also provides different listener.
				 */
				var panel = new Ext.Container({
				    autoWidth: true,
				    autoHeight: true,
				    layout: 'fit',
				    items: new Ext.DataView({
				        store: store,
				        tpl: _xTemplate,
					    autoWidth: true,
				        autoHeight: true,
				        trackOver: true,
				        itemSelector: '.dataRow',
				        listeners : {
					        click    : function(dataView, index, node, e) {
					        	var record = dataView.getRecord(node);
					        	
					        	// Input field is selected, input fields are used for the property values.
					        	if(e.getTarget('input', 3, true)){
					        		// Add a focusout listener to the selected input field. If the input fiend is losing its focus change  property value in component manager.
					        		$(e.target).bind('focusout', {cid: record.get("cid"), ciid: record.get("ciid"), propName: record.get("name")}, function(event) {
					        			var value = event.currentTarget.value;
					        			var propName = event.data.propName;
					        			var cid = event.data.cid;
					        			var ciid = event.data.ciid;
					        			_this.setPropertyValue(cid, ciid, propName, value);
					        		});
					        		
					        		// Add a keypress listener for the enter key. If enterkey is pressed remove focus from input field, 'focusout' will trigger automatically. 
					        		$(e.target).bind('keypress', {cid: record.get("cid"), ciid: record.get("ciid"), propName: record.get("name")}, function(event) {
					        			if (event.keyCode == 13){ // 13 is equals enter key 
					        				$(this).blur();
						        		}
					        		});
					        	}
					        							        	
					        	//connection point clicked
					        	if(e.getTarget('.connectionPoint', 3, true)){
					            	if(_this.connectionPoint == null){
					            		_this.connectionPoint = {
						        				'ciid' : record.get("ciid"),
						        				'type' : record.get("type"),
						        				'name' : record.get("name")
						        			};
						            	$(e.target).addClass('selected');
						            	_this.connectionPointClicked(record.get("cid"), record.get("type"), record.get("name"));
					            	}else{		
					            		if($(e.target).hasClass('recommended')){
						            		var connectionPoint1 = _this.connectionPoint;
						            		var connectionPoint2 = {
							        				'ciid' : record.get("ciid"),
							        				'type' : record.get("type"),
							        				'name' : record.get("name")
							        			};

						            		$('.connectionPoint.selected').removeClass('selected');
						            		$('.connectionPoint.recommended').removeClass('recommended');
						            		$('.connectionPoint.notRecommended').removeClass('notRecommended').closest('.greyedOut').removeClass('greyedOut');
						            		_this.connectionPoint = null;
						           	        Documa.RuntimeManager.getUIManager().getActiveView().initializeChannelCreation(connectionPoint1, connectionPoint2);
											//_this.initializeChannelCreation(connectionPoint1, connectionPoint2);
					            	
					            		}
					            		if($(e.target).hasClass('selected')){
					            			$('.connectionPoint.selected').removeClass('selected');
						            		$('.connectionPoint.recommended').removeClass('recommended');
						            		$('.connectionPoint.notRecommended').removeClass('notRecommended').closest('.greyedOut').removeClass('greyedOut');
						            		_this.connectionPoint = null;
						            	
					            		}
					            	}
					        	}
					        },
					        mouseenter: function(dataView, index, node, e){
					        	// If the mouse enters a row, check if the data in this row has an callbackOperation. If it has one, highlight this row.
					        	var record = dataView.getRecord(node);
					        	var callbackOperation = record.get('callbackOperation');
					        	if(callbackOperation){						        		
					        		var element = document.getElementById(record.get("ciid") + '_' + record.get("cid") + '_' + callbackOperation);
									$(element).addClass('callbackOperation');
					        	}
					        },
					        mouseleave: function(dataView, index, node, e){
					        	// If mouse is leaving a row, remove highlighting from all row.
					        	$('.callbackOperation').removeClass('callbackOperation');
					        }
					    }
				    }),
				});
				panel.render(renderDivId + ciid);
				
				var overlayHeight = jQuery('#overlay_' + ciid).height();
				var newHeight = overlayHeight;
				jQuery('.profPanel').css({ height: newHeight});
				
				/*var overlayHeight = jQuery('#overlay_' + ciid).height();
				jQuery('#profPanel').height(overlayHeight);*/
			}
		},
		
		
		/**
		 * 
		 * method to handle recommendation after a connection point is clicked.
		 * produces json-data for recommendation-trigger
		 * @param cid component id
		 * @param type of clicked connection point (operation, event, property)
		 * @param name of event/operation/property
		 * 
		 */
		connectionPointClicked: function(cid, type, name){
			
			var cpJson = {
				'cid' : cid,
				'type' : type,
				'name' : name,
				'id' : ''
			};
		
			//calls method from baseview-class
			this.requestRecommendation(cpJson);
			
		},
		
		
		/** 
		 * Call function in component manager to set to new property value.
		 * @param cid The Component id
		 * @param ciid The instance id
		 * @param propName The name of property
		 * @param value The new value of property
		 */
		setPropertyValue: function(cid, ciid, propName, value){
			_componentManager.setPropertyValue(cid, ciid, propName, value);
		},
		
		
		/**
		 * Extracts parameters from json and prepares data for visual representation as tooltip.
		 * 
		 * @param parameters as json
		 * @returns parameters as string with line breaks
		 */
		getParametersFromJson: function(parameters){
			var paramaterString = '';
			
			for(var parameter in parameters) {
			    if(parameters.hasOwnProperty(parameter)) {
			    	// Show types in brackets and a new line after each
			    	paramaterString += parameter + " (" + parameters[parameter].type + ")" + '&#10;';
			    }
		    }
			return paramaterString != '' ? paramaterString : '-';
		},
				
		/**
		 * creates html code for metadata of a component and returns complete code.
		 * @param cid component id
		 * @returns html code as string
		 */
		getMetadataAsHTML: function(cid){
			//metadata as json
			var metadata = _componentManager.getMetadata(cid);
			componentName = _componentManager.getComponentInfo(cid).name;
			var htmlcode ="<h3>"+componentName+"</h3>" +this.createHTML(metadata);
			
			return htmlcode;
			
		},
		/**
		 * is a utility method for the "getMetadataAsHTML"-function. it is used recursive and adds html-code to each element in the json-data.
		 * it creates a nested list.
		 * @param json
		 * @returns incomplete html code as string
		 */
		createHTML: function(json){		

			console.log(json);
			
			var htmlcode = '<ul class="metadata-ul">';
			
			
			 if(json.documentation == 'screenshot'){
			     var image = json.url;
			     htmlcode+='<img src="' +image+ '" width="50%"  height ="50%"/>';
			    }
			 
			 if(json.documentation == 'icon'){
			     var image = json.url;
			     htmlcode+='<img src="' +image+ '" width="100px"  height="100px"/>';
			    }
			 
			 if(json.email){
					var email = json.email;
					var name = json.name;
					console.log(email);
					htmlcode+= '<a href="mailto:'+email+'">Email an '+name+'</a>';
					//<a href="mailto:your@email.address">Contact</a>; 
				}
			 
			 if(json.webURL){
				 var link = json.webURL;
				 var name = json.name;
				 htmlcode+='<p><a href="'+link+'">Info ueber '+name+'</a></p>';
			 }
			
			
			for(var key in json){

				htmlcode+='<li class="metadata-li">'+key+': ';		

				
				if(typeof json[key]==='object'){ 
				
					htmlcode+=this.createHTML(json[key]);
					
				}else{
						
					htmlcode+=json[key];	

					 
					} 
				
				
		
			htmlcode+='</li>';
			}
			htmlcode+='</ul>';
			return htmlcode;
			
			 
		},
		
		
		/**
		 * gets called by baseview class after event-trigger of a recommendation.
		 * handles recommendation for the ProfView by highlighting recommended events/operations/properties.
		 * @param jsonData of the recommendation
		 */
		handleRecommendation : function(jsonData){
			
			// first changing each connectionpoint status to "not recommended"
			if(this.connectionPoint!=null){
			jQuery('.connectionPoint').addClass('notRecommended').closest('.dataRow').addClass('greyedOut');			
			
			
			//for each recommendation highlight its connection point by changing css class
			for(var key=0;key<jsonData.length;key++)
			{
				
				var children = jQuery('[id$="'+jsonData[key].cid+'_'+jsonData[key].name+'"]').children('.notRecommended');
				children.removeClass('notRecommended');
				children.addClass('recommended');
				children.closest('.dataRow').removeClass('greyedOut');
			
			}
			
			jQuery('.connectionPoint.selected').closest('.greyedOut').removeClass('greyedOut');
			}
			
		},
		
		
		/**
		 * this method is used for drawing lines, which represent channels/links between connection points.
		 * 
		 * @param componentInstanceID
		 * @param attributeName
		 * @param connectionPointType
		 * @returns connectionpoint html-element of an event, operation or property
		 */
		getConnectionPoint: function ( componentInstanceID, attributeName, connectionPointType ){
			var cid = _componentManager.getCid(componentInstanceID);
			var row = document.getElementById(componentInstanceID + '_' + cid + '_' + attributeName);
			var connPoint = $(row).get(0);
			return connPoint;
	    },
		
		
	};
	
	
})());
