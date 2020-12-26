Ext.namespace('Documa.util');

Documa.require("Documa.util.Logger");
Documa.require("Documa.communication.commands.SystemCommand");
Documa.require("Documa.distribution.Distribution");

/**
 * Global utility class.
 * @class
 */
Documa.util.Util = (function() {
	var TAG = "Documa.util.Util";
	var _log = Documa.util.Logger;
	////////////////////
	// public methods //
	////////////////////
	return {
		callNativeLayer: function(pluginName, action, successCb, failureCb, argArray) {
			return PhoneGap.exec(function(result) {
				successCb(result);
			}, function(error) {
				failureCb(error);
			}, pluginName, action, argArray);
			
		},
		
		openCommunicationChannel: function(pluginName, successCb, failureCb) {
			console.log("Open channel between web- and native runtime layer.");
			return PhoneGap.exec(function(result) {
				successCb(result);
			}, function(error) {
				failureCb(error);
			}, pluginName, Documa.communication.commands.SystemClientCommands.INIT, []);
		},
		
		checkScope: function(expectedScope, currentScope) {
			if(currentScope instanceof expectedScope) {
				return;
			} else {
				throw new Error("Current calling scope is not the same as expected.");
			}
		},
		
		validateMessage: function(msg) {
			if(msg.getBody && msg.getCallbackId && msg.getDatatype && msg.getDescription && msg.getName && msg.getStatus && msg.getSyncThreshold && msg.setBody && msg.setCallbackId && msg.setDescription && msg.setName && msg.setStatus && msg.setDatatype && msg.setSyncThreshold) {
				return true;
			} else {
				return false;
			}
		},
		
		copyMessage: function(msg) {
			var copy = new Ext.cruise.client.Message();
			copy.setName(msg.getName());
			copy.setBody(msg.getBody());
			copy.setCallbackId(msg.getCallbackId());
			copy.setDescription(msg.getDescription());
			copy.setDatatype(msg.getDatatype());
			copy.setSyncThreshold(msg.getSyncThreshold());
			return copy;
		},
		
		/**
		 * Copies content into a new array.
		 * @param {Array} array
		 * @returns {Array}
		 */
		copyArray: function(array) {
			return array.slice(0, array.length + 1);
		},
		
		/**
		 * Utility method to remove specified element from given array.
		 * @param {Object} elem element in array to be removed
		 * @param {Array} array array to remove the element from
		 * @return {Array} returns modified array
		 */
		removeElement: function(elem, array) {
			if(!elem)// nothing to remove
				return array;
			if(!array instanceof Array)
				throw new Error("InvalidArgumentError");
			var idx = array.indexOf(elem);
			if(idx < 0)// can not remove unknown element
				return array;
			array.splice(idx, 1);
			return array;
		},
		
		/**
		 * Removes all elements in array 2 from array 1.
		 * @param {Array} sArray1
		 * @param {Array} sArray2
		 */
		removeElements: function(sArray1, sArray2) {
			for(var i = 0; i < sArray2.length; ++i) {
				var delindex = sArray1.indexOf(sArray2[i]);
				if(delindex < 0)
					continue;
				
				// remove item at deletion index
				sArray1.splice(delindex, 1);
			}
		},
		
		/**
		 * Removes an element at the specified index from given array.
		 * @param {Number} index
		 * @param {Array} array
		 */
		remove: function(index, array) {
			array.splice(index, 1);
		},
		
		/**
		 * Helper method to add event handler to given target.
		 * @param {Object} target
		 * @param {String} type
		 * @param {Function} handler
		 */
		addEvent: function(target, type, handler) {
			if(target.addEventListener) {
				target.addEventListener(type, handler, true);
			} else {
				target.attachEvent("on" + type, function(event) {
					// Invoke the handler as a method of target, passing on the event object
					return handler.call(target, event);
				});
			}
		},
		
		/**
		 * @param {String} string examine this string
		 * @param {String} startString use this string to perform the check
		 */
		startsWith: function(string, startString) {
			return (string.indexOf(startString) == 0);
		},
		
		/**
		 * Creates and returns a new XMLHttpRequestObject instance within any browser.
		 *
		 * @return xhr instance or null if not available
		 */
		createXHR: function() {
			try {
				return new XMLHttpRequest();
			} catch (ex) {
				try {
					return new ActiveXObject("Microsoft.XMLHTTP");
				} catch (ex) {
					try {
						return new ActiveXObject("Msxml2.XMLHTTP");
					} catch (ex) {
						log4javascript.getDefaultLogger().fatal('Could not create XMLHttpRequest Object!');
					}
				}
			}
			return null;
		},
		
		/**
		 * This method encapsulates the serialization of an XML document object.
		 * It detects if the current browser runtime supports the XMLSerializer object. If not it chooses an alternative mechanism.
		 * Supported browser engines are Webkit, Gecko and IE.
		 * @param {DOMDocument} xmldoc a XML document object which needs to be serialized
		 * @returns {String} string representation of given XML document object if XML serialization is possible
		 *            {boolean} false if XML serialization is not possible
		 */
		serializeXML: function(xmldoc) {
			try {
				return (new XMLSerializer()).serializeToString(xmldoc);
				// Gecko, Webkit, IE9
			} catch (e) {
				try {// IE7, IE8
					return xmldoc.xml;
				} catch (e) {
					throw new Error("XML serialization not support in your browser");
				}
			}
			return false;
		},
		
		/**
		 * Parse XML document object from given textual representation.
		 * Supported browsers are Webkit, Gecko and IE.
		 * @param {String} string textual representation of an XML document.
		 * @return {DOMDocument} XML document object
		 */
		parseXMLFromString: function(string) {
			var xml = null;
			if(window.DOMParser) {
				var parser = new DOMParser();
				xml = parser.parseFromString(string, "text/xml");
			} else// IE
			{
				xml = new ActiveXObject("Microsoft.XMLDOM");
				xml.async = "false";
				xml.loadXML(string);
			}
			return xml;
		},
		
		/**
		 * Retrieves runtime descriptor and adds it as attribute.
		 *
		 * @param {String} path descriptor file path (local or remote file)
		 * @param {boolean} remote indicates local or remote runtime descriptor
		 * @param {Function} callback function to call after the runtime descriptor was
		 * loaded successfully
		 */
		loadDescriptor: function(path, remote, callback) {
			// load runtime descriptor with the help of a runtime description file
			if(remote) {
				// path is a remote file reference --> use xhr object
				var xhr = this.createXHR();
				xhr.open("GET", path, true);
				xhr.setRequestHeader("Content-Type", "text/xml");
				xhr.overrideMimeType("text/xml");
				xhr.onreadystatechange = function() {
					if(xhr.readyState == 4 && xhr.status == 200) {
						// handle received runtime descriptor
						callback(xhr.responseText);
					}
				};
				xhr.send();
			} else {
				// path is a local file reference --> use html5 file api
				// init file system request
				//window.requestFileSystem = window.requestFileSystem ||
				// window.webkitRequestFileSystem;
				//window.requestFileSystem(window.TEMPORARY, 1024 * 1024, onInitFS, handleError);
				if(Documa.isNodeWebkit()) {
					var fs = require("fs");
					fs.readFile(path, {encoding: "utf-8"}, function(err, data) {
						if(err) {
							// error during the loading of the runtime descriptor
							throw new Error(err);
						}
						_log.debug(TAG, "Received runtime descriptor in node-webkit context!");
						callback(data);
					});
				} else {
					throw new Error("Unsupported operation!");
				}
			}
		},
		
		/**
		 * Utility function to extract distribution instances from given distribution update event.
		 *
		 * @param {Object} eventPayload payload of distribution update event, containing several distribution
		 *                    descriptions (sessionid --> [comp1, comp2, ..., compN])
		 * @return {Array.<Documa.distribution.Distribution>} array of distribution instances
		 */
		getDistributions: function(eventPayload) {
			// analyze event payload
			if(!eventPayload.dists && !(eventPayload.dists instanceof Array))
				throw new Error("Invalid distribution change event received: No distribution items defined!");
			
			// creating array of distributions representing the current application's state
			var distributions = new Array();
			for(var i = 0; i < eventPayload.dists.length; ++i) {
				distributions.push(new Documa.distribution.Distribution(eventPayload.dists[i]));
			}
			return distributions;
		},
		
		/**
		 * Returns a target distribution from current device object.
		 * @param {Documa.distribution.Device} device
		 */
		createDistribution: function(device) {
			/** @type {DistVO} */
			var distvo = {
				sid: device.getSessionId(),
				distid: device.getSessionId(),
				cmpset: []
			};
			return new Documa.distribution.Distribution(distvo);
		},
		
		/**
		 * Methods serializes plain object, i. e. an object that only contains serializable properties and functions.
		 * @param {Object} obj
		 *
		 * @returns {String} serialized object as flat string
		 */
		serializeObject: function(obj) {
			return JSON.stringify(obj, function(key, value) {
				if(typeof value === "function") {
					// return function in string representation
					return value.toString();
				}
				return value;
			});
		},
		
		/**
		 * Clears given array.
		 * @param {Array} array
		 */
		clearArray: function(array) {
			array.splice(0, array.length);
		},
		
		/**
		 * Returns body element from given panel.
		 *
		 * @param {Ext.Panel} panel
		 * @return {Element}
		 */
		getBodyElement: function(panel) {
			if(!(panel instanceof Ext.Panel))
				throw new Error("Invalid panel argument!");
			
			try {
				// definition body element query
				// body element is a direct child of an direct child element that contains a class attribute,
				// which ends with '-bwrap'
				var query = "div[class*=-bwrap] > div[class*=-body]";
				var resultSet = Ext.DomQuery.jsSelect(query, panel.getEl().dom);
				var result = resultSet[0];
				return result;
			} catch (error) {
				_log.error(TAG, error.stack);
			}
		},
		
		/**
		 * Install node package locally.
		 * @param {string} packageName
		 * @param {Function} callback
		 */
		installPackage: function(packageName, callback) {
			if(!Documa.isNodeWebkit())
				throw new Error("Your runtime is not node-webkit based!");
			var npm = require("npm");
			npm.load(null, function(error) {
				if(error) {
					throw new Error(error);
				}
				
				npm.commands.install([packageName], function(err) {
					if(err) {
						throw new Error(err);
					}
					callback();
				});
				
				npm.on("log", function(message) {
					_log.debug(TAG, message);
				});
			});
		},
		
		/**
		 * Tests whether current object contains an local property specified by the parameter name argument.
		 * @param {String} paramName object's property name
		 * @param {Object} object
		 * @returns {boolean}
		 */
		test: function(paramName, object) {
			if(!object.hasOwnProperty(paramName)) {
				throw new Error("Missing property " + paramName + "!");
			}
			return true;
		},
		
		/**
		 * Converts milliseconds to minutes
		 * @param {Number} msecs
		 * @returns {Number}
		 */
		toMin: function(msecs) {
			return (msecs / 1000) / 60;
		}
	};
})();
