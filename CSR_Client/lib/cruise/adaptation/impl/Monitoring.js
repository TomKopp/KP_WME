Ext.namespace("Ext.cruise.client.adapt");
/**
 * @class Ext.cruise.client.adapt.impl.LocationMonitor This Monitor senses the approx. geographical position (with GeoLocation and Google API) and the current weather (powered by geonames.org)
 * @extends Ext.cruise.client.adapt.IContextMonitor
 * @author Carsten Radeck
 */
Ext.cruise.client.adapt.impl.LocationMonitor = Ext.extend(Ext.cruise.client.adapt.IContextMonitor, {
	timer: null,

	constructor: function(minThreshold, ctxMgr, log, optional){
		Ext.cruise.client.adapt.impl.LocationMonitor.superclass.constructor.apply(this,[minThreshold, ctxMgr, log]);
		this.log.info("[LocationMonitor] constructing");

		if (optional)
			Ext.applyIf(this, optional);
	},

	getId: function(){
		return "locmon";
	},
	
	getContextDescription: function(){
		return "Senses the approx. geographical position and the current weather (powered by geonames.org).";
	},

	getConfidence: function(){
		return 0.7;
	},

	activate: function(){
		Ext.cruise.client.adapt.impl.LocationMonitor.superclass.activate.call();

		if (!this.timer){
			this.timer= {
   				run: this.measure,
   				scope: this,
			    interval: this.minThreshold
			};
			
			Ext.TaskMgr.start(this.timer);
		}
	},

	deactivate: function(){
		Ext.cruise.client.adapt.impl.LocationMonitor.superclass.deactivate.call();

		if (this.timer){
			Ext.TaskMgr.stop(this.timer);
			delete this.timer;
			this.timer= null;
		}
	},

	measure: function(){
		var resp= this.buildResponse();

		var that= this;

		if (navigator.geolocation){ // supported in firefox 3.5+;; http://dev.w3.org/geo/api/spec-source.html
			function successCallback(position){
				that.log.debug('[LocationMonitor] success: ' + position.coords.latitude + ' ' + position.coords.longitude);
				
				// addToResponse(resp, path, value+, confidence)
				that.addToResponse(resp, '/cruise:currentLocation/space:latitude', position.coords.latitude);
				that.addToResponse(resp, '/cruise:currentLocation/space:longitude', position.coords.longitude);
				
				var geocoder,latlng;
				try{
					geocoder= new google.maps.Geocoder();
					latlng= new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
				}catch(E){
					that.sendContext(resp);
					return;
				}

				geocoder.geocode({'latLng': latlng}, function(response, status){
					if (status != google.maps.GeocoderStatus.OK) {
						that.sendContext(resp);
						return;
					}
					try {
						//only best result
						//parse address
						var x = response[0].formatted_address.split(",");
						if (x.length == 3) {// assume "street, pc city, country"
							var erg = /(\w+)\s(\w+)/.exec(x[1]);
							if (erg.length == 3) {
								that.addToResponse(resp, '/cruise:currentLocation/space:postalCode', erg[1]);
								that.addToResponse(resp, '/cruise:currentLocation/space:name', erg[2]);
							}
						}
					}
					catch (e) {
						that.log.error(e);
					}
					
					if (that.measureWeather == true) {
						//var adr = '/ContextInfo/services/GeoInfo/getLocationInfoByCoords?lat=' + position.coords.latitude + '&lon=' + position.coords.longitude;
						var xhr= applicationManagerInstance.getServiceAccess().createXHR(that);
						xhr.open("GET","http://ws.geonames.org/findNearByWeatherXML?lat="+position.coords.latitude+"&lng="+position.coords.longitude);
						xhr.onreadystatechange = function(res){
							if (res.readyState==4 && res.status == 200) {
								// parse the result of the GeoNames-webservice
								try {
									var doc = res.responseXML;
									var temps = doc.getElementsByTagName("temperature");
									if (temps != undefined && temps != null && temps.length >= 1) {
										var temp = temps[0].firstChild.nodeValue;
										if (temp && ("" != utils.trim(temp))) {
											this.addToResponse(resp, '/cruise:currentLocation/space:currentWeather/space:temperature', temp);
										}
									}
									temps = doc.getElementsByTagName("humidity");
									if (temps != undefined && temps != null && temps.length >= 1) {
										var temp = temps[0].firstChild.nodeValue;
										if (temp && ("" != utils.trim(temp))) {
											this.addToResponse(resp, '/cruise:currentLocation/space:currentWeather/space:humidity', temp);
										}
									}
									temps = doc.getElementsByTagName("hectoPascAltimeter");
									if (temps != undefined && temps != null && temps.length >= 1) {
										var temp = temps[0].firstChild.nodeValue;
										if (temp && ("" != utils.trim(temp))) {
											this.addToResponse(resp, '/cruise:currentLocation/space:currentWeather/space:barometricPressure', temp);
										}
									}
								}
								catch (E) {
									this.log.error(E);
								}
							}
							this.sendContext(resp);
						};
						xhr.send();
					} else {
						that.sendContext(resp);
					}
				});
			};


			function errorCallback(error) {
				that.log.error('[LocationMonitor] navigator.geolocation error: ',error);
				that.sendContext(resp);
			};

			navigator.geolocation.getCurrentPosition(successCallback, errorCallback, {
				timeout: 10000
			});

		}else {
			// geolocation is not supported, cannot monitor context
			this.active= false;
			this.log.info(this.getId(),': cant monitor context');
			this.sendContext(resp);
		}
	}
});

