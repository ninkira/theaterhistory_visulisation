var express = require('express');
var app = express();
var path = require("path");
var fs = require("fs");
var async = require("async");

var bodyParser = require("body-parser");
var parseString = require('xml2js').parseString;

// DB expressions
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('abcd');
db.run("PRAGMA synchronous = OFF", function (err) {
    console.log("synchronous = OFF:" + err);
});
db.run("PRAGMA journal_mode = MEMORY", function (err) {
    console.log("journal_mode = MEMORY:" + err);
});
db.run("PRAGMA optimize", function (err) {
    console.log("optimize:" + err);
});
db.get("PRAGMA page_size", function (err, page) {
    console.log("page_size:" + JSON.stringify(page) + " " + err);
});
// kontrolle ob index angelegt ist
db.get("PRAGMA index_list('EVENTINFO')", function (err, indexlist) {
    console.log("index_list EVENTINFO:" + JSON.stringify(indexlist) + " " + err);
});
db.all("PRAGMA table_info('EVENTINFO')", function (err, felder) {
    if (typeof felder === "undefined" || felder === null || felder.length === 0) {
        console.log("Tabelle EVENTINFO nicht vorhanden");
    } else {
        for (var ifeld = 0; ifeld < felder.length; ifeld++) {
            console.log(JSON.stringify(felder[ifeld], null, ""));
        }
    }
});

db.get("PRAGMA index_list('PERSONINFO')", function (err, indexlist) {
    console.log("index_list PERSONINFO:" + JSON.stringify(indexlist) + " " + err);
});
db.all("PRAGMA table_info('PERSONINFO')", function (err, felder) {
    if (typeof felder === "undefined" || felder === null || felder.length === 0) {
        console.log("Tabelle PERSONINFO nicht vorhanden");
    } else {
        for (var ifeld = 0; ifeld < felder.length; ifeld++) {
            console.log(JSON.stringify(felder[ifeld], null, ""));
        }
    }
});

app.use(bodyParser.json({
    limit: '50mb'
}));

app.use(bodyParser.urlencoded({
    limit: '50mb',
    extended: true,
    parameterLimit: 50000
}));

app.use(express.static(path.join(__dirname, 'static'))); // __dirname is always root verzeichnis #denglisch

// Datenbank Methoden
app.get('/createDB', function (req, res) {
    db.serialize(function () {
        var createStmt = 'CREATE TABLE EVENTINFO(';
        createStmt += 'eventid TEXT,';
        createStmt += 'eventtype TEXT,';
        createStmt += 'quicksearch TEXT,';
        createStmt += 'secondaryTypes TEXT,';
        createStmt += 'listtitle0type TEXT,';
        createStmt += 'listtitle0title TEXT,';
        createStmt += 'listtitle1type TEXT,';
        createStmt += 'listtitle1title TEXT,';
        createStmt += 'listobject0 TEXT,';
        createStmt += 'placetype TEXT,';
        createStmt += 'placename TEXT,';
        createStmt += 'theatertype TEXT,';
        createStmt += 'theatername TEXT,';
        createStmt += 'theaterobject TEXT,';
        createStmt += 'premierdate TEXT';
        createStmt += ')';
        db.run(createStmt, function (err) {
            var smsg = JSON.stringify({
                error: false,
                message: err

            });
            res.writeHead(200, {
                'Content-Type': 'application/text',
                "Access-Control-Allow-Origin": "*"
            });
            res.end(smsg);
            return;
        });
    });
});

app.get('/createPersonDB', function (req, res) {
    db.serialize(function () {
        var createStmt = 'CREATE TABLE PERSONINFO(';
        createStmt += 'eventid TEXT,';
        createStmt += 'actorname TEXT,';
        createStmt += 'actorid TEXT,';
        createStmt += 'actorrole TEXT,';
        createStmt += 'actorcharacter TEXT';

        createStmt += ')';
        db.run(createStmt, function (err) {
            var smsg = JSON.stringify({
                error: false,
                message: err

            });
            res.writeHead(200, {
                'Content-Type': 'application/text',
                "Access-Control-Allow-Origin": "*"
            });
            res.end(smsg);
            return;

        });
    });
});

