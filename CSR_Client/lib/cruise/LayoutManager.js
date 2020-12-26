/**
 * @class Ext.cruise.client.LayoutManager The LayoutManager organizes the positioning (and sizing) of components
 * with respect to a specified hierarchy of layouts. To initialize it, one has to call the method 'setLayoutHierarchy'.
 * Later invocations of this method serve for reconfiguration of (subtrees of) the layout hierarchy.
 */
Ext.namespace("Ext.cruise.client");
Ext.cruise.client.LayoutManager = Ext.extend(Object, {
	cManager: null,
	view: null,
	root: null,
	set: false,
	log: null,
	/* temporary layout to hold unused components during screenflow*/
	tmpLayout: null,
	//panel: null,
	
	/**
	 * Constructor of the Layout Manager
	 * @param {Object} logger an instance of the logger
	 * @param {Ext.cruise.client.ComponentManager} cMan an instance of the componentManager
	 * @param {Ext.Toolbar} appMenu (optional) The menu bar shown above the application canvas.
	 * @param {Boolean} dynamicLayoutEnabled (optional) Defines whether the layout is adapted to browser size changes. Defaults to false. 
	 * @constructor
	 */
	constructor: function(logger, cMan, appMenu, dynamicLayoutEnabled){
		this.log = logger;
		this.cManager = cMan;
		//create the empty tmp layout and hide it
		var emptyConfig = {"AbsoluteLayout":{id: 'temp', size: { width: 10, height: 10}}};
		this.tmpLayout = new Ext.cruise.client.Layout(emptyConfig, null, this.log, this.cManager);
		this.tmpLayout.setLayout("AbsoluteLayout", emptyConfig);
		this.tmpLayout.getPanel().hide();
		
		
		Ext.cruise.client.LayoutManager.superclass.constructor.call(this);

		/* the viewport hosting the layout hierarchy and thus the components */
		this.view = new Ext.Viewport({
						//layout: 'vbox',
						bufferResize: true,
						border:false,
						items: appMenu?[
						    // the application menu
							appMenu
						    ]:[]
					});
		this.view.add(this.tmpLayout.getPanel());

		/* listener for window resizes (only if dynamic layout is enabled) */
		if(dynamicLayoutEnabled == true)
			window.onresize = this.resizeApplication;
		this.log.debug('[LayoutMan] LayoutManager started.');
	},
	
	/**
	 * Displays the home screen functionalities on the application canvas
	 */
	displayHomeScreen: function(){
		var homeScreen = applicationManagerInstance.getHomeScreen();
		
		this.view.add(homeScreen.getPanel());
		this.view.doLayout();
		
		var rp= Ext.getCmp("searchResult_panel");
		if (!rp || !rp.rendered) return;
		rp.hide();
	},
	
	/**
	 * Hides the home screen functionalities on the application canvas
	 */
	hideHomeScreen: function(){
		var homeScreen = applicationManagerInstance.getHomeScreen();
		
		var rp= Ext.getCmp("searchResult_panel");
		if (rp && rp.rendered)
			rp.hide();
		
		this.view.remove(homeScreen.getPanel());
		delete applicationManagerInstance.homeScreen;
		this.view.doLayout();
	},
	
	/**
	 * Resets this runtime component to enable the execution of a new application on the fly.
	 */
	reset: function(){
		if (this.view && this.root)
			this.view.remove(this.root.getPanel());
		if (this.root)
			this.root.dispose();
		this.set=false;
		delete this.root;
	},
	
	/**
	 * Handles the resize of the application
	 *
	 * @param{Integer} width the new width of the application in pixel
	 * @param{Integer} height the new width of the application in pixel  
	 */
	resizeApplication: function(){
		var layMan = applicationManagerInstance.getLayoutManager();
		// get current size of root panel
		if(layMan.root != null && layMan.root.getPanel() != undefined){
			var currentCanvasWidth = layMan.root.size.width;
			var currentCanvasHeight = layMan.root.size.height;
			//define application canvas as big as the screen size 
			// only if changes happend
			var ch= layMan.getCanvasHeight();
			if(currentCanvasWidth != layMan.getCanvasWidth() || currentCanvasHeight!=ch){
				layMan.root.setSize(layMan.getCanvasWidth(), ch);
				var r= applicationManagerInstance.getRecommendationManager().recommendationMenu;
				if (r!=undefined&&r!=null){
					r.setHeight(ch);
				}
			}
		}
		
		// Wait 500ms before calling our function. If the user presses another key 
						// during that 500ms, it will be cancelled and we'll wait another 500ms.
						if(layMan.root != null){
							this.task= new Ext.util.DelayedTask(function(){
								layMan.root.setComponentSize();});
							this.task.delay(1000);
						}
	},
	
	/**
	 * Returns the current height of the canvas
	 * @private
	 */
	getCanvasHeight: function() {
		  var myHeight = 0;
		  if( typeof( window.innerWidth ) == 'number' ) {
		    //Non-IE
		    myHeight = window.innerHeight;
		  } else if( document.documentElement && document.documentElement.clientHeight ) {
		    //IE 6+ in 'standards compliant mode'
		    myHeight = document.documentElement.clientHeight;
		  } else if( document.body && document.body.clientHeight ) {
		    //IE 4 compatible
		    myHeight = document.body.clientHeight;
		  }
		  //reducing height of screen with height of app menu
		  //var toolbarEnabled = applicationManagerInstance.getIsAppFrameEnabled();
		  //if (!toolbarEnabled) return myHeight; 
		 
		  var returnvalue = myHeight-40;
		  return returnvalue; //toolbar.getHeight();
	},
	
	/**
	 * Returns the current width of the canvas
	 * @private
	 */
	getCanvasWidth: function() {
		  var myWidth = 0;
		  if( typeof( window.innerWidth ) == 'number' ) {
		    //Non-IE
		    myWidth = window.innerWidth;
		  } else if( document.documentElement && document.documentElement.clientWidth ) {
		    //IE 6+ in 'standards compliant mode'
		    myWidth = document.documentElement.clientWidth;
		  } else if( document.body && document.body.clientWidth ) {
		    //IE 4 compatible
		    myWidth = document.body.clientWidth;
		  }
		  return myWidth;
	},
	
	/**
	 * Initialize or manipulate the layout hierarchy. All Layout(Element)s are constructed according to the given configuration.<br/><br/>
	 * 
	 * For initialization, i.e upon first invocation, the complete layout hierarchy has to be passed.
	 * To reconfigure a subtree of the hierarchy, 'rootId' identifies the subtree's root layout and 
	 * 'config' defines its (new) structure. <br/><br/>
	 * 
	 * IMPORTANT: All components have already to be initialized when executing this method.
	 * 
	 * @public
	 * @function
	 * @param {String} rootId the Id of the Layout to be set/reconfigured
	 * @param {Object} config represents the topmost Layout in the applications layout model. Thus, it configures the layout hierarchy. 
	 * 
	 */
    setLayoutHierarchy: function(rootId, config) {
        if (config == undefined || config == null)
			return false;

        var name = Ext.cruise.client.LayoutUtil.extractType(config);
		if (!name) throw "Unsupported Layout!";
		
		try{
            this.root = this._createLayoutElem(config);
			this.set = true;
            this.root.setLayout(name, config);
            var panel = this.root.getPanel();
            panel.forceLayout = true;
			if (!panel) return false;
			//check whether the application menu is active or not and set css class if necessary
			if(applicationManagerInstance.getAppMenu()){
				panel.baseCls='applicationCanvas';
			}
			this.view = new Ext.Viewport({			
				layout: 'fit'
	        });
			this.view.add(panel);
            this.view.doLayout();
			
        } catch(e) {
            this.log.error("[LayoutMan] Failed to set layout hierarchy ", e);
        }
        return true;
	},
	
	/**
	 * Recursively builds the hierarchy of Layouts as described in the configuration.
	 * @private
	 * @function
	 * @param {Object} layout
	 * @param {Object} (optional) parent
	 */
    _createLayoutElem: function(layout, parent) {
        var comp_childs = Ext.cruise.client.LayoutUtil.extractChildLayouts(layout);
        var neu = new Ext.cruise.client.Layout(comp_childs.id, parent, this.log, this.cManager, comp_childs.components);

        if (comp_childs.childLayouts != undefined && comp_childs.childLayouts != null) {
            for (var idx = 0; idx < comp_childs.childLayouts.length; ++idx) {
                var c = this._createLayoutElem(comp_childs.childLayouts[idx], neu);
				//c.setLayout(Ext.cruise.client.LayoutUtil.extractType(comp_childs.childLayouts[idx]), comp_childs.childLayouts[idx]);
				neu.addChild(c);
			}
			neu.setLayout(comp_childs.type, layout);
		}
		
		return neu;
	},

	/**
	 * Calculates the current layout. In general its not necessary to manually invoke this method.
	 * @private
	 * @function
	 */
    doLayout: function() {
        if(this.set == false) {
			this.log.error('[LayoutMan] Illegal state. Layout hierarchy not yet set!');
			return;
		}
		this.root.doLayout();
		this.view.doLayout();
	},
	
	/**
	 * Serializes the current layout model.
	 * @return {String} the serialized layout model
	 */
	serializeLayoutModel: function(){
		var menu= applicationManagerInstance.getAppMenu();
		//this.root.serialize(menu? menu.getHeight():0);
		return "<layoutModel>"+this.root.serialize(menu? menu.getHeight():0)+"</layoutModel>";
	},
	
	/**
	 * Adds the given component to the current layout.
	 * @param {String} id The component ID
	 * @param {Ext.Panel} component The adaptability panel of the component
	 */
	addComponent: function(id, component){
		this.root.addComponent(id, component);
	},

	/**
	 * Removes the given component from the current layout.
	 * @param {String} id The component ID
	 */
	removeComponent: function(id){
		this.root.removeComponent(id);
	}
});

