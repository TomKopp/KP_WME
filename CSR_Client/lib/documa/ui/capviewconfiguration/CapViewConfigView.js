Ext.namespace('Documa.ui.capviewconfiguration');

Documa.require('Documa.util.Logger');
Documa.require('Documa.ui.capviewconfiguration.ConfigCVManager');

/**
 * @class Documa.ui.capviewconfiguration.CapViewConfigView
 * This class is responsible for creating the rudimentary configuration
 *
 * @author Anne Schumacher, Franziska Richter, Sergej Hahn
 */
Documa.ui.capviewconfiguration.CapViewConfigView = Ext.extend(Object, (function () {
    /* private members */
    var TAG = 'Documa.ui.capviewconfiguration.CapViewConfigView';
    var _log = Documa.util.Logger;
    var _this = null;

    var _visible = false;
    var _configDialogPanel = null;
    var _configManager = null;

    var device_array = [];
    var is_device_selection_active_flag = false;

    var selected_layout_id = null;

    var _selectDevice =
        '<div class="panel panel-primary device-selection">'+
			'<div class="panel-heading csr-mui-pheader">Select Devices</div>'+
				'<div class="checkbox">'+
					'<div class="device-list">'+
					'</div>'+
				'</div>'+
			'</div>' +
        '</div>';

    var _selectLayout =
        '<div style="display:none;" class="layout-selection panel panel-primary">'+
			'<div class="panel-heading csr-mui-pheader">Select Layout</div>'+
				'<div class="layout-list">'+
				'</div>'+
			'</div>'+
        '</div>';

    var _html = _selectDevice + _selectLayout;

    var CONFIGS = {
        ONE_DEVICE: '1r1c',
        TWO_DEVICES_1: '1r2c',
        TWO_DEVICES_2: '2r1c',
        THREE_DEVICES_3: '1r3c',
        THREE_DEVICES_4: '3r1c',
        FOUR_DEVICES_5: '2r2c',
        FOUR_DEVICES_6: '1r4c',
        FIVE_DEVICES_7: '2r3c',
        SIX_DEVICES_8: '2r3c'
    };

    /**
     * Handles click events for device containers
     */
    function handleDeviceClick() {
        var did = $(this).attr('did');
        if (device_array.indexOf(did) > -1) {
            $(this).attr('class', 'device');
            device_array.splice(device_array.indexOf(did), 1);
        } else {
            device_array.push(did);
            $(this).attr('class', 'device device-active');
        }
    }

    /**
     * Handles click events for layout containers
     */
    function handleLayoutClick() {
        var lid = $(this).attr('lid');

        if (selected_layout_id === null || lid != selected_layout_id) {
            // other item selected, remove old selection
            if (selected_layout_id !== null) {
                $('.layout-list [lid="' + selected_layout_id + '"]').attr('class', 'layout');
            }
            selected_layout_id = lid;
            $(this).attr('class', 'layout layout-active');
        } else {
            $(this).attr('class', 'layout');
            selected_layout_id = null;
        }
    }

    /**
     * Returns a layout array for a given number of devices
     * @param {int} number
     */
    function getLayout(number) {
        // return a layout object
        var layout = function(id, icon) {
            return {
                id: id,
                icon: icon
            };
        };

        var layouts = [];
        var res_path = 'res/img/devision/';

        var l1 = layout(CONFIGS.ONE_DEVICE, res_path + CONFIGS.ONE_DEVICE + '.png');
        var l2 = layout(CONFIGS.TWO_DEVICES_1, res_path + CONFIGS.TWO_DEVICES_1 +  '.png');
        var l3 = layout(CONFIGS.TWO_DEVICES_2, res_path + CONFIGS.TWO_DEVICES_2 + '.png');
        var l4 = layout(CONFIGS.THREE_DEVICES_3, res_path + CONFIGS.THREE_DEVICES_3 + '.png');
        var l5 = layout(CONFIGS.THREE_DEVICES_4, res_path + CONFIGS.THREE_DEVICES_4 +  '.png');
        var l6 = layout(CONFIGS.FOUR_DEVICES_5, res_path + CONFIGS.FOUR_DEVICES_5 + '.png');
        var l7 = layout(CONFIGS.FOUR_DEVICES_6, res_path + CONFIGS.FOUR_DEVICES_6 + '.png');
        var l8 = layout(CONFIGS.FIVE_DEVICES_7, res_path + CONFIGS.FIVE_DEVICES_7 + '.png');
        var l9 = layout(CONFIGS.SIX_DEVICES_8, res_path + CONFIGS.SIX_DEVICES_8 + '.png');

        //selecting proper arrays
        //available for selection layouts for a given number of devices
        switch (number) {
            case 2:
                layouts.push(l2, l3);
                break;
            case 3:
                layouts.push(l4, l5);
                break;
            case 4:
                layouts.push(l6, l7);
                break;
            case 5:
                layouts.push(l8);
                break;
            case 6:
                layouts.push(l9);
                break;
            default:
                layouts.push(l1);
        }
        return layouts;
    }

    /**
     * Adds html layout elements
     */
    function fillLayoutList() {
        $('#cvconfig-window .layout-list').html('');
        // creating the layout list
        var layouts = getLayout(device_array.length);
        var layout = null;
        var item = null;

        for (i = 0; i < layouts.length; i++) {
            layout = layouts[i];
            item = $(
                '<div class="layout" lid="' + layout.id + '">' +
					'<img class="layout-icon" src="' + layout.icon + '">' +
                '</div>'
            ).bind('click', handleLayoutClick);
            $('#cvconfig-window .layout-list').append(item);
        }

        if (selected_layout_id !== null) {
            $('.layout-list [lid="' + selected_layout_id + '"]').attr('class', 'layout layout-active');
        }
    }


    /**
     * Create Configuration for given selected Layout ID
     */
    function createConfiguration() {
        switch (selected_layout_id) {
            case CONFIGS.ONE_DEVICE:
                _configManager.setConfig('test-1d', 'test-1d', 'bob', 'dev', 1, 1, device_array.slice(0));
                break;
            case CONFIGS.TWO_DEVICES_1:
                _configManager.setConfig('test-2d1', 'test-2d', 'bob', 'dev', 2, 1, device_array.slice(0));
                break;
            case CONFIGS.TWO_DEVICES_2:
                _configManager.setConfig('test-2d2', 'test-2d2', 'bob', 'dev', 1, 2, device_array.slice(0));
                break;
            case CONFIGS.THREE_DEVICES_3:
                _configManager.setConfig('test-3d1', 'test-3d1', 'bob', 'dev', 3, 1, device_array.slice(0));
                break;
            case CONFIGS.THREE_DEVICES_4:
                _configManager.setConfig('test-3d2', 'test-3d2', 'bob', 'dev', 1, 3, device_array.slice(0));
                break;
            case CONFIGS.FOUR_DEVICES_5:
                _configManager.setConfig('test-4d1', 'test-4d1', 'bob', 'dev', 2, 2, device_array.slice(0));
                break;
            case CONFIGS.FOUR_DEVICES_6:
                _configManager.setConfig('test-4d2', 'test-4d2', 'bob', 'dev', 4, 1, device_array.slice(0));
                break;
            case CONFIGS.FIVE_DEVICES_7:
                _configManager.setConfig('test-5d', 'test-5d', 'bob', 'dev', 3, 2, device_array.slice(0));
                break;
            case CONFIGS.SIX_DEVICES_8:
                _configManager.setConfig('test-6d', 'test-6d', 'bob', 'dev', 3, 2, device_array.slice(0));
                break;
        }
    }

    return {
        constructor: function (controller) {
            _this = this;
            _configDialogPanelController = controller;

            // create config window
            _configDialogPanel = new Ext.Window({
                id: 'cvconfig-window',
                title: '<h4 class="modal-title titleMargin">Configuration</h4>',
                xtype: window,
                modal:true,
                frame: true,
                baseCls: 'cvconfig',
                html: _html,
                hidden: true,
                closable: false,
                resizable: false,
                draggable: false,
                shadow: false,
                width: '80%',
                tools: [{
                    id: 'CVconfig-close-button',
                    type: 'refresh',
                    tooltip: 'Refresh form Data',
                    handler: function () {
                        _this.close();
                    }
                }],
                buttons     : [
                    {
                        html    : '<button id="modalbtn" type="button" class="btn btn-default" >Back</button>',
                        //text    : 'Back',
                        type    : 'button',
                        hidden: true,
                        //cls: 'btn btn-default',
                        handler : function() {
                            if (is_device_selection_active_flag) {
                                // do nothing
                            } else {
                                is_device_selection_active_flag = true;
                                $('#cvconfig-window .layout-selection').hide();
                                $('#cvconfig-window .device-selection').show();

                                _configDialogPanel.buttons[0].setVisible(false);
                                _configDialogPanel.buttons[1].setVisible(true);
                                _configDialogPanel.buttons[2].setVisible(false);

                                selected_layout_id = null;
                            }
                        }
                    },
                    {
                        html: '<button id="modalbtn" type="button" class="btn btn-default" >Next</button>',
                        //text    : 'Next',
                        type    : 'button',
                        //cls: 'btn btn-default',
                        handler : function() {
                            if (device_array.length === 0)
                                return;
                            if (is_device_selection_active_flag) {
                                fillLayoutList();
                                is_device_selection_active_flag = false;
                                $('#cvconfig-window .layout-selection').show();
                                $('#cvconfig-window .device-selection').hide();

                                _configDialogPanel.buttons[0].setVisible(true);
                                _configDialogPanel.buttons[1].setVisible(false);
                                _configDialogPanel.buttons[2].setVisible(true);
                            } else {
                                if (device_array.length === 0 || selected_layout_id === null)
                                    return;

                                createConfiguration();
                                _this.close();
                            }
                        }
                    },
                    {
                        html: '<button id="modalbtn" type="button" class="btn btn-default" >Save</button>',
                        //text    : 'Next',
                        type    : 'button',
                        hidden: true,
                        //cls: 'btn btn-default',
                        handler : function() {
                            if (device_array.length === 0)
                                return;
                            if (is_device_selection_active_flag === false) {
                                if (device_array.length === 0 || selected_layout_id === null)
                                    return;

                                createConfiguration();
                                _this.close();
                            }else{

                            }
                        }
                    },
                    {
                        html: '<button id="modalbtn" type="button" class="btn btn-default">Close</button>',
                        //text    : 'Close',
                        type    : 'button',
                        //cls: 'btn btn-default',
                        handler : function() {
                            _this.close();
                        }
                    }
                ],

                listeners: {
                    show: {
                        fn: function() {
                            _configDialogPanel.getEl().fadeIn({
                                endOpacity: 1,
                                easing: 'easeOut',
                                duration: 0.9
                            });
                        },
                    },
                }
            });
        },

        /**
         * show configPanel
         */
        show: function () {
            if (_configManager === null) {
                _configManager = Documa.RuntimeManager.getUIManager().getConfigManager();
            }

           if (_visible === false) {
                _configDialogPanel.show();
                _configDialogPanel.center();
                _configDialogPanel.setPosition(_configDialogPanel.getEl().getLeft(), 50);
                _visible = true;
            }

            is_device_selection_active_flag = true;
            $('#cvconfig-window .layout-selection').hide();
            $('#cvconfig-window .device-selection').show();

            // get active device list and add it to the pannel
            var appcontext = Documa.RuntimeManager.getApplicationContext();
            var distributionSet = appcontext.getDistributionManager().getDistributions();
            var environmentContext = Documa.RuntimeManager.getEnvironmentContext();

            var id = null;
            var device = null;
            var item = null;

            // creating the device list
            for (var i = 0; i < distributionSet.length; i++) {
                id = distributionSet[i].getSessionId();
                device = environmentContext.getDevice(id);
                item = $(
                    '<div class="device" did="' + id + '">' +
						'<div class="device-header">' +
							'<img class="device-icon" src="' + device.getDevicePicture() + '">' +
							'<span class="device-name">' + device.getDeviceName() + '</span><br>' +
						'</div>' +
						'<div class="device-body">' +
							'<span class="label label-default">Vendor</span>&nbsp;' + device.getVendorName() + '<br>' +
							'<span class="label label-default">OS</span>&nbsp;' + device.getOSName() + '<br>' +
						'</div>' +
                    '</div>'
                ).bind('click', handleDeviceClick);
                $('#cvconfig-window .device-list').append(item);
            }
        },

        /**
         * close configPanel
         */
        close: function () {
            $('#cvconfig-window .device-list').html('');
            device_array.length = 0;

            _configDialogPanel.buttons[0].setVisible(false);
            _configDialogPanel.buttons[1].setVisible(true);
            _configDialogPanel.buttons[2].setVisible(false);

            _visible = false;
            is_device_selection_active_flag = false;
            selected_layout_id = null;
            _configDialogPanel.hide();
        },

        /**
         * check if configPanel is visible
         */
        isVisible: function () {
            return _visible;
        }
    };
})());
