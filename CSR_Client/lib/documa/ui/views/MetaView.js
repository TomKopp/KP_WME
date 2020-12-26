Ext.namespace('Documa.ui.views');

Documa.require('Documa.util.Logger');
Documa.require('Documa.ui.views.VisualConnectionManager');

/**
 * The MetaView handels the components on a more abstract level
 * and provides overlays for wrapping other data.
 *
 * @class: Documa.ui.views.MetaView
 * @author: Martin Schrader
 */
Documa.ui.views.MetaView = Ext.extend(Object, (function(){

	//////////////////
	//  Attributes  //
	//////////////////

	var TAG = 'Documa.ui.views.MetaView';
	var _log = Documa.util.Logger;

	// Store LayoutManager to get access to the component positions
	var _layoutManager = null;

	//Store UIManager to access public functions
	var _uiManager = null;

	// Root panel with grey background for component overlay div blocks
	var _metaViewContainer = null;

	// Keep references to all componant overlays
	var _componentOverlays = null;

	/////////////////////////
	//  Private Functions  //
	/////////////////////////

	function getLayout(){
		return (_layoutManager == undefined) ? null : _layoutManager.getCurrentView().getLayout();
	}

	function generateComponentOverlayID(identifier){
		return 'overlay_' + identifier;
	}

	function getUIManager(){
		if (_uiManager == null) {
			_uiManager = Documa.RuntimeManager.getUIManager();
		}

		return _uiManager;
	}

	////////////////////////
	//  Public Functions  //
	////////////////////////

	return {

		/**
		 * Create an instance of this class
		 *
		 * @param {Documa.ui.layout.LayoutManager} layoutManager LayoutManager used for organising overlays.
		 */
		constructor: function(layoutManager){
			_layoutManager = layoutManager;
			_componentOverlays = {};

			//this.createRootDivForOverlays();
		},

		/**
		 * Display component overlays
		 *
		 */
		show: function(){
			//get the central view port to retrieve dimensions for metaview overlay
			var viewport = jQuery('.centralViewPortPanel-body').get(0);

			var width = viewport.clientWidth;
			var height = viewport.scrollHeight;

			this.setSize(width, height);
		},

		/**
		 * Handels the total size of the MetaView and resizes all
		 * components according to specified total size values.
		 *
		 * @param {number} total_width Specfies the total width to be used.
		 * @param {number} total_height Specfies the total height to be used.
		 */
		setSize: function(total_width, total_height){
			//sets the height of the metaview to fit the central view port
			jQuery('#metaview').height(total_height);
		},

		/**
		 * Create overlays for all components
		 */
		createComponentOverlays: function(){
			var componentManager = Documa.RuntimeManager.getComponentManager();
			//var positions = getLayout().getPositions();
			var positions = [];
			var componentPositions = new Array();
			componentPositions = jQuery.merge(componentPositions, positions);

			// Add the positions of the service components
			/*
			var servicePanel = getUIManager().getServiceComponentPanel();
			var serviceComponents = servicePanel.getServiceComponentDomNodes();

			for (var j = 0; j < serviceComponents.length; j++){
				var serviceComponent = serviceComponents[j];
				// Add a Position Object to the position array for every service Component
				//(These ar not positions class objects like for the ui components) because they are not included in the Layout
				var position = {
					_instid: (serviceComponent.id).split('-')[1],
					_width: serviceComponent.clientWidth,
					_height: serviceComponent.clientHeight,
					_x: getUIManager().findPosX(serviceComponent),
					_y: getUIManager().findPosY(serviceComponent),
				};
				componentPositions.push(position);
			}
			*/

			// create component overlays
			for (var i = 0, length = componentPositions.length; i < length; i++){
				// the x and y coordinates can be accessed via position.getOrigin();
				var position = componentPositions[i];

				var offset = 50;
				var xPos, yPos, overlayWidth, overlayHeight = 0;

				// differentiate between Absolute Layout and FlexBox Layout
				if (position instanceof Documa.ui.layout.FlexBoxPosition) {
					// get component's container
					var compContainer = componentManager.getContainerElementById(position._instid);
					xPos = compContainer.getContainerPanel().getPosition()[0] + offset;
					yPos = compContainer.getContainerPanel().getPosition()[1] + offset;

					// There should be space on the right und the left side.
					overlayWidth = compContainer.getContainerPanel().getWidth() - 2 * offset;
					overlayHeight = compContainer.getContainerPanel().getHeight() - 2 * offset;

				} else {
					// Asumes position to be instance for Absolute Layout
					// offset for padding

					xPos = position._x + offset;
					yPos = position._y + offset;

					// There should be space on the right und the left side.
					overlayWidth = position._width - 2 * offset;
					overlayHeight = position._height - 2 * offset;
				}

				// Add overlay div block to root container
				_componentOverlays[position._instid] = this.createComponentOverlay(generateComponentOverlayID(position._instid), xPos, yPos, overlayWidth, overlayHeight);
			}
		},

		/**
		 * Integrate overlay into to the DOM by using ExtJS
		 *
		 * @param {string} overlayID Overlay identifier
		 * @param {number} xPos x-position of the top left corner of the overlay
		 * @param {number} yPos y-position of the top left corner of the overlay
		 * @param {number} width Specifies the width of the overlay.
		 * @param {number} height Specifies the height of the overlay.
		 *
		 * @return {Ext.Element} The new node
		 */
		createComponentOverlay: function(overlayID, xPos, yPos, width, height){
			// Add overlay div block to root container
			_componentOverlays[overlayID] = Ext.DomHelper.append('metaview', {
				tag: 'div',
				cls: 'component_overlay',
				id: overlayID,
				style: {
					left: xPos + 'px',
					top: yPos + 'px',
					width: width + 'px',
					height: height + 'px',
					position: 'absolute',
				}
			});
		},

		/**
		 * Removes the specified component overlay.
		 *
		 * @param {String} identifier Identifier of the component overlay to be removed.
		 * @return {boolean} Returns true if the component could be removed; otherwise false.
		 * @throws Error If the specified overlay does not exist.
		 */
		removeComponentOverlay: function(identifier){
			var overlayID = generateComponentOverlayID(identifier);
			var componentOverlay = this.getComponentOverlay(identifier);

			// Throw an error if the specified overlay does not exist.
			if (componentOverlay == undefined) {
				throw new Error("The specified component overlay could not be found.");
			}

			// remove the specified overlay
			componentOverlay.remove();
			delete _componentOverlays[overlayID];

			// redraw all overlays
			if (_componentOverlays[overlayID] == undefined) {
				//this.updateView();
				return true;
			} else {
				// The overlay could not be removed.
				return false;
			}
		},

		/**
		 * Returns a component overlay of this view by its identifier.
		 *
		 * @param {string} identifier Specifies which overlay is requested.
		 */
		getComponentOverlay: function(identifier){
			return _componentOverlays[generateComponentOverlayID(identifier)];
		},

		/**
		 * Returns the DOM object of the MetaView root div-element.
		 *
		 * @return {object} MetaView DOM object.
		 */
		getMetaViewContainer: function(){
			return (_metaViewContainer == undefined) ? null : _metaViewContainer.dom;
		},

		/**
		 * Create the root component overlay div block
		 */
		createRootDivForOverlays: function(){
			this.closeView();

			_metaViewContainer = Ext.DomHelper.append(jQuery('.centralViewPortPanel-body').get(0), {
				tag: 'div',
				cls: 'overlay_root',
				id: 'metaview'
			}, true);

			_metaViewContainer.show();
		},

		/**
		 * Close this view.
		 */
		closeView: function(){
			if (_metaViewContainer) {
				_metaViewContainer.remove();
			}
		},

		/**
		 * Updates the view contants.
		 */
		updateView: function(){
			this.closeView();
			this.show();
		}

	};

})());
