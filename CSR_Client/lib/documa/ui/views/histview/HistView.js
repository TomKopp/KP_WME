Ext.namespace('Documa.ui.views.histview');

/**
 * @author Annett Kroell, Robert Starke, Sergej Hahn
 * @class Documa.ui.view.histview.HistView
 * @extends Documa.ui.views.histview.BaseView
 *
 * The HistView handles the presentation of the end user view of the composition.
 * It creates component overlays that show the properties and the capabilities of the component.
 * Capabilities of different components can be connected over their connection points.
 */

Documa.require('Documa.RuntimeManager');
Documa.require('Documa.components.ComponentManager');
Documa.require('Documa.util.Logger');
Documa.require('Documa.ui.views.BaseView');
Documa.require('Documa.ui.views.MetaView');


Documa.ui.views.histview.HistView = Ext.extend(Documa.ui.views.BaseView, (function() {

    ////////////////
    // Attributes //
    ////////////////


    // ExtJS - objects
    var _superClass = null;
    var _configManager = null;

    // new histview main frame
    var histview_main_frame = null;

    this.historyItems = [];

    var _distributionManager = null;
    var redrawInterval = null;

    var _jsPlumb = null;
    var _componentUtil = null;
    var _eventDispatcher = null;
    var _eventBroker = null;
    var _this = null;

    ///////////////////////
    // Private Functions //
    ///////////////////////
    /*mehrere start-devices? nein
     zeiten: startEvent, ende
     {pro komponente: -target devices (session id reicht)
     -Komponenten Name
     reason} aus StartEvent

     _distributionManager.getDevice(payload.sourceDevice);

     success*/

    function addHistoryItem(configuration, configurations, i) {
        for(var i=0; i<configurations.length; i++){
            if(configurations[i].migrationID == configuration.migrationID)
                return;
        }
        configuration.time = new Date(configuration.time);
        configuration.date = configuration.time.getDate() + "." + (configuration.time.getMonth() + 1) + "." + configuration.time.getFullYear();
        configuration.timeString = configuration.time.getHours() + ":" + (configuration.time.getMinutes() < 10 ? "0" + configuration.time.getMinutes() : configuration.time.getMinutes());
        configuration.sourceDevices = [];
        configuration.sourceDevices.push(configuration.source);
        for(var i = 0; i < configuration.sourceDevices.length; i++) {
            var device = configuration.sourceDevices[i];
            device.icon = Documa.RuntimeManager.getApplicationContext().getDistributionManager().getDevice(device.id).getDevicePicture();
        }
        for(var i = 0; i < configuration.targets.length; i++) {
            var device = configuration.targets[i];
            device.icon = Documa.RuntimeManager.getApplicationContext().getDistributionManager().getDevice(device.id).getDevicePicture();
        }

        for(var i = 0; i < configuration.components.length; i++) {
            var component = configuration.components[i];
            for(var s = 0; s < configuration.sourceDevices.length; s++) {
                var sourceDevice = configuration.sourceDevices[s];
                if(sourceDevice["components"] == null)
                    sourceDevice.components = [];
                if(sourceDevice.id == component.sourceDeviceID) {
                    sourceDevice.components.push(component);
                }
            }
            for(var t = 0; t < configuration.targets.length; t++) {
                var targetDevice = configuration.targets[t];
                if(targetDevice["components"] == null)
                    targetDevice.components = [];
                if(targetDevice.id == component.targetDeviceID) {
                    targetDevice.components.push(component);
                }
            }
        }
        configurations.push(configuration);
        return configurations;
    }


    /**
     * Update hist view.
     */
    function compileView() {

        _jsPlumb.empty("histview");

        //var con = _configManager.getCurrentConfig();
        histview_main_frame.update('<hist-view></hist-view>');


        // new stuff
        histview_main_frame.doLayout();

        $('hist-view').each(function() {
            var content = $(this);
            angular.element(document).injector().invoke(function($compile) {
                var scope = angular.element(content).scope();
                $compile(content)(scope);

            });
        });

        histview_main_frame.show();
        /*
         if(redrawInterval != null){
         window.clearTimeout(redrawInterval);
         redrawInterval = null;
         }*/


        renderHistory();
    }

    var renderHistoryTimeout = null;

    function renderHistory() {

        //console.log(this.historyItems);
        try {
            for(var i = 0; i < this.historyItems.length; i++) renderHistoryItem(i);
        } catch(e) {
            console.log("PHAIL " + e.message);
            window.setTimeout(renderHistory, 30);
        }
    }

    function renderHistoryItem(index) {
        _this = Documa.RuntimeManager.getUIManager().getHistView();
        if(document.getElementById("historyCanvas" + index) == null) {
            console.log("canvas doesn't exist");
            return;
        } else {
            var canvas = document.getElementById("historyCanvas" + index);
        }
        var ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        console.log("drawing canvas " + canvas.id);
        var histGraph = document.getElementById("hist_graph" + index);
        canvas.width = histGraph.offsetWidth;
        canvas.height = histGraph.offsetHeight;
        canvas.style.left = (histGraph.offsetLeft - histGraph.parentNode.offsetLeft + 5) + "px";
        canvas.style.top = (histGraph.offsetTop - histGraph.parentNode.offsetTop + 5) + "px";
        var startComponents = histGraph.getElementsByClassName("hist-devices")[0].getElementsByClassName("hist-component");
        var endComponents = histGraph.getElementsByClassName("hist-devices-end")[0].getElementsByClassName("hist-component");

        var failed = !Documa.RuntimeManager.getUIManager().getHistView().historyItems[index].success;

        for(var i = 0; i < startComponents.length; i++) {
            for(var k = 0; k < endComponents.length; k++) {

                if(startComponents[i].dataset.id == endComponents[k].dataset.id) {
                    if(startComponents[i].innerHTML == endComponents[k].innerHTML){
                        startComponents[i].used = true;
                        endComponents[k].used = true;
                    }

                    var start = {
                        x: startComponents[i].offsetLeft - histGraph.offsetLeft + startComponents[i].offsetWidth,
                        y: startComponents[i].offsetTop - histGraph.offsetTop + startComponents[i].offsetHeight / 2
                    };
                    var end = {
                        x: endComponents[k].offsetLeft - histGraph.offsetLeft - (failed ? 50 : 0),
                        y: endComponents[k].offsetTop - histGraph.offsetTop + endComponents[k].offsetHeight / 2
                    };
                    renderConnection(ctx, start, end, failed);
                    if(failed && (endComponents[k].dataset.id == _this.historyItems[index]["failedComponent"] || startComponents[i].dataset.id == _this.historyItems[index]["failedComponent"]))
                        renderFail(ctx, end);
                }
            }
        }
        for(var i = 0; i < startComponents.length; i++) {
            if(!startComponents[i].used) {
                startComponents[i].style.background = "#db8a8a";
            }
        }
        for(var i = 0; i < endComponents.length; i++) {
            if(!endComponents[i].used)
                endComponents[i].style.background = "#a4c0f4";
        }
        if(index > 0) {


            var lastItem = _this.historyItems[index - 1];
            var thisItem = _this.historyItems[index];
            var devices = [];
            /*for(var comp in lastItem.components){

             }*/
        }

    }

    function renderFail(ctx, end) {

        ctx.font = "30px Verdana";
        ctx.fillStyle = "#db4c4c";
        ctx.textAlign = "center";
        ctx.fillText("🗲", end.x, end.y + 10);
    }

    function renderConnection(ctx, start, end, failed) {
        var width = end.x - start.x;
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.moveTo(start.x, start.y);
        if(failed){
            var gradient = ctx.createLinearGradient(start.x,0,end.x,0);
            gradient.addColorStop(0.8,"gray");
            gradient.addColorStop(1,"transparent");
            ctx.strokeStyle = gradient;
        }
        else
            ctx.strokeStyle = "gray";
        ctx.bezierCurveTo(start.x + width / 2, start.y, start.x + width / 2, end.y, end.x, end.y);
        ctx.stroke();
    }

    function renderComponent(position, name) {
        var comp = document.createElement("div");
        comp.innerHTML = name;
        comp.classList.add("hist-component");
        comp.style.top = position.y + "px";
        comp.style.left = position.x + "px";
        document.getElementById("hist_graph" + index).appendChild(comp);
    }

    /**
     * Function to create store, template, dataView and panel for each component container.
     */
    function buildHistView() {

        _jsPlumb = jsPlumb.getInstance();

        /*
         updateConfig();
         */
        compileView();
    }


    ///////////////////////
    // Public Functions //
    ///////////////////////

    return {
        constructor: function(layoutManager, viewName) {

            /* Reference super class. */
            _superClass = Documa.ui.views.histview.HistView.superclass;
            _superClass.constructor.call(this, layoutManager, viewName);

            _eventDispatcher = Documa.RuntimeManager.getEventDispatcher();
            _eventBroker = Documa.RuntimeManager.getEventBroker();
            _this = this;

            //for(var i=0; i<5; i++)
            //    this.historyItems.push({uid:"Item "+i});

            histview_main_frame = new Ext.Container({
                id: 'csr-histview-main-container',
                layout: {
                    type: 'fit'
                },
                border: false,
                style: {
                    width: '100%',
                    height: '100%'
                },
            });
            _eventDispatcher.addEventListener(Documa.communication.events.ApplicationEvents.HISTINIT, this, this.onHistoryInitialized);
            _eventDispatcher.addEventListener(Documa.communication.events.ApplicationEvents.HISTUPDATE, this, this.onHistoryChanged);
        },

        setup: function(scope, elem, attr) {
            this._scope = scope;
        },

        onHistoryInitialized: function(event) {
            //console.log("History Changed:");
            //console.log(event);
            var payload = event.getPayload();

            try {
                if(payload.length>0){
                    this.historyItems = [];
                    for(var i=0; i<payload.length; i++){
                        addHistoryItem(payload[i], this.historyItems, this.historyItems.length);
                    }
                }

                this._scope.$apply();
                this._scope.getCauses();
                this.renderHistory();
            }
            catch(e) {
                //console.log(e);
            }

        },

        onHistoryChanged: function(event) {
            //console.log("History Changed:");
            //console.log(event);
            var payload = event.getPayload();
            var item = null;
            try {
                item = payload.edescr;
                addHistoryItem(item, this.historyItems, this.historyItems.length);
                window.setTimeout(this.renderHistory, 100);

                this._scope.$apply();
                this._scope.getCauses();
                this.renderHistory();
            }
            catch(e) {
                //console.log(e);
            }

        },

        historyItems: historyItems,

        renderHistory: function() {
            for(var i = 0; i < this.historyItems.length; i++)renderHistoryItem(i);
            return true;
        },

        /**
         * Calls the show - method of the superclass and draws the histView.
         * Calls the 'buildHistView' - function.
         * Ownership of the Scroll - function and calls for updating the channel drawing.
         */
        show: function() {
            if(_configManager === null) {
                _configManager = Documa.RuntimeManager.getUIManager().getConfigManager();
                _configManager.addOnChangeConfig(_this.compileView);
            }

            if(_componentUtil === null) {
                _componentUtil = Documa.RuntimeManager.getComponentManager().getComponentUtil();
            }

            _eventDispatcher.addEventListener("channelcreated", _this, _this.addRemoteChannel);
            buildHistView();
        },

        /**
         * Calls  the closeView - method of superclass for leaving the histView.
         */
        closeView: function() {
            //_superClass.closeView.call(this);
            _eventDispatcher.removeEventListener(_this.addRemoteChannel);
            _configManager.removeOnChangeConfig(_this.compileView);
            histview_main_frame.hide();
        },

        /**
         * Function to handle click event of the close button which deletes component
         *
         * @param String instanceId belonging to the Component containing the clicked close button
         */
        onCloseButtonClicked: function(instanceId, componentId) {

            var msg = 'Are you sure you want to delete the whole component?';
            var uiManager = Documa.RuntimeManager.getUIManager();

            uiManager.showConfirmationDialog.call(this, msg, function(choice) {
                if(choice == 'yes') {
                    //uiManager.getActiveView().removeComponent(instanceId);

                    // remove component and overlay
                    getComponentManager().removeComponent(instanceId, componentId, true);
                    var successfulOverlayRemove = _superClass.getMetaView().removeComponentOverlay(instanceId);

                    _superClass.updateView();

                    return successfulOverlayRemove;

                }
            });
        },

        // Aufgabe Backend: definiere Klassen/Interface, die abgeschlossene/abgebrochene Migrationen speichert

        /**
         * Function to handle click event of the minimize button
         *
         * @param String instanceId The instanceId of the component whose minimize button was clicked
         */
        onMinimizeButtonClicked: function(instanceId) {

            var icon = document.getElementById("icon_" + instanceId);
            var content = document.getElementById("histContent_" + instanceId);
            var header = document.getElementById("cHeader_" + instanceId);

            //Hides Icon and Shows histRows
            if(icon.style.display === 'block') {
                icon.style.visibility = 'hidden';
                icon.style.display = 'none';
                content.style.visibility = 'visible';

                //resets height and left
                header.style.height = '26px';

                var id = jQuery(content).attr('id');
                jQuery('#' + id + ' .histRow').removeClass('rowHidden');
            }
            //Shows Icon and Hides Cap Rows
            else if(icon.style.display !== 'block') {
                icon.style.visibility = 'visible';
                icon.style.display = 'block';
                content.style.visibility = 'hidden';

                header.style.height = '150px';

                // sets height to 0 and centers all connection points
                // so that lines leave and going into the icon
                var id = jQuery(content).attr('id');
                var width = jQuery(content).width();
                jQuery('#' + id + ' .histRow').addClass('rowHidden');
            }
            // redraw lines
            _jsPlumb.repaintEverything();
            //_superClass.updateChannels();
        },

        /**
         * Get the main histview extjs panel
         */
        getHistViewPanel: function() {
            return histview_main_frame;
        },

        getHistoryItems: function(scope) {
            return this.historyItems;
        },

        getHistoryItem: function(index) {
            return this.historyItems[index];
        },

        /**
         * Function to remove a component from the view.
         *
         * @param {String} instanceId - Instance-ID of the current Component.
         */
        removeComponent: function(instanceId) {
            _superClass.removeComponent.call(this, instanceId);
        },


        compileView: function() {
            compileView();
        }/*,

         /!**
         * Wrapper for the update config function
         *!/
         updateConfig: function () {
         updateConfig();
         }*/
    };

})());


