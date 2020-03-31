/*jslint es5:true, browser:true, devel:true, white:true, vars:true */
/*jshint laxbreak:true */
/*global $:false, intel:false, cordova:false, device:false */
/*global window,module,define,root,global,self,var,this */
(function () {
    var logic1 = {};

    var root = typeof self === 'object' && self.self === self && self ||
        typeof global === 'object' && global.global === global && global ||
        this;

    logic1.getxml = function (container) {
        // Button ereignisse laden und auswerten
        // findet im Server statt mit api
        $(container).empty();
        $(container)
            .append($("<div/>")
                .append($("<button/>", {
                    html: "1. xml-Datei kontrollieren",
                    click: function (evt) {
                        evt.preventDefault();
                        /** 
                         * AJAX-Aufruf des Servers
                         */
                        debugger;
                        var jqxhr = $.ajax({
                            method: "GET",
                            crossDomain: true,
                            url: "readxmle",
                            data: {

                            }
                        }).done(function (r1, textStatus, jqXHR) {
                            try {
                                console.log("Antwort: " + r1);
                                debugger;
                                var j1 = JSON.parse(r1);
                                if (j1.error === true) {
                                    if (typeof j1.xml !== 'undefined') {

                                        console.log("j1: " + j1.xml);
                                    } else {
                                        console.log("keine daten gefunden :(");
                                    }
                                }
                            } catch (err) {
                                console.log(err);
                                debugger;
                            }
                        }).fail(function (err) {
                            console.log(err.statusText);
                            debugger;
                            return;
                        }).always(function () {
                            // nope
                        });
                    }
                }))
            );
        $(container)
            .append($("<div/>", {
                id: "infodiv",
                html: "Info-Bereich",
                css: {
                    width: "inherit",
                    height: "inherit"
                }
            }));
    };

    /**
     * standardisierte Mimik zur Integration mit App, Browser und node.js
     */
    if (typeof module === 'object' && module.exports) {
        // Node.js
        module.exports = logic1;
    } else if (typeof define === 'function' && define.amd) {
        // AMD / RequireJS
        define([], function () {
            return logic1;
        });
    } else {
        // included directly via <script> tag
        root.logic1 = logic1;
    }
}());