Ext.namespace("Documa.ui.views.capview");

/**
 * @author Carsten Radeck
 * @class Documa.ui.views.capview.LabelGeneratorDictionary
 * 
 * A dictionary serves for looking up suitable articles and the past participle of irregular verbs. To this end, an external list is queried, parsed and utilized for lookup.
 */
Documa.ui.views.capview.LabelGeneratorDictionary = function(){
	/* datastructure for efficient lookup of past participles */
	var lookup={};
	/*
	 * internal helper determining whether the given char is a vocal
	 */
	var isVocal= function(character){
		return character== "a" || character== "e" || character=="i" || character == "o" || character == "u";
	};

	/*
	 * internal helper responsible for parsing the XML result and fill the lookup data structure
	 */
	var parseVerbList= function(resp){
		if (!resp) return;
		
		var rows= resp.querySelectorAll("verb");
		for (var idx=0; idx < rows.length; ++idx){
			
			var row= rows[idx];
			
			var cells= row.querySelectorAll("td");
			if (cells.length!=4) continue;
			
			var verb= cells[0].textContent;
			var participle= cells[2].textContent;
			// in case there are multiple valid participle forms we pick the first
			participle= participle.split(/, /g)[0];
			
			// push actual data to lookup table
			lookup[verb]= participle;
		}		
	};
	
	/*
	 * internal helper to fetch the list of irregular English verbs (contains also the past participles)
	 */
	var queryVerbList= function(){
		var xhr= utils.createRequestObj();
		xhr.open("GET", "res/verblist.xml", false);
		xhr.send();
		if (xhr.readyState != 4 && xhr.status != 200){
			log.warn("Unable to access list of irregular verbs!");
		}
		
		parseVerbList(xhr.responseXML);
	};
	
	
	queryVerbList();
	
	/**
	 * @return {String} the article to be used
	 */
	this.getArticle= function(noun, adjective, definite){
		/* pay attention to special nouns */
		if (noun.indexOf("information")!=-1)
			return " ";
		
		if (definite)
			return " the ";
		var first= adjective || noun;
		
		var firstLetter= first.toLowerCase().charAt(0);
		if (isVocal(firstLetter)){
			return " an ";
		}
		return " a ";
	};
	
	/**
	 * @return {Strig} the past participle; for irregular verbs the correctness of the answer depends on whether the verb list has been fetched successfully. If not, the standard rule is applied (appending "ed"/"d")   
	 */
	this.getPastParticiple= function(activity){
		if (!activity) return "";
		
		activity= activity.toLowerCase();
		
		if (lookup[activity])
			return lookup[activity];
		// apply regular pattern
		if (isVocal(activity.charAt(activity.length-1)))
			return activity+"d";
		return activity+"ed";
	};
	
};