Documa.CSRM.directive('histviewRow', function() {
    return {
        restrict: 'E',
        templateUrl: 'lib/documa/ui/templates/histview_row.html'
    };
});


/**
 * Definition of the histview directive.
 */
Documa.CSRM.directive('histView', function($compile) {

    var controller = ['$scope', function($scope) {
        $scope.propertyName = "time";
        $scope.reverse = false;
        $scope.cntr = Documa.RuntimeManager.getUIManager().getHistView();
        $scope.historyItems = this.historyItems;
        // $scope.$watch($scope.causes, $scope.cntr.show);
        $scope.sortBy = function(propertyName) {
            $scope.reverse = ($scope.propertyName === propertyName) ? !$scope.reverse : false;
            $scope.propertyName = propertyName;
            // $scope.cntr.renderHistory();
        };
        $scope.causes = [];
        $scope.getCauses = function() {
            var hist = $scope.cntr.getHistoryItems();
            for(var i = 0; i < hist.length; i++) {
                var item = hist[i];
                var exists = false;
                for(var k = 0; k < $scope.causes.length; k++) {
                    if($scope.causes[k].name == item.cause)
                        exists = true;

                }
                if(!exists)
                    $scope.causes.push({"name": item.cause, "query": "cause " + item.cause.replace(" ", "_")});
            }
            // $scope.cntr.renderHistory();
            return $scope.causes;

        }
        $scope.filterInit = function(criteria) {
            if($scope.filterCriteria != criteria)
                $scope.filterCriteria = criteria;
            else
                $scope.filterCriteria = null;
        };

        $scope.filterBy = function(criteria) {
            if(criteria == null)
                return function() {
                    return true;
                };
            return function(historyItem) {
                // $scope.cntr.renderHistory();
                try {
                    var split = criteria.split(" ");
                    var object = historyItem;
                    for(var i = 0; i < split.length - 1; i++)
                        object = historyItem[split[0]];

                    return object == split[split.length - 1].replace(new RegExp("_", 'g'), " ");
                }
                catch(e) {
                    console.log(e.message);
                    return true;
                }
            }
        }
    }];


    return {
        restrict: 'E',
        templateUrl: 'lib/documa/ui/templates/histview_main.html',
        controller: controller,
        scope: {
            controller: '=',
            rows: '='
        },
        link: function(scope, elem, attr) {
            Documa.RuntimeManager.getUIManager().getHistView().setup(scope, elem, attr);
        }
    };
});
