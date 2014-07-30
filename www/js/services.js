angular.module('starter.services', [])
.factory('MHTMLDoc', function() {
    function MHTMLDoc() {
        this.boundary = '...BOUNDARY...';
        //begin configuring data on inialization.
        this.doc = 'MIME-Version: 1.0\nContent-Type: multipart/related; boundary="' + this.boundary + '"';
        this.addFile = function(path, contentType, data) {
            this.doc += "\n\n--" + this.boundary;
            this.doc += "\nContent-Location: file:///C:/" + path.replace(/!\\\!/g, "/");
            this.doc += "\nContent-Transfer-Encoding: base64"
            this.doc += "\nContent-Type: " + contentType + "\n\n";
            this.doc += data;
        };
        this.getDoc = function() {
            return this.doc + "\n\n--" + this.boundary + "--";
        };
    }
    return {
        new: function() {
            return new MHTMLDoc();
        }
    };
}).service('ifOnline', function($q, $ionicPopup) {
    return function(opts) {
        if (!opts) {
            opts = {}
        }
        if (!opts.URL) {
            opts.URL = localStorage.server;
        }
        var deferred = $q.defer();
        //cordova
        if (window.network) {
            network.isReachable(opt.URL, function(reachability) {
                // There is no consistency on the format of reachability
                var networkState = reachability.code || reachability;
                if (networkState == NetworkStatus.NOT_REACHABLE && opts.alert) {
                    $ionicPopup.alert({
                        title: "Unable to reach server",
                        subTitle: "Check your connection and try again."
                    });
                    deferred.reject();
                } else {
                    deferred.resolve(networkState);
                }
            });
        } else if (window.navigator) { //for desktop browsers
            setTimeout(function() {
                if (navigator.onLine) {
                    deferred.resolve();
                } else {
                    if (opts.alert) {
                        $ionicPopup.alert({
                            title: "Unable to reach server",
                            subTitle: "Check your connection and try again."
                        });
                    }
                    deferred.reject();
                }
            }, 10);
        }
        return deferred.promise;
    };
}).factory('generateReport', ['$q', '$rootScope', '$compile', '$parse', '$timeout', 'cornerPocket', 'MHTMLDoc',
    function($q, $rootScope, $compile, $parse, $timeout, cornerPocket, MHTMLDoc) {
        //trigger object, for later use
        function Trigger() {
            var self = this;
            self.components = [];
            self.SUM = function(property) {
                var result = 0;
                for (var i = 0; i < self.components.length; i++) {
                    var component = self.components[i];
                    if (component[property] && !isNaN(component[property])) {
                        result = result + parseFloat(component[property]);
                    }
                }
                return result;
            };
            self.AVERAGE = function(property) {
                var result = 0;
                var count = 0;
                for (var i = 0; i < self.components.length; i++) {
                    var component = self.components[i];
                    if (component[property] && !isNaN(component[property])) {
                        result = result + parseFloat(component[property]);
                        count = count + 1;
                    }
                }
                return result / count;
            };
            self.Attachment = function(component, attachment) {
                console.log("--component--");
                console.log(component);
                console.log("--attachment--");
                console.log(attachment);
                cornerPocket.db.getAttachment(component.id, attachment.name, function(err, res) {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    console.log("starting read");
                    var reader = new window.FileReader();
                    reader.readAsDataURL(res);
                    reader.onloadend = function() {
                        console.log(reader.result);
                        attachment.data = reader.result;
                    }
                });
                return false;
            }
        }
        //return object/function
        return {
            fn: function(project, reportDoc) {
                console.log("report");
                console.log(reportDoc);
                var deferred = $q.defer();
                var options = {
                    startkey: [project._id, "0"],
                    endkey: [project._id, "9"]
                };
                var reportText = "";
                //begin scope configuration - project
                var scope = $rootScope.$new(true);
                cornerPocket.db.query('components/forProjectId', options, function(err, result) {
                    if (err) {
                        console.log(err);
                        deferred.reject(err);
                        return;
                    }
                    //project's components
                    var components = result.rows;
                    console.log(components);
                    scope.project = $.extend({}, project.values);
                    scope.project._notes = project.notes;
                    scope.project._name = project.name;
                    scope.project._tag = project.tag;
                    scope.project._created = project.created;
                    scope.project._updated = project.updated;
                    scope.report_created = new Date();
                    scope.triggers = {};
                    var bodyText = "";
                    console.log("1");
                    //promise array for fetching docs
                    var promises = [];
                    //get requests components
                    for (var i = 0; i < components.length; i++) {
                        var component = components[i];
                        promises.push(cornerPocket.db.get(component.id, {
                            attachments: true
                        }));
                    }
                    console.log("2");
                    //upon promise resolution...
                    $q.all(promises).then(function(results) {
                        console.log("3");
                        //...set up each doc
                        var loadedComponents = [];
                        for (var i = 0; i < results.length; i++) {
                            var component = results[i];
                            var componentScope = {};
                            componentScope = $.extend({}, component.values);
                            componentScope.schemaId = component.schemaId;
                            componentScope['name'] = component.name;
                            componentScope['tag'] = component.tag;
                            componentScope['space'] = component.space;
                            componentScope['id'] = component._id;
                            componentScope.attachments = [];
                            for (var prop in component._attachments) {
                                var attachment = component._attachments[prop];
                                componentScope.attachments.push({
                                    name: prop.split(".")[0],
                                    url: "data:" + attachment.content_type + ";base64," + attachment.data,
                                    docUrl: "report_files/" + component._id + "----" + prop
                                });
                            }
                            loadedComponents.push(componentScope);
                        }
                        //index loaded components incase we need them
                        var indexedComponents = _.indexBy(loadedComponents, 'id');
                        //now that we have all the data, lets process the report
                        //now lets actually process the report
                        for (var i = 0; i < reportDoc.triggers.length; i++) {
                            var trigger = reportDoc.triggers[i];
                            //cleaned trigger name
                            var cleanedName = trigger.name.replace(' ', '_');
                            //create trigger object
                            scope.triggers[cleanedName] = new Trigger();
                            ////console.log(trigger);
                            //we'll need to echo the body for each qualifiying component
                            if (trigger.schemaIds) {
                                _.each(loadedComponents, function(componentScope) {
                                    //test to make sure this component qualifies for this trigger
                                    if (_.contains(trigger.schemaIds, componentScope.schemaId)) {
                                        if ($parse(trigger.condition)(componentScope) === true || trigger.condition == true) {
                                            //add component to the list
                                            scope.triggers[cleanedName].components.push(componentScope);
                                        }
                                    }
                                });
                                console.log(scope.triggers);
                                //if we found at least one component...
                                if (scope.triggers[cleanedName].components.length > 0) {
                                    //echo header
                                    if (trigger.header) {
                                        bodyText += trigger.header;
                                    }
                                    //echo body
                                    if (trigger.body) {
                                        /*
									var asElement = angular.element(trigger.body);
									//console.log("--element");
									//console.log(asElement);
							
									//if body has single parent element
									if(asElement.length === 1){
										//console.log(asElement[0]);
										asElement[0].setAttribute("ng-repeat", 'component in triggers.' + cleanedName + '.components');
										bodyText += asElement[0].outerHTML;
										//console.log(asElement[0].outerHTML);
									}else{//wrap in div
										bodyText += "<div ng-repeat='component in triggers." + cleanedName + ".components'>";
						                bodyText += trigger.body;
										bodyText += "</div>";
									}
									*/
                                        bodyText += trigger.body;
                                    }
                                    //lets echo the footer
                                    if (trigger.footer) {
                                        bodyText += trigger.footer;
                                    }
                                }
                            } else { //just echo once
                                //Echo header
                                if (trigger.header) {
                                    bodyText += trigger.header;
                                }
                                //Echo header
                                if (trigger.body) {
                                    bodyText += trigger.body;
                                }
                                //Echo footer
                                if (trigger.footer) {
                                    bodyText += trigger.footer;
                                }
                            }
                        } //Loop through to next trigger
                        var style = reportDoc.styles ? reportDoc.styles : "";
                        reportText = "<html " + "xmlns:o='urn:schemas-microsoft-com:office:office' " + "xmlns:w='urn:schemas-microsoft-com:office:word'" + "xmlns='http://www.w3.org/TR/REC-html40'>" + "<head><title>Time</title>";
                        reportText += "<!--[if gte mso 9]>" + "<xml>" + "<w:WordDocument>" + "<w:View>Print</w:View>" + "<w:Zoom>90</w:Zoom>" + "<w:DoNotOptimizeForBrowser/>" + "</w:WordDocument>" + "</xml>" + "<![endif]-->";
                        reportText += "<style>" + "<!-- /* Style Definitions */" + "@page Section1" + "   {size:8.5in 11.0in; " + "   margin:1.0in 1.25in 1.0in 1.25in ; " + "   mso-header-margin:.5in; " + "   mso-footer-margin:.5in; mso-paper-source:0;}" + " div.Section1" + "   {page:Section1;}" + "table{border-collapse: collapse;}" + "td{border: 1px solid black;padding: 5pt;}" + "th{border: 1px solid black;padding: 5pt;}" + style + "-->" + "</style></head>";
                        //compile report text 
                        var compiledPreview = $compile(bodyText)(scope);
                        //replace .url with .murl for use with MHTML document					
                        var compiledDoc = $compile(bodyText.replace(/\.url}}/g, ".docUrl}}"))(scope);
                        //create temp documents to hold elements
                        var tmpPreview = document.createElement("div");
                        var tmpDoc = document.createElement("div");
                        //add each element to preview
                        for (var i = 0; i < compiledPreview.length; i++) {
                            tmpPreview.appendChild(compiledPreview[i]);
                        }
                        //add each element to document
                        for (var i = 0; i < compiledDoc.length; i++) {
                            tmpDoc.appendChild(compiledDoc[i]);
                        }
                        //need to remove this from angular so we can run out scope.apply in peace
                        setTimeout(function() {
                            //causes compilation
                            scope.$apply();
                            //strip out angular comments
                            var previewHtml = tmpPreview.innerHTML.replace(/<!--[\s\S]*?-->/g, "");
                            var docHtml = tmpDoc.innerHTML.replace(/<!--[\s\S]*?-->/g, "");
                            /*
						//add to report text
						var previewHtml += reportText + "<body lang=EN-US style='tab-interval:.5in'>" + previewHtml + "</body></html>";
						var docHtml += reportText + "<body lang=EN-US style='tab-interval:.5in'>" + docHtml + "</body></html>";
						*/
                            //instantiate report
                            var report = {};
                            //set preview html
                            report.html = reportText + "<body>" + previewHtml + "</body><html>";
                            docHtml = reportText + "<body>" + docHtml + "</body><html>";
                            //construct MHTMLDocument
                            var doc = MHTMLDoc.new();
                            //main html body
                            doc.addFile("report.htm", "text/html", btoa(docHtml));
                            //IMAGES
                            //get list of matches where we're referencing an 'external' file
                            var urls = docHtml.match(/(report_files\/)([^'"]*)/g);
                            //loop through each and add file to reportDoc
                            if (urls) {
                                for (var i = 0; i < urls.length; i++) {
                                    var urlTokens = urls[i].replace("report_files/", '').split("----");
                                    var componentId = urlTokens[0];
                                    var attachmentId = urlTokens[1].split(".")[0];
                                    var attachment = _.findWhere(indexedComponents[componentId].attachments, {
                                        name: attachmentId
                                    });
                                    console.log(attachment.url.slice(23));
                                    doc.addFile(attachmentId, "image/jpeg", attachment.url.slice(23));
                                }
                            }
                            //output MHTMLDocument to report object
                            report.doc = doc.getDoc();
                            report.title = project.name + " - " + reportDoc.name + ".doc";
                            deferred.resolve(report);
                        });
                    }, function(err) {
                        //ERROR HANDLING
                        console.log(err);
                    });
                });
                var success = function() {};
                return deferred.promise;
            }
        }
    }
]).factory('$user', ['$rootScope', '$location', 'cornerPocket', '$http', '$q', '$timeout', 'ifOnline', '$ionicPopup',
    function($rootScope, $location, cornerPocket, $http, $q, $timeout, ifOnline, $ionicPopup) {
        var user = {
            logIn: function(userInfo) {
                var deferred = $q.defer();
                var user = this;
                ifOnline({
                    alert: false
                }).then(function() {
                    //console.log('online');
                    //console.log(localStorage.server);
                    $http.post(localStorage.server + "_session", userInfo).success(function(response) {
                        //console.log(response);
                        response.password = userInfo.password; //now we need to store the password
                        user.construct(response);
                        user.offline = false;
                        //ok, lets check to see if it's the first time for each group 
                        cornerPocket.db.get('_design/projects', function(err, result) {
                            if (err) {
                                //doc not found, better sync
                                deferred.resolve(true);
                            } else { //doc found, go right ahead!
                                deferred.resolve(false);
                            }
                        });
                    }).error(function(data, status) {
                        deferred.reject("Username or Password is incorrect.  Please try again.");
                    });
                }, function() { //offline handling
                    $timeout(function() {
                        //console.log('offline');
                        var localUsers = JSON.parse(localStorage.getItem('users'));
                        //console.log(localUsers);
                        if (localUsers[userInfo.name]) {
                            //console.log('name checks out');
                            if (localUsers[userInfo.name].password === userInfo.password) {
                                //console.log('password checks out');
                                var localUser = localUsers[userInfo.name];
                                //construct user
                                user.name = localUser.name;
                                user.groups = localUser.groups;
                                user.loggedIn = true;
                                user.password = localUser.password;
                                user.offline = true;
                                //add in local settings
                                user.settings = localUser.settings ? localUser.settings : {};
                                if (localUser.activeGroup) {
                                    user.activeGroup = localUser.activeGroup;
                                } else {
                                    user.activeGroup = user.groups[0];
                                }
                                //start up db
                                if (cornerPocket.changes) {
                                    cornerPocket.changes.cancel(); //stop listening, please!	
                                }
                                //lastly, initialize the database (locally)
                                cornerPocket.init(user.activeGroup.name, {adapter: 'websql'});
                                //for some reason this redirect is not happening... :(	
                                $location.path("/app/projects").replace();
                                deferred.resolve();
                            } else {
                                //console.log('password error');
                                deferred.reject('Username or Password is incorrect.  Please try again.');
                            }
                        } else {
                            //console.log('users error');
                            deferred.reject('Username or Password is incorrect.  Please try again.');
                        }
                    }, 100);
                });
                return deferred.promise;
            },
            logOut: function() {
                //console.log('logging out');
                var user = this;
                if (cornerPocket.changes) {
                    cornerPocket.changes.cancel(); //stop listening, please!	
                }
                //if user logged in online and is still online, delete session
                if (!user.offline) {
                    ifOnline({
                        alert: false
                    }).then(function() {
                        $http.delete(localStorage.server + "_session");
                    });
                }
                user.save();
                //always clean user object
                delete user.activeGroup;
                delete user.groups;
                delete user.name;
                delete user.password;
                delete user.settings;
                user.loggedIn = false;
                $timeout(function() {
                    $location.path('/login');
                }, 500);
            },
            setGroup: function(group) {
                if (user.activeGroup != group) {
                    user.activeGroup = group;
                    //store user in local storage for offline login
                    var localUsers = JSON.parse(localStorage.getItem('users'));
                    localUsers[user.name] = user;
                    localStorage.setItem('users', JSON.stringify(localUsers));
                    if (cornerPocket.changes) {
                        cornerPocket.changes.cancel(); //stop listening, please!	
                    }
                    cornerPocket.init(group.name, {adapter: 'websql'});
                    $location.path("/app/projects").replace();
                }
            },
            construct: function(userCtx) {
                //console.log(userCtx);
                var user = this;
                user.name = userCtx.name;
                user.password = userCtx.password;
                user.groups = [];
                var roles = userCtx.roles;
                for (var i = 0; i < roles.length; i++) {
                    //split into group and role
                    var info = roles[i].split("-");
                    //add to users groups
                    user.groups.push({
                        name: info[0],
                        role: info[1]
                    });
                }
                user.loggedIn = true;
                //get previous local user data, if any
                var localUsers = JSON.parse(localStorage.getItem('users'));
                if (!localUsers) {
                    localUsers = {};
                }
                if (!localUsers[user.name]) {
                    localUsers[user.name] = {};
                }
                var previousLocalUser = localUsers[user.name];
                //add in local settings
                user.settings = previousLocalUser.settings ? previousLocalUser.settings : {};
                //save back to local store
                localUsers[user.name] = user;
                //store or overwrite user in local storage for offline login
                localStorage.setItem('users', JSON.stringify(localUsers));
                //if there was previously an active group selected, use that
                if (previousLocalUser && previousLocalUser.activeGroup && _.contains(user.groups, previousLocalUser.activeGroup)) {
                    user.activeGroup = previousLocalUser.activeGroup;
                } else { //else, just use the first group in the list
                    user.activeGroup = user.groups[0];
                }
                if (cornerPocket.changes) {
                    cornerPocket.changes.cancel(); //stop listening, please!	
                }
                //lastly, initialize the database (locally)
                cornerPocket.init(user.activeGroup.name, {adapter: 'websql'});
            },
            save: function() {
                var user = this;
                //get previous local user data, if any
                var localUsers = JSON.parse(localStorage.getItem('users'));
                //save back to local store - catches any changes to settings
                localUsers[user.name] = user;
                localStorage.setItem('users', JSON.stringify(localUsers));
            }
        };
        return user;
    }
]).service('routeAuth', ['$q', '$user', '$state',
    function($q, $user, $state) {
        //immediately process if the user is already authenticated
        var deferred = $q.defer();
        setTimeout(function() {
            if ($user.loggedIn) {
                deferred.resolve();
            } else {
                //console.log('not logged in');
                //console.log($state);
                $state.go('login').then(function(info) {
                    //console.log(info);
                });
                //console.log('go to new path');
                deferred.resolve();
            }
        }, 0);
        return deferred.promise;
    }
]).service('$sync', ['$q', '$ionicPopup', '$user', 'cornerPocket', 'ifOnline',
    function($q, $ionicPopup, $user,cornerPocket, ifOnline) {
        return {
            once: function() {
                var deferred = $q.defer();
                
                //check to make sure we've got internet access
                ifOnline({
                    alert: true
                }).then(function(){
                    //add auth to the remote db URL			
                    var remote = new PouchDB(localStorage.server + $user.activeGroup.name, {
                        auth: {
                            username: $user.name,
                            password: $user.password
                        }
                    });
                    var loadingPopup = $ionicPopup.show({
                        template: '<div class="row">' + '<div class="col" style="text-align: center;">' + '<h3>Syncing...</h3><br/>' + '</div>' + '</div>' + '<div class="loading-icon">' + '<i class="icon ion-looping"></i>' + '</div>'
                    });
                    //execute if we run into issues
                    var onError = function(info){
                        console.log(info);
                        $ionicPopup.alert({
                            title: "Sync Error"
                        });
                        loadingPopup.close();
                    }
                    //Step 1 - first things first, get map of projectIDs
                    remote.query('projects/authorMap', {
                        keys:["All", $user.name]
                    }, function(err, response) {
                        var activeIDs = _.uniq(_.pluck(response.rows, "id"));
                        console.log(activeIDs);
                        //Step 2 - pull down data from server
                        cornerPocket.db.replicate.from(remote, {
                            filter: "filter/mobile",
                            query_params: {
                                ids:activeIDs
                            }
                        }).on("complete", function(info){
                            //Step 3 - conflict resolution
                            
                            //STEP 4 - mark inactive projects as not deployed
                            //create a view that gets all projects which are tagged inactive: true AND deployed:true
                            //update each document to indicatd it's not deployed
                            //save documents back to the server
                            //delete documents from local database
                            //keep track of deleted projects
                            
                            //STEP 5 - push projects back to the server
                            cornerPocket.db.replicate.to(remote, {
                                //we'll stick a filter function here that prevents projects which were deleted from syncing back to the server
                            }).on("complete", function(info){
                                loadingPopup.close();
                                deferred.resolve(info);
                            }).on("error", onError);
                            
                        }).on("error", onError);
                    });
                });
                return deferred.promise;
            },
            live: function() {
                //add auth to the remote db URL
                var currentBase = localStorage.server + $user.activeGroup.name;
                if (currentBase.indexOf('http://') >= 0) {
                    //console.log('http');
                    currentBase = currentBase.substr(0, 7) + $user.name + ":" + $user.password + "@" + currentBase.substr(7);
                } else {
                    currentBase = $user.name + ":" + $user.password + "@" + currentBase;
                }
                var result = cornerPocket.db.sync(currentBase, {
                    live: true
                });
                //console.log(result);
                cornerPocket.autoSync = result;
            }
        };
    }
]).factory('componentUpdate', ['$q', 'cornerPocket',
    function($q, cornerPocket) {
        //object
        function componentCheck() {
            //accepts components and returns the ones which are out of date
            this.check = function(components) {
                console.log("checking");
                var self = this;
                var deferred = $q.defer();
                var schemaIds = _.uniq(_.pluck(components, 'schemaId'));
                var outOfDateComponents = [];
                cornerPocket.db.query('componentSchemas/check', {
                    keys: schemaIds
                }, function(err, response) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        console.log(response);
                        var indexedSchemas = _.indexBy(response.rows, "id");
                        var component, currentSchema;
                        for (var i = 0; i < components.length; i++) {
                            component = components[i];
                            currentSchema = indexedSchemas[component.schemaId];
                            console.log(component);
                            console.log(currentSchema);
                            if (component.schema._rev < currentSchema.value) {
                                outOfDateComponents.push(component);
                            }
                        }
                        self.outOfDateComponents = outOfDateComponents;
                        console.log("--OOD--");
                        console.log(self.outOfDateComponents);
                        deferred.resolve(outOfDateComponents);
                    }
                });
                return deferred.promise;
            };
            //update outofdate components
            this.update = function() {
                var deferred = $q.defer();
                var self = this;
                console.log(angular.copy(self.outOfDateComponents));
                if (!self.outOfDateComponents) {
                    deferred.reject({
                        error: true,
                        message: "You must run a check before updating."
                    });
                } else if (self.outOfDateComponents.length == 0) {
                    deferred.resolve({
                        error: false,
                        message: "All components are up to date."
                    });
                } else {
                    var schemaIds = _.uniq(_.pluck(self.outOfDateComponents, 'schemaId'));
                    console.log(schemaIds);
                    cornerPocket.db.query('componentSchemas/check', {
                        keys: schemaIds,
                        include_docs: true
                    }, function(err, response) {
                        if (err) {
                            deferred.reject(err);
                        } else {
                            var indexedSchemas = _.indexBy(response.rows, "id");
                            console.log(indexedSchemas);
                            var component;
                            var schema;
                            var promises = [];
                            console.log("--OOD--");
                            console.log(angular.copy(self));
                            for (var i = 0; i < self.outOfDateComponents.length; i++) {
                                component = self.outOfDateComponents[i];
                                schema = indexedSchemas[component.schemaId].doc;
                                //set up schema
                                if (schema._id) {
                                    delete schema._id;
                                }
                                schema
                                console.log(angular.copy(component));
                                component.schema = schema;
                                console.log(angular.copy(component));
                                promises.push(component.save());
                            }
                            $q.all(promises).then(function() {
                                deferred.resolve();
                            }, function(error) {
                                console.log(error);
                                deferred.reject(error);
                            });
                        }
                    });
                }
                return deferred.promise;
            };
        };
        //return new instance of the object.
        return componentCheck;
    }
]);
