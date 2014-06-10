angular.module('starter.services', [])

.service('ifOnline', function($q, $ionicPopup){
	
	return function(opts){
		
		if(!opts){
			opts = {}
		}
		
		if(!opts.URL){
			opts.URL = localStorage.server;
		}
		
		var deferred = $q.defer();
		
		//cordova
		if(window.network){
			network.isReachable(opt.URL, function(reachability){
				  // There is no consistency on the format of reachability
				  var networkState = reachability.code || reachability;
  
				  if(networkState == NetworkStatus.NOT_REACHABLE && opts.alert){
					  $ionicPopup.alert({
				  		  title:"Unable to reach server",
				  		  subTitle: "Check your connection and try again."
					  });
					  deferred.reject();
				  }else{
					  deferred.resolve(networkState);
				  }
			});
		}else if(window.navigator){//for desktop browsers
			setTimeout(function(){
				if(navigator.onLine){
					deferred.resolve();
				}else{
					if(opts.alert){
	  				  $ionicPopup.alert({
	  			  		  title:"Unable to reach server",
	  			  		  subTitle: "Check your connection and try again."
	  				  });
					}
  				    deferred.reject();
				}
			},10);
		}
		
		
		
		return deferred.promise;
	};
})

.factory('generateReport',['$q','$rootScope', '$compile', '$parse', '$timeout','$ngPouch', function($q, $rootScope, $compile, $parse,$timeout, $ngPouch){
	
	//trigger object, for later use
	
	function Trigger(){
		var self = this;
		
		self.components = [];
		
		self.SUM = function(property){
			var result = 0;
			
			for(var i = 0; i < self.components.length; i++){
				var component = self.components[i];
				if(component[property] && !isNaN(component[property])){
					result = result + parseFloat(component[property]);
				}
			}
			
			return result;
		};
		
		self.AVERAGE = function(property){
			var result = 0;
			var count = 0;
			
			for(var i = 0; i < self.components.length; i++){
				var component = self.components[i];
				if(component[property] && !isNaN(component[property])){
					result = result + parseFloat(component[property]);
					count = count + 1;
				}
			}
			return result / count;
		};
		
	}
	
	
	//return object/function
	return {
		fn:function(project, reportDoc){
			
			var deferred = $q.defer();
			var options = {
				startkey: [project._id,"0"],
				endkey: [project._id, "9"]
			};
			
			$ngPouch.db.query('components/forProjectId', options, function(err, result){
				if(err){
					//console.log(err);
					deferred.reject(err);
					return;
				}		
				//project's components
				var components = _.pluck(result.rows, "value");

				
    			
				
				//begin scope configuration
			    var scope = $rootScope.$new(true);
				scope.project = $.extend({}, project.values);
				scope.project.notes = project.notes;
			    scope.project._name = project.name;
				scope.project._tag = project.tag;
				scope.project._created = project.created;
				scope.project._updated = project.updated;
				scope.report_created = new Date();
				scope.triggers = {};
				
				var bodyText = "";
    
			    //now lets actually process the report
			    for(var i = 0; i < reportDoc.triggers.length;i++){
			        var trigger = reportDoc.triggers[i];
					
					//cleaned trigger name
					var cleanedName = trigger.name.replace(' ', '_');
					
					//create trigger object
					scope.triggers[cleanedName] = new Trigger();
					
			        ////console.log(trigger);
					//we'll need to echo the body for each qualifiying component
			        if(trigger.schemaIds){
			            _.each(components, function(element){
			                var componentScope = {};
			                componentScope = element.values;
			                componentScope['name'] = element.name;
			                componentScope['tag'] = element.tag;
			                componentScope['space'] = element.space;                 
                			
			                if(_.contains(trigger.schemaIds, element.schemaId)){
			                    if($parse(trigger.condition)(componentScope) === true || !trigger.condition){                         
									//add component to the list
									scope.triggers[cleanedName].components.push(componentScope); 
			                    }
			                }
			            });             
            			
						//if we found at least one component...
						if(scope.triggers[cleanedName].components.length > 0){
							//echo header
				            if(trigger.header){
				                bodyText += trigger.header;
				            } 
							
							//echo body and add in the ngRepeat
				            if(trigger.body){
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
				            }
							
				            //lets echo the footer
				            if(trigger.footer){
				                bodyText += trigger.footer;
				            } 
							
						}
			            
			        }else{//just echo once
			            //Echo header
			            if(trigger.header){
			                bodyText += trigger.header;
			            }            
			            //Echo header
			            if(trigger.body){
			                bodyText += trigger.body;
			            }            
			            //Echo footer
			            if(trigger.footer){
			                bodyText += trigger.footer; 
			            }            
			        }      
			    }//Loop through to next trigger
				
				var style = reportDoc.styles ? reportDoc.styles:"";
				
			    var reportText = "<html " + 
			            "xmlns:o='urn:schemas-microsoft-com:office:office' " +
			            "xmlns:w='urn:schemas-microsoft-com:office:word'" +
			            "xmlns='http://www.w3.org/TR/REC-html40'>" +
			            "<head><title>Time</title>";

			    reportText += "<!--[if gte mso 9]>" +
			                             "<xml>" + 
			                             "<w:WordDocument>" +
			                             "<w:View>Print</w:View>" +
			                             "<w:Zoom>90</w:Zoom>" + 
			                             "<w:DoNotOptimizeForBrowser/>" +
			                             "</w:WordDocument>" +
			                             "</xml>" + 
			                             "<![endif]-->";

			    reportText += "<style>" +
			                            "<!-- /* Style Definitions */" +
			                            "@page Section1" +
			                            "   {size:8.5in 11.0in; " +
			                            "   margin:1.0in 1.25in 1.0in 1.25in ; " +
			                            "   mso-header-margin:.5in; " +
			                            "   mso-footer-margin:.5in; mso-paper-source:0;}" +
			                            " div.Section1" +
			                            "   {page:Section1;}" +
			                            "table{border-collapse: collapse;}" +
			                            "td{border: 1px solid black;padding: 5pt;}" +
			                            "th{border: 1px solid black;padding: 5pt;}" +
			                            style +
			                            "-->" +
			                           "</style></head>";
				
				//compile report text 
				var compiled = $compile(bodyText)(scope);
				
				//create temp document to hold elements
				var tmp = document.createElement("div");
				
				//add each element to document
				for(var i = 0; i < compiled.length; i++){
					tmp.appendChild(compiled[i]);				
				}
				//causes compilation
				scope.$apply();
				
				//strip out angular comments
				var innerHtml = tmp.innerHTML.replace(/<!--[\s\S]*?-->/g, "");
				
				//add to report text
				reportText += "<body lang=EN-US style='tab-interval:.5in'>" + innerHtml + "</body>";
				reportText += "</html>";
				
			    //instantiate report
			    var report = {};
			    report.data = btoa(reportText); 
			    report.title = project.name + " - " + reportDoc.name + ".doc";
				
				deferred.resolve(report);
			});
			return deferred.promise;
		}	
	}
}])

