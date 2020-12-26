/**
 * @author <a href="mailto:stefan.pietschmann">Stefan Pietschmann</a>
 * @author Carsten Radeck
 * @author Johannes Waltsgott
 * @class Ext.cruise.client.ApplicationManager
 * <p> This is the central manager class of the runtime environment. It starts all the other managers, registers the system event channels,
 * and initializes the interpretation of the application's composition model or delegates sub tasks to other manager components, respectively. 
 * Furthermore it provides access to the Logger (using log4javascript) and is responsible for the persistent storage of application state information (using PersistJS library).</p>
 * 
 * <p> To initialize the runtime programmatically a configuration object has to be handed over to the constructor (see config options).<br/>
 *     Applications built for 1.7 and earlier versions of the TSR should use the minimal settings exemplified in the following.</p>
 * <code><pre>
applicationManagerInstance = new Ext.cruise.client.ApplicationManager({
		modelURL: "http://localhost:8080/StockMash/StockDemo.ccm",
		coreURL: "http://localhost:8080/CoRe/services/CoReService",
		msURL: "http://localhost:8080/MediationService/services/MediationService",
		animate: true
	});
 * </pre></code>
 * <p>Afterwards, the application manager's <i>run</i> method has to be called.</p>
 * <code><pre>
 applicationManagerInstance.run();
 * </pre></code>
 */