/**
 * @class Ext.cruise.client.adapt.impl.BrowserMonitor This Monitor senses basic information about the web-browser (e.g name, version, supported features).
 * @extends Ext.cruise.client.adapt.IContextMonitor
 * @author Carsten Radeck
 */
Ext.cruise.client.adapt.impl.BrowserMonitor = Ext.extend(Ext.cruise.client.adapt.IContextMonitor, {
	timer: null,

	constructor: function(minThreshold, ctxMgr, log){
		Ext.cruise.client.adapt.impl.BrowserMonitor.superclass.constructor.apply(this, [minThreshold, ctxMgr, log]);
		this.log.info("[BrowserMonitor] constructing");
	},

	getConfidence: function(){
		return 0.75;
	},
	
	getId: function(){
		return "brwsmon";
	},
	
	getContextDescription: function(){
		return "Basic information about the web-browser (e.g name, version, supported features)";
	},

	activate: function(){
		Ext.cruise.client.adapt.impl.BrowserMonitor.superclass.activate.call();

		if (!this.timer){
			this.timer= new Ext.util.DelayedTask(this.measure, this);
			this.timer.delay(500);
		}
	},

	deactivate: function(){
		Ext.cruise.client.adapt.impl.BrowserMonitor.superclass.deactivate.call();

		if (this.timer){
			delete this.timer;
			this.timer= null;
		}
	},

	measure: function(){
		var resp= this.buildResponse();
	
		this.addToResponse(resp, '/cruise:browser/soft:name' , $.browser.name);
		this.addToResponse(resp, '/cruise:browser/soft:version' , $.browser.version);
		this.addToResponse(resp, '/cruise:browser/cruise:configuration/soft:cookiesEnabled', navigator.cookieEnabled);
		this.addToResponse(resp, '/cruise:browser/cruise:configuration/soft:javaAppletEnabled', true);//navigator.javaEnabled());

		// xmlhttpreq-support?
		var r;
		var r_type;
		try {
			r = new XMLHttpRequest();
			r_type = "XMLHttpRequest";
		} catch (e) {
			try {
				r = new ActiveXObject("Msxml2.XMLHTTP");
				r_type = "ActiveX object (Msxml2)";
			} catch (e) {
				try {
					r = new ActiveXObject("Microsoft.XMLHTTP");
					r_type = "ActiveX object (Microsoft)";
				} catch (e) {}
			}
		}
		this.addToResponse(resp, '/cruise:browser/cruise:configuration/soft:ajaxEnabled', r?true:false);

		// TODO filter for further relevant plugins respectively Mime-types

		// installed plugins
		if (navigator.plugins) {
			//  tries to find the version-number {only main.sub} for the given plugin
			function getVersion(plugin){
				// search for versionnumber in description
				var erg= /\d+\.\d+/.exec(plugin.description);
				if(erg && erg.length>=1){
					return erg[0];
				}else {
					erg= /\d+\.\d+/.exec(plugin.name);
					if(erg && erg.length>=1)
						return erg[0];
				}
			};

			for (var i = 0; i < navigator.plugins.length; ++i) {
				// flash-plugin ?
				if (navigator.plugins[i].name.toLowerCase().indexOf('flash')!= -1){
					var ver= getVersion(navigator.plugins[i]);
					if (ver){
						this.addToResponse(resp, '/cruise:browser/cruise:configuration/soft:flashVersion', ver);
					}
				}
			}
		}

		// supported MIME-types
		if (navigator.mimeTypes) {
			var ma= new Array();
			for (var i = 0; i < navigator.mimeTypes.length; ++i) {
				var mimetype = navigator.mimeTypes[i];
				if (mimetype.type=="*" || mimetype.type.indexOf(";")!=-1) continue;// filter some stuff
				ma.push(mimetype.type);
			}
			this.addToResponse(resp, '/cruise:browser/cruise:configuration/soft:supportedMedia', ma);
		}
		this.sendContext(resp);
	}
});

