Ext.namespace('Documa.ui.sidebar');

Documa.require('Documa.util.Logger');
Documa.require('Documa.ui.sidebar.SidebarManager');

/**
 * @class Documa.sidebar.SidebarRec
 * This class is responsible for displaying determined advice for recommendation jobs in the sidebar.
 *
 * @author Christopher Lienemann
 */
Documa.ui.sidebar.SidebarRec = Ext.extend(Object, (function () {
	var TAG = 'Documa.ui.sidebar.SidebarRec';
	var _log = Documa.util.Logger;

	var _sidebarController = null;
	var _recPanel = null;
	var _store = null;
	var _tpl = null;
	var _channelObj = null;

	return {
		/**
		 * @constructs
		 * @param controller
		 */
		constructor: function (controller) {
			_sidebarController = controller;
		},

		/**
		 * Fills the Sidebar with recommendations from given reclist object
		 * @param {Object} reclist object with recommendation infos
		 */
		fillRecMenu: function (reclist) {
			var property = reclist['property'];
			var panelId = 'recPanel' + property;
			var recs = reclist.matches;

			// add notification icon
			if ($.contains(document, '#recNotification') == false) {
				_sidebarController.getSidebarWindow().addNotification('recommendation', recs.length);
			}

			// add recommendation cluster
			if ($.contains(document, '#' + panelId) == false) {
				// grey out old recommendation clusters
				var oldPanels = Ext.select('.recPanel').elements;
				if (oldPanels.length > 0) {
					for (var i = 0; i < oldPanels.length; i++) {
						Ext.getCmp(oldPanels[i].id).collapse();
						Ext.get(oldPanels[i]).child('.x-panel-header').addClass('oldRecPanel');
					}
				}

				// create recommendation cluster
				_recPanel = new Ext.Panel({
					id: panelId,
					cls: 'recPanel',
					collapsible: true,
					collapsed: true,
					autoScroll: true,
					headerCfg: {
						tag: 'div',
						cls: 'x-panel-header',
						html: property,
						children: [
							{tag: 'div', cls: 'recPanelTitle', html: property},
							{tag: 'div', cls: 'recPanelClose', html: 'Close'}
						]
					},
					listeners: {
						afterrender: function (panel) {
							// click listener: remove notification icon when panel was expanded
							panel.header.child('.x-tool-toggle').on('click', function () {
								_sidebarController.getSidebarWindow().removeNotification('recommendation');
							}),
								panel.header.on('click', function () {
									_sidebarController.getSidebarWindow().removeNotification('recommendation');
								}),
								// click listener: delete recommendation cluster when bin icon was clicked
								panel.header.child('.recPanelClose').on('click', function () {
									panel.destroy();
								});
						}
					}
				});

				for (var i = 0; i < recs.length; i++) {
					var capLabel = recs[i].capLabel;
					var subPanelId = property + 'recSubPanel' + capLabel;

					// add recommendation sub cluster
					if ($.contains(document, '#' + subPanelId) == false) {
						var recSubPanel = new Ext.Panel({
							id: subPanelId,
							cls: 'recSubPanel',
							collapsible: true,
							collapsed: true,
							autoScroll: true,
							title: capLabel,
							headerCfg: {
								cls: 'x-panel-header'
							}
						});
						_recPanel.add(recSubPanel);
					}

					// fill sub cluster with recommendations
					this.addRecommendations(recs, property, capLabel);
				}

				// insert cluster in recommendation tab
				var tabRec = Ext.getCmp('tabRec');
				tabRec.insert(0, _recPanel);
				_recPanel.doLayout();
				Ext.getCmp('sidebar-tabs').doLayout();
			}
		},

		/**
		 * Fills sub cluster with recommendations
		 * @param {Object} recs object with recommendation infos
		 * @param {String} property recommendation property
		 * @param {String} capLabel capability label
		 */
		addRecommendations: function (recs, property, capLabel) {
			var subPanelId = property + 'recSubPanel' + capLabel;

			// create recommendation store
			_store = new Ext.data.JsonStore({
				autoDestroy: true,
				storeId: 'recStore',
				idProperty: 'id',
				data: recs,
				fields: ['id', 'name', 'operation', 'capLabel', 'screenshot', 'rating']
			});

			// remove recommendations not matching to capability label
			_store.each(function (record) {
				if (record.data.capLabel != capLabel) {
					_store.remove(record);
				}
			});

			// create recommendation template
			_tpl = new Ext.XTemplate(
				'<tpl for=".">',
				'<div class="recWrapper" id="{id}">',
				'<div class="recImg"><img src="{screenshot}" title="{name}"/></div>',
				'<div class="recName">{name}</div>',
				'<div class="recRating" id="{rating}"></div></br>',
				'<button id="{id}" data-op="{operation}" class="recButton" type="button">&nbsp;&nbsp;&nbsp;&nbsp;ADD</button>',
				'</div>',
				'</tpl>',
				'<div class="x-clear"></div>'
			);

			// create recommendation dataview
			var _recDataView = new Ext.DataView({
				id: property + 'recDataView' + capLabel,
				cls: 'recDataView',
				store: _store,
				tpl: _tpl,
				emptyText: 'No recommendations to display',
				itemSelector: 'div.recWrapper',
				listeners: {
					afterrender: {
						// add rating stars to recommendation
						fn: function (dataview) {
							var elements = dataview.all.elements;
							for (var i = 0; i < elements.length; i++) {
								var ratingDiv = elements[i].children[2];
								this.renderStars(ratingDiv.id, ratingDiv);
							}
						},
						scope: this
					},
					click: {
						// click listener for add button -> integrate component
						fn: function (dataview, index, node, e) {
							var target = e.getTarget();
							if (target.className == "recButton") {
								var manager = Documa.RuntimeManager.getComponentManager();

								// integrate component
								var componentId = target.id;
								console.log("Start integration of component with id: " + componentId + ".");
								manager.integrateCmp(componentId);

								// create channel object
								_channelObj = {
									"name": 'Channel' + Math.floor(Math.random() * 1000000),
									"params": [],
									"receiver": [{
										"cename": $(target).data('op'),
										"cetype": "operation",
										"chngev": null,
										"cid": componentId,
										"instid": null,
										"retev": null
									}],
									"recvr": "subscriber",
									"sender": [{
										"cename": property,
										"cetype": "event",
										"chngev": null,
										"cid": null,
										"clbop": null,
										"instid": null
									}],
									"sndrr": "publisher",
									"threshold": "",
									"type": 'Link'
								};

								// hide sidebar after component integration
								_sidebarController.hide();
							}
						},
						scope: this
					}
				}
			});

			// insert dataview in sub cluster
			var recSubPanel = Ext.getCmp(subPanelId);
			recSubPanel.add(_recDataView);
			recSubPanel.doLayout();
		},

		/**
		 * Adds communication channel between recommendation components
		 */
		addChannel: function () {
			if (_channelObj != null) {
				var manager = Documa.RuntimeManager.getComponentManager();
				var components = manager.getComponents();

				// find and add sender instid, sender cid and receiver instid to channel object
				for (var i in components) {
					var events = components[i].events;
					for (var event in events) {
						if (event == _channelObj.sender[0].cename) {
							_channelObj.sender[0].cid = components[i].componentInfo.id;
							_channelObj.sender[0].instid = components[i].configurations[0].id;
						}
					}
					if (components[i].componentInfo.id == _channelObj.receiver[0].cid)
						_channelObj.receiver[0].instid = components[i].configurations[0].id;
				}

				// add communication channel
				var channel = new Documa.communication.channels.LinkChannel(_channelObj);
				manager.addChannel(channel);
			}
			_channelObj = null;
		},

		/**
		 * function adds the rating amount of stars
		 * @param {Float} rating - the rating of the component
		 * @param {Element} container - the HTML container where the stars will be added
		 * @uses addHoleStars
		 */
		renderStars: function (rating, container) {
			// normalize rating -> 5 stars as maximum
			rating *= 5;

			var starContainer = document.createElement("span");
			//handles difference beween integer and float ratings
			//as half stars have to be displayed for float ratings >= 0.5
			if (rating % 1 == 0) {
				//handles integer
				for (var i = 1; i <= rating; i++) {
					addHoleStars(i);
				}
			} else {
				//handles float ratings
				for (var i = 1; i <= rating; i++) {
					addHoleStars(i);
				}
				//add a half star if necessary
				var rest = rating % 1;
				if (rest >= 0.5) {
					//one typical star
					var star = document.createElement("a");
					var number = document.createTextNode("rest");
					//class for half stars
					star.setAttribute('class', 'hs_half-star');
					star.appendChild(number);
					starContainer.appendChild(star);
				}
			}

			function addHoleStars(num) {
				var star = document.createElement("a");
				var number = document.createTextNode(num);
				//class for hole stars
				star.setAttribute('class', 'hs_star-gold');
				star.appendChild(number);
				starContainer.appendChild(star);
			}

			//adding the star container in the end is important
			var ele = container.firstChild;
			container.insertBefore(starContainer, ele);
		},

		/**
		 * function adds 5 grey stars to a component without a rating
		 * @param {Element} container - the HTML container where the stars will be added
		 */
		noRating: function (container) {
			for (var i = 1; i <= 5; i++) {
				var star = document.createElement("a");
				var number = document.createTextNode("" + i);
				//css class for grey stars
				star.setAttribute('class', 'hs_star-grey');
				star.appendChild(number);
				container.appendChild(star);
			}
		}
	};
})());