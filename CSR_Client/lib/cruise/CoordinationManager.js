/**
 * @author Remo Porschatis
 * @class Ext.cruise.client.CoordinationManager
 *
 *	This class handles the creation and manipulation of Coordination and Communications-Relationships between components through the user at runtime 
 * 
 */
Ext.cruise.client.CoordinationManager = Ext.extend(Object, {
	eventBroker: null,
	log: null,
	
	titlesChecked: false,
	coordProperties: null, 	//Array of all coordination-properties as coordProperties[componentID][Array of Properties of that component]
	/*
	 * 	coordProperties
	 * 		CID1
	 * 			Array of Objects{
	 * 			- ctitle					-- Component-Title
	 * 			- cid						-- Component-ID
	 * 			- propName					-- Property-Name	
	 * 			- type						-- Property-Ontology-Type
	 * 			- synchronizationPurpose	-- data | filter | visual	
	 * 			- interactionState        	-- direct | indirect
	 * 			- label						-- Userfriendly Label for the Property
	 * 			- changeEvent				-- Name of the Event that is fired when the property changes
	 * 			}
	 * 		CID2
	 * 			...
	 */
	
	coordComps: null,			//Array of all components who have coordination-properties 
	paper : null,		// raphael canvas for ui->ui Metavis
	paperService: null, // raphael canvas for ui->service Metavis
	store:null,
	recPropStore:null,
	
	coordinatedChannels: null, // Array of Property-based channels as coordinatedChannels[channelname][array of properties as {propName,cid}]
	coordDialogOpen: false,
	posReceivingComps: [], // Array der mit passenden KOmponenten gefüllt wird, wenn auf den ersten koordinationknops gedrückt wird
	sendingComponent : null,// sendende Komponente bei der erstellung einer Koordination
	sendingProp: null,
	receivingComponent: null, //empfangende Komponente in Coordination  
	receivingProp: null,
	type: null,
	bidirectional: false,
	//Arrays in denen die Auswahl zwischengespeichert wird
	coordPropStore: null,
	availablePropStore: null,
	showSignatures: false,
	
	gridAddTmp : [],
	gridDeleteTmp : [],
	 
	 
	 /**
	 * Constructor of the Coordination Manager
	 * @param {Object} eventBroker an instance of the event broker
	 * @param {Object} logger an instance of the logger 
	 * @constructor
	 */
	constructor: function(eventBroker, log){
		/* set up internal arrays */
		//this.eventBroker = applicationManagerInstance.getEventBroker();
		this.eventBroker = eventBroker;
		
		this.log = log;
		Ext.cruise.client.CoordinationManager.superclass.constructor.call(this);
		this.log.debug('[CoordMan] CoordinationManager started.');
		this.coordinatedChannels = new Array();
		
		//create Keymap for keyboard-shortcuts
				
//				var map = new Ext.KeyMap(Ext.getDoc(), {
//					key: 'ms',
//					shift: true,
//					handler: function(k, e) {
//	                	if (applicationManagerInstance.getHomeScreen().isVisible()) return;
//						switch(k) {
//							case 77:
//								var mv = Ext.getCmp('mainMenuMetaVisUI');
//								if(mv.checked){
//									mv.setChecked(false);
//								}
//								else{
//									mv.setChecked(true);
//								}
//								break;
//							case 83:
//								var mv = Ext.getCmp('mainMenuMetaVisService');
//								if(mv.checked){
//									mv.setChecked(false);
//								}
//								else{
//									mv.setChecked(true);
//								}
//								break;
//						}
//						//console.log(k);
//					}
//				});
	},
	
	setShowSignatures: function(status){
		var changed= this.showSignatures!= status;
		this.showSignatures= status;
		if (changed){
			if (this.paper!=null){
				this._removeMetaVisUI();
				this._metaVisUI();
			}
			if (this.paperService!=null){
				this._removeMetaVisService();
				this._metaVisService();
			}
		}
	},
	
	/**
	 * Helperfunction that is needed when the title of a component is only available in the mcdl and not in the ccm
	 * therefore the processCCM can not find the title, so they are retrieved from the componentManager
	 * 
	 *  @private
	 * 
	 */
	__gatherComponentTitles: function(){
		for(var cname in this.coordComps){
				
				if(typeof(this.coordComps[cname])=='object'){
					if(this.coordComps[cname].title == null){
						var title = applicationManagerInstance.getComponentManager().getComponentInstance(cname).getProperty('title');
						this.coordComps[cname].title = title;
					
					
						for(var j = 0; j < this.coordProperties[cname].length;j++){
							this.coordProperties[cname][j]['ctitle'] = title;	
						}
					}	
				}
			}
			this.titlesChecked = true;
	},
	
	/**
	 * Helperfunction that returns the eventname for a given Property-Component-combination
	 * 
	 * @param {String} cid the componenent id
	 * @param {String} propName the Property-Name 
	 *  @private
	 * @return {String} Eventname  
	 */
	_getEventNameForProperty:function(cid, propName){
		var props = this.coordProperties[cid];
		
		for(var i = 0; i < props.length; i++){
			if(props[i]['propName'] == propName){
				return props[i]['changeEvent'];
			}
		}
		
	},
	
	/**
	 * Helperfunction that checks if two Properties are already connected
	 * 
	 * @param {String} propName1 the Property-Name of the first Property
	 * @param {String} cid1 the componenent id od the first Component
	 * @param {String} propName2 the Property-Name of the second Property
	 * @param {String} cid2 the componenent id of the second Componenent
	 * @private
	 * @return {Boolean} True if connected  
	 */
	_isCoordinated:function(propName1,cid1,propName2,cid2){
		var result = false;
		for(var cname in this.coordinatedChannels){
			
			var coordination = this.coordinatedChannels[cname];
			if(typeof(coordination)=='object'){
				var p1,p2 = false;
				for(var i = 0; i< coordination.length;i++){
					if(coordination[i]['cid']==cid1 && coordination[i]['propName'] == propName1){
						p1 = true;
					}
					if(coordination[i]['cid']==cid2 && coordination[i]['propName'] == propName2){
						p2 = true;
					}
				}
				if(p1 && p2){
					result = true;
					break;
				}	
			}
		}
		return result;
	},
	
	/**
	 * Helperfunction that checks if a Property is already involved in a coordination
	 * 
	 * @param {String} cid the componenent id
	 * @param {String} propName the Property-Name 
	 * @private
	 * @return {Boolean} True if involved  
	 */
	_isCoordinatedProp: function(propName,cid){
		var result = false;
		for(cname in this.coordinatedChannels){
			var coordination = this.coordinatedChannels[cname];
			if(typeof(coordination)=='object'){
				for(var i = 0; i< coordination.length;i++){
					if(coordination[i]['propName'] == propName && coordination[i]['cid'] == cid){
						result = true;
						break;
					}
				}		
			}
		}
		return result;
		
	},
	
	/**
	 * Helperfunction to validate, if two properties could be connected bases on their synchronizationPurpose and interactionState
	 * @private
	 * @param {String} syncPurpose1 the synchronizationPurpose of the first Property
	 * @param {String} interactionState1 the interactionState of the first Property 
	 * @param {String} syncPurpose2 the synchronizationPurpose of the second Property
	 * @param {String} interactionState2 the interactionState of the second Property
	 * 
	 * 
	 * @return {Boolean} True if connectable  
	 */
	_matchingProperty : function(syncPurpose1,interactionState1,syncPurpose2,interactionState2){
		if(syncPurpose1=='data' && syncPurpose2 == 'filter'){
			return true;
			
		}
		
		if(syncPurpose1=='filter' && syncPurpose2 == 'filter'){
			if(interactionState1 == 'direct'){
				return true;
			}
		}
		
		if(syncPurpose1=='visual' && syncPurpose2 == 'visual'){
			if(interactionState1 == 'direct'){
				return true;
			}
		}
		
		return false;
	},
	
	
	/**
	 * Is called from the Application Manager and analyses the compositionmodel for coordination-Properties 
	 * 
	 * @param {Object} ccm the composition-model 
	 * 
	 */
	processCCM: function(ccm){
		this.coordComps = new Array();
		this.coordProperties = new Array();
		
		var components= ccm.getElementsByTagName("component");
		
		// iterating over all components to find their properties
		for(var i = 0; i<components.length;i++){
			var isCoord = false;
			
			var title = null;
			var cid = null;
			
			var comp = components[i];
			//Filtering only UI-Components
			if(comp.getAttribute('xsi:type').indexOf('UIComponent')!= -1){
				cid = comp.getAttribute('id');
				
				var props = comp.getElementsByTagName('property');
				
				//Checking all Properties of the UI-Component
				for(var j = 0; j<props.length;j++){
					var prop = props[j];
					if(prop.getAttribute('type')=='http://inf.tu-dresden.de/cruise/mcdl.owl#hasTitle'){
						title = prop.getAttribute('value');
					}
					var synchronizationPurpose = prop.getAttribute('synchronizationPurpose');
					
					//If the synchronizationPurpose-Attribute is set, the property is saved
					if(synchronizationPurpose!=null){
						var propName = prop.getAttribute('name');
						var type = prop.getAttribute('type');
						var interactionState = prop.getAttribute('interactionState');
						var label = prop.getAttribute('label');
						var changeEvent = prop.getAttribute('changeEvent');
						
						if(changeEvent){
							
							var cm = applicationManagerInstance.getComponentManager()
							
							
							var _tmpArr = cm.getComponentParamName(changeEvent, 'event', comp);
							changeEvent = _tmpArr[0];
							
						}else{
							changeEvent = propName+'Changed';
						}
						
						this.log.info('[CoordMan] Adding to coordPropierties: ' + propName + ' ' + ' ' + type + ' ' + synchronizationPurpose + ' ' + cid + ' ' + interactionState + ' ' + label);
						
						//this.coordProperties.push({cid:cid, ctitle: title, propName:propName, type:type, synchronizationPurpose:synchronizationPurpose, interactionState: interactionState, label:label});
						
						if(this.coordProperties[cid]==undefined){
							this.coordProperties[cid] = [];
						}
						this.coordProperties[cid].push({ctitle: title,cid:cid, propName:propName, type:type, synchronizationPurpose:synchronizationPurpose, interactionState: interactionState, label:label, changeEvent: changeEvent})
						
						isCoord = true;
					}
					
					if(isCoord){
						var exists = false;
						
						if(this.coordComps[cid] != undefined){
								exists = true;
								//console.log('schon vorhanden..');
						}
						
						if(!exists){
							var c = new Object();
							c['title']=title;
							
							this.coordComps[cid] = c;
						}
					}						
				}
			}	
		}
	},
	
	/**
	 * Is called after the user pressed the first coordination-Button, finds all matching components and highlights them
	 * @private 
	 *   
	 */
	_initCoordination : function(e, toolEl, panel, tc){
		//saving sending component-ID
		this.sendingComponent = tc["cid"];
		
		//finding all Properties of the sending component
		var _sendingProps = [];
		
		for(var i = 0; i<this.coordProperties[tc["cid"]].length;i++){
			_sendingProps.push({type:this.coordProperties[tc["cid"]][i]['type'], synchronizationPurpose: this.coordProperties[tc["cid"]][i]['synchronizationPurpose'], interactionState:this.coordProperties[tc["cid"]][i]['interactionState']});
		}
		
		// Find all Propeties from all other componentens which could be connected to the sending Properties and save those components, so they can be highlighted
		
		for(var cname in this.coordProperties){
			//check only propertys from different components
			if(cname != this.sendingComponent){
				var props = this.coordProperties[cname] 
				if(typeof(props)!='object'){
					continue;
				}
				
				//check all properties from the sender against all other properties
				for(var j = 0; j < props.length; j++){
					for(var k = 0; k<_sendingProps.length;k++){
						
						//check if same ontology-type
						if(_sendingProps[k]['type']== props[j]['type']){
							
							//check if one of the allowed combinations data->filter, filter->filter, visual->visual
							if(this._matchingProperty(_sendingProps[k]['synchronizationPurpose'],_sendingProps[k]['interactionState'],props[j]['synchronizationPurpose'],props[j]['interactionState'])){
								if(this.posReceivingComps.indexOf(cname)==-1){
									this.posReceivingComps.push(cname);
								}	
							}
						}
					}	
				}
			}
		}
			
		
		//Highlighting possible receiving components
		
		cm = applicationManagerInstance.getComponentManager();
		
		//Hide coordination-buttons
		for(var cname in this.coordProperties){
			var comp = cm.components[cname];
			if(comp){
				var tool = 	comp['adapt'].getTool('right');
				if (tool){
					tool.hide();
				}
			}
		}
		
		for(var i = 0; i< this.posReceivingComps.length; i++){
			var comp = cm.components[this.posReceivingComps[i]];	
			if(comp){
				this._colorHeader(this.posReceivingComps[i],'#FF0000');
			
				var tool2 = comp['adapt'].getTool('left');
				if(tool2){
					tool2.show();
				}else{
					comp['adapt'].addTool({
						//id: "coord_tool_down",
		    			id:'left',
		    			handler: this.__coord,
		    			scope: this,
		    			qtip: 'Click here to establish a connection',
		    			cid: this.posReceivingComps[i]
					});	
				}	
			}
		}
		// add a button to cancel the coordination-process 
		
		var sc = cm.components[tc["cid"]];
		//TODO
		var tool = sc['adapt'].getTool('minus');
		
		if(tool){
			tool.show();
		}else{
			sc['adapt'].addTool({
				//id: "coord_tool_cancel",
				id : 'minus', 
	    		handler: this.__clearHeader,
	    		scope: this,
	    		qtip: 'Cancel current Coordinationprocess',
	    		cid: tc["cid"]
			});
		}
		
		var tool2 = 	sc['adapt'].getTool('right');
			if (tool2){
				tool2.hide();
		} 
	},

	/**
	 * Is called after the user pressed the second coordination-Button
	 * Finds all matching Properties between the two componenents and draws the coordination-dialog
	 * 
	 * @private
	 */
	__coord: function(event, toolEl , panel , tc){
		if(this.coordDialogOpen){
			return;
		}
		
		if(!this.titlesChecked){
			this.__gatherComponentTitles();
		}
		
		this.coordDialogOpen = true;
		cm = applicationManagerInstance.getComponentManager();
		this.receivingComponent = tc['cid'];
		var _sendingProps = [];
		
		//find matching properties of the two components
		var sendingComponentProperties = [];
		var posReceivingProps = [];
		
		//fetching all possible receiving properties
		for(var i = 0; i<this.coordProperties[this.receivingComponent].length;i++){
			var prop = this.coordProperties[this.receivingComponent][i];
			
			if(prop['synchronizationPurpose'] == 'filter' || prop['synchronizationPurpose'] == 'visual'){
				posReceivingProps.push(prop);
			}
		}
		
		this.store = new Ext.data.ArrayStore({
			    fields: ['propName', 'cid', 'type','interactionState','synchronizationPurpose','label'],
			    data : []
		});
		
		this.recPropStore = new Ext.data.ArrayStore({
			    fields: ['propName','cid', 'synchronizationPurpose', 'label']
		});
		
		//matching sending properties with receiving ones
		for(var i = 0;i<this.coordProperties[this.sendingComponent].length;i++){
			var sender = this.coordProperties[this.sendingComponent][i];
			
			for(var j = 0; j<posReceivingProps.length;j++){
				var receiver = posReceivingProps[j];
			
				if(sender['type'] == receiver['type']){
					if(this._matchingProperty(sender['synchronizationPurpose'], sender['interactionState'], receiver['synchronizationPurpose'], receiver['interactionState'])){
						
						var label = sender['label'];
						if(!label) 
							label = sender['propName']
							
						_sendingProps.push([sender['propName'],
										sender["cid"],
										sender['type'],
										sender['interactionState'],
										sender['synchronizationPurpose'],
										label
										]);
					}		
				}
			}
		}
		
		this.store.loadData(_sendingProps);
		
		//drawing the UI
		
		//Gridpanel for sending properties
		var grid = new Ext.grid.GridPanel({
				scope: this,
				border:false,
			    store:this.store,
			    colModel: new Ext.grid.ColumnModel({
			        defaults: {
			            width: 130,
			            sortable: false
			        },
			        columns: [
			            {id: 'prop', header: 'Property', width: 130,  dataIndex: 'label'},
			            {header: 'Type', width: 130,  sortable:true, dataIndex: 'synchronizationPurpose'},
			        ]
			    }),
			    viewConfig: {
			        forceFit: true,
			
			    },
			    sm: new Ext.grid.RowSelectionModel({singleSelect:true, scope:this}),
			    //add orange backrgound-color to rows with properties, which are already involved in some coordination 
			    view:new Ext.grid.GridView({
			    	forceFit:true,
			    	scope: this,
			    	enableRowBody:true,
			    	getRowClass: function(record, rowIndex, rp, ds){
				    	if(this.scope._isCoordinatedProp(record['data']['propName'], record['data']['cid'])){
							return 'x-grid3-row orange-row';
						}
				    },	
			    }),
			    
			    width: 300,
			    height: 300,
			    frame: false,
			    iconCls: 'icon-grid'
		});
		
		//if a sending Property is selected, the receiving propertys are updated so that only matching properties are shown
		grid.getSelectionModel().on('rowselect', function(sm, index, record) {
				var type =record.data['type'];
				var cid = record.data['cid'];
				var interactionState = record.data['interactionState'];
				var posRecProps = [];
				this.scope.sendingProp = record.data['propName'];
				this.scope.type = record.data['type'];
				
				for(var i = 0; i<this.scope.coordProperties[this.scope.receivingComponent].length;i++){
					var prop = this.scope.coordProperties[this.scope.receivingComponent][i];
					if(prop['type'] == type){
						if(!(interactionState=='indirect' && prop['interactionState'] == 'direct')){
							//console.log('adding prop: ' + prop['propName']);
							
							var label = prop['label'];
							if(!label)
								label = prop['propName']	
							
							posRecProps.push([prop['propName'],prop['cid'],prop['synchronizationPurpose'],label]);
						}
					}
				}
					
				this.scope.recPropStore.loadData(posRecProps);
        });
		
		//Gridpanel for receiving properties
		var grid2 = new Ext.grid.GridPanel({
				scope: this,
				border:false,
			    store:this.recPropStore,
			    colModel: new Ext.grid.ColumnModel({
			        defaults: {
			            width: 120,
			            sortable: false
			        },
			        columns: [
			            {id: 'Property', header: 'Property', width: 130,  dataIndex: 'label'},
			            {header: 'Type', width: 130,  sortable:true, dataIndex: 'synchronizationPurpose'},
			        ]
			    }),
			    viewConfig: {
			        forceFit: true,
			
			    },
			    sm: new Ext.grid.RowSelectionModel({singleSelect:true, scope:this}),
			    //add orange backrgound-color to rows with properties, which are already involved in some coordination 
			    view:new Ext.grid.GridView({
			    	forceFit:true,
			    	scope: this,
			    	enableRowBody:true,
			    	getRowClass: function(record, rowIndex, rp, ds){
				    	if(this.scope._isCoordinatedProp(record['data']['propName'], record['data']['cid'])){
							return 'x-grid3-row orange-row';
						}
				    },	
			    }),
			    width: 300,
			    height: 300,
			    frame: false,
			    iconCls: 'icon-grid'
		});
		
		//if the receiving property is selected, both the sending and the receiving property are known
		//so it can be checked, if those two are already connected and/or if a bidirectional channel is possible
		grid2.getSelectionModel().on('rowselect', function(sm, index, record){
			this.scope.receivingProp = record.data['propName'];
			var prop1 = null;
			var prop2 = null;
			
			//getting the two properties based on their names and cid
			for(var i = 0;i<this.scope.coordProperties[this.scope.sendingComponent].length;i++){
				var prop = this.scope.coordProperties[this.scope.sendingComponent][i];
				if(prop['propName'] == this.scope.sendingProp){
					prop1 =  prop;
				}
			}
			
			for(var i = 0;i<this.scope.coordProperties[this.scope.receivingComponent].length;i++){
				var prop = this.scope.coordProperties[this.scope.receivingComponent][i];
				if(prop['propName'] == this.scope.receivingProp){
					prop2 =  prop;
				}
			}
			
			//checking if a bidirectional channel is possible (only by direct filter->filter or direct visual -> vidual)
			if(prop1['interactionState'] == 'direct' && prop2['interactionState'] == 'direct' && prop1['synchronizationPurpose'] == prop2['synchronizationPurpose'] ){
				if(prop1['synchronizationPurpose'] == 'filter' || prop1['synchronizationPurpose'] == 'visual'){
					//console.log('Bidi true');
					var cb = Ext.getCmp('cbBidirectional');
					cb.setDisabled(false);	
				}else{
					//bidirectional == false
					var cb = Ext.getCmp('cbBidirectional');
					cb.setDisabled(true);
					this.scope.bidirectional = false;
				}
			}else{
				//bidirectional == false
				var cb = Ext.getCmp('cbBidirectional');
				cb.setDisabled(true);
				this.scope.bidirectional = false;
			}
			
			//disable create button if the two properties are already connected
			
			if(this.scope._isCoordinated(this.scope.sendingProp,this.scope.sendingComponent,this.scope.receivingProp,this.scope.receivingComponent)){
				Ext.getCmp('coordinationCreateButton').disable();
				Ext.getCmp('coodinationAlreadyConnectedLabel').show();
			}
			else{
				Ext.getCmp('coordinationCreateButton').enable();
				Ext.getCmp('coodinationAlreadyConnectedLabel').hide();
			}
		});
		
			var leftpanel = new Ext.Panel({
	            title: 'Sending Component: ' + this.coordComps[this.sendingComponent].title,
	            scope: this,
	            split: true,
	            width: 300,
	            height: 300,
	            x:0,
	            y:0,
	            items: [grid],
	            margins:'3 0 3 3',
	            cmargins:'3 3 3 3'
	        }); 

			var rightpanel = new Ext.Panel({
	            title: 'Receiving Component: ' + this.coordComps[tc['cid']].title,
	            scope: this,
	            split: true,
	            width: 300,
	            height: 300,
	            x:300,
	            y:0,
	            items:[grid2],
	            margins:'3 0 3 3',
	            cmargins:'3 3 3 3'
	        });

			var tb = new Ext.Toolbar({
				id : 'toolbar_coordialog'
				
			});
			
			//Checkbox for creating a bidirectional Channel
			var cbBidirectional =new Ext.form.Checkbox({
                    scope: this,
                    id:	'cbBidirectional',
                    disabled: true,
                    boxLabel: 'Bidirectional',
                    x:5,
                    y:310,
                    handler: function (item,status){
                    	if(status){
                    		this.bidirectional = true;
                    	}else{
                    		this.bidirectional = false;
                    	}
                    }
         	});
         	
			//Adding Create-Button to bottomBar
			tb.add({
				    xtype: 'button',
                    scope: this,
                    text: 'Create',
                    id: 'coordinationCreateButton',
                    disabled: true,
                    handler: function (){
						if(this.sendingComponent == null || this.sendingProp == null || this.receivingProp == null || this.receivingComponent == null){
	        				this.log.error('Couldnt establish coordination because some information are missing.');
	        			}else{
	        				//establishing the connection between the two properties
	        				
	        				
		        			var sendingEventName = this._getEventNameForProperty(this.sendingComponent, this.sendingProp)
		        			
		        			
		        			var channelName = this.sendingComponent+'_'+this.sendingProp+'_'+this.receivingComponent+'_'+this.receivingProp+'_Channel';
		        			
		        			if(this._isCoordinated(this.sendingProp,this.sendingComponent,this.receivingProp,this.receivingComponent)){
		        				Ext.Msg.alert('Error', 'These Properties are already connected.');
		        				this.log.error('Properties bereits verbunden');
		        				
		        			}else{
		        				//creating the channel
		        				var cm = applicationManagerInstance.getComponentManager();
		        				var channelParams = [];
			        			
			        			channelParams.push(this.type);
			        			this.eventBroker.addChannel(channelName,channelParams,false,undefined);
			        			
			        			
			        			//adding the properties
			        			if(this.bidirectional){
			        				cm.addPublisher(this.sendingComponent,channelName, sendingEventName);
									cm.addSubscriber(this.receivingComponent,channelName,{opName:'setProperty',propName:this.receivingProp});
									
									cm.addPublisher(this.receivingComponent,channelName, this._getEventNameForProperty(this.receivingComponent, this.receivingProp));
									cm.addSubscriber(this.sendingComponent,channelName,{opName:'setProperty',propName:this.sendingProp});
									this.eventBroker.channels[channelName]['isBidirectional'] = true;
									this.log.debug('[CoordMan] created bidirectional Channel ' + channelName);
			        				
			        			}else{
			        				
				        			cm.addPublisher(this.sendingComponent,channelName, sendingEventName);
									cm.addSubscriber(this.receivingComponent,channelName,{opName:'setProperty',propName:this.receivingProp});	
									this.eventBroker.channels[channelName]['isBidirectional'] = false;
			        				this.log.debug('[CoordMan] created unidirectional Channel ' + channelName);
			        			}
			        			
								// saving coordination and involved props
								var involvedPropsArray = [];
								involvedPropsArray.push({propName:this.sendingProp,cid:this.sendingComponent});
								involvedPropsArray.push({propName:this.receivingProp,cid:this.receivingComponent});
								
								this.coordinatedChannels[channelName] = involvedPropsArray;
								
								//Show a confirmation, that the coordinations was successfully created
								Ext.Msg.show({
								   title:'Status',
								   msg: 'Coordination successfully created.',
								   //buttons: Ext.Msg.YESNO,
								   buttons :{ 
							                ok: "OK",							                
							                cancel: "OK & Close",
							                
							       },
							       fn : function(choice){
							       		if(choice == 'cancel'){
							       			coordWin = Ext.getCmp('coordinationManagerCreate').close();
							       		}
							       		
							       },
								   animEl: 'elId',
								   
								});
		        			}
		    			}
                    }
            });
            
            tb.add({
				        	id: 'coodinationAlreadyConnectedLabel',
				        	html: '<span><i>Properties are already connected!</i></span>',
				        	xtype: 'label',
				        	hidden: true
				        }
            );

			var win = new Ext.Window({
                title:'Coordination Dialog',
                id : 'coordinationManagerCreate',
                width       : 610,
                height      : 400,
                plain       : true,
                layout		: 'absolute',
                items		: [leftpanel, rightpanel,cbBidirectional],
                scope		: this,
                bbar		: tb,
                listeners: {
                	scope : this,
                	'beforeclose':function(){
                		this.coordDialogOpen = false;	
                		this.__clearHeader();	
                	}
                }
            });
            	
            win.show();		
	},
	
	/**
	 * Helperfunction to change the font-color of a Component-Header 
	 * 
	 * @param {String} cid the component ID
	 * @param {String} hexcolor Color , for example '#ff0000' 
	 * @private
	 */
	_colorHeader : function(cid,hexcolor){
		var panel = applicationManagerInstance.getComponentManager().getAdaptabilityPanel(cid);
		if (panel != undefined && panel != null && panel.header!= undefined&& panel.header!=null) {
        	panel.header.animate(
        		       {color: { to: hexcolor }
        		          },
					   0.35,      // animation duration
					   null,      // callback
					   'easeOut', // easing method
					   'color'    // animation type ('run','color','motion','scroll')
                );
		}
	},
	
	/**
	 *
	 * Resets all Variables that are used to create a coordination and returns the header of each component back to normal (removing coord-tool-button etc)
	 * @private 
	 * 
	 */
	__clearHeader : function(){
		var cm = applicationManagerInstance.getComponentManager();
		
		//show coordination-buttons
		for(var cname in this.coordProperties){
			var comp = cm.components[cname];
			if(comp){
				var tool = 	comp['adapt'].getTool('right');
				if (tool){
					tool.show();
				}
			}
		}
		
		//change header-color to normal blue
		for(var i =0;i<this.posReceivingComps.length;i++){
			var comp = cm.components[this.posReceivingComps[i]];
			if(comp){
				this._colorHeader(this.posReceivingComps[i],'#15428b');

				var tool2 = comp['adapt'].getTool('left');
				if(tool2){
					tool2.hide();
				}	
			}
		}
		
		var sender = cm.components[this.sendingComponent];
		if(sender){
			var tool = 	sender['adapt'].getTool('right');
			if (tool){
				tool.show();
			}
			var tool2 = sender['adapt'].getTool('minus');
				if(tool2){
					tool2.hide();
			}	
		}
		
		this.store = [];
		this.recPropStore = [];
		
		this.posReceivingComps = []; // Array der mit passenden KOmponenten gefüllt wird, wenn auf den ersten koordinationknops gedrückt wird
		this.sendingComponent = null;// sendende Komponente bei der erstellung einer Koordination
		this.sendingProp = null;
		this.receivingComponent = null; //empfangende Komponente in Coordination  
		this.receivingProp = null;
	},
	
	/** 
	 * Closes the Service->UI-Metavisualization
	 */
	_removeMetaVisService : function(){
		//Bug in Raphael, remove-function works but generates an error 
		try{
			this.paperService.remove();	
		}catch(err){}
		
		this.paperServie=null;
		document.getElementsByTagName('html')[0].className += ' x-viewport';
	},
	
	/** 
	 * Closes the UI->UI-Metavisualization
	 */
	_removeMetaVisUI: function(){
		//Bug in Raphael, remove-function works but generates an error 
		try{
			this.paper.remove();	
		}catch(err){}
		this.paper=null;
		document.getElementsByTagName('html')[0].className += ' x-viewport';
		document.body.style.overflow = 'auto';
	},
	
	/** 
	 * Realises the Service-UI-Metavisualization based on a Raphael-Canvas and the current channels
	 */
	_metaVisService : function(){
		var uiChannels = []; //all non system-channels
		var metaChannels = []; //ui->service channels 
		var channels = this.eventBroker.channels;
		var serviceComponents = [];
		var participatingComps = []; 
		
		var lm = applicationManagerInstance.layoutManager;
		var appBounds = []; 
		appBounds['width'] = lm.root.size['width'];
		appBounds['height'] = lm.root.size['height'];
		
		//gathering non-system-channels	
		for(cname in channels){
			var channel = channels[cname];
			
			if(!channel['isSystemChannel']){
				uiChannels.push(channel);
			}
		}
		
		//gathering ui->service-channels
		for(var i=0;i<uiChannels.length;i++){
			//fetching all components
			var channelComponents = [];
			
			var events = uiChannels[i].events;
			var listeners = uiChannels[i].listeners;
			
			for(var j = 0; j<events.length; j++){
				var e= events[j];
				if(channelComponents.indexOf(e['cid']) == -1){
					channelComponents.push(e['cid'])
				}				
			}
			
			for(var j = 0; j<listeners.length; j++){
				var l= listeners[j];
				if(channelComponents.indexOf(l['cid']) == -1){
					channelComponents.push(l['cid'])
				}
			}
			
			//check that there is at least one ui and one service-component involved in the channel 
			var uic = false;
			var service = false;
			var cm = applicationManagerInstance.getComponentManager();
			for(var j = 0; j<channelComponents.length;j++){
				var c = cm.components[channelComponents[j]];
				
				if(!c['isUIC']){
					service = true;
					serviceComponents[c.id]=c;
				}else{
					uic = true
					participatingComps[c.id] = c;
				}
			}
			
			if(uic && service && channelComponents.length>1){
				metaChannels.push(uiChannels[i]);
				
				for(var j = 0; j<channelComponents.length;j++){
					participatingComps.push(channelComponents[j]);
				}
			}
		}
		
		//drawing service-components below the application and saving their coordinates
		
		//fix some css-classes from ext so that the raphael-canvas has a absolute and not a fixed position					
		document.getElementsByTagName('html')[0].className = document.getElementsByTagName('html')[0].className.replace( /(?:^|\s)x-viewport(?!\S)/ , '' );
		document.body.style.overflow = 'visible';
		
		this.paperService = new Raphael(0,40,appBounds['width'],appBounds['height']*1+(serviceComponents.length==0?0:700));
		
		//drawing service-components
		var counter = 0;
		for(var cname in serviceComponents){
			var comp = serviceComponents[cname];
	
			if(typeof(comp)=='object'){
				var width = 500;
				var height = 200;
				
				var x = 10 + counter*width;
				var y = appBounds['height']*1+100;
				
				var rect =this.paperService.rect(x,y,width,height);
				rect.attr('fill','#ccc');
				rect.attr('stroke-width',1);	
				rect.attr('fill-opacity',0.3);
				rect.toBack();
				
				serviceComponents[cname]['x'] = x;
				serviceComponents[cname]['y'] = y;
				serviceComponents[cname]['width'] = width;
				serviceComponents[cname]['height'] = height; 	

				//header
				var footer =this.paperService.rect(x,y-30+height,width,30);
				footer.attr('fill','#D4E1F2');
	
				// Name
				var sText = this.paperService.text(x+120,y-12+height,cname);
				sText.attr('font-size',14);
				sText.attr('fill','#000');

				counter++;
			}
		}
		
		//visualizing channels
		
		//counts how many boxes already have been drawn in a component so they dont overlap
		var cCounter = new Array();
		var drawnRects = new Array();
		for(var i = 0; i<metaChannels.length;i++){
			var mChannel= metaChannels[i];
			var events = mChannel['events'];
			var listeners = mChannel['listeners'];
			
			for(var j =0; j< events.length; j++){
				var cid = events[j]['cid'];
				var name = events[j]['name'];
				
				if(serviceComponents[cid]==undefined){
					// is ui-Event	
					if(cCounter[cid]==undefined){
						cCounter[cid]=0;
					}else{
						cCounter[cid]= cCounter[cid]*1 + 1;
					}
					
					//getting coordinates of the ui-component
					var	comp = applicationManagerInstance.getComponentManager().components[cid];
				
					var compBBox = comp['adapt']['body'].getBox();
					
					var x = (compBBox['x']*1 + (cCounter[cid]*130)+10);
					var y = (compBBox['y']*1)+(compBBox['height']-70);
					
					var r = this.paperService.rect(x,y,120,30);
					r.attr('fill','#9a9');
					r.data('cid',cid);
//					r.click(function(){
//						alert(this.data('cid'));
//					});
					
					var rText = this.paperService.text(x+60,y+15,name);
					rText.attr('font-size',12);
					rText.attr('fill','#fff');
					
					for(var k = 0;k<listeners.length;k++){
						var l = listeners[k];
						var lcid= l['cid'];
						
						// only connect with service-components
						if(serviceComponents[lcid]!=undefined){
							var lname = l['operationName'];
						
							//check if listener was drawn already
							var lx,ly = 0;
							if(drawnRects[lcid] == undefined || drawnRects[lcid][lname] == undefined){
								
								//listener doesnt exist, therefore calculating and saving position
								
								if(cCounter[lcid]==undefined){
									cCounter[lcid]=0;
								}else{
									cCounter[lcid]= cCounter[lcid]*1 + 1;
								}
								
								lx = (serviceComponents[lcid]['x']*1) + (cCounter[lcid]*130 + 10);
								ly = (serviceComponents[lcid]['y']*1 + 30); 
								
								drawnRects[lcid] = [];
								drawnRects[lcid][lname] = []
								drawnRects[lcid][lname]['lx'] = lx;
								drawnRects[lcid][lname]['ly'] = ly;
							
								var lr = this.paperService.rect(lx,ly,120,30);
								lr.attr('fill','#9a9');
								
								lr.data('cid',lcid);
								lr.click(function(){
									alert(this.data('cid'));
								});
							
							var lrText = this.paperService.text(lx+60,ly+15,lname);
							lrText.attr('font-size',12);
							lrText.attr('fill','#fff');
								
							}else{
								//listener exits already, reusing coordinates
								lx = drawnRects[lcid][lname]['lx'];
								ly = drawnRects[lcid][lname]['ly'];	
							}
						
							this._drawMetaPathService(this.paperService,x,y,lx,ly,cid,name,lcid,lname,mChannel['id'],false);	
						}
					} //end listeners
				} // end if 
			} //end events	
		}	
	},
	
	
	/** 
	 * Realises the UI-UI-Metavisualization based on a Raphael-Canvas and the current channels
	 */
	_metaVisUI : function(){
		if(!this.titlesChecked)
			this.__gatherComponentTitles();
		
		//fix some css-classes from ext so that the raphael-canvas has a absolute and not a fixed position
		document.getElementsByTagName('html')[0].className = document.getElementsByTagName('html')[0].className.replace( /(?:^|\s)x-viewport(?!\S)/ , '' );
		document.body.style.overflow = 'visible';
		
		//gathering non-system-channels
		var uiChannels = []; //all non system-channels
		var metaChannels = []; //ui-components only channels 
		var channels = this.eventBroker.channels;
		var participatingComps = []; 
		
		//getting app-dimensions
		var lm = applicationManagerInstance.layoutManager;
		var cm = applicationManagerInstance.getComponentManager(); 
		
		var appBounds = []; 
		appBounds['width'] = lm.root.size['width'];
		appBounds['height'] = lm.root.size['height'];
		
		for(var cname in channels){
			var channel = channels[cname];
				
			if(!channel['isSystemChannel']){
				uiChannels.push(channel);
			//	console.log('Adding Channel ' + channel['id'])
			}
		}

		//filtering  uic-uic-channels
		for(var i=0;i<uiChannels.length;i++){
			var channelComponents = [];
			
			var events = uiChannels[i].events;
			var listeners = uiChannels[i].listeners;
			
			for(var j = 0; j<events.length; j++){
				var e= events[j];
				if(channelComponents.indexOf(e['cid']) == -1){
					channelComponents.push(e['cid'])
					//console.log('adding cid ' +  e['cid']);
				}
			}
			
			for(var j = 0; j<listeners.length; j++){
				var l= listeners[j];
				if(channelComponents.indexOf(l['cid']) == -1){
					channelComponents.push(l['cid'])
					//console.log('adding cid ' +  l['cid']);
				}
			}
			
			//check if service-component is involved
			var uicOnly = true;
			for(var j = 0; j<channelComponents.length;j++){
				var c = cm.components[channelComponents[j]];
				
				if(!c['isUIC']){
					uicOnly = false;
					break;
				}
			}
			
			if(uicOnly && channelComponents.length>1){
				metaChannels.push(uiChannels[i]);
				
				for(var j = 0; j<channelComponents.length;j++){
					participatingComps.push(channelComponents[j]);
				}
			}
		}
		
		//start drawing
		this.paper = new Raphael(0,30,appBounds['width'],appBounds['height']);
   		
		//Visualizing channels
		//counts how many boxes already have been drawn in a component so they dont overlap
		var cCounter = new Array();
		for(var i = 0; i<metaChannels.length;i++){
			var mChannel= metaChannels[i];
			var isCoordChannel = false;
			
			if(this.coordinatedChannels[mChannel['id']]){
				isCoordChannel = true;
			}
			
			var events = mChannel['events'];
			var listeners = mChannel['listeners'];
			
			//check if it's a bidirectional channel, if so only listeners are drawn an connected (because listeners and events are the same)
			var sync = mChannel.isBidirectional;
			
			if(sync){
				for(var j =0; j< listeners.length-1; j++){
					var k = listeners[j];
					var cid= k['cid'];
					
					//check if label is specified
					var name = k['operationName']['propName'];
					if(isCoordChannel){
						for(var k = 0;k<this.coordProperties[cid].length;k++){
							var prop = this.coordProperties[cid][k];
							if(prop['propName'] == name){
								if(prop['label']){
									name = prop['label'];
								}
							}
						}	
					}
		
					if(cCounter[cid]==undefined){
						cCounter[cid]=0;
					}else{
						cCounter[cid]= cCounter[cid]*1 + 1;
					}
					
					var	comp = cm.components[cid];
					var compBBox = comp['adapt']['body'].getBox();
					
					var x = (compBBox['x']*1)+(compBBox['width']/3);
					var y = (compBBox['y']*1)+(compBBox['height']/3);
					
					//property-box
					if(j==0){
						var r = this.paper.rect(x,y,130,30);
						r.attr('fill','#666');
						var rText = this.paper.text(x+60,y+15,name);
						rText.attr('font-size',12);
						rText.attr('fill','#000');
					}
							
					var l = listeners[j+1];
					
					var lcid= l['cid'];
					var lname = l['operationName']['propName'];
					
					if(cCounter[lcid]==undefined){
						cCounter[lcid]=0;
					}else{
						cCounter[lcid]= cCounter[lcid]*1 + 1;
					}
					
					var	lcomp = cm.components[lcid];
					var lcompBBox = lcomp['adapt']['body'].getBox();
					
					
					var lx = (lcompBBox['x']*1)+(lcompBBox['width']/3);
					var ly = (lcompBBox['y']*1+cCounter[lcid]*40)+(lcompBBox['height']/3);	
					
					var lr = this.paper.rect(lx,ly,130,30);
					lr.attr('fill','#666');
					lr.data('cid',lcid);
					lr.click(function(){
						alert(this.data('cid'));
					});
					
					var lrText = this.paper.text(lx+60,ly+15,lname);
					lrText.attr('font-size',12);
					lrText.attr('fill','#000');
					
					this._drawMetaPath(this.paper,x,y,lx,ly,cid,name,lcid,lname,mChannel['id'],false);
				}
			}else{
				var _boxWidth= this.showSignatures? 200: 130;
				//unidirectional channel, connecting every listener with every event
				for(var j =0; j< events.length; j++){
					var cid = events[j]['cid'];
					var name = events[j]['name'];
					
					//getting label for event if specified
					if(isCoordChannel){
						for(var k = 0;k<this.coordProperties[cid].length;k++){
							var prop = this.coordProperties[cid][k];
							if(prop['changeEvent'] == name){
								if(prop['label']){
									name = prop['label']; 
								}else{
									name = prop['propName']
								}
							}	
						}
					} else {
						var a = name.indexOf('Changed');
						if(a!=-1){
							name = name.substring(0,a);
						}
						if (this.showSignatures){
							var medcfg= cm.getMediationConfig()[cid];
							var evparams= medcfg.events[name].parameters;
							name += " (";
							for (var idx=0; idx < evparams.length; ++idx){
								var tc= evparams[idx]['type_component'];
								tc= tc.substring(tc.indexOf("#")+1);
								name+=tc;
								if (idx != evparams.length-1)
									name+=", ";
							}
							name += ")";
						}
					}
					
					if(cCounter[cid]==undefined){
						cCounter[cid]=0;
					}else{
						cCounter[cid]= cCounter[cid]*1 + 1;
					}
					
					var	comp = cm.components[cid];
					
					var compBBox = comp['adapt']['body'].getBox();
					
					//calculation and drawing position of property-box
					var x = (compBBox['x']*1)+(compBBox['width']/3);
					var y = (compBBox['y']*1+cCounter[cid]*40)+(compBBox['height']/3);
					var r = this.paper.rect(x,y,_boxWidth,30);
					r.attr('fill', '#ff8c00');
					r.data('cid',cid);
					
					var rText = this.paper.text(x+_boxWidth/2,y+15,name);
					rText.attr('font-size',12);
					rText.attr('fill','#000');
					
					//drawing listeners
					for(var k = 0;k<listeners.length;k++){
						var l = listeners[k];
						
						var lcid= l['cid'];
						var lname = null;
						//check if its a property
						if(l['operationName'] instanceof Object){
							lname = l['operationName']['propName'];	
							
							if(isCoordChannel){
								for(var idx = 0;idx<this.coordProperties[lcid].length;idx++){
									var prop = this.coordProperties[lcid][idx];
									if(prop['propName'] == lname){
										if(prop['label']){
											lname = prop['label'];
											break;
										}
									}
								}
							}
						}else{
							lname = l['operationName'];
							if (this.showSignatures){
								var medcfg= cm.getMediationConfig()[lcid];
								var opparams= medcfg.operations[lname].parameters;
								lname += " (";
								for (var idx=0; idx < opparams.length; ++idx){
									var tc= opparams[idx]['type_component'];
									tc= tc.substring(tc.indexOf("#")+1);
									lname+=tc;
									if (idx != opparams.length-1)
										lname+=", ";
								}
								lname += ")";
							}
						}
						
						if(cCounter[lcid]==undefined){
							cCounter[lcid]=0;
						}else{
							cCounter[lcid]= cCounter[lcid]*1 + 1;
						}
						
						var	lcomp = cm.components[lcid];
						var lcompBBox = lcomp['adapt']['body'].getBox();
						
						
						var lx = (lcompBBox['x']*1)+(lcompBBox['width']/3);
						var ly = (lcompBBox['y']*1+cCounter[lcid]*40)+(lcompBBox['height']/3);	
						
						var lr = this.paper.rect(lx,ly,_boxWidth,30);
						lr.attr('fill', '#9acd32');
						lr.data('cid',lcid);
//						lr.click(function(){
//							alert(this.data('cid'));
//						});
						
						var lrText = this.paper.text(lx+_boxWidth/2,ly+15,lname);
						lrText.attr('font-size',12);
						lrText.attr('fill','#000');
						
						//connecting event and listener with line
						this._drawMetaPath(this.paper,x,y,lx,ly,cid,name,lcid,lname,mChannel['id'],true);
					} //end listeners 
				} //end events
			}
		} // end Kanäle vis
		
		// actual graph is ready, now the UI-Components are abtracted
		// components involved in at least one coordination getting a green overlay, otherwise a red
		// ##########################################################
		
		var comps = cm.components;
		
		for(var cName in comps){
			var comp = comps[cName];
	
			if(typeof(comp)=='object'){
				if(!comp.isUIC){
					continue;
				}	

				//getting boundingBox of adaptionPanel 
				var bodyBox = comps[cName]['adapt']['body'].getBox();
				
				/*
				// Volle Komponente
				var headerBox = comps[cName]['adapt']['header'].getBox();
				var rect =this.paper.rect(headerBox['x'],
							headerBox['y'],
							headerBox['width'],
							(headerBox['height']*1+bodyBox['height']*1));
				*/
				
				//move the canvas 30 px down so that the mainmenu is still accessible
				var rect =this.paper.rect(bodyBox['x'],
							bodyBox['y']-30,
							bodyBox['width'],
							bodyBox['height']);
				
				
				//coloring the rectangle
				if(participatingComps.indexOf(cName)==-1){
					rect.attr('fill','#faa');	
				}else{
					rect.attr('fill','#efe');
				}
				
				rect.attr('fill-opacity',0.6);
				rect.toBack(); 	
			} 
		}
	},
	
	
	/** Helperfunction for drawing the channels as lines for the service->ui-Metavis, therefore without a clickevent
	 *
	 * @param {Object} paper the Raphael-Canvas to draw on
	 * @param {int} x x-coordinate of the upper-left corner of the first rectangle
	 * @param {int} y y-coordinate of the upper-left corner of the first rectangle
	 * @param {int} x x-coordinate of the upper-left corner of the second rectangle
	 * @param {int} y y-coordinate of the upper-left corner of the second rectangle
	 * @param {String} cid Component-ID of the 'Sending'-Component
	 * @param {String} name Name of the publishing event/property
	 * @param {String} lcid Component-ID of the 'Receiving'-Component
	 * @param {String} lname Name of the receiving operation/property 
	 * @param {String} channelName Name of the Channel
	 * @param {boolean} arrowHead If true arrowheads are attached to the line
	 *  @private
	 */
	_drawMetaPathService : function(paper,x,y,lx,ly,cid,name,lcid,lname,channelName,arrowHead){
		x=x*1;
		y=y*1;
		lx=lx*1;
		ly=ly*1;
		
		var lpath = paper.path('M'+ (x+65) +','+ (y+30) +'L'+(lx+65)+','+ly);
		
		lpath.attr('stroke-width',2);
		lpath.attr('stroke','#8a8');
		lpath.attr('stroke-linecap','round');
		
		//bei bidirektionalen Kanälen wird der Pfeil weggelassen
		if(arrowHead){
			lpath.attr('arrow-end','classic');	
		}
		
		lpath.data('cid',cid);
		lpath.data('eventName',name);
		lpath.data('lcid',lcid);
		lpath.data('lname',lname);
		lpath.data('channelName',channelName)
		lpath.data('cm',applicationManagerInstance.getCoordinationManager())
		
	},
	
	
	/** Helperfunction for drawing the channels as lines for the ui->ui-Metavis
	 *  A clickevent and necessary data is attached to the line
	 *
	 * @param {Object} paper the Raphael-Canvas to draw on
	 * @param {int} x x-coordinate of the upper-left corner of the first rectangle
	 * @param {int} y y-coordinate of the upper-left corner of the first rectangle
	 * @param {int} x x-coordinate of the upper-left corner of the second rectangle
	 * @param {int} y y-coordinate of the upper-left corner of the second rectangle
	 * @param {String} cid Component-ID of the 'Sending'-Component
	 * @param {String} name Name of the publishing event/property
	 * @param {String} lcid Component-ID of the 'Receiving'-Component
	 * @param {String} lname Name of the receiving operation/property 
	 * @param {String} channelName Name of the Channel
	 * @param {boolean} arrowHead If true arrowheads are attached to the line
	 * @private
	 */
	_drawMetaPath : function(paper,x,y,lx,ly,cid,name,lcid,lname,channelName,arrowHead){
		x=x*1;
		y=y*1;
		lx=lx*1;
		ly=ly*1;

		var lpath=null;
		var offset= (this.showSignatures?100:65);
		//Calculating on which sides the line is drawn
		if(ly-y >0 && ly-y > Math.abs(lx-x)){
			lpath = paper.path('M'+ (x+offset) +','+ (y+30) +'L'+(lx+offset)+','+ly);	
		}
		
		if(y-ly>0 && y-ly > Math.abs(lx-x)){
			lpath = paper.path('M'+ (x+offset) +','+ (y) +'L'+(lx+offset)+','+(ly+30));	
		}
		
		
		if(lx-x>0 && lx-x > Math.abs(ly-y)){
			lpath = paper.path('M'+ (x+2*offset) +','+ (y+15) +'L'+(lx)+','+(ly+15));	
		}
		
		if(x-lx>0 && x-lx > Math.abs(ly-y)){
			lpath = paper.path('M'+ (x) +','+ (y+15) +'L'+(lx+2*offset)+','+(ly+15));	
		}
		
		if(!this.coordinatedChannels[channelName]){
			lpath.attr('stroke-width',3);
			lpath.attr('stroke','#8a8');
			lpath.attr('stroke-linecap','round');
			if(arrowHead){
				lpath.attr('arrow-end','classic-wide-long');	
			}
			
		}else{
			lpath.attr('stroke-width',5);
			lpath.attr('stroke-linecap','round');
			
			//bei bidirektionalen Kanälen wird der Pfeil weggelassen
			if(arrowHead){
				lpath.attr('arrow-end','classic');	
			}
			
			lpath.data('cid',cid);
			lpath.data('eventName',name);
			lpath.data('lcid',lcid);
			lpath.data('lname',lname);
			lpath.data('channelName',channelName)
			lpath.data('cm',applicationManagerInstance.getCoordinationManager())
			
			
			
			lpath.mouseover(function(){
				this.attr('stroke','#f00');
			});
			
			lpath.mouseout(function(){
				this.attr('stroke','#000');
			});	
			
			//Click-Event for opening the choice-window if the user wants to edit, delete the channel or make it bidirectional
			lpath.click(function(){
				
				
				this.mouseout(null);
				this.attr('stroke','#f00');
				
				
				var cm = this.data('cm');
				
				var channel = cm.eventBroker.channels[channelName];
				var l = channel['listeners'];
				var e = channel['events'][0];
				
				
				var channelType = null;
				
				
				for(var i = 0; i<cm.coordProperties[e.cid].length;i++){
					var prop = cm.coordProperties[e.cid][i]
					if(prop['changeEvent']==e['name']){
						channelType = prop['synchronizationPurpose'] 
					}
					
				}
				
				//possible buttons
				var bDelete = new Ext.Button({
					scope: this,
					width: 235,
					height: 35,
	                text: 'Delete Coordination',
	                handler: function (){
	                    	var cm = this.data('cm');
	                    	cm._deleteChannel(this.data('channelName'));
	                    	
	                    	cm.coordinatedChannels[this.data('channelName')] = [];
	                    }
				});
				
				var bEdit = new Ext.Button({
					scope: this,
					width: 235,
					height: 35,
	                text: 'Edit Properties',
	                handler: function (){
	                    	var cm = this.data('cm');
	                    	cm._editChannel(this.data('channelName'),channelType);	
	                    }
				});
				
				var bConvert = new Ext.Button({
					scope: this,
					width: 235,
					height: 35,
	                text: 'Make Bidirectional',
	                handler: function (){
	                    	var cm = this.data('cm');
	                    	cm._makeChannelBidirectional(this.data('channelName'));	
	                    }
				});
				
				//determine which buttons to show
				var buttons = [];
				
				//data->filter
				if(channelType=='data'){
					buttons.push(bEdit);
					buttons.push(bDelete);	
					
				}
				//filter->filter und visual->visual
				
				if(channelType=='filter' || channelType == 'visual'){
					buttons.push(bEdit);
					buttons.push(bDelete);
					
					if(!channel.isBidirectional){
						//analyse the interactionStatet of the involved properties .. if all are direct the channel can b converted to a bidirectional one 

						var direct = true;
						var propertyNames = cm.coordinatedChannels[channelName];
						
						for(var i = 0; i < propertyNames.length; i++){
							
							for(var j = 0; j < cm.coordProperties[propertyNames[i]['cid']].length; j++){
								var _prop = cm.coordProperties[propertyNames[i]['cid']][j];
								
								if(_prop['propName'] == propertyNames[i]['propName']){
									
									if(_prop['interactionState']=='indirect'){
										direct = false;
									}
								}
							}
						}
						
						if(direct){
							buttons.push(bConvert);
						}
					}
				}
				
				var choiceWin = new Ext.Window({
	                title:'What do you want to do?',
	                id:	'metaVisChoiceWindow',
	                width:		250,
	                height: 	 buttons.length*35 + 35,	
	                plain       : true,
	                layout		: 'vbox',
	                items		: buttons,
	                scope		: this
	            });
	            
	            choiceWin.show();
			});			
		}
		
		lpath.toBack();
	},
	
	
	
	/** Helperfunction for updating the stores if a property was added or deleted from a Channel
	 *  Gatheres all involved Properties of a Channel an all those which can be added
	 *
	 * @param {String} Channelname the name of the Channel
	 * @param {String} channelType Must be one out of 'data', 'filter' or 'visual' 
	 *	
	 *  @private
	 */
	__editChannelUpdateStores : function(channelName,channelType){
		//channeltype: filter, data, visual
		
		var cm = applicationManagerInstance.getComponentManager();
		var channel = this.eventBroker.channels[channelName];
		var type = null ;
		var tmpArray = [];
		var senders = [];
		
		if(channel.dataType instanceof Array){
			type = channel.dataType[0];
		}
		else{
			type = channel.type[0];
		}
		
		//Find sending Property in unidirectional channel
		if(!channel.isBidirectional){
			var events = channel['events'];
			
			for(var i=0;i<events.length;i++){
				var e = events[i];
				var eName = e['name'];
				
				for(var j = 0;j<this.coordProperties[e.cid].length;j++){
					var prop = this.coordProperties[e.cid][j];
					if(prop.changeEvent == eName){
						senders.push(prop);
					}
				}	
			}
		}	
				
		//find involved properties
		var propertyNames = this.coordinatedChannels[channelName];
		
		for(var i = 0; i < propertyNames.length; i++){
			var properties = this.coordProperties[propertyNames[i]['cid']];
			
			for(var j = 0; j< properties.length;j++){
				var prop = properties[j];
				if(prop['propName'] == propertyNames[i]['propName']){
					
					var label = prop['label'];
					if(!label)
						label = prop['propName']
					
					//check if prop is a sender, if so, prop is ignored, 
					//because deleting a sender results in deleting the channel ( because there should only be one sender in an unidirecional channel)
					var isSender = false;
					for(var k = 0; k < senders.length; k++){
						if(prop['propName'] == senders[k]['propName'] && prop['cid'] == senders[k]['cid']){
							isSender = true;
							break;
						}
					}
					
					if(!isSender){
						tmpArray.push([prop['propName'],prop['cid'],prop['ctitle'],prop['type'],prop['synchronizationPurpose'],label]);	
					}
				}
			}
		}
	
		this.coordPropStore.loadData(tmpArray);
		
		tmpArray = [];
		
		//Find addable properties
		for(var cname in this.coordProperties){
			var props = this.coordProperties[cname];
			if(typeof(props)!='object'){
					continue;
			}
				
			for(var i = 0; i<props.length; i++){
				var prop = props[i];
				if(prop['type'] == type && this._matchingProperty(channelType,'direct',prop['synchronizationPurpose'],prop['interactionState'])){
					var used = false;
					
					for(var j = 0; j < this.coordinatedChannels[channelName].length; j++){
						var involvedProp = this.coordinatedChannels[channelName][j];
						
						if(involvedProp['cid'] == prop['cid'] && involvedProp['propName'] == prop['propName']){
							used = true;
							break;
						}
						
					}

					if(!used){
						var label = prop['label'];
						if(!label)
							label = prop['propName']
						tmpArray.push([prop['propName'],prop['cid'],prop['ctitle'],prop['type'],prop['synchronizationPurpose'],label]);	
					}
				}
			} 
		}
		this.availablePropStore.loadData(tmpArray);
	},
	
	
	/** 
	 * Function that draws the Coordination-Edit-Dialog and allows to add or remove Properties from a Channel
	 * 
	 * @param {String} Channelname the name of the Channel
	 * @param {String} channelType Must be one out of 'data', 'filter' or 'visual' 
	 * @private
	 * 
	 */
	_editChannel : function(channelName,channelType){
		var cm = applicationManagerInstance.getComponentManager();
		var channel = this.eventBroker.channels[channelName];
		var type = channel.type[0];
		//console.log(channel);
		
		this.gridAddTmp = [];
		this.gridDeleteTmp = [];
		this.gridAddTmp['channel'] = channel;
		this.gridAddTmp['channelType'] = channelType;
		this.gridDeleteTmp['channel'] = channel;
		this.gridDeleteTmp['channelType'] = channelType;
		
		this.coordPropStore = new Ext.data.ArrayStore({
			    fields: ['propName', 'cid','ctitle', 'type', 'synchronizationPurpose', 'label'],
			    data : []
		});
		
		this.availablePropStore = new Ext.data.ArrayStore({
			    fields: ['propName','cid','ctitle','type', 'synchronizationPurpose', 'label'],
			    data : []
		});
		
		this.__editChannelUpdateStores(channelName,channelType);
		
		//Panel for involved properties
		var grid = new Ext.grid.GridPanel({
				scope: this,
				id: 'metaVisEditPropDeleteGrid',
				border:false,
			    store:this.coordPropStore,
			    colModel: new Ext.grid.ColumnModel({
			        defaults: {
			            width: 130,
			            sortable: false
			        },
			        columns: [
			            {header: 'Component', width: 130,  sortable:true, dataIndex: 'ctitle'},
			            {id: 'Property', header: 'Property', width: 130,  dataIndex: 'label'},
			        ]
			    }),
			    viewConfig: {
			        forceFit: true,
			
			    },
			    sm: new Ext.grid.RowSelectionModel({singleSelect:true, scope:this}),
			    //add orange backrgound-color to rows with properties, which are already involved in some coordination 
			    view:new Ext.grid.GridView({
			    	forceFit:true,
			    	scope: this,
			    	enableRowBody:true,
			    	getRowClass: function(record, rowIndex, rp, ds){
				    	
				    	if(this.scope._isCoordinatedProp(record['data']['propName'], record['data']['cid'])){
							return 'x-grid3-row orange-row';
						}
				    },	
			    }),
			    width: 300,
			    height: 300,
			    frame: false,
			    iconCls: 'icon-grid'
		});
		
		grid.getSelectionModel().on('rowselect', function(sm, index, record) {
			this.scope.gridDeleteTmp['cid'] = record.data['cid'];
			this.scope.gridDeleteTmp['propName'] = record.data['propName'];
			
			Ext.getCmp('metavisPropEditDelete').enable();;
			
						
        });
		
		//panel for addable properties
		var grid2 = new Ext.grid.GridPanel({
				scope: this,
				id: 'metaVisEditPropAddGrid',
				border:false,
			    store:this.availablePropStore,
			    colModel: new Ext.grid.ColumnModel({
			        defaults: {
			            width: 120,
			            sortable: false
			        },
			        columns: [
			            {header: 'Component', width: 130,  sortable:true, dataIndex: 'ctitle'},
			            {id: 'Property', header: 'Property', width: 130,  dataIndex: 'label'},
			        ]
			    }),
			    viewConfig: {
			        forceFit: true,
			
			    },
			    sm: new Ext.grid.RowSelectionModel({singleSelect:true, scope:this}),
			    //add orange backrgound-color to rows with properties, which are already involved in some coordination 
			    view:new Ext.grid.GridView({
			    	forceFit:true,
			    	scope: this,
			    	enableRowBody:true,
			    	getRowClass: function(record, rowIndex, rp, ds){
				    	if(this.scope._isCoordinatedProp(record['data']['propName'], record['data']['cid'])){
							return 'x-grid3-row orange-row';
						}
				    },	
			    }),
			    width: 300,
			    height: 300,
			    frame: false,
			    iconCls: 'icon-grid'
		});
		
		grid2.getSelectionModel().on('rowselect', function(sm, index, record){
			this.scope.gridAddTmp['cid'] = record.data['cid'];
			this.scope.gridAddTmp['propName'] = record.data['propName'];
			
			Ext.getCmp('metavisPropEditAdd').enable();
		});
			
			var tb_left = new Ext.Toolbar({
				id : 'toolbar_left'
			});
			
			//Button to remove an involved property 
			tb_left.add({
				    xtype: 'button',
				    id: 'metavisPropEditDelete',
                    scope: this,
                    text: 'Delete',
                    disabled: true,
                    handler: function (){
                    	var cid = this.gridDeleteTmp['cid'];
						var propName = this.gridDeleteTmp['propName'];	 
                    	var channelName = this.gridDeleteTmp['channel']['id'];
                    	
                    	var cm = applicationManagerInstance.getComponentManager();
                    	var channel = cm.eventBroker.channels[channelName];
                    	
                    	var events = this.gridDeleteTmp['channel']['events'];
						var eventName = null;
							
						for(var i = 0; i < events.length; i++){
							if(events[i]['cid'] == cid ){
								eventName = events[i]['name'];
								break;
							}
						}
						if(channel.isBidirectional){
						
							cm.removePublisher(cid, channelName, eventName);
							this.eventBroker.removeMapping(cid,eventName);
	                    	cm.removeSubscriber(cid, channelName);
	
                    	}else{
                    		cm.removeSubscriber(cid, channelName);
                    	}
                    	
                    	//update coordination-List
                    	var propArray = this.coordinatedChannels[channelName];
                    	for(var i =0; i<propArray.length; i++){
                    		if(propArray[i]['cid']==this.gridDeleteTmp['cid'] && propArray[i]['propName'] == this.gridDeleteTmp['propName']){
                    			this.coordinatedChannels[channelName].splice(i,1);
                    			break;
                    		}
                    	}
                    	//update stores
                    	this.__editChannelUpdateStores(channelName,this.gridDeleteTmp['channelType']);
                    	
                    	Ext.getCmp('metaVisEditPropDeleteGrid').getSelectionModel().clearSelections();
                    	Ext.getCmp('metavisPropEditDelete').disable();
                    }
         	});
         	
         	var tb_right = new Ext.Toolbar({
				id : 'toolbar_right'
			});
			
			//button to add a new property to the channel
			tb_right.add({
				    xtype: 'button',
                    id: 'metavisPropEditAdd',
                    scope: this,
                    text: 'Add',
                    disabled: true,
                    handler: function (a,b,c){
                    	
                   		var cm = applicationManagerInstance.getComponentManager();
			        	var channel = cm.eventBroker.channels[this.gridAddTmp['channel']['id']];
			        	if(channel.isBidirectional){
			        		var eventName = this._getEventNameForProperty(this.gridAddTmp['cid'], this.gridAddTmp['propName'])
			        		cm.addPublisher(this.gridAddTmp['cid'],this.gridAddTmp['channel']['id'], eventName);
							cm.addSubscriber(this.gridAddTmp['cid'],this.gridAddTmp['channel']['id'], {opName:'setProperty',propName:this.gridAddTmp['propName']});
							
			        	}else{
			        		cm.addSubscriber(this.gridAddTmp['cid'],this.gridAddTmp['channel']['id'], {opName:'setProperty',propName:this.gridAddTmp['propName']});
			        	}
			        	
						//update coordination-List
						this.coordinatedChannels[channelName].push({propName:this.gridAddTmp['propName'],cid:this.gridAddTmp['cid']});
						
						//update stores
						this.__editChannelUpdateStores(channelName,this.gridAddTmp['channelType']);
						
						Ext.getCmp('metaVisEditPropAddGrid').getSelectionModel().clearSelections();
                    	Ext.getCmp('metavisPropEditAdd').disable();
                    }
         	});
		
			var leftpanel = new Ext.Panel({
	            title: 'Involved Properties ',
	            scope: this,
	            split: true,
	            width: 300,
	            height: 300,
	            items: [grid],
	            margins:'3 0 3 3',
	            cmargins:'3 3 3 3',
	            bbar: tb_left
	        }); 

			var rightpanel = new Ext.Panel({
	            title: 'Available Properties ',
	            scope: this,
	            split: true,
	            width: 300,
	            height: 300,
	            items:[grid2],
	            margins:'3 0 3 3',
	            cmargins:'3 3 3 3',
	            bbar: tb_right
	        });

			var win = new Ext.Window({
                title:'Channel Property Editor',
                width       : 610,
                height      : 340,
                plain       : true,
                layout		: 'hbox',
                items		: [leftpanel,rightpanel],
                scope		: this,
                listeners: {
                	scope : this,
                	'beforeclose': function(){
                		//Channels durchgehen und prüfen, ob es welche gibt mit weniger als 2 Listeners/Publishern .. wenn ja dann Channel entfernen,
                		//da er keinen Zweck mehr hat und über das UI auch nicht mehr erreichbar ist
                		
                		//Check if enough listeners/events are present in the channel after editing
                		//if not, delete the channel
                		for(var cname in this.eventBroker.channels){
                			var channel = this.eventBroker.channels[cname];
                			if(typeof(channel)=='object'){
                				if(!channel.isSystemChannel){
                					if(channel.isBidirectional){
                				
		                				if(channel.listeners.length < 2 || channel.events.length < 2){
		                					
		                					this._deleteChannel(channel.id);
		                					this.log.info('[CoordMan] Deleted Channel ' + channel.id + ' because it has to few listeners/events');
		                					this.coordinatedChannels[channel.id] = [];
		                				}
                					}else{
                						if(channel.listeners.length < 1 || channel.events.length < 1){
		                					
		                					this._deleteChannel(channel.id);
		                					this.log.info('[CoordMan] Deleted Channel ' + channel.id + ' because it has to few listeners/events');
		                					this.coordinatedChannels[channel.id] = [];
		                				}
                						
                					} 	
	                			}		
                			}	
                				
                		} // end for
                		
                		var choiceWin = Ext.getCmp('metaVisChoiceWindow');
                		if(choiceWin)
                			choiceWin.close();
                		//Metavis updaten
                		
                		this._removeMetaVisUI();	
                		this._metaVisUI();
                	} // end beforeClose
                } // end listeners
            });
            	
            win.show();		
	},
	
	/** Function for deleting a Property-Based Channel
	 *
	 * @param {String} Channelname the name of the Channel 
	 * @private
	 */
	_deleteChannel: function(channelName){
		var channel = this.eventBroker.channels[channelName];
		var cm = applicationManagerInstance.getComponentManager();
		var listeners = channel['listeners'];
		var events = channel['events'];
		
		while(events.length>0){
			this.eventBroker.removeMapping(events[0]['cid'],events[0]['name'],channelName);
			cm.removePublisher(events[0]['cid'], channelName, events[0]['name']);
		}
		
		while(listeners.length>0){
			cm.removeSubscriber(listeners[0]['cid'], channelName);
		}
		
		this.eventBroker.removeChannel(channelName);
		
		var choiceWin = Ext.getCmp('metaVisChoiceWindow');
        choiceWin.close();
        
        this._removeMetaVisUI();
		this._metaVisUI();
		
		Ext.Msg.alert('Status', 'Channel successfully deleted.');
	},
	
	/** Converts a unidirectional channel in a bidirectional one, only for channels consisting of either direct filter properties or direct viusial properties
	 *
	 * @param {String} Channelname the name of the Channel
	 * @private
	 * 
	 */
	_makeChannelBidirectional: function(channelName){
		var channel = this.eventBroker.channels[channelName];
		if(!channel.isBidirectional){
			var e = channel['events'];
			var l = channel['listeners'];
			var cm = applicationManagerInstance.getComponentManager();
			
			var tmpSubscriber =[]
			var tmpPublisher =[]
			
			var propertyNames = this.coordinatedChannels[channelName];
			
			//making event also to listeners
			for(var cname in this.coordProperties){
				var properties = this.coordProperties[cname];
				if(typeof(properties ) =="object"){
					for(var i = 0; i<properties.length;i++){
						for(var j =0; j< e.length;j++){
							if(e[j]['cid'] == properties[i]['cid'] && e[j]['name'] == properties[i]['changeEvent']){
								tmpSubscriber.push({cid:e[j]['cid'],propName:properties[i]['propName']})	
							}
						}
					}
				}
			}
			
			//making listeners also to events
			for(var i = 0; i<l.length; l++){
				var eventName = null;
				var props = this.coordProperties[l[i]['cid']];
				
				for(var j = 0; j<props.length; j++){
					if(props[j]['propName'] == l[i]['operationName']['propName']){
						eventName = props[j]['changeEvent'];
						break;
					}
				}
				
				if(eventName){
					tmpPublisher.push({cid:l[i]['cid'],eventName:eventName})	
				}
			}
			
			if(tmpSubscriber.length > 0 && tmpPublisher.length>0){
				//all names could be extracted, so start converting
				for(var i = 0;i<tmpSubscriber.length;i++){
					cm.addSubscriber(tmpSubscriber[i]['cid'],channelName,{opName:'setProperty',propName:tmpSubscriber[i]['propName']})
				}
				for(var i = 0;i<tmpPublisher.length;i++){
					cm.addPublisher(tmpPublisher[i]['cid'],channelName,tmpPublisher[i]['eventName']);
				}
				
				channel.isBidirectional = true;	
				
				var choiceWin = Ext.getCmp('metaVisChoiceWindow');
		        if(choiceWin)
		        	choiceWin.close();
		        
		        this._removeMetaVisUI();
				this._metaVisUI();
				
				Ext.Msg.alert('Status', 'Channel successfully updated.');
			}
			else{
				this.log.error('[CoordMan] Couldnt identify subscribers or publishers.')
			}
		}
	}
});