/**
 * @class Ext.cruise.client.adapt.impl.BasicSystemMonitor This Monitor senses basic information about the system (e.g name of the operating system, display-settings)
 * @author Carsten Radeck
 * @extends Ext.cruise.client.adapt.IContextMonitor
 */
Ext.cruise.client.adapt.impl.BasicSystemMonitor = Ext.extend(Ext.cruise.client.adapt.IContextMonitor, {

	constructor: function(minThreshold, ctxMgr, log){
		Ext.cruise.client.adapt.impl.BasicSystemMonitor.superclass.constructor.apply(this, [minThreshold, ctxMgr, log]);
		this.log.info("[BasicSystemMonitor] constructing");
	},

	getConfidence: function(){
		return 0.8;
	},
	
	getId: function(){
		return "defmon";
	},
	
	getContextDescription: function(){
		return "Basic information about the system (e.g name of the operating system, display-settings)";
	},
	
	activate: function(){
		Ext.cruise.client.adapt.impl.BasicSystemMonitor.superclass.activate.call();

		if (!this.timer){
			this.timer= {
   				run: this.measure,
   				scope: this,
			    interval: this.minThreshold
			};
			
			new Ext.util.DelayedTask(Ext.TaskMgr.start, this,[this.timer]).delay(200);
		}
	},

	deactivate: function(){
		Ext.cruise.client.adapt.impl.BasicSystemMonitor.superclass.deactivate.call();

		if (this.timer){
			Ext.TaskMgr.stop(this.timer);
			delete this.timer;
			this.timer= null;
		}
	},

	measure: function(){
		var resp= this.buildResponse();

		// timezone
		var date= new Date();
		var tzo= date.getTimezoneOffset();
		tzo= (tzo<0?"-":"")+ "PT"+(tzo>0?tzo:-1*tzo)+"M";
		this.addToResponse(resp, "/cruise:currentLocation/space:hasTimeZone[/space:gmtOffset == "+tzo+"]", tzo);

		// os
		this.addToResponse(resp, '/cruise:os/soft:name', navigator.oscpu);
		this.addToResponse(resp, '/cruise:os/cruise:platform', navigator.platform);

		// collect screen-settings
		this.addToResponse(resp, '/cruise:currentDevice/dev:hasConfiguration/dev:displayResolutionX', screen.width);
		this.addToResponse(resp, '/cruise:currentDevice/dev:hasConfiguration/dev:displayResolutionY', screen.height);
		this.addToResponse(resp, '/cruise:currentDevice/dev:hasConfiguration/dev:bitsPerPixel', (screen.pixelDepth ? screen.pixelDepth : screen.colorDepth ));

		this.sendContext(resp);
	}

});

/**
 * @class Ext.cruise.client.adapt.impl.WindowsizeMonitor This Monitor senses the current window-size of the webbrowser
 * @author Carsten Radeck
 * @extends Ext.cruise.client.adapt.IContextMonitor
 */
