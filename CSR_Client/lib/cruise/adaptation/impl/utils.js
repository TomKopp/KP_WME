/*
 * ****************************************************************************************************
 * 											CONSTANTS
 * ****************************************************************************************************
 */
Ext.namespace("Ext.cruise.client.adapt.util");
/**
 * @class Ext.cruise.client.adapt.Constants Encapsulates constants
 * @public
 */
Ext.cruise.client.adapt.Constants= {
	/**
	 * The namespace of the configration (in the UI-Skeleton) of the adaptation infrastructure.
	 * @type String
	 */
	_ADAPTNS_: "http://mmt.inf.tu-dresden.de/cruise/adaptation",
	//Workaround for Internet Explorer
	//TODO: Function that can find the namespace by given uri...
	_ADAPTNS_IE: 'cad:',
	/**
	 * The SPARQL-XML-Results namespace
	 * @type String
	 */
	SPARQL_NS: "http://www.w3.org/2005/sparql-results#",

	/**
	 * The namespace of CroCo
	 * @type String
	 */
	CROCO_NS: "http://webservice.croco.inf.tudresden.de",
	//Workaround for Internet Explorer
	//TODO: Function that can find the namespace by given uri...
	CROCO_NS_IE: 'web:',
	/**
	 * Indicates that the eventpart of a rule is an application event
	 * @type Number
	 */
	APP_EVENT: 0,
	/**
	 * Indicates that the eventpart of a rule is a context event
	 * @type Number
	 */
	CTX_EVENT: 1,
	/**
	 * Indicates that the eventpart of a rule is a runtime event
	 * @type Number
	 */
	RT_EVENT: 2,
	/**
	 * The number of failures that lead to the removal of a rule.
	 * @type Number
	 */
	ERRORTHRESHOLD: 5
};

/*
 * ****************************************************************************************************
 * 											UTIL
 * ****************************************************************************************************
 */
/**
 * @class Ext.cruise.client.adapt.util.Util Encapsulates static utility-methods.
 * @public
 */
Ext.cruise.client.adapt.util.Util = {

	/**
	 * returns current date and time in xsd:datetime-format
	 * @public
       * @static
	 * @function
	 */
	now : function(){
		var date = new Date();
		function pad(n) {
			var s = n.toString();
			return s.length < 2 ? '0'+s : s;
		};

		var yyyy = date.getFullYear();
		var mm1  = pad(date.getMonth()+1);
		var dd   = pad(date.getDate());
		var hh   = pad(date.getHours());
		var mm2  = pad(date.getMinutes());
		var ss   = pad(date.getSeconds());

		return (yyyy +'-' +mm1 +'-' +dd +'T' +hh +':' +mm2 +':' +ss);
	},

	/**
	 * creates default soap-message beginning (xml-decl, soap-env with specified namespace, empty soap-header, opening tag of soap-body)
	 * @public
       * @static
	 * @function
	 * @param {String} target_ns (optional) target namespace. default is 'http://webservice.croco.inf.tudresden.de'
	 */
	soap: function(target_ns){
		if (!target_ns)
			target_ns= 'http://webservice.croco.inf.tudresden.de';
		return '<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="'+target_ns+'" xmlns:xsd="http://beans.webservice.croco.inf.tudresden.de/xsd">'+
				'<soapenv:Header/><soapenv:Body>';
	},
	
	/**
	 * create browser specific XMLHttpRequest object
	 * @public
       * @static
	 *  @function
	 */
	createRequestObj: function(){
		try {
			return new XMLHttpRequest();
		}
		catch(ex){
			try {
				return new ActiveXObject("Microsoft.XMLHTTP");
			}
			catch(ex){
				try {
					return new ActiveXObject("Msxml2.XMLHTTP");
				}
				catch(ex){
					log4javascript.getDefaultLogger().fatal('Could not create XMLHttpRequest Object!');
				}
			}
		}
		return null;
	},
	
	/**
     * @static
     * @function
     * @public
     * Trims the specified String (cleaving all leading and ending whitespaces)
	 * @param {Object} str the string to be trimmed
	 */
	trim: function(str) {
        var str = str.replace(/^\s\s*/, '');
        var ws = /\s/;
        var i = str.length;

        while (ws.test(str.charAt(--i)));
        return str.slice(0, i + 1);
	},
	
	/**
	 * print the current stack trace to the console
	 * @public
       * @static
	 * @function
	 */
	printStackTrace: function(){
		try {
			var f=undefined;
			f.guessWhatHappens();
		}catch(all) {
			log4javascript.getDefaultLogger().error(all);
		}
	}
};
// shorthand
var utils= Ext.cruise.client.adapt.util.Util;

/**
 * @class Ext.cruise.client.adapt.util.PathUtils
 */
