Ext.namespace("Documa.communication.xhr");

Documa.require("Documa.util.Logger");

Documa.communication.xhr.XHRFactory = (function() {

	var TAG = "Documa.communication.xhr.XHRFactory";
	var _log = Documa.util.Logger;

	return {
		/**
		 * Creates XHR wrapper object with given global window object.
		 *
		 * @param {Object} global window namespace object
		 */
		createWrapper : function(global) {
			var documa_xhr = global.XMLHttpRequest;

			// defining constructor of XHR wrapper
			function XMLHttpRequest() {
				// wrapped xhr object
				this.object = new documa_xhr();
				// counting pending requests
				this.requestCounter = 0;
				// representation of blocked state
				this.blocked = false;
				
				var self = this;
				// define binding between wrapper and wrapped xhr object
				// definition of getter and setter-functions of writable properties
				Object.defineProperties(self, {
					timeout : {
						set : function(newValue) {
							self.object.timeout = newValue;
						},
						get : function() {
							return self.object.timeout;
						}
					},
					withCredentials : {
						set : function(newValue) {
							self.object.withCredentials = newValue;
						},
						get : function() {
							return self.object.withCredentials;
						}
					},
					responseType : {
						set : function(newValue) {
							self.object.responseType = newValue;
						},
						get : function() {
							return self.object.responseType;
						}
					}
				});

				// definition of getter-functions of readable properties
				// information source is the wrapped xhr element
				Object.defineProperties(self, {
					status : {
						get : function() {
							return self.object.status;
						}
					},
					statusText : {
						get : function() {
							return self.object.statusText;
						}
					},
					response : {
						get : function() {
							return self.object.response;
						}
					},
					responseText : {
						get : function() {
							return self.object.responseText;
						}
					},
					responseXML : {
						get : function() {
							return self.object.responseXML;
						}
					},
					upload : {
						get : function() {
							return self.object.upload;
						}
					},
					readyState : {
						get : function() {
							return self.object.readyState;
						}
					}
				});
			}
			
			XMLHttpRequest.prototype.onreadystatechange = null;
			XMLHttpRequest.onopen = null;
			XMLHttpRequest.prototype.block = function(){
				this.blocked = true;
			};
			XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
				if (this.constructor.onopen) {
					this.constructor.onopen.apply(this, arguments);
				}
				_log.debug(TAG, "... calling open function");
				// calling wrapped open-function
				this.object.open(method, url, async, user, password);
			};

			XMLHttpRequest.onresponse = null;
			XMLHttpRequest.responsehandled = null;
			XMLHttpRequest.onsend = null;
			XMLHttpRequest.prototype.send = function(data) {
				if (this.constructor.onsend) {
					// calling onsend-function of instance
					this.constructor.onsend.apply(this, arguments);
				}

				if (this.onreadystatechange) {
					// response handler defined
					var self = this;
					this.object.onreadystatechange = function() {
						if(self.readyState == 4){
							// response was successfully received or an error occured
							if(self.constructor.onresponse){
								self.constructor.onresponse.call(this, self);
							}
						}
						// if current request is blocked state changes of receiving component
						// should be tracked within the 'onresponse' call
						//if(self.blocked) return;
						// call onready statechange event handler
						self.onreadystatechange();
						--this.requestCounter;
						
						if(self.readyState == 4){
							if(self.constructor.responsehandled){
								self.constructor.responsehandled.call(this, self);
							}
						}
					};
				}
				_log.debug(TAG, "... calling send function");
				// calling wrapped send-function
				this.object.send(data);
				++this.requestCounter;
			};

			XMLHttpRequest.onsetRequestHeader = null;
			XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
				if (this.constructor.onsetRequestHeader) {
					this.constructor.onsetRequestHeader.apply(this, arguments);
				}
				_log.debug(TAG, "... calling setRequestHeader function");
				this.object.setRequestHeader(header, value);
			};
			
			XMLHttpRequest.prototype.getPendingRequestCount = function(){
				return this.requestCounter;
			};

			XMLHttpRequest.prototype.getResponseHeader = function(header) {
				return this.object.getResponseHeader(header);
			};

			XMLHttpRequest.prototype.getAllResponseHeaders = function() {
				return this.object.getAllResponseHeaders();
			};

			XMLHttpRequest.onabort = null;
			XMLHttpRequest.prototype.abort = function() {
				if (this.constructor.onabort) {
					this.constructor.onabort.apply(this, arguments);
				}
				this.object.abort();
			};

			XMLHttpRequest.UNSENT = 0;
			XMLHttpRequest.OPENED = 1;
			XMLHttpRequest.HEADERS_RECEIVED = 2;
			XMLHttpRequest.LOADING = 3;
			XMLHttpRequest.DONE = 4;

			// returning wrapping function object
			return XMLHttpRequest;
		}
	};
})();