Ext.namespace("Ext.cruise.client");
Ext.cruise.client.ApplicationManager = Ext.extend(Object, {
	log: null,

	// instances of TSR's managers and modules
	integrationManager: null,
	componentManager: null,
	serviceAccess: null,
	coordinationManager: null,
	adaptationManager: null,
	eventBroker: null,
	layoutManager: null,
	recommendationManager: null,
	applicationContext: null,
	screenflowManager: null,
	mediator: null,
	
	coreURL: null,
	compreURL: null,
	msURL: null,
	
	//composition metadata
	compositionVersion: null,
	compositionId : null,
	compositionName : null,
	currentTimestamp : null,

	/**
	 * @cfg {Boolean} animate States if animations should be used or not, e.g. by component proxies to indicate incoming events on the UI.
	 */
	animate: false,
	homeScreen: null,
	
	/* the composition model (in DOM representation)*/
	ccm: null,
	
	userID: null,
	
	
	/**
	 * Constructor of the ApplicationManager
	 * @constructor
	 * @param {Object} config the configuration object (see config parameters)
	 */
	constructor: function(config){
		Ext.apply(this, config, {
			// default values
			/**
			 * @cfg {String} coreURL
			 * The URL of the Component Repository to be used. Defaults to "http://localhost:8080/repository/services/CoReService"
			 */
			coreURL: "http://localhost:8080/CoRe/services/CoReService",
			/**
			 * @cfg {String} compreURL
			 * The URL of the Composition Repository to be used. Defaults to "http://localhost:8080/CompositionRepository/services/CompReService"
			 */
			compreURL: "http://localhost:8080/CoRe/services/CompReService",
			/**
			 * @cfg {String} msURL
			 * The URL of the Mediation Service to be used. Defaults to "http://localhost:8080/MediationService/services/MediationService"
			 */
			msURL: "http://localhost:8080/MediationService/services/MediationService",
			/**
			 * @cfg {Boolean} showAppFrame
			 * Indicates whether a "toolbar" providing features for loading, saving etc. of applications should be visible. Defaults to false.
			 */
			showAppFrame: false,
			/**
			 * @cfg {Boolean} enableRecommendation
			 * Indicates whether recommendation features for dynamic mashup development should be disabled. Defaults to false.
			 */
			enableRecommendation: false,
			/**
			 * @cfg {Boolean} enableDynamicLayout
			 * Indicates whether the layout of the application should be calculated dynamically or not. Defaults to false.
			 */
			enableDynamicLayout: false,
			/**
			 * @cfg {Boolean} saveOnUnload
			 * Indicates whether the application model should automatically be saved on page exit. Defaults to false.
			 */
			saveOnUnload: false,
			/**
			 * @cfg {Boolean} autoSave
			 * Indicates whether the current composition model is saved whenever it is changed. Only applies if 'showAppFrame' equals true. Defaults to false.  
			 */
			autoSave: false,
			/**
			 * @cfg {Boolean} enableLogging
			 * Indicates whether log messages should be presented. Defaults to true.  
			 */
			enableLogging: true
		});
		
		Ext.cruise.client.ApplicationManager.superclass.constructor.call(this);
		// get new logger
		this.log = log4javascript.getDefaultLogger();
		// set log level
		this.log.setLevel(log4javascript.Level.DEBUG);
		log4javascript.setEnabled(this.enableLogging);
		this.log.info('[AppMan] CRUISe Client Runtime starting...');
		
		// initialize the service access layer
		this.serviceAccess = new Ext.cruise.client.ServiceAccess(this.log);

		// setup the application context shared by all components
		this.applicationContext = new Ext.cruise.client.BaseContext();

		// download the composition model synchronously
		if (this.modelURL && typeof this.modelURL == "string"){
			var xhr= this.serviceAccess.createXHR();
			xhr.open('GET', this.modelURL, false);
			xhr.send();
			if (xhr.readyState==4 && xhr.status!=200){
				//throw "Failed loading composition model from"+config.modelURL+"!";
				//this.initializeEmptyCCM();
				this.ccm= null;
			} else {
				this.ccm = Ext.cruise.client.Utility.getXMLDOMFromXHR(xhr);
			}
		} else {
			this.showAppFrame= true;
			this.ccm= null;
			if (sessionStorage && typeof sessionStorage.currentApp == "string"){
				this.ccm= Ext.cruise.client.Utility.parseXMLFromString(sessionStorage.currentApp);
			}
		}

		// instantiate and initialize the platform components
		this.eventBroker = new Ext.cruise.client.EventBroker(this.log);
		this.integrationManager = new Ext.cruise.client.IntegrationManager(this.coreURL, this.log, this.eventBroker, this.serviceAccess);
		this.adaptationManager = new Ext.cruise.client.AdaptationManager(this.log, this.eventBroker);
		this.coordinationManager = new Ext.cruise.client.CoordinationManager(this.eventBroker, this.log);
		this.componentManager = new Ext.cruise.client.ComponentManager(this.log, this.eventBroker, this.integrationManager, this.adaptationManager, this.serviceAccess, this.coordinationManager);
		this.mediator = new Ext.cruise.client.Mediator(this.log, this.serviceAccess, this.msURL);
		this.layoutManager= new Ext.cruise.client.LayoutManager(this.log, this.componentManager, this.getAppMenu(), this.enableDynamicLayout);
		this.recommendationManager= new Ext.cruise.client.RecommendationManager(this.eventBroker, this.serviceAccess, this.componentManager, this.coreURL, this.log);
		this.screenflowManager= new Ext.cruise.client.ScreenflowManager(this.log,this.componentManager,this.ccm,this.layoutManager);
		this.eventBroker.setScreenflowManager(this.screenflowManager);
		
		
		// register the specified system channels
		this.registerSystemChannels([ 
			{id:'errorChannel', type:'object'},
			{id:'codeReceivedChannel', type:'object'},
			{id:'runtimeChannel', type:'object'},
			{id:'componentLCChannel', type:'object'},
			{id:'adaptabilityChannel', type:'string'}
		]);
		/* add system events to channels */
		this.eventBroker.addEventToChannel('codeReceived', 'object', 'codeReceivedChannel');
		this.eventBroker.addEventToChannel('componentInitialized', 'object', 'componentLCChannel');
		this.eventBroker.addEventToChannel('IntegrationError', 'object', 'errorChannel');
		this.eventBroker.addEventToChannel('AccessDeniedError', 'object', 'errorChannel');
		this.eventBroker.addEventToChannel('NotFoundError', 'object', 'errorChannel');
		this.eventBroker.addEventToChannel('InstantiationError', 'object', 'errorChannel');
		this.eventBroker.addEventToChannel('InitError', 'object', 'errorChannel');
		this.eventBroker.addEventToChannel('integrationFinished', 'object', 'runtimeChannel');
		/* system channels for adaptability */
		this.eventBroker.addEventToChannel('componentMinimized', 'object', 'adaptabilityChannel');
		this.eventBroker.addEventToChannel('componentRestored', 'object', 'adaptabilityChannel');
		this.eventBroker.addEventToChannel('componentRemoved', 'object', 'adaptabilityChannel');
		this.eventBroker.addEventToChannel('compositionExtended', 'object', 'adaptabilityChannel');
		/* register system event handler */
		this.eventBroker.subscribe(undefined, undefined, 'object', 'codeReceivedChannel', this.componentManager.processSMCDL, this.componentManager);
		this.eventBroker.subscribe(undefined, undefined, 'object', 'errorChannel', this.handleError, this);
		
		/* initialize array for version representation */
		this.compositionVersion = [0,0];
		
		/* register onUnload event handler */
		Ext.EventManager.on(window, 'unload', function(){
			if (this.saveOnUnload==true){
				if (this.homeScreen!=null && !this.homeScreen.isVisible())
					this.buildImplicitSaveRequest();
			}
			if (sessionStorage){
				if (!this.getHomeScreen().isVisible())
					//sessionStorage.currentApp = Ext.cruise.client.Utility.serializeXML(this.ccm);
					sessionStorage.currentApp= this.serializeCCM(this.compositionVersion[0] + '.' + this.compositionVersion[1] + '.' + new Date().getTime());
				else
					sessionStorage.removeItem("currentApp");
			}
		}, this);
	},
	
	/**
	 * Start the platform.
	 * @public
	 */
	run: function(){
		var loggedIn= false;
		if (localStorage){
			var name= localStorage.logInName;
			var ts= localStorage.logInExpires;
			if (name && ts){
				if (new Date().getTime()-ts < 0){
					loggedIn= true;
					localStorage.logInExpires= new Date().getTime()+1800000;
					this.setUserID(name);
				}else {
					localStorage.removeItem("logInName");
					localStorage.removeItem("logInExpires");
				}
			}
		}
		if (this.showAppFrame==true && !loggedIn){
			// render the login form
			document.body.innerHTML= '<form id="login" name="login" class="login" onsubmit="applicationManagerInstance.authenticate();return false;">'+
				'<a target="_blank" href="http://www.mmt.inf.tu-dresden.de/Forschung/Projekte/EDYRA/index_en.xhtml"><img class="logo" src="http://mashup.dyndns.org:7331/res/1.9/edyra/graphics/logo_200x56.png" /></a>'+
				'<table align="center"><tbody>'+
				'<tr><td align="right"><label for="login_uname">Name:</label></td>'+
					'<td align="left"><input id="login_uname" type="text" name="username"/></td>'+
				'</tr>'+
				'<tr><td align="right"><label for="login_password">Password:</label></td>'+
					'<td align="left"><input id="login_pw" type="password" name="password" />'+
				'</tr>'+
				'<tr><td>&nbsp;</td>'+
					'<td align="left"><input style="min-width:60px" type="submit" name="login" value="Login"/></td>'+
				'</tr></tbody></table>'+
				'</form>';
		}else {
			this.adaptationManager.initialize();
		}
	},
	
	/**
	 * @private
	 */
	authenticate: function(){
		var user= document.getElementById("login_uname").value;
		var pw= document.getElementById("login_pw").value;
		if (utils.trim(user).length==0) return;
		
		var xml= this.serviceAccess.buildSOAPEnvelope("<q0:getAuth><q0:username>"+
				user+"</q0:username>"+
				"<q0:password>"+pw+"</q0:password></q0:getAuth>");
		var xhr= this.serviceAccess.createXHR(this);
		xhr.open('POST', this.coreURL);
		xhr.setRequestHeader("Content-Type","application/soap+xml");
		xhr.onreadystatechange= function(){
			if (xhr.readyState != 4) return;
			if (xhr.status == 200) {
				var respxml = xhr.responseXML;
				if (respxml == null) 
					return;
				var result= Ext.cruise.client.Utility.getElementsByTagNameNS('ns:',Ext.cruise.client.Constants._CORE_NS_,'return',respxml)[0];
				if (result.textContent.indexOf("error")!=-1){
					Ext.MessageBox.alert("Login status", "Username and/or password invalid!");
				}else {
					this.setUserID(user);
					if (localStorage){
						localStorage.logInName= user;
						localStorage.logInExpires= new Date().getTime()+1000*60*30;
					}
					// remove the login form
					var form= document.getElementById("login");
					form.parentNode.removeChild(form);
					// induce application start
					this.adaptationManager.initialize();
				}
			}else {
				Ext.MessageBox.alert("Login status", "Failed to contact the verification service!");
			}
		};
		xhr.send(xml);
	},
	
	/**
	 * Sets an empty composition model instance.
	 * @private
	 */
	initializeEmptyCCM: function(){
		this.compositionId= this.createUniqueId();
		this.compositionName= null;
		this.compositionVersion= [0,0];
		this.ccm= Ext.cruise.client.Utility.parseXMLFromString('<mcm:MashupComposition xmi:version="2.0" xmlns:xmi="http://www.omg.org/XMI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:mcm="'+Ext.cruise.client.Constants._CCM_NS_+'" id="'+this.compositionId+'" name="(new application)" version="0.1"><conceptualModel><components></components></conceptualModel><layoutModel><layout xsi:type="mcm:AbsoluteLayout" name="defaultLayout"><bounds height="500" width="500" unit="pixel"/></layout></layoutModel><screenflowModel initialView="StartView"><view name="StartView" layout="defaultLayout"/></screenflowModel><communicationModel></communicationModel></mcm:MashupComposition>');

		this.updateToolbar(false);
	},
	
	/**
	 * Updates the toolbar aka application menu by setting suitable button states, heading text etc.
	 * 
	 * @param {boolean} isPersistent states whether the current application is already stored or not
	 * @private
	 */
	updateToolbar: function(isPersistent){
		if (!this.showAppFrame) return;

		var hsv= this.homeScreen!=null && this.getHomeScreen().isVisible();
		// update bread crumb
		var label= Ext.getCmp('tb_curr_app_label');
		if (label!=null){
			if (hsv)
				label.update('<span><i>No application loaded</i></span>');
			else
				label.update("<span class=\"appLabel\">"+(this.compositionName||"New mashup application")+":</span>");
		}
		// update button states
		var btn= Ext.getCmp('tb_load_button');
		if (btn!=null){
			if (hsv || !isPersistent) // the homescreen is visible or it is a new and thus not yet saved application
				btn.disable();
			else btn.enable();
		}

		btn= Ext.getCmp('tb_save_button');
		if (btn!=null){
			if (hsv) btn.disable();
			else btn.enable();
		}
		
		btn= Ext.getCmp('tb_remove_button');
		if (btn!=null){
			if (hsv || !isPersistent) btn.disable();
			else btn.enable();
		}
		
		btn= Ext.getCmp('tb_show_homescreen');
		if (btn!=null){
			if (hsv) btn.disable();
			else btn.enable();
		}

		btn= Ext.getCmp('tb_deview_dropdown');
		if (btn!=null){
			if (hsv) btn.disable();
			else btn.enable();
		}
		
		this.appMenu.show();
	},
	
	/** @private*/
	createUniqueId: function(){
		var xml= this.serviceAccess.buildSOAPEnvelope('<q0:getUniqueIDResponse></q0:getUniqueIDResponse>', 'q0', Ext.cruise.client.Constants._COMPRE_NS_);

		// create service access via POST
		var xhr = this.serviceAccess.createXHR(this);
		xhr.open('POST', this.compreURL,false);
		xhr.setRequestHeader("Content-Type","application/soap+xml");

		// sending request
		xhr.send(xml);
 
		return Ext.cruise.client.Utility.getElementsByTagNameNS('ns:',Ext.cruise.client.Constants._COMPRE_NS_,'return',xhr.responseXML)[0].firstChild.nodeValue;
	},
	
	/**
	 * Starts the application, i.e., the integration of components.
	 *
	 * @public
	 * @function
	 */
	startApplication: function(){
		if (this.ccm==undefined || this.ccm==null){
			if (this.showAppFrame==true){
			  	this.getLayoutManager().displayHomeScreen();
			  	this.initSearchPanel();
			  	this.updateToolbar(true);
			}
		} else if (Ext.cruise.client.Utility.getElementsByTagNameNS(Ext.cruise.client.Constants._CCM_NS_IE, Ext.cruise.client.Constants._CCM_NS_,'MashupComposition',this.ccm).length==0){
			var error= "The composition model is invalid: Found no element 'MashupComposition' (in the expected namespace '"+Ext.cruise.client.Constants._CCM_NS_+"').\nCannot start the application.";
			this.log.fatal(error);
			Ext.MessageBox.alert("Application Start",error);
		} else {
			/* read channel definitions from composition model */
			this.registerChannels();

			/* lists all names of components whose integration is still pending */
			var todo= new Array();
	
			var loadMask = new Ext.LoadMask(Ext.getBody(), {
				msg: "Initializing application ...",
				removeMask: true
			});
			loadMask.show();
			
			var log= this.log;
			function integrationMonitor(message){
				try {
					var eventData = message.getBody();
					var id;
					switch (message.getName()) {
						case 'IntegrationError':
							try {
								id = eventData.compConfig.getAttribute("name");
							} 
							catch (asd) {
								log.fatal(asd);
							}
							break;
						case 'AccessDeniedError':
						case 'NotFoundError':
						case 'InstantiationError':
						case 'InitError':
						case 'componentInitialized':
							id = eventData.cid;
						default: ;
					}
	
					if (todo.indexOf(id) != -1) {
						todo.remove(id);
						log.info('[AppMan] Remaining integration tasks:', todo.length);
						
						if (applicationManagerInstance.getIsRecommendationEnabled()==true)
						applicationManagerInstance.queryRating(id, function(xhr){
							if (xhr.readyState == 4 && xhr.status == 200) {
								try{
									var obj= Ext.util.JSON.decode(xhr.responseText);
									if (obj && obj.rating && obj.count){
										// update label and progress bar with users' ratings
										applicationManagerInstance.getRecommendationManager().updateRatingInformation(id,obj.rating,obj.count);
									}
								}catch(exe){}
							}
						}, this);
					}
					if (todo.length == 0) {
						applicationManagerInstance._onIntegrationFinished();
						var ev= applicationManagerInstance.eventBroker;
						
						var msg = new Ext.cruise.client.Message();
						msg.setName('integrationFinished');
						ev.publish(msg, undefined);
						ev.unsubscribe('componentLCChannel', this, this);
						ev.unsubscribe('errorChannel', this, this);
						loadMask.hide();
						loadMask.disable();
						
					}
				}catch(EXE){log.error(EXE);}
			};
	
			/* analyse components for coordination abilities */
			this.coordinationManager.processCCM(this.ccm);
			
			/* extract all components from composition model */
			var components= this.ccm.getElementsByTagName("component");
			for(var idx=0; idx< components.length; ++idx){
				todo.push(components[idx].getAttribute('id'));
			}
			
			if (todo.length!=0){
				this.eventBroker.subscribe(undefined, undefined, 'object','errorChannel', integrationMonitor, integrationMonitor);
				this.eventBroker.subscribe(undefined, undefined, 'object','componentLCChannel', integrationMonitor, integrationMonitor);
				
				/* start integration */
				this.getComponentManager().initializePage(components);
			} else {
				applicationManagerInstance._onIntegrationFinished();
				var ev= applicationManagerInstance.eventBroker;
				
				var msg = new Ext.cruise.client.Message();
				msg.setName('integrationFinished');
				ev.publish(msg, undefined);
				loadMask.hide();
				loadMask.disable();
			}
			
			if (this.showAppFrame==true){
				//subscribe to adaptabilityChannel to realize automatic composition saving when components are removed 
				this.getEventBroker().subscribe(undefined, undefined, 'object', 'adaptabilityChannel', this.monitorComponentActivities, this);
			
				var ccm= Ext.cruise.client.Utility.getElementsByTagNameNS(Ext.cruise.client.Constants._CCM_NS_IE, Ext.cruise.client.Constants._CCM_NS_,'MashupComposition',this.ccm)[0];
				
				// parse ID from ccm or create random id
				this.compositionId =  ccm.getAttribute('id') || this.createUniqueId.call(this);
				
				// parse Name from ccm
				this.compositionName = ccm.getAttribute('name') || '(new application)';
				
				/* parse composition meta data */
				var v= ccm.getAttribute("version");
				if (v!=null){
					this.compositionVersion[0] = v.split(".")[0] || 0;
					this.compositionVersion[1] = v.split(".")[1] || 0;
				}

				this.initSearchPanel();
				
				/*if(components.length==0){
					Ext.MessageBox.alert('Application Start',"The composition '"+this.compositionName+"' includes no components!");
				}*/
				this.updateToolbar(true);
			}
		}// end else
	},
	
	initSearchPanel: function(){
		if (!Ext.getCmp("searchResult_panel"))
			new Ext.Panel({
				renderTo: Ext.getBody(),
				id: 'searchResult_panel',
				baseCls: 'searchResult_panel',
				collapsedCls: 'searchResult_panel_collapsed',
				//header:false,
				//collapsed:true,
				//collapsible: true,
				hidden:true,
				autoHeight: true,
				width: 490,
				style: {
					zIndex: 10000
				},
				tools: [{
					id: "close",
					handler: function(){
						Ext.getCmp("searchResult_panel").hide();
					}
				}],
				tbar: [ new Ext.FormPanel({
					        labelWidth: 25,
							border: false,
					        header: false,
					        buttonAlign: 'left',
					        baseCls: 'searchtoolbar',
					        items: [{
					        		xtype: 'displayfield',
					        		value: 'Number of results: ',
					        		hideLabel: true,
					        		cls: 'toolbartext'
					        	},
					                new Ext.form.SliderField({
					        	id: 'numberOfRecommendations_slider',
					        	cls: 'numberOfRecommendations_slider',
					        	hideLabel: true,
					        	minValue: 1,
					            maxValue: 50,
					            value: 10,
							    tipText: function(thumb){
							    	// caused by error during 'change'-events
							    	// the code for handling them is placed here
							    	// (the function that is called when a tooltip is rendered caused by slider moves)
							    	
							    	var uiCheckbox = Ext.getCmp("isUi_checkbox");
									var serviceCheckbox = Ext.getCmp("isService_checkbox");
									var searchResult = Ext.getCmp("searchResult_panel");
									if(uiCheckbox.rendered && serviceCheckbox.rendered && searchResult.rendered){
										Ext.getCmp("numberOfResultsDisplayField").setValue(String(thumb.value));
										if (!this.task)
					                		this.task= new Ext.util.DelayedTask(function(){
					                			var isUi = uiCheckbox ? uiCheckbox.getValue() : true;
												var isService = serviceCheckbox? serviceCheckbox.getValue() : true;
												applicationManagerInstance.doSearch(searchResult? searchResult.currentSearchTerm : '', isUi, isService, Ext.getCmp("numberOfRecommendations_slider").getValue());
					                			});
					                	this.task.delay(500);	
									}
					                return String(thumb.value) + " results";
					            }
					        }),
					        {
				        		xtype: 'displayfield',
				        		id: 'numberOfResultsDisplayField',
				        		hideLabel: true,
				        		value: '10',
				        		cls: 'toolbartext'
				        	},
					        {
				        		xtype: 'displayfield',
				        		value: 'Component category:',
				        		hideLabel: true,
				        		cls: 'toolbartext_leftmargin'
				        	},
					        {
					        	id: 'isUi_checkbox',
					        	xtype: 'checkbox',
					        	boxLabel: 'UI',
					        	checked: true,
					        	hideLabel: true,
					        	listeners:{
					        		'check' : {
					        			fn: function(view,isUi){
					        				var isService = Ext.getCmp("isService_checkbox").getValue();
					        				// if both checkboxes are empty, show no component proposals
					        				if(!isService && !isUi){
					        					Ext.getCmp('nameIdListView').getStore().removeAll();
					        					var df = Ext.getCmp('nameIdDisplayField');
												df.removeClass('foundIndicatorLabel');
												df.addClass('norlabel');
					        					df.setValue('Please select whether UI and/or Service components should be recommended!');
					        				}else{
					        					// query new component proposals
					        					var max = Ext.getCmp("numberOfRecommendations_slider").getValue();
					        					applicationManagerInstance.doSearch(Ext.getCmp("searchResult_panel").currentSearchTerm, isUi, isService, max == '' ? 10 : max);
					        				}
					        			}
					        		}
					        	}
					        },
					        {
					        	id: 'isService_checkbox',
					        	xtype: 'checkbox',
					        	boxLabel: 'Service',
					        	hideLabel: true,
					        	checked: true,
					        	listeners:{
					        		'check' : {
					        			fn: function(view,isService){
					        				var isUi = Ext.getCmp("isUi_checkbox").getValue();
					        				// if both checkboxes are empty, show no component proposals
					        				if(!isService && !isUi){
					        					Ext.getCmp('nameIdListView').getStore().removeAll();
					        					var df = Ext.getCmp('nameIdDisplayField');
												df.removeClass('foundIndicatorLabel');
												df.addClass('norlabel');
					        					Ext.getCmp('nameIdDisplayField').setValue('Please select whether UI and/or Service components should be recommended!');
					        				}else{
					        					// query new component proposals
					        					var max = Ext.getCmp("numberOfRecommendations_slider").getValue();
						        				applicationManagerInstance.doSearch(Ext.getCmp("searchResult_panel").currentSearchTerm, isUi, isService, max == '' ? 10 : max);
					        				}
					        			}
					        		}
					        	}
					        }
					        ]
					})],
					
				closable: true,
				items: [{
					    	id: 'nameIdDisplayField',
					        xtype: 'displayfield',
					        cls: 'foundIndicatorLabel',
					        value: 'No suitable components found!',
					    },
						new Ext.DataView({
							id: 'nameIdListView',
							store: new Ext.data.Store({
								id: 'dataStore',
								reader: new Ext.cruise.client.SPARQLResultXMLReader(), 	// the reader parsing the results into the required Ext.data.Record instances
								fields: ['name', 'id', 'url', 'docu'],
								proxy: new Ext.cruise.client.SOAPProxy({				// the proxy for the remote access to the data. SOAPProxy is provided by the TSR and allows to communicate with SOAP web services
									url:  "http://localhost:8080/CoRe/services/CoReService"
								}),
								listeners: {
									'beforeload': {
										fn: function(store, options){
											var procLabel= Ext.getCmp('nameIdDisplayField');
											if (procLabel!=undefined && procLabel!=null && procLabel.rendered)
												procLabel.setValue('Searching suitable components...');
										}
									},
									'load': { // defines the reaction in case the store's data base changes (new results delivered by proxy) 
										fn: function(store, record, operation){
											var df = Ext.getCmp('nameIdDisplayField');
											if(store.getCount()==0){
												// correct styling
												df.removeClass('foundIndicatorLabel');
												df.addClass('norlabel');
											}else{
												df.removeClass('norlabel');
												df.addClass('foundIndicatorLabel');
											} 
											
											df.setValue((store.getCount()==0? 'No' : store.getCount()) + ' suitable components found!');
											Ext.getCmp('searchResult_panel').doLayout();
										}
									}
								}
							}),
						    tpl: new Ext.XTemplate(
								    '<tpl for=".">',
							        '<div class="thumb-wrap" id="{id}">',
							        	'<div class="thumb"><img src="{url}" title="{docu}"></div>',
							        	'<p>{name}</p>',
							        '</div>',
							    '</tpl>',
							    '<div class="x-clear"></div>'
							),
						    autoHeight:true,
						    multiSelect: true,
						    overClass:'x-view-over',
						    itemSelector:'div.thumb-wrap',
						    listeners: {
						    	'click': { // handle clicks on items
						    		fn:	function(view, index){
										var entry= view.getStore().getAt(index);
										
										Ext.getCmp("searchResult_panel").hide();
										if (applicationManagerInstance.getHomeScreen().isVisible()){
											//hide home screen
											applicationManagerInstance.getLayoutManager().hideHomeScreen();

											applicationManagerInstance.initializeEmptyCCM();
											applicationManagerInstance.getScreenflowManager().setupInitialView();
										}

										var rdyHandler= {
											handler: applicationManagerInstance.monitorStartApplicationIntegration,
											scope: applicationManagerInstance
										};
										applicationManagerInstance.getRecommendationManager().integrateComponent(
												entry.data.id,
												{
													ready: rdyHandler,
													addSecond: {
														handler: function (id){
															this.getRecommendationManager().integrateComponent(id+"#"+(+new Date()), {
																ready: rdyHandler
															});
														},
														scope: applicationManagerInstance,
														args: [entry.data.id]
													}
												}
											);
									},
									scope: this
						    	}
						    }
						})
				]
			});
		
		/* extend interface by search functions */
		this.doSearch= function(query, uiRequested, serviceRequested, limit){
			applicationManagerInstance.getRecommendationManager().recommendApplicationStart( query||"", Ext.getCmp('nameIdListView').getStore(), uiRequested == undefined ? true : uiRequested, serviceRequested == undefined ? true : serviceRequested, limit == undefined ? 10 : limit);
			var srp= Ext.getCmp("searchResult_panel");
			if (srp!=null){
				srp.currentSearchTerm = query;
				if (srp.rendered){
					var searchPanel= Ext.getCmp("tb_search_panel");
					var p= searchPanel.getPosition();
					srp.getEl().dom.style.left = p[0]+"px";
					srp.getEl().dom.style.top = p[1] + searchPanel.getHeight()+"px";
				}
				srp.show();
			}
		};
		this.search= function(query){
			//minimize rec menu if it is displayed
			this.recommendationManager.minimizeRecommendationMenu();
			var uiCheckbox = Ext.getCmp("isUi_checkbox");
			var serviceCheckbox = Ext.getCmp("isService_checkbox");
			var numberSlider = Ext.getCmp("numberOfRecommendations_slider");
			var isUi = (uiCheckbox && uiCheckbox.rendered) ? uiCheckbox.getValue() : true;
			var isService = (serviceCheckbox && serviceCheckbox.rendered) ? serviceCheckbox.getValue() : true;
			var numberOfResults = (numberSlider && numberSlider.rendered) ? numberSlider.getValue() : 10;
			applicationManagerInstance.doSearch(query,isUi,isService,numberOfResults);
		};
	},
	
	/**
	 * Executes a SOAP service request to the composition repository to retrieve all available stored compositions.
	 * @private
	 */
	executeLoadCompositionsRequest: function(callback, args){
		// build request
		var xml = this.serviceAccess.buildSOAPEnvelope('<q0:listAllCompositionModels/>', 'q0', Ext.cruise.client.Constants._COMPRE_NS_);
		
		// create service access via POST
		var xhr= this.serviceAccess.createXHR(this);
		xhr.open('POST', this.compreURL);
		xhr.setRequestHeader("Content-Type","application/soap+xml");
		// handle call back
		xhr.onreadystatechange= function(){
			if (xhr.readyState == 4 && xhr.status == 200) {
				var respxml = xhr.responseXML;
				if (respxml == null) 
					return;
				var result = Ext.cruise.client.Utility.getElementsByTagNameNS('ns:',Ext.cruise.client.Constants._COMPRE_NS_,'return',respxml);
				if(result[0] == null || result[0] == undefined || result[0].getAttribute("xsi:nil") == 'true'){
					var errorMessage = 'No stored compositions available!';
					this.log.error('[AppMan]' + errorMessage);
					// display message
					Ext.MessageBox.alert('Status', errorMessage);
				} else {
					try {
						callback.call(this, result, args);
					}catch(E){this.log.error(E);}
				}
			}else if(xhr.status == 500){
				//hide loadMask for recommendation menu if server won't find any recommendations (caused by an error)
				var errorMessage = 'server error during request for loading';
				this.error('[AppMan]' + errorMessage);
				Ext.MessageBox.alert('Status', errorMessage);
			}
		};
		// sending request
		xhr.send(xml);
	},
	
	/**
	 * Monitoring the successfully integration of components integrated at application start.
	 * @private
	 */
	monitorStartApplicationIntegration: function(message){
		// check for integration finished event
		if (message.getName()=="componentInitialized"){
			
			var cid= message.getBody().cid;
			if (applicationManagerInstance.getComponentManager().isUIC(cid)) {
				setTimeout(function(){
					applicationManagerInstance.getLayoutManager().addComponent(cid, applicationManagerInstance.getComponentManager().getAdaptabilityPanel(cid));
					// publish message
					var msg = new Ext.cruise.client.Message();
					msg.setName('compositionExtended');
					msg.appendToBody('cid', cid);
					applicationManagerInstance.getEventBroker().publish(msg, undefined);
				}, 30);
			}
			
			if (this.getIsRecommendationEnabled()){
				// update rating infos
				this.queryRating(cid, function(xhr){
					if (xhr.readyState == 4 && xhr.status == 200) {
						try {
							var obj= Ext.util.JSON.decode(xhr.responseText);
							if (obj && obj.rating && obj.count){
								// update label and progress bar with users' ratings
								setTimeout(function(){
									applicationManagerInstance.getRecommendationManager().updateRatingInformation(cid,obj.rating,obj.count);									
								},500);
							}
						} catch(exe){}
					}
				}, this);
			}
			
			applicationManagerInstance.getRecommendationManager().busyIndicator.hide();
			
			// unsubscribe integration function from system error channel to avoid future calls
			applicationManagerInstance.getEventBroker().unsubscribe('componentLCChannel', this.monitorStartApplicationIntegration, this); 
		}
	},
	
	/**
	 * Enables automatic saving of compositions when removing or adding components
	 * @private
	 * @param{Object} message a system event message 
	 */
	monitorComponentActivities: function(message){
		if (message.getName()=="componentRemoved" || message.getName() == "compositionExtended"){
			//build and send implicit save request
			if (this.autoSave==true)
				try{this.buildImplicitSaveRequest();}catch(R){}
			this.recommendationManager.hideRecommendationMenu();
		}
	},

	/**
	 * Closes the current application. This includes resetting all TSR components. 
	 */
	closeApplication: function(){
		try {
			this.adaptationManager.reset();
			this.componentManager.reset();
			this.eventBroker.reset();
			this.mediator.reset();
			this.layoutManager.reset();
			this.recommendationManager.reset();
			delete this.ccm;
			this.applicationContext= new Ext.cruise.client.BaseContext();
		}catch(exe){this.log.error(exe);}
	},
	
	/** Internal callback method. Called when all components are integrated. @private */
	_onIntegrationFinished: function(){
		this.log.debug("[AppMan] Application start took",(+new Date()-start));
		setTimeout(function(){
            applicationManagerInstance.getScreenflowManager().setupInitialView();
			//applicationManagerInstance.interpreteLayout();
		},25);
		
		setTimeout(function(){
			applicationManagerInstance.executeInitialInvocations();					
		}, 50);
	},
	
	/**
	 * Method to handle system error events.
	 *
	 * @function
	 * @param {Ext.cruise.client.Message} message a message object representing the error event
	 */
	handleError: function(message){
		var error = message.getBody();
		switch(message.getName()){
			case 'IntegrationError':
				this.log.error('[AppMan] Integration failed! ',error);
				this.recommendationManager.busyIndicator.hide();
				break;
			case 'AccessDeniedError':
				alert('[AppMan] Please check the authentication ' + error.user + ', ' + error.pass + 'for the service ' + error.url);
				break;
			case 'NotFoundError':
				alert('[AppMan] Requested respource not found: ' + error.url);
				break;
			case 'InstantiationError':
				this.log.error('[AppMan] Instantiation failed! ',error);
				break;
			case 'InitError':
				break;
		}
	},
	
	/**
	 * Queries the composition model for any specified initial invocation of operations, parses the
	 * information and hands them over to the {@link ComponentManager#invokeOperation}.
	 * @private
	 */
	executeInitialInvocations: function(){
		var invocations= this.ccm.getElementsByTagName("invokeOperation");
		for (var idx=0, limit= invocations.length; idx < limit; ++idx){
			var invoc= invocations[idx];
			
			var component=null, operation=null;
			var parameters= {};//[];
			var pelems= invoc.getElementsByTagName('parameterValue');
			var erg, pelem, value, param;
			/* build the parameter list */
			for( var p=0, length= pelems.length; p< length; ++p ){
				pelem= pelems[p];
				value= pelem.getAttribute('value');
				param= pelem.getAttribute('parameter');
				
				var i1= param.indexOf("'")+1;
				var i2= param.indexOf("'", i1);
				var i3= param.indexOf("'", i2+1)+1;
				var i4= param.indexOf("'", i3);
				var i5= param.indexOf("'", i4+1)+1;
				var i6= param.indexOf("'", i5);
				
				if (i1==0 || i2==-1 || i3==0||i4==-1||i5==0||i6==-1){
					this.log.error("[AppMan] Invalid publisher-reference!",operationAttribute);
					break;
				}
				
				var parameter= param.substring(i5,i6);
				if (component==null){ /* the component and operation names need to be extracted only once */
					component= param.substring(i1,i2);
				}
				if(operation== null){
					operation= param.substring(i3,i4);
				}
				//parameters.push(value);
				parameters[param.substring(i5,i6)] = value;
			}
			/* delegate the execution to the component manager */
			this.getComponentManager().invokeOperation(component, operation, parameters);
		}
		this.log.info("[AppMan] All initial invocations done.");
	},
	
	/**
	 * @return reference to the composition model represented as DOM document
	 */
	getCompositionModel: function(){
		return this.ccm;
	},

	/**
	 * @return the id of the application user
	 */
	getUserID: function(){
		return this.userID;
	},
	
	/**
	 * @param {String} userID the user id 
	 */
	setUserID: function(userID){
		if (userID!=undefined && userID != null && utils.trim(userID).length!=0){
			this.userID= userID;
			this.applicationContext.setAttribute("currentUser", userID);
		}
	},
	
	/**
	 * @return {Ext.cruise.client.LayoutManager} the current layout manager.
	 */
	getLayoutManager: function(){
		return this.layoutManager;
	},
	
	/**
	 * @return {Ext.cruise.client.RecommendationManager} the current recommendation manager.
	 */
	getRecommendationManager: function(){
		return this.recommendationManager;
	},

	/**
	 * Gets the logger
	 * @return {Object} log the instance of the logger
	 */
	getLog: function(){
		return this.log;
	},
	
	/**
	 * @return {Ext.cruise.client.Mediator} the mediator
	 */
	getMediator: function(){
		return this.mediator;
	},
	
	/**
	 * Gets the IntegrationManager.
	 * @return {Ext.cruise.client.IntegrationManager} the instance of the IntegrationManager
	 */
	getIntegrationManager: function(){
		return this.integrationManager;
	},

	/**
	 * Gets the ComponentManager.
	 * @return {Ext.cruise.client.ComponentManager} the instance of the <code>ComponentManager</code>
	 */
	getComponentManager: function(){
		return this.componentManager;
	},

	/**
	 * Gets the ServiceAccess Manager.
	 * @return {Ext.cruise.client.ServiceAccess} the instance of the ServiceAccessManager
	 */
	getServiceAccess: function(){
		return this.serviceAccess;
	},

	/**
	 * Gets the AdaptationManager.
	 * @return {Ext.cruise.client.AdaptationManager} the instance of the AdaptationManager
	 */
	getAdaptationManager: function(){
		return this.adaptationManager;
	},
	
	/**
	 * Gets the ApplicationContext.
	 * @return {Ext.cruise.client.BaseContext} the instance of the ApplicationContext
	 */
	getApplicationContext: function(){
		return this.applicationContext;
	},

	/**
	 * Gets the EventBroker.
	 * @return {Object} EventBroker the instance of the EventBroker
	 */
	getEventBroker: function(){
		return this.eventBroker;
	},

	/**
	 * Returns the ScreenflowManager.
	 *
	 * @public
	 * @function
	 * @return {object} ScreenflowManager the instance of the ScreenflowManager
	 */
	getScreenflowManager: function() {
		return this.screenflowManager;
	},
	
	/**
	 * Gets the CoordinationManager.
	 * @return {Ext.cruise.client.CoordinationManager} the instance of the <code>CoordinationManager</code>
	 */
	getCoordinationManager: function(){
		return this.coordinationManager;
	},
	
	/**
	 * @return {boolean} states if the application menu is displayed
	 */
	getIsAppFrameEnabled: function(){
		this.appMenu;
	},
	
	/**
	 * @return {boolean} states if animations should be used, e.g by proxies to indicate incoming events
	 */
	getIsAnimationEnabled: function(){
		return this.animate;
	},
	
	/**
	 * @return {boolean} states whether recommendation features are enabled or not
	 */
	getIsRecommendationEnabled: function(){
		return (this.enableRecommendation == true);
	},
	
	/**
	 * @return {boolean} states whether dynamic layout features are enabled or not
	 */
	getDynamicLayoutEnabled: function(){
		return (this.enableDynamicLayout == true);
	},
	
	/**
	 * @param {boolean} animate states that animations should be used or not, e.g by proxies to indicate incoming events
	 */
	setIsAnimationEnabled: function(animate){
		this.animate= (animate===true);
	},
	
	/**
	 * @return {String} the component repository's URL
	 */
	getCoreURL: function(){
		return this.coreURL;
	},
	/**
	 * @return {String} the composition repository's URL 
	 */
	getCompreURL: function(){
		return this.compreURL;
	},
	
	/**
	 * Returns the application menu in top of the composition canvas
	 * 
	 * @return{Object} the application menu
	 */
	getAppMenu: function(){
		if (this.showAppFrame){
			if (this.appMenu==undefined||this.appMenu==null){
				Ext.QuickTips.init();
				
				var mainMenu = new Ext.menu.Menu({
				        id: 'mainMenu'});
				
				var metaMenu = new Ext.menu.Menu({
			        id: 'mainMenuMetaVis',
			        style: {
			            overflow: 'visible'     // For the Combo popup
			        },
			        items: [
			            {
			                text: 'UI',
			                id:'mainMenuMetaVisUI',
			                checked: false,
			                scope: this,
			                checkHandler: function(element,status){
			                	if(status){
			                		this.coordinationManager._metaVisUI();
			                	}else{
			                		this.coordinationManager._removeMetaVisUI();
			                	}
			                }
			            },
			            {
			                text: 'Service',
			                id: 'mainMenuMetaVisService',
			                checked: false,
			                scope: this,
			                checkHandler: function(element,status){
			                	if(status){
			                		this.coordinationManager._metaVisService();
			                	}else{
			                		this.coordinationManager._removeMetaVisService();
			                	}	
			                }
			             },
			             {
			            	 text: 'Show Data Semantics',
			            	 checked: false,
			            	 scope: this,
			            	 checkHandler: function(element, status){
			            		 this.coordinationManager.setShowSignatures(status);
			            	 }
			             }
			        ]
			    });
				
				this.appMenu=new Ext.Toolbar({
					id: 'applicationMenu',
				    width: '100%',
					baseCls: 'applicationMenu',
					hidden: true,
				    items: [
				        {
				        	id: 'tb_show_homescreen',
				        	text: 'Home',
				        	tooltip: "Return to the start page",
				        	disabled: true,
				        	cls: 'appMenuItem',
				        	overCls: 'appMenuItem_over',
				        	listeners: {
				        		'click': {
				        			scope: this,
				        			fn: function(){
				        				Ext.Msg.show({
				        					   title: 'Save Changes?',
				        					   msg: 'The current application will be closed. Would you like to save it?',
				        					   buttons: Ext.Msg.YESNOCANCEL,
				        					   fn: function(buttonId){
													if (buttonId == 'cancel') return;
													if (buttonId == 'yes'){
														if (this.compositionName == null){ // indicates that this application is not yet persistent -> "save as" semantics
															this.displaySaveDialog(function(name, version){
																this.buildExplicitSaveRequest(name, version);
																applicationManagerInstance.getCoordinationManager()._removeMetaVisService();
																applicationManagerInstance.getCoordinationManager()._removeMetaVisUI();
																applicationManagerInstance.closeApplication();
																setTimeout(function(){
																	applicationManagerInstance.getRecommendationManager().hideRecommendationMenu();
																	applicationManagerInstance.getLayoutManager().displayHomeScreen();
																	applicationManagerInstance.updateToolbar(false);
																},100);
															}, this);
															return;
														} else { // this app is already persistent -> "save" semantics
															this.buildImplicitSaveRequest();
														}
													}
													applicationManagerInstance.getCoordinationManager()._removeMetaVisService();
													applicationManagerInstance.getCoordinationManager()._removeMetaVisUI();
													applicationManagerInstance.closeApplication();
													setTimeout(function(){
														applicationManagerInstance.getRecommendationManager().hideRecommendationMenu();
														applicationManagerInstance.getLayoutManager().displayHomeScreen();
														applicationManagerInstance.updateToolbar(false);
													},100);
				        					   },
				        					   scope: this,
				        					   icon: Ext.MessageBox.QUESTION
				        					});
				        			}
				        		}
				        	}
				        },{xtype: 'tbseparator', height: 40},
				        {
				        	id: 'tb_curr_app_label',
				        	html: '<span><i>No application loaded</i></span>',
				        	xtype: 'label'
				        },{
				        	id: 'tb_save_button',
				            text: 'Save',
				            tooltip: "Save the currently opened application",
				            disabled: true,
				        	listeners: {
				        		'click': {
				        			scope: this,
				        			fn: function(){
				        				this.displaySaveDialog(this.buildExplicitSaveRequest,this);
				        			}
				        		}
				        	}
				        },{
				        	id: 'tb_remove_button',
				            text: 'Remove',
				            tooltip: "Remove the currently opened application",
				            disabled: true,
				        	listeners: {
				        		'click': {
				        			scope: this,
				        			fn: function (){
				        				Ext.Msg.confirm("Confirmation required", "The application and all of its versions will be removed. Do you want to proceed?", function(btnId){
				        					if (btnId=="yes")
						        				this.removeComposition();
				        				}, this);
				        			}
				        		}
				        	}
				        },{
				        	id: 'tb_load_button',
				            text: 'Load Version',
				            tooltip: "Load a certain version of the currently opened application",
				            disabled: true,
				        	listeners: {
				        		'click': {
				        			scope: this,
				        			fn: function(){
			        					//Send request to get all available composition versions from server and display selction dialog
				        				var loadDialog = this.getStorageDialog();
				        				loadDialog.title = 'Load a Composition';
				        				loadDialog.show();
				        				this.executeLoadVersionsServiceRequest(this.compositionId,loadDialog);
				        			}
				        		}
				        	}
				        }, '-',
						new Ext.form.FormPanel({
							id: 'tb_search_panel',
							baseCls: 'search_panel',
							border: false,
							header: false,
							//hidden: true,
							hideLabel: true,
							width: 300,
							items:[{
								id:'tb_desiredTextField',
								xtype: 'textfield',
								emptyText: "What do you want to do?",
								enableKeyEvents: true,
								listeners: {
									keyup: {
										fn: function(tfield, e){
							                if (e.getKey() == e.ESC) {
							                	Ext.getCmp("searchResult_panel").hide();
							                }else {
							                	if (Ext.getCmp("tb_desiredTextField").getValue().length==0)
							                		return;
							                	if (!this.task)
							                		this.task= new Ext.util.DelayedTask(function(){
							                			applicationManagerInstance.search(Ext.getCmp("tb_desiredTextField").getValue());});
							                	this.task.delay(500);
							                }
										}
									}
					            }
							}],
							html: {
								tag: 'span',
								onclick: "applicationManagerInstance.search(Ext.getCmp('tb_desiredTextField').getValue())",
								cls: "searchBtnIcon"
							}
						}),	 '->', {
		            		text: 'DeView',
		            		id : 'tb_deview_dropdown',
		            		menu: metaMenu,
		            		tooltip: "Allows to investigate and manipulate the application's control and data flow"
		        		},{
							xtype: 'label',
							html: '<a target="_blank" href="http://www.mmt.inf.tu-dresden.de/Forschung/Projekte/EDYRA/index_en.xhtml" ><img class="logo_small" src="http://mashup.dyndns.org:7331/res/1.9/edyra/graphics/logo_200x56.png"/></a>'
						}
				    ]
				});
				this.appMenu.add(mainMenu);
			}
		}
		return this.appMenu;
	},
	
	/**
	 * This function fills the dialog for loading a composition using a tree panel
	 * @private
	 * @param{Object} result an object containing all available version strings
	 */
	fillVersionsOverview: function(cid, result, dialog){
		//initialize result data set (number of versions)
		var resultData = {};
		//initialize root node for tree panel
		var rootNode = new Ext.tree.TreeNode();
		rootNode.setText(cid);
		
		// iterate through responded verions to fill the resultData object
		for ( var d = 0; d < result.length; d++) {
			//get version number
			var version = result[d].firstChild.nodeValue;
			var splittedVersion = version.split(".");

			// fill object like resultData[firstVersion][secondeVersion][{timestamp1},{timestamp2},..]
			if(splittedVersion.length==3){
				if(resultData[splittedVersion[0]] == undefined){
					resultData[splittedVersion[0]] = {};
				}
				if(resultData[splittedVersion[0]][splittedVersion[1]] == undefined){
					resultData[splittedVersion[0]][splittedVersion[1]] = new Array();
				}
				resultData[splittedVersion[0]][splittedVersion[1]].push(splittedVersion[2]);								
			}			
		}
		
		// now create nodes for the TreePanel
		for ( var firstElement in resultData) {
			//create first order node -> 0.?.??
			var firstVersionNumberNode = new Ext.tree.TreeNode({
				expanded: true, 
				singleClickExpand: true,
				text : 'Version: ' + firstElement
			});
			for ( var secondElement in resultData[firstElement]) {
				//create second order node -> 0.1.??
				var secondVersionNumberNode = new Ext.tree.TreeNode({
					text : firstElement + '.' + secondElement,
				});
				for ( var timeElement in resultData[firstElement][secondElement]) {
					if(timeElement < resultData[firstElement][secondElement].length){
						//create third order node -> 0.1.123 and append
						secondVersionNumberNode.appendChild(
								new Ext.tree.TreeNode({
									text : (new Date(parseFloat(resultData[firstElement][secondElement][timeElement]))).format('F j, Y, H:i:s'),
								    versionString : firstElement + '.' + secondElement + '.' + resultData[firstElement][secondElement][timeElement],
								    compositionId : cid,
								    leaf: true
								})
						);	
					}
				}
				// append second order node to first order node
				firstVersionNumberNode.appendChild(secondVersionNumberNode);
			}
			// append first order node to rootNode
			rootNode.appendChild(firstVersionNumberNode);
		}
		
		var contentWidth = dialog.getInnerWidth();
		// create new tree panel
	    var tree = new Ext.tree.TreePanel({
	        collapsible: false,
	        id: 'versionTreePanel',
	        header: false,
	        width: contentWidth,
	        heigth:200,
	        autoScroll: true,
	        split: true,
	        rootVisible: false,
	        border: false
	    });
	      
	    //add root node
	    tree.setRootNode(rootNode);
	    tree.getSelectionModel().on("selectionchange", function(selmodel, node){
	    	if (node && node.attributes.leaf && node.attributes.versionString && node.attributes.compositionId ){
	    		this.loadCompositionModel(node.attributes.compositionId, node.attributes.versionString ,dialog);
	    	}
	    }, this);
	    // add tree to dialog
		dialog.add(tree);

		//render dialog
		setTimeout(function(){
			dialog.doLayout();
		},200);		
	},

	/**
	 * @private
	 * Send request to get all available composition versions from server and display selction dialog
	 */
	removeComposition: function(){
		var xml= this.serviceAccess.buildSOAPEnvelope('<q0:removeCompositionModel><q0:id><![CDATA[' + this.compositionId + ']]></q0:id></q0:removeCompositionModel>', 'q0', Ext.cruise.client.Constants._COMPRE_NS_);
		var xhr = this.serviceAccess.createXHR(this);
		xhr.open('POST', this.compreURL);
		xhr.setRequestHeader("Content-Type","application/soap+xml");
		xhr.onreadystatechange= function(){
			if (xhr.readyState != 4) return;
			if (xhr.status == 200) {
				var respxml = xhr.responseXML;
				if (respxml == null) return;
				var result = Ext.cruise.client.Utility.getElementsByTagNameNS('ns:',Ext.cruise.client.Constants._COMPRE_NS_,'return',respxml)[0];
				if (utils.trim(result.textContent) == "true"){
					// seemingly removing was successful -> return to the homescreen
					applicationManagerInstance.closeApplication();
					setTimeout(function(){
						applicationManagerInstance.getLayoutManager().displayHomeScreen();
						applicationManagerInstance.updateToolbar(false);
					},100);
				}else {
					Ext.MessageBox.alert("Status", "Unable to remove the application!");
				}
			}else {
				this.log.warn("[AppMan] Failed to remove composition. Received response status code:",xhr.status);
			}
		};
		xhr.send(xml);
	},
	
	/**
	 * Loads the version of the composition model selected in the tree panel
	 * @private
	 * @param{String} id the id of the composition to load
	 * @param{String} version the desired version of the composition (null equals the latest version)
	 * @param{Object} dialog the dialog window in which includes the tree panel
	 */
	loadCompositionModel: function(id, version, dialog){
		applicationManagerInstance.getRecommendationManager().hideRecommendationMenu();
		applicationManagerInstance.getLayoutManager().hideHomeScreen();
		
		var _xml = '<q0:getCompositionModel><q0:id><![CDATA[' + id + ']]></q0:id>';
		if(version!=null) _xml += '<q0:version><![CDATA[' + version + ']]></q0:version>';
		_xml += '</q0:getCompositionModel>';
		var xml= this.serviceAccess.buildSOAPEnvelope(_xml, 'q0', Ext.cruise.client.Constants._COMPRE_NS_);
		
		// create service access via POST
		var xhr = this.serviceAccess.createXHR(this);
		xhr.open('POST', this.compreURL);
		xhr.setRequestHeader("Content-Type","application/soap+xml");
		var log = applicationManagerInstance.getLog();
		xhr.onreadystatechange= function(){
			if (xhr.readyState == 4 && xhr.status == 200) {
				var respxml = xhr.responseXML;
				if (respxml == null){
					this.log.warn('[AppMan] No composition model for given id found! ')
					Ext.MessageBox.alert('Status', ' No composition model for given id found!');
					return;
				}
				var result = Ext.cruise.client.Utility.getElementsByTagNameNS('ns:',Ext.cruise.client.Constants._COMPRE_NS_,'return',respxml)[0];
				if (result.getAttribute("xsi:nil") == 'true') {
					Ext.MessageBox.alert('Status', ' No composition model for given id found!');
					this.log.error('[AppMan]', errorMessage);
				} else {
					try {
						try{
							this.closeApplication();
						}catch(EEEE){
							this.log.fatal(EEEE);
						}

						var that= this;
						setTimeout(function(){
							try{
								var xhrccm = Ext.cruise.client.Utility.parseXMLFromString(result.textContent);
							 	that.ccm = xhrccm;
								that.adaptationManager.initialize();
								that.updateToolbar(true);
							}catch(EEEEE){
								that.log.fatal(EEEEE);
							}
							if(dialog != null && dialog.id == "storageDialog" && dialog.isVisible() )
								dialog.destroy();
						},1000);
						
					}catch(E){this.log.error(E);}
				}
			}else if(xhr.status == 500){
				//hide loadMask for recommendation menu if server won't find any recommendations (caused by an error)
				var errorMessage = 'server error during request for loading';
				this.log.error('[AppMan]', errorMessage);
				Ext.MessageBox.alert('Status', errorMessage);
			}
		};
		xhr.send(xml);
	},
	
	/**
	 * @private
	 * @return dialog the dialog as Ext.Window
	 */
	getStorageDialog: function(){
		return new Ext.Window({
				id : 'storageDialog',
				width:400,
				height:400,
				modal : true,
				bodyCssClass : "storageDialog_css"
			});
	},
	
	/**
	 * Displays the storage dialog
	 * @private 
	 */
	displaySaveDialog: function(onSaveHandler, scope){
		//get generic dialog container 
		var storageDialog = this.getStorageDialog();
		
		// add necessary buttons
		storageDialog.addButton({
			id : 'save_button',
			text : 'Save',
			disabled: true
		},function(){
			var name= Ext.getCmp("name_textfield").getValue() || this.compositionName;
			var version = Ext.getCmp("version_textfield").getValue() || this.getCompositionVersion(true);
			onSaveHandler.call(scope, name, version);
		}, this);
		
		storageDialog.addButton({
			id : 'abort_button',
			text : 'Abort'
		}, function() {
			Ext.getCmp('storageDialog').destroy();
			//this.StorageDialog(Ext.getCmp('storageDialog'));
		}, this);
		
		storageDialog.title = 'Save Composition';
		
		//add specific content
		storageDialog.add(
			new Ext.FormPanel({
			    items: [{
			    	id: 'id_label',
			        xtype: 'label',
			        fieldLabel: 'ID',
			        text: this.compositionId,
					style: {
							'margin': '2px 0px 2px 5px'
					}
			    },{
			    	id: 'timestamp_label',
			        xtype: 'label',
			        fieldLabel: 'Timestamp',
			        text: this.getFormattedTimestamp(),
					style: {
						'margin': '2px 0px 2px 5px'
					}
			    },{
			    	id: 'version_textfield',
			        xtype: 'textfield',
			        fieldLabel: 'Version',
			        value: this.getCompositionVersion(true),
			        validator: function(val){
			        	if (!val.match(/\d+\.\d+/)) return "Invalid syntax";
			    		var split= val.split(".");
			    		var cur= scope.compositionVersion;
			    		if (split.length!=2 || split[0] < cur[0] || (split[1] <= cur[1] && split[0] == cur[0]))
			    			return "Invalid version";
			    		// TODO double check with all existing versions, since the current might be an old one 
			    		return true;
			        },
			        scope: this,
			        listeners: {
			        	invalid: function(){
			        		Ext.getCmp("save_button").disable();
			        	},
			        	valid: function(){
			        		Ext.getCmp("save_button").enable();
			        	}
			        }
			    },{
			    	id: 'name_textfield',
			        xtype: 'textfield',
			        fieldLabel: 'Name',
			        value: this.compositionName
			    }]
			})			
		);
		
		//display dialog
		storageDialog.doLayout();
		storageDialog.show();
	},
	
	/**
	 * Builds a save request implicitly occured, for example when adding a component.
	 * @private
	 */
	buildImplicitSaveRequest : function(){
		this.log.debug("[AppMan] saving revision of current application...");
		//generate CCM
		var version = this.compositionVersion[0] + '.' + this.compositionVersion[1] + '.' + new Date().getTime();
		var ccm = this.serializeCCM(version);
		// build request
		var xml= this.serviceAccess.buildSOAPEnvelope('<q0:updateCompositionModel><q0:cm><![CDATA[' + ccm + ']]></q0:cm><q0:user><![CDATA['+this.getUserID()+']]></q0:user></q0:updateCompositionModel>', 'q0', Ext.cruise.client.Constants._COMPRE_NS_);
		//send request
		this.executeSaveServiceRequest(xml);
	},
	
	/**
	 * Builds a save request explicitly requested by the user.
	 * @private
	 */
	buildExplicitSaveRequest : function(name, version){
		if(name=='' || name==null || version=='' || version==null) return;
		// rewrite current composition name
		this.compositionName=name;
		
		var split= version.split('.');
		//rewrite version
		for ( var c = 0; c < split.length; c++) {
			this.compositionVersion[c] = split[c];
		}
		var ccm = this.serializeCCM(version+ '.' + this.currentTimestamp.getTime());
		var xml= this.serviceAccess.buildSOAPEnvelope('<q0:updateCompositionModel><q0:cm><![CDATA[' + ccm + ']]></q0:cm><q0:user><![CDATA['+this.getUserID()+']]></q0:user></q0:updateCompositionModel>', 'q0', Ext.cruise.client.Constants._COMPRE_NS_);
		this.executeSaveServiceRequest(xml);
	},

	/**
	 * Method to register channels initially as defined in the composition model.
	 */
	registerChannels: function(){
		var communication= this.ccm.getElementsByTagName("communicationModel")[0];
		if(communication != undefined){
			//var test_regexp= /@conceptualModel\/@components\/@component\[\w+\]\/(@event|@operation)/g ;
			var channels= communication.getElementsByTagName("channel");
			var channel, _params, syncThreshold, type;
			for (var idx=0, length= channels.length; idx < length; ++idx){
				/* extract information for the channel (name and parameters) */
				channel= channels[idx];
				syncThreshold = channel.getAttribute('syncThreshold');
				_params= channel.getElementsByTagName('parameter');
				type= channel.getAttribute('xsi:type');
				var _count_params= _params.length;
				var name= channel.getAttribute('name');
				var parameters= [];
				for (var i=0; i< _count_params; ++i){
					parameters.push(_params[i].getAttribute('type'));
				}
				/* delegate the instantiation of the channel to the event broker */
				this.eventBroker.addChannel(name, type.split(':')[1], parameters, syncThreshold);
			}
		}
	},
	
	/**
	 * Register the system channels at the event broker.
	 * @param {Array} systemChannels array of objects with fields 'id' and 'type'
	 */
	registerSystemChannels: function(systemChannels){
		if (!Ext.isArray(systemChannels)) return;
		for (var i = systemChannels.length - 1; i >= 0; --i){
			var channel= systemChannels[i];
			/* delegate the instantiation of the channel to the event broker */
			this.eventBroker.addSystemChannel(channel['id'], channel['type']);
		};
	},
	
	/**
	 * Query the compostion model for the current layout and convert information 
	 * into the required JSON object for the layout manager.
	 * 
	 * TODO adapt layout manager to directly operate on composition model
	 * 
	 * COMMENTED-OUT due to moving functionality to ScreenflowManager
	 */
	/*interpreteLayout: function(){
		// query the current screenflow model
		var scmodels= this.ccm.getElementsByTagName("screenflowModel");
		if (scmodels.length==0) 
			throw "No screen flow model definied!";
		// extract the initial view..
		var initView = scmodels[0].getAttribute("initialView");
		var views= scmodels[0].getElementsByTagName("view");
		var initLayout;
		for (var i = views.length - 1; i >= 0; --i){
			var view = views[i];
			if (view.getAttribute("name")==initView){
				initLayout= view.getAttribute("layout");
				break;
			}
		};
		// .. and its declared layout
		var layouts= this.ccm.getElementsByTagName("layout");
		var currLayout=null;
		for (var idx = layouts.length - 1; idx >= 0; --idx){
			var layout= layouts[idx];
			if (layout.getAttribute("name")== initLayout){
				currLayout= layout;
				break;
			}
		};
		if (currLayout==null) 
			throw "Layout not found!";

		// parse the layout to the required data structure of the layout manager
		var type= currLayout.getAttribute("xsi:type");
		var config= null;
		switch(type.split(":")[1]){
			case "AbsoluteLayout": config= this._parseAbsoluteLayout(currLayout); break;
			case "FillLayout": config= this._parseFillLayout(currLayout); break;
		}
		if (config!=null){
			// finally, set the initial layout
			this.layoutManager.setLayoutHierarchy(null, config);
		}
	},*/
	
	// TODO recursive parsing, i.e support nested layouts
	_parseAbsoluteLayout: function(layout){
		var inner= {};
		var utility = Ext.cruise.client.Utility; 
		var bounds = utility.getFirstElementChild(layout);
		inner.id= layout.getAttribute('name');
		//TODO refactor
		inner.size= { 'width': parseInt(bounds.getAttribute('width')), 'height': parseInt(bounds.getAttribute('height')) };
		var positions= [];
		var position=bounds;
		while ((position=utility.nextElementSibling(position))!=null){
			if (position.nodeType != 1) continue;
            try {
                positions.push({
                    'locate': position.getAttribute('locate'),
                    'x': parseInt(position.getAttribute('x')) || 0,
                    'y': parseInt(position.getAttribute('y')) || 0
                });
            } catch (error) {
                this.log.fatal("Found unexpected element in  absolute layout model. " + error);
            }
		};
		inner.positions= positions;
		return {'AbsoluteLayout': inner};
	},
	
	// TODO impl + recursive parsing
	_parseFillLayout: function(layout){
		var inner= {};
		
		return {'FillLayout': inner};
	}, 
	
	/**
	 * Returns the composition version without timestamp as string
	 * @private
	 * @param Boolean next if next is true increment subversion, if not deliver current version
	 * @return String composition version without timestamp
	 */
	getCompositionVersion: function(next){
		// represent the composition version as string
		var versionString = "";
		for ( var y = 0; y < this.compositionVersion.length; y++) {
			// genev
			if(next && y==this.compositionVersion.length-1){
				versionString += (parseFloat(this.compositionVersion[y])+1);
			}else{
				versionString += this.compositionVersion[y];
			}
			if(y!=this.compositionVersion.length-1){
				versionString += '.';
			}
		}
		return versionString;
	},
	
	/** @private */
	getFormattedTimestamp : function(){
		this.currentTimestamp = new Date();
		return this.currentTimestamp.format('F j, Y, g:i a');
	},
	
	/**
	 * For realizing the execution of a SOAP web service request to ...
	 * @private
	 * @param {string} xml a xml string as SOAP body 
	 */
	executeSaveServiceRequest:function(xml){
		// create service access via POST
		var xhr= this.serviceAccess.createXHR(this);
		xhr.open('POST', this.compreURL);
		xhr.setRequestHeader("Content-Type","application/soap+xml");
		var log= applicationManagerInstance.getLog();
		// handle call back
		xhr.onreadystatechange= function(){
			if (xhr.readyState == 4) {
			if (xhr.status == 200){
				var respxml = xhr.responseXML;
				if (respxml == null) 
					return;
				var result = Ext.cruise.client.Utility.getElementsByTagNameNS('ns:',Ext.cruise.client.Constants._COMPRE_NS_,'return',respxml)[0];
				if (result.getAttribute("xsi:nil") == 'true') {
					var errorMessage = 'Saving composition failed!';
					this.log.error('[AppMan]' + errorMessage);
					// display message			
					Ext.MessageBox.alert('Status', errorMessage);
				} else {
					try {
						// display success message
						if(result.firstChild.nodeValue == 'true'){
							var toolbar = this.appMenu;
							if (toolbar) {
								toolbar.get('tb_load_button').enable();
								this.updateToolbar(true);
							}
						}else{
							Ext.MessageBox.alert('Status', 'Composition already exists!');
						}
					}catch(E){this.log.error(E);}
				}
			}else if(xhr.status == 500){
				//hide loadMask for recommendation menu if server won't find any recommendations (caused by an error)
				var errorMessage = 'server error during request for saving';
				this.log.error('[AppMan]' + errorMessage);
				Ext.MessageBox.alert('Status', errorMessage);
			}
			if(Ext.getCmp('storageDialog')){
				Ext.getCmp('storageDialog').destroy();
			}
			}
		};
		// sending request
		xhr.send(xml);
	},
	
	/**
	 * For realizing the execution of a SOAP web service request to ...
	 * @private
	 * @param {string} xml a xml string as SOAP body
	 * @param {Object} dialog the dialog to display in the results 
	 */
	executeLoadVersionsServiceRequest:function(cid,dialog){	
		//query for composition model verions
		var xml= this.serviceAccess.buildSOAPEnvelope('<q0:getVersions><q0:id><![CDATA[' + cid + ']]></q0:id></q0:getVersions>', 'q0', Ext.cruise.client.Constants._COMPRE_NS_);
		
		// create service access via POST
		var xhr= this.serviceAccess.createXHR(this);
		xhr.open('POST', this.compreURL);
		xhr.setRequestHeader("Content-Type","application/soap+xml");
		var log= applicationManagerInstance.getLog();
		// handle call back
		xhr.onreadystatechange= function(){
			if (xhr.readyState == 4 && xhr.status == 200) {
				var respxml = xhr.responseXML;
				if (respxml == null) 
					return;
				var result = Ext.cruise.client.Utility.getElementsByTagNameNS('ns:',Ext.cruise.client.Constants._COMPRE_NS_,'return',respxml);
				if(result[0] == null || result[0] == undefined){
					var errorMessage = 'No stored compositions available!';
					this.log.info('[AppMan]' + errorMessage);
					// display message
					 Ext.MessageBox.alert('Status', errorMessage);
				}else if (result[0].getAttribute("xsi:nil") == 'true') {
					var errorMessage = 'Loading compositions failed!';
					this.log.error('[AppMan]' + errorMessage);
					// display message
					 Ext.MessageBox.alert('Status', errorMessage);
				} else {
					try {
						// display success message
						//result.firstChild.nodeValue
						this.fillVersionsOverview(cid,result,dialog);
					}catch(E){this.log.error(E);}
				}
			}else if(xhr.status == 500){
				//hide loadMask for recommendation menu if server won't find any recommendations (caused by an error)
				var errorMessage = 'server error during request for loading';
				this.log.error('[AppMan]' + errorMessage);
				Ext.MessageBox.alert('Status', errorMessage);
			}
		};
		// sending request
		xhr.send(xml);
	},
	
	/**
	 * This function serializes the current composition as CCM
	 * 
	 * @param{String} version the new version of the composition (e.g. 1.1.1233)
	 * @return{String} the serialized composition model as string 
 	 */
	serializeCCM: function(version){
		var res = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><"+Ext.cruise.client.Constants._CCM_NS_IE+"MashupComposition xmi:version=\"2.0\" xmlns:xmi=\"http://www.omg.org/XMI\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:mcm=\""+Ext.cruise.client.Constants._CCM_NS_+"\"";
		//add metadata as attribute	
		res += " id=\"" + this.compositionId + "\"";
		res += " name=\"" + (this.compositionName||'(new application)') + "\"";
		res += " version=\"" + version + "\"";
		res += " author=\"" + this.userID + "\">";
		
		//add components
		res += "<conceptualModel>";
		res += this.componentManager.serializeComponentModel();
		res += "</conceptualModel>";
		res += this.layoutManager.serializeLayoutModel();
		//TODO delegate serialization of screenflow model to proper component as soon as the latter exists 
		res+= new XMLSerializer().serializeToString(this.ccm.getElementsByTagName("screenflowModel")[0]);
		res+= this.eventBroker.serializeCommunicationModel();
		
		return res+"</"+Ext.cruise.client.Constants._CCM_NS_IE+"MashupComposition>";
	},
	
	/**
	 * Sends a new rating for a component to the CoRe
	 * @private
	 * @param{String} cid the id of the component
	 * @param{Integer} rating the rating of the component
	 */
	sendRating: function(cid, rating){
		var xhr= this.serviceAccess.createXHR(this);
		xhr.open('POST', this.coreURL.replace("/services/CoReService","/rating"));
		xhr.onreadystatechange= function(){
			if (xhr.readyState == 4){
				if (xhr.status!= 200) return;
				try {
					var obj= Ext.util.JSON.decode(xhr.responseText);
					if (obj && obj.rating && obj.count){
						// update label and progress bar of users' ratings
						applicationManagerInstance.getRecommendationManager().updateRatingInformation(cid,obj.rating,obj.count);
					}
				}catch(exe){}
			}
		};
		xhr.send("id="+cid+"&rating="+rating);
	},
	
	/**
	 * Queries the rating for a specific component from CoRe
	 * @private
	 * @param{String} cid the id of the component
	 * @param{Object} handler callback function
	 * @param{Object} scope scope
	 */
	queryRating: function(cid, handler, scope){
		var xhr= this.serviceAccess.createXHR(scope);
		xhr.open('GET', this.coreURL.replace("/services/CoReService","/rating")+ "?id="+escape(cid), true);
		xhr.onreadystatechange= handler;
		xhr.send();
	},
	
	/**
	 * Getter for the home screen panel.
	 * @return {Ext.cruise.client.HomeScreen} the homescreen
	 */
	getHomeScreen: function(){
		if(this.homeScreen==null||this.homeScreen==undefined)
			this.homeScreen= new Ext.cruise.client.HomeScreen(this.log, this.userID);
		return this.homeScreen;
	}
});

/**
 * A global structure for an entry of the home screen represented by an Ext.data.Record
 * @private
 */
Ext.cruise.client.ApplicationManager.ListEntry= Ext.data.Record.create([
				{name: 'name', type: 'string'},
				{name: 'id', type: 'string'}
			]);