Ext.cruise.client.adapt.util.PathUtils= {
	/**
	 * remove conditions from a path
	 * @function
	 * @public
       * @static
	 * @param {String} path the path
	 */
	cutConditions: function(path){
		if (!path) return;
		return path.replace(/\[[^\[\]]+\]/g,"");
	},

	/**
	 * normalize a path 
	 * @function
	 * @public
       * @static
	 * @param {String} path the path
	 */
	normalizePath: function(path){
		if (!path) return;
		if (path.indexOf("/")==0) path=path.substring(1,path.length);
		if (path.lastIndexOf("/")==path.length-1) path=path.substring(0,path.length-1);
		return path;
	},
	/**
	 * calculate the length of a path 
	 * @function
	 * @public
       * @static
	 * @param {String} path the path
	 */
	length: function(path){
		if (!path) return 0;
		path= Ext.cruise.client.adapt.util.PathUtils.normalizePath(path);
		if (path.indexOf("/")==-1) return 1;
		return path.split("/").length;
	},
	/**
	 * extract context parameters from a string and append them to the given array.
	 * @function
	 * @public
       * @static 
	 * @param {Object} str a string
	 * @param {Object} array the array where to append found context parameters
	 */
	extractContextParams: function(str, array){
		if (!str) return;

		Ext.each(str.match(/\$(\/\w+:\w+|\/\w+:\w+\[.+\]){0,}\$/g), function(a){
			var asd= a.substring(1,a.length-1);

			if (array.indexOf(asd)==-1)
				array.push(asd);
		}, this);
	},
	/**
	 * Expands referenced context params by evaluating them directly via the Context Manager. __deprecated use expandContextReferences instead
	 * @function
	 * @public
       * @static
	 * @param {Object} condition
	 * @param {Object} ctxMgr
	 */
	expandContextParams: function(condition, ctxMgr){
		if (!condition) return;
		
		Ext.each(condition.match(/\$(\/\w+:\w+|\/\w+:\w+\[.+\]){0,}\$/g), function(a){
			// cut the surrounding '$'
			var param= a.substring(1,a.length-1);
			
			var res= ctxMgr.getContextValue(param);
			
			var start= condition.indexOf(a);
			condition= condition.substring(0,start)+res+condition.substring(start+a.length,condition.length);
		}, this);
		return condition;
	},

	/**
	 * Expands referenced context params by inserting statements that invoke the getContextValue
	 * method of the given 'ref' (objectreference) resp. the ContextManager
	 * @function
	 * @public
       * @static
	 * @param {Object} str a string
	 * @param {Object} ref a string containg the reference to be used when evaluating the context params
	 */
	expandContextReferences: function(str, ref){
		if (!str) return;
		Ext.each(str.match(/\$(\/\w+:\w+|\/\w+:\w+\[.+\]){0,}\$/g), function(a){
			var param= a.substring(1,a.length-1);
			var start= str.indexOf(a);
			
			if (ref){
				str=str.substring(0,start)+ref+".getContextValue('"+param+"')"+str.substring(start+a.length);
			}else
				str=str.substring(0,start)+"contextMgr.getContextValue('"+param+"')"+str.substring(start+a.length);
		});
		return str;
	},
	/**
	 * Parses the given path. Returns an array where each entry represents a single property
	 * with information about it.
	 * @function
	 * @public
       * @static
	 * @param {String} path a path
	 * @return {Array}
	 */
	parsePath: function(path){
		path= Ext.cruise.client.adapt.util.PathUtils.normalizePath(path);
		var res= [];

		if (path.indexOf("[") == -1 && path.indexOf("]") == -1) {
			var arr = path.split('/');
			for (var o = 0; o < arr.length; ++o) {
				res.push({
					prop: arr[o]
				});
			}
			return res;
		} else {
			var slash=-1;
			var opening=0, closing=0;
			var curr={};
			for(var i=0;i< path.length; ++i){
				if (path.charAt(i)=="/" || i==path.length-1){
					var part;
					if (i == path.length - 1) {
						part = path.substring(slash + 1, i+1);
					}else
						part = path.substring(slash + 1, i);
						
					slash=i;
					curr.prop= part;
					res.push(curr);
					curr= new Object();
				}
				if (path.charAt(i)=="["){
					opening=i;
					closing= path.indexOf("]",opening);
					var condition= path.substring(opening, closing+1);
					
					curr.prop = path.substring(slash+1,i);
					curr.condition= condition.substring(1,condition.length-1);
					curr.incondition= new Array();
					
					// extract all inner paths of the condition
					Ext.each(condition.match(/(\/\w+:\w+){1,}/g), function(inner){
						curr.incondition.push(inner);
					});
					
					res.push(curr);
					curr= new Object();
					
					// increase indices to skip the condition part
					slash= closing+1;
					i=slash+1;
				}
			}
		}
		return res;
	}
};