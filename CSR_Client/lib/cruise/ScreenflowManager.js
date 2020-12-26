/**
 * @class Ext.cruise.client.ScreenflowManager The ScreenflowManager organizes the screenflow of components
 * with respect to a specified hierarchy of layouts.
 */
Ext.namespace("Ext.cruise.client");
Ext.cruise.client.ScreenflowManager = Ext.extend(Object, {
    cManager: null,
    layoutManager: null,
    layoutRootId: null,
    components: null,
    usedComponents: null,
    scmodel: null,
    currentView: null,
    transitions: null,
    conditions: null,
    root: null,
    set: false,
    log: null,

    /**
	 * Constructor of the Screenflow Manager
	 * @param {Object} logger an instance of the logger
	 * @param {Object} cMan an instance of the componentManager
	 * @param {Object} ccm an instance of the ccm	 
	 * @constructor
	 */
    constructor: function(logger, cMan, ccmFile, layoutMan) {
        this.log = logger;
        this.cManager = cMan;
        this.layoutManager = layoutMan;
        Ext.cruise.client.ScreenflowManager.superclass.constructor.call(this);
        this.log.debug('[SFMan] ScreenflowManager started.');
		
		if(ccmFile != null)
			/* extract the current screenflow model */
			this.scmodel = ccmFile.getElementsByTagName("screenflowModel")[0];

        this.usedComponents = [];
		
        if (this.scmodel == null || this.scmodel == undefined) {
            this.log.fatal("[AppMan] No screen flow defined!");
        } else {
            /* extract all transitions from the scm */
            this.transitions = this.scmodel.getElementsByTagName("transition");
            /* extract all conditions of all transitions    */
            this.conditions = this.scmodel.getElementsByTagName("conditions");
        }
    },

    setupInitialView: function() {
        var currLayout = null;
		/* extract the current screenflow model */
		var ccm = applicationManagerInstance.getCompositionModel();
		this.scmodel = ccm.getElementsByTagName("screenflowModel")[0];
		
        /* get the initial view.. */
        var initView = this.scmodel.getAttribute("initialView");
		var initLayout;
		/* extract all views from the scm */
		var views = this.scmodel.getElementsByTagName("view");
		
		for (var i = views.length - 1; i >= 0; --i) {
			var view = views[i];
			if (view.getAttribute("name") == initView) {
				initLayout = view.getAttribute("layout");
				this.currentView = view;
				break;
			}
		};

		/* extract all layouts */
		var layouts = ccm.getElementsByTagName("layout");
		
        /* .. and its declared layout */
        for (var idx = layouts.length - 1; idx >= 0; --idx) {
            var layout = layouts[idx];
            if (layout.getAttribute("name") == initLayout) {
                currLayout = layout;
                break;
            }
            if (idx == 0) log.error("[SFMan] Could not find initial layout.");
        };

        /* parse the layout to the required data structure of the layout manager */
        var type = currLayout.getAttribute("xsi:type");
		var prfx = Ext.cruise.client.Constants._CCM_NS_IE;
        var config = null;
        switch (type) {
        case prfx + "AbsoluteLayout":
            config = this._parseAbsoluteLayout(currLayout);
            break;
        case prfx + "FillLayout":
            config = this._parseFillLayout(currLayout);
            break;
        }

        if (config != null) {
            /* finally, set the components */
            var placeholder = currLayout.getElementsByTagName("position");
            var contains = false;
            var tmpComps = this.cManager.getAllUIComponents();

            for (var j = 0; j < tmpComps.length; j++) {
                contains = false;
                for (var i = placeholder.length - 1; i >= 0; i--) {
                    if (placeholder[i].getAttribute("locate") === tmpComps[j].cid) {
                        contains = true;
                        break;
                    }
                };
				//show the components of the layout, hide all other
                if (contains == true) {
                    this.cManager.showComponent(tmpComps[j].cid);
                    this.usedComponents[i] = tmpComps[j].cid;
				}
                else this.cManager.hideComponent(tmpComps[j].cid);
            };


        };

        this.layoutManager.setLayoutHierarchy(null, config);
		// add recommendation menu if recommendations are enabled
		if(applicationManagerInstance.getIsRecommendationEnabled()){
			var recman = applicationManagerInstance.getRecommendationManager();
			setTimeout(function(){
				recman.createRecommendationMenu();
				}, 1000);
		}
    },

    changeView: function(event) {
		// check whether transitions were defined or not
		if(this.transitions != null && this.transitions != undefined)
			for (var i = this.transitions.length - 1; i >= 0; --i) {
				if (this.transitions[i].getAttribute("name") == event) {
					this.nextView(event);
					break;
				}
			};
    },

    nextView: function (newView) {
		var ccm = applicationManagerInstance.getCompositionModel();
    	//store current components to hide
        var toHide = this.usedComponents;
        this.usedComponents = [];
        /* extract the next view.. */
        var nextV = this.currentView.getElementsByTagName("transition");
        var nView;
        for (var i = nextV.length - 1; i >= 0; --i) {
            if (nextV[i].getAttribute("name") === newView) {
                nView = nextV[i].getAttribute("toView");
                break;
            }
        };

        var allViews = this.scmodel.getElementsByTagName("view");
        var nextLayout;
        for (var a = allViews.length - 1; a >= 0; --a) {
            var view = allViews[a];
            if (view.getAttribute("name") === nView) {
                this.currentView = view;
                nextLayout = view.getAttribute("layout");
                break;
            }
        };
        /* .. and its declared layout */
        var layouts = ccm.getElementsByTagName("layout");
        var currLayout=null;
        for (var idx = layouts.length - 1; idx >= 0; --idx) {
            var layout = layouts[idx];
            if (layout.getAttribute("name") == nextLayout) {
                currLayout = layout;
                break;
            }
        };

        /* parse the layout to the required data structure of the layout manager */
        var type = currLayout.getAttribute("xsi:type");
		var prfx = Ext.cruise.client.Constants._CCM_NS_IE;
        var config = null;
        switch (type) {
        case prfx + "AbsoluteLayout":
            config = this._parseAbsoluteLayout(currLayout);
            break;
        case prfx + "FillLayout":
            config = this._parseFillLayout(currLayout);
            break;
        }

        //var tmpComps = this.cManager.getAllUIComponents();
        for (var x = 0; x < toHide.length; x++) {
            this.cManager.hideComponent(toHide[x]);
		}

        if (config != null) {
            /* finally, set the components */
            var placeholder = currLayout.getElementsByTagName("position");
            var contains = false;
			var tmpComps = this.cManager.getAllUIComponents();
            for (var j = 0; j < tmpComps.length; j++) {
                contains = false;
                for (var i = placeholder.length - 1; i >= 0; i--) {
                    if (placeholder[i].getAttribute("locate") === tmpComps[j].cid) {
                        contains = true;
                        break;
                    }
                };

                if (contains == true) {
                    this.cManager.showComponent(tmpComps[j].cid);
                    this.usedComponents[i] = tmpComps[j].cid;
				}
            };
			
        };

        this.layoutManager.setLayoutHierarchy(null, config);
    
	},

	_parseAbsoluteLayout: function(layout) {
    var inner = {};
    var utility = Ext.cruise.client.Utility;
    var bounds = utility.getFirstElementChild(layout);
    inner.id = layout.getAttribute('name');
    inner.size = {
        'width': parseInt(bounds.getAttribute('width')),
        'height': parseInt(bounds.getAttribute('height'))
    };
    var positions = [];
    var allPositions = layout.getElementsByTagName("position");
    for (var pos = allPositions.length - 1; pos >= 0; --pos) {
        //	while (position != null){
        var position = allPositions[pos];
        try {
            positions.push({
                'locate': position.getAttribute('locate'),
                'x': parseInt(position.getAttribute('x')) || 0,
                'y': parseInt(position.getAttribute('y')) || 0
            });
            //position = utility.nextElementSibling(position);
        } catch(error) {
            this.log.fatal("[SFMan] Could not parse AbsoluteLayout from CCM. " + error);
        }
    };
    inner.positions = positions;
    return {
        'AbsoluteLayout': inner
    };
},

_parseFillLayout: function(layout) {
    var inner = {};
    return {
        'FillLayout': inner
    };
},
getTransitions: function(){
 return this.transitions;
},
setTransitions: function(views){
 this.transitions = transitions;
},
getConditions: function(){
 return this.conditions;
},
setConditions: function(views){
 this.conditions = conditions;
},
});