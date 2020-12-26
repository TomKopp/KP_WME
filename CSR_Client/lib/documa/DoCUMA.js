// initialize global object
window.Documa = {
	classes: {},
	util: {},
	eventing: {},
	plugins: {},
	ModuleName: "csr"
};

var applicationManagerInstance = null;
var __dirname = undefined;

(function(){
	/**
	 * @class
	 */
	Documa.Loader = (function(){
		const TAG = "Documa.Loader";
		var _paths = {};
		var _libs = [];
		var _xhr = new XMLHttpRequest();
		// creating the runtime-wide angularjs csr module
		var _csr_ng_module = angular.module(Documa.ModuleName, []);
		var _csr_ng_scope = null;
		var _csr_ng_compile = null;

		_csr_ng_module.controller("DocumaController", function($scope, $compile){
			_csr_ng_scope = $scope;
			_csr_ng_compile = $compile;
		});


		var _cruise_libs = [
			// include logging library
			//'lib/log4javascript.js',
			// utilities
			'lib/cruise/adaptation/impl/utils.js',
			// TSR components
			'lib/cruise/Message.js', 'lib/cruise/EventBroker.js', 'lib/cruise/Proxy.js', 'lib/cruise/Context.js', 'lib/cruise/Mediator.js', 'lib/cruise/TemplateCodeHelper.js', 'lib/cruise/TemplateCodeUICLoader.js', 'lib/cruise/SimpleWrapperUICLoader.js', 'lib/cruise/Utility.js'];

		var _csr_styles = ['styles/documa/csr-styles.css'];
		var _isNode = (typeof process !== "undefined" && typeof require !== "undefined");
		var _isNodeWebkit = false;
		if(_isNode) {
			try {
				_isNodeWebkit = (typeof require('nw.gui') !== "undefined");
				__dirname = process.cwd();
			} catch (error) {
				_isNodeWebkit = false;
			}
		}

		/* private methods */
		var _priv = {

			/**
			 * Extract the prefix of the classname. It is needed during the path
			 * extraction, because the prefix can represent a root path.
			 *
			 * @param {String} classname complete class name, e. g. 'package.subpackage.class'
			 * @return {String} prefix of given classname
			 */
			getPrefix: function(classname){
				let searched = '';
				if(_paths.hasOwnProperty(classname)) {
					return classname;
				}

				for(let prefix in _paths) {
					let cn = classname.substring(0, prefix.length + 1);
					if(_paths.hasOwnProperty(prefix) && prefix + '.' === cn) {
						if(prefix.length > searched.length) {
							searched = prefix;
						}
					}
				}

				return searched;
			},

			/**
			 * Get the path of the js file that defines the given class.
			 *
			 * @return {String} path of js file
			 */
			getPath: function(classname){
				let p = '';
				let pr = this.getPrefix(classname);

				if(pr.length > 0) {
					if(pr === classname) {
						return _paths[pr];
					}
					p = _paths[pr];
					classname = classname.substring(pr.length + 1);
				}

				if(p.length > 0) {
					p += '/';
				}

				return p.replace(/\/\.\//g, '/') + classname.replace(/\./g, "/") + '.js';
			},

			/**
			 * Helper method.
			 */
			formatClassCode: function(classCode){
				/* commented out because of debugging */
				// remove all comments
				// classCode = classCode.replace(new RegExp("(?=(/{2}[^@])).*",
				// "g"), "");
				// classCode = classCode.replace(new
				// RegExp("\/\\*(.|\\n)*?(\\*\/)", "g"), "");
				// remove unnecessary newlines
				// classCode = classCode.replace(new
				// RegExp("[\\r\\n](?=[\\r\\n])", "g"), "");
				// unify quotation marks
				// classCode = classCode.replace(/"/g, "'");
				// console.log('Code: '+classCode);

				return classCode;
			},

			/**
			 * Helper method to load given class code into the document.
			 *
			 * @param {String} classname name of class to load, e. g.
			 *            package.subpackage.Class
			 * @param {String} classcode
			 * @param {Function} callback function that is loaded after the given
			 *            classcode was loaded successfully
			 */
			loadClass: function(classname, classcode, callback){
				try {
					// just for debugging dynamic loaded code
					// classcode = 'debugger;' + classcode;
					classcode = classcode + '\n' + '//# sourceURL=' + classname + '.js';

					// evaluate classcode
					eval.call(window, classcode);
					// evaluate given class code

					/***********************************************************
					 * *alternative script loading approach let script =
					 * document.createElement("script");
					 *
					 * script.type = "text/javascript"; script.innerHTML =
					 * classcode;
					 *
					 * let head = document.getElementsByTagName('head')[0];
					 * head.appendChild(script);
					 */

					if(callback === undefined || callback == null)
						return;

					// fire class loaded event
					callback(classname);
				} catch (err) {
					debugger;
					console.error('Failue during loading of class {' + classname + '} :' + err.stack);
					throw err;
				}
			},

			/**
			 * In this method the required external js files are extracted and
			 * loaded at the beginning.
			 *
			 * @param {String} classname name of required class
			 *
			 * @param {String} fileString executable javascript code that
			 * @param {Function} clsLoadedcallback function that is loaded after the
			 *            code (see fileString) was executed
			 */
			execRequiredStatements: function(classname, fileString, clsLoadedcallback){
				// matches Documa.require(...);
				let r_match = /(Documa\.require\(('|").+('|"))(\);|.+\);|(.|\n)*\}\);)/g;
				// get all require-statements
				let reqs = fileString.match(r_match);
				// get clean and evaluable class code
				let classCode = this.formatClassCode(fileString.replace(r_match, ""));
				if(reqs === undefined || reqs === null || reqs.length === 0) {
					// evaluate class code if no require-statements are included
					this.loadClass(classname, classCode, clsLoadedcallback);
					return;
				}
				for(let idx = 0; idx < reqs.length; ++idx) {// execute every
					// require-statement separately
					let entry = reqs[idx];
					// evaluate the required statement and create class
					// instances
					eval.call(window, entry);
				}
				// load class code after the require-statements were processed
				this.loadClass(classname, classCode, clsLoadedcallback);
			},

			/**
			 * Injecting given path to external javascript file and calling
			 * callback function after it was loaded successfully.
			 *
			 * @param {String} url
			 *            url to external javascript path
			 * @param {String} classname
			 *            name of class represented by the url
			 * @param {Function} loadedCallback
			 *            method to callback after the external file was loaded
			 *            successfully
			 */
			injectPath: function(url, classname, loadedCallback){
				if(url === undefined || url === null || url.length === 0) {
					throw new Error("Invalid argument {" + url + "} during script loading!");
				}
				if(classname === undefined || classname === null) {
					throw new Error("Invalid classname argument during script loading");
				}
				if(_libs.indexOf(url) > -1) {
					return;
					// url already loaded
				}
				// print debuggin message only on Desktop
				//console.log('Inject url: ' + url);
				_libs.push(url);
				if(_isNodeWebkit) {
					// node-webkit runtime context
					// getting filesystem module
					let fs = require("fs");
					let jscontent = fs.readFileSync(url, {encoding: "utf-8"});
					if(!jscontent)
						throw new Error("Could not get content of file " + url);
					// get content of file
					this.execRequiredStatements(classname, jscontent, loadedCallback);
				} else if(_xhr) {
					_xhr.open('GET', url, false);
					_xhr.send(null);
					if(_xhr.status === 200) {
						let jsresponse = _xhr.responseText;
						this.execRequiredStatements(classname, jsresponse, loadedCallback);
					}
				} else {
					throw new Error("Could not load {" + url + "}");
				}
			},

			/**
			 * Load library entries from the given library into the document
			 * synchronously.
			 *
			 * @param {Number} index index of the library entry to load
			 * @param {Array} libarray array of library entries
			 * @param {Function} callback function that is called after the current
			 *            library was loaded successfully
			 */
			loadJavaScript: function(index, libarray, callback){
				if(index >= libarray.length) {
					callback();
					return;
				}
				let url = libarray[index];
				if(url) {
					let head_elem = document.querySelector("head");
					let script = document.createElement("script");
					script.type = "text/javascript";
					if(script.readyState) {
						script.onreadystatechanged = function(){
							if(script.readyState === "loaded" || script.readyState === "complete") {
								script.onreadystatechange = null;
								_priv.loadJavaScript(++index, libarray, callback);
							}
						};
					} else {
						script.onload = function(){
							_priv.loadJavaScript(++index, libarray, callback);
						};
					}
					script.src = url;
					head_elem.appendChild(script);
					console.log(TAG + ": ... loading lib: " + url);
				}
			},

			/**
			 * Loads css styles into execution context. The specified array includes several
			 * URL entries, which are injected into the current document. After all style
			 * files were loaded successfully the given callback function is called.
			 *
			 * @param {Number} index reference to the current style element in css array
			 * @param {Array} cssarray array containing all css styles as URL entry
			 * @param {Function} callback function is called after all styles were added
			 *                      successfully
			 */
			loadCss: function(index, cssarray, callback){
				if(index >= cssarray.length) {
					callback();
					return;
				}
				let url = cssarray[index];
				if(url) {
					let head_elem = document.querySelector("head");
					let link = document.createElement("link");
					link.type = "text/css";
					link.rel = "stylesheet";
					if(link.readyState) {
						link.onreadystatechanged = function(){
							if(link.readyState === "loaded" || link.readyState === "complete") {
								link.onreadystatechange = null;
								_priv.loadCss(++index, cssarray, callback);
							}
						};
					} else {
						link.onload = function(){
							_priv.loadCss(++index, cssarray, callback);
						};
					}
					link.href = url;
					head_elem.appendChild(link);
					console.log(TAG + ": ... loading style: " + url);
				}
			}
		};

		return {

			/**
			 * Set prefix to path, so it can be resolved as loading path.
			 *
			 * @param {String} name prefix name
			 * @param {String} path representing path of prefix, e. g. 'Documa --> /lib/documa'
			 */
			setPath: function(name, path){
				_paths[name] = path;
			},

			/**
			 * Returns true if current runtime container is a node-webkit container, else false.
			 * @returns {boolean}
			 */
			isNodeWebkit: function(){
				return _isNodeWebkit;
			},

			/**
			 * Load given class into runtime, so it can be instantiated.
			 *
			 * @param {String} classname name of class
			 * @param {Function} loadedCallback optional callback function that is
			 *            executed after the class was loaded successfully
			 */
			require: function(classname, loadedCallback){
				try {
					let p = _priv.getPath(classname);
					_priv.injectPath(p, classname, loadedCallback);
				} catch (err) {
					console.error(err);
				}
			},

			/**
			 * Loads an internal array of predefined js libraries.
			 *
			 * @param {Function} callback function that is executed after the list of
			 *            libraries was loaded successfully
			 */
			loadScripts: function(callback){
				try {
					_priv.loadJavaScript(0, _cruise_libs, callback);
				} catch (err) {
					console.error(err);
				}
			},

			/**
			 * Loads an internal array of predefined css styles.
			 *
			 * @param {Function} callback function that is executed after the array of styles
			 *                  was loaded successfully
			 */
			loadStyles: function(callback){
				try {
					_priv.loadCss(0, _csr_styles, callback);
				} catch (err) {
					console.error(err);
				}
			},

			/**
			 * Release the given class and all its internal resources.
			 *
			 * @param {Documa.util.Destroyable} destroyable object to destroy, must implement the
			 *            destructor-method
			 * @throws exception
			 *             if given destroyable is not an instance of class
			 *             Documa.util.Destroyable
			 */
			release: function(destroyable){
				if(!destroyable instanceof Documa.util.Destroyable) {
					throw new Error("Can not destroy unsupported class instance {" + typeof destroyable + "}");
				}

				// call destructor operation
				destroyable.destructor();
			},

			getCruiseLibraries: function(){
				return _cruise_libs;
			},

			/**
			 * @returns {angular.IModule}
			 */
			getCSRModule: function(){
				return _csr_ng_module;
			},

			/**
			 * @returns {$rootScope.Scope}
			 */
			getScope: function(){
				return _csr_ng_scope;
			},
			/**
			 * @returns {$compile}
			 */
			getCompile: function(){
				return _csr_ng_compile;
			}
		};
	})();


	Documa.ComponentExtender = function(){
		let __registry = [
			"http://mmt.inf.tu-dresden.de/EDYRA/prototype/Map",
			"mc://mmt/mdwe/bingmap",
			"http://cruise/ui/xima/vvo/resultList/ExtResultList",
			"mc://mmt/mdwe/hotelsearch",
			"mc://mmt/mdwe/places",
			"http://mmt.inf.tu-dresden.de/EDYRA/prototype/RouteComponent",
			"mc://mmt/mdwe/soundcloud",
			"http://cruise/ui/xima/vvo/startDestination/Map",
			"http://mmt.inf.tu-dresden.de/EDYRA/prototype/TextEditor",
			"http://mmt.inf.tu-dresden.de/EDYRA/prototype/VideoPlayer",
			"http://cruise/ui/xima/vvo/weather/ExtWeatherPanel"
		];
		return {
			/**
			 * @param {String} cid
			 * @param {ComponentType} component
			 */
			addLifecycleEventLogic: function(cid, component){
				let initFn = component.init;
				let postInitFn = function(ctxt){
					// fire init event
					let __broker = ctxt.getAttribute("EventHandler");
					let msg = __broker.createMessage();
					msg.setName(Documa.components.ComponentLifecycleEvents.INITIALIZED);
					__broker.publish(msg);
				};
				/**
				 * @param {Documa.components.ComponentContext} ctxt
				 */
				component.init = function(ctxt){
					initFn.call(component, ctxt);
					postInitFn.call(component, ctxt);
				};
				// ***********************************
				// TODO: extend further methods here *
				// ***********************************
			},

			/**
			 * @returns {string[]}
			 */
			getRegistry: function(){
				return __registry;
			}
		};
	}();

	Documa.addPlugin = function(name, plugin){
		if(!documa.plugins) {
			documa.plugins = {};
		}

		if(!documa.plugins[name]) {
			documa.plugins[name] = plugin;
			console.log("Plugin: " + name + " added!");
		} else {
			console.log("Error: Plugin " + name + " already exists.");
		}
	};

	/**
	 * Returns all classes of the CRUISe client-side runtime.
	 *
	 * @return {Array}
	 */
	Documa.getCruiseRuntimeLibraries = function(){
		return Documa.Loader.getCruiseLibraries();
	};

	/**
	 * Map the given library path to the given namespace. This is needed to load
	 * javascript classes dynamically. During this procedure only the complete
	 * class name is given.
	 *
	 * @param {string} namespace logical namespace of JS classes
	 * @param {string} path library path
	 */
	Documa.map = function(namespace, path){
		Documa.Loader.setPath(namespace, path);
	};

	/**
	 * Loads specified class from remote webserver or local filesystem.
	 *
	 * @param {String} classname
	 * @param {Function} [callback=null]
	 */
	Documa.require = function(classname, callback){
		Documa.Loader.require(classname, callback);
	};

	/**
	 * Releases given destroyable.
	 *
	 * @param {Documa.util.Destroyable} destroyable
	 */
	Documa.release = function(destroyable){
		Documa.Loader.release(destroyable);
	};


	/**
	 * Extends component's lifecycle event mechanisms.
	 * @param {String} cid
	 * @param {ComponentType} component
	 */
	Documa.extendComponent = function(cid, component){
		let index = Documa.ComponentExtender.getRegistry().indexOf(cid);
		if(index < 0) return;
		Documa.ComponentExtender.addLifecycleEventLogic(cid, component);
	};

	/**
	 * Returns true if current runtime container is node-webkit
	 * based runtime, else false.
	 *
	 * @returns {boolean}
	 */
	Documa.isNodeWebkit = function(){
		return Documa.Loader.isNodeWebkit();
	};

	/**
	 * Returns client-side angularjs namespace/module and APIs.
	 * @type {angular.IModule}
	 */
	Documa.CSRM = Documa.Loader.getCSRModule();

	/**
	 * Loading the client-side mashup runtime.
	 * @param {Function} callback
	 */
	Documa.load = function(callback){
		let loadMask = new Ext.LoadMask(Ext.getBody(), {
			msg: "Loading runtime environment ..."
		});
		loadMask.show();

		Documa.Loader.loadStyles(function(){
			console.log("Runtime: styles loaded!");
			// calling required cruise libs and so on ...
			Documa.Loader.loadScripts(function(){
				console.log("Runtime: scripts loaded!");

				// map class namespace to physical resource paths
				Documa.map('Ext.cruise.client', 'lib/cruise');
				Documa.map('Documa', 'lib/documa');
				Documa.map('Jsonld', 'lib/jsonld');

				// loading jsonld lib
				if(Documa.isNodeWebkit()) {
					let p = process;
					process = undefined;
					Documa.require("Jsonld.jsonld-min");
					process = p;
				} else {
					Documa.require("Jsonld.jsonld-min");
				}

				// load runtime manager class
				Documa.require('Documa.RuntimeManager');
				Documa.require('Documa.util.Logger');
				Documa.require('Documa.util.Destroyable');
				// loading angularjs
				angular.bootstrap(document, [Documa.ModuleName]);
				loadMask.hide();


				/** @type {Scope} */
				Documa.Scope = Documa.Loader.getScope();

				/** @type {$compile} */
				Documa.Compile = Documa.Loader.getCompile();

				// init runtime
				Documa.RuntimeManager.initialize();

				// make sure all internal resources are released before the client is closed
				window.onbeforeunload = function(){
					Documa.RuntimeManager.destroy.call(Documa.RuntimeManager);
				};

				// just a workaround for TSR classes
				applicationManagerInstance = Documa.RuntimeManager;
				try {
					// notify application layer
					callback();
				} catch (error) {
					console.error(error);
				}
			});
		});
	};
})();
