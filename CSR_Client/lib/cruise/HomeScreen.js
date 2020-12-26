/**
 * @author Carsten Radeck
 * @author Gregor Blichmann
 * @class Ext.cruise.client.HomeScreen
 */
Ext.cruise.client.HomeScreen = function(log, username){
	// initialize necessary data
	//var href = window.location.href;
	//var url_hs = ((href.lastIndexOf('/')==href.length-1)?href:href+"/")+"homescreen_welcome.txt";
	var url_hs = "http://mashup.dyndns.org:7331/res/1.9/edyra/texts/homescreen_welcome.txt";
	var that = this;
	
	var welcomeTextPanel = new Ext.Panel({
		id: 'welcomeText_panel',
		baseCls: 'welcomeText_panel',
		collapsedCls: 'welcomeText_panel_collapsed',
		title: 'Welcome to the EDYRA platform'+(username?", "+username+".":""),
		collapsible: true,
		collapsed: localStorage ? localStorage.hswelcomednsa=="true":false,
		titleCollapse: true,
		hideCollapseTool: false,
		html: Ext.cruise.client.HomeScreen.welcomeText || "loading..." 
	});
	
	// Add the additional 'advanced' VTypes
	Ext.apply(Ext.form.VTypes, {
	    daterange : function(val, field) {
	        var date = field.parseDate(val);

	        if(!date){
	            return false;
	        }
	        if (field.startDateField) {
	            var start = Ext.getCmp(field.startDateField);
	            if (!start.maxValue || (date.getTime() != start.maxValue.getTime())) {
	                start.setMaxValue(date);
	                start.validate();
	            }
	        }
	        else if (field.endDateField) {
	            var end = Ext.getCmp(field.endDateField);
	            if (!end.minValue || (date.getTime() != end.minValue.getTime())) {
	                end.setMinValue(date);
	                end.validate();
	            }
	        }
	        /*
	         * Always return true since we're only using this vtype to set the
	         * min/max allowed values (these are tested for after the vtype test)
	         */
	        return true;
	    }
	});
	
	var currentlyClosedStore = new Ext.data.Store({ // NO SimpleStore (==ArrayStore) since it overrides the reader property!
		id: 'recentlyClosedStore',
		totalProperty: 'resultCount',
		baseParams: {
			user: applicationManagerInstance.getUserID(),	  // user credentials
			intervalStart: new Date().getTime() - 2628000000, // currently one month behind as default
			intervalEnd: new Date().getTime(),				  // current Date
			start: 0,										  // start with the first result
			limit: 14										  // limit of entries as response
		},	
		reader: { // this object is not really in compliance with the "Ext.data.Reader" interface but its just
				  // fine in conjunction with SOAPProxy which only requires a 'read'-method ;)
			read: function(result){
					var ret= [];
					//var resultSet = Ext.cruise.client.Utility.getElementsByTagNameNS('ax24:',Ext.cruise.client.Constants._COMPRE_NS_+'/xsd','results',result);
					for ( var d = 0; d < result[0].childNodes.length; d++) {
						try{
						if(result[0].childNodes[d].localName == "results"){
							var version = Ext.cruise.client.Utility.getElementsByTagNameNS('ax24:',Ext.cruise.client.Constants._COMPRE_NS_+'/xsd','version',result[0].childNodes[d])[0].firstChild.nodeValue;
							var timestamp = version.substring(version.lastIndexOf(".")+1);
							var id = Ext.cruise.client.Utility.getElementsByTagNameNS('ax24:',Ext.cruise.client.Constants._COMPRE_NS_+'/xsd','ID',result[0].childNodes[d])[0].firstChild.nodeValue;
							var iconURL = applicationManagerInstance.getCoreURL().replace("/services/CoReService","/screenshot") + "?id=" + id + "&version=" + version; 
							ret.push(new Ext.cruise.client.ApplicationManager.ListEntry({
											id : id,
											name : Ext.cruise.client.Utility.getElementsByTagNameNS('ax24:',Ext.cruise.client.Constants._COMPRE_NS_+'/xsd','name',result[0].childNodes[d])[0].firstChild.nodeValue,
											timestamp : new Date(parseFloat(timestamp)).format('d.m.Y, H:i'),
											iconURL: iconURL
											}));
						}
						}catch(e){}
					}
					return {
						success: true,
						records: ret,
						totalRecords: parseInt(result[0].childNodes[0].firstChild.nodeValue)
					};
			}
		},
		fields: ['id', 'name', 'timestamp', 'iconURL'],
		proxy: new Ext.cruise.client.SOAPProxy({
			url:  applicationManagerInstance.getCompreURL(),
			operation: "listRecentCompositionModels",
			namespace: Ext.cruise.client.Constants._COMPRE_NS_,
			prefix: "q0"
		}),

		listeners: {
		'load': {
				fn: function(store, record, operation){
					if (store.getCount()==0){
						Ext.getCmp("recentlyClosed_panel_NOC_label").show();
					}else {
						Ext.getCmp("recentlyClosed_panel_NOC_label").hide();
					}
				},
				scope: this
			}
		}
	});
	
	// create new panel, used as home screen
	var homeScreen = new Ext.Panel({
			id: 'homescreen_panel',
			baseCls: 'homescreen_panel',
			autoHeight:true,
			width:900,
			boxMaxWidth: 900,
			items: [
			        welcomeTextPanel,

					////////////////////////////////////////////////// Recently Closed Apps //////////////////////////////////////////////////////////
			        
			        new Ext.Panel({
						id: 'recentlyClosed_panel',
						baseCls: 'recentlyClosed_panel',
						collapsedCls: 'recentlyClosed_panel_collapsed',
						title: 'Load Recently Closed Application',
						collapsible: true,
						collapsed:true,
						titleCollapse: true,
						hideCollapseTool: false,
						autoHeight:true,
						autoWidth:true,
						tbar: {
							items: [
					    	   new Ext.PagingToolbar({
					               pageSize: 14,
					               cls: 'pagingToolbar',
					               store: currentlyClosedStore,
					               displayInfo: true,
					               displayMsg: 'Displaying applications {0} - {1} of {2}',
					               emptyMsg: "",
					               listeners: {
								    	'beforechange': function(view, params){
									    		// customizing the sequence of used parameters when switching the page
								    			// store current start and limit
								    			var start= params.start;
								    			var limit= params.limit;
								    			
								    			// delete old parameter sequence
								    			for (var name in params){
								    				delete params[name];
								    			}
								    			
								    			// create new parameter sequence
								    			params['user']= applicationManagerInstance.getUserID();
								    			params['intervalStart'] = Ext.getCmp('compositionsListView').getStore().baseParams.intervallStart;
								    			params['intervalEnd']= Ext.getCmp('compositionsListView').getStore().baseParams.intervallEnd;
								    			params['start']= start;
								    			params['limit']= limit;
								    			
								    			// collapse recently load detail panel without animation
								    			Ext.getCmp('recentlyClosedDetail_panel').collapse(false);
								    	}
					               }
								}), new Ext.Toolbar.Separator({
						    	   html:'<div class="recentlyClosedSeparator"></div>'
								}),
								new Ext.FormPanel({
						    	        labelWidth: 25,
										border: false,
						    	        header: false,
						    	        baseCls: 'intervalSelectionBox',
						    	        defaults: {format: 'd.m.y'},
						    	        defaultType: 'datefield',
						    	        items: [{
						    	          fieldLabel: 'From',
						    	          name: 'startdt',
						    	          value: new Date().add(Date.MONTH,-1),
						    	          id: 'startdt',
						    	          vtype: 'daterange',
						    	          endDateField: 'enddt' // id of the end date field
						    	        },{
						    	          fieldLabel: '&nbsp;until',
						    	          name: 'enddt',
						    	          id: 'enddt',
						    	          value: new Date(),
						    	          vtype: 'daterange',
						    	          startDateField: 'startdt' // id of the start date field
						    	        },{
											xtype: 'button',
											text: 'Filter Results!',
											listeners: {
										    	'click': { // handle clicks on button
										    		fn:	function(view, index){
										    			// get new params
										    			var userId = applicationManagerInstance.getUserID();
										    			var intervalStart = Ext.getCmp('startdt').getValue();
										    			var intervalEnd = Ext.getCmp('enddt').getValue();
										    			if(intervalStart=="" || intervalEnd==""){
										    				Ext.MessageBox.alert("Interval selection", "Empty interval!");
										    				return;
										    			}
										    			intervalStart=intervalStart.getTime();
										    			intervalEnd=intervalEnd.getTime()+86399999;
										    			
										    			if(intervalStart>intervalEnd){
										    				Ext.MessageBox.alert("Interval selection", "Invalid interval!");
										    			}else{
										    				var baseParams = Ext.getCmp("compositionsListView").getStore().baseParams;
										    				baseParams.intervalStart = intervalStart;
										    				baseParams.intervalEnd = intervalEnd;
										    				baseParams.start = 0;
										    				Ext.getCmp("compositionsListView").getStore().load({});
										    			}
										    		},
										    		scope: this
										    	}
											}
								       }]
						    	      }),
						       {
						    	    xtype: 'tbseparator' 
						       }
						       ]},
						items: [
							new Ext.form.Label({
								id: 'recentlyClosed_panel_NOC_label',
								cls: 'norlabel',
								html: "<p>There are no recently closed compositions available for this period of time.<p>",
								hidden: true
							}),
							new Ext.DataView({
								id: 'compositionsListView',
								store: currentlyClosedStore,
						        tpl: new Ext.XTemplate(
									    '<tpl for=".">',
								        '<div class="thumb-wrap" orign="recentlyClosed" id="{id}">',
								        	'<div class="thumb"><img src="{iconURL}" title="{name}"></div>',
								        	'<p>{name}</p>',
								        	'<p>{timestamp}</p>',
								        '</div>',
								    '</tpl>',
								    '<div class="x-clear"></div>'
						        ),
						        autoHeight:true,
						        multiSelect: true,
						        overClass:'x-view-over',
						        itemSelector:'div.thumb-wrap'
						    }),

							////////////////////////////////////////////////// Recently Closed App Details //////////////////////////////////////////////////////////
							new Ext.Panel({
								id: 'recentlyClosedDetail_panel',
								baseCls: 'recentlyClosedDetail_panel',
								//height: 200,
								autoHeight:true,
								autoWidth:true,
								collapsible: true,
								collapsed:true,
								hideCollapseTool: true,
								//collapsedCls: 'recentlyClosedDetail_panel_collapsed',
							})
							
						]
					}),
					////////////////////////////////////////////////// Top Rated Apps //////////////////////////////////////////////////////////
					new Ext.Panel({
						id: 'topRated_panel',
						baseCls: 'topRated_panel',
						collapsedCls: 'topRated_panel_collapsed',
						title: 'Show Top Rated Applications',
						collapsible: true,
						collapsed:true,
						titleCollapse: true,
						hideCollapseTool: false,
						autoHeight:true,
						autoWidth:true,
						items: [
							new Ext.form.Label({
								id: 'topRated_panel_NOC_label',
								cls: "norlabel",
								html: "<p>Currently, there are no rated compositions available.<p>",
								hidden: true
							}),
							new Ext.DataView({
								id: 'nameIdListView2',
								store: new Ext.data.Store({
									id: 'topRatedStore',
									baseParams: {
										k: 7 	// default parameters to be used in the soap envelope 
									},		// The names defined here and as parameters of SOAP operations have to be consistent! 
									reader: { // this object is not really in compliance with the "Ext.data.Reader" interface but its just
											  // fine in conjunction with SOAPProxy which only requires a 'read'-method ;)
										read: function(nodelist){
												var ret= [];
												if (nodelist.length==1){
													var result= Ext.util.JSON.decode(nodelist[0].textContent);
													if (Ext.isArray(result)){
														for ( var d = 0; d < result.length; d++) {
															var r= result[d];
															ret.push(new Ext.cruise.client.ApplicationManager.ListEntry({
																		name : r.name,
																		id : r.cid,
																		rating: "Rating: " + r.rating,
																		count: "(" + r.count + " votes)",
																		url: r.screenshot,
																		type: r.isUI?'uic':'sc'
																	}));
														}
													}
												}
												return {
													success: true,
													records: ret,
													totalRecords: ret.length
												};
										}
									},
									fields: ['name', 'id', 'rating', 'count', 'url'],
									proxy: new Ext.cruise.client.SOAPProxy({
										url:  "http://localhost:8080/CoRe/services/CoReService",
										operation: "listTopRatedComponents"
									}),
									listeners: {
										'load': {
											fn: function(store, record, operation){
												if (store.getCount()==0){
													Ext.getCmp("topRated_panel_NOC_label").show();
												}else {
													Ext.getCmp("topRated_panel_NOC_label").hide();
												}
											},
											scope: this
										}
									}
								}),
						        tpl: new Ext.XTemplate(
									    '<tpl for=".">',
								        '<div class="thumb-wrap" id="{id}">',
								        	'<div class="thumb"><img src="{url}"><img class="overlay" src="http://mashup.dyndns.org:7331/res/1.9/edyra/graphics/{type}.png"/></div>',
								        	'<p>{name}</p>',
								        	'<p>{rating}</p>',
								        	'<p>{count}</p>',
								        '</div>',
								    '</tpl>',
								    '<div class="x-clear"></div>'
						        ),
						        itemSelector:'div.thumb-wrap',
						        listeners: {
									'click': {
										fn: function(view, index){
											if (index==-1) return;
											var entry= view.getStore().getAt(index);
											// integrate component in current layout
											var integrationRequest = new Ext.cruise.client.MCDLReqRespObject({
								   				compConfig: null,
								   				id: entry.data.id
											});

											//hide home screen
											applicationManagerInstance.getLayoutManager().hideHomeScreen();
											
											applicationManagerInstance.initializeEmptyCCM();
											applicationManagerInstance.getScreenflowManager().setupInitialView();
											
											// start showing busy Indicator until component is displayed
											applicationManagerInstance.getRecommendationManager().busyIndicator.show();
											// fetch SMCDL
											applicationManagerInstance.getIntegrationManager().fetchSMCDLByID(integrationRequest);																		
											applicationManagerInstance.getEventBroker().subscribe(undefined, undefined, 'object','componentLCChannel', applicationManagerInstance.monitorStartApplicationIntegration, applicationManagerInstance);				
										},
										scope: this
									}
								}
							})
						]
					}),
					
					//////////////////////////////////////////////////Component Browser //////////////////////////////////////////////////////////
					new Ext.Panel({
						id: 'component_browser',
						baseCls: 'topRated_panel',
						collapsedCls: 'topRated_panel_collapsed',
						title: 'Browse the Component Repository',
						collapsible: true,
						collapsed: true,
						titleCollapse: true,
						hideCollapseTool: false,
						autoHeight:true,
						autoWidth:true,
						items: [
								new Ext.form.Label({
									cls: "norlabel",
									html: "<p>Under construction.<p>"
								})
						        ]
					})
			]
	});
	
	// Handler for selecting one recently closed app
	Ext.getCmp('compositionsListView').on('click', function(listView, index){
					var detailPanel= Ext.getCmp('recentlyClosedDetail_panel');
					var entry= listView.getStore().getAt(index);
					detailPanel.expand();
					
					var xml= applicationManagerInstance.getServiceAccess().buildSOAPEnvelope("<q0:getCompositionModelDetails><q0:id>"+
							entry.data.id +"</q0:id></q0:getCompositionModelDetails>", "q0", Ext.cruise.client.Constants._COMPRE_NS_);
					var xhr= applicationManagerInstance.getServiceAccess().createXHR(this);
					xhr.open('POST', applicationManagerInstance.getCompreURL());
					xhr.setRequestHeader("Content-Type","application/soap+xml");
					xhr.onreadystatechange= function(){
						if (xhr.readyState != 4) return;
						if (xhr.status == 200) {
							var respxml = xhr.responseXML;
							if (respxml == null) 
								return;
							var innerHtml = '<div style=\"float:left;\"><h2>' + entry.data.name + '</h2>';
							innerHtml += '<p>Created at: ' +  entry.data.timestamp + '</p>';
							innerHtml += '<p>by: ' + Ext.cruise.client.Utility.getElementsByTagNameNS('ax24:',Ext.cruise.client.Constants._COMPRE_NS_+'/xsd','user',respxml)[0].firstChild.nodeValue + '</p>';
							innerHtml += "<div class=\"loadCompositionButton\" onClick=\"applicationManagerInstance.loadCompositionModel('" + entry.data.id + "',null,null);\"><span>Start Application</span></div>";
							innerHtml += '<h3 class="versionsLabel">Available Versions:</h3><p>';
							var versions =	Ext.cruise.client.Utility.getElementsByTagNameNS('ax24:',Ext.cruise.client.Constants._COMPRE_NS_+'/xsd','versions',respxml);
							for(var i = versions.length-1; i>=0; i--){
								innerHtml += versions[i].firstChild.nodeValue;
								if(i!=0)
									innerHtml += ', ';
							}
							innerHtml += '</p>';
							innerHtml += '<h3>Rating: <span>' +Ext.cruise.client.Utility.getElementsByTagNameNS('ax24:',Ext.cruise.client.Constants._COMPRE_NS_+'/xsd','rating',respxml)[0].firstChild.nodeValue + '</span></h3></div>';
							innerHtml += '<div><img src=\"' + entry.data.iconURL + '\" /></div>';
							innerHtml += '<div style=\"clear:left;\"><h3>Comments:</h3></div>';
							detailPanel.update(innerHtml);
						}
					};
					xhr.send(xml);
		});
	
	// query welcome text
	if (!Ext.cruise.client.HomeScreen.welcomeText){
		var xhr= applicationManagerInstance.getServiceAccess().createXHR();
		xhr.open("GET",url_hs);
		xhr.onreadystatechange= function(){
			if (xhr.readyState==4){
				if (xhr.status==200){
					Ext.cruise.client.HomeScreen.welcomeText= xhr.responseText; // save locally to avoid subsequent queries
					if(welcomeTextPanel && welcomeTextPanel.rendered){
						welcomeTextPanel.update(xhr.responseText);
						// delay the listener assignment to ensure that everthing is rendered
						if (!localStorage) return;
						setTimeout(function(){
							var checkbutton= Ext.get("hs_welcome_hide");
							checkbutton.dom.checked= localStorage.hswelcomednsa=="true";
							checkbutton.on("click", function(ev,el){
								localStorage.hswelcomednsa= el.checked;
							});
						}, 250);
					}
				}else {
					welcomeTextPanel.update("Resource unavailable!");
					return;
				}
			}
		}
		xhr.send();
	}
	
	// initial queries
	Ext.getCmp("nameIdListView2").getStore().load({
		params: {
			k: 7 	// Defines the parameters that are handed over to the (SOAP)Proxy and used to build the SOAP envelope there
					// The names defined here and as parameters of SOAP operation have to be consistent!
		}
	});
	Ext.getCmp("compositionsListView").getStore().load({});
	
	/* ********************************** /
	 * public methods 
	 * 
	 * ***********************************/
	/**
	 * Displays the homescreen.
	 */
	this.show= function(){
		if (homeScreen)
			homeScreen.show();
	}

	/**
	 * Displays the homescreen.
	 */
	this.hide= function(){
		if (homeScreen)
			homeScreen.hide();
	}
	
	/**
	 * Determines whether the homescreen is visible or not
	 */
	this.isVisible= function(){
		if (homeScreen)
			return homeScreen.isVisible();
		return false;
	}
	
	/**
	 * @return {Ext.Panel} the homescreen's panel
	 */
	this.getPanel= function(){
		return homeScreen;
	}
};

Ext.cruise.client.SPARQLResultXMLReader= Ext.extend(Ext.data.DataReader, {
	read: function(rets){
		var ret= [];
		if (rets.length!=1) return ret;
		var sparqlRes= Ext.cruise.client.Utility.parseXMLFromString(rets[0].textContent);
		var results= sparqlRes.getElementsByTagName('result');
		for (var idx=0; idx< results.length; ++idx){
			var bindings= results[idx].getElementsByTagName('binding');
			if (bindings.length==0) continue;
			
			var config= {};
			for (var j=0; j< bindings.length; ++j){
				var binding= bindings[j], valueNode;
				
				for(var k=0; k< binding.childNodes.length; ++k){
					var child= binding.childNodes[k];
					if (child.nodeType==1){//Element node
						if (child.localName=='uri' || child.localName =='literal'){
							valueNode= child;
							break;
						}
					}
				}
				config[binding.getAttribute('name')]= valueNode.firstChild.nodeValue;
			}
			
			ret.push(new Ext.cruise.client.ApplicationManager.ListEntry(config));
		}
		return {
			success: true,
			records: ret,
			totalRecords: ret.length
		};
	}	
});