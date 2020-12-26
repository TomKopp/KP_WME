describe("Testing the loading behaviour of the google map api in an iframe container", function() {

	var container = null;
	var log = null;

	var loadJS = function(scope, libPath, callback) {
		var script = container.contentDocument.createElement("script");
		script.type = "text/javascript";

		if (script.readyState) {
			script.onreadystatechanged = function() {
				if (script.readyState == "loaded" || script.readystate == "complete") {
					script.onreadystatechange = null;
					if (libPath.indexOf('maps.google.com/maps/api/js') > 0) {
						return;
					}
					callback.call(scope);
				}
			};
		} else {
			script.onload = function() {
				if (libPath.indexOf('maps.google.com/maps/api/js') > 0) {
					return;
				}
				callback.call(scope);
			};
		}

		if (libPath.indexOf('maps.google.com/maps/api/js') > 0) {
			// library is google maps api - special handling required
			container.contentWindow.mapsLoaded = function() {
				window.google = this.google;
				callback.call(container.contentWindow);
			};

			var end = null;
			if (libPath.indexOf('?') > -1) {
				// contains some parameter already
				end = '&callback=mapsLoaded';
			} else {
				end = '?callback=mapsLoaded';
			}
			libPath += end;
		}
		
		script.src = libPath;
		container.contentDocument.getElementsByTagName('head')[0].appendChild(script);
	};

	beforeEach(function() {
		container = document.createElement("iframe");
		var scope = this;
		container.onload = function() {
			loadJS(scope, "http://maps.google.com/maps/api/js?sensor=false", function() {
				var pt = new google.maps.LatLng(51.0635252286717, 13.74706225461);
				expect(pt).not.toBe(null | undefined);

				log.debug("Google Loading Test", "... loaded.");
			});
		};
		log = Documa.util.Logger;
	});

	it("should load the google map api dynamically", function() {
		document.getElementsByTagName("body")[0].appendChild(container);
		waits(5000);
	});

});
