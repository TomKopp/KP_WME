/**
 * @class Ext.cruise.client.adapt.impl.CroCoAdapter This is the implementation of IContextServiceAdapter
 * for the contextservice CroCo. It provides synchonous an asynchonrous communication with CroCo by 
 * converting dataformats and interfaces.
 * 
 * @public
 * @author Carsten Radeck
 */ 
Ext.cruise.client.adapt.impl.CroCoAdapter = Ext.extend(Ext.cruise.client.adapt.IContextServiceAdapter, {
	comet: null,
	cr: null,
	parser: null,
	puffer: {},
	iic: { working: false, todo: null},
	pathToQueryMapping: null,

	constructor: function(logger, contextmgr, crocoUrl){
		if (!crocoUrl)
			crocoUrl= "http://localhost:8080/CroCoWS";
		Ext.cruise.client.adapt.impl.CroCoAdapter.superclass.constructor.apply(this, [logger, contextmgr, crocoUrl]);

		this.pathToQueryMapping= new Array();
	},
	
	dispose: function(){
		delete this.parser;
		this.puffer= {};
		this.comet.dispose();
		delete this.comet;
		this.iic.working= false;
		this.iic.todo= null;
	},
	
	/**
	 * Initialize this adapter. Returns true if sucessful, false otherwise.
	 * @public
	 * @function
	 * @param {Object} userid
	 * @param {Object} adaptMan
	 */
	init: function(userid, adaptMan){
		try{
		this.comet = new Ext.cruise.client.adapt.comet.CroCoComet(
					this.log,
					this.cometCallback.createDelegate(this),
					adaptMan.cometConnected.createDelegate(adaptMan)
				);
		this.comet.init(this.crocoUrl+"/cometd");

		this.parser= new Ext.cruise.client.adapt.impl.CroCoParser(this.log, userid);
		}catch(e){this.log.error(e); return false;}

		// get information about the structure of the context-ontolgy as a JSON-Object
		this.cr= this._receiveContextStructure(this.crocoUrl+'/ctxstructure.js');
		if (!this.cr)
			return false;
		return true;
	},

	/**
	 * Subsribes for the notification about changes of the specified contextparameters.
	 * 
	 * @public
	 * @function
	 * @param {Object} requiredContextParams the contextparameters
	 * @param {Object} ucp URI of the UserContextProfile
	 */
	subscribe: function(requiredContextParams, ucp) {
		if (Ext.isArray(requiredContextParams)){
			for (var i=0; i< requiredContextParams.length; ++i){
				this.log.debug('[CroCoAdapter] subscribing for',requiredContextParams[i]);
				try{
				var query= this.createStrictQuery(requiredContextParams[i], ucp);
				
				this.pathToQueryMapping.push({
					path: requiredContextParams[i],
					query: query
				});

				this.comet.subscribe(query, false);
				
				}catch(e){this.log.error(e);}
			}
			this.contextmgr._queriesReady();
		}else
			this.log.error('[CroCoAdapter] receiveContext: wrong parametertype. expected array, but it is '+typeof(requiredContextParams));
	},

	/**
	 * Queries the UserContextProfile of the given user.
	 * @param {Object} userid the userid , corresponds to property 'accountname' of the UCP
	 */
	getProfile: function(userid){
		var xml= this.createGetProfileQuery(userid);
		var req = this.soapSynch(this.crocoUrl+'/services/ContextQueryWS/queryContext', xml);
		if(req.status == 200){
			var prof= this.parser.parseProfile(req.responseXML);
			this.log.info('[CroCoAdapter] current UCP is:',prof);
			
			if (!prof && confirm('There seems to be no user-account for you yet. An account will be created now if you want.')){
				// synchronously create new user-profile- instance
				try {
					prof= this.createProfile(userid);
				} catch (e) {
					this.log.error(e);
				}
			}
			return prof;
		}else{
			this.log.error('[CroCoAdapter] getProfile failed. http status='+req.status);
		}
		return undefined;
	},
	/**
	 * Returns the mulitplicity of the property given by the path.
	 * @function
	 * @protected
	 * @param {Object} path the path of the ontology-concept
	 */
	getMultiplicity: function(path){
		var x=this._getProperty(path);
		if (x)
			return x.multiplicity;
	},
	/**
	 * Returns whether the property given by the path is datatype or not.
	 * @function
	 * @protected
	 * @param {Object} path the path of the ontology-concept
	 */
	getIsDatatypeProperty: function(path){
		var x=this._getProperty(path);
		if (x)
			return (x.type==0);
	},
	
	/**
	 * Handles comet-callbacks from CroCo.
	 * @function
	 * @protected

	 * @param {Object} query the query that changed
	 * @param {Object} resultXML the SPARQL-XML-Result
	 */
	cometCallback: function(query, resultXML){
		try{
		this.log.debug('[CroCoAdapter] cometCallback for query',query);
		if (query && resultXML){
			//array= [ (name, instance) ]
			var array= this.parser.parseResults(resultXML);
			var path;
			for (var k=0; k< this.pathToQueryMapping.length; ++k){
				if (this.pathToQueryMapping[k].query == query){
					path= this.pathToQueryMapping[k].path;
				}
			}
			
			if (!path) {
				this.log.error("[CroCoAdapter] NO PATH FOR QUERY",query);
				return;
			}
			
			this.contextmgr.updateLocalContext(path, array, undefined, undefined, true);
		}
		}catch(exe){this.log.error(exe);}
	},
	/**
	 * Expand the given Property. Scheme: 'shorthandprefix:property' ---> 'fullprefix:property'
	 * @function
	 * @private
	 * @param {Object} prop the property
	 */
	_expandPredicateName: function(prop){
		var ret= /(\w+):(\w+)/.exec(prop);
		var pred= this.cr.mappings[ret[1]]+ret[2];
		return pred;
	},

	/**
	 * Get the JSON object from the ontology's structure-description for the given path 
	 * @function
	 * @private
	 * @param {Object} path the path of the ontology-concept
	 */
	_getProperty: function(path){
		path= Ext.cruise.client.adapt.util.PathUtils.normalizePath(path);
		path=path.replace(/\:/g,'_');
		path=path.replace(/\//g,'.');
		return eval('this.cr.'+path);
	},
	/**
	 * Download the structure description of the current ontology
	 * @function
	 * @private
	 * @param {Object} url URL of the structure description
	 */
	_receiveContextStructure: function(url){
		this.log.debug('[CroCoAdapter] receiving JSON of context model\'s structure');
		// synchronously fetch JSON-represenataion of contextmodel
		var req= applicationManagerInstance.getServiceAccess().createXHR();
		req.open("GET",url, false);
		req.send();
		if(req.status == 200){
			try{
				return ret= eval(req.responseText);
			}catch(o){this.log.error("[CroCoAdapter] error");this.log.error(o);}
		} else
			return undefined;
	},
	/**
	 * Query the contextmodel.
	 * @function
	 * @public
	 * 
	 * @param {Object} sparql the query in SPARQL
	 */
	queryContext: function(sparql){
		var xml= utils.soap()+'<web:queryContext><web:sparqlQuery><![CDATA['+sparql+']]></web:sparqlQuery></web:queryContext></soapenv:Body></soapenv:Envelope>';
		var req= this.soapSynch(this.crocoUrl+'/services/ContextQueryWS/queryContext', xml);
		if(req.status == 200){
			//this.log.debug('queryContext response',req.responseText);
            var respxml = Ext.cruise.client.Utility.getXMLDOMFromXHR(req);
            var ret = Ext.cruise.client.Utility.getElementsByTagNameNS(Ext.cruise.client.adapt.Constants.CROCO_NS_IE, Ext.cruise.client.adapt.Constants.CROCO_NS, 'return', respxml)[0];
            if (!ret) return undefined;

            // parse CDATA
			var cdata = ret.textContent;
			if (!cdata)	return undefined;
			var sparql_res = Ext.cruise.client.Utility.parseXMLFromString(cdata);
			if (sparql_res){
				return this.parser.parseResults(sparql_res);
			}
		}
		return undefined;
	},

	/**
	 * Receive a context value specified by its path. Therefore a synchonrous request is 
	 * sent to CroCo.
	 *   
	 * @function
	 * @public
	 * 
	 * @param {Object} property the path
	 * @param {Object} ucp the UCP
	 */
	getContextValue: function(property, ucp){
		// synchronously query croco
		var query= this.createQuery(property, ucp);
		var xml= utils.soap();//<![CDATA[Inhalt]]>
		xml+= '<web:queryContext><web:sparqlQuery><![CDATA['+query+']]></web:sparqlQuery></web:queryContext></soapenv:Body></soapenv:Envelope>';
		
		var req= this.soapSynch(this.crocoUrl+'/services/ContextQueryWS/queryContext', xml);
		if(req.status == 200){
			//this.log.debug('getContext response',req.responseText);
            var respxml = Ext.cruise.client.Utility.getXMLDOMFromXHR(req);
            var ret = Ext.cruise.client.Utility.getElementsByTagNameNS(Ext.cruise.client.adapt.Constants.CROCO_NS_IE, Ext.cruise.client.adapt.Constants.CROCO_NS, 'return', respxml)[0];      
            if (!ret)
				return undefined;

            // parse CDATA
            var cdata = ret.textContent;
            if (!cdata)
			return undefined;
            // build DOM from CDATA to ease processing
            var sparql_res = Ext.cruise.client.Utility.parseXMLFromString(cdata);
            if (sparql_res){
				return this.parser.parseResults(sparql_res);
			}
		}
		return undefined;
	},
	
	/**
	 * Create a query for requesting the UCP
	 * @function
	 * @private
	 * @param {String} userid the userid
	 */
	createGetProfileQuery: function(userid){
 		var xml= utils.soap()+
			'<web:queryContext>'+
			'<web:sparqlQuery><![CDATA[SELECT ?x WHERE { ?x a <'+this.cr.mappings.cruise+'UserContextProfile>. '+
				'?x <'+this.cr.mappings.cruise+'accountname> "'+userid+'".}]]></web:sparqlQuery>'+
			'</web:queryContext>'+
			'</soapenv:Body></soapenv:Envelope>';
		return xml;
	},

	/**
	 * Try to create a UCP for the given userid.
	 * @public
	 * @function
	 * 
	 * @param {Object} userid the userid
	 */
	createProfile: function(userid, args){
        // create user
        var xml= utils.soap();
        xml+= '<web:addContextWithResponse><web:provider>'+Ext.cruise.client.Constants._RUNTIME_ID+'</web:provider>';

		var pred= this._getProperty('/cruise:accountname');
		var exp= this._expandPredicateName('cruise:UserContextProfile');

        var ret= this.parser.newInstance(exp, xml, 1.0);
        xml= ret.xml;
        var instance= ret.instance;
		this.log.debug('[CroCoAdapter] creating user profile',instance);

        xml= this.parser.edit(instance, this._expandPredicateName('cruise:accountname'), userid,
		        xml, 1.0, this._expandPredicateName('xsd:string'));

        xml += '</web:addContextWithResponse>';
        xml += '</soapenv:Body></soapenv:Envelope>';

        this.log.debug('[CroCoAdapter] resulting soap envelope',xml);
		var req= this.soapSynch(this.crocoUrl+'/services/ContextUpdateWS/addContextWithResponse', xml);
		if(req.status == 200){
            try{
              	var _succ= false;
		        var xml= Ext.cruise.client.Utility.getXMLDOMFromXHR(req);
                if (xml){
                    var results = Ext.cruise.client.Utility.getElementsByTagNameNS(Ext.cruise.client.adapt.Constants.CROCO_NS_IE, Ext.cruise.client.adapt.Constants.CROCO_NS, 'return', xml);             
                    
                    if (results && results.length>0){
                        _succ= (results[0].textContent=='true'? true: false);
                    }
                }

                this.log.info('[CroCoAdapter] adding user-proile completed normally? '+_succ);
                if (_succ)
					return instance;
                else
                    this.log.error('[CroCoAdapter] Adding userprofile failed! CroCo returned false!');
            }catch(e){alert(e);}
		}else{
			this.log.error('[CroCoAdapter] failed to add user profile. http status:', req.status);
		}
		return undefined;
	},

	/**
	 * Send the given contextdata to CroCo.
	 * 
	 * @public
	 * @function
	 * context= (path, value+, confidence)*
	 * @return {boolean}
	 */
	sendContext: function(context, ucp, synch){
		if (!Ext.isArray(context)) return false;
		if (context.length==0) return true;
		var qs= new Date();
		
		// soap-msg to be sent
		var xml= utils.soap()+'<web:addContextWithResponse><web:provider>'+Ext.cruise.client.Constants._RUNTIME_ID+'</web:provider>';
		var xml_before= xml; // copy it to be able to compare afterwards
		
		var puffer=this.puffer;
		puffer.done= {};
		Ext.each(context, function(c){ // for each statement to be fed into the contextmodel...
			xml=this.generateRDF(c, xml, ucp, puffer);
			this.log.debug("[CroCoAdapter] ________________PUFFER");
			this.log.debug('[CroCoAdapter] ',puffer,puffer.done);
			this.log.debug("[CroCoAdapter] -----------------------");
		}, this);
		
		var nothingtosend= (xml==xml_before); // the 'new' context doesnt effect the model at all
		
		xml += '</web:addContextWithResponse></soapenv:Body></soapenv:Envelope>';

		this.log.debug('[CroCoAdapter] sendContext: GENERATED soap envelope ',xml,'in',((new Date()).getTime()-qs.getTime()));
		qs= new Date();
		//nothingtosend=true;
		if (!nothingtosend) {
			if (synch){
				this.log.debug("[CroCoAdapter] sendcontext synchron");
				var resp= this.soapSynch(this.crocoUrl+"/services/ContextUpdateWS/addContextWithResponse", xml);
				this.log.debug("[CroCoAdapter] sendcontext synchron status=",resp.status);				
			}else {
				this.log.debug("[CroCoAdapter] sendcontext asychron");
				var xhr= applicationManagerInstance.getServiceAccess().createXHR(this);
				xhr.open("POST", this.crocoUrl+"/services/ContextUpdateWS/addContext");
				xhr.setRequestHeader("Content-Type","application/soap+xml");
				xhr.onreadystatechange= function(response, opt){
						if (response.readyState==4)
							this.log.debug("[CroCoAdapter] sendcontext asynchron status=", response.status);
					};
				xhr.send(xml);
			}
		}else
			this.log.debug("[CroCoAdapter] sendContext: there is nothing to send at all.");

		this.log.info("[CroCoAdapter] sending took:",((new Date()).getTime()-qs.getTime()));
	},
	
	/**
	 * Generates required ContextFacts in XML-notation for the ContextUpdate-service of CroCo.
	 * This includes querying whether instances along a path are missing and subsequently creating
	 * them.
	 * 
	 * @function
	 * @private
	 * @param {Object} c
	 * @param {Object} xml
	 * @param {Object} ucp
	 * @param {Object} puffer
	 */
	generateRDF: function(c, xml,ucp, puffer){	// c= {path, value+, confidence}
		var array= Ext.cruise.client.adapt.util.PathUtils.parsePath(c.path);
		if (array.length == 1 && !array[0].condition) {
			var pred= this._getProperty(c.path);			
			// specialcase : simple path of depth 1 with no condition 
			//--> assume its a datatype property
			if (pred.type==0){
				// edit
				this.log.debug("[CroCoAdapter] generateRDF:",c.path,"is special case");
				var n = this._expandPredicateName(array[0].prop);
				// instance_uri, pred, newvalue, xml, datatype
				xml = this.parser.edit(ucp,
							array[0].prop,
							c.value,
							xml,
							c.confidence,
							this._expandPredicateName(pred.range));
			}
		} else {// standard case: query croco according to the path
				// use existing instances, i.e edit them
				// create missing instances and link them
			this.log.debug("[CroCoAdapter] generateRDF: currently processing",c.path, Ext.isArray(c.value)?"(array of length"+c.value.length+")":c.value, c.confidence);
			var query = this.createQuery(array, ucp);
			
			var qs= new Date();
			var answer= this.queryContext(query);
			this.log.info("[CroCoAdapter] generateRDF: CroCo answered in",((new Date()).getTime()-qs.getTime()));
			//Ext.each(answer, function(l){log.debug(l);});
			
			var accumul_path="/";// accumulates the current path beginning at the root
			var _prev= ucp; // the previous instance (as string in format prefix:prop)
			var inst; // current instance
			for(var r=0; r< array.length;++r){
				var curr= array[r];
				
				for (var k=0;k< answer.length; ++k){
					// convert präfix_prop -->> präfix:prop
					if (answer[k].name.replace(/\_/g, ":") == curr.prop){
						inst= answer[k].instance;
						break;
					}
				}
				this.log.debug("[CroCoAdapter] generateRDF: current property",curr.prop,inst);
				
				accumul_path+=curr.prop+"/";
				var _pred= this._getProperty(accumul_path);
				if (inst && _pred.type==1 && _pred.multiplicity !=-1){
					// its an inner and known instance (of objectproperty with multiplicity=1)
					// skip it, nothing to do
					this.log.debug("[CroCoAdapter] continuing");
					_prev = inst;
				}else {// create
					// its a datatype-property
					if (_pred.type==0){
						var n = this._expandPredicateName(curr.prop);
						// edit
						if (_pred.multiplicity == -1 && Ext.isArray(c.value)) {
							// dataprop with *-multiplicity 
							for (var g = 0; g < c.value.length; ++g) {
								xml = this.parser.edit(_prev, n, c.value[g], xml, c.confidence ,this._expandPredicateName(_pred.range));
							}
						}else {
							xml = this.parser.edit(_prev, n, c.value, xml, c.confidence, this._expandPredicateName(_pred.range));
						}
					}else { // objectproperty
						// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
						// objectprop with 1-muliplicity (resp. max 1) 
						// 		(condition prohibited resp. ignored)
						// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
						if (_pred.multiplicity == 1) {
							var ret;
							if (!puffer[accumul_path]) {// avoid creating multiple instances if there are several paths sharing some partition
								//ret == {xml, instance}
								ret = this.parser.newInstance(this._expandPredicateName(_pred.range), xml, c.confidence);
								xml = ret.xml;
								puffer[accumul_path]= ret.instance;
								
								// handle required predicates to avoid inconsistency-errors in croco
								if (_pred.requires && Ext.isArray(_pred.requires)) {
									this.log.debug("[CroCoAdapter] required...", _pred.requires);
									try {
										xml= this._handleRequirements(_pred, xml, accumul_path, c, puffer, ret.instance);
									} catch (e) {this.log.error(e);}
								}
							}else {
								ret={}; 
								ret.instance= puffer[accumul_path];
							}
							if (!puffer.done[curr.prop]){ // avoid redundant settings
								// connect instances via the appropriate property
								var n = this._expandPredicateName(curr.prop);
								xml = this.parser.edit(_prev, n, ret.instance, xml, c.confidence, this._expandPredicateName(_pred.range));
								puffer.done[curr.prop]=true;
							}
							_prev = ret.instance;
						// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
						// objectprop with *-muliplicity (requires condition)
						// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
						}else {
							// condition neccessary
							if (!curr.condition){
								if (r == array.length - 1) {
									// last part of path is a objectproperty with multiplicity of n>=0
									// special case to be able to add new instance to *-prop
									// the value is then interpreted as the uri of the new instance
									this.log.debug("[CroCoAdapter] special case", c.value);
									var pname= this._expandPredicateName(_pred.range);
									
									xml = this.parser.newInstanceWithUri(c.value, pname, xml, c.confidence);
									xml = this.parser.edit(_prev, this._expandPredicateName(curr.prop), c.value, xml, c.confidence, pname);
									
									continue;
								}
								else {
									// inner *-prop require a condition to match the exact instance
									this.log.error("[CroCoAdapter] condition missing");
									continue;
								}
							}
							
							// handle the case where instances already exist
							if (Ext.isArray(inst)){
								this.log.debug("[CroCoAdapter] array...",inst);
								var hit;
								// utilize the structure of the SPARQL-Query resp. the SPARQL-Result
								for (var asd = 0; asd < inst.length; ++asd) {
									for (var nk=0;nk< answer.length; ++nk){
										if (answer[nk].name.replace(/\_/g, ":") == curr.prop+"2"){
											hit= answer[nk].instance;
											break;
										}
									}
								}
								this.log.debug("[CroCoAdapter] using...",hit);
								_prev = hit;
								continue;
							}
							if (inst){
								this.log.debug("[CroCoAdapter] single inst@multi...",inst);
								var hit;
								// utilize the structure of the SPARQL-Query resp. the SPARQL-Result
								for (var asd = 0; asd < inst.length; ++asd) {
									for (var nk=0;nk< answer.length; ++nk){
										if (answer[nk].name.replace(/\_/g, ":") == curr.prop+"2"){
											hit= answer[nk].instance;
											break;
										}
									}
								}
								this.log.debug("[CroCoAdapter] checking",hit,"?=",inst);
								if (hit==inst){
									_prev = hit;
									this.log.debug("[CroCoAdapter] using", _prev);
									continue;
								}
								this.log.debug("[CroCoAdapter] doesnt satisfy condition");
							}
							// TODO handle reqs
							// create missing instance
							if (!puffer[accumul_path]) {// avoid creating multiple instances if there are several paths sharing some partition
								//ret == {xml, instance}
								ret = this.parser.newInstance(this._expandPredicateName(_pred.range), xml, c.confidence);
								xml = ret.xml;
								puffer[accumul_path]= ret.instance;
							}else {
								ret={};
								ret.instance= puffer[accumul_path];
							}
							if (!puffer.done[curr.prop]){ // avoid redundant settings
								// connect instances via the appropriate property
								var n = this._expandPredicateName(curr.prop);
								xml = this.parser.edit(_prev, n, ret.instance, xml, c.confidence ,this._expandPredicateName(_pred.range));
								puffer.done[curr.prop]=true;
							}
							_prev = ret.instance;
							
							// now use the just created instance as the root of a new subtree
							xml+= this._generateRDFFromCondition(curr, answer , _prev, accumul_path, puffer, c.confidence);
						}
					}
				}
			}
		}
		return xml;
	},
	
	/**
	 * Handle 'requirements' for the given path.
	 * @private
	 * @function 
	 */
	_handleRequirements: function(_pred, xml, accumul_path, c, puffer, instance){
		for (var idx = 0; idx < _pred.requires.length; ++idx) {
			var requirement = _pred.requires[idx];

			var req_prop = this._getProperty(accumul_path + requirement);
			if (!req_prop) continue;

			for (var k = 0; k < req_prop.multiplicity; ++k) {
				var req_new = this.parser.newInstance(this._expandPredicateName(req_prop.range), xml, c.confidence);
				xml = req_new.xml;
				var resolved = requirement.replace(/_/g, ':');
				puffer[accumul_path + resolved + '/'] = req_new.instance;
				xml = this.parser.edit(instance, this._expandPredicateName(resolved), req_new.instance, xml, c.confidence, this._expandPredicateName(req_prop.range));
				
				if (Ext.isArray(req_prop.requires)) {// recurse...
					this.log.debug("[CroCoAdapter] recursivly handle reqs", req_prop.requires);
					xml= this._handleRequirements(req_prop, xml, accumul_path + resolved + '/', c, puffer, req_new.instance);
				}
			}
		}
		return xml;
	},
	
	// TODO handle paths of length>1 in condition
	/**
	 * Creates ContextFacts for CroCo's update-service from condition-parts of paths
	 * Its restricted to AND-ed terms over the == -operator, cause everything else is quite
	 * useless for creating instance-data
	 * @private
	 * @function
	 */
	_generateRDFFromCondition: function(curr, answer, _prev, accumul_path, puffer, confidence){
		// check whether the condition matches the form 'operand operator operand2'
		var terms= curr.condition.split("&&");
		var res = "";
		for (var b = 0; b < terms.length; ++b) {
			var erg = /(.+)\s*([&|!=][&|=])\s*(.+)/.exec(utils.trim(terms[b]));
			if (!erg || erg.length < 4) {
				this.log.error("[CroCoAdapter] _generateRDFFromCondition: invalid condition");
				return "";
			}
			this.log.debug("[CroCoAdapter] subrdf", accumul_path, _prev, curr, erg);
			
			// handle operators, only == is usefull in the case of creation
			for (var j = 2; j < erg.length; j += 2) {
				this.log.debug("[CroCoAdapter] operator:", erg[j],"operands:", erg[j - 1], erg[j + 1]);
				var value = erg[j + 1];
				
				if (erg[j] == "==") {
					var paths = erg[j - 1].match(/(\/\w+:\w+){1,}/g);
					if (paths.length == 0) {
						paths = erg[j + 1].match(/(\/\w+:\w+){1,}/g);
						value = erg[j - 1];
					}
					if (paths.length == 1) {
						paths[0] = Ext.cruise.client.adapt.util.PathUtils.normalizePath(paths[0]);
						var property = this._getProperty(accumul_path + paths[0]);
						this.log.debug("[CroCoAdapter]",accumul_path, property);
						
						if (property.type != 0) {
							// its an objectprop -> interpret as IRI
							if (value.indexOf("\"") == 0) 
								value = value.substring(1);
							if (value.indexOf("\"") == value.length - 1) 
								value = value.substring(0, value.length - 1);
						}
						this.log.debug("[CroCoAdapter] value=", value);
						// connect instances via the appropriate property
						res = this.parser.edit(_prev, this._expandPredicateName(paths[0]), value, res, confidence, this._expandPredicateName(property.range));
					}
				}
			}
		}
		this.log.debug("[CroCoAdapter] _generateRDFFromCondition generated: ",res);
		return res;
	},
	
	/**
	 * Convert prefix:prop --> ?prefix_prop for creating queries. 
	 * @private
	 * @function
	 * @param {String} prop the property (a single piece of a whole path)
	 */
	convert: function(prop){
		return '?'+prop.replace(/\:/g,"_");
	},
	
	/**
	 * Hanldes a term of a condition appended to a property.
	 * @private
	 * @function 
	 */
	_handleTerm: function(rootpath, condition, oi, appendix){
		var res="";

		// term = "pathexpression operator operand"
		var paths= condition.match(/(\/\w+:\w+){1,}/g);
		this.log.debug("[CroCoAdapter] handleTerm #paths=",paths.length);
		if (paths.length>0){
			var asd= Ext.cruise.client.adapt.util.PathUtils.normalizePath(paths[0]); // has to be exactly one 
			
			var objectType= this._getProperty(rootpath+asd);
			if (objectType) objectType= "<"+this._expandPredicateName(objectType.range)+">"; 
			if (!objectType) return res;
			
			var rest= condition.substring(condition.indexOf(asd)+asd.length);
			rest=utils.trim(rest);
			// assume the form "operator operand"
			var s= rest.split(" ");
			var operator= s[0];
			if (operator=="==")
				operator= "=";
			var operand= s[1];

			var _var= this.convert(asd);
			if (appendix) {
				res += "OPTIONAL{";
				res += oi + appendix + ' <' + this._expandPredicateName(asd) + '> ' + _var + '. ';
				res += 'FILTER ( ';
				res += _var + ' ' + operator + ' "' + operand +'"^^'+objectType;
				res += "). }.";
			}else {
				var _var= this.convert(asd);
				res+= oi+' <'+ this._expandPredicateName(asd) + '> '+_var+'. ';
				res+='FILTER ( ';
				res+= _var+' '+operator+' "'+operand+'"^^'+objectType;
				res+="). ";
			}
		}
		this.log.debug("[CroCoAdapter] _handleterm->",res);
		return res;
	},	

	/**
	 * Creates ContextFacts from conditions apdended to properties
	 * @private
	 * @function 
	 */
	_buildCondition: function(rootpath, condition, oi, appendix){
			var and= condition.indexOf("&&");
			var or=  condition.indexOf("||");
			if (and==-1 && or==-1){ // simple case
				return this._handleTerm(rootpath, condition, oi, appendix);
			}
			if (and!=-1 && or==-1){ // two terms combined by &&
				this.log.fatal("[CroCoAdapter] _builcondition: tbd ... only using first term of conjunction");
				return this._handleTerm(rootpath, condition, oi, appendix);
			}
	},
	
	/**
	 * Builds a SPARQL-Query for the specified path.
	 * @function
	 * @private 
	 * @param {string} path
	 * @param {string} rootInst
	 */
	//TODO atm there are only conditions with pathexpressions of depth one supported
	createQuery: function(path, rootInst){
		var query='SELECT * WHERE{ ';
		var array=path;
		if (typeof(path) == 'string') {
			array = Ext.cruise.client.adapt.util.PathUtils.parsePath(path);
		}
		var obj= '<'+rootInst+'>';
		var subj;
		var accumul_path="/";
		var appendix=2;
		for (var i=0; i< array.length; ++i){
			accumul_path+= array[i].prop+"/";
			var pred= this._expandPredicateName(array[i].prop);
			//log.debug("createQuery ",array[i].prop,accumul_path);
			subj= this.convert(array[i].prop);
			
			query += " OPTIONAL {";
			//if (array.length!=1 && i== array.length-1)
			if (i > 0) {
				query+= obj+appendix+' <'+pred+'> '+subj+'.';
			}else
				query+= obj+' <'+pred+'> '+subj+'.';
			
			if(array[i].condition){
				query+="FILTER("+obj+appendix+" = "+obj+(appendix>2?appendix-1:"")+")";
				query+= "}. ";
				query+= this._buildCondition(accumul_path, array[i].condition, subj,appendix);
				++appendix;
			}
			//if (array.length!=1 && i== array.length-1)
			if (i > 0 && !array[i].condition) {
				query+="FILTER("+obj+appendix+" = "+obj+(appendix>2?appendix-1:"")+")";
			}
			if(!array[i].condition)
				query+=" }.";
			
			obj = subj;
        }
        query+='}';
		
        this.log.debug('[CroCoAdapter] createQuery(',path,rootInst,') === ',query);
		return query;
	},
	
	/**
	 * Builds a SPARQL-Query for the specified path
	 * @function
	 * @private
	 * @param {string} path
	 * @param {string} rootInst
	 */
	// TODO atm there are only conditions with pathexpressions of depth one supported
	createStrictQuery: function(path, rootInst){
		var query='SELECT * WHERE{ ';
		var array=path;
		if (typeof(path) == 'string') {
			array = Ext.cruise.client.adapt.util.PathUtils.parsePath(path);
		}
		var obj= '<'+rootInst+'>';
		var subj;
		var accumul_path="/";
		for (var i=0; i< array.length; ++i){
			var pred= this._expandPredicateName(array[i].prop);
			accumul_path+= array[i].prop+ "/";
			subj= this.convert(array[i].prop);
			
			query+= obj+' <'+pred+'> '+subj+'.';
			
			if(array[i].condition){
				query+= this._buildCondition(accumul_path, array[i].condition, subj);
			}
			
			obj = subj;
        }
        query+='}';
		
        this.log.debug('[CroCoAdapter] createStrictQuery(',path,rootInst,') === ',query);
		return query;
	},
	
	soapSynch: function(url, xml){
		var xhr= applicationManagerInstance.getServiceAccess().createXHR();
		xhr.open("POST",url, false);
		xhr.setRequestHeader("Content-Type","application/soap+xml");
		xhr.send(xml);
		return xhr;
	}
});