Ext.cruise.client.adapt.impl.WindowsizeMonitor = Ext.extend(Ext.cruise.client.adapt.IContextMonitor, {
	monitorHeight: true,
	monitorWidth: true,

	constructor: function(minThreshold, ctxMgr, log, optional){
		Ext.cruise.client.adapt.impl.WindowsizeMonitor.superclass.constructor.apply(this, [minThreshold, ctxMgr, log]);
		this.log.info("[WindowsizeMonitor] constructing");
		
		if (optional!=undefined&&optional!=null){
			this.monitorWidth= optional.monitorWidth!=false;
			this.monitorHeight= optional.monitorHeight!=false;
		}
	},

	getConfidence: function(){
		return 0.95;
	},
	
	getId: function(){
		return "winsizemon";
	},
	
	getContextDescription: function(){
		return "The size of the Browserwindow.";
	},
	
	activate: function(){
		if (this.monitorWidth!=true&&this.monitorHeight!=true)
			return;
		
		Ext.cruise.client.adapt.impl.WindowsizeMonitor.superclass.activate.call();

		this.measure();
		Ext.EventManager.on(window, 'resize', this.resized, this);
	},

	deactivate: function(){
		Ext.cruise.client.adapt.impl.WindowsizeMonitor.superclass.deactivate.call();

		Ext.EventManager.un(window, 'resize', this.resized, this);
	},

	lastUpdate: -1,
	resized: function(){
		var n= new Date().getTime();
		if (n- this.lastUpdate < this.minThreshold){
			return;
		}
		this.lastUpdate= n;
		this.measure();
	},
	
	measure: function(){
		var resp= this.buildResponse();

		if (this.monitorWidth==true)
			this.addToResponse(resp, '/cruise:browser/cruise:configuration/soft:pageSizeX', window.innerWidth);
		if (this.monitorHeight==true)			
			this.addToResponse(resp, '/cruise:browser/cruise:configuration/soft:pageSizeY', window.innerHeight);

		this.sendContext(resp);
	}

});

/**
 * @class Ext.cruise.client.adapt.impl.DeviceMonitor This Monitor senses information about the current device.
 * @author Carsten Radeck
 * @extends Ext.cruise.client.adapt.IContextMonitor
 */
Ext.cruise.client.adapt.impl.DeviceMonitor = Ext.extend(Ext.cruise.client.adapt.IContextMonitor, {

	constructor: function(minThreshold, ctxMgr, log){
		Ext.cruise.client.adapt.impl.DeviceMonitor.superclass.constructor.apply(this, [minThreshold, ctxMgr, log]);
		this.log.info("[DeviceMonitor] constructing");
	},

	getId: function(){
		return "devmon";
	},
	
	getContextDescription: function(){
		return "Information about the current device";
	},

	getConfidence: function(){
		return 0.5;
	},
	
	activate: function(){
		Ext.cruise.client.adapt.impl.DeviceMonitor.superclass.activate.call();
		
		if (!this.timer) {
			this.timer = {
				run: this.measure,
				scope: this,
				interval: this.minThreshold
			};
			
			new Ext.util.DelayedTask(Ext.TaskMgr.start, this, [this.timer]).delay(200);
		}
	},

	deactivate: function(){
		Ext.cruise.client.adapt.impl.DeviceMonitor.superclass.deactivate.call();

		if (this.timer){
			Ext.TaskMgr.stop(this.timer);
			delete this.timer;
			this.timer= null;
		}
	},

	measure: function(){
		var resp= this.buildResponse();

		var xhr= applicationManagerInstance.getServiceAccess().createXHR(this);
		xhr.open("GET","http://localhost:8080/DeviceInfo/", true);
		xhr.onreadystatechange= function(response){
			if (response.readyState!=4) return;
			try {
				if(response.status==200) {
					// parse the result of the DeviceInfo-webservice
					var doc = response.responseXML;
					var res = doc.getElementsByTagName('device');
					if (res && res.length > 0) {
						var device = res[0];
						var mobile = device.getElementsByTagName("isWireless");
						//TODO process more infos if needed
						if (mobile && mobile.length == 1) {
							this.addToResponse(resp, '/cruise:currentDevice/dev:isMobile', mobile[0].firstChild.nodeValue == "true" ? true : false);
						}
						var keyb = device.getElementsByTagName("hasKeyboard");
						if (keyb && keyb.length == 1) {
							this.addToResponse(resp, '/cruise:currentDevice/dev:hasConfiguration/dev:keyboardAvailable', keyb[0].firstChild.nodeValue == "true" ? true : false);
						}
					}
				}
				this.sendContext(resp);
			}catch(e){this.log.error(e);}
		};
		xhr.send();
	}
});
