
/**
 * @class Ext.cruise.client.RecommendationManager  
 * This class provides an recommendation manager for the CRUISe/EDYRA Client Runtime.
 * Recommendations are either created based on unwired operations or events.  
 *
 * @author Carsten Radeck
 * @author Gregor Blichmann
 */
Ext.cruise.client.RecommendationManager = Ext.extend(Object, {
	eventBroker: null,
	componentManager: null,
	serviceAccess: null,
	coreURL: null,
	log: null,
	
	job: null,
	
	recommendationMenu: null,
	loadMask: null,
	busyIndicator: null,
	vocals: new Array("e","a","o","u","i"), // vocals necessary for label creation
	
	constructor: function( eventBroker, sac, cm, url, log  ){
		this.eventBroker= eventBroker;
		this.componentManager= cm;
		this.coreURL= url;
		this.serviceAccess= sac;
		this.job= {
			isIdle: true
		};
		this.log= log;
				
		this.busyIndicator= new Ext.LoadMask(Ext.getBody(), {
			id: "busyIndicator",
			msg: "Integrating new component ..."
		});
				
		Ext.cruise.client.RecommendationManager.superclass.constructor.call(this);
	},
	
	/**
	 * Resets this runtime component to enable the execution of a new application on the fly.
	 */
	reset: function(){
		delete this.job;
		this.job= {};
	},
	
	/**
	 * Initial function which is called when a user likes to create a new application
	 * and needs a recommendation for suitable components or compositions to ful the
	 * desired activity.
	 * 
	 * @public
	 * @param{String} query the requested desired activity
	 * @param{Ext.data.Store} Store the store ...
	 * @param{Boolean} isUi whether ui components are desired or not
	 * @param{Boolean} isService whether service components are desired or not 
	 * @param{String} limit the number of desired recommendations
	 * @return{Object} list of recommendations
	 */
	recommendApplicationStart: function(query, store, isUi, isService, limit){
		// interpret query as 'verb object'-phrase
		var activity= query, entity= query;
		var _res= /(\w+)\s+(\w+)/.exec(query);
		if (_res!=null && _res.length==3){
			activity= _res[1];
			entity= _res[2];
		}
		
		// type of desired components
		// implicitly is known that min one of both must be true
		var uiText = '.';
		if(isUi == false)
			uiText = '; mcdl:isUI false.';
		if(isService == false)
			uiText = '; mcdl:isUI true.';
		
		store.reload({
			params: {
				sparql: '<![CDATA[PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> PREFIX mcdl: <http://mmt.inf.tu-dresden.de/models/mcdl.owl#> PREFIX nfp: <http://mmt.inf.tu-dresden.de/models/nfp.owl#> PREFIX owl: <http://www.w3.org/2002/07/owl#> PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>'+
						'SELECT DISTINCT ?id ?name ?url ?docu WHERE { ?mcdl a mcdl:MashupComponent; mcdl:hasId ?id; mcdl:hasName ?name; mcdl:hasInterface ?if; mcdl:hasMetadata ?meta' + uiText +
						'OPTIONAL {?mcdl mcdl:hasDocumentation ?docu. } '+
						'OPTIONAL{ ?meta nfp:hasScreenShot ?screenshot. ?screenshot nfp:hasName "icon"; nfp:hasUrl ?url.}'+
						'{ ?if mcdl:hasOperation ?op. ?op mcdl:hasCapability ?cap. ?cap mcdl:hasActivity ?furi. ?cap mcdl:hasEntity ?euri. }'+
						'UNION { ?mcdl mcdl:hasCapability ?cap. ?cap mcdl:hasActivity ?furi. ?cap mcdl:hasEntity ?euri. } '+
						'?mcdl mcdl:hasBinding ?b. ?b mcdl:hasRuntime ?rt. ?rt mcdl:hasId ?rtid; mcdl:hasVersion ?v. FILTER(REGEX(?rtid, "'+Ext.cruise.client.Constants._RUNTIME_ID+'", "i") && mcdl:versionMatches("'+Ext.cruise.client.Constants._RUNTIME_VERSION+'",?v))'+
						'?meta nfp:hasKeyword ?kw.'+
						'FILTER(REGEX(?furi, "'+ activity +'", "i")||REGEX(?euri, "'+ entity +'", "i")||REGEX(?kw, "'+ entity +'|'+activity +'", "i")||REGEX(?name, "'+ entity +'|'+activity +'", "i")) '+
						'} ORDER BY ASC(?name) LIMIT ' + limit +']]>'
			}
		});
	},
	
	
	recommendAlternatives: function(id){
		var ind= id.indexOf('#');
		if (ind!=-1){
			id= id.substring(0,ind);
		}
		// query alternative components
		//var component= this.componentManager.getSMCDL(id);
		var component= this.componentManager.getComponentConfig(id);
		if (component.localName == "component")// workaround, since functional semantics (capabilities) are not yet reflected in the composition model; TODO solve
			component= this.componentManager.getSMCDL(id);
		var reqRespObj = new Ext.cruise.client.MCDLReqRespObject({
			compConfig: component,
			id: id
		});
		reqRespObj.tid= id;
		reqRespObj.ignore= [ id ];
		reqRespObj.name= component.getAttribute('name');

		applicationManagerInstance.getIntegrationManager().fetchSMCDLByTemplate(reqRespObj, function(obj){
				var id= reqRespObj.id;
				if (reqRespObj.error==true) {
					this.log.debug("[RecoMan] Failed receiving alternatives for component", id);
					return;
				}
				var components= reqRespObj.candidateList.components;
				if (components.length > 0) {
					this.addAlternatives(components, obj);
				}else {
					this.log.debug("[RecoMan] No alternative components!");
				}
			}, this);
	},

	/**
	 * Initial function which is called to start the recommendation process 
	 * by free operations.
	 * @public
	 * @param {string} sourceID the component id from the calling component
	 * @param {array} operationNames an array of strings representing the cuppleable operations 
	 */
	recommendComponentsByOperations: function(sourceID, operationNames){
		// check whether other process is acting in parallel
		if (this.job.isIdle==false) return;
		
		// fill current job data
		this.job.currentSourceId = sourceID;
		this.job.currentOperations = operationNames;
		this.job.selectedOperation = null;
		this.job.currentResponse = null;
		this.job.selectedEntry= null;
		this.job.isIdle=false;

		//check whether a load mask already exists or not
		if(this.loadMask == null)
			this.loadMask = new Ext.LoadMask(Ext.getBody(), {
				msg: "generating recommendations..."
			});
			
		// show the loading mask
		this.loadMask.show();
		
		// display recommendation menu
		this.displayRecommendationMenu(sourceID);
		
		var xml= this.serviceAccess.buildSOAPEnvelope('<q0:getCuppleableComponentsByOperations><q0:ireq><![CDATA[' + this.buildRequest(this.componentManager.getSMCDL(sourceID), this.job.currentOperations) + ']]></q0:ireq></q0:getCuppleableComponentsByOperations>');
		this.executeServiceRequest(xml);
	},
	
	/**
	 * Initial function for starting the recommendation process 
	 * by a thrown unwired event.
	 * @public
	 * @param {string} sourceID the component id from the calling component
	 * @param {Ext.cruise.client.Message} theEventMessage an message object representing the event 
	 */
	recommendComponentsByEvent: function(sourceID, theEventMessage){
		
		// exclude events from logic components
		if(sourceID.indexOf('/logic/') != -1){
			this.log.debug('[RecMan] Uncuppled Event of logic component ' + sourceID + ' ignored.');
			return;
		}
			
		// check whether other process is acting in parallel
		if (this.job.isIdle==false) return;
		
		this.job.currentSourceId = sourceID;
		this.job.currentEvent = theEventMessage;
		this.job.selectedEntry= null;
		this.job.isIdle=false;
		
		//check whether a load mask already exists or not
		if(this.loadMask == null)
			this.loadMask = new Ext.LoadMask(Ext.getBody(), {
				msg: "generating recommendations..."
			});
			
		// show the loading mask
		this.loadMask.show();
		
		// display recommendation menu
		this.displayRecommendationMenu(sourceID);
		
		// build request
		var xml= this.serviceAccess.buildSOAPEnvelope('<q0:getCuppleableComponentsByEvent><q0:ireq><![CDATA['+ this.buildRequest(this.componentManager.getSMCDL(sourceID), this.job.currentEvent.getName()) +']]></q0:ireq></q0:getCuppleableComponentsByEvent>');
		
		//execute service request
		this.executeServiceRequest(xml);
	},
	
	/**
	 * For realizing the execution of a SOAP web service request to get component recomendations from the CoRe
	 * @private
	 * @param {string} xml a xml string as SOAP body 
	 */
	executeServiceRequest:function(xml){
		// create service access via POST
		var xhr= this.serviceAccess.createXHR(this);
		xhr.open('POST', this.coreURL);
		xhr.setRequestHeader("Content-Type","application/soap+xml");
		var log= applicationManagerInstance.getLog();
		// handle call back
		xhr.onreadystatechange= function(){
			if (xhr.readyState == 4 && xhr.status == 200) {
				var respxml = xhr.responseXML;
				if (respxml == null) 
					return;
				var result= Ext.cruise.client.Utility.getElementsByTagNameNS('ns:',Ext.cruise.client.Constants._CORE_NS_,'return',respxml)[0];
				try {
					if (result.childNodes.length!=0)
						//parse result string as json and delete all possible line breaks
						result = Ext.util.JSON.decode(result.textContent.replace( '\n',''));
					else
						result= undefined;
					// hand result over and fill the recommendation menu
					this.fillRecommendationMenu(result);
				}catch(E){log.error(E); this.fillRecommendationMenu();}
			} else if(xhr.status == 500){
				//hide loadMask for recommendation menu if server won't find any recommendations (caused by an error)
				var errorMessage = 'server error during request for recommendations';
				log.error('[Recommender]' + errorMessage);
				this.displayMessage(errorMessage);
				this.job.isIdle= true;
			}
		};
		// sending request
		xhr.send(xml);
	},
	
	/**
	 * displays the recommendation menu via sliding to the left 
	 * @private
	 */
	displayRecommendationMenu: function(){
		// check whether a recommendation menu already exists or not
		if(this.recommendationMenu == null){
			this.createRecommendationMenu();
		}
		//TODO reset recommendation menu by throwing the hide event
		if(this.recommendationMenu.isVisible())
			this.recommendationMenu.hide();
		this.recommendationMenu.show();
			// better solution needed!!!

		// slide in rec menu via changing css classes
		if(this.recommendationMenu.getEl().hasClass('recommendationmenu_minimized')){
			this.recommendationMenu.getEl().removeClass('recommendationmenu_minimized');
			this.recommendationMenu.getEl().addClass('recommendationmenu');
		}
	},
	
	/**
	 * Minimizes the recommendation menu via sliding to the right
	 * @private 
	 */
	minimizeRecommendationMenu: function(){
		// slide out rec menu via changing css classes
		if(this.recommendationMenu){
			this.recommendationMenu.getEl().removeClass('recommendationmenu');
			this.recommendationMenu.getEl().addClass('recommendationmenu_minimized');
		}
	},
	
	/**
	 * Hides the recommendation menu totally
	 * @private 
	 */
	hideRecommendationMenu: function(){
		// slide out rec menu via changing css classes
		if(this.recommendationMenu){
			this.recommendationMenu.hide();
		}
	},
	
	/**
	 * Displays an message on the recommendation menu
	 * @private
	 * @param {string} message a message to display in the recommendation menu 
	 */
	displayMessage: function(message){
		// hide load mask
		if(this.loadMask!=null)
			this.loadMask.hide();
		
		// remove all items from the recommendation menu
		this.recommendationMenu.removeAll();
		
		// add the message as DisplayField
		this.recommendationMenu.add(
				new Ext.form.DisplayField({
				value: message,
				style: {
					'margin': '2px 0px 2px 5px',
					'color': 'red'
				}
			})						
		);
		
		// refresh layout
		this.recommendationMenu.doLayout();
	},
	
	/**
	 * Creates a custom Ext.list.ListView suitable to display the recommendations in the recommendation menu.
	 * @private
	 * @param {String} id the unique identifier for the list view
	 * @param {String} title the title for the list view
	 * @return {Ext.list.ListView} a list view
	 */
	createCustomListView: function(id, title, hidden){
		return new Ext.list.ListView({
					width: 300,
					autoHeight: true,
					multiSelect: false,
					store: new Ext.data.Store({
						fields: ['comment', 'componentId', 'label', 'screenshot', 'elementName']
					}),
					id: id,
					hidden: hidden||false,
					trackOver: true,
					disableHeaders: true,
					columns: [
						{
							header: title,
				            width: 1,
				            dataIndex: 'label'
				        }
					]
				});
	},
	
	addAlternatives: function(alts, reqRespObj){		
		// check wheter a recommendationMenu already exists or not
		if(this.recommendationMenu == null){
			this.createRecommendationMenu();
		}
		// add new ListView
		var listView = this.createCustomListView('alternatives-list','Alternative Component');
		this.recommendationMenu.add(new Ext.form.Label({text:"Category 'Components'", cls:"recommendationmenu_h2"}));
		this.recommendationMenu.add(listView);

		var store = listView.getStore();
		
		for ( var idx = 0; idx < alts.length; idx++) {
			var alt = alts[idx];
			store.add([
					new Ext.cruise.client.RecommendationManager.ListEntry({
						elementName: alt.name,
						componentId: alt.id,
						comment: '',
						label: alt.name,
						screenshot: alt.screenshot,
						rating: 0.0,
						count: 0
					})
				]);
		}
		listView.purgeListeners();
		listView.on('click', function(view, index){
				var entry= view.getStore().getAt(index);
				var components= reqRespObj.candidateList.components;
				for (var i=0; i< components.length; ++i){
					if (components[i].id = entry.data.componentId){
						var tointegrate= components[i];
						components.splice(i,1);
						reqRespObj.tid= reqRespObj.id;
						reqRespObj.id= tointegrate.id;
						// indicate that a concrete component is exchanged 
						reqRespObj.nontemplatebasedExchange= true;
						reqRespObj.alternatives= components;
						delete reqRespObj.candidateList;
						//applicationManagerInstance.getIntegrationManager().getSMCDLMatch(reqRespObj);
						
						applicationManagerInstance.getAdaptationManager().execute(
								 [{
							 			type: "ComponentAction",
							 			name: "exchangeComponent",
							 			config : {
											id: tointegrate.id,
											reqRespObj: reqRespObj
										},
							 			pointcut: [this.job.currentSourceId]
								 }]
							);
	
						this.minimizeRecommendationMenu();
						break;
					}
				}
			}, this);
	},
	
	/**
	 * fills the recommendation menu with suitable entries depending on the kind of request (operations & events)
	 * @private
	 * @param{string} result the result of the SOAP web service call getCuppleableComponents
	 */
	fillRecommendationMenu: function(result){
		// check wheter a recommendationMenu already exists or not
		if(this.recommendationMenu == null){
			this.createRecommendationMenu();
		}
		// if result is empty
		if(result==null || result==undefined){
			this.displayMessage('no cuppleable components found!');
			//hide loadMask
			if(this.loadMask)
				this.loadMask.hide();
			return;
		} else if(Ext.isArray(result) && result.length == 0){
			this.displayMessage("No recommendation possible!");
			return;
		}
		//reset current job
		this.job.currentResponse = result;
		
		// add new ListView
		var firstSelectionListView = this.createCustomListView('recommendation-list','');
		var secondSelectionListView = this.createCustomListView('recommendation-list2','', true);
		this.recommendationMenu.add(new Ext.form.Label({text:"Category 'Coupling'", cls:"recommendationmenu_h2"}));
		this.recommendationMenu.add(firstSelectionListView);
		this.recommendationMenu.add(secondSelectionListView);
		
		this.recommendationMenu.doLayout();
		
		firstSelectionListView.purgeListeners();
		secondSelectionListView.purgeListeners();
		
		firstSelectionListView.on('mouseenter', function(view, index, htmlnode, event){
			var id= view.getStore().getAt(index).data.componentId;
			this.componentManager.highlightComponent(id, "green");
		}, this);
	
		firstSelectionListView.on('mouseleave', function(view, index, htmlnode, event){
			var id= view.getStore().getAt(index).data.componentId;
			this.componentManager.unhighlightComponent(id, true);
		}, this);
		
		secondSelectionListView.on('mouseenter', function(view, index, htmlnode, event){
			var id= view.getStore().getAt(index).data.componentId;
			this.componentManager.highlightComponent(id, "green");
		}, this);
	
		secondSelectionListView.on('mouseleave', function(view, index, htmlnode, event){
			var id= view.getStore().getAt(index).data.componentId;
			this.componentManager.unhighlightComponent(id, true);
		}, this);
		
		var store = firstSelectionListView.getStore();
		
		// pre converting result set by clustering capabilities
		var clusteredResult = new Array();
		
		// CASE 'byEvent'
		// check whether operations or events are returned
		if(Ext.isArray(result) && result.length!=0 ){
			// if result is an array -> operations

			// get Parameter(s) of uncuppled Event
			var mc= this.componentManager.getMediationConfig(),
				currentEvent= mc[this.job.currentSourceId].events[this.job.currentEvent.getName()],
				parameterlabels = [];
			for(r = 0; r < currentEvent.parameters.length; r++){
				parameterlabels.push(currentEvent.parameters[r].name);
			}
			
			// rename title bar of the list view
			var parameterAsString = this.createLabel("Use ", parameterlabels, " to:");
			Ext.getCmp('recommendation-list').columns[0].header = parameterAsString;
			
			//switch event handler of the recommendation menu
			firstSelectionListView.on('click', this.handleFirstRecommendationSelection.createDelegate(this, ['byEvent'], 0), this);
		
			for (var c=0; c < result.length; c++) {
				// fetch cap-data form result
				var comp= result[c];
				// check whether solutions for insufficient recommendations exists or not
				if(comp.insufficientInput && comp.solutions.length == 0)
					continue;
				
				if (!comp.operation.capability) continue;
				
				var entity = comp.operation.capability.entity;
				var activity = comp.operation.capability.activity;
				// build a human understandable label
				var label = "n/a";
				if(activity.label!=undefined && activity.label!=null && entity.label!=undefined && entity.label!=null){
					var contains = this.vocals.indexOf(entity.label.charAt(0).toLowerCase());
					var link = ((contains!=-1)?'an':'a');
					label = activity.label + " " + link + " " + entity.label.toLowerCase();
				}
				// create comment
				var comment = "n/a";
				if(comp.operation.capability.activity.comment!=undefined && comp.operation.capability.activity.comment!=null &&
						comp.operation.capability.entity.comment!=undefined&&comp.operation.capability.entity.comment!=null){
					//TODO Create a usefull comment out of comments from functionality and entity
					comment = comp.operation.capability.activity.comment;
				}
				
				//check whether cap already exists or not
				var capIndex = -1;
				for (var q=0; q < clusteredResult.length; q++) {
					if(clusteredResult[q].cap.entityUri == entity.uri && clusteredResult[q].cap.activityUri == activity.uri){
						capIndex=q;
						break;
					}
				}
				if(capIndex == -1){
					// if cap doesn't exist, create a new entry
					clusteredResult[clusteredResult.length] = {
							cap: {
								entityUri: comp.operation.capability.entity.uri,
								entityLabel: entity.label,
								activityUri: comp.operation.capability.activity.uri,
								label: label,
								comment: comment,
								isInsufficient: comp.insufficientInput
							},
							components: [comp]
						}
				}else{
					// if cap exists, add current comp to the array of components that support the cap
					clusteredResult[capIndex].components.push(comp);
				}
			}
			
		// CASE 'byOperation'	
		}else{
			
			//switch event handler of the recommendation menu
			firstSelectionListView.on('click', this.handleFirstRecommendationSelection.createDelegate(this, ['byOperation'], 0));
			// if result is no array -> events
			//iterate  over all operations of the current component
			var clusteredResult = new Array();
			for ( var oper in result) {
				//iterate over all functionalities per operation
	
				var capabilities = result[oper].capabilities;
				if(capabilities)
				for ( var y = 0; y < capabilities.length; y++) {
										
					var fLabel = capabilities[y].activity.label;
					var eLabel = capabilities[y].entity.label;
					var label = "n/a";
					if(fLabel!=undefined && fLabel!=null && eLabel!=undefined && eLabel!=null){
						var contains = this.vocals.indexOf(eLabel.charAt(0).toLowerCase());
						var link = ((contains!=-1)?'an':'a');
						label = fLabel + " " + link + " " + eLabel;
					}
					//check whether cap already exists or not
					var capIndex = -1;
					for (var q=0; q < clusteredResult.length; q++) {
						if(clusteredResult[q].cap.entityUri == capabilities[y].entity.uri && clusteredResult[q].cap.activityUri == capabilities[y].activity.uri){
							capIndex=q;
							break;
						}
					}
					
					if(capIndex == -1){
						// if cap doesn't exist, create a new entry
						clusteredResult[clusteredResult.length] = {
								cap: {
									entityUri: capabilities[y].entity.uri,
									entityLabel: eLabel,
									activityUri: capabilities[y].activity.uri,
									label: label,
									comment: comment,
									operations: [oper]
								},
								components: [result[oper].matches]
							} 
					}else{
						// if cap exists, add current comp to the array of components that support the cap
						clusteredResult[capIndex].components.push(result[oper].matches);
						clusteredResult[capIndex].cap.operations.push(oper);
					}
				}
			}	
		}
		
		// fill store
		for (var x=0; x < clusteredResult.length; x++) {
			
			store.add([
				new Ext.cruise.client.RecommendationManager.ListEntry({
					elementName: clusteredResult[x].cap.label,
					components: clusteredResult[x].components,
					cap: clusteredResult[x].cap,
					componentId: '',
					comment: '',
					label: clusteredResult[x].cap.label,
					screenshot: '',
					rating: '',
					count: ''
				})
			]);
		}
		//hide loadMask
		this.loadMask.hide();
		this.job.isIdle= true;
		
		this.recommendationMenu.doLayout();
	},
	
	/**
	 * Converts a qualified name into a complete URI.
	 * @private
	 * @param {DOMElement} elem an element for looking up the namespace 
	 * @param {String} qname the qualified name to be expanded to a URI
	 */
	qname2URI: function(elem, qname){
		var split= qname.split(':');
		return elem.lookupNamespaceURI(split[0])+split[1];
	},
	
	/**
	 * This function creates the template necessary for requesting cuppleable components
	 * @private
	 *@param {object} mcdl the current component as DOM representation
	 *@param {array} request a array of names representing operations or a single eventName as string 
	 */
	buildRequest: function(mcdl, request){
		
		//TODO dynamically assign treshold
		var maxResponseSize = 30;
		
		// header
		var requestTemplate = '<integrationRequest xmlns:template="http://inf.tu-dresden.de/cruise/template" xmlns:ccm="http://inf.tu-dresden.de/cruise/template" xmlns="http://inf.tu-dresden.de/cruise/template" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">';
 		//requestTemplate += '<template id="http://mmt.inf.tu-dresden.de/EDYRA/prototype/' + ( +new Date() ) + '" isUI="' + mcdl.getAttribute('isUI') + '"><interface>'; 
		requestTemplate += '<template id="http://mmt.inf.tu-dresden.de/EDYRA/prototype/' + ( +new Date() ) + '"><interface>'; 
		    
		// check whether an event or an array of operations is committed (requested)
		if(Ext.isArray(request)){
			// OPERATION(S)
			
			if(mcdl!=null && request.length>0){
				//iterate over all operations
				for ( var i = 0; i < request.length; i++) {
					requestTemplate += '<operation name=\"' + request[i] + '\">';
					var allOperations = mcdl.getElementsByTagName('operation');
					var currentOperation = null;
					for ( var j = 0; j < allOperations.length; j++ ) {
						if(allOperations[j].getAttribute('name')==request[i]){
							currentOperation = allOperations[j];
							break;
						}
					};
					if(currentOperation!=null){
						// add capability
						var cap = currentOperation.getElementsByTagName('capability');
						for (var z=0; z < cap.length; z++) {
							var currentCapability = cap[z];
							requestTemplate += '<capability activity=\"'+ this.qname2URI(currentCapability, currentCapability.getAttribute('activity')) +'\" id=\"'+ currentCapability.getAttribute('id') + '\" entity=\"'+ this.qname2URI(currentCapability, currentCapability.getAttribute('entity')) +'\" />';
						}
						
						var opParameters = currentOperation.getElementsByTagName('parameter');
						// add all parameters to the string
						for (var j=0; j < opParameters.length; j++) {
							var currentParameter = opParameters[j];
							requestTemplate += '<parameter type=\"'+ this.qname2URI(currentParameter, currentParameter.getAttribute('type')) +'\" name=\"'+ currentParameter.getAttribute('name') + '\" />';
						}
					}
					// close operation tag
					requestTemplate += '</operation>';
				}
			}
			
		}else{	
			// EVENT
			
			var eventName = request
				
			// include event (currently(?) only one)
	        if(mcdl!=null && eventName != null){
	        	
	        	// get current events and iterate through       	
	        	var currentEvents = mcdl.getElementsByTagName('event');
	        	for (var i=0; i < currentEvents.length; i++) {
					var event = currentEvents[i];
									
					if(event.getAttribute('name') == eventName){
						// open event tag
						requestTemplate += '<event name=\"' + eventName + '\">';
						var parameters = event.getElementsByTagName('parameter');
						// add all parameters to the string
						for (var j=0; j < parameters.length; j++) {
							var currentParameter = parameters[j];
							requestTemplate += '<parameter type=\"'+ this.qname2URI(currentParameter, currentParameter.getAttribute('type')) +'\" name=\"'+ currentParameter.getAttribute('name') + '\" />';
						};
						
						// add activity
						var f= event.getAttribute('activity');
						if (f != null) {
							var functionalities = f.split(" ");
							for (var z = 0; z < functionalities.length; z++) {
								var fct = functionalities[z];
								
								requestTemplate += "<funcitonalty URI=\"" + this.qname2URI(mcdl, fct) + "\" />";
							}
						}
						// close event-tag
						requestTemplate += '</event>';
					}
				};
	        }
		} // end else if
        // add general footer information
        requestTemplate += '</interface></template><runtime id="'+Ext.cruise.client.Constants._RUNTIME_ID+'" version="'+Ext.cruise.client.Constants._RUNTIME_VERSION+'" />';
        requestTemplate += '<exclude>' + mcdl.getAttribute('id') + '</exclude>';
 		requestTemplate += '<maxCandidates>' + maxResponseSize + '</maxCandidates></integrationRequest>';

		return requestTemplate;
	},
		
	/**
	 * Creates an Ext.Window as recommendation menu. 
	 * @private
	 */
	createRecommendationMenu: function(){
		if(this.recommendationMenu == undefined || this.recommendationMenu == null){
			var menu = new Ext.Window({
				width: 350,
				height: applicationManagerInstance.getLayoutManager().getCanvasHeight(),
				id: "recommendationmenu",
				collapsible: false,
				draggable: false,
				closable:false,
				headerCfg: {
					id: 'recommendation-header',
					tag: 'div',
					cls: 'recommendation-header'
				},
				closeAction: 'hide',
				title: "Recommendations",
				layout: "vbox",
				baseCls: "recommendationmenu_minimized",
				resizable: false,
				shadow: false,
				bodyCssClass : "recommendationmenu_content",
				listeners : {
								'hide' : {
									scope : this,
									fn : this.handleMinimizeRecommendationMenu
								},
								'beforehide' : {
									scope : this,
									fn : this.handleBeforeMinimizeRecommendationMenu
								},
								'afterrender' :{ 
									scope: this,
									fn: function(p){
											//positioning the rec menu on the right border of the canvas
											p.setPosition( applicationManagerInstance.getLayoutManager().getCanvasWidth(), 80 );
											//using jquery to toggle rec menu
											$(".recommendation-header").click(function(){
											// toggle rec menu
											var recman = applicationManagerInstance.getRecommendationManager();
											var recmenu = recman.getRecommendationMenu().getEl();
											if(recmenu.hasClass('recommendationmenu_minimized')){
												//TODO start recommendation by operations etc.
												recman.displayRecommendationMenu();
											}else{
												// rec menu is currently open
												recman.minimizeRecommendationMenu();
											}
										});
									}
								}
							}
			});
			this.recommendationMenu = menu;
		}
		this.recommendationMenu.show();
	}, 
	
	/**
	 * Handler which is called before the redommendation menu gets hidden.
	 * Resizes the application canvas if necessary.
	 * @private
	 */
	handleBeforeMinimizeRecommendationMenu: function(){
		//resize application canvas if the recommendation menu was placed on the right border
		if (!applicationManagerInstance.getLayoutManager().root) return;
		var x = this.recommendationMenu.getPosition()[0] + this.recommendationMenu.getWidth();
		var y = applicationManagerInstance.getLayoutManager().root.getPanel().getWidth();
		if(x==y){
			applicationManagerInstance.getLayoutManager().resizeApplication(x-305);
		}
	},
	
	/**
	 * Handler which is called when the redommendation menu is hide.
	 * Deletes all objects which are in the recommendation menu.
	 * @private
	 */
	handleMinimizeRecommendationMenu: function(){
		// delete all existing objects in the recommendation menu
		this.recommendationMenu.removeAll();
		// hide loading mask
		if(this.loadMask!=null)
			this.loadMask.hide();
	},

	/**
	 * Handles the first selection step during recommendation. In general a user first has to select a activity to achieve,
	 * than has to select how this selection should be realized.
	 * @private
	 * @param {String} flag representing the kind of recommendationtrigger ("byOperation" or "byEvent")
	 * @param {Object} view representing the view on which the handler is subscribed
	 * @param {Integer} index representing the position of the clicked item in the list
	 */
	handleFirstRecommendationSelection: function(flag, view, index){
		// get selected entry
        var entry= view.getStore().getAt(index);

        //add a new list to the recommendation menu for second selection process
        var additionalListView = Ext.getCmp('recommendation-list2');
        // add highlighting
    	//fill store
        var currentStore = additionalListView.getStore();
        currentStore.removeAll();
        additionalListView.purgeListeners();
        additionalListView.on('click', this.handleSecondRecommendationSelection.createDelegate(this, [flag], 0), this);
        // kind of recommendation is indicated by flag:
        // byOperation = recommendation by unwired operations
        // byEvent = recommendation by unwired event

        // edit title of second recommendation step
        if(entry.data.cap.isInsufficient){
        	additionalListView.columns[0].header = 'as';
        }else{
        	additionalListView.columns[0].header = 'realized through';
        }
        //TODO display text correct
        
        // CASE 1 - SearchByUncuppledEvents - Therefore, only Component labels have to be displayed
        switch(flag){
        case "byEvent":
        	var matches = entry.data.components;
	        
        	for (var s = 0; s < matches.length; s++) {
	        	match = matches[s];
		        //Building label (in case of searchByUncuppledEvent --> i.e. realized through: Event Component)
		        // label equals the component name
	        	
	        	// add names of matched parameters
	        	var label = '';
	        	if(entry.data.cap.isInsufficient){
	        		for(var t=0; t < match.matchedParameters.length ; t++){
	        			var contains = this.vocals.indexOf(match.matchedParameters[t].label.charAt(0).toLowerCase());
						label += ((contains!=-1)?'an ':'a ') + match.matchedParameters[t].label.toLowerCase();
						if(match.matchedParameters.length.length > 1 && v!= match.matchedParameters.length-1 ){
							label += ", ";
							if(v == match.matchedParameters.length-2)
								label += "and ";
						}
	        		}
	        		// add name of component containing the desired operation
	        		label += ' using ';
		        	label += (match.name != undefined ? match.name : "n/a");
		        	
		        	// add name of components that are possible solutions 
	        		for(var sidx = 0; sidx < match.solutions.length; sidx++){
	        			var tmplabel = label + " and " + match.solutions[sidx].name;
	        			
	    	        	currentStore.add([new Ext.cruise.client.RecommendationManager.ListEntry({
	    	                elementName: match.operation.name, 
	    	                componentId: match.id,
	    	                comment: "n/a",
	    	                label: tmplabel,
	    	                screenshot: match.screenshot || null,
	    					rating: match.rating || null,
	    					count: match.count || null,
	    					isInsufficient: true,
	    					matchedParameters: match.matchedParameters,
	    					solution: match.solutions[sidx]
	    	            })]);  
	        		}
	        	} else {
	        		// add name of component that offers sufficent solution
	        		label += ' using ';
		        	label += (match.name != undefined ? match.name : "n/a");
		        	
		        	currentStore.add([new Ext.cruise.client.RecommendationManager.ListEntry({
    	                elementName: match.operation.name, 
    	                componentId: match.id,
    	                comment: "n/a",
    	                label: label,
    	                capText: entry.data.cap.entityLabel,
    	                screenshot: match.screenshot || null,
    					rating: match.rating || null,
    					count: match.count || null
    	            })]);  
	        	}
	        }
	        break;
        case "byOperation":
            // CASE 2 - by unwired Operations
            //store selected operation 
        	//TODO Case handling if multiple operations have the same event
            if(entry.data.cap.operations.length>1)
            	Ext.MessageBox.alert('Multiple Operations',"The selected Capability is offered by '"+entry.data.cap.operations.length+"' operations! The first was selected!");
            this.job.selectedOperation = entry.data.cap.operations[0];
        	
        	var matches = entry.data.components;
        	for (var x = 0; x < matches.length; x++) {
                metamatches = matches[x];
                for (var n = 0; n < metamatches.length; n++) {
                	match = metamatches[n];
	               //Building label
	               var eventName = (match.event.name != undefined ? match.event.name : "n/a");
	               var compName = (match.name != undefined ? match.name : "n/a");
	               var eventLabel = "";
	               var isDND = false;
	               if(match.event.isDND){
	            	   eventLabel = "Drag&Drop from " + compName;
	            	   isDND = true;
	               }else{
	            	   eventLabel = eventName + " from " + compName;   
	               }
	                currentStore.add([new Ext.cruise.client.RecommendationManager.ListEntry({
	                    elementName: match.event.name, //TODO replace oepration name by something better understandable (i.e. label)
	                    componentId: match.id,
	                    capText: entry.data.cap.entityLabel,
	                    comment: (match.event.activity != undefined ? match.event.activity.comment : "n/a"),
	                    label: eventLabel,
	                    isDND: isDND,
	                    screenshot: match.screenshot || null,
	    				rating: match.rating,
	    				count: match.count
	                })]);
	            }
        	}
        	break;
        } 

        //update size of recommendation menu
    	additionalListView.show();
    	this.recommendationMenu.doLayout();
	},
	
	/**
	 * Calculates possible solutions for insufficient recommendations
	 * 
	 * @private
	 * @param {Object} solutionSpace a object containing a number of possible components
	 * @param {Array} necessaryParameters a Array of Strings representing the necessary parameters od the desired
	 * 					operation with their names
	 */
	calculateSolutions: function(solutionSpace){
		// helper for diff of arrays
		Array.prototype.diff = function(a) {
		    return this.filter(function(i) {return !(a.indexOf(i) > -1);});
		};

		var recommendations = {};
		if(solutionSpace){
			// for every parameter usage e.g. start location by search route
			for (var s = 0; s < solutionSpace.length; s++) { 
        		var opParameterNames = [];
        		// store parameter names in an array
        		for(d = 0; d < parameters.length; d++){
        			var found = false;
        			for(m = 0; m < solutionSpace[s].matchedParameters.length; m++){
        				matchedParameterName = solutionSpace[s].matchedParameters[m].name;
        				if(matchedParameterName == parameters[d]){
        					found = true;
        					continue;
        				}	
        			}
        			// only if the parameter name doesn't already match
        			// it gets pushed
        			if(!found)
        				opParameterNames.push(parameters[d]);
        		}
        		var allRecs = [];
        		// go through all proposed solutions (components)
        		for(a = 0; a < solutionSpace[s].solutions.length; a++){
        			// create a new recommendation
        			var diff = opParameterNames.diff(solutionSpace[s].solutions[a].parameters);
        		}
			}
		}
		
	},
	
	/**
	 * Helper funciton for building human readable lists of concepts as sentence
	 * Example: "prefix a noun, a noun, and a noun sufix"
	 * 
	 * @private
	 * @param {String} prefix the desired prefix of the list of concepts
	 * @param {Array} listOfNouns a list of Strings
	 * @param {String} sufix the desired sufix
	 */
	createLabel: function(prefix, listOfNouns, sufix){
		var vocals = new Array("e","a","o","u","i");
		var label = prefix;
    	for(var t=0; t < listOfNouns.length; t++){
    		var contains = vocals.indexOf(listOfNouns[t].charAt(0).toLowerCase());
			label += ((contains!=-1)?'an ':'a ') + listOfNouns[t].toLowerCase();
			if(listOfNouns.length > 1 && t != listOfNouns.length-1 ){
				label += ", ";
				if(t == listOfNouns.length-2)
					label += "and ";
			}
    	}
    	label += sufix;
    	return label;
	},
	
	/**
	 * Handles the second selection step during recommendation. In general a user first has to select a activity to achieve,
	 * than has to select how this selection should be realized.
	 * @private
	 * @param {String} flag representing the kind of recommendationtrigger ("byOperation" or "byEvent")
	 * @param {Object} view representing the view on which the handler is subscribed
	 * @param {Integer} index representing the position of the clicked item in the list
	 */
	handleSecondRecommendationSelection: function(flag, view, index){
		// get selected entry
        var entry= view.getStore().getAt(index);
        view.purgeListeners();
        this.componentManager.unhighlightComponent(entry.data.componentId, true);
        
        switch(flag){
        case "byEvent":
			if(entry.data.isInsufficient){
				// CASE 1 - by unwired Event with insufficent solution
				/* lists all ids of components whose integration is still pending */
				var todo= new Array();
				// component integration handler
				function handleIntegration(message){
					try {
						var eventData = message.getBody();
						var cid;
						switch (message.getName()) {
							case 'IntegrationError':
								try {
									cid = eventData.compConfig.getAttribute("name");
								} catch (asd) {}
								break;
							case 'componentInitialized':
								cid = eventData.cid;
							default: ;
						}
						if (todo.indexOf(cid) != -1) {
							todo.remove(cid);
							//log.info('[RecMan] Remaining integration tasks:', todo.length);
							// if current component is a UI component..
							if (applicationManagerInstance.getComponentManager().isUIC(cid)) {
								setTimeout(function(){
									applicationManagerInstance.getLayoutManager().addComponent(cid, applicationManagerInstance.getComponentManager().getAdaptabilityPanel(cid));
									// send message
									var msg = new Ext.cruise.client.Message();
									msg.setName('compositionExtended');
									msg.appendToBody('cid', cid);
									applicationManagerInstance.getEventBroker().publish(msg, undefined);
								}, 30);
								//TODO update the labels showing information about users' rating correctly
								//this.updateRatingInformation(cid,this.job.selectedEntry.rating||0, this.job.selectedEntry.count||0);
							}
							// if proposed solution for insufficency is integrated and a splitter is needed 
							if(cid == this.job.components['solution'].id && this.job.components['solution'].parameters.length > 1){
	
								// get the matched solution event 
								var mc= this.componentManager.getMediationConfig(),
									solutionEvent= mc[this.job.components['solution'].id].events[this.job.components['solution'].eventName];
								
								// get all parameters of the event to create splitter operation
								// temporarily save channel names created for each single paramter of the splitter
								for(var solidx = 0; solidx < solutionEvent.parameters.length; solidx++){
									this.job.components['splitter'].parameters.push({name: solutionEvent.parameters[solidx].name ,type:solutionEvent.parameters[solidx].type});
								}
								//create and add splitter
								var splitter = this.job.components['splitter'];
								applicationManagerInstance.getComponentManager().createLogicComponent(splitter.id, splitter.parameters, lNsDef1);
								
								// create channels between splitter and joiner
								for(var solidx = 0; solidx < this.job.components['solution'].parameters.length; solidx++){
									var cName = this.job.components['splitter'].id + ' to ' + this.job.components['joiner'].id + solidx;
									applicationManagerInstance.getEventBroker().addChannel(cName, "Link", this.job.components['solution'].parameters[solidx].type, undefined);
									// store channel name
									splitterChannelNames.push(cName);
								}
							} else if(cid == this.job.components['destination'].id){
								// if the desired destination component (the component connected to the event of the joiner)
								// is integrated, the joiner gets integrated
								var lParam = [],
									//TODO dynamically calculate namespaces
									lNsDef2 = [{prefix:'upperactions', ns:'http://mmt.inf.tu-dresden.de/models/activity-actions.owl#'},
									           {prefix:'nfp', ns:'http://mmt.inf.tu-dresden.de/models/nfp.owl#'},
									           {prefix:'mcdl', ns:'http://mmt.inf.tu-dresden.de/models/mcdl.owl#'},
									           {prefix:'travel',ns:'http://mmt.inf.tu-dresden.de/cruise/travel.owl#'},
									           {prefix:'edyraactions', ns:'http://mmt.inf.tu-dresden.de/models/activity-edyraactions.owl#'}];
								
								// get parameters of the already integrated component behind the joiner to ensure correct paramter ordering
								// TODO: handling if no splitter is needed
								var mc= this.componentManager.getMediationConfig(),
									params= mc[this.job.components['destination'].id].operations[entry.data.elementName].parameters;
								
								for(pidx = 0; pidx < params.length; pidx++){
									// push for joiner definition
									lParam.push({name:params[pidx].name,type:params[pidx].type})
								}

								// create and add joiner
								todo.push(this.job.components['joiner'].id);
								applicationManagerInstance.getComponentManager().createLogicComponent(this.job.components['joiner'].id, lParam, lNsDef2);
							}
							
						}
						if (todo.length == 0){
							// check whether a splitter was created or not
							if(this.job.components['splitter']){
								// add publisher between solution and splitter
								applicationManagerInstance.getComponentManager().addPublisher(
										this.job.components['solution'].id, this.job.channels['solution_splitter'].name, this.job.components['solution'].eventName, undefined);
								// add subscriber between solution and splitter
								applicationManagerInstance.getComponentManager().addSubscriber(this.job.components['splitter'].id, this.job.channels['solution_splitter'].name, 'split', undefined);
								//add all subscriber and publisher between splitter and joiner
								//TODO ensure correct assignment of channels and operations and events
								for(var cidx = 0; cidx < splitterChannelNames.length; cidx++){
									applicationManagerInstance.getComponentManager().addSubscriber(
											this.job.components['joiner'].id, splitterChannelNames[cidx], "join" + this.job.components['solution'].parameters[cidx].matches, undefined);
									applicationManagerInstance.getComponentManager().addPublisher(
											this.job.components['splitter'].id, splitterChannelNames[cidx], "on" + this.job.components['solution'].parameters[cidx].name, undefined);
								}
							} else {
								//handling when no splitter is needed
								// --> create channel between solution and joiner
								var channelName_SolJoi = this.job.components['solution'].id + ' to ' + this.job.components['joiner'].id;
								applicationManagerInstance.getEventBroker().addChannel(channelName_SolJoi, "Link", this.job.components['solution'].parameters[0].type, undefined);
								// add publisher between solution and joiner
								applicationManagerInstance.getComponentManager().addPublisher(this.job.components['solution'].id, channelName_SolJoi, this.job.components['solution'].eventName, undefined);
								// add subscriber between solution and joiner
								applicationManagerInstance.getComponentManager().addSubscriber(this.job.components['joiner'].id, channelName_SolJoi, 'join' + this.job.components['solution'].parameters[0].matches, undefined);
							}
							//add Publisher source -> joiner
							applicationManagerInstance.getComponentManager().addPublisher(this.job.currentSourceId, this.job.channels['source_joiner'].name, this.job.currentEvent.getName(), undefined);
							//add Subscriber source -> joiner
							//TODO handle events from sources with multiple parameters
							applicationManagerInstance.getComponentManager().addSubscriber(this.job.components['joiner'].id, this.job.channels['source_joiner'].name, 'join' + entry.data.matchedParameters[0].name, undefined);
							//add publisher between joiner and destination
							applicationManagerInstance.getComponentManager().addPublisher(this.job.components['joiner'].id, this.job.channels['joiner_destination'].name, 'onJoin', undefined);
							//add subscriber between joiner and destination
							applicationManagerInstance.getComponentManager().addSubscriber(this.job.components['destination'].id, this.job.channels['joiner_destination'].name, entry.data.elementName, undefined);

							// publish buffered event again
							applicationManagerInstance.getEventBroker().publish(this.job.currentEvent, this.job.currentSourceId );										
							this.busyIndicator.hide();
							// minimize recommendation menu 
							this.minimizeRecommendationMenu();
							// unsubscribe integration function from system error channel
							applicationManagerInstance.getEventBroker().unsubscribe('componentLCChannel', handleIntegration, this);
						}
					}catch(EXE){this.log.error(EXE);}
				};
				
				// register integration finished handler
				applicationManagerInstance.getEventBroker().subscribe(undefined, undefined, 'object','componentLCChannel', handleIntegration, this);
				//basic declaration and declaration of logic component (joiner) 
				this.job.components = [];
				this.job.channels = [];
				this.job.components['joiner'] = {id: 'http://inf.tu-dresden.de/cruise/logic/eventjoin/' + new Date().getTime()};
				// declare destination component (representing the main activity selected by the user)
				this.job.components['destination'] = {id: entry.data.componentId};
				//get proposed solution for insufficient recommendation
				var solution = entry.data.solution; 
				this.job.components['solution'] = {id: solution.id, eventName: solution.eventName, parameters: solution.parameters};
				//check whether a splitter is needed or not
				if(this.job.components['solution'].parameters.length <= 1){
					// add channel between solution and joiner
					this.job.channels['solution_joiner'] = {
							name: this.job.components['solution'].id + ' to ' + this.job.components['joiner'].id,
							type: 'dataType'
					};
					applicationManagerInstance.getEventBroker().addChannel(this.job.channels['solution_joiner'].name, "Link", this.job.channels['solution_joiner'].type, undefined);	
				} else {
					// declare splitter
					this.job.components['splitter'] = {id: 'http://inf.tu-dresden.de/cruise/logic/eventsplit/' + new Date().getTime(), parameters: []};
					//TODO dynamically calculate namespaces
					var lNsDef1 = [{prefix:'upperactions', ns:'http://mmt.inf.tu-dresden.de/models/activity-actions.owl#'},
						           {prefix:'nfp', ns:'http://mmt.inf.tu-dresden.de/models/nfp.owl#'},
						           {prefix:'mcdl', ns:'http://mmt.inf.tu-dresden.de/models/mcdl.owl#'},
						           {prefix:'travel',ns:'http://mmt.inf.tu-dresden.de/cruise/travel.owl#'},
						           {prefix:'edyraactions', ns:'http://mmt.inf.tu-dresden.de/models/activity-edyraactions.owl#'}];
					todo.push(this.job.components['splitter'].id);
					
					// add channel between solution and splitter
					this.job.channels['solution_splitter'] = {
							name: this.job.components['solution'].id + ' to ' + this.job.components['splitter'].id,
							type: "dataType"
					};
					applicationManagerInstance.getEventBroker().addChannel(this.job.channels['solution_splitter'].name, "Link", this.job.channels['solution_splitter'].type, undefined);
					
					var splitterChannelNames = [];
				}
				//add channel bewteen source and joiner
				this.job.channels['source_joiner'] = {
						name: this.job.currentSourceId + ' to ' + this.job.components['joiner'].id, 
						type: 'dataType'
				};
				applicationManagerInstance.getEventBroker().addChannel(this.job.channels['source_joiner'].name, "Link", this.job.channels['source_joiner'].type, undefined);
				
				//add channel between joiner and destination
				this.job.channels['joiner_destination'] = {
						name: this.job.components['joiner'].id + ' to ' + this.job.components['destination'].id,
						type: this.job.components['solution'].parameters[0] + '...'
				};
				applicationManagerInstance.getEventBroker().addChannel(this.job.channels['joiner_destination'].name, "Link", this.job.channels['joiner_destination'].type, undefined);		
				// integrate solution component
				todo.push(this.job.components['solution'].id);
				this.integrateComponent(this.job.components['solution'].id, {
					ready: {
						handler: handleIntegration,
						scope: this
						},
					addSecond: {
						handler: function (id){
							// remove current id from todo list
							todo.remove(id);
							// rename id of current component (avoid redundancy)
							this.job.components['solution'].id = id+"#"+(+new Date())
							this.integrateComponent(this.job.components['solution'].id, {
								ready: {
									handler: this.handleIntegration,
									scope: this
								}
							});
						},
						scope: this,
						args: [entry.data.componentId]
					},
					useOld: {
						handler: function(){
							// use the existing component and complete the wiring
							//TODO check whether splitter was integrated or not and create correct publisher
							applicationManagerInstance.getComponentManager().addPublisher(
									this.job.components['solution'].id, this.job.channelName, entry.data.elementName, undefined);
							//TODO publish the queued event
							//applicationManagerInstance.getEventBroker().publish(this.job.currentEvent, this.job.currentSourceId );
						},
						scope: this,
						args: [entry]
					}
				});				
				// integrate destination component
				todo.push(this.job.components['destination'].id);
				this.integrateComponent(this.job.components['destination'].id, {
					ready: {
						handler: handleIntegration,
						scope: this,
					},
					addSecond: {
						handler: function (id){
							// remove current id from todo list
							todo.remove(id);
							// rename id of current component (avoid redundancy)
							this.job.components['destination'].id = id+"#"+(+new Date())
							this.integrateComponent(this.job.components['destination'].id, {
								ready: {
									handler: this.handleIntegration,
									scope: this
								}
							});
						},
						scope: this,
						args: [this.job.components['destination'].id]
					},
					useOld: {
						handler: function(){
							// use the existing component and complete the wiring
							applicationManagerInstance.getComponentManager().addSubscriber(
									this.job.components['destination'].id, this.job.channelName, entry.data.elementName, undefined);
							// publish the queued event
							//applicationManagerInstance.getEventBroker().publish(this.job.currentEvent, this.job.currentSourceId );
						},
						scope: this,
						args: [entry]
					}
				});

			} else {
				// CASE 2 - by unwired Event with sufficent solution
			    // add channel between source and destination
				this.job.channelName = this.job.currentSourceId + ' to ' + entry.data.componentId;
				applicationManagerInstance.getEventBroker().addChannel(this.job.channelName, "Link", "dataType", undefined);
				// TODO add correct dataTypes as Array of Strings representing URIs
				//add Publisher
				applicationManagerInstance.getComponentManager().addPublisher(this.job.currentSourceId, this.job.channelName, this.job.currentEvent.getName(), undefined);		
				// minimize recommendation menu 
				this.minimizeRecommendationMenu();
				this.job.selectedEntry = entry.data;
				// check whether the component has to be integrated
				// TODO concept for decision when one instance suffices		
				
				this.integrateComponent(entry.data.componentId, {
					ready: {
						handler: this.monitorIntegrationBasedOnEvents,
						scope: this,
					},
					useOld: {
						handler: function(){
							// use the existing component and complete the wiring
							applicationManagerInstance.getComponentManager().addSubscriber(
									entry.data.componentId, this.job.channelName, this.job.selectedEntry.elementName, undefined);
							// publish the queued event
							applicationManagerInstance.getEventBroker().publish(this.job.currentEvent, this.job.currentSourceId );
						},
						scope: this,
						args: [entry]
					}
				});
			}
			break;
        case "byOperation":
			//CASE 2 - by unwired Operations
			var isNotDND = !entry.data.isDND;
			if(isNotDND==true){
				//add channel
				this.job.channelName = entry.data.componentId + ' to ' + this.job.currentSourceId;
				if (applicationManagerInstance.getEventBroker().addChannel(this.job.channelName, "Link", "dataType", undefined)==true){
					//add Subscriber
					applicationManagerInstance.getComponentManager().addSubscriber(this.job.currentSourceId, this.job.channelName, this.job.selectedOperation, undefined);
				};
			}
			// minimize recommendation menu 
			this.minimizeRecommendationMenu();
			this.job.selectedEntry= entry.data;
			
			this.integrateComponent(entry.data.componentId, 
					{
						ready: {
							handler: this.monitorIntegrationBasedOnOperations,
							scope: this
						},
						addSecond: {
							handler: function (id){
								this.job.channelName = (id+"#"+(+new Date())) + ' to ' + this.job.currentSourceId;
								applicationManagerInstance.getEventBroker().addChannel(this.job.channelName, "Link", "dataType", undefined);	
								applicationManagerInstance.getComponentManager().addSubscriber(this.job.currentSourceId, this.job.channelName, this.job.selectedOperation, undefined);
								this.integrateComponent(id+"#"+(+new Date()), {
									ready: {
										handler: this.monitorIntegrationBasedOnOperations,
										scope: this
									}
								});
							},
							scope: this,
							args: [entry.data.componentId]
						},
						useOld: {
							handler: function(id){
								applicationManagerInstance.getComponentManager().addPublisher( 
										id, 
										this.job.channelName, 
										this.job.selectedEntry.elementName, undefined );
							},
							scope: this,
							args: [entry.data.componentId]
						}
					}
			);
			break;
        }
	},
	
	/**
	 * Handles the component integration based on wheter the component is already included or not.
	 * @private
	 * @param {Ext.cruise.client.RecommendationManager.ListEntry} selectedEntry the selected entry from the recommendation menu 
	 */
	integrateComponent:function(id, handlers){
		//check wheter component is already integrated or not
		if(!this.componentManager.componentExists(id)){
			// start showing busy Indicator until component is displayed
			this.busyIndicator.show();
			
			// integrate component
			var integrationRequest = new Ext.cruise.client.MCDLReqRespObject({
   				compConfig: null,
   				id: id
			});

			// fetch SMCDL
			applicationManagerInstance.getIntegrationManager().fetchSMCDLByID(integrationRequest);
			applicationManagerInstance.getEventBroker().subscribe(undefined, undefined, 'object', 'componentLCChannel', handlers.ready.handler, handlers.ready.scope);
		} else {
			if (handlers.addSecond){
				Ext.MessageBox.confirm("Component already present", "The selected component already exists. Should it be added anyway?", function(buttonId){
					if (buttonId == "yes" && handlers.addSecond){
						if (Ext.isFunction(handlers.addSecond.handler)){
							handlers.addSecond.handler.call(
										handlers.addSecond.scope || window,
										handlers.addSecond.args
									);
						}
					}
					if (buttonId == "no" && handlers.useOld)
						if (Ext.isFunction(handlers.useOld.handler)){
							handlers.useOld.handler.call(
									handlers.useOld.scope || window,
									handlers.useOld.args
								);
						}
				}, this);
			}else if (handlers.useOld && !handlers.addSecond){
				if (Ext.isFunction(handlers.useOld.handler)){
					handlers.useOld.handler.call(
							handlers.useOld.scope || window,
							handlers.useOld.args
						);
				}
			}
		}
	},
	
	/**
	 * Adds the selected event as publisher to the channel between the calling and new component after the component was completely integrated.
	 * @private
	 * @param {Ext.cruise.client.Message} message a system event message 
	 */
	monitorIntegrationBasedOnOperations: function(message){
		// check for integration finished event
		if (message.getName()=="componentInitialized"){
			var cid= message.getBody().cid;
			if (applicationManagerInstance.getComponentManager().isUIC(cid)) {
				this.appendCapToTitle(cid, this.job.selectedEntry.capText);
				
				setTimeout(function(){
					applicationManagerInstance.getLayoutManager().addComponent(cid, applicationManagerInstance.getComponentManager().getAdaptabilityPanel(cid));

					// publish message
					var msg = new Ext.cruise.client.Message();
					msg.setName('compositionExtended');
					msg.appendToBody('cid', cid);
					applicationManagerInstance.getEventBroker().publish(msg, undefined);
				}, 30);
			}
			
			// add publisher
			applicationManagerInstance.getComponentManager().addPublisher(cid, this.job.channelName, this.job.selectedEntry.elementName, undefined);

			// update the label and progressbar showing information about users' rating
			this.updateRatingInformation(cid,this.job.selectedEntry.rating||0, this.job.selectedEntry.count||0);

			this.busyIndicator.hide();
			
			// TODO externalize
			var smcdl= applicationManagerInstance.getComponentManager().getSMCDL(cid);
			if (smcdl!=undefined && smcdl!=null){
				var evs= smcdl.getElementsByTagName("event"),
					len= evs.length, idx=0;
				for (; idx < len; ++idx){
					var ev = evs[idx];
					if (ev.getAttribute("name") == this.job.selectedEntry.elementName){
						// TRIGGER 1 checks if a follow-up coupling should be recommended
						var deps= ev.getAttribute("dependsOn");
						if (deps!= null){
							deps= deps.split(" ");
							// TODO generalize for more than one Cap
							if (deps.length == 1){
								var dep= deps[0];
								var caps= smcdl.getElementsByTagName("capability"),
									c_len= caps.length, j=0;
								for (; j<c_len; ++j){
									var cap= caps[j];
									// search the corresponding capability and determine whether it is a operation cap.
									if (cap.getAttribute("id")==dep && cap.parentNode.nodeName=="operation"){
										this.job.knoeper= {
												event: ev.getAttribute("name"),
												cid: cid
										}
										this.recommendComponentsByOperations(cid, [cap.parentNode.getAttribute("name")]);
									}
								}
							}
						}
						
						// TRIGGER 2 checks if a "backlink" is reasonable, e.g, if there is a callback-Operation declared by the target event
						var cops= ev.getElementsByTagName("callbackOperation");
						if (cops.length==1){
							var cop= cops[0].getAttribute("name");
							
							if (this.job.knoeper){
								var mc= this.componentManager.getMediationConfig(),
									knoeperEvent= mc[this.job.knoeper.cid].events[this.job.knoeper.event],
									knoeperOperation= mc[cid].operations[cop];
								
								
								var len= knoeperEvent.parameters.length;
								if (len == knoeperOperation.parameters.length){
									var matching= true;
									for (var ki=0; ki < len; ++ki){
										if (knoeperEvent.parameters[ki]['type_component'] != knoeperOperation.parameters[ki]['type_component']){
											match= false;
											break;
										}
									}
									if (matching){ // create the wire TODO replacement strategy with "real" back link
										var channelName= this.job.knoeper.cid + ' to ' + cid;
										applicationManagerInstance.getEventBroker().addChannel(
												channelName,
												"Link", "dataType", undefined);
										applicationManagerInstance.getComponentManager().addPublisher(this.job.knoeper.cid, channelName, knoeperEvent.name, undefined);
										applicationManagerInstance.getComponentManager().addSubscriber(
												cid, channelName, knoeperOperation.name, undefined);
									}
								}
								
								delete this.job.knoeper;
							}
						}
					}
				}
			}
		}
		
		// unsubscribe integration function from system error channel
		applicationManagerInstance.getEventBroker().unsubscribe('componentLCChannel', this.monitorIntegrationBasedOnOperations, this);
	},
	
	/**
	 * Checks for both recommendations by events or operations if there exists some follow up couplings. These are indicated by 'dependsOn' or 'callbackOperation'
	 */
	checkFollowUpCoupling: function(sourceID, destinationID, sourceElement, destinationElement){
		
		//TODO delete
		var elementID,
			elementName;
		if(true){
		// by uncuppled Event
			elementID = destinationID;
			elementName = destinationElement
		} else {
		// by Operation
		}
		
		var smcdl= applicationManagerInstance.getComponentManager().getSMCDL(elementID);
		if (smcdl!=undefined && smcdl!=null){
			var evs= smcdl.getElementsByTagName("event"),
				len= evs.length, idx=0;
			for (; idx < len; ++idx){
				var ev = evs[idx];
				// only if by Operation
				//if (ev.getAttribute("name") == elementName){
					// TRIGGER 1 checks if a follow-up coupling should be recommended
					var deps= ev.getAttribute("dependsOn");
					if (deps!= null){
						deps= deps.split(" ");
						// TODO generalize for more than one Cap
						if (deps.length == 1){
							var dep= deps[0];
							var caps= smcdl.getElementsByTagName("capability"),
								c_len= caps.length, j=0;
							for (; j<c_len; ++j){
								var cap= caps[j];
								// search the corresponding capability and determine whether it is a operation cap.
								if (cap.getAttribute("id") == dep && cap.parentNode.nodeName=="operation"){
									if(flag = "byEvent"){
										//by Event
										if(cap.parentNode.getAttribute("name") == sourceElement){
											this.job.knoeper= {
													event: ev.getAttribute("name"),
													cid: cid
											}
											this.recommendComponentsByOperations(cid, [cap.parentNode.getAttribute("name")]);
										}
									}else{
										// by Operation
										this.job.knoeper= {
												event: ev.getAttribute("name"),
												cid: cid
										}
										this.recommendComponentsByOperations(cid, [cap.parentNode.getAttribute("name")]);
									}
								}
							}
						}
					}
					
					//TODO TRIGGER 2 checks if a "backlink" is reasonable, e.g, if there is a callback-Operation declared by the target event

				//}
			}
		}
		
	},
	
	/**
	 * Adds the selected operation as subscriber to the channel between the calling and new component after the component was completely integrated.
	 * @private
	 * @param{Ext.cruise.client.Message} message a system event message 
	 */
	monitorIntegrationBasedOnEvents: function(message){
		// check for integration finished event
		if (message.getName()=="componentInitialized"){
			
			var cid= message.getBody().cid;
			if (applicationManagerInstance.getComponentManager().isUIC(cid)) {
				this.appendCapToTitle(this.job.currentSourceId, this.job.selectedEntry.capText);
				
				setTimeout(function(){
					applicationManagerInstance.getLayoutManager().addComponent(cid, applicationManagerInstance.getComponentManager().getAdaptabilityPanel(cid));
					// send message
					var msg = new Ext.cruise.client.Message();
					msg.setName('compositionExtended');
					msg.appendToBody('cid', cid);
					applicationManagerInstance.getEventBroker().publish(msg, undefined);
				}, 30);
			}

			// add subscriber
			applicationManagerInstance.getComponentManager().addSubscriber(cid, this.job.channelName, this.job.selectedEntry.elementName, undefined);
			
			// update the label showing information about users' rating
			this.updateRatingInformation(cid,this.job.selectedEntry.rating||0, this.job.selectedEntry.count||0);
				
			// publish buffered event again
			applicationManagerInstance.getEventBroker().publish(this.job.currentEvent, this.job.currentSourceId );
						
			this.busyIndicator.hide();
		}
		// unsubscribe integration function from system error channel
		applicationManagerInstance.getEventBroker().unsubscribe('componentLCChannel', this.monitorIntegrationBasedOnEvents, this);
	},
	
	appendCapToTitle: function(cid, capText){
		var cm= applicationManagerInstance.getComponentManager();
		if (!cm.isUIC(cid)) return;
		
		var	panel= cm.getAdaptabilityPanel(cid),
			root= panel.initialConfig.title,
			idx= root.indexOf(" (provides ");
		
		var title;
		if (idx!=-1){
			root= root.substring(0, idx);
			panel.initialConfig.title= root;
		}
		title= root+" (provides "+capText+")";
		
		// TODO handle multiple capabilities
		panel.setTitle(title);
		cm.getComponentInstance(cid).setProperty("title", title);
	},
	
	/**
	 * This function updates the displayed rating information for one component
	 * @private
	 * @param {String} cid The component ID
	 * @param {Double} rating The rating for the component
	 * @param {Double} counts The number of ratings
	 */
	updateRatingInformation : function(cid,rating,counts){
		// get label and progressbar of the bbar from the component
		var pgb= Ext.getCmp(cid+"ratingProgress");
		if (pgb){
			pgb.reset();
			pgb.updateProgress( rating/5.0, 'Rating: '+rating + " ("+counts+" votes)", true );
		} else{
			applicationManagerInstance.getLog().warn('[RecMan] Error while updating Ratings!')
		}
	},

	/**
	 * Setter for the recommendation menu
	 */	
	setRecommendationMenu: function(recmenu){
		this.recommendationMenu = recmenu;
	},
	
	/**
	 * Getter for the recommendation menu
	 */
	getRecommendationMenu: function(){
		return this.recommendationMenu;
	}
});

/**
 * A global structure for an entry of the recommendation menu represented by an Ext.data.Record
 * @private
 */
Ext.cruise.client.RecommendationManager.ListEntry= Ext.data.Record.create([
				{name: 'componentId', type: 'string'},
				{name: 'comment', type: 'string'},
				{name: 'label', type: 'string'},
				{name: 'elementName', type: 'string'},
				{name: 'screenshot', type: 'string'}
			]);