/**
 * @class Ext.cruise.client.LayoutElement Represents a single layout in the entire hierarchy. 
 * NOT for public usage, i.e, its not recommended to directly instantiate objects neither calling methods. 
 * All LayoutElements are under control of the LayoutManager whose functionality should be used instead.
 * @private 
 */
Ext.cruise.client.Layout = Ext.extend(Object, {
	layout: null,
	id: null,
	type: null,
	size: null,
	components: null,
	componentIDs: null,
	componentMappings: null,
	componentDimensions: null,
	children: null,
	log: null,
	set: false,
	cManager: null,
	parent: null,
	
	current: null,
	current_config: null,
	
    constructor: function(id, parent, logger, cMan, componentIDs) {
        this.cManager = cMan;
        this.log = logger;
		this.components = new Array();
		this.componentIDs = componentIDs/*config.components*/ || new Array();
		this.componentMappings = {};
		this.componentDimensions = {};
		this.children = new Array();
		this.id = id;
		this.parent = parent;
		
		for(var idx=0; idx < this.componentIDs.length; ++idx){
			var id= this.componentIDs[idx];
			var panel= this.cManager.getAdaptabilityPanel(id);
						
            if (panel != undefined && panel != null) {
				this.components.push(panel);
				this.componentMappings[id] = panel;
			}
		}
	},
	
	/**
	 * Disposes this layout element, releasing allocated data structures. 
	 */
	dispose: function(){
		for (var idx=0; idx < this.children.length; ++idx){
			this.children[idx].dispose();
		}
		this.children.length=0;
		this.current.destroy();
		delete this.children;
		delete this.current;
		delete this.current_config;
		delete this.componentMappings;
		delete this.components;
		delete this.componentIDs;
		delete this.size;
		delete this.parent;
	},
	
	/**
	 * Serialize the information regarding this layout element in terms of a metamodel 'Layout'.
	 */
	serialize: function(y_offset){
		var ser= "<layout xsi:type=\""+Ext.cruise.client.Constants._CCM_NS_IE+this.type+"\" name=\""+this.id+"\">";
		ser+="<bounds height=\""+ this.size.height +"\" width=\""+this.size.width +"\" unit=\"pixel\" />";
		
		for (var idx=0; idx < this.componentIDs.length; ++idx){
			var panel= this.componentMappings[this.componentIDs[idx]];
			var pos;
			if (panel == undefined || panel == null) 
				pos = [0, 0];
			else {
				pos = panel.getPosition();
				pos[1]= Math.max(pos[1] - (y_offset||0),0);
			}
			
			ser+="<position locate=\""+ this.componentIDs[idx] +"\" x=\""+pos[0]+"\" y=\""+pos[1]+"\" />";
		}
		
		for (var idy=0; idy< this.children.length; ++idy){
			ser+= this.children[idy].serialze(y_offset);
		}
		
		ser+="</layout>";

		return ser;
	},
	
	/**
	 * Searches for a Layout with the specified ID in the complete subtree of all subordinate Layout.
	 * @function
	 * @public
	 * @param {Object} id
	 * @return either the requested Ext.cruise.client.LayoutElement or null
	 */
    findById: function(id) {
        if (id == undefined || id == null) return null;
        if (this.id == id) return this;
        if (this.children == null || this.children.length == 0) return null;
        for (var idx = 0; idx < this.children.length; ++idx) {
            var res = this.children[idx].findById(id);
            if (res != null) return res;
		}
	},
	
	/**
	 * Set this element's size
	 * @param {integer} width
	 * @param {integer} height
	 */
	setSize: function(width, height){
		this.current.setSize(width, height);
		
		if (width!=undefined && width!=null)
			this.size.width=width;
		if (height!=undefined && height!=null)
			this.size.height=height;
	},
	
	/**
	 * Adds the specified Layout as a child to this Layout
	 * @function
	 * @public
	 * @param {Ext.cruise.client.Layout} layout
	 */
    addChild: function(layout) {
        if (layout == undefined || layout == null) return;
		
        for (var i = this.children.length - 1; i >= 0; i--) {
            if (this.children[i].id === layout.id) {
                this.log.error('[LayoutMan] Child \'' + layout.id + '\' of layout \'' + this.id + '\' already exists.');
				return;
			}
		};
		this.children.push(layout);
		
		this.componentMappings[layout.id] = layout.getPanel();
		this.components.push(layout.getPanel());
	},

	/**
	 * @return the panel of this Layout
	 */
    getPanel: function() {
		return this.current;
	},
	
	/**
	 * @return the parent
	 */
    getParent: function() {
		return this.parent;
	},
	
	/**
	 * Calculates the Position for each Component
	 * @param {String} id
	 * @return sumWidth
	 */
	calculateNewPosition : function(id){
		var sumWidth = 0;	
		
		for(var i = 0; i < this.componentIDs.length; i++ ){
			//calculates the position of the current Component
			if(this.componentIDs[i] != id){

				//Position for Components with infinite WIdths/Heights
				if(this.componentDimensions[this.componentIDs[i]].endlessFlag == true) {
					
					// has maxWidth
					if(this.componentDimensions[this.componentIDs[i]].maxWidth != 0){ 
						sumWidth += this.componentDimensions[this.componentIDs[i]].maxWidth;                                                                              
							}
				
					// has no maxWIdth
					if(this.componentDimensions[this.componentIDs[i]].maxWidth == 0){ 
						sumWidth += this.componentDimensions[this.componentIDs[i]].actWidth;                                                  
							}	
				}
				
				// Position for Components with min and max Widths/Heights
				else {
										
				// Components Width is greater than maxWidth, comparison with 0, 'cause actWidth is initialized with 0
				if(this.componentDimensions[this.componentIDs[i]].actWidth == 0){ 
					sumWidth += this.componentDimensions[this.componentIDs[i]].maxWidth;                                                                              
						}
			
				//Components WIdth is lower than maxWidth
				if(this.componentDimensions[this.componentIDs[i]].actWidth != 0){ 
					sumWidth += this.componentDimensions[this.componentIDs[i]].actWidth;                                                  
						}
				}
				
			}			
			else {	
				return (sumWidth);
			}							
		}		
		return sumWidth;										
	},
	
	/**
	 * Calculates the sum of Widths of Compnent with maxWidth
	 * @return sumWidth
	 */
	getComponentWidth : function (){
		
		var sumWidth = 0;		
		for(var i = 0; i < this.componentIDs.length; i++ ){
			// sum of Components with min = max 
			if(this.componentDimensions[this.componentIDs[i]].endlessFlag == false && (this.componentDimensions[this.componentIDs[i]].minWidth == this.componentDimensions[this.componentIDs[i]].maxWidth)){
			
					sumWidth += this.componentDimensions[this.componentIDs[i]].maxWidth; 		
			}	
			// Sum of COmponents with min max Widths/Heights (endlessFlag=false), where Values of Width/Height are between those mins and max's
			if((this.componentDimensions[this.componentIDs[i]].endlessFlag == false) && (this.componentDimensions[this.componentIDs[i]].hasMM != 0)){
				
				sumWidth += this.componentDimensions[this.componentIDs[i]].hasMM;								
			
			}	
			// Sum of Compnent with infinite Wifdhts/Heights (endlessFlag==true)
			if(this.componentDimensions[this.componentIDs[i]].endlessFlag == true){
				if(this.componentDimensions[this.componentIDs[i]].maxWidth != 0 ){ 
					sumWidth += this.componentDimensions[this.componentIDs[i]].maxWidth; 
				}                                                           
			}	
		}	
		return (sumWidth);		
	},
	
	/**
	 * Calculates the size of components
	 * 
	 */	
	calculateComponentSize : function (){
		var laMa = applicationManagerInstance.getLayoutManager();
		var help = 0;
		//reset to initial states
			for(var i = 0; i < this.componentIDs.length; i++ ){
				if(this.componentDimensions[this.componentIDs[i]].endlessFlag == true) {
					this.componentDimensions[this.componentIDs[i]].maxWidth = 0;		
				}
				else {
					this.componentDimensions[this.componentIDs[i]].hasMM = 0;
				}	
			}
			
		// Iteration needs to be done until no components changes its Size--> others don't need resize
		do{
			help = 0;
			for(var i = 0; i < this.componentIDs.length; i++ ){
					//get component id
					var cid = this.componentIDs[i];
					// Components with infinite Width and no maxWIdth
					if(this.componentDimensions[cid].endlessFlag == true && this.componentDimensions[cid].maxWidth == 0) {
						this.componentDimensions[cid].actWidth =  ((laMa.getCanvasWidth() - this.getComponentWidth()) / this.countNoMax());
						
						// actWidth< minWIdth: component is too small and needs to be resized, therefore all others need resize too
						if(this.componentDimensions[cid].actWidth < this.componentDimensions[cid].minWidth){
							this.componentDimensions[cid].actWidth = this.componentDimensions[cid].minWidth;
							this.componentDimensions[cid].maxWidth = this.componentDimensions[cid].minWidth;
							help +=1;					
						}						
					}
					
					// Components with fixed, different Width & Height and Values of Width/Height are between min and max (hasMM=0)) 
					if ((this.componentDimensions[cid].endlessFlag == false) && 
							((this.componentDimensions[cid].maxWidth != this.componentDimensions[cid].minWidth)) && this.componentDimensions[cid].hasMM == 0 ){
						this.componentDimensions[cid].actWidth = ((laMa.getCanvasWidth() - this.getComponentWidth()) / this.countNoMax());
						
						//actWidth< minWIdth: component is too small and needs to be resized, therefore all others need resize too (help+1)
						
						if(this.componentDimensions[cid].actWidth < this.componentDimensions[cid].minWidth){
							// Valua of WIdth is outside of min--> hasMM gets minWIdth
							this.componentDimensions[cid].hasMM = this.componentDimensions[cid].minWidth;
							this.componentDimensions[cid].actWidth = this.componentDimensions[cid].minWidth;
							help +=1;					
						}
						//actWidth< minWIdth: component is too large and needs to be resized, therefore all others need resize too (help+1)
						if((this.componentDimensions[cid].actWidth > this.componentDimensions[cid].maxWidth)){
							// Valua of WIdth is outside of max--> hasMM gets maxWidth
							this.componentDimensions[cid].hasMM =this.componentDimensions[cid].maxWidth;
							this.componentDimensions[cid].actWidth = this.componentDimensions[cid].maxWidth;
							help +=1;
						}
					}
			}
		} while (help !=0);					
	},
	
	/**
	 * Counting components, which currently can have endless width 
	 * @reutrn count
	 */
	countNoMax : function () {
		var count = 0;
		for(var i = 0; i < this.componentIDs.length; i++ ){
			//Compnents with infinite Widths/Heights
			if(this.componentDimensions[this.componentIDs[i]].endlessFlag == true){
				if(this.componentDimensions[this.componentIDs[i]].maxWidth == 0){			
					count += 1;
				}					
			}
			// Components with different min and max Widths
			if(this.componentDimensions[this.componentIDs[i]].endlessFlag == false){

				if(this.componentDimensions[this.componentIDs[i]].minWidth != this.componentDimensions[this.componentIDs[i]].maxWidth){
					
					// Value of Width is between min and max
					if((this.componentDimensions[this.componentIDs[i]].hasMM == 0)){	
					
						count += 1;
					}					
				}
			}	
		}
		
		if( count != 0){
			return count;
		}						
		else {
			return 1;		
		}
	},
	
	/** 
	 * refills the componentDimensions Array after a Browserrefresh
	 */
	initComponentDimensions : function (){
		
		var laMa = applicationManagerInstance.getLayoutManager();
		
		/* after refresh componentIDs, comnponents are mirrored-> need to be reversed */
		this.componentIDs.reverse();
		this.components.reverse();
	
		for(var i = 0; i < this.componentIDs.length; i++ ){
			
			var mcdl = applicationManagerInstance.getComponentManager().getSMCDL(this.componentIDs[i]);
		
			this.componentDimensions[this.componentIDs[i]] = {
				minWidth: null,  	// int-Value für minWidth
				maxWidth: null,  	// int-Value for maxWidth
				minHeight: null, 	// int-Value for minHeight
				maxHeight: null, 	// int-Value for minWidth
				actWidth: null,     // int-Value for current Componentwidth
				endlessFlag: false, // boolean-Value to indicate components with/without maxWidth
				hasMM: null,        // int-Value to indicate componentssize is min or max for Components where min and max aren't equal  
				fixedRatio: null,  // stores die Width-Height Relation of the Component; 1 if no Ratio attached
			}
			
			// fetch necessary information about dimension
			var dimensions = Ext.cruise.client.Utility.getElementsByTagNameNS(Ext.cruise.client.Constants._SMCDL_META_PRE_, Ext.cruise.client.Constants._SMCDL_META_NS_,'dimensions',mcdl)[0];
			var min = Ext.cruise.client.Utility.getElementsByTagNameNS(Ext.cruise.client.Constants._SMCDL_META_PRE_, Ext.cruise.client.Constants._SMCDL_META_NS_,'min',mcdl)[0];
			var max = Ext.cruise.client.Utility.getElementsByTagNameNS(Ext.cruise.client.Constants._SMCDL_META_PRE_, Ext.cruise.client.Constants._SMCDL_META_NS_,'max',mcdl)[0];
			
			if(dimensions.getAttribute('fixedRatio') == "true"){
				this.componentDimensions[this.componentIDs[i]].fixedRatio = (parseInt(min.getAttribute('width'))) /  (parseInt(min.getAttribute('height')));
			}
			if(dimensions.getAttribute('fixedRatio') == "false"){
				this.componentDimensions[this.componentIDs[i]].fixedRatio = 1;
			}
			if(dimensions.getAttribute('fixedRatio') == undefined){
				this.componentDimensions[this.componentIDs[i]].fixedRatio = 1;
			}	
		
			if(min != undefined){
				this.componentDimensions[this.componentIDs[i]].minWidth = parseInt(min.getAttribute('width'));
				this.componentDimensions[this.componentIDs[i]].minHeight = parseInt(min.getAttribute('height'));
				this.componentDimensions[this.componentIDs[i]].actWidth = 0;
				this.componentDimensions[this.componentIDs[i]].endlessFlag = false;
			} else {
				this.log.error("[LayoutMan] error meta:min in SMCDL dimensions is not defined");
			}
			
			if(max != undefined)
			{
				this.componentDimensions[this.componentIDs[i]].maxWidth = parseInt(max.getAttribute('width'));
				this.componentDimensions[this.componentIDs[i]].maxHeight = parseInt(max.getAttribute('height'));
				this.componentDimensions[this.componentIDs[i]].actWidth = 0;
				this.componentDimensions[this.componentIDs[i]].endlessFlag = false;
			}
			
			if(max == undefined){
				this.componentDimensions[this.componentIDs[i]].maxWidth = 0;
				this.componentDimensions[this.componentIDs[i]].maxHeight = 0;
				this.componentDimensions[this.componentIDs[i]].actWidth = laMa.getCanvasWidth();
				this.componentDimensions[this.componentIDs[i]].endlessFlag = true;
			}
		}
	},
	
	/**
	 * Setting the Height of Component using the fixedRatio for satisfying the ratio
	 * 
	 */
	setFixedHeight : function(i, width){
		this.componentDimensions[this.componentIDs[i]].maxHeight = width / this.componentDimensions[this.componentIDs[i]].fixedRatio;
	},
	
	/**
	 * sets the size of components depending on the available space on the screen
	 * 
	 */
	setComponentSize : function() {
		var laMa = applicationManagerInstance.getLayoutManager();
		// refresh 
		if(this.componentDimensions[this.componentIDs[0]] == undefined)		
			this.initComponentDimensions();				
		// Calculating size of all components
		this.calculateComponentSize();

		for(var i = 0; i < this.componentIDs.length; i++){
			// Handling components with endless width
			if(this.componentDimensions[this.componentIDs[i]].endlessFlag == true){
				if(this.componentDimensions[this.componentIDs[i]].maxWidth != 0){
					laMa.root.components[i].setSize(this.componentDimensions[this.componentIDs[i]].minWidth, this.componentDimensions[this.componentIDs[i]].minHeight);
					applicationManagerInstance.getComponentManager().getComponentInstance(this.componentIDs[i]).setProperty('width',this.componentDimensions[this.componentIDs[i]].minWidth);
					applicationManagerInstance.getComponentManager().getComponentInstance(this.componentIDs[i]).setProperty('height',this.componentDimensions[this.componentIDs[i]].minHeight);
					var xPosition = this.calculateNewPosition(this.componentIDs[i]);
					this.components[i].setPosition(xPosition, 0 );
				} else {
					if(this.componentDimensions[this.componentIDs[i]].fixedRatio != 1){
						this.setFixedHeight(i, this.componentDimensions[this.componentIDs[i]].actWidth);	
						laMa.root.components[i].setSize(this.componentDimensions[this.componentIDs[i]].actWidth, this.componentDimensions[this.componentIDs[i]].maxHeight);
						applicationManagerInstance.getComponentManager().getComponentInstance(this.componentIDs[i]).setProperty('width',this.componentDimensions[this.componentIDs[i]].actWidth);
						applicationManagerInstance.getComponentManager().getComponentInstance(this.componentIDs[i]).setProperty('height', this.componentDimensions[this.componentIDs[i]].maxHeight);
						var xPosition = this.calculateNewPosition(this.componentIDs[i]);
						this.components[i].setPosition(xPosition, 0 );
					} else {
						laMa.root.components[i].setSize(this.componentDimensions[this.componentIDs[i]].actWidth, laMa.getCanvasHeight());
						applicationManagerInstance.getComponentManager().getComponentInstance(this.componentIDs[i]).setProperty('width',this.componentDimensions[this.componentIDs[i]].actWidth);
						applicationManagerInstance.getComponentManager().getComponentInstance(this.componentIDs[i]).setProperty('height',laMa.getCanvasHeight());
						var xPosition = this.calculateNewPosition(this.componentIDs[i]);
						this.components[i].setPosition(xPosition, 0 );
					}
				}
			}
			
			//Handling components with fixed max width
			if(this.componentDimensions[this.componentIDs[i]].endlessFlag == false){
				if(this.componentDimensions[this.componentIDs[i]].actWidth == 0){
					if(this.componentDimensions[this.componentIDs[i]].fixedRatio != 1){
						this.setFixedHeight(i, this.componentDimensions[this.componentIDs[i]].maxWidth);
					}
					laMa.root.components[i].setSize(this.componentDimensions[this.componentIDs[i]].maxWidth, this.componentDimensions[this.componentIDs[i]].maxHeight);
					applicationManagerInstance.getComponentManager().getComponentInstance(this.componentIDs[i]).setProperty('width',this.componentDimensions[this.componentIDs[i]].maxWidth);
					applicationManagerInstance.getComponentManager().getComponentInstance(this.componentIDs[i]).setProperty('height',this.componentDimensions[this.componentIDs[i]].maxHeight);							
					var xPosition = this.calculateNewPosition(this.componentIDs[i]);
					this.components[i].setPosition(xPosition, 0 );																															
				} else {
					if(this.componentDimensions[this.componentIDs[i]].fixedRatio != 1){
						this.setFixedHeight(i, this.componentDimensions[this.componentIDs[i]].actWidth);
					}
					laMa.root.components[i].setSize(this.componentDimensions[this.componentIDs[i]].actWidth, this.componentDimensions[this.componentIDs[i]].maxHeight);
					applicationManagerInstance.getComponentManager().getComponentInstance(this.componentIDs[i]).setProperty('width',this.componentDimensions[this.componentIDs[i]].actWidth);
					applicationManagerInstance.getComponentManager().getComponentInstance(this.componentIDs[i]).setProperty('height',this.componentDimensions[this.componentIDs[i]].maxHeight);
					var xPosition = this.calculateNewPosition(this.componentIDs[i]);
					this.components[i].setPosition(xPosition, 0 );
				}
			}
		}
	},

	/**
	 * Add a component to the composition
	 * 
	 * @function
	 * @param{Object} component the component to add
	 * @param{String} id the id of the component to add
	 */
	addComponent : function(id, component) {
		// handle AbsoluteLayout
		if (this.type == 'AbsoluteLayout') {

			// get next free xPosition
			// TODO find better layout
			var laMa = applicationManagerInstance.getLayoutManager();
			var mcdl = applicationManagerInstance.getComponentManager().getSMCDL(id);
			
		
			this.componentDimensions[id] = {
					minWidth: null,
					maxWidth: null,
					minHeight: null, 
					maxHeight: null,
					actWidth: null,
					endlessFlag: false,
					hasMM: null,
					fixedRatio: null,
			}
			
			// fetch necessary information about dimension
			var dimensions = Ext.cruise.client.Utility.getElementsByTagNameNS(Ext.cruise.client.Constants._SMCDL_META_PRE_, Ext.cruise.client.Constants._SMCDL_META_NS_,'dimensions',mcdl)[0];
			var min = Ext.cruise.client.Utility.getElementsByTagNameNS(Ext.cruise.client.Constants._SMCDL_META_PRE_, Ext.cruise.client.Constants._SMCDL_META_NS_,'min',mcdl)[0];
			var max = Ext.cruise.client.Utility.getElementsByTagNameNS(Ext.cruise.client.Constants._SMCDL_META_PRE_, Ext.cruise.client.Constants._SMCDL_META_NS_,'max',mcdl)[0];

			if (dimensions!=undefined){
				if(dimensions.getAttribute('fixedRatio') == "true"){
					this.componentDimensions[id].fixedRatio = (parseInt(min.getAttribute('width'))) /  (parseInt(min.getAttribute('height')));
				}
				
				if(dimensions.getAttribute('fixedRatio') == "false"){
					this.componentDimensions[id].fixedRatio = 1;
				}
				
				if(dimensions.getAttribute('fixedRatio') == undefined){
					this.componentDimensions[id].fixedRatio = 1;
				}
			}

			if(min != undefined){
				this.componentDimensions[id].minWidth = parseInt(min.getAttribute('width'));
				this.componentDimensions[id].minHeight = parseInt(min.getAttribute('height'));
				this.componentDimensions[id].actWidth = 0;
				this.componentDimensions[id].endlessFlag = false;
			}else{
				this.log.error("[LayoutMan] error meta:min in SMCDL dimensions is not defined");
			}
			
			if(max != undefined)
			{
				this.componentDimensions[id].maxWidth = parseInt(max.getAttribute('width'));
				this.componentDimensions[id].maxHeight = parseInt(max.getAttribute('height'));
				this.componentDimensions[id].actWidth = 0;
				this.componentDimensions[id].endlessFlag = false;
			}
				
			if(max == undefined || max == 0){
				this.componentDimensions[id].maxWidth = 0;
				this.componentDimensions[id].maxHeight = 0;
				this.componentDimensions[id].actWidth = laMa.getCanvasWidth();
				this.componentDimensions[id].endlessFlag = true;
			}

			
			this.components.push(component);
			this.componentIDs.push(id);
			this.componentMappings[id]=component;
			this.setComponentSize();
			this.current.add(component);
			this.doLayout();

			var sleft=0, max=-1;
			for (var idx=0; idx < this.components.length; ++idx){
				var c= this.components[idx],
					t= c.getPosition()[0] + c.getWidth();
				if (t > max)
					max = t;
			}
			sleft= max - applicationManagerInstance.getLayoutManager().getCanvasWidth();
			if (sleft>0)
				this.current.body.scrollTo("left", sleft);
		}
		// TODO FillLayout ...
		this.doLayout();
	}, 
	
	/**
	 * Removes the given component from this layout element.
	 * @param {String} id the component ID
	 */
	removeComponent: function(id){
		if (this.componentMappings[id] != undefined && this.componentMappings[id] != null) {
			this.componentIDs.remove(id);
			this.components.remove(this.componentMappings[id]);
			delete this.componentMappings[id];
			delete this.componentDimensions[id];
			this.setComponentSize();
			return true;
		} else {
			// delegte to children
			for (var i = this.children.length - 1; i >= 0; i--) {
				if (this.children[i].removeComponent(id) == true) 
					break;
			}
			return false;
		}
	},
	
	/**
	 * Returns the x-position where a component could be placed
	 */
	getIdlePosition: function(){
		//TODO find better declaration
		if(this.type == 'AbsoluteLayout'){
			var maxX = -1;
			var width = null;
			try {
				// iterate through all components to get biggest x-position
				for ( var idx = 0; idx < this.components.length; ++idx) {
					var currentComponent = this.components[idx];
					var pos = currentComponent.getPosition();
					// store biggest x-position and component width
					if(pos[0] > maxX){
						maxX = pos[0];
						width = currentComponent.getWidth();
					}
				}
			}catch(e){}
			return (maxX + width + 2.0);
		}
		return 0;
	},
	

	/**
	 * Set the current layout of this Layout to the specified one.
	 * 
	 * @function
	 * @public
	 * @param {String} name unique name of the layout type to be used 
	 * @param {Object} config the layout-specific configuration
	 */
    setLayout: function(name, config) {
        this.log.debug('[LayoutMan] Resetting layout for cId \'' + this.id + '\'.', name, config);
		if (this.current_config == config) {
            this.log.debug('[LayoutMan] Layout(' + this.id + ') already set.');
			return;
		}
        var found = null;

		/* reset the size of all components */
		Ext.each(this.components, function(a){
			a.setSize(a.initialConfig.width, a.initialConfig.height);
			//a.getEl().setSize(a.getSize());
            a.setPosition(0, 0);
		});
		
		var useconfig= config[name];
		if ("FillLayout"===name) {
			//useconfig= config.FillLayout;
            this.size = useconfig.size;
			if (useconfig.fillStyle == "Vertical") {
				found = new Ext.Panel({
					showHeader: false,
					border: false,
					width: this.size.width,
					height: this.size.height,
					layout: 'vbox',
					layoutConfig: {
                        align: 'stretch',
                        pack: 'start'
					},
					autoScroll: true,
					items: this.components
				});
			}
			if (useconfig.fillStyle == "Horizontal") {
				found = new Ext.Panel({
					showHeader: false,
					border: false,
					width: this.size.width,
					height: this.size.height,
					layout: 'hbox',
					layoutConfig: {
						align: 'stretch',
						pack: 'start',
						flex: 3
					},
					autoScroll: true,
					items: this.components
				});
			}
		}

        if ("AbsoluteLayout" === name) {
            this.size = useconfig.size;
			
            if (useconfig.positions && Ext.isArray(useconfig.positions)) {
                for (var i = 0; i < useconfig.positions.length; ++i) {
                    var pos = useconfig.positions[i];
                    var id = pos.locate || pos.layout[Ext.cruise.client.LayoutUtil.extractType(pos.layout)].id;
                    if (this.componentMappings[id] != null && this.componentMappings[id] != undefined) {
                        var comp = this.componentMappings[id];
						comp.setPosition(pos.x, pos.y);
                        if (pos.size != undefined && pos.size != null) {
                            if (typeof pos.size.width == 'number' && typeof pos.size.height == 'number') {
								comp.setSize(pos.size.width, pos.size.height);
							}
						}
					}
				}
			}

			found = new Ext.Panel({
				layout: 'absolute',
				showHeader: false,
				border: false,
				autoScroll: true,
				width: this.size.width,
				height: this.size.height,
                x: 0,
                y: 0,
				items: this.components
           	});
		}
        if (!found || found == null) return;

		found.show();
		this.current = found;
		this.type = name;
		this.current_config = config;
		this.set = true;
	},
	
	addEmptyPanel: function(){
		var p = new Ext.Panel({
			layout: 'absolute',
			showHeader: false,
			border: false,
			autoScroll: true,
			width: 0,
			height: 0,
			x:0,
			y:0
       	});
       	this.current = p;
	},
	
	/**
	 * Recalulates the layout.
	 */
	doLayout: function() {
		try {
            if (this.set != true || this.current == undefined || this.current == null) return;
			this.current.doLayout();
        } catch(e) {
			this.log.error(e);
		}
	}
});

