/**
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
requirejs.config({
    //By default load any module IDs from ...
    baseUrl: './static',
    waitSeconds: 60,
    packages: [
        { name: 'urth-common', location: 'dashboard-common' }
    ],
    paths: {
        jquery: 'bower_components/jquery/dist/jquery.min',
        lodash: 'bower_components/lodash/dist/lodash.min',
        Gridstack: 'bower_components/gridstack/dist/gridstack.min',
        Thebe: 'thebe/main-built'
        // jquery-ui is included in Thebe
    },
    map: {
        '*': {
            'jQuery': 'jquery'
        },
        // jquery-ui is included in Thebe's main-built.js. Map Gridstack to load from there.
        Gridstack: {
            'jquery-ui/core': 'Thebe',
            'jquery-ui/mouse': 'Thebe',
            'jquery-ui/widget': 'Thebe',
            'jquery-ui/resizable': 'Thebe',
            'jquery-ui/draggable': 'Thebe'
        }
    },
    shim: {
        Thebe: {
            deps: ['jquery']
        }
    }
});

requirejs(['urth/dashboard'], function(Dashboard) {
    Dashboard.init().then(function() {
        var IPython = window.IPython;
        var widgetManager = IPython.notebook.kernel.widget_manager;
        
        // Ugly, because we're special-casing declarative widget support, but
        // they need to be pre-loaded onto the page before we begin executing
        // any notebook code that depends on them.
        define('jupyter-js-widgets', function() {
            // All hail the monkey patch: override new_widget so that the 
            // registry is used to fetch DeclWidgetModel instead of 
            // almond-flavored requirejs from Thebe which we can't configure
            var old_new_widget = IPython.notebook.kernel.widget_manager.new_widget;
            widgetManager.new_widget = function(options) {
                if(options.model_module && options.model_module.indexOf('jupyter-decl-widgets') === 0) {
                    options.model_module = null;
                }
                // Invoke the original
                return old_new_widget.apply(IPython.notebook.kernel.widget_manager, arguments);
            };

            // WidgetModel is needed by declarative widgets and is one of the 
            // registered model types, so return this list
            return IPython.notebook.kernel.widget_manager.constructor._model_types;
        });

        // Now try to load the widgets
        requirejs(['urth_widgets/js/init/init',
                   'urth_widgets/js/widgets/DeclWidgetModel'], function(widgetInit, modDeclWidgetModel) {
            // Directly inject the declarative widget model since we can't 
            // configure the requirejs search path built into thebe
            widgetManager.constructor.register_widget_model('DeclWidgetModel', modDeclWidgetModel.DeclWidgetModel);
            // Initialize the declarative widgets
            widgetInit({
                namespace: IPython,
                events: IPython.notebook.events
            }).then(function() {
                // Now that all dependencies are ready, execute everything
                Dashboard.executeAll();
            });
        }, function(err) {
            console.warn('declarativewidgets not available');
            // Continue with execution of cells
            Dashboard.executeAll();
        });
    });
});