.factory('$user',['$rootScope', '$location', '$ngPouch', '$http', '$q', '$timeout', 'ifOnline', '$ionicPopup',function($rootScope, $location, $ngPouch, $http, $q, $timeout, ifOnline, $ionicPopup) {
	
	var user = {
		/*load:function(){
			var user = this;
			
			var localUsers = JSON.parse(localStorage.getItem('users'));
			
			if(localUsers){//logged in
				var localUsers = JSON.parse(localUsersString);
				
				//add in user name, password, groups, and activeGroup
				
				
				return true;
			}else{//not logged in
				
				return false;
			}
		},*/
		logIn:function(userInfo){
			var deferred = $q.defer();
			var user = this;
			
	  	    ifOnline({alert:false}).then(function(){
				//console.log('online');
				//console.log(localStorage.server);
				$http.post(localStorage.server + "_session", userInfo).success(function(response){
					//console.log(response);
					response.password = userInfo.password;//now we need to store the password
					user.construct(response);
					user.offline = false;
					
					//ok, lets check to see if it's the first time for each group 
					$ngPouch.db.get('_design/projects', function(err, result){
						if(err){
							
							//doc not found, better sync
							//can't use $sync here b/c of circular dependency
							var currentBase = localStorage.server + user.activeGroup.name;
							/*
							if(currentBase.indexOf('http://') >= 0){
								currentBase = currentBase.substr(0, 7) + encodeURIComponent(user.name) + ":" + user.password + "@" + currentBase.substr(7);
							}else{
								currentBase = encodeURIComponent(user.name) + ":" + user.password + "@" + currentBase;
							}	
							*/
							//escaped URL
							//console.log(currentBase);
			
			
						    var loadingPopup = $ionicPopup.show({	
	                          template: '<div class="row">' + 
	                                        '<div class="col" style="text-align: center;">' +  
	                                                '<h3>Syncing...</h3><br/>' +
	                                        '</div>' +
	                                    '</div>' +
	                                    '<div class="row">' +
	                                        '<div class="col"></div>' + 
	                                        '<div class="col">' +  
	                                                '<a class="button button-icon icon ion-looping"></a>' + 
	                                        '</div>' +
	                                        '<div class="col"></div>' +
	                                    '</div>'
	                  		});
												  
						    $ngPouch.db.sync(currentBase)
							.on('change', function(data){
								//console.log('change');
								//console.log(data);
							})
							.on('complete', function(data){
							  loadingPopup.close();
	  						  $timeout(function(){
	  						     $location.path("/app/projects").replace();
	  							 deferred.resolve();
	  						   });
						    }, function(info){
								//console.log("SYNC ERROR");
								//console.log(info);
								deferred.reject();
						    });
						}else{//doc found, go right ahead!
							$timeout(function(){
								$location.path("/app/projects").replace();
								deferred.resolve();
							});
							
						}
					});
				}).error(function(data, status){
					//$location.path("/login").replace();
					deferred.reject();
				});
	  	    }, function(){//offline handling
	  	    	$timeout(function(){
					//console.log('offline');
					var localUsers = JSON.parse(localStorage.getItem('users'));
					//console.log(localUsers);
					if(localUsers[userInfo.name]){
						//console.log('name checks out');
						if(localUsers[userInfo.name].password === userInfo.password){
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
							
							if(localUser.activeGroup){
								user.activeGroup = localUser.activeGroup;
							}else{
								user.activeGroup = user.groups[0];
							}
							
							
							//start up db
							if($ngPouch.changes){
								$ngPouch.changes.cancel();//stop listening, please!	
							}
			
							//lastly, initialize the database (locally)
							$ngPouch.init(user.activeGroup.name);
							
							
							//for some reason this redirect is not happening... :(	
							$location.path("/app/projects").replace();
							deferred.resolve();
						}else{
							//console.log('password error');
							deferred.reject('Incorrect Password');
						}
					}else{
						//console.log('users error');
						deferred.reject('No users found with that username');
					}
				}, 100);
	  	    });
			
			return deferred.promise;
		},
		logOut:function(){
			//console.log('logging out');
			var user = this;
			if($ngPouch.changes){
				$ngPouch.changes.cancel();//stop listening, please!	
			}	
			
			//if user logged in online and is still online, delete session
			if(!user.offline){
				ifOnline({alert:false}).then(function(){
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
			
                        
			
			$timeout(function(){
				$location.path('/login');
			}, 500);
			
		},
		setGroup:function(group){
			if(user.activeGroup != group){
				user.activeGroup = group;
				
				//store user in local storage for offline login
				var localUsers = JSON.parse(localStorage.getItem('users'));
				localUsers[user.name] = user;
				localStorage.setItem('users', JSON.stringify(localUsers));
				
				if($ngPouch.changes){
					$ngPouch.changes.cancel();//stop listening, please!	
				}
				
				$ngPouch.init(group.name);
				$location.path("/app/projects").replace();
			}
			
		},
		construct:function(userCtx){
			//console.log(userCtx);
			
			var user = this;
			user.name = userCtx.name;
			user.password = userCtx.password;
			
			user.groups = [];
			var roles = userCtx.roles;
			for(var i = 0; i < roles.length; i++){
				//split into group and role
				var info = roles[i].split("-");
				//add to users groups
				user.groups.push({
					name:info[0],
					role:info[1]
				});
			}
			user.loggedIn = true;
			
			//get previous local user data, if any
			var localUsers = JSON.parse(localStorage.getItem('users'));
			
			if(!localUsers){
				localUsers = {};
			}
			if(!localUsers[user.name]){
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
			if(previousLocalUser && previousLocalUser.activeGroup && _.contains(user.groups, previousLocalUser.activeGroup)){
				user.activeGroup = previousLocalUser.activeGroup;
			}else{//else, just use the first group in the list
				user.activeGroup = user.groups[0];
			}
                        
                        
			
			if($ngPouch.changes){
				$ngPouch.changes.cancel();//stop listening, please!	
			}
			
			//lastly, initialize the database (locally)
			$ngPouch.init(user.activeGroup.name);
		},
                save: function(){
                    var user = this;
                    
                    //get previous local user data, if any
                    var localUsers = JSON.parse(localStorage.getItem('users'));
                    //save back to local store - catches any changes to settings
                    localUsers[user.name] = user;
                    localStorage.setItem('users', JSON.stringify(localUsers));
                }
	};
	
	return user;
}])
.service('routeAuth', ['$q', '$user', '$state',function($q, $user, $state){
	//immediately process if the user is already authenticated
	var deferred = $q.defer();
	setTimeout(function(){
		if($user.loggedIn){
			deferred.resolve();
		}else{
			//console.log('not logged in');
			//console.log($state);
			$state.go('login').then(function(info){
				//console.log(info);
			});
			//console.log('go to new path');
			deferred.resolve();
		}	
	}, 0);
	
	return deferred.promise;
	
}])

.service('$sync', ['$q', '$ionicPopup','$user', '$ngPouch', 'ifOnline', function($q, $ionicPopup, $user, $ngPouch, ifOnline){
	return{
		once: function(){
			var deferred = $q.defer();
			
		   //add auth to the remote db URL
                    var currentBase = localStorage.server + $user.activeGroup.name;
                    if(currentBase.indexOf('http://') >= 0){
                            //console.log('http');
                            currentBase = currentBase.substr(0, 7) + encodeURIComponent($user.name) + ":" + encodeURIComponent($user.password) + "@" + currentBase.substr(7);
                    }else{
                            currentBase = encodeURIComponent($user.name) + ":" + encodeURIComponent($user.password) + "@" + currentBase;
                    }	
			
			
		  var loadingPopup = $ionicPopup.show({	
			  template: '<div class="row">' + 
                                        '<div class="col" style="text-align: center;">' +  
                                                '<h3>Syncing...</h3><br/>' +
                                        '</div>' +
                                    '</div>' +
                                    '<div class="row">' +
                                        '<div class="col"></div>' + 
                                        '<div class="col">' +  
                                                '<a class="button button-icon icon ion-looping"></a>' + 
                                        '</div>' +
                                        '<div class="col"></div>' +
                                    '</div>'
		  });
		  $ngPouch.db.sync(currentBase).on('complete', function(data){
			  loadingPopup.close();
			  deferred.resolve(data);
		  });
		  
		  return deferred.promise;
		},
		live:function(){
			//add auth to the remote db URL
			var currentBase = localStorage.server + $user.activeGroup.name;
			if(currentBase.indexOf('http://') >= 0){
				//console.log('http');
				currentBase = currentBase.substr(0, 7) + $user.name + ":" + $user.password + "@"+ currentBase.substr(7);
			}else{
				currentBase = $user.name + ":" + $user.password + "@"+ currentBase;
			}	
			
		    var result = $ngPouch.db.sync(currentBase, {live:true});
			//console.log(result);
			$ngPouch.autoSync = result;
		}
	};
}]);
