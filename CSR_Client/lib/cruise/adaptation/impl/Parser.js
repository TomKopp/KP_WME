/**
 * ****************************************************************************************************
 * 											PARSER
 * ****************************************************************************************************
 */
/**
 * An instance of Parser is responsible for briding between the client-application and CroCo.
 * This escpecially includes parsing RDF/XML to internal array-representation and vice versa.
 */
Ext.cruise.client.adapt.impl.CroCoParser = Ext.extend(Object, {
	log: null,
	INSTANCES: 'http://mmt.inf.tu-dresden.de/crocoon/instances',

	constructor : function(log, userid){
		this.log= log;
		this.INSTANCES+= userid;
	},
	
	/**
	 * Parses the SPARQL-XML-Results and returns an array where each entry has two obligatory
	 * fields: name (String, the name of the variable) and instance (String or Array, the value).
	 * @public
	 * @function
	 */
	parseResults: function(resultXML){
		this.log.debug('[Parser] parsing sparql results');

		var sparql_res;
		if(typeof(resultXML) == 'string'){
			sparql_res = Ext.cruise.client.Utility.parseXMLFromString(resultXML);
		}else if (typeof(resultXML)== 'object')
			sparql_res = resultXML;

		if (!sparql_res){ //|| !sparql_res.getElementsByTagNameNS){
			this.log.info('[Parser] error result-DOM unspecified');
			return undefined;
		}
		
		var variables = sparql_res.getElementsByTagName('variable');
		var bindings = sparql_res.getElementsByTagName('binding');
		
		var result= [];

		for(var k=0; k < variables.length; ++k){
			var variable= variables[k];
			var name= variable.getAttribute('name');
			var value= new Array();
			var hits=0;

			for (var j=0; j< bindings.length; ++j){
				var binding= bindings[j];
				if (binding.getAttribute('name')!=name) continue;

				var uris = binding.getElementsByTagName('uri');
				
                if (uris.length==1){
					var txt= uris[0].textContent;
					if (value.indexOf(txt) == -1) {
						value.push(txt);
						++hits;
					}
                }else{
					uris = binding.getElementsByTagName('literal');

                    if (uris.length==1){
						var txt= uris[0].textContent;
						//if (value.indexOf(txt) == -1) {
							value.push(txt);
							++hits;
						//}
                    }
				}
			}

			var res;
			if (value.length>1)
				res= value;
			if (value.length==0)
				res= undefined;
			if (value.length==1)
				res= value[0];
			this.log.debug('[Parser] -result',hits,name, typeof(res) );
            result.push({
            	name: name,
            	instance: res
            });
		}
		this.log.debug('[Parser] parsing done');
		return result;
	},

	/**
	 * Parses the result of the query that tries to receive the UserContextProfile of
	 * the given user.
	 * @public
	 * @function
	 * @param {Object} resultXML
	 */
	parseProfile: function(resultXML){
		this.log.debug('[Parser] parsing user profile...');

		var dom;
		if(typeof(resultXML) == 'string'){
			dom = Ext.cruise.client.Utility.parseXMLFromString(resultXML);
		}else if (typeof(resultXML)== 'object')
			dom= resultXML;

		if (!dom) {// || !dom.getElementsByTagNameNS){
			this.log.info('[Parser] parseProfile: error result-DOM unspecified');
			return undefined;
		}
		var list = Ext.cruise.client.Utility.getElementsByTagNameNS( 
						Ext.cruise.client.adapt.Constants.CROCO_NS_IE,  
						Ext.cruise.client.adapt.Constants.CROCO_NS,  
						'return', dom);
		if (list.length==0) {
			this.log.info('[Parser] parseProfile: no return element found');
			return undefined;
		}

		// parse CDATA
		var cdata = list[0].textContent;
		if (!cdata) {return;}
		//this.log.debug(cdata);
		// build DOM from CDATA to ease processing
		var sparql_res = Ext.cruise.client.Utility.parseXMLFromString(cdata);
		if (!sparql_res) return undefined;

		var bindings = sparql_res.getElementsByTagName('binding');
 		
		// there should be exactly one binding
		if (bindings.length==1){
			var binding= bindings[0];
			if ("x" == binding.getAttribute('name')){
				var uris = binding.getElementsByTagName('uri');

				if (uris.length==1){
					var uri= uris[0];
					return uri.textContent;
				}
			}
		}
		return undefined;
	},

	/**
	 * Appends a contextfact to 'xml' which states that a new instance of the specified
	 * domain has to be created with a generated URI.
	 * 
	 * @public
	 * @function
	 *
	 */
	newInstance: function(domain, xml, confidence){
		// create isntance
		var instance;

		// generate id; conflicts are still possible -> maybe contact server in the future
		var id = Math.round(Math.random()*100000000);
		// generate the complete instance-uri, to reduce the risk of collisions involve the userid and domain
		instance= this.INSTANCES+ domain.substring(domain.lastIndexOf("#")) + id;

		// fact 1 - adding the instance
		xml+= '<web:facts><xsd:confidence>'+confidence+'</xsd:confidence>';
		xml+= '<xsd:discoveryTimestamp>'+ utils.now() + '</xsd:discoveryTimestamp>';
		xml+= '<xsd:subjectURI><![CDATA['+ instance +']]></xsd:subjectURI>';
		xml+= '<xsd:predicateURI><![CDATA[http://www.w3.org/1999/02/22-rdf-syntax-ns#type]]></xsd:predicateURI>';
		xml+= '<xsd:objectValue><![CDATA['+ domain +']]></xsd:objectValue>';
		xml+= '</web:facts>';

		return {xml: xml, instance: instance};
	},
	
	/**
	 * Appends a contextfact to 'xml' which states that a new instance of the specified
	 * domain has to be created with the given URI 'instanceuri'.
	 * 
	 * @public
	 * @function
	 *
	 */
	newInstanceWithUri: function(instanceuri, domain, xml, confidence){
		xml+= '<web:facts><xsd:confidence>'+confidence+'</xsd:confidence>';
		xml+= '<xsd:discoveryTimestamp>'+ utils.now() + '</xsd:discoveryTimestamp>';
		xml+= '<xsd:subjectURI><![CDATA['+ instanceuri +']]></xsd:subjectURI>';
		xml+= '<xsd:predicateURI><![CDATA[http://www.w3.org/1999/02/22-rdf-syntax-ns#type]]></xsd:predicateURI>';
		xml+= '<xsd:objectValue><![CDATA['+ domain +']]></xsd:objectValue>';
		xml+= '</web:facts>';
		return xml;
	},

	/**
	 * 
	 * Appends a contextfact to 'xml' which states that the property 'pred' of 
	 * the existing instance 'instance_uri' has to be set to value 'newvalue'.
	 * 
	 * @public
	 * @function
	 *
	 * instance_uri ---(pred)---> newvalue
	 */
	edit: function(instance_uri, pred, newvalue, xml, confidence, datatype){
		xml+= '<web:facts><xsd:confidence>'+confidence+'</xsd:confidence>';
		xml+= '<xsd:discoveryTimestamp>'+ utils.now() + '</xsd:discoveryTimestamp>';
		xml+= '<xsd:subjectURI><![CDATA['+ instance_uri +']]></xsd:subjectURI>';
		xml+= '<xsd:predicateURI><![CDATA['+ pred  +']]></xsd:predicateURI>';
		if(datatype){
			xml+= '<xsd:objectDataTypeURI><![CDATA['+ datatype  +']]></xsd:objectDataTypeURI>';
		}
		xml+= '<xsd:objectValue><![CDATA['+ newvalue +']]></xsd:objectValue>';
		xml+= '</web:facts>';

		return xml;
	}
});