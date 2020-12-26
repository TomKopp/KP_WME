Ext.namespace('Documa.ui.views.shareview');

/**
 * @author Gregor Blichmann
 * @class Documa.ui.view.shareview.ShareWizard
 * @extends Documa.ui.views.BaseView
 *
 * The Share Wizard allows to configure individual component sharings by highlighting all possible parts (caps, props)
 * of a components by using its view bindings
 *
 */

Documa.require('Documa.RuntimeManager');
Documa.require('Documa.components.ComponentManager');
Documa.require('Documa.util.Logger');
Documa.require('Documa.ui.views.BaseView');
Documa.require('Documa.ui.views.MetaView');
Documa.require('Documa.ui.views.capview.LabelGenerator');


Documa.ui.views.shareview.ShareWizard = Ext.extend(Documa.ui.views.BaseView, (function(){

	////////////////
	// Attributes //
	////////////////

	var TAG = 'Documa.ui.views.shareview.ShareWizard';
	var _log = Documa.util.Logger;
	
	// ExtJS - objects
	var _superClass = null;
	var _sourceContainer = null;
	var _cloneContainer = null;
	
	var _currentContainerHeight = null;
	var _currentContainerWidth = null;
	var _currentVerticalOffset = null;
	var _currentHorizontalOffset = null;

	/**
	 * a helper method to calculate the component's high, based on the current center stage's height
	 */
	var calculateComponentSize = function(){
		
		//offset which is needed to display the panels of the sharing wizard
		var vOffset = 180;
		var hOffset = 400;
		var sidebar = 250;
		
		// set minimal size for the component to 200px
		var compHeight = 200;
		var compWidth = 200;
		
		// get the height of the center stage
		var centerStage = Documa.RuntimeManager.getUIManager().getCenterStage();
		var centerStageHeight = centerStage.getInnerHeight();
		var centerStageWidth = centerStage.getInnerWidth();
		
		//check whether the current size minus the offset is still bigger than the minimal size
		if ((centerStageWidth - (2 * hOffset + sidebar)) > compWidth) {
			compWidth = (centerStageWidth - (2 * hOffset + sidebar));
		}
		
		if ((centerStageHeight - 2 * vOffset) > compHeight) {
			compHeight = (centerStageHeight - 2 * vOffset);
		}
		
		// store them for later use
		_currentContainerHeight = compHeight;
		_currentContainerWidth = compWidth;
		_currentVerticalOffset = (centerStageHeight - compHeight) / 2;
		_currentHorizontalOffset = ((centerStageWidth - sidebar) - compWidth) / 2;
		
		// return the values
		return {width: compWidth, height: compHeight};
	};
	
	/**
	 * callback which is called when the cloned component is instantiated
	 */
	var onCloneComponentInstantiated = function(container){
		//if container was instantiated, 
		var cid = container.getComponentID();
		var instID = container.getComponentInstanceID();
		_log.debug(TAG, "... the clone of component {" + cid + "} was instantiated.");
		
		
		// setting containers panel dimensions
		//containerPanel.setPosition(layoutElem.getOrigin().x, layoutElem.getOrigin().y);
		
		// initialize component
		container.initializeComponent();

		// iterate through all properties and set the current state of the source component to the clone
		var cmpConfig = container.getComponentConfig();
		if (cmpConfig.hasOwnProperty("properties")) {
			var propArray = Object.getOwnPropertyNames(cmpConfig.properties);
			_log.debug(TAG, "... found " + propArray.length + " properties to synchronize for the clone component");
			for (var i = 0; i < propArray.length; i++){
				// catch current prop value
				var propertyValue = _sourceContainer.getComponentInstance().getProperty(propArray[i]);
				// set property with new value
				container.getComponentInstance().setProperty(propArray[i], propertyValue);
				// set title to component panel
				if (propArray[i] === "title") {
					container.getContainerPanel().setTitle(propertyValue);
				}
			}
		}
		
		// show container
		container.show();
		
		// show user list in sidebar **tab index = 2
		Documa.RuntimeManager.getUIManager().getSidebarManager().openTab(2);
		
		var cPanel = container.getContainerPanel();
		
		//remove all tools from the header of the component panel
		var toolsIDArray = Object.getOwnPropertyNames(cPanel.tools);
		for (var i = 0; i < toolsIDArray.length; i++){
			var tool = cPanel.getTool(toolsIDArray[i]);
			if (tool) {
				tool.remove();
				delete cPanel.tools[toolsIDArray[i]];
			}
		}

		//############# attention! ugly work around ############### 
		// adjust the size of the component //TODO better coding style needed
		// take the size of the center stage and leave 200px free space around the component
		// as long as the component's height will not be less than 200px;
		var size = calculateComponentSize();
		
		cPanel.setHeight(size.height);
		$("#" + instID).css('height', size.height);
		cPanel.setWidth(size.width);
		container.getComponentInstance().setProperty("height", parseInt(size.height) - 50);
		container.getComponentInstance().setProperty("width", parseInt(size.width) - 30);
		
		//###########################################################
		
		// show all panels necessary to edit the sharing
		// toggle component sharing menu							
		// take original instance id, not the ".._clone" one
		container.getComponentSharingMenu().fillVbPanel(instID.split('_')[0]);
		container.getComponentSharingMenu().show(instID.split('_')[0]);
	};
	
	/**
	 * callback which is called when the cloned component was loaded
	 */
	var onCloneContainerLoaded = function(){
		// if container was loaded instantiate the component
		var sourceConfig = _sourceContainer.getComponentConfig();
		// create config of the clone
		var newConfig = {
			id: sourceConfig.id + "_clone",
		};
		if (sourceConfig.hasOwnProperty("properties")) {
			newConfig.properties = sourceConfig.properties;
		}
		if (sourceConfig.hasOwnProperty("operations")) {
			newConfig.operations = sourceConfig.operations;
		}
		if (sourceConfig.hasOwnProperty("events")) {
			newConfig.events = sourceConfig.events;
		}
		//TODO clean up!!
		_cloneContainer.instantiateComponent(_sourceContainer.getDescriptor(), newConfig, onCloneComponentInstantiated);
	};
	
	/**
	 * method to create the share wizard
	 * @param cmpInstanceID String, the component instance ID of the component which should be visualized
	 */
	var createShareWizard = function(cmpInstanceID){
		// fetch container of the desired component
		var cm = Documa.RuntimeManager.getComponentManager();
		_sourceContainer = cm.getContainerElementById(cmpInstanceID);

		// get data of desired container
		var cloneInstanceID = cmpInstanceID + "_clone";
		var id = _sourceContainer.getComponentID();
		var resources = _sourceContainer.getResources();
		
		// create new container of the clone element
		_cloneContainer = new Documa.components.ComponentContainer(id, cloneInstanceID, resources);
		// trigger resource loading
		_cloneContainer.loadResources(cloneInstanceID, onCloneContainerLoaded);
		
		// add a div to the metaview canvas which holds the component
		Ext.DomHelper.append('metaview', {
			tag: 'div',
			cls: 'shareWizardComponent',
			id: "theCurrentWizardComponentContainer"
		});
		

	};
	
	return {
		constructor: function(layoutManager, viewName){

			/* Reference super class. */
			_superClass = Documa.ui.views.capview.CapView.superclass;
			_superClass.constructor.call(this, layoutManager, viewName);
		},
		
		initialize: function(cmpInstanceID){
			
			/* create panels */
			createShareWizard(cmpInstanceID);
			
			// attach the cloned component to the div in the meta view canvas
			_cloneContainer.getContainerPanel().render("theCurrentWizardComponentContainer");
			_cloneContainer.getContainerPanel().doLayout();
			
			//callback for Share Wizard Controller
			Documa.RuntimeManager.getUIManager().getShareWizardController().onShareWizardCreated(_cloneContainer);
		},


		/**
		 * Calls the show - method of the superclass and draws the Share Wizard.
		 */
		show: function(){
			_superClass.show.call(this);
		},


		/**
		 * Calls  the closeView - method of superclass for leaving the Share Wizard.
		 */
		closeView: function(){
			_superClass.closeView.call(this);
			
			// remove add user buttons from sidebar user list
			var userItems = $('.userlist-item');
			for (var i = 0; i < userItems.length; i++){
				var element = $(userItems[i]);
				element.find('.addUserButton').remove();
			}

			_cloneContainer.destroy();
			_sourceContainer = null;
			_cloneContainer = null;
			
			// close sidebar
			Documa.RuntimeManager.getUIManager().getSidebarManager().hide();
		},
		
		/**
		 * Getter for the current container width
		 * @return {Integer} the width
		 */
		getCurrentContainerWidth: function(){
			return _currentContainerWidth;
		},
		
		/**
		 * Getter for the current container height
		 * @return {Integer} the height
		 */
		getCurrentContainerHeight: function(){
			return _currentContainerHeight;
		},
		
		/**
		 * Getter for the current vertical offset
		 * @return {Integer} the offset
		 */
		getCurrentVerticalOffset: function(){
			return _currentVerticalOffset;
		},
		/**
		 * Getter for the current horizontal offset
		 * @return {Integer} the offset
		 */
		getCurrentHorizontalOffset: function(){
			return _currentHorizontalOffset;
		}
	};
})());