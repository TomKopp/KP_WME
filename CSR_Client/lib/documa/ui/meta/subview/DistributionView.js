Ext.namespace("Documa.ui.meta.subview");

Documa.require("Documa.util.Logger");
Documa.require("Documa.util.Util");
Documa.require("Documa.util.TimedTask");

Documa.require("Documa.ui.meta.subview.DistributionLink");
Documa.require("Documa.ui.meta.subview.UsableDevicesView");


/**
 * @typedef {Object} Size
 * @property {Number} width
 * @property {Number} height
 */

/**
 * This class presents the application's distribution state.
 * @class
 */
Documa.ui.meta.subview.DistributionView = Ext.extend(Object, function(){
	const TAG = "Documa.ui.meta.subviews.DistributionView";
	const _log = Documa.util.Logger;
	const _util = Documa.util.Util;

	const BLOCK_ID = "csr-mui-distribution-view-block";
	const DIST_GRAPHPANEL_ID = "#csr-mui-graphpanel";
	/////////////////////
	// private methods //
	/////////////////////

	/**
	 * Returns user or null using the specified identifier from given participant collection.
	 *
	 * @param {String} userid
	 * @param {Array.<Documa.collaboration.user.Participant>} participants
	 * @returns {Documa.collaboration.user.Participant}
	 */
	function getUser(userid, participants){
		for (var i = 0; i < participants.length; ++i){
			var p = participants[i];
			if (p.getStatus() === userid)
				return p;
		}
		return null;
	}

	/**
	 * @returns {Promise}
	 */
	function loadApplication(){
		var self = this;
		return new Promise(function(resolve, reject){
			try {
				if (self._scope.application) {
					resolve(self._scope.application);
				} else {
					self._scope.$watch("application", function(appcontext){
						if (!appcontext) return;
						resolve(appcontext);
					});
				}
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Retrieves all graph from current application context.
	 * @param {Documa.context.ApplicationContext} appcontext
	 * @returns {Array}
	 */
	function getGraphNodes(appcontext){
		// following entities are distribution graph nodes
		// 1.) devices
		// 2.) device services
		// 3.) components
		var results = [];
		var awarenessManager = Documa.RuntimeManager.getAwarenessManager();
		var environmentContext = Documa.RuntimeManager.getEnvironmentContext();
		var distributionSet = appcontext.getDistributionManager().getDistributions();
		for (var i = 0; i < distributionSet.length; ++i){
			var dist = distributionSet[i];
			// 1st: get device from current distribution
			var device = environmentContext.getDevice(dist.getSessionId());
			results.push(device);

			// 2nd: get components from current distribution
			dist.getComponents().forEach(function(citem){
				results.push(citem);
			});
			// 3rd: collect each device service from current device
			// and add them to the result set
			device.getDeviceServices().forEach(function(service){
				results.push(service);
			});

			// get the device user
			var participant = awarenessManager.getFromUserId(device.getUserId());

			// test whether the user was added previously
			var included = results.some(function(node){
				return (node instanceof Documa.collaboration.user.Participant && node.getUserId() === participant.getUserId());
			});
			if (included)
				continue;
			// add not included participant to the result array
			results.push(participant);
		}
		return results;
	}

	/**
	 * @param {Array.<Documa.ui.meta.subview.DistributionLink>} links
	 * @param {Object} node1
	 * @param {Object} node2
	 */
	function containsLink(links, node1, node2){
		for (var i = 0; i < links.length; ++i){
			var link = links[i];
			if ((link.getSource() === node1 && link.getTarget() === node2) ||
				(link.getSource() === node2 && link.getTarget() === node1)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Retrieves all links from current application context.
	 * @param {Documa.context.ApplicationContext}  appcontext
	 * @returns {Array.<Documa.ui.meta.subview.DistributionLink>}
	 */
	function getGraphLinks(appcontext){
		var results = [];
		/** @type {Documa.context.EnvironmentContext} */
		var environmentContext = Documa.RuntimeManager.getEnvironmentContext();
		var awareman = Documa.RuntimeManager.getAwarenessManager();

		// create a collection of 'executesCmp'-Links from
		// current application's distribution state
		var distributionSet = appcontext.getDistributionManager().getDistributions();

		// loop over each distribution
		for (var i = 0; i < distributionSet.length; ++i){
			/** @type {Documa.distribution.Distribution} */
			var distribution = distributionSet[i];

			// get device from current distribution
			var device = environmentContext.getDevice(distribution.getSessionId());

			// test whether the current distribution contains any component
			// and create a corresponding link between the device and each component
			if (distribution.getComponents().length > 0) {
				distribution.getComponents().forEach(function(citem){
					// create a "executesCmp"-link
					var link = new Documa.ui.meta.subview.DistributionLink(
						device, // link source
						citem, // link target
						Documa.ui.meta.subview.DistributionLinkTypes.EXECUTESCMP // link type
					);
					// push current link to the result set
					results.push(link);
				});
			}
			// get services from current device
			var deviceServices = device.getDeviceServices();
			// get a device-service link between the current device and its services
			deviceServices.forEach(function(service, i){
				var serviceLink = new Documa.ui.meta.subview.DistributionLink(
					device, service, Documa.ui.meta.subview.DistributionLinkTypes.HASDSERVICE);
				// register device-service association
				results.push(serviceLink);
			});
			// get device's user and create a 'hasDevice'-association between both instances
			var participant = awareman.getFromUserId(device.getUserId());
			var userlink = new Documa.ui.meta.subview.DistributionLink(
				participant, device, Documa.ui.meta.subview.DistributionLinkTypes.HASDEVICE);
			// register user-device assocation
			results.push(userlink);
		}
		// returns all associations between each device and
		// its components or device services
		return results;
	}

	/**
	 * @param {Array.<object>} nodes
	 * @param {Documa.ui.meta.subview.DistributionLink} link
	 * @returns {Documa.ui.meta.subview.DistributionLink}
	 */
	function prepareLink(nodes, link){
		for (var i = 0; i < nodes.length; ++i){
			var node = nodes[i];
			if (link.getSource() === node) {
				link.source = i;
			}
			if (link.getTarget() === node) {
				// current is the link target
				link.target = i;
			}
		}
		return link;
	}

	/**
	 * @param {Array.<object>} nodes
	 * @param {Array.<Documa.ui.meta.subview.DistributionLink>} links
	 * @returns {Array.<Documa.ui.meta.subview.DistributionLink>}
	 */
	function prepareLinks(nodes, links){
		for (var i = 0; i < links.length; ++i){
			var link = links[i];
			prepareLink(nodes, link);
		}
		return links;
	}

	/**
	 * Declares the user node representation within the distribution graph.
	 * @param {d3.selection.Update} user_selection
	 */
	function describeUserNode(user_selection){
		var self = this;
		var user_group = user_selection.enter().append("g")
			.attr("class", "user_node")
			.attr("transform", function(d){
				return "translate(" + d.x + "," + d.y + ")";
			}).call(this._force.drag);

		user_group.append("circle")
			.style("fill", function(d){
				return self._userColors(d.getUserId());
			}).attr("cx", function(d){
				return self._userNodeSize.width / 2;
			}).attr("cy", function(d){
				return self._userNodeSize.height / 2;
			}).attr("r", function(d){
				return self._userNodeSize.width / 2;
			});

		user_group.append("image")
			.attr("x", function(d){
				return (self._userNodeSize.width - 32) * 0.5;
			})
			.attr("y", function(d){
				return (self._userNodeSize.height - 32) * 0.5;
			})
			.attr("width", 32)
			.attr("height", 32)
			.attr("xlink:href", function(d){
				return d.getIcon();
			});

		user_group.append("text")
			.attr("dx", 0)
			.attr("dy", 0)
			.each(function(d){
				/** @type {Documa.collaboration.user.Participant} */
				var participant = d;
				var y = 0;
				var current = this;
				var name = participant.getUsername();
				var words = name.split(" ");
				words.forEach(function(word){
					d3.select(current).append("tspan")
						.attr("x", self._serviceNodeSize.width)
						.attr("y", ((++y) + 0.2) + "em")
						.text(word);
				});
			});
	}

	/**
	 * Declares the device node representation within the distribution graph.
	 * @param {d3.selection.Update} device_selection
	 */
	function describeDeviceNodes(device_selection){
		var self = this;

		// get participating users from current application context
		var participants = this._applicationContext.getParticipants();

		// node group definition
		var device_group = device_selection.enter().append("g")
			.attr("class", "device_node")
			.attr("transform", function(d){
				return "translate(" + d.x + "," + d.y + ")";
			})
			.call(this._force.drag);

		// node background config
		device_group.append("rect")
			.attr("class", "dist-device-rect")
			.style("fill", function(d){
				return self._deviceColors(d.getSessionId());
			})
			.attr("rx", 5)
			.attr("ry", 5)
			.attr("width", self._deviceNodeSize.width)
			.attr("height", self._deviceNodeSize.height);

		// device icon settings
		device_group.append("image")
			.attr("x", 5)
			.attr("y", 5)
			.attr("width", 32)
			.attr("height", 32)
			.attr("xlink:href", function(d){
				return d.getDevicePicture();
			});

		// device label settings
		device_group.append("text")
			.attr("dx", 0)
			.attr("dy", 0)
			.each(function(d){
				var current = this;
				var y = 0;
				var words = d.getDeviceName().split(" ");
				words.forEach(function(word){
					d3.select(current).append("tspan")
						.attr("x", 40)
						.attr("y", ((++y) + 0.2) + "em")
						.text(word);
				});
			});

		//// device user image settings
		//device_group.append("image")
		//	.attr("x", 5)
		//	.attr("y", 50)
		//	.attr("width", 32)
		//	.attr("height", 32)
		//	.attr("xlink:href", function (d) {
		//		var userid = d.getUserId();
		//		var initiator = self._applicationContext.getInitiator();
		//		if (userid === initiator.getUserId()) {
		//			return initiator.getIcon();
		//		} else {
		//			/** @type {Documa.collaboration.user.Participant} */
		//			var user = getUser(userid, participants);
		//			return user.getIcon();
		//		}
		//	});
		//
		//// user name label
		//device_group.append("text")
		//	.attr("dx", 0)
		//	.attr("dy", 0)
		//	.each(function (d) {
		//		var current = this;
		//		var y = 4;
		//		/** @type {Documa.collaboration.user.Participant} */
		//		var user = null;
		//		var userid = d.getUserId();
		//		var initiator = self._applicationContext.getInitiator();
		//		if (userid === initiator.getUserId()) {
		//			user = initiator;
		//		} else {
		//			user = getUser(userid, participants);
		//		}
		//		d3.select(this).append("tspan")
		//			.attr("x", 40)
		//			.attr("y", ((++y) + 0.2) + "em")
		//			.text(user.getFirstName());
		//		d3.select(this).append("tspan")
		//			.attr("x", 40)
		//			.attr("y", ((++y) + 0.2) + "em")
		//			.text(user.getLastName());
		//	});

		// TODO: append further ui elements
		// TODO: for describing the current node
	}

	/**
	 * Declares the component node representation at the distribution graph.
	 * @param {d3.selection.Update} component_selection
	 */
	function describeComponentNodes(component_selection){
		var self = this;
		var component_group = component_selection.enter().append("g")
			.attr("class", "cmp_node")
			.attr("transform", function(d){
				return "translate(" + d.x + "," + d.y + ")";
			}).call(this._force.drag);

		component_group.append("circle")
			.style("fill", function(d){
				return self._componentColors(d.getInstanceId());
			}).attr("cx", function(d){
				return self._componentNodeSize.width / 2;
			}).attr("cy", function(d){
				return self._componentNodeSize.height / 2;
			}).attr("r", function(d){
				return self._componentNodeSize.width / 2;
			});

		component_group.append("image")
			.attr("x", function(d){
				return (self._componentNodeSize.width - 32) * 0.5;
			})
			.attr("y", function(d){
				return (self._componentNodeSize.height - 32) * 0.5;
			})
			.attr("width", 32)
			.attr("height", 32)
			.attr("xlink:href", function(d){
				return d.getIcon();
			});

		component_group.append("text")
			.attr("dx", 0)
			.attr("dy", 0)
			.each(function(d){
				/** @type {Documa.distribution.ComponentItem} */
				var citem = d;
				var y = 0;
				var current = this;
				var name = citem.getName();
				var words = name.split(" ");
				words.forEach(function(word){
					d3.select(current).append("tspan")
						.attr("x", self._serviceNodeSize.width)
						.attr("y", ((++y) + 0.2) + "em")
						.text(word);
				});
			});
	}

	/**
	 * Declares the device service node representation at the distribution graph.
	 *
	 * @param {d3.selection.Update} service_selection
	 */
	function describeDeviceServices(service_selection){
		var self = this;
		var services_group = service_selection.enter().append("g")
			.attr("class", "service_node")
			.attr("transform", function(d){
				return "translate(" + d.x + "," + d.y + ")";
			}).call(self._force.drag);

		// add visual elements to represent the device service
		// at the distribution view
		services_group.append("circle").style("fill", function(d){
			return self._serviceColors(d.getId());
		}).attr("cx", function(d){
			return self._serviceNodeSize.width / 2;
		}).attr("cy", function(d){
			return self._serviceNodeSize.height / 2;
		}).attr("r", function(d){
			return self._serviceNodeSize.width / 2;
		});

		// append device service icon
		services_group.append("image")
			.attr("x", function(d){
				return (self._serviceNodeSize.width - 32) * 0.5;
			})
			.attr("y", function(d){
				return (self._serviceNodeSize.height - 32) * 0.5;
			})
			.attr("width", 32)
			.attr("height", 32)
			.attr("xlink:href", function(d){
				/** @type {Documa.deviceservices.DeviceService} */
				var ds = d;
				return ds.getIcon();
			});

		// append device service information
		services_group.append("text")
			.attr("dx", 0)
			.attr("dy", 0)
			.each(function(d){
				/** @type {Documa.deviceservices.DeviceService} */
				var ds = d;
				var y = 0;
				var current = this;
				var name = ds.getSmcd().find("component").attr("name");
				var words = name.split(" ");
				words.forEach(function(word){
					d3.select(current).append("tspan")
						.attr("x", self._serviceNodeSize.width)
						.attr("y", ((++y) + 0.2) + "em")
						.text(word);
				});
			});


		// TODO: append further ui elements
		// TODO: for describing the current node
	}

	/**
	 * Declares the link node representation at the distribution graph.
	 * @param {d3.selection.Update} link_selection
	 */
	function describeLinks(link_selection){
		var self = this;
		var beforeSelector = ".device_node, .cmp_node, .service_node";
		// insert lines before device, component and device service nodes
		link_selection.enter().insert("line", beforeSelector)
			.attr("class", "link")
			.style("stroke-width", function(d){
				return Math.sqrt(d.value);
			})
			.attr("x1", function(d){
				return d.source.x;
			})
			.attr("y1", function(d){
				return d.source.y;
			})
			.attr("x2", function(d){
				return d.target.x;
			})
			.attr("y2", function(d){
				return d.target.y;
			});
	}

	/**
	 * Calculates the circular position of given nodes around the given center
	 *
	 * @param {{alpha: number}} event tick event
	 * @param {{x:number, y:number}} center
	 * @param {number} radius
	 * @param {d3.selection.Update} nodes
	 * @param {Size} nsize
	 */
	function updateCircularNodePositions(event, center, radius, nodes, nsize){
		var angularStep = (2 * Math.PI) / nodes.size();
		var k = 0.1 * event.alpha;
		nodes.each(function(d, index){
			var angle = index * angularStep;
			var x = center.x + (Math.cos(angle) * radius);
			var y = center.y + (Math.sin(angle) * radius);
			var vector = {x: (x - d.x) * k, y: (y - d.y) * k};
			d.x += vector.x;
			d.y += vector.y;
		});

		nodes.attr("transform", function(d){
			var x = d.x - (nsize.width / 2);
			var y = d.y - (nsize.height / 2);
			return "translate(" + x + "," + y + ")";
		});
	}

	/**
	 * @param {d3.selection.Update} nodes
	 * @param {Size} nodeSize
	 */
	function updateNodesPosition(nodes, nodeSize){
		var self = this;
		nodes.attr("transform", function(d){
			var x = d.x - (nodeSize.width / 2);
			var y = d.y - (nodeSize.height / 2);
			return "translate(" + x + "," + y + ")";
		});
	}

	/**
	 * @param {d3.selection.Update} links
	 */
	function updateLinksPosition(links){
		links.attr("x1", function(d){
			return d.source.x;
		}).attr("y1", function(d){
			return d.source.y;
		}).attr("x2", function(d){
			return d.target.x;
		}).attr("y2", function(d){
			return d.target.y;
		});
	}

	/**
	 * Updates circle elements positions.
	 * @param {d3.selection.Update} collection
	 */
	function updateCirclePosition(collection){
		collection.attr("cx", function(d){
			return d.x;
		}).attr("cy", function(d){
			return d.y;
		});
	}

	/**
	 * Called after the application was loaded successfully.
	 * @param {Documa.context.ApplicationContext} appcontext
	 */
	function renderDistributionStateFrom(appcontext){
		_log.debug(TAG, "Representing distribution state of current application: " +
			appcontext.getValue(Documa.context.ApplicationContextAttributes.APP_NAME));

		// initiate distribution graph settings
		var margin = 40;
		var panel_selection = d3.select(this._graphPanel.get(0));

		var width = parseInt(d3.select(DIST_GRAPHPANEL_ID).style("width")) - margin * 2;
		var height = parseInt(d3.select(DIST_GRAPHPANEL_ID).style("height")) - margin * 2;

		this._xScale = d3.scale.linear().range([0, width]);
		this._yScale = d3.scale.linear().range([height, 0]);
		this._xAxis = d3.svg.axis().scale(this._xScale).orient("bottom");
		this._yAxis = d3.svg.axis().scale(this._yScale).orient("left");

		// init size and painting area of graph
		panel_selection
			.attr("width", width + margin * 2)
			.attr("height", height + margin * 2)
			.append("g")
			.attr("class", "graph-content")
			.attr("transform", "translate(" + margin + ", " + margin + ")");

		// create graph layout engine
		this._force = d3.layout.force()
			.gravity(0.05)
			.charge(-400)
			.chargeDistance(150)
			.linkDistance(
			/** @param {Documa.ui.meta.subview.DistributionLink} link */
			function(link){
				if (link.getType() === Documa.ui.meta.subview.DistributionLinkTypes.HASDEVICE) {
					return 300;
				} else {
					return 150;
				}
			})
			.size([width, height]);

		var self = this;
		// getting all relevant graph nodes and links
		getGraphNodes.call(this, appcontext).forEach(function(node){
			self._nodes.push(node);
		});
		getGraphLinks.call(this, appcontext).forEach(function(link){
			self._links.push(link);
		});

		// fill up standard attributes
		this._links = prepareLinks.call(this, this._nodes, this._links);

		// first time the distribution graph is rendered
		updateGraph.call(this, this._nodes, this._links);
	}

	/**
	 * Updates distribution graph of current application context.
	 * @param {Array} nodes distribution graph nodes (Devices, Components, DeviceServices)
	 * @param {Array} links distribution graph links (hasService- & executes-relations)
	 */
	function updateGraph(nodes, links){
		var self = this;
		// nodes array includes devices, component items, and device service objects

		// load graph layout
		this._force.nodes(nodes).links(links).start();
		this._force.stop();

		var svg = d3.select(this._graphPanel.get(0)).select(".graph-content");

		/** @type {Array.<Documa.collaboration.user.Participant>} */
		var user_nodes = nodes.filter(function(node){
			return (node instanceof Documa.collaboration.user.Participant);
		});

		/** @type {Array.<Documa.distribution.Device>} */
		var device_nodes = nodes.filter(function(node){
			return (node instanceof Documa.distribution.Device);
		});

		/** @type {Array.<Documa.distribution.ComponentItem>} */
		var component_nodes = nodes.filter(function(node){
			return (node instanceof Documa.distribution.ComponentItem);
		});

		/** @type {Array.<Documa.deviceservices.DeviceService>} */
		var dservice_nodes = nodes.filter(function(node){
			return (node instanceof Documa.deviceservices.DeviceService);
		});

		var user_selection = svg.selectAll(".user_node").data(user_nodes,
			/** @param {Documa.collaboration.user.Participant} d */
			function(d){
				return d.getUserId();
			});

		var devices_selection = svg.selectAll(".device_node").data(device_nodes,
			/** @param {Documa.distribution.Device} d  */
			function(d){
				return d.getSessionId();
			});

		var components_selection = svg.selectAll(".cmp_node").data(component_nodes,
			/** @param {Documa.distribution.ComponentItem} d  */
			function(d){
				return d.getInstanceId();
			});

		var dservice_selection = svg.selectAll(".service_node").data(dservice_nodes,
			/** @param {Documa.deviceservices.DeviceService} d  */
			function(d){
				return d.getId();
			});

		// updates graph's link collection
		var links_selection = svg.selectAll(".link").data(links, function(d){
			return d.getId();
		});

		// define position update handlings
		this._force.on("tick", function(evt){
			var distman = self._applicationContext.getDistributionManager();
			updateLinksPosition.call(self, links_selection);
			updateNodesPosition.call(self, user_selection, self._userNodeSize);
			user_selection.each(function(user){
				var center = {x: user.x, y: user.y};
				// get only the device nodes that are associated to the current user
				var user_devices_selection = devices_selection.filter(
					/** @param {Documa.distribution.Device} d */
					function(d){
						return (d.getUserId() === user.getUserId());
					});

				// calculate current devices node position
				updateCircularNodePositions.call(self, evt, center, 300, user_devices_selection, self._deviceNodeSize);

				// update component positions
				user_devices_selection.each(
					/** @param {Documa.distribution.Device} d */
					function(d){
						var device_center = {x: d.x, y: d.y};
						// calculate the circular position of component and device service nodes
						var distribution = distman.getDistributionFromDevice(d);

						var device_component_selection = components_selection.filter(
							/** @param {Documa.distribution.ComponentItem} c */
							function(c){
								return distribution.containsComponent(c.getInstanceId(), c.getComponentId());
							});

						// calculate component nodes position
						updateCircularNodePositions.call(self, evt, device_center, 150,
							device_component_selection, self._componentNodeSize);

						var device_service_selection = dservice_selection.filter(
							/** @param {Documa.deviceservices.DeviceService} ds */
							function(ds){
								return ds.getSessionID() === d.getSessionId();
							});

						// calculate device services position
						updateCircularNodePositions.call(self, evt, device_center, 150,
							device_service_selection, self._serviceNodeSize);
					});
			});
		});

		// remove old links
		links_selection.exit().remove();

		// remove old nodes
		user_selection.exit().remove();
		devices_selection.exit().remove();
		components_selection.exit().remove();
		dservice_selection.exit().remove();

		// definition of link representation on ui-layer
		describeLinks.call(self, links_selection);

		// definition of several node representation on ui-layer
		describeUserNode.call(this, user_selection);
		describeDeviceNodes.call(self, devices_selection);
		describeComponentNodes.call(self, components_selection);
		describeDeviceServices.call(self, dservice_selection);

		this._force.resume();
	}

	/**
	 * Removes device node from current distribution graph.
	 * @param {Documa.distribution.Device} device
	 */
	function removeDeviceFromGraph(device){
		var self = this;
		// remove device from the nodes collection

		// get corresponding distribution from current device for later component removal
		var distribution = this._applicationContext.getDistributionManager().getDistributionFromDevice(device);

		/** @type {Array.<object>} */
		var deletions = [];
		for (var i = 0; i < this._nodes.length; ++i){
			var node = this._nodes[i];
			if (node instanceof Documa.distribution.Device) {
				// current node is a device node
				if (node.getSessionId() === device.getSessionId()) {
					// current node is the search device
					deletions.push(node);
				}
			} else if (node instanceof Documa.deviceservices.DeviceService) {
				// current node is a device service
				// test whether this node is associated with the device
				if (node.getSessionID() === device.getSessionId()) {
					deletions.push(node);
				}
			} else if (node instanceof Documa.distribution.ComponentItem) {
				// get the corresponding distribution from current device
				// and test whether the current component item is referenced
				// by the distribution element
				if (distribution.indexOf(node) >= 0) {
					// current component is referenced in device-associated distribution
					// --> remove component
					deletions.push(node);
				}
			} else if (node instanceof Documa.collaboration.user.Participant) {
				// nothing to do here
			} else {
				throw new Error("Unsupported node detected!");
			}
		}
		// remove all nodes referenced in the deletion array
		deletions.forEach(function(node){
			var d_index = self._nodes.indexOf(node);
			if (d_index < 0)
				throw new Error("Cannot remove current device!");
			// remove node
			_util.remove(d_index, self._nodes);
		});

		// collect and remove associated links
		deletions = [];
		for (var i = 0; i < this._links.length; ++i){
			var link = this._links[i];
			if (link.getSource() === device) {
				// current link represents an association between
				// current device and a component or device service
				// ==> remove this link
				deletions.push(link);
			} else if (link.getTarget() === device) {
				deletions.push(link);
			}
		}
		// remove all links referenced in the deletion array
		deletions.forEach(function(link){
			var d_index = self._links.indexOf(link);
			if (d_index < 0)
				throw new Error("Cannot remove current link!");
			// remove link at current delete index
			_util.remove(d_index, self._links);
		});
	}

	////////////////////
	// public methods //
	////////////////////
	return {
		/**
		 * Ctor.
		 * @constructs
		 * @param {$compile} compile
		 */
		constructor: function(compile){
			this._scope = null;
			this._elem = null;

			/**
			 * @type {Documa.ui.meta.MetaUIController}
			 * @private
			 */
			this._mainController = null;

			///**
			// * @type {Documa.ui.meta.subview.UsableDevicesView}
			// * @private
			// */
			//this._usableDevicesView = null;

			/**
			 * @type {Documa.context.ApplicationContext}
			 * @private
			 */
			this._applicationContext = null;

			/**
			 * @type {jQuery}
			 * @private
			 */
			this._graphPanel = null;

			/**
			 * D3js graph layout object
			 * @type {d3.layout.force}
			 * @private
			 */
			this._force = null;

			/**
			 * @type {Ordinal<string, string>|Ordinal<Domain, string>}
			 * @private
			 */
			this._deviceColors = d3.scale.category20();

			/**
			 * @type {Ordinal<string, string>|Ordinal<Domain, string>}
			 * @private
			 */
			this._serviceColors = d3.scale.category20b();

			/**
			 * @type {Ordinal<string, string>|Ordinal<Domain, string>}
			 * @private
			 */
			this._componentColors = d3.scale.category20c();

			/**
			 * @type {Ordinal<string, string>|Ordinal<Domain, string>}
			 * @private
			 */
			this._userColors = d3.scale.category10();

			/**
			 * Includes all renderable nodes of current distribution view.
			 * @type {Array}
			 * @private
			 */
			this._nodes = [];

			/**
			 * Includes all distribution view links each is representing a specific relation between a device
			 * and a component or device service.
			 *
			 * @type {Array.<Documa.ui.meta.subview.DistributionLink>}
			 * @private
			 */
			this._links = [];

			/**
			 * Size of device node.
			 * @type {{width: number, height: number}}
			 * @private
			 */
			this._deviceNodeSize = {width: 120, height: 50};

			/**
			 * Size of user nodes.
			 * @type {Size}
			 * @private
			 */
			this._userNodeSize = {width: 50, height: 50};

			/**
			 * Size of device services.
			 * @type {Size}
			 * @private
			 */
			this._serviceNodeSize = {width: 50, height: 50};

			/**
			 * Size of components.
			 * @type {Size}
			 * @private
			 */
			this._componentNodeSize = {width: 50, height: 50};
		},

		/**
		 * Initiates current view element.
		 * @param {$rootScope.Scope} scope
		 * @param {jQuery} elem
		 * @param {Object} attr
		 */
		setup: function(scope, elem, attr){
			this._scope = scope;
			this._elem = elem;
			this._graphPanel = this._elem.find("#csr-mui-distgraph");

			///**
			// * @type {Documa.ui.meta.subview.UsableDevicesView}
			// * @private
			// */
			//this._scope.usableDevicesView = null;

			var self = this;
			this._scope.$on(Documa.ui.meta.MetaUIEvents.CTRLINIT, function(evt, controller){
				// main controller loaded
				self._mainController = controller;
			});

			var loaded = null;

			// loads current application context
			loadApplication.call(this).then(function(appcontext){
				self._applicationContext = appcontext;
				// start rendering the application's distribution state
				renderDistributionStateFrom.call(self, appcontext);
				if (loaded) loaded();
			}).catch(function(error){
				_log.error(TAG, error.stack);
			});

			this._whenReady = new Promise(function(fulfill, reject){
				try {
					if (this._force) {
						fulfill();
						self._whenReady.fulfilled = true;
					} else {
						loaded = function(){
							fulfill();
							self._whenReady.fulfilled = true;
						};
					}
				} catch (error) {
					reject(error);
				}
			});

			// loaded event
			this._scope.$emit(Documa.ui.meta.MetaUIEvents.DISTV_LOADED, this);
		},

		/**
		 * @returns {Promise}
		 */
		whenReady: function(){
			return this._whenReady;
		},

		/**
		 * Renders given device onto the distribution view.
		 * @param {Documa.distribution.Device} device
		 */
		addDevice: function(device){
			var self = this;
			var distribution = this._applicationContext.getDistributionManager().getDistributionFromDevice(device);
			var deviceNodes = this._nodes.filter(function(node){
				return (node instanceof Documa.distribution.Device && node.getSessionId() === device.getSessionId());
			});

			if (deviceNodes.length > 0) {
				throw new Error("Device already added to the distribution view!");
			}
			// add device to the nodes register
			this._nodes.push(device);

			// get components, which are not included in the node collection
			var componentNodes = distribution.getComponents().filter(function(citem){
				var notincluded = true;
				for (var i = 0; i < self._nodes.length; ++i){
					var node = self._nodes[i];
					if (node instanceof Documa.distribution.ComponentItem &&
						node.getInstanceId() === citem.getInstanceId()) {
						// current node is a component and already included
						notincluded = false;
						break;
					}
				}
				return notincluded;
			});

			// add each not included componet as additional render node and
			// create new links between the device and those not included component nodes
			componentNodes.forEach(function(citem){
				self._nodes.push(citem);
				var link = new Documa.ui.meta.subview.DistributionLink(device, citem,
					Documa.ui.meta.subview.DistributionLinkTypes.EXECUTESCMP);
				// prepare current link
				prepareLink(self._nodes, link);
				self._links.push(link);
			});

			// add device service to the distribution graph
			device.getDeviceServices().forEach(function(service){
				self._nodes.push(service);
				var link = new Documa.ui.meta.subview.DistributionLink(device, service,
					Documa.ui.meta.subview.DistributionLinkTypes.HASDSERVICE);
				prepareLink(self._nodes, link);
				self._links.push(link);
			});

			var participant = Documa.RuntimeManager.getAwarenessManager().getFromUserId(device.getUserId());
			if (!participant) throw new Error("Device user " + device.getUserId() + " is not registered!");

			var included = this._nodes.some(function(node){
				return (node instanceof Documa.collaboration.user.Participant && node.getUserId() === participant.getUserId());
			});
			if (!included) this._nodes.push(participant);

			// create a link between the participant and the device and register it as part of the device graph
			var userlink = new Documa.ui.meta.subview.DistributionLink(participant, device,
				Documa.ui.meta.subview.DistributionLinkTypes.HASDEVICE);
			prepareLink(this._nodes, userlink);
			this._links.push(userlink);

			// update current distribution graph
			updateGraph.call(this, this._nodes, this._links);
		},

		/**
		 * @param {Object} node
		 * @returns {boolean}
		 */
		includesNode: function(node){
			return this._nodes.indexOf(node) >= 0;
		},

		/**
		 * Removes specified device from distribution view.
		 * @param {Documa.distribution.Device} device
		 */
		removeDevice: function(device){
			_log.debug(TAG, "Removing device: " + device.getDeviceName());
			var self = this;
			// remove current device from list of visible devices and from the distribution graph
			// get all links from given device, which should also be removed

			// remove device from graph layer
			removeDeviceFromGraph.call(this, device);

			// after the node and link collection were modified update the distribution graph
			updateGraph.call(this, this._nodes, this._links);
		},

		/**
		 * Renders given distribution object as part of the distribution graph.
		 * @param {Documa.distribution.Distribution} distribution
		 */
		updateDistribution: function(distribution){
			var self = this;
			this._force.stop();
			var deviceNode = this._nodes.filter(function(node){
				return (node instanceof Documa.distribution.Device &&
				node.getSessionId() === distribution.getSessionId());
			})[0];

			if (!deviceNode)
				throw new Error("Missing device node " + distribution.getSessionId());

			// get components, which are not included in the node collection
			var componentNodes = distribution.getComponents().filter(function(citem){
				var notincluded = true;
				for (var i = 0; i < self._nodes.length; ++i){
					var node = self._nodes[i];
					if (node instanceof Documa.distribution.ComponentItem &&
						node.getInstanceId() === citem.getInstanceId()) {
						// current node is a component and already included
						notincluded = false;
						break;
					}
				}
				return notincluded;
			});

			// add each not included componet as additional render node and
			// create new links between the device and those not included component nodes
			componentNodes.forEach(function(citem){
				self._nodes.push(citem);
				var link = new Documa.ui.meta.subview.DistributionLink(deviceNode, citem,
					Documa.ui.meta.subview.DistributionLinkTypes.EXECUTESCMP);
				// prepare current link
				prepareLink(self._nodes, link);
				self._links.push(link);
			});

			// update current distribution graph
			updateGraph.call(this, this._nodes, this._links);
		},

		/**
		 * @returns {Documa.context.ApplicationContext}
		 */
		getApplicationContext: function(){
			return this._applicationContext;
		},

		/**
		 * Switch to given application context.
		 * @param {Documa.context.ApplicationContext} appcontext
		 */
		changeApplicationContext: function(appcontext){
			var self = this;
			this._applicationContext = appcontext;
			this._scope.$applyAsync(function(){
				//self._scope.application = appcontext;
			});
		}
	};
}());

Documa.CSRM.directive("muiDistributionView", function($compile){
	return {
		restrict: "E",
		templateUrl: "lib/documa/ui/templates/mui_distributionview.html",
		scope: {
			controller: "=",
			application: "="
		},
		link: function(scope, elem, attr){
			var controller = new Documa.ui.meta.subview.DistributionView($compile);
			controller.setup(scope, elem, attr);
			scope.$applyAsync(function(){
				scope.controller = controller;
			});
		}
	};
});