/**
 * Encapsulates some helper functions for processing the JSON representation of the layout-hierarchy
 * @private
 */
Ext.cruise.client.LayoutUtil = {
	/**
	 * Determines the type of the given Layout
	 * @param {Object} layout
	 * @return {String} the type, eg 'AbsoluteLayout'
	 */
    extractType: function(layout) {
		if (typeof layout['AbsoluteLayout'] == "object") {
			return 'AbsoluteLayout';
		}
		if (typeof layout['FillLayout'] == "object") {
			return 'FillLayout';
		}
	},
	
	/**
	 * Extract all LayoutElements in this Layout
	 * @param {Object} layout
	 * @return {Array} array of LayoutElements
	 */
    extractLayoutElements: function(layout) {
		if (typeof layout['AbsoluteLayout'] == "object") {
			var ret = new Array();
			return ret.concat(layout['AbsoluteLayout'].positions);
		}
		if (typeof layout['FillLayout'] == "object") {
			var ret = new Array();
			return ret.concat(layout['FillLayout'].fillElements);
		}
	},
	
	/**
	 * Extracts multiple information of the specified Layout 
	 * @param {Object} layout
	 * @return {Object} {
	 * 		components: Array of Strings (component IDs in this Layout),
	 * 		childLayouts: Array of Layouts (children of this Layout),
	 * 		type: String (type of this Layout),
	 * 		id: String (ID of this Layout)
	 * }
	 */
    extractChildLayouts: function(layout) {
        function filter(array) {
			if (Ext.isArray(array)) {
				var res = {
					childLayouts: new Array(),
					components: new Array()
				}
				for (var idx = 0; idx < array.length; ++idx) {
					var curr = array[idx];
					if (curr.locate === undefined && curr.layout !== undefined) {
						res.childLayouts.push(curr.layout);
					}
					if (curr.locate !== undefined && curr.layout === undefined) {
						res.components.push(curr.locate);
					}
				};
				return res;
			}
		};
		
		if (typeof layout['AbsoluteLayout'] == "object") {
			var ret = filter(layout['AbsoluteLayout'].positions);
			if (ret !== undefined && ret !== null) {
				ret.id = layout['AbsoluteLayout'].id;
				ret.type = 'AbsoluteLayout';
			}
			return ret;
		}
		if (typeof layout['FillLayout'] == "object") {
			var ret = filter(layout['FillLayout'].fillElements);
			if (ret !== undefined && ret !== null) {
				ret.id = layout['FillLayout'].id;
				ret.type = 'FillLayout';
			}
			return ret;
		}
	},
	
	/**
	 * Determines if the specified layout's Id matches the given one. 
	 * @param {Object} layout
	 * @param {Object} id
	 */
    matches: function(layout, id) {
        if (layout == null || layout == undefined) return false;
        return layout[Ext.cruise.client.LayoutUtil.extractType(layout)].id == id;
	},
	
	/**
	 * 
	 * @param {Object} layoutelem the LayoutElement where to start the search
	 * @param {Object} rootId the Id of the LayoutElement
	 */
    searchLayoutElement: function(layoutelem, rootId) {
        if (layoutelem == null || layoutelem == undefined || layoutelem.layout == null || layoutelem.layout == undefined)
			return undefined;
        if (layoutelem.layout["AbsoluteLayout"] != undefined) {
            if (layoutelem.layout["AbsoluteLayout"]["id"] == rootId) return layoutelem;
            for (var idx = 0; idx < layoutelem.layout["AbsoluteLayout"]["positions"].length; ++idx) {
                var cur = layoutelem.layout["AbsoluteLayout"]["positions"][idx];
				
                var res = Ext.cruise.client.LayoutUtil.searchLayoutElement(cur, rootId);
                if (res != undefined) return res;
			}
		}
        if (layoutelem.layout["FillLayout"] != undefined) {
            if (layoutelem.layout["FillLayout"]["id"] == rootId) return layoutelem;
            for (var idx = 0; idx < layoutelem.layout["FillLayout"]["fillElements"].length; ++idx) {
                var cur = layoutelem.layout["FillLayout"]["fillElements"][idx];
				
                var res = Ext.cruise.client.LayoutUtil.searchLayoutElement(cur, rootId);
                if (res != undefined) return res;
			}
		}
	}
};