app.get('/readxmldir', function (req, res) {
    /**
     * get subdirectories of root
     */
    var xmlroot = "data";
    if (req.query && typeof req.query.xmlroot !== "undefined" && req.query.xmlroot.length > 0) {
        xmlroot = req.query.xmlroot;
    }
    var xmlpath = path.join(__dirname, xmlroot);
    //console.log("Start-dir:" + ret.directory);


    var filetree = {
        text: xmlpath,
        children: [],
        a_attr: {
            fullname: xmlpath,
            typ: "dir"
        }
    };
    filetree = dir2tree(xmlpath, filetree, filetree);

    var smsg = JSON.stringify({
        error: false,
        message: "Daten gefunden",
        filetree: filetree,
        xmlpath: xmlpath
    });
    res.writeHead(200, {
        'Content-Type': 'application/text',
        "Access-Control-Allow-Origin": "*"
    });
    res.end(smsg);
    return;

});




/**
 * readxmle - schrittweise erweitern
 * 1. Dateinamen anzeigen
 * 2. Teststring parsen
 * 3. die erste Datei mit Inhalt parsen und anzeigen
 * 4. die erste Datei transformieren nach sqlite3
 * 5. dann alle Dateien transformieren nach sqlite3
 */
app.get('/readxmle', function (req, res) {
    var xml = "test";
    // path.join für Verzeichnisnamen und Unterverzeichnisnamen zusammen
    // und berücksichtigt automatisch, ob Windows oder Unix also \ oder /
    // verwendet werden muss
    var xmlPath = path.join(__dirname, "data", "ereignisse", "xml");

    if (req.query && typeof req.query.fullpath !== "undefined" && req.query.fullpath.length > 0) {
        xmlPath = req.query.fullpath;
    }
    /**
     * zum Test wurde erst nur die 1. Datei in einem Verzeichnis verarbeitet,
     * jetzt wird die vorgegebenen Datei verarbeitet gemäß xmlPath
     */
    // fs.readdir liest alle Verzeichniselemente in ein Array
    fs.readdir(xmlPath, function (err, files) {
        var erg = "";
        var fcount = 0;
        var ret = {};
        var baseRecord = {};
        if (typeof files === "undefined" || files.length === 0) {
            files = [];
            files.push("");
        }
        // async.eachSeries iteriert überdas Array
        // zu jedem Element kann eine Asynchronverarbeitung stattfinden
        async.eachSeries(files, function (file, nextfiles) {
            erg += " " + file;
            fcount++;
            if (fcount === 1) {
                var fullname = path.join(xmlPath, file);
                // fullname = verzeichnisname + dateiname
                // die erste Datei genau analysieren - XML2JSON
                //    var xml = "<root>Hello xml2js!</root>"; //test statement :D
                var dataLength = 0;
                var data = "";
                fs.createReadStream(fullname)
                    .on('data', function (chunk) {
                        dataLength += chunk.length;
                        data += chunk;
                    })
                    .on('end', function () {
                        console.log('the length was: ', dataLength);
                        var xml = data;
                        var options = {
                            charkey: "C",
                            trim: true,
                            normalize: true, //namen dürfen hier keine leerstellen haben
                            parseNumbers: true,
                            parseBooleans: true,
                            explicitArray: false,
                            mergeAttrs: true
                        };
                        parseString(xml, options, function (err, result) {
                            ret.result = result;
                            // iterieren über die obj in result.event
                            // result.event = ein event in der file result
                            // result = json aus xml datei

                            for (var feldName in result.event) {
                                if (result.event.hasOwnProperty(feldName)) {
                                    var wert = result.event[feldName];
                                    if (typeof wert === "object") {
                                        var value = "object";
                                        console.log("feldName val Object: " + feldName, value, typeof feldName);
                                    }
                                    if (typeof wert === "string") {
                                        baseRecord[feldName] = wert;
                                    } else if (typeof wert === "number") {
                                        baseRecord[feldName] = wert;
                                    } else if (typeof wert === "boolean") {
                                        baseRecord[feldName] = wert;
                                    } else if (typeof wert === "object" && Array.isArray(wert)) {
                                        console.log("********** array: " + feldName);
                                        baseRecord = Json2Record(feldName, wert, baseRecord);
                                    } else if (typeof wert === "object") {
                                        console.log("********** object: " + feldName);
                                        baseRecord = Json2Record(feldName, wert, baseRecord);
                                    } else if (feldName === "$") {
                                        var id = result.event[feldName].id;
                                        baseRecord.id = id;
                                        baseRecord.type = "+++++++ " + result.event[feldName].type;
                                    } else if (feldName === "groupingArgument") {
                                        baseRecord.text = JSON.stringify(result.event[feldName].groupingArgument);
                                    }
                                }
                            }
                            console.log(">>>>>> " + JSON.stringify(baseRecord, null, " "));
                            ret.err = err;
                            nextfiles();
                            return;
                        });
                    });
            } else {
                nextfiles();
                return;
            }
        },
            function (err) {
                // dies ist die Schlussroutine des Loops mit async.eachSeries
                // daher erfolgt hier die Rückmeldung an den Browser/Client
                var smsg = JSON.stringify({
                    error: false,
                    message: "Daten gefunden: " + erg.length,
                    xml: ret.result,
                    erg: baseRecord
                });
                res.writeHead(200, {
                    'Content-Type': 'application/text',
                    "Access-Control-Allow-Origin": "*"
                });
                res.end(smsg);
                return;
            });
    });
});

