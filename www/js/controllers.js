angular.module('starter.controllers', [])
.controller('loginController', function($scope, $ionicPopup, $user) {
	
	if(typeof StatusBar  === 'function'){
		StatusBar.styleDefault();
	}
	
	//user object
	$scope.user = {};
	
	//change target server
	$scope.showServerSelect = function(){
		$ionicPopup.prompt({
		   title: 'Onsite Server',
		   subTitle: 'Point this app to an Onsite Server',
		   inputType: 'text',
		   inputPlaceholder: "Onsite Server",
	       default: localStorage.server 
		 }).then(function(res) {
                   if(res.slice(-1) !== "/"){
                       localStorage.server = res + "/";
                   }else{
                       localStorage.server = res;
                   }  
		   
		 });
	};
        
        //local name and password
        $scope.user.name = localStorage.name;
        $scope.user.password = localStorage.password;
	
	$scope.login = function(){
        //temporary during testing
		$scope.user.name = $scope.user.name.toLowerCase();
		
        localStorage.name = $scope.user.name;
        localStorage.password = $scope.user.password;
                
		$user.logIn($scope.user);
	};
})

.controller('AppCtrl', function($scope, $ionicPopup, $ngPouch, $user, $sync, ifOnline, $state, $timeout) {
	
	//change status bar color
	if(window.StatusBar){
		StatusBar.styleLightContent();
	}
	
	
	//load user's settings
	//console.log($user);
        if(!localStorage.groupBy){
            localStorage.groupBy = 'tag';
        }
	
	$scope.groups = $user.groups;
	$scope.group = $user.activeGroup;
	
	$scope.shouldSync = false;
	
	/*--VIEW OPERATIONS--*/
	
	//one-time sync
	$scope.sync = function(){
		
	  if($scope.shouldSync){
	   	  $ionicPopup.alert({
    		  title:"Error",
    		  subTitle: "Sync already in progress"
		  });
		  return;
	  }
	  
	  ifOnline({alert:true}).then(function(){
	  	  var promise = $ionicPopup.confirm({
	  		  title:"Confirm Sync",
	  		  subTitle: "Ready to go?!?"
	  	  });
  
		  promise.then(function(result){
			  if(result){
				  $sync.once();
			  }
		  });
	  });
	};
  	  
	//toggle Auto sync
	$scope.toggleAutosync = function(shouldSync){
		//console.log(shouldSync);
		if(!shouldSync){
			$ngPouch.autoSync.cancel();//stop listening, please!	
		}else{
	  	  ifOnline({alert:true}).then(function(){
                 $sync.live();
	  			//add listener to handle if network connection is lost
	  			document.addEventListener("offline", function(){
	  				$ngPouch.autoSync.cancel();//stop listening, please!
	  				$scope.shouldSync = false;
	    	  			$ionicPopup.alert({
	    	  		  	  title:"Lost connection to server",
	    	  		  	  subTitle: "Autosync stopped.  Check your connection and try again."
	    	  			});
	  			}, false);
          }, function(){
				//console.log('here there and everywhere');
		  		$scope.shouldSync = false;
          });
      }
	};
	
	$scope.logout = function(){
		$user.logOut();
	};
        
    //handle change in active group
    $scope.setActiveGroup = function(group){
		//console.log('setting active group');
		$user.setGroup(group);
                $user.save();
                $state.go($state.current, {}, {reload: true});
	};
        
    //set default value
    $user.settings.groupBy = $user.settings.groupBy ? $user.settings.groupBy : "tag";
    $scope.groupBy = $user.settings.groupBy;
    //handle change
    $scope.setGroupBy = function(groupBy){
        $user.settings.groupBy = groupBy;
        $user.save();
    };
})
.controller('projectsController', function($scope, $stateParams, $q, $timeout, $ionicModal, $ionicPopup, $ngPouch, generateReport) {
           
	$scope.view = {};
		   
    //----------CRUD OPERATIONS----------//
        
    //GET items and watch tags
    var promises = [];

    promises.push($ngPouch.mapCollection("projects/all"));
    promises.push($ngPouch.mapCollection("reports/all"));
    $q.all(promises).then(function(results){
            $scope.items = results[0].docs; 
            $scope.reports = results[1].docs;
    });

    //second wave - used for the 'Add New' Dialog
    var secondWave = [];
    //var libraries = [];
    var templates = [];

    secondWave.push($ngPouch.db.query("templates/groupByTag"));//load these so we don't have to when we open the dialog box
    //secondWave.push($ngPouch.mapCollection("libraries/all", {descending:true}));//load these so we don't have to when we open the dialog box
    $q.all(secondWave).then(function(results){
            templates = _.pluck(results[0].rows, 'value');
            //libraries = results[1].docs;

    });

    var initial = true;
    var tag = function(item){return item.tag;};
    $scope.$watch('[items]', function (newVal, oldVal) { 
		if(newVal !== oldVal){
	        $scope.tags = _.map(_.uniq($scope.items,tag),tag);
			//set active tag on load or after activetag is deleted
			if(initial || !_.contains($scope.tags, $scope.view.activeTag)){
				$scope.view.activeTag = $scope.tags[0];
				initial = false;//then turn this off
			}
		}
    }, true);
    
    //DELETE item
    $scope.deleteItem = function(item){      
	  var promise = $ionicPopup.confirm({
		  title:"Confirm Deletion",
		  subTitle: "Are you sure you want to delete: "+ item.name + "?"
	  });
	  
	  promise.then(function(result){
		  if(!result){
			  return;
		  }
		  //get item's id
		  var id = item._id;
		  //query start/end
		  var options = {
			  startkey:[id, "0"],
			  endkey:[id, "9"]
		  };
		  //get all the docs to delete
		  $ngPouch.db.query("components/forProjectId", options).then(function(result){
			  var components = _.pluck(result.rows, "value");
			  
			  for(var i = 0; i < components.length; i++){
				  components[i]._deleted = true;
			  }
			  	
			  if(components.length > 0){
				  $ngPouch.bulkDocs({docs:components}).then(function(data){
				  });
			  }
			  
			  item.remove().then(function(data){
		          //console.log("deleted everything!");
			  });
		  
		  });
	  });
    };
  
  //VIEW OPERATIONS      
  $scope.setTag = function(tag){
      $scope.selectedTag = tag;
  };
  
  $scope.test = function(){
	  //console.log('test');
	  alert('test');
  };
  //modal controls
  //ADD NEW
  $ionicModal.fromTemplateUrl('AddNew-Content.html', {}).then(function(modal) {
  	$scope.addNewModal = modal;
	//configure modalScope
	var modalScope = $scope.addNewModal.scope;
	//console.log(templates);
	modalScope.close = function(){
		$scope.addNewModal.hide().then(function(){
			//clean modal scope
			delete modalScope.newItem;
			delete modalScope.view;
			delete modalScope.itemToUpdate;
		});
		
	};
	modalScope.ok = function(){
		var newItem = modalScope.newItem;
		
        if(!modalScope.view.existing && !modalScope.itemToUpdate){//if new && template
			var newProject = {};
			
			//copy template to item
			angular.copy(newItem.template,newProject);
			
			//configure new Project
			newProject.name = newItem.name;
			newProject.tag = newItem.tag;
			newProject.type = 'project';
			
			//date/time
			var now = new Date();
			newProject.created = now.toISOString();
			newProject.updated = newProject.created;
			
			//get template id
			var oldId = newProject._id;
			var options = {
				startkey: [oldId, "0"],
				endkey: [oldId, "9"]
			};
			
			//strip the new project
			delete newProject._id;
			delete newProject._rev;
			
			//console.log("new project");
			//console.log(newProject);
			
			//post project to DB
			$ngPouch.db.post(newProject).then(function(result){
				var newId = result.id;
				
				//get all existing components associated with the template
				$ngPouch.db.query("components/forProjectId", options).then(function(result){
					var components = _.pluck(result.rows, "value");
					
					//strip all info from the components
		  			for(var i = 0; i < components.length; i++){
		  				var component = components[i];
		  				//clean up component
		  				delete component._id;
		  				delete component._rev;
		  				//assign new projectId
		  				component.projectId = newId;
		  			}
					
					$ngPouch.bulkDocs({docs:components}).then(function(){
						//console.log("Saved!");
					});
				});
			});
        }else{//existing
            //console.log('update!');
			modalScope.itemToUpdate.name = newItem.name;
			modalScope.itemToUpdate.tag = newItem.tag;
			
            modalScope.itemToUpdate.save().then(function() {            
                $scope.status = 'Saved!';
                $scope.showStatus = true;
            }, function() {
                $scope.status = 'Error :(';
                $scope.showStatus = true;
            }); 
        }
		
		$scope.addNewModal.hide().then(function(){
			//clean modal scope
			delete modalScope.newItem;
			delete modalScope.view;
			modalScope.itemToUpdate = null;
		});
	};
	
	modalScope.reports = $scope.reports;
	
  });
  $scope.dialogOpen = function(itemToUpdate){
	  /*
	if(templates && templates.length < 1){
		$ionicPopup.alert({
			title: "Error",
			subTitle: "No templates set up!  You'll need at least one to create a project."
		});
		return;
	}  
	  */
	//configure modal scope
	var modalScope = $scope.addNewModal.scope;
	
	//view object
	modalScope.view = {};
	
	
	//get libraries and templates
	modalScope.templates = templates;
	modalScope.tags = $scope.tags;
	//modalScope.libraries = libraries;
	
	
	modalScope.newItem = {};
	
	//if new
	if(!itemToUpdate){
		modalScope.title = "Add New Project";
		modalScope.view.existing = false;
		//default behaviour
		modalScope.newItem.template = templates[0];
	}else{
		modalScope.title = "Edit " + itemToUpdate.name;
		modalScope.newItem.name = itemToUpdate.name;
		modalScope.newItem.tag = itemToUpdate.tag;
		modalScope.itemToUpdate = itemToUpdate;
		modalScope.view.existing = true; 
	}
	
	//lets actually open it up
	$scope.addNewModal.show().then(function(){
		modalScope.view.firstFocus = true;
	});
  };
  //Cleanup the modals when we're done with it!
  $scope.$on('$destroy', function() {
    $scope.addNewModal.remove();
	$scope.reportModal.remove();
  });    
  
  
  //REPORTS
  $ionicModal.fromTemplateUrl('reportsDialog.html', {}).then(function(modal){
	  $scope.reportModal = modal;
	  var modalScope = modal.scope;
	  //configure modalScope
	  modalScope.close = function(){
		  modal.hide().then(function(){
			  modalScope.project = null;
		  });
	  };
	  
	  modalScope.reportChanged = function(){
		  modalScope.reportName = modalScope.project.name + ' - ' + modalScope.selectedReport.name;
		  modalScope.generatedReport = null;
		  
		  generateReport.fn(modalScope.project, modalScope.selectedReport).then(function(report){
			  modalScope.generatedReport = report;
		  });
	  };
	  
	  //open report
	  modalScope.viewReport = function(){
	  	var ref = window.open("data:application/octet-stream;base64," + modalScope.generatedReport.data, '_blank', 'location=no');
		ref.addEventListener('loadstop', function(){
			modalScope.close();
		});
	  };
	  
	  modalScope.emailReport = function(){
		  var emailComposer = cordova.require('emailcomposer.EmailComposer')

		  emailComposer.show({
		    subject: modalScope.reportName,
		    isHtml: true,
		    attachments: [
		     {
		        mimeType: 'application/msword',
		        encoding: 'Base64',
		        data: modalScope.generatedReport.data,
		        name: modalScope.reportName + '.doc'
		      }
		    ],
		    onSuccess: function (winParam) { 
		      //console.log('EmailComposer onSuccess - return code ' + winParam.toString());
		    },
		    onError: function (error) {
		      //console.log('EmailComposer onError - ' + error.toString());
		    }
		  });
	  };
  });
  $scope.downloadDialog = function(project){
	  //check to ensure reports are configured
  	if(!$scope.reports || $scope.reports.length < 1){
  		$ionicPopup.alert({
  			title: "Error",
  			subTitle: "No reports set up!  You'll need at least one to generate a report (obvi)."
  		});
  		return;
  	}  
	  //configure scope again
	  $scope.reportModal.scope.project = project;
	  $scope.reportModal.scope.reports = $scope.reports;
	  $scope.reportModal.scope.selectedReport = $scope.reports[0];
	  $scope.reportModal.scope.reportName = project.name + ' - ' + $scope.reports[0].name;
	  
	  //console.log($scope.reportModal.scope.project);
	  //console.log($scope.reportModal.scope.selectedReport);
	  
	  //generate default report
	  generateReport.fn($scope.reportModal.scope.project, $scope.reportModal.scope.selectedReport).then(function(report){
		  //console.log('gened');
		  $scope.reportModal.scope.generatedReport = report;
	  });
	  
	  $scope.reportModal.show().then(function(){
	  	
	  });
  };
  $scope.downloadReport = function (report, project) {
      var modalInstance = $modal.open({
        templateUrl: 'Download-Content.html',
        controller: ReportModalInstanceCtrl,
        resolve: {
          report: function () {
            return report;
          },
          project: function(){
              return project;
          }
        }
      });
  };
  
  var ReportModalInstanceCtrl = function ($scope, $modalInstance, generateReport, report, project) {
    $scope.status = 'Generating Report...';
	generateReport.fn(project, report).then(function(finalReport){
		//console.log(finalReport);
		$scope.report = finalReport;
		$scope.status = 'Report Ready for Download'; 
	});
    
    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
  };
})
.controller('projectPageController', function($scope, $stateParams, $q, $timeout, $ionicModal, $ionicPopup, $ngPouch, $user, $ionicTabsDelegate) {
	//console.log($ionicTabsDelegate);
	//console.log($scope);
	//object for managing view state
	$scope.view = {};

    var projectId = $stateParams.projectId;

    //----------CRUD OPERATIONS----------//  
    //GET project for page display
	var options = {
		startkey: [projectId,0, "0"],
		endkey: [projectId,9, "9"]
	};
	
    $ngPouch.mapCollection("projects/packaged", options).then(function(result){
		//console.log(result);
		//get project
		$scope.project = result.docs[0];
		result.docs.splice(0,1);//slice off this one
		//get components
		$scope.components = result.docs;
		//active first tab
		$scope.view.activeLibrary = $scope.project.libraries[0];
    });

	var componentSchemasByLibrary;
	//use these later
    $ngPouch.db.query("componentSchemas/forLibraryId").then(function(result){
		//console.log("component Schemas");
		//componentSchemas for add new
		var docs = _.pluck(result.rows, 'value');
		//console.log(docs);
		componentSchemasByLibrary = _.groupBy(docs, 'libraryId');
		//console.log(componentSchemasByLibrary);
    });
	
	//updates view based on new info (added/removed components, different grouping scheme, etc.)
	$scope.updateView = function(){
		$scope.view.groups = {};
		var byLibrary = _.groupBy($scope.components, "libraryId");
		for(var prop in byLibrary){
			var library = _.findWhere($scope.project.libraries, {_id: prop});

			//console.log("groupBy: " + $user.settings.groupBy);
			var tags = _.uniq(_.pluck(byLibrary[prop], $user.settings.groupBy));
			$scope.view.groups[prop] = [];
			//console.log("by library");
			////console.log(byLibrary[prop]);
			for(var i = 0; i<tags.length;i++){
				var components = _.filter(byLibrary[prop], function(component){ return component[$user.settings.groupBy] === tags[i] });
				//var components = _.where(byLibrary[prop], {space:tags[i]});
				//console.log("components");
				//console.log(components);
				$scope.view.groups[prop].push({
					name: tags[i],
					components: components
				});
			}
		}
		//console.log("grouped output");
		
		//console.log($scope.view.groups);
	
	};
	//update view on add/remove item in collection
	$scope.$watchCollection('components', $scope.updateView);
	//update on groupBy change
	$scope.$watch(function(){return $user.settings.groupBy;}, $scope.updateView);
	
	/*--VIEW OPERATIONS--*/
	
	$scope.saveComponent = function(){
  	  if(($scope.view.activeLibrary && $scope.view.activeLibrary.tag === 'Descriptive') || $scope.view.activeLibrary === 'notes'){
  		  //create copy
  		  var projectCopy = angular.copy($scope.project);
  		  //strip out selected components
  		  for(var i = 0; i < projectCopy.libraries.length; i++){
  			  delete projectCopy.libraries[i].selected;
  		  }
  		  projectCopy.save().then(function(data){
  	          $scope.view.status = 'Saved!';
  			  //console.log("project saved!");
  			  //console.log($scope.project)
  		  });
  	  } else if($scope.view.activeLibrary){
  	      $scope.view.activeLibrary.selected.save().then(function(){    
  	          $scope.view.status = 'Saved!';
  			  //console.log("component saved!");
  	      }); 
  	  }
	};
	
	//delete component
	$scope.deleteComponent = function(component){
  	  var promise = $ionicPopup.confirm({
  		  title:"Confirm Delete",
  		  subTitle: "Are you sure you want to delete " + component.name + "?"
  	  });
	  promise.then(function(result){
		  if(result){ 
  		    component.remove().then(function(){
  				delete $scope.view.activeLibrary.selected;
  			    //console.log("saved!");
  		    }, function(){
  		    	//console.log("ERROR SAVING");
  		    }); 
		  }
	  });
	};
	
	//copy component
	$scope.copyComponent = function(){
		//if there's no component selected
		if(!$scope.view.activeLibrary.selected){
			return;
		}
	    //ok, we've got a component selected, lets copy!
		var copy = angular.copy($scope.view.activeLibrary.selected);
		//strip db identifiers
		delete copy._id;
		delete copy._rev;
		//strip out digits
		copy.name = copy.name.replace(/(\d+)/g,"");
	    //more regex
		var regex = new RegExp(copy.name.trim()+"\\s*\\d*");
		//console.log("existing components");
		var maxName = _.max($scope.components, function(component){			
			if(component.libraryId === $scope.view.activeLibrary._id){
				//console.log(regex);
				//console.log(component.name.search(regex));
				if(component.name.search(regex) !== -1){
					var str = component.name.match(/\d*$/);
					//console.log(str);
					if(str[0]){
						//console.log(parseInt(str[0]));
						return parseInt(str[0]);
					}else{
						return 0;
					}
				
				}else{
					return 0;
				}
			}else{
				return 0;
			}
		});
		//console.log("next");
		//console.log(maxName);
		var strNumber = maxName.name.match(/\d*$/)[0];
		var nextNumber;
		if(strNumber){
			nextNumber = parseInt(strNumber) + 1;
		}else{
			nextNumber = 1;
		}
		//console.log(nextNumber);
		copy.name = copy.name + " " + nextNumber;
		//console.log(copy);
	    //save doc to db
		$ngPouch.doc(copy).then(function(newComponent){
			console.log("saved");
			
			if(newComponent.libraryId === $scope.view.activeLibrary._id){
				console.log("set selected");
				$timeout(function(){
					$scope.view.activeLibrary.selected = _.findWhere($scope.components, {_id:newComponent._id});
				}, 50);
				
			}
			
			
		}, function(){
			//console.log("ERROR SAVING - copy");
		});
	};

   //----------MODAL OPERATIONS----------//  
   //ADD NEW
   $ionicModal.fromTemplateUrl('AddNew-Content.html', {}).then(function(modal) {
   	$scope.addNewModal = modal;
 	//configure modalScope
 	var modalScope = $scope.addNewModal.scope;
	
	modalScope.name = function(schema){
		modalScope.newItem.name = schema.name;
	};
	
 	modalScope.close = function(){
 		$scope.addNewModal.hide().then(function(){
 			//clean modal scope
 			delete modalScope.newItem;
 			delete modalScope.view;
 			delete modalScope.itemToUpdate;
 		});
		
 	};
 	modalScope.ok = function(){
 		var newItem = modalScope.newItem;
		
         if(!modalScope.view.existing && !modalScope.itemToUpdate){//if new
	         $scope.project.defaultSpace = newItem.space;
		   	  newItem.tag = newItem.schema.tag;
    
		         //clean up component schema
		   	  newItem.schema.type = $scope.view.activeLibrary.tag;
		   	  delete newItem.schema._rev;
		   	  delete newItem.schema.channels;
		   	  delete newItem.schema.tag;
  
		   	  //configure document
		   	  newItem.type = "component";
		   	  newItem.channels = ["public"];
		   	  newItem.projectId = $scope.project._id;
			  newItem.values = {};
  
		   	  //move these forward for easy access
		   	  newItem.libraryId = newItem.schema.libraryId;
		   	  newItem.schemaId = newItem.schema._id;
		   	  delete newItem.schema.libraryId;
		   	  delete newItem.schema._id; 	
			  
			  //SAVE
  		      var now = new Date();
  		      newItem.created = now.toISOString();
  			  newItem.updated = now.toISOString();
              $ngPouch.db.post(newItem).then(function(data){
  				//console.log("item saved");
              	//console.log(data);
				
				$timeout(function(){
					
					var newComponent = _.findWhere($scope.components, {_id:data.id});
					if(newComponent.libraryId === $scope.view.activeLibrary._id){
						//console.log("set selected");
						$scope.view.activeLibrary.selected = newComponent;
					}
				});
				
						
              },function(err){
  				//error handling goes here
              });		
         }else{//existing
             //console.log('update!');
			 
 			modalScope.itemToUpdate.name = newItem.name;
 			modalScope.itemToUpdate.space = newItem.space;
			//console.log(modalScope.itemToUpdate);
             modalScope.itemToUpdate.save().then(function() {            
				 //console.log("saved");
				 $scope.updateView();
				 //console.log($scope.components);
             }, function() {
                 //console.log("error");
             }); 
         }
		
 		$scope.addNewModal.hide().then(function(){
 			//clean modal scope
 			delete modalScope.newItem;
 			delete modalScope.view;
 			delete modalScope.itemToUpdate;
 		});
 	};
	
   });
   $scope.dialogOpen = function(itemToUpdate){	  
 	//configure modal scope
 	var modalScope = $scope.addNewModal.scope;
	
 	//view object
 	modalScope.view = {};
	
 	//get component Schemas
	//need to funky sort this list (thanks Mike)
 	modalScope.schemas = _.sortBy(componentSchemasByLibrary[$scope.view.activeLibrary._id], 'tag');
	//get existing spaces
	modalScope.spaces = _.uniq(_.pluck($scope.components, 'space'));
	
 	modalScope.newItem = {};
	
 	//if new
 	if(!itemToUpdate){
 		modalScope.title = "Add New Component";
 		modalScope.view.existing = false;
 		//default behaviour
	    //set up default space
	    if($scope.project.defaultSpace){
	        modalScope.newItem.space = $scope.project.defaultSpace;
	    }
 	}else{
 		modalScope.title = "Edit " + itemToUpdate.name;
 		modalScope.newItem.name = itemToUpdate.name;
 		modalScope.newItem.space = itemToUpdate.space;
 		modalScope.itemToUpdate = itemToUpdate;
 		modalScope.view.existing = true; 
 	}
	
    
	
 	//lets actually open it up
 	$scope.addNewModal.show().then(function(){
 		modalScope.view.firstFocus = true;
 	});
   };
   //Cleanup the modals when we're done with it!
   $scope.$on('$destroy', function() {
     $scope.addNewModal.remove();
   });    
   

  //SAVE TO TEMPLATE
  $scope.saveAsTemplate = function(){
  	  var modalInstance = $modal.open({
		  templateUrl: 'save-as-template.html',
		  controller: SaveAsTemplateInstanceCtrl,
  	  });
  
	  modalInstance.result.then(function(nameTag){
		  //make async, this could take a while
	  
		  $scope.view.showStatus = true;
		  $scope.view.status = "Saving...";
		  var template = angular.copy($scope.project);
		  //set up template
		  template.name = nameTag.name;
		  template.tag = nameTag.tag;
		  template.type = "template";
		  delete template._id;
		  delete template._rev;
	  
  		  //strip functions
  		  var functions = _.functions(template);
  		  for(var i = 0; i < functions.length; i++){
  			  delete template[functions[i]];
  		  }	
	  
		  var promises = [];
		  $ngPouch.doc(template).then(function(doc){
		  
			  //console.log("saved doc");
			  //console.log(doc);
			  for(var i = 0; i < $scope.components.length; i++){
				  var component = angular.copy($scope.components[i]);
				  //clean up component
				  delete component._id;
				  delete component._rev;
			  
		  		  //strip functions
		  		  var functions = _.functions(component);
		  		  for(var i = 0; i < functions.length; i++){
		  			  delete component[functions[i]];
		  		  }	
			  
				  //assign new projectId
				  component.projectId = doc._id;
				  //console.log(component);
				  //save to db
				  promises.push($ngPouch.doc(component));
			  }
			  //resolve promises
			  $q.all(promises).then(function(results){
			  	$scope.view.status = "Saved!";
			  }, function(){
				  //error handling
			  });
		  });
	  });
  };
  var SaveAsTemplateInstanceCtrl = function($scope, $modalInstance){
	  $scope.newItem = {};
  
	  var query = {
		  map:function(doc,emit){
			  if(doc.type === 'template' && _.contains(doc.channels, "public")){
				  emit(doc.tag, null);
			  }
		  },
		  reduce: function(key, values){
			  return true;
		  }
	  };
	  $ngPouch.db.query(query, {group:true}, function(err, response){
		  $scope.tags = _.pluck(response.rows, "key");
	  });
  
      $scope.ok = function () {        
        $modalInstance.close($scope.newItem);
      };
      $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
      };
  
  };
	
	
	
})
.controller('componentTabController', function($scope, $stateParams, $q, $timeout, $ionicModal, $ionicPopup, $ngPouch, $ionicTabsDelegate){
	
	
	/*--VIEW OPERATIONS--*/

	$scope.setActiveComponent = function(component){
		$scope.tab.selected = component;
	};
	
    //save active component
    $scope.saveComponent = function(){
	  if(($scope.library && $scope.library.tag === 'Descriptive')){
		  //just save the project, since that's where the values live
		  $scope.saveProject();
	  } else if($scope.library){
	      $scope.tab.selected.save().then(function(){
			  //console.log("component saved!");
	      }); 
	  }
    };
	
	//delete component
	$scope.deleteComponent = function(){
  	  var promise = $ionicPopup.confirm({
  		  title:"Confirm Sync",
  		  subTitle: "Are you sure you want to delete " + $scope.tab.selected.name + "?"
  	  });
	  promise.then(function(result){
		  if(result){ 
  		    $scope.view.activeLibrary.selected.remove().then(function(){
  				delete $scope.tab.selected;
  			    //console.log("saved!");
  		    }, function(){
  		    	//console.log("ERROR SAVING");
  		    }); 
		  }
	  });
	};
	
	//copy component
	$scope.copyComponent = function(){
		//if there's no component selected
		if(!$scope.tab.selected){
			return;
		}
	    //ok, we've got a component selected, lets copy!
		var copy = angular.copy($scope.view.activeLibrary.selected);
		//strip db identifiers
		delete copy._id;
		delete copy._rev;
		//strip out digits
		copy.name = copy.name.replace(/(\d+)/g,"");
	    //more regex
		var regex = new RegExp(copy.name.trim()+"\\s*\\d*");
		//console.log("existing components");
		var maxName = _.max($scope.components, function(component){			
			if(component.libraryId === $scope.view.activeLibrary._id){
				//console.log(regex);
				//console.log(component.name.search(regex));
				if(component.name.search(regex) !== -1){
					var str = component.name.match(/\d*$/);
					//console.log(str);
					if(str[0]){
						//console.log(parseInt(str[0]));
						return parseInt(str[0]);
					}else{
						return 0;
					}
				
				}else{
					return 0;
				}
			}else{
				return 0;
			}
		});
		//console.log("next");
		//console.log(maxName);
		var strNumber = maxName.name.match(/\d*$/)[0];
		var nextNumber;
		if(strNumber){
			nextNumber = parseInt(strNumber) + 1;
		}else{
			nextNumber = 1;
		}
		//console.log(nextNumber);
		copy.name = copy.name + " " + nextNumber;
		//console.log(copy);
	    //save doc to db
		$ngPouch.doc(copy).then(function(){
			//console.log("saved");
		}, function(){
			//console.log("ERROR SAVING - copy");
		});
	};

   //----------MODAL OPERATIONS----------//  

   //ADD NEW
  $scope.addNewDialogOpen = function () {
      var modalInstance = $modal.open({
          templateUrl: 'AddNew-Content.html',
          controller: ModalInstanceCtrl,
          resolve: {
            project: function () {
              return $scope.project;
            },
            library: function () {
              return $scope.view.activeLibrary;
            },
			components:function(){
				return $scope.components;
			},
			componentSchemas:function(){
				//console.log("---here---");
				//console.log(componentSchemasByLibrary[$scope.view.activeLibrary._id]);
				return componentSchemasByLibrary[$scope.view.activeLibrary._id];
			}
          }
        });

      modalInstance.result.then(function (newItem) { 
		    var now = new Date();
		    newItem.created = now.toISOString();
			newItem.updated = now.toISOString();
            $ngPouch.db.post(newItem).then(function(data){
				//console.log("item saved");
            	//console.log(newItem);		
            },function(err){
				//error handling goes here
            });
        });
  };
  var ModalInstanceCtrl = function ($scope, $modalInstance, $ngPouch, project, library, components, componentSchemas) {
    //CONFIGURE spaces for type ahead
    var spaces = _.pluck(components, 'space');
    $scope.spaces = _.uniq(spaces);

    //new item, configure defaults - we're not doing edit via dialog for this screen
    $scope.newItem = {};
    $scope.newItem.values = {};

    //GET components in library
	$scope.components = componentSchemas;
	$scope.newItem.schema = $scope.components[0];
	$scope.newItem.name  = $scope.components[0].name;

	$scope.view = {};//configure the view object, temp storage for view variables

    $scope.mode = 'Add New Component';
    //set up default space
    if(project.defaultSpace){
        $scope.newItem.space = project.defaultSpace;
    }

    $scope.ok = function () {
      //console.log("ok");
  
      project.defaultSpace = $scope.newItem.space;
	  $scope.newItem.tag = $scope.newItem.schema.tag;
    
      //clean up component schema
	  $scope.newItem.schema.type = library.tag;
	  delete $scope.newItem.schema._rev;
	  delete $scope.newItem.schema.channels;
	  delete $scope.newItem.schema.tag;
  
	  //configure document
	  $scope.newItem.type = "component";
	  $scope.newItem.channels = ["public"];
	  $scope.newItem.projectId = project._id;
  
	  //move these forward for easy access
	  $scope.newItem.libraryId = $scope.newItem.schema.libraryId;
	  $scope.newItem.schemaId = $scope.newItem.schema._id;
	  delete $scope.newItem.schema.libraryId;
	  delete $scope.newItem.schema._id;
  
	  $modalInstance.close($scope.newItem);
    };
    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
  };
 
  //EDIT
  $scope.editDialogOpen = function(component){
      var modalInstance = $modal.open({
          templateUrl: 'Edit-Content.html',
          controller: EditInstanceCtrl,
          resolve: {
            project: function () {
              return $scope.project;
            },
            component: function () {
              return component;
            }
          }
        });
        modalInstance.result.then(function () {
			$scope.view.showStatus = true;
			$scope.view.status = "Saving..."; 
            component.save().then(function(){
				$scope.view.status = "Saved!";
				//console.log("saved!");
            });
        });
  };
  var EditInstanceCtrl = function ($scope, $modalInstance, project, component) {
    //CONFIGURE spaces for type ahead
    var spaces = [];
    for(var i = 0;i < project.libraries.length;i++){
        spaces.push(_.pluck(project.libraries[i].components, 'space'));
    }
    $scope.spaces = _.uniq(_.flatten(spaces));

    //configure local defaults - we'll apply this back to the orginal object on OK
    $scope.newItem = {
        name: component.name,
        space: component.space
    };

    $scope.mode = 'Edit ' + component.name;

    $scope.ok = function () {
      component.name = $scope.newItem.name;
      component.space = $scope.newItem.space;        
      $modalInstance.close();
    };
    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
  };

  //SAVE TO TEMPLATE
  $scope.saveAsTemplate = function(){
  	  var modalInstance = $modal.open({
		  templateUrl: 'save-as-template.html',
		  controller: SaveAsTemplateInstanceCtrl,
  	  });
  
	  modalInstance.result.then(function(nameTag){
		  //make async, this could take a while
	  
		  $scope.view.showStatus = true;
		  $scope.view.status = "Saving...";
		  var template = angular.copy($scope.project);
		  //set up template
		  template.name = nameTag.name;
		  template.tag = nameTag.tag;
		  template.type = "template";
		  delete template._id;
		  delete template._rev;
	  
  		  //strip functions
  		  var functions = _.functions(template);
  		  for(var i = 0; i < functions.length; i++){
  			  delete template[functions[i]];
  		  }	
	  
		  var promises = [];
		  $ngPouch.doc(template).then(function(doc){
		  
			  //console.log("saved doc");
			  //console.log(doc);
			  for(var i = 0; i < $scope.components.length; i++){
				  var component = angular.copy($scope.components[i]);
				  //clean up component
				  delete component._id;
				  delete component._rev;
			  
		  		  //strip functions
		  		  var functions = _.functions(component);
		  		  for(var i = 0; i < functions.length; i++){
		  			  delete component[functions[i]];
		  		  }	
			  
				  //assign new projectId
				  component.projectId = doc._id;
				  //console.log(component);
				  //save to db
				  promises.push($ngPouch.doc(component));
			  }
			  //resolve promises
			  $q.all(promises).then(function(results){
			  	$scope.view.status = "Saved!";
			  }, function(){
				  //error handling
			  });
		  });
	  });
  };
  var SaveAsTemplateInstanceCtrl = function($scope, $modalInstance){
	  $scope.newItem = {};
  
	  var query = {
		  map:function(doc,emit){
			  if(doc.type === 'template' && _.contains(doc.channels, "public")){
				  emit(doc.tag, null);
			  }
		  },
		  reduce: function(key, values){
			  return true;
		  }
	  };
	  $ngPouch.db.query(query, {group:true}, function(err, response){
		  $scope.tags = _.pluck(response.rows, "key");
	  });
  
      $scope.ok = function () {        
        $modalInstance.close($scope.newItem);
      };
      $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
      };
  
  };
});