// Kopie der Funktion aus dem Kartenprojekt
// diese Funktion soll die Theaterstück nach dem Premierendaten sortieren
app.get('/jsonData', function (req, res) {
    console.log("jsonData angefordert");

    var jsonData = {};

    // jsonData.children.children.children ist das prinzip
    // für jahre, events, person
    // aus premierdate.substr(0,4), listtitle0title, actorname
    var selStmt = "";
    selStmt += "SELECT";
    selStmt += " premierdate, listtitle0title, actorname, placename, theatername";
    selStmt += " FROM EVENTINFO";
    selStmt += " LEFT JOIN PERSONINFO";
    selStmt += " ON EVENTINFO.eventid = PERSONINFO.eventid";
    selStmt += " ORDER BY EVENTINFO.premierdate, EVENTINFO.listtitle0title";

    db.serialize(function () {
        // var normalSelectString = "SELECT * FROM EVENTINFO";
        console.log("SelStmt: " + selStmt);
        db.all(selStmt, function (err, allRows) {
            if (err) {
                console.log(err);
                res.json({});
                res.end();
                return;
            } else {
                console.log("Gefunden: " + allRows.length);
                var vglJahr = "";
                var vglTitle = "";
                var objJahr = {};
                var objTitle = {};
                var indexJahr = 0;
                var indexTitle = 0;
                jsonData = {};
                jsonData.name = "Events";
                jsonData.children = [];

                allRows.forEach(function (row) {
                    console.log(JSON.stringify(row));
                    var jahr = row.premierdate.substr(0, 4);

                    if (vglJahr !== jahr) {
                        //neues Jahr
                        jsonData.children.push({
                            name: jahr,
                            children: []
                        });
                        // initialisierung
                        indexJahr = jsonData.children.length - 1;
                        indexTitle = 0;
                        vglJahr = jahr;
                        vglTitle = "";

                    }
                    if (vglTitle !== row.listtitle0title) {
                        jsonData.children[indexJahr].children.push({
                            name: row.listtitle0title + row.premierdate,
                            children: []
                        });
                        indexTitle = jsonData.children[indexJahr].children.length - 1;
                        vglTitle = row.listtitle0title;

                    }
                    jsonData.children[indexJahr].children[indexTitle].children.push({
                        name: row.actorname,
                        size: 30
                    });


                });
                console.log(JSON.stringify(jsonData, null, " "));
                res.json(jsonData);
                res.end();
                return;
            }

        });
    });


});

/**
 * jsonData2 für rep362bub.html
 * jahr => listtitle0title => generalinfo | staff | actors mit
 *  generalinfo - placename, theatername, premierdate
 *  staff - aus PERSONINFO mit NICHT actorrole = Darsteller_in - Like-Suche
 *  actors - aus PERSONINFO mit  actorrole = Darsteller_in - Like-Suche
 */
app.get('/jsonData2', function (req, res) {
    console.log("jsonData angefordert");

    var jsonData = {};

    // jsonData.children.children.children ist das prinzip
    // für jahre, events, person
    // aus premierdate.substr(0,4), listtitle0title, actorname
    var selStmt = "";
    selStmt += "SELECT";
    selStmt += " premierdate, listtitle0title, actorname, actorrole, placename, theatername";
    selStmt += " FROM EVENTINFO";
    selStmt += " LEFT JOIN PERSONINFO";
    selStmt += " ON EVENTINFO.eventid = PERSONINFO.eventid";
    selStmt += " ORDER BY EVENTINFO.premierdate, EVENTINFO.listtitle0title";

    db.serialize(function () {
        // var normalSelectString = "SELECT * FROM EVENTINFO";
        console.log("SelStmt: " + selStmt);
        db.all(selStmt, function (err, allRows) {
            if (err) {
                console.log(err);
                res.json({});
                res.end();
                return;
            } else {
                console.log("Gefunden: " + allRows.length);
                var vglJahr = "";
                var vglTitle = "";
                var indexJahr = 0;
                var indexTitle = 0;
                jsonData = {};
                jsonData.name = "Events";
                jsonData.children = [];

                allRows.forEach(function (row) {
                    console.log(JSON.stringify(row));
                    var jahr = row.premierdate.substr(0, 4);
                    if (vglJahr !== jahr) {
                        //neues Jahr
                        jsonData.children.push({
                            name: jahr,
                            children: []
                        });
                        // initialisierung
                        indexJahr = jsonData.children.length - 1;
                        indexTitle = 0;
                        vglJahr = jahr;
                        vglTitle = "";
                    }
                    if (vglTitle !== row.listtitle0title) {
                        var titel = row.listtitle0title.substr(0, 10);
                        //  titel += " " + row.listtitle0title.substr(10, 10).trim();
                        //   titel += " " + row.listtitle0title.substr(20, 10).trim();


                        jsonData.children[indexJahr].children.push({
                            name: titel,
                            titel: row.listtitle0title,
                            children: [{
                                name: "allg. Infos",
                                children: [{
                                    name: row.placename,
                                    size: 10
                                },
                                {
                                    name: row.theatername,
                                    size: 10
                                },
                                {
                                    name: row.premierdate,
                                    size: 10
                                }
                                ]
                            },
                            {
                                name: "Staff",
                                children: []
                            },
                            {
                                name: "Schauspieler",
                                children: []
                            }
                            ]
                        });
                        indexTitle = jsonData.children[indexJahr].children.length - 1;
                        vglTitle = row.listtitle0title;

                    }
                    if (typeof row.actorrole === "undefined" || row.actorrole === null) {
                        jsonData.children[indexJahr].children[indexTitle].children[2].children.push({
                            name: row.actorname,
                            size: 30
                        });
                    } else if (row.actorrole.toLowerCase().indexOf("darsteller") >= 0) {
                        jsonData.children[indexJahr].children[indexTitle].children[2].children.push({
                            name: row.actorname,
                            size: 30
                        });
                    } else {
                        jsonData.children[indexJahr].children[indexTitle].children[1].children.push({
                            name: row.actorname,
                            size: 30
                        });
                    }


                });
                console.log(JSON.stringify(jsonData, null, " "));
                res.json(jsonData);
                res.end();
                return;
            }

        });
    });


});


app.get('/jsonData3', function (req, res) {
    console.log("jsonData angefordert");

    var jsonData = {};

    // jsonData.children.children.children ist das prinzip
    // für jahre, events, person
    // aus premierdate.substr(0,4), listtitle0title, actorname
    var selStmt = "SELECT placename, premierdate, theatername, listtitle0title, ";
    selStmt += " P1.actorname as regisseur, P1.actorrole as rolle1,";
    selStmt += " P2.actorname as darsteller, P2.actorrole as rolle";
    selStmt += " FROM EVENTINFO";
    selStmt += " LEFT JOIN PERSONINFO AS P1";
    selStmt += " ON EVENTINFO.eventid = P1.eventid";
    selStmt += " AND rolle1 LIKE '%Regisseur%'";
    selStmt += " LEFT JOIN PERSONINFO AS P2";
    selStmt += " ON P1.eventid = P2.eventid";
    selStmt += " AND rolle NOT LIKE '%Regisseur%'";
    selStmt += " WHERE lower(regisseur) LIKE '%" + "sellner" + "%'";

    selStmt += " ORDER BY regisseur, listtitle0title, darsteller"; 
    
    db.serialize(function () {
        // var normalSelectString = "SELECT * FROM EVENTINFO";
        console.log("SelStmt: " + selStmt);
        db.all(selStmt, function (err, allRows) {
            if (err) {
                console.log(err);
                res.json({});
                res.end();
                return;
            } else {
                console.log("Gefunden: " + allRows.length);
                // für den regiesseurstück knoten
                var vglRegisseur = "";
                var vglTitel = "";
                var vglDarsteller = "";

                var indexRegisseur = 0;
                var indexTitel = 0;
                var indexDarsteller = 0;

                jsonData = {};
                jsonData.nodes = [];
                jsonData.links = [];


                allRows.forEach(function (row) {
                    console.log(JSON.stringify(row));

                    var regisseur = row.regisseur;

                    if (vglRegisseur !== regisseur) {
                        //neuer regisseur
                        jsonData.nodes.push({
                            name: regisseur
                        })
                        // initialisierung
                        indexRegisseur = jsonData.nodes.length - 1;
                        indexTitel = 0;
                        vglRegisseur = regisseur;
                        vglTitle = "";
                    }

                    if (vglTitel !== row.listtitle0title) {
                        var titel = row.listtitle0title;
                        jsonData.nodes.push({
                            name: titel
                        });
                        indexTitel = jsonData.nodes.length - 1;
                        vglTitel = titel;
                        jsonData.links.push({
                            source: indexRegisseur,
                            target: indexTitel,
                            weight: 80
                        });
                    }

                    if (row.darsteller !== null) {
                        var indexDarsteller = -1;
                        for (var i = 0; i < jsonData.nodes.length; i++) {
                            if (row.darsteller === jsonData.nodes[i].name) {
                                indexDarsteller = i;
                                break;
                            }
                        }
                        if (indexDarsteller > -1) {
                            //darsteller bereits vorhanden
                            jsonData.links.push({
                                source: indexTitel,
                                target: indexDarsteller,
                                weight: 1
                            });
                        } else {
                            // neuer darsteller
                            jsonData.nodes.push({
                                name: row.darsteller
                            });
                            jsonData.links.push({
                                source: indexTitel,
                                target: jsonData.nodes.length - 1,
                                weight: 1
                            })
                        }

                    }

                });
                console.log(JSON.stringify(jsonData, null, " "));
                res.json(jsonData);
                res.end();
                return;
            }

        });
    });


});



app.get('/readAll', function (req, res) {
    var selStmt = "";
    if (req.query && typeof req.query.selStmt !== "undefined" && req.query.selStmt.length > 0) {
        selStmt = req.query.selStmt;
    }
    db.serialize(function () {
        // var normalSelectString = "SELECT * FROM EVENTINFO";
        console.log("SelStmt: " + selStmt);
        db.all(selStmt, function (err, allRows) {
            if (err) {
                console.log(err);
                var smsg = JSON.stringify({
                    error: true,
                    message: err
                });
                res.writeHead(200, {
                    'Content-Type': 'application/text',
                    "Access-Control-Allow-Origin": "*"
                });
                res.end(smsg);
                return;
            } else {
                console.log("Gefunden: " + allRows.length);
                var records = [];
                allRows.forEach(function (row) {
                    console.log(JSON.stringify(row));
                    records.push(row);
                });
                smsg = JSON.stringify({
                    error: false,
                    message: "Sätze gefunden: " + records.length,
                    records: records
                });
                res.writeHead(200, {
                    'Content-Type': 'application/text',
                    "Access-Control-Allow-Origin": "*"
                });
                res.end(smsg);
                return;
            }

        });
    });
});



// ähnlich zum aufruf im got projekt - hier allerdings aufbereitung im client
app.post('/writeDB', function (req, res) {
    var insStmt = "";
    if (req.body && typeof req.body.insStmt !==
        "undefined" && req.body.insStmt.length > 0) {
        insStmt = req.body.insStmt;
    }
    var record = {};

    //https://stackoverflow.com/questions/39106668/node-js-sqlite3-read-all-records-in-table-and-return
    // method to read table
    console.log("Insert Statement: " + insStmt);
    db.serialize(function () {
        db.run(insStmt, function (err) {
            if (err !== null) {

                console.log(err);
                var smsg = JSON.stringify({
                    error: true,
                    message: err
                });
                res.writeHead(200, {
                    'Content-Type': 'application/text',
                    "Access-Control-Allow-Origin": "*"
                });
                res.end(smsg);
                return;
            } else {
                // hier erfolgreich geschrieben
                console.log("Insert war erfolgreich: " + this.lastID);
                var smsg = JSON.stringify({
                    error: false,
                    message: "Insert war erfolgreich: " + this.lastID
                });
                res.writeHead(200, {
                    'Content-Type': 'application/text',
                    "Access-Control-Allow-Origin": "*"
                });
                res.end(smsg);
                return;
            }

        });
    });
});
app.get('/', function (req, res) {
    // res.send('Hello World!');
    // so wird node.js zum http-Server
    res.sendFile(path.resolve("static/index.html"));
    return;
});

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});

/**
 * dir2tree - Auflösung Verzeichnis
 * @param {*} dir - Vorgabe des Verzeichnisses, das aufzulösen ist
 * @param {*} parobj - Objekt, das dem Verzeichnis entspricht, in diesem Objekt werden die children versorgt
 * @param {*} filetree - Gesamthafter Filetree für das UI, wird als return verwendet (s.u.)
 * returns filetree
 * {
        id          : "string" // will be autogenerated if omitted
        text        : "string" // node text
        icon        : "string" // string for custom
        state       : {
            opened    : boolean  // is the node open
            disabled  : boolean  // is the node disabled
            selected  : boolean  // is the node selected
        },
        children    : []  // array of strings or objects
        li_attr     : {}  // attributes for the generated LI node
        a_attr      : {}  // attributes for the generated A node
   }
 */
// https://stackoverflow.com/questions/50121881/node-js-recursively-list-full-path-of-files
function dir2tree(dir, parobj, filetree) {
    fs.readdirSync(dir).forEach(function (file) {
        var fullPath = path.join(dir, file);
        if (fs.lstatSync(fullPath).isDirectory()) {
            console.log(fullPath);
            var newobj = {
                text: file,
                state: {
                    selected: false
                },
                a_attr: {
                    fullpath: fullPath
                },
                children: []
            };
            parobj.children.push(newobj);
            filetree = dir2tree(fullPath, newobj, filetree);
        } else {
            console.log(fullPath);
            var newfile = {
                text: file,
                icon: "jstree-file",
                state: {
                    selected: false
                },
                a_attr: {
                    fullpath: fullPath
                }
            };
            parobj.children.push(newfile);
        }
    });
    return filetree;
}

/**
 * Json2Record - füllt eine Zielstruktur mit expandierten Namen
 */
function Json2Record(rootName, jsonObj, jsonRec) {
    for (var objName in jsonObj) {
        if (jsonObj.hasOwnProperty(objName)) {
            var objWert = jsonObj[objName];
            if (typeof objWert === "object" && Array.isArray(objWert)) {
                console.log("********** array: " + objName);
                if (rootName === "listActor") {
                    jsonRec = Json2Record(rootName + "_0_" + objName, objWert[0], jsonRec); // nur erstes element iterieren
                } else {
                    for (var irec = 0; irec < objWert.length; irec++) {
                        if (typeof objWert[irec] === "object") {
                            jsonRec = Json2Record(rootName + "_" + irec + "_" + objName, objWert[irec], jsonRec); // nur erstes element iterieren
                        } else {
                            jsonRec[rootName + "_" + irec + "_" + objName] = objWert;
                        }
                    }
                }
            } else if (typeof objWert === "object") {
                console.log("********** array: " + objName);
                jsonRec = Json2Record(rootName + "_" + objName, objWert, jsonRec); // hier alle elemente, da object
            } else if (typeof objWert === "string") {
                jsonRec[rootName + "_" + objName] = objWert;
            } else if (typeof objWert === "number") {
                jsonRec[rootName + "_" + objName] = objWert;
            } else if (typeof objWert === "boolean") {
                jsonRec[rootName + "_" + objName] = objWert;
            }
        }
    }
    return jsonRec;
}