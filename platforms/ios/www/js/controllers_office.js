'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
.controller('librariesController', ['$scope', '$modal','$ngPouch',function($scope, $modal, $ngPouch) {
    $scope.status = 'Loading';
    $scope.showStatus = true;
           
    //----------CRUD OPERATIONS----------//
        
    //GET items and watch tags  

    $ngPouch.mapCollection("libraries/all").then(function(libraries) {
        $scope.items = libraries.docs;
        $scope.showStatus = false;
        console.log(libraries);        
    });
	
    var tag = function(item){return item.tag;};
    $scope.$watch('[items]', function () { 
        $scope.tags = _.map(_.uniq($scope.items,tag),tag);        
    }, true);
    
    //UPDATE ITEM
    
    $scope.updateItem = function(id){
        var item = _.findWhere($scope.items, {_id:id});
        $scope.addNewDialogOpen(item);
    };
    
    //DELETE item
    $scope.deleteItem = function(id){	
      var item = _.findWhere($scope.items, {_id:id});	  
	  var result = confirm("Are you sure you want to delete: " + item.name, "Confirm Deletion");
	  if(result){
	      $scope.status = 'Saving...';
	      $scope.showStatus = true;
		  var options = {
			  startkey:[id, "0"],
			  endkey:[id, "9"]
		  };
		  //get all the docs to delete
		  $ngPouch.db.query("componentSchemas/forLibraryId", options).then(function(result){
			  var components = _.pluck(result.rows, "value");
			  for(var i = 0; i < components.length; i++){
				  components[i]._deleted = true;
			  }	
			  if(components.length > 0){
				  $ngPouch.bulkDocs({docs:components}).then(function(data){
				  });
			  }
			  item.remove().then(function(data){
		          $scope.status = 'Saved!';
		          $scope.showStatus = true;
			  });
			  
		  });
	  }
    };
  
  //VIEW OPERATIONS      
  $scope.setTag = function(tag){
      $scope.selectedTag = tag;
  };
  
  //Modal Controls
  $scope.addNewDialogOpen = function (itemToUpdate) {

    var modalInstance = $modal.open({
      templateUrl: 'AddNew-Content.html',
      controller: ModalInstanceCtrl,
      resolve: {
        tags: function () {
          return $scope.tags;
        },
        item: function(){
            return itemToUpdate;
        }
      }
    });

    modalInstance.result.then(function (newItem) {
        $scope.status = 'Saving...';
        $scope.showStatus = true;       
            
        if(newItem._id === undefined){//if new  
            console.log('NEW!'); 
			newItem.channels = ["public"];   
			newItem.type = "library";  
			var today = new Date(); 
			newItem.created = today.toISOString();
            $ngPouch.db.post(newItem).then(function(data) { 
                $scope.status = 'Saved!';
                $scope.showStatus = true;
				console.log(data);
            }, function() {
                $scope.status = 'Error :(';
                $scope.showStatus = true;
            }); 
        } 
        else{
            console.log('update!');
            newItem.save().then(function() {            
                $scope.status = 'Saved!';
                $scope.showStatus = true;
            }, function() {
                $scope.status = 'Error :(';
                $scope.showStatus = true;
            }); 
        }
    });
  };

  var ModalInstanceCtrl = function ($scope, $modalInstance, tags, item) {
    if(item === undefined){//if new item, configure defaults
        $scope.newItem = {tag:"Descriptive"};
        item = {};//instantiate return object
        console.log('new item');
        $scope.mode = 'Add New Library';
    }
    else{//else configure scope for editing
        $scope.newItem = {_id: item._id, name:item.name, tag: item.tag};
        console.log('existing');
        $scope.mode = 'Edit ' + item.name + ' Library';

    }
      
    $scope.ok = function () {
      item.name = $scope.newItem.name;
      item.tag = $scope.newItem.tag;
      $modalInstance.close(item);
    };
    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
  };
 
}])//Libraries Controller
.controller('libraryComponentsController', ['$scope', '$modal','$routeParams','$ngPouch', '$q',function($scope, $modal, $routeParams,$ngPouch, $q) {
    
    var libraryId = $routeParams.libraryId;

    $scope.status = 'Loading';
    $scope.showStatus = true;
           
    //----------CRUD OPERATIONS----------//   
    
    //GET items and watch tags   
	var schemasOptions = {
		startkey: [libraryId,0],
		endkey: [libraryId,9]
	};
	
    $ngPouch.mapCollection("libraries/packaged", schemasOptions).then(function(results){
		console.log(results);
    	var everything = results.docs
		$scope.library = everything[0];
		
		everything.splice(0,1);
		$scope.items = everything;//components + lookuptables
		
		$scope.showStatus = false; 
		$scope.loaded = true;
    });
    
    var tag = function(item){return item.tag;};
    $scope.$watch('[items]', function () { 
        $scope.tags = _.map(_.uniq($scope.items,tag),tag);
    }, true);
    
    //UPDATE ITEM
    
    $scope.updateItem = function(id){
        var item = _.findWhere($scope.items, {_id:id});
        $scope.addNewDialogOpen(item);
    };
    
    //DELETE item
    $scope.deleteItem = function(id){
      var item = _.findWhere($scope.items, {_id:id});
	  var result = confirm("Are you sure you want to delete: " + item.name +"?");
	  if(result){
	      $scope.status = 'Saving...';
	      $scope.showStatus = true; 
	      item.remove().then(function(){
	          $scope.status = 'Saved!';
	          $scope.showStatus = true;
	      });
	  }
    };
  
  //VIEW OPERATIONS      
  $scope.setTag = function(tag){
      $scope.selectedTag = tag;
  };
  
  //Modal Controls
  $scope.addNewDialogOpen = function (itemToUpdate) {

    var modalInstance = $modal.open({
      templateUrl: 'AddNew-Content.html',
      controller: ModalInstanceCtrl,
      resolve: {
        tags: function () {
          return $scope.tags;
        },
        item: function(){
            return itemToUpdate;
        }
      }
    });

    modalInstance.result.then(function (newItem) {
        $scope.status = 'Saving...';
        $scope.showStatus = true;       
            
        if(newItem._id === undefined){//if new  
            console.log('NEW!');
            //POST new  
            newItem.libraryId = libraryId;//set 
            newItem.sections = []; //set up sections to add inputs later
			newItem.type = 'componentSchema';
			newItem.channels = ['public'];//add channel access
            
            $ngPouch.doc(newItem).then(function(doc) {
                $scope.status = 'Saved!';
                $scope.showStatus = true;
            }, function(err) {
                $scope.status = 'Error :(';
                $scope.showStatus = true;
            });
        } 
        else{  //REPLACE EXISTING
			
            console.log('update!');
            newItem.save().then(function() {            
                $scope.status = 'Saved!';
                $scope.showStatus = true;
            }, function() {
                $scope.status = 'Error :(';
                $scope.showStatus = true;
            }); 
        }
    });
  };

  var ModalInstanceCtrl = function ($scope, $modalInstance, tags, item) {
    
    $scope.tags = tags;//For typeahead
      
    if(item === undefined){//if new item, configure defaults
        $scope.newItem = {};
        item = {};//instantiate return object
        console.log('new item');
        $scope.mode = 'Add New Component';
    }
    else{//else configure scope for editing
        $scope.newItem = {_id: item._id, name:item.name, tag: item.tag};
        console.log('existing');
        $scope.mode = 'Edit ' + item.name;

    }
      
    $scope.ok = function () {
      item.name = $scope.newItem.name;
      item.tag = $scope.newItem.tag;
      $modalInstance.close(item);
    };
    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
  };
 
}])//libraryComponentsController
//-----libraryINPUTSController
.controller('libraryInputsController', ['$scope', '$modal','$routeParams','$ngPouch', '$q',function($scope, $modal, $routeParams,$ngPouch, $q) {
    
    $scope.status = 'Loading';
    $scope.showStatus = true;
    console.log($scope.selectedInput);
    $scope.sectionOptions = {
        axis: 'y',
        disabled: true
    };
    $scope.inputOptions = {
        axis:'y',
        connectWith:'.list-group',
        disabled: true
    };
	
    //----------CRUD OPERATIONS----------//
    var schemaId = $routeParams.componentId;
	var libraryId = $routeParams.libraryId;
    //GET Component for page display
	var promises = [];
    //GET items and watch tags   
	var schemasOptions = {
		startkey: [libraryId,0, "0"],
		endkey: [libraryId,9, "9"]
	};
	
    promises.push($ngPouch.mapCollection("libraries/designPackage", schemasOptions));//library and lookuptables
	promises.push($ngPouch.docFromId(schemaId));//get componentSchema
	$q.all(promises).then(function(results){
		$scope.library = results[0].docs[0];//assign library
		results[0].docs.splice(0,1);
		$scope.lookupTables = results[0].docs;//assign lookup tables
		$scope.component = results[1];//assign component
		//add in a custom lookup table to the mix
        var customOption = {'name':'Custom', '_id':'Custom'};
        $scope.lookupTables.push(customOption);
		//and we're loaded up!
		$scope.loaded = true;
		$scope.showStatus = false;
	});
	    
    //SAVE ITEM
    $scope.saveComponent = function(){
        $scope.status = 'Saving';
        $scope.showStatus = true;

        $scope.component.save().then(function(component) {
            $scope.status = 'Saved!';
        }, 
        function() {
            $scope.status = 'Error';
        });
    };
    
    //DELETE item
    $scope.deleteInput = function(){
      var response = confirm('Are you sure you want to delete ' + $scope.selectedInput.name + '?');   
      if (response) {
        $scope.status = 'Saving...';
        $scope.showStatus = true; 
        //remove from view
		
        for (var i=0;i<$scope.component.sections.length;i++){
            $scope.component.sections[i].inputs = _.without($scope.component.sections[i].inputs, $scope.selectedInput);
            
            if($scope.component.sections[i].inputs.length === 0){
                $scope.component.sections = _.without( $scope.component.sections, $scope.component.sections[i]);
            }
        }
		
        delete $scope.selectedInput;
        $scope.saveComponent();
      }
      
      
      
    };
  
  //Modal Controls
  $scope.lookupTableDialogOpen = function(){
      var modalInstance = $modal.open({
      templateUrl: 'partials/lookupDialog.html',
      controller: 'lookupDialogController',
      resolve: {
        input: function () {
          return $scope.selectedInput;
        },
        lookupTable:function(){
            if($scope.selectedInput.lookupTableId !== 'Custom'){
                //If using library lookup tables, send that over to dialog
                var tables =  _.filter($scope.lookupTables, function(table){ 
                    return table._id.$id == $scope.selectedInput.lookupTableId; 
                });
                
                return tables[0];
            }
            else{
                //if using lookuptable attached to input, send that over
                console.log('using custom');
                if($scope.selectedInput.lookupTable){delete $scope.selectedInput.lookupTable._id;}
                return $scope.selectedInput.lookupTable;
            }            
        },
        libraryId: function () {
          return libraryId;
        }
      }
    });

    modalInstance.result.then(function (response) {
        console.log('in result');
        if(response){
            if(response.newLibraryLookupTable){
                $scope.lookupTables.splice($scope.lookupTables.length - 1,0,response.newLibraryLookupTable);
                if(response.setAsId){                
                    $scope.selectedInput.lookupTableId = response.newLibraryLookupTable._id.$id;   
                }                     
            }
            console.log('Deleted lookup table');
            console.log(response.deletedLibraryLookupTable);
            if(response.deletedLibraryLookupTable){
                $scope.lookupTables = _.filter($scope.lookupTables, function(table){ 
                        return table.hasOwnProperty('_id');
                    });

                console.log($scope.lookupTables);
            }
            console.log($scope.lookupTables);
        }
        
        $scope.saveComponent();
    });
  };
  
  
  $scope.addNewDialogOpen = function () {

    var modalInstance = $modal.open({
      templateUrl: 'AddNew-Content.html',
      controller: ModalInstanceCtrl,
      resolve: {
        sections: function () {
          return $scope.component.sections;
        }
      }
    });

    modalInstance.result.then(function (newItem) {
        $scope.status = 'Saving...';
        $scope.showStatus = true;       
        console.log('NEW!');        
        //Add new input to defined section
        var section = _.findWhere($scope.component.sections, {'name':newItem.section});
        
        //set defaults for new input
        var newInput = {};
        newInput.name = newItem.name;
        newInput.lookupTableId = "None";
        newInput.restricted = 0;
        newInput.alias = newItem.name.replace(/ /g,'').toUpperCase();
		newInput.keyboard = 'text';        
        
        if(section){
            //Set default properties if existing
            section.inputs.push(newInput);
            
        }
        else{//new section
            var newSection = {'name':newItem.section};
            newSection.inputs = [];
            newSection.inputs.push(newInput);            
            $scope.component.sections.push(newSection);            
        }
        
        
        //Save component back to server
        $scope.saveComponent();
        
        //activate this input
        $scope.selectedInput = newInput;
        
    });
  };

  var ModalInstanceCtrl = function ($scope, $modalInstance, sections) {    
    $scope.sections = _.pluck(sections, 'name');//For typeahead
    //new item, configure defaults - we're not doing edit via dialog for this screen
    $scope.newItem = {};    
    console.log('new input');    
    $scope.mode = 'Add New Input';          
    $scope.ok = function () {      
      $modalInstance.close($scope.newItem);
    };
    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
  };
 
}])
.controller('lookupDialogController', ['$scope', '$modalInstance', '$ngPouch','input','lookupTable', 'libraryId',function($scope, $modalInstance,$ngPouch, input, lookupTable,libraryId) {
            
    $scope.librarySave = {'status':'Add To Library'};
    $scope.libraryDelete = {'status':'Delete From Library'};
     var newLibraryLookupTable;
     var deletedLibraryLookupTable;
     
     console.log(lookupTable);
     
    //if existing lookup table
    if(lookupTable){
        $scope.lookupTable = lookupTable;
        if(lookupTable._id){
            $scope.librarySave.status = "Save To Library";
        }
        
    }
    else{
         //If new table
        $scope.lookupTable = {};
        $scope.lookupTable.name = 'Click to Change Lookup Table Name';
        $scope.lookupTable.tag = 'Lookup Table';
        $scope.lookupTable.xConditions = [];
        $scope.lookupTable.yConditions = [];

        //if new
        var x = new Array($scope.lookupTable.yConditions.length);
        for (var i = 0; i < x.length; i++) {
          x[i] = new Array($scope.lookupTable.xConditions.length);
        }

        $scope.lookupTable.optionCells = x;

        //Initialize new conditions
        $scope.newXCondition = '';
        $scope.newYCondition = '';
    }               
    
    //add New
    $scope.addNewColumn = function(){
      $scope.lookupTable.xConditions.push($scope.newXCondition);
      $scope.newXCondition = ''; //Reset new condition
    };
    
    $scope.addNewRow = function(){
      $scope.lookupTable.yConditions.push($scope.newYCondition);
      $scope.lookupTable.optionCells.push(new Array($scope.lookupTable.xConditions.length));
      $scope.newYCondition = ''; //Reset new condition
    };
    
    //Delete columns and rows
    $scope.deleteColumn = function(index){
        var response = confirm('Are you sure you want to delete this column?');  
        
        if(response){
            $scope.lookupTable.xConditions.splice(index, 1);//remove from conditions
            for (var i = 0; i < $scope.lookupTable.yConditions.length; i++) {
               $scope.lookupTable.optionCells[i].splice(index, 1);//remove from each Y axis options array
            }
        }
    };
    
    $scope.deleteRow = function(index, condition){
        console.log(condition);
        var response = confirm('Are you sure you want to delete this row?');  
        
        if(response){
            $scope.lookupTable.yConditions.splice(index, 1);//remove from conditions array
            $scope.lookupTable.optionCells.splice(index, 1);//this is simpler, as we can just remove the parent array
        }
    };
    //CRUD OPERATIONS//
    $scope.saveToComponent = function () {
      
      delete $scope.lookupTable._id;
      input.lookupTableId = 'Custom';
      input.lookupTable = $scope.lookupTable;      
      $modalInstance.close(newLibraryLookupTable, false, deletedLibraryLookupTable);//we created a new library lookuptable, but we're not using it.
    };
    
    
    $scope.saveToLibrary = function () {
        console.log('firing');
      if($scope.librarySave.status === 'Use Library Lookup Table'){
          console.log('inside secondary');
          console.log(newLibraryLookupTable);
          if(!newLibraryLookupTable){//IF existing library lookuptable, just close
              console.log("existing");
              $modalInstance.close();
              return;
          }
          else{//if we just created this library lookup table, lets make it available in the inputs dropdown (by new library parameter) and set it to the user's choice (true option)
              console.log("new");
              $modalInstance.close(newLibraryLookupTable, true);
              return;
          }
          
      }          
      $scope.librarySave.status = 'Saving...';
      //Assign lookuptable to this library
      $scope.lookupTable.libraryId = libraryId;
      
      //existing lookuptable in library
      if($scope.lookupTable._id && $scope.lookupTable._rev){
          $scope.lookupTable.save().then(function(table){
              console.log("save existing");
              console.log(table);
              $scope.librarySave.status = 'Use Library Lookup Table';
          });
          
      }
      else{
		  $scope.lookupTable.type = 'lookupTable';
		  $scope.lookupTable.channel = ["public"]; 
          $ngPouch.doc($scope.lookupTable).then(function(table){
              console.log("created new");
            console.log(table);
            newLibraryLookupTable = {};
            angular.copy($scope.lookupTable, newLibraryLookupTable);
            console.log(newLibraryLookupTable);
            $scope.librarySave.status = 'Use Library Lookup Table';
            
          });  
      }
    };
    
    $scope.deleteFromLibrary = function(){
        $scope.libraryDelete.status = 'Removing...';
        $scope.lookupTable.remove().then(function(){
            console.log('deleted');
            deletedLibraryLookupTable = {};
            angular.copy($scope.lookupTable, deletedLibraryLookupTable); 
            $scope.librarySave.status = "Add To Library";
            $scope.libraryDelete.status = 'Delete from Library';
            console.log(deletedLibraryLookupTable);
        });
    };
    
    $scope.cancel = function () {
      console.log(deletedLibraryLookupTable);
      var response = {};
      response.newLibraryLookupTable = newLibraryLookupTable;
      response.setAsId = false;
      response.deletedLibraryLookupTable = deletedLibraryLookupTable;
      $modalInstance.close(response);
    };
}])
.controller('libraryLookupTableController', ['$scope', '$routeParams','$ngPouch', function($scope, $routeParams,$ngPouch) {
    //----------CRUD OPERATIONS----------//
     var lookupTableId = $routeParams.lookupTableId;
     console.log(lookupTableId);
     
    //GET Component for page display
    $ngPouch.one('lookupTables', lookupTableId).get().then(function(lookupTable){
        $scope.lookupTable = lookupTable;
        $scope.showStatus = false;
    });
    
    var libraryId = $routeParams.libraryId;
    //GET library for page display
    $ngPouch.one('libraries', libraryId).get().then(function(library){
        $scope.library = library;
    });  
    
    //UPDATE database
    $scope.save = function(){
      $scope.status = 'Saving';
        $scope.showStatus = true;

        delete $scope.lookupTable._id;
        $scope.lookupTable.put().then(function() {
            $scope.status = 'Saved!';
        }, 
        function() {
            $scope.status = 'Error';
        });  
    };
               
    
     //----------VIEW OPERATIONS----------//
     //Initialize new conditions
    $scope.newConditions = {};
    $scope.newConditions.X = '';
    $scope.newConditions.Y = '';
    
    //add New
    $scope.addNewColumn = function(){
      $scope.lookupTable.xConditions.push($scope.newConditions.X);
      $scope.newConditions.X = ''; //Reset new condition
    };
    
    $scope.addNewRow = function(){
      $scope.lookupTable.yConditions.push($scope.newConditions.Y);
      $scope.lookupTable.optionCells.push(new Array($scope.lookupTable.xConditions.length));
      $scope.newConditions.Y = ''; //Reset new condition
    };
    
    //Delete columns and rows
    $scope.deleteColumn = function(index){
        var response = confirm('Are you sure you want to delete this column?');  
        
        if(response){
            $scope.lookupTable.xConditions.splice(index, 1);//remove from conditions
            for (var i = 0; i < $scope.lookupTable.yConditions.length; i++) {
                console.log('delete');
               $scope.lookupTable.optionCells[i].splice(index, 1);//remove from each Y axis options array
            }
        }
    };
    
    $scope.deleteRow = function(index, condition){
        console.log(condition);
        var response = confirm('Are you sure you want to delete this row?');  
        
        if(response){
            $scope.lookupTable.yConditions.splice(index, 1);//remove from conditions array
            $scope.lookupTable.optionCells.splice(index, 1);//this is simpler, as we can just remove the parent array
        }
    };
    
}])
.controller('projectsController', ['$scope', '$modal','$q','$ngPouch',function($scope, $modal, $q, $ngPouch) {
    $scope.status = 'Loading';
    $scope.showStatus = true;
           
    //----------CRUD OPERATIONS----------//
        
    //GET items and watch tags
	var promises = [];

	promises.push($ngPouch.mapCollection("projects/all"));
	promises.push($ngPouch.mapCollection("reports/all"));
	$q.all(promises).then(function(results){
		$scope.items = results[0].docs; 
		$scope.reports = results[1].docs;
		//all set, lets get rolling, let the other stuff come in as it may
		$scope.showStatus = false; 
		$scope.loaded = true;
	});
	
	var secondWave = [];
	var libraries = [];
	var templates = [];
	//second wave - used for the 'Add New' Dialog
	secondWave.push($ngPouch.mapCollection("libraries/all", {descending:true}));//load these so we don't have to when we open the dialog box
	secondWave.push($ngPouch.mapCollection("templates/all"));//load these so we don't have to when we open the dialog box
	$q.all(secondWave).then(function(results){
		libraries = results[0].docs;
		templates = results[1].docs;
	});
    
    var tag = function(item){return item.tag;};
    $scope.$watch('[items]', function () { 
        $scope.tags = _.map(_.uniq($scope.items,tag),tag);
    }, true);
    
    //UPDATE ITEM    
    $scope.updateItem = function(id){
        var item = _.findWhere($scope.items, {_id:id});
        $scope.addNewDialogOpen(item);
    };
    
    //DELETE item
    $scope.deleteItem = function(id){      
      var item = _.findWhere($scope.items, {_id:id});
	  var result = confirm("Are you sure you want to delete: "+ item.name + "?");
	  var components = [];
	  if(result){
	      $scope.status = 'Saving...';
	      $scope.showStatus = true;
		  
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
		          $scope.status = 'Saved!';
		          $scope.showStatus = true;
			  });
		  
		  });
	  }
    };
  
  //VIEW OPERATIONS      
  $scope.setTag = function(tag){
      $scope.selectedTag = tag;
  };
  
  //Modal Controls
  $scope.addNewDialogOpen = function (itemToUpdate) {
    var modalInstance = $modal.open({
      templateUrl: 'AddNew-Content.html',
      controller: ModalInstanceCtrl,
      resolve: {
        tags: function () {
          return $scope.tags;
        },
        item: function(){
            return itemToUpdate;
        },
		libraries:function(){
			return libraries;
		},
		templates:function(){
			return templates;
		}
      }
    });

    modalInstance.result.then(function (newItem) {
        $scope.status = 'Saving...';
        $scope.showStatus = true;       
            
        if(newItem.template){//if new && template
            console.log('NEW!');
			var oldId = newItem._id;
			var options = {
				startkey: [oldId, "0"],
				endkey: [oldId, "9"]
			};
			
			//strip the new project
			delete newItem._id;
			delete newItem._rev;
			delete newItem.template;
			
			console.log(newItem);
			$ngPouch.db.post(newItem).then(function(result){
				var newId = result.id;
				console.log("new ID: " + newId);
				$ngPouch.db.query("components/forProjectId", options).then(function(result){
					console.log("adding components, total: " + result.rows.length);
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
					console.log("--to save--");
					console.log(components);
					$ngPouch.bulkDocs({docs:components}).then(function(){
						$scope.status = 'Saved!';
					});
				});
			});
        }
		else if(!newItem._id){//new but no template
            console.log('NEW!');            
            $ngPouch.doc(newItem).then(function(data) { 
                console.log("--response--");
                console.log(data);
                $scope.status = 'Saved!';
                $scope.showStatus = true;
            }, function() {
                $scope.status = 'Error :(';
                $scope.showStatus = true;
            });
        }
        else{
            console.log('update!');
            newItem.save().then(function() {            
                $scope.status = 'Saved!';
                $scope.showStatus = true;
            }, function() {
                $scope.status = 'Error :(';
                $scope.showStatus = true;
            }); 
        }
    });
  };

  var ModalInstanceCtrl = function ($scope, $modalInstance, tags, item, libraries, templates) {
    
    $scope.tags = tags;
    
    $scope.libraries = libraries;//assign from resolve
	$scope.templates = templates;//assing from resolve
      
    if(item === undefined){//if new item, configure defaults
        $scope.newItem = {};//instantiate return object
        console.log('new item');
        $scope.mode = 'Add New Project';
        item = {};
		item.channels = ["public"];
        item.values = {}; //initialize values object, stores values of inputs in descriptive libraries
    }
    else{//else configure scope for editing
        $scope.newItem = {_id: item._id, name:item.name, tag: item.tag};
        console.log('existing');
        $scope.mode = 'Edit ' + item.name;
        $scope.isExisting = true;
    }
      
    $scope.ok = function () {      
      
      if(!$scope.isExisting){
        if($scope.newItem.template){//using template  
            console.log('using template');
            angular.copy($scope.newItem.template, item);//copy template to item
			item.template = true;
        }else{//starting from scratch...
			item.libraries = [];
			//add libraries to project
            var selectedLibraries = _.where($scope.libraries, {selected: true});
            for(var i = 0;i < selectedLibraries.length;i++){
                item.libraries.push({
					_id:selectedLibraries[i]._id, 
					name: selectedLibraries[i].name,
					tag: selectedLibraries[i].tag
				});
            } 
        }    
      }        
      item.name = $scope.newItem.name;
      item.tag = $scope.newItem.tag; 
	  item.type = 'project';
      console.log(item);
      $modalInstance.close(item);
    };
    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
  };
  
  //Modal Controls
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
		console.log(finalReport);
		$scope.report = finalReport;
		$scope.status = 'Report Ready for Download'; 
	});
    
    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
  };
  
 
}])//Projects Controller;
.controller('templatesController', ['$scope', '$modal','$q','$ngPouch',function($scope, $modal, $q, $ngPouch) {
    $scope.status = 'Loading';
    $scope.showStatus = true;
           
    //----------CRUD OPERATIONS----------//
        
    //GET items and watch tags
	$ngPouch.mapCollection("templates/all").then(function(results){
		$scope.items = results.docs; 
		//all set, lets get rolling, let the other stuff come in as it may
		$scope.showStatus = false; 
		$scope.loaded = true;
	});
	
	var libraries = [];
	//second wave - used for the 'Add New' Dialog
	$ngPouch.mapCollection("libraries/all", {descending:true}).then(function(result){
		libraries = result.docs;
	});
    
    var tag = function(item){return item.tag;};
    $scope.$watch('[items]', function () { 
        $scope.tags = _.map(_.uniq($scope.items,tag),tag);        
    }, true);
    
    //UPDATE ITEM    
    $scope.updateItem = function(id){
        var item = _.findWhere($scope.items, {_id:id});
        $scope.addNewDialogOpen(item);
    };
    
    //DELETE item
    $scope.deleteItem = function(id){
      var item = _.findWhere($scope.items, {_id:id});
  	  var result = confirm("Are you sure you want to delete: "+ item.name + "?");
  	  
	  if(result){
	      $scope.status = 'Saving...';
	      $scope.showStatus = true;
		  
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
		          $scope.status = 'Saved!';
		          $scope.showStatus = true;
			  });
		  
		  });
	  }
      
    };
  
  //VIEW OPERATIONS      
  $scope.setTag = function(tag){
      $scope.selectedTag = tag;
  };
  
  //Modal Controls
  $scope.addNewDialogOpen = function (itemToUpdate) {
    var modalInstance = $modal.open({
      templateUrl: 'AddNew-Content.html',
      controller: ModalInstanceCtrl,
      resolve: {
        tags: function () {
          return $scope.tags;
        },
        item: function(){
            return itemToUpdate;
        },
		libraries:function(){
			return libraries;
		},
		templates:function(){
			return $scope.items;
		}
      }
    });

    modalInstance.result.then(function (newItem) {
        $scope.status = 'Saving...';
        $scope.showStatus = true;       
            
        if(newItem.template){//if new && template
            console.log('NEW!');
			var oldId = newItem._id;
			var options = {
				startkey: [oldId, "0"],
				endkey: [oldId, "9"]
			};
			
			//strip the new project
			delete newItem._id;
			delete newItem._rev;
			delete newItem.template;
			
			console.log(newItem);
			$ngPouch.db.post(newItem).then(function(result){
				var newId = result.id;
				console.log("new ID: " + newId);
				$ngPouch.db.query("components/forProjectId", options).then(function(result){
					console.log("adding components, total: " + result.rows.length);
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
					console.log("--to save--");
					console.log(components);
					$ngPouch.bulkDocs({docs:components}).then(function(){
						$scope.status = 'Saved!';
					});
				});
			});
        }
		else if(!newItem._id){//new but no template
            console.log('NEW!');          
            $ngPouch.doc(newItem).then(function(data) { 
                $scope.status = 'Saved!';
                $scope.showStatus = true;
            }, function() {
                $scope.status = 'Error :(';
                $scope.showStatus = true;
            });
        }
        else{
            newItem.save().then(function() {            
                $scope.status = 'Saved!';
                $scope.showStatus = true;
            }, function() {
                $scope.status = 'Error :(';
                $scope.showStatus = true;
            }); 
        }
    });
  };

  var ModalInstanceCtrl = function ($scope, $modalInstance, tags, item, libraries, templates) {
 
    $scope.tags = tags;
    
    $scope.libraries = libraries;//assign from resolve
	$scope.templates = templates;//assing from resolve
      
    if(item === undefined){//if new item, configure defaults
        $scope.newItem = {};//instantiate return object
        console.log('new item');
        $scope.mode = 'Add New Template';
        item = {};
		item.channels = ["public"];
        item.values = {}; //initialize values object, stores values of inputs in descriptive libraries
    }
    else{//else configure scope for editing
        $scope.newItem = {_id: item._id, name:item.name, tag: item.tag};
        console.log('existing');
        $scope.mode = 'Edit ' + item.name;
        $scope.isExisting = true;
    }
      
    $scope.ok = function () {      
      if(!$scope.isExisting){
        if($scope.newItem.template){//using template  
            console.log('using template');
            angular.copy($scope.newItem.template, item);//copy template to item
			item.template = true;
        }else{//starting from scratch...
			item.libraries = [];
			//add libraries to project
            var selectedLibraries = _.where($scope.libraries, {selected: true});
            for(var i = 0;i < selectedLibraries.length;i++){
                item.libraries.push({
					_id:selectedLibraries[i]._id, 
					name: selectedLibraries[i].name,
					tag: selectedLibraries[i].tag
				});
            } 
        }    
      }        
      item.name = $scope.newItem.name;
      item.tag = $scope.newItem.tag; 
	  item.type = 'template';
      console.log(item);
      $modalInstance.close(item);
    };
    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
  };
  
}])//Templates Controller;
.controller('projectPageController', ['$scope', '$routeParams', '$modal','$timeout', '$parse','$q','$ngPouch', function($scope, $routeParams, $modal,$timeout, $parse, $q, $ngPouch) {
	//object for managing view state
	$scope.view = {};
	
    var projectId = $routeParams.projectId;
    $scope.view.status = 'Loading';
    $scope.view.showStatus = true;
	
	$scope.view.loaded = false;
	
    //----------CRUD OPERATIONS----------//  
    //GET project for page display
	var options = {
		startkey: [projectId,0, "0"],
		endkey: [projectId,9, "9"]
	};
	
    $ngPouch.mapCollection("projects/packaged", options).then(function(result){
		console.log(result);
		//get project
		$scope.project = result.docs[0];
		result.docs.splice(0,1);//slice off this one
		$scope.notesActive = false;
		$scope.activeLibrary = $scope.project.libraries[0];//assign active library
		$scope.activeLibrary.active = true;
		
		//get components
		$scope.components = result.docs;
		
		//...and we're done!
		$scope.view.showStatus = false;
		$scope.view.loaded = true;
    });
	
	var componentSchemasByLibrary;
	//use these later
    $ngPouch.mapCollection("componentSchemas/forLibraryId").then(function(result){
		console.log(result);
		//componentSchemas for add new
		componentSchemasByLibrary = _.groupBy(result.docs, 'libraryId');
		console.log(componentSchemasByLibrary);
    });
	
	/*--VIEW OPERATIONS--*/
	
	//toggle how components are grouped
	$scope.toggleGrouping = function(){
		if($scope.view.activeLibrary.groupBy === 'space'){
			$scope.view.activeLibrary.groupBy = 'tag';
		}else{
			$scope.view.activeLibrary.groupBy = 'space';
		}
		$scope.updateView();
	}
	
	//updates view based on new info (added/removed components, different grouping scheme, etc.)
	$scope.updateView = function(){
		$scope.view.groups = [];
		var byLibrary = _.groupBy($scope.components, "libraryId");
		for(var prop in byLibrary){
			var library = _.findWhere($scope.project.libraries, {_id: prop});
			if(!library.groupBy){
				library.groupBy = 'tag';
			}
			console.log("groupBy: " + library.groupBy);
			var tags = _.uniq(_.pluck(byLibrary[prop], library.groupBy));
			$scope.view.groups[prop] = [];
			console.log("by library");
			//console.log(byLibrary[prop]);
			for(var i = 0; i<tags.length;i++){
				var components = _.filter(byLibrary[prop], function(component){ return component[library.groupBy] === tags[i] });
				//var components = _.where(byLibrary[prop], {space:tags[i]});
				console.log("components");
				console.log(components);
				$scope.view.groups[prop].push({
					name: tags[i],
					components: components
				});
			}
		}
		console.log("grouped output");
		console.log($scope.view.groups);
		
	};
	$scope.$watchCollection('components', $scope.updateView);
	
	//sets the active library
	$scope.setActiveTab = function(library){
		$scope.view.activeLibrary = library;
	};
	
	$scope.setActiveComponent = function(component){
		$scope.view.activeLibrary.selected = component;
	};
    //save active component
    $scope.saveComponent = function(){
	  $scope.view.showStatus = true;
	  $scope.view.status = "Saving..."; 
	  if(($scope.view.activeLibrary && $scope.view.activeLibrary.tag === 'Descriptive') || $scope.notesActive){
		  console.log($scope.project);
		  //create copy
		  var projectCopy = angular.copy($scope.project);
		  //strip out selected components
		  for(var i = 0; i < projectCopy.libraries.length; i++){
			  delete projectCopy.libraries[i].selected;
		  }
		  projectCopy.save().then(function(data){
	          $scope.view.status = 'Saved!';
			  console.log("project saved!");
			  console.log($scope.project)
		  });
	  } else if($scope.view.activeLibrary){
	      $scope.view.activeLibrary.selected.save().then(function(){    
	          $scope.view.status = 'Saved!';
			  console.log("component saved!");
	      }); 
	  }
    };
	//delete component
	$scope.deleteComponent = function(){
		
		var response = confirm('Are you sure you want to delete ' + $scope.view.activeLibrary.selected.name + '?');  
		if(response){
			$scope.view.showStatus = true;
			$scope.view.status = "Saving...";  
		    $scope.view.activeLibrary.selected.remove().then(function(){
				delete $scope.view.activeLibrary.selected;
		    	$scope.view.status = 'Saved!';
			     console.log("saved!");
		    }); 
		}
		
	};
	//copy component
	$scope.copyComponent = function(){
		
		if(!$scope.view.activeLibrary.selected){
			return;
		}
		
		$scope.view.showStatus = true;
		$scope.view.status = 'Saving...';
		var copy = angular.copy($scope.view.activeLibrary.selected);
		//strip db identifiers
		delete copy._id;
		delete copy._rev;
		
		copy.name = copy.name.replace(/(\d+)/g,"");
		
		var regex = new RegExp(copy.name.trim()+"\\s*\\d*");
		console.log("existing components");
		var maxName = _.max($scope.components, function(component){			
			if(component.libraryId === $scope.view.activeLibrary._id){
				console.log(regex);
				console.log(component.name.search(regex));
				if(component.name.search(regex) !== -1){
					var str = component.name.match(/\d*$/);
					console.log(str);
					if(str[0]){
						console.log(parseInt(str[0]));
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
		console.log("next");
		console.log(maxName);
		var strNumber = maxName.name.match(/\d*$/)[0];
		var nextNumber;
		if(strNumber){
			nextNumber = parseInt(strNumber) + 1;
		}else{
			nextNumber = 1;
		}
		console.log(nextNumber);
		
		copy.name = copy.name + " " + nextNumber;
		console.log(copy);
		
		$ngPouch.doc(copy).then(function(){
			$scope.view.status = 'Saved!';
		})
	};
	
	//handling states states from inputs directive
	$scope.setStatus = function(status){
		$scope.view.showStatus = true;
		$scope.view.status = status;
		console.log("set status to: " + status);
	};
	
	//confirm navigation
	window.onbeforeunload = function (event) {
	  var message = "Some data is unsaved.  Are you sure you want to peace out?!";
	  if (typeof event == 'undefined') {
	    event = window.event;
	  }
	  if($scope.view.status === "Unsaved"){
		event.returnValue = message;
	  	return message;
	  }
	  
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
				console.log("---here---");
				console.log(componentSchemasByLibrary[$scope.view.activeLibrary._id]);
				return componentSchemasByLibrary[$scope.view.activeLibrary._id];
			}
          }
        });

      modalInstance.result.then(function (newItem) { 
		    var now = new Date();
		    newItem.created = now.toISOString();
			newItem.updated = now.toISOString();
            $ngPouch.db.post(newItem).then(function(data){
				console.log("item saved");
            	console.log(newItem);		
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
      console.log("ok");
      
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
  /*
  //BRIDGE
  $scope.BridgeDialogOpen = function (libraryIndex) {
      if(!$scope.project.libraries[libraryIndex].activeComponent){return;}
      
        var modalInstance = $modal.open({
          templateUrl: 'Bridge-Content.html',
          controller: BridgeInstanceCtrl,
          resolve: {
            project: function () {
              return $scope.project;
            },
            baseComponent: function (){
                return $scope.project.libraries[libraryIndex].activeComponent;
            },
            libraryIndex:function(){
                return libraryIndex;
            }
          }
        });

        modalInstance.result.then(function (response) {            
            var library = _.findWhere($scope.project.libraries, {id:response.libraryId});
            
            library.components.push(response.newItem);
            console.log("New Bridged Object");
            console.log(response.newItem);
            $scope.refreshLibrariesViewModel();//refresh view
            //Save project back to server
            $scope.saveProject();
        });
  };
  var BridgeInstanceCtrl = function ($scope, $modalInstance, $ngPouch, project, baseComponent, libraryIndex) {
    //CONFIGURE BRIDGE
    $scope.bridge = {};
    $scope.bridge.values = {};
    $scope.view = {};
    
    $scope.sourceComponent = baseComponent.libraryComponent;
    $scope.bridge.sourceComponentId = baseComponent.libraryComponent.id;
    console.log("base component");
    console.log(baseComponent);
    
    $scope.createNew = {};
    $scope.createNew.sourceComponentId = baseComponent.libraryComponent.id;
    
    //GET libraries for this project
    $scope.libraries = project.libraries;
      
    //CONFIGURE spaces for type ahead   
    var spaces = [];
    for(var i = 0;i < project.libraries.length;i++){
        spaces.push(_.pluck(project.libraries[i].components, 'space'));
    }
    $scope.spaces = _.uniq(_.flatten(spaces));
    console.log($scope.spaces);
    
    //GET components in library
    var components = $ngPouch.all('components');
    components.getList().then(function(components) {//We get all components, because we're allowing bridging across libraries
        $scope.components = components; 
        console.log(components);
    });
    //class variable for $ngPouch service
    var bridges = $ngPouch.all('bridges');
    //GET bridges for sourceId
    $scope.getBridges = function(){
        $scope.bridges = [];
        
        bridges.getList({q:{'sourceComponentId': $scope.bridge.sourceComponentId, 'destinationComponentId': $scope.view.destinationComponent._id.$id}}).then(function(bridges) {//We get all components, because we're allowing bridging across libraries
            $scope.bridges = bridges;         

            $scope.createNew.name = "--Create New--";
            $scope.createNew.values = {};

            $scope.bridges.push($scope.createNew);
            console.log("--bridges--");
            console.log($scope.bridges);
            $scope.bridge = bridges[0];
        }); 
    };
    

    //new item, configure defaults - we're not doing edit via dialog for this screen
    $scope.newItem = {};
    $scope.newItem.values = {};
    $scope.newItem.space = baseComponent.space;
    
    $scope.mode = 'Add New Component';
    
    $scope.onDrop = function(event,data, input){
        console.log("--input--");
        console.log(input);
        if(!input.restricted || input.restricted === '0'){
            $scope.bridge.values[input.alias] = data.alias;  
        }      
    };

    $scope.ok = function () {
        if(!$scope.bridge._id){//if new bridge
            console.log("--name--");
            console.log($scope.view.destinationComponent.name);
            $scope.bridge.name = baseComponent.libraryComponent.name + " - " + $scope.view.destinationComponent.name + " " + $scope.bridges.length;
            
            $scope.bridge.destinationComponentId = $scope.view.destinationComponent._id.$id;
            bridges.post($scope.bridge);//need to add error handling            
        }else{
            //save existing
            
            console.log("--existing bridge--");
            
            var bridgeToSave = {};        
            bridgeToSave = $ngPouch.copy($scope.bridge);
            bridgeToSave.id = bridgeToSave._id.$id;
            delete bridgeToSave._id;
            bridgeToSave.put();
        }
        
        $scope.newItem.libraryComponent = $scope.view.destinationComponent;
        $scope.newItem.libraryComponent.id = $scope.newItem.libraryComponent._id.$id;
        $scope.newItem.tag = $scope.newItem.libraryComponent.tag;          
        
        
        //assign values
        console.log("PROJECT VALUES");
        console.log(baseComponent.values);
        for (var key in $scope.bridge.values){
            if ($scope.bridge.values.hasOwnProperty(key)) {
                //assign new value
                $scope.newItem.values[key] = baseComponent.values[$scope.bridge.values[key]];
                //Override default value on next calc cycle                
                for(var s = 0;s< $scope.newItem.libraryComponent.sections.length;s++){
                    for(var i=0;i < $scope.newItem.libraryComponent.sections[s].inputs.length;i++){
                        if($scope.newItem.libraryComponent.sections[s].inputs[i].alias === key){
                            $scope.newItem.libraryComponent.sections[s].inputs[i].userValue = true;
                            console.log("--override default value for: " + key);
                        }
                    }
                }
            }
        }
        
        
        var response = {};
        response.newItem = $scope.newItem;
        response.libraryId = $scope.view.libraryId;
        $modalInstance.close(response);      
    };
    
    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
  };
  */
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
				console.log("saved!");
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
			  
			  console.log("saved doc");
			  console.log(doc);
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
				  console.log(component);
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
  
  
  
}])//Project Page Controller
.controller('templatePageController', ['$scope', '$routeParams', '$modal','$timeout', '$parse','$q','$ngPouch', function($scope, $routeParams, $modal,$timeout, $parse, $q, $ngPouch) {
	//object for managing view state
	$scope.view = {};
	
    var templateId = $routeParams.templateId;
    $scope.view.status = 'Loading';
    $scope.view.showStatus = true;
	
	
	$scope.view.loaded = false;
	
    //----------CRUD OPERATIONS----------//  
    //GET project for page display
	var options = {
		startkey: [templateId,0, "0"],
		endkey: [templateId,9, "9"]
	};
	
    $ngPouch.mapCollection("templates/packaged", options).then(function(result){
		console.log(result);
		//get project
		$scope.project = result.docs[0];
		result.docs.splice(0,1);//slice off the project
		$scope.activeLibrary = $scope.project.libraries[0];//assign active library
		
		//get components
		$scope.components = result.docs;
		
		//...and we're done!
		$scope.view.showStatus = false;
		$scope.view.loaded = true;
    });
	
	var componentSchemasByLibrary;
	//use these later
    $ngPouch.mapCollection("componentSchemas/forLibraryId").then(function(result){
		console.log(result);
		//componentSchemas for add new
		componentSchemasByLibrary = _.groupBy(result.docs, 'libraryId');
		console.log(componentSchemasByLibrary);
    });
	
	/*--VIEW OPERATIONS--*/
	//toggle how components are grouped
	$scope.toggleGrouping = function(){
		if($scope.view.activeLibrary.groupBy === 'space'){
			$scope.view.activeLibrary.groupBy = 'tag';
		}else{
			$scope.view.activeLibrary.groupBy = 'space';
		}
		$scope.updateView();
	}
	
	//updates view based on new info (added/removed components, different grouping scheme, etc.)
	$scope.updateView = function(){
		$scope.view.groups = [];
		var byLibrary = _.groupBy($scope.components, "libraryId");
		for(var prop in byLibrary){
			var library = _.findWhere($scope.project.libraries, {_id: prop});
			if(!library.groupBy){
				library.groupBy = 'tag';
			}
			console.log("groupBy: " + library.groupBy);
			var tags = _.uniq(_.pluck(byLibrary[prop], library.groupBy));
			$scope.view.groups[prop] = [];
			console.log("by library");
			//console.log(byLibrary[prop]);
			for(var i = 0; i<tags.length;i++){
				var components = _.filter(byLibrary[prop], function(component){ return component[library.groupBy] === tags[i] });
				//var components = _.where(byLibrary[prop], {space:tags[i]});
				console.log("components");
				console.log(components);
				$scope.view.groups[prop].push({
					name: tags[i],
					components: components
				});
			}
		}
		console.log("grouped output");
		console.log($scope.view.groups);
		
	};
	$scope.$watchCollection('components', $scope.updateView);
	
	//sets the active library
	$scope.setActiveTab = function(library){
		$scope.view.activeLibrary = library;
		console.log($scope.view.activeLibrary);
		console.log($scope.view.activeLibrary.selected);
	};
	
	$scope.setActiveComponent = function(component){
		$scope.view.activeLibrary.selected = component;
	};
    //save active component
    $scope.saveComponent = function(){
	  $scope.view.showStatus = true;
	  $scope.view.status = "Saving..."; 
	  if($scope.view.activeLibrary.tag === 'Descriptive'){
		  console.log($scope.project);
		  //create copy
		  var projectCopy = angular.copy($scope.project);
		  //strip out selected components
		  for(var i = 0; i < projectCopy.libraries.length; i++){
			  delete projectCopy.libraries[i].selected;
		  }
		  projectCopy.save().then(function(data){
	          $scope.view.status = 'Saved!';
			  console.log("project saved!");
			  console.log($scope.project)
		  });
	  } else{
	      $scope.view.activeLibrary.selected.save().then(function(){    
	          $scope.view.status = 'Saved!';
			  console.log("component saved!");
	      }); 
	  }
    };
	//delete component
	$scope.deleteComponent = function(){
		
		var response = confirm('Are you sure you want to delete ' + $scope.view.activeLibrary.selected.name + '?');  
		if(response){
			$scope.view.showStatus = true;
			$scope.view.status = "Saving...";  
		    $scope.view.activeLibrary.selected.remove().then(function(){
				delete $scope.view.activeLibrary.selected;
		    	$scope.view.status = 'Saved!';
			     console.log("saved!");
		    }); 
		}
		
	};
	
	$scope.copyComponent = function(){
		
		if(!$scope.view.activeLibrary.selected){
			return;
		}
		
		$scope.view.showStatus = true;
		$scope.view.status = 'Saving...';
		var copy = angular.copy($scope.view.activeLibrary.selected);
		//strip db identifiers
		delete copy._id;
		delete copy._rev;
		
		copy.name = copy.name.replace(/(\d+)/g,"");
		
		var regex = new RegExp(copy.name.trim()+"\\s*\\d*");
		console.log("existing components");
		var maxName = _.max($scope.components, function(component){			
			if(component.libraryId === $scope.view.activeLibrary._id){
				console.log(regex);
				console.log(component.name.search(regex));
				if(component.name.search(regex) !== -1){
					var str = component.name.match(/\d*$/);
					console.log(str);
					if(str[0]){
						console.log(parseInt(str[0]));
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
		console.log("next");
		console.log(maxName);
		var strNumber = maxName.name.match(/\d*$/)[0];
		var nextNumber;
		if(strNumber){
			nextNumber = parseInt(strNumber) + 1;
		}else{
			nextNumber = 1;
		}
		console.log(nextNumber);
		
		copy.name = copy.name + " " + nextNumber;	
		
		$ngPouch.doc(copy).then(function(){
			$scope.view.status = 'Saved!';
		})
	};
	
	//handling states states from inputs directive
	$scope.setStatus = function(status){
		$scope.view.showStatus = true;
		$scope.view.status = status;
		console.log("set status to: " + status);
	};
	
	//confirm navigation
	window.onbeforeunload = function (event) {
	  var message = "Some data is unsaved.  Are you sure you want to peace out?!";
	  if (typeof event == 'undefined') {
	    event = window.event;
	  }
	  if($scope.view.status === "Unsaved"){
		event.returnValue = message;
	  	return message;
	  }
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
				console.log("---here---");
				console.log(componentSchemasByLibrary[$scope.view.activeLibrary._id]);
				return componentSchemasByLibrary[$scope.view.activeLibrary._id];
			}
          }
        });

      modalInstance.result.then(function (newItem) { 
		    var now = new Date();
		    newItem.created = now.toISOString();
			newItem.updated = now.toISOString();
            $ngPouch.db.post(newItem).then(function(data){
				console.log("item saved");
            	console.log(newItem);		
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
      console.log("ok");
      
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
 /*
  //BRIDGE
  $scope.BridgeDialogOpen = function (libraryIndex) {
      if(!$scope.project.libraries[libraryIndex].activeComponent){return;}
      
        var modalInstance = $modal.open({
          templateUrl: 'Bridge-Content.html',
          controller: BridgeInstanceCtrl,
          resolve: {
            project: function () {
              return $scope.project;
            },
            baseComponent: function (){
                return $scope.project.libraries[libraryIndex].activeComponent;
            },
            libraryIndex:function(){
                return libraryIndex;
            }
          }
        });

        modalInstance.result.then(function (response) {            
            var library = _.findWhere($scope.project.libraries, {id:response.libraryId});
            
            library.components.push(response.newItem);
            console.log("New Bridged Object");
            console.log(response.newItem);
            $scope.refreshLibrariesViewModel();//refresh view
            //Save project back to server
            $scope.saveProject();
        });
  };
  var BridgeInstanceCtrl = function ($scope, $modalInstance, $ngPouch, project, baseComponent, libraryIndex) {
    //CONFIGURE BRIDGE
    $scope.bridge = {};
    $scope.bridge.values = {};
    $scope.view = {};
    
    $scope.sourceComponent = baseComponent.libraryComponent;
    $scope.bridge.sourceComponentId = baseComponent.libraryComponent.id;
    console.log("base component");
    console.log(baseComponent);
    
    $scope.createNew = {};
    $scope.createNew.sourceComponentId = baseComponent.libraryComponent.id;
    
    //GET libraries for this project
    $scope.libraries = project.libraries;
      
    //CONFIGURE spaces for type ahead   
    var spaces = [];
    for(var i = 0;i < project.libraries.length;i++){
        spaces.push(_.pluck(project.libraries[i].components, 'space'));
    }
    $scope.spaces = _.uniq(_.flatten(spaces));
    console.log($scope.spaces);
    
    //GET components in library
    var components = $ngPouch.all('components');
    components.getList().then(function(components) {//We get all components, because we're allowing bridging across libraries
        $scope.components = components; 
        console.log(components);
    });
    //class variable for $ngPouch service
    var bridges = $ngPouch.all('bridges');
    //GET bridges for sourceId
    $scope.getBridges = function(){
        $scope.bridges = [];
        
        bridges.getList({q:{'sourceComponentId': $scope.bridge.sourceComponentId, 'destinationComponentId': $scope.view.destinationComponent._id.$id}}).then(function(bridges) {//We get all components, because we're allowing bridging across libraries
            $scope.bridges = bridges;         

            $scope.createNew.name = "--Create New--";
            $scope.createNew.values = {};

            $scope.bridges.push($scope.createNew);
            console.log("--bridges--");
            console.log($scope.bridges);
            $scope.bridge = bridges[0];
        }); 
    };
    

    //new item, configure defaults - we're not doing edit via dialog for this screen
    $scope.newItem = {};
    $scope.newItem.values = {};
    $scope.newItem.space = baseComponent.space;
    
    $scope.mode = 'Add New Component';
    
    $scope.onDrop = function(event,data, input){
        console.log("--input--");
        console.log(input);
        if(!input.restricted || input.restricted === '0'){
            $scope.bridge.values[input.alias] = data.alias;  
        }      
    };

    $scope.ok = function () {
        if(!$scope.bridge._id){//if new bridge
            console.log("--name--");
            console.log($scope.view.destinationComponent.name);
            $scope.bridge.name = baseComponent.libraryComponent.name + " - " + $scope.view.destinationComponent.name + " " + $scope.bridges.length;
            
            $scope.bridge.destinationComponentId = $scope.view.destinationComponent._id.$id;
            bridges.post($scope.bridge);//need to add error handling            
        }else{
            //save existing
            
            console.log("--existing bridge--");
            
            var bridgeToSave = {};        
            bridgeToSave = $ngPouch.copy($scope.bridge);
            bridgeToSave.id = bridgeToSave._id.$id;
            delete bridgeToSave._id;
            bridgeToSave.put();
        }
        
        $scope.newItem.libraryComponent = $scope.view.destinationComponent;
        $scope.newItem.libraryComponent.id = $scope.newItem.libraryComponent._id.$id;
        $scope.newItem.tag = $scope.newItem.libraryComponent.tag;          
        
        
        //assign values
        console.log("PROJECT VALUES");
        console.log(baseComponent.values);
        for (var key in $scope.bridge.values){
            if ($scope.bridge.values.hasOwnProperty(key)) {
                //assign new value
                $scope.newItem.values[key] = baseComponent.values[$scope.bridge.values[key]];
                //Override default value on next calc cycle                
                for(var s = 0;s< $scope.newItem.libraryComponent.sections.length;s++){
                    for(var i=0;i < $scope.newItem.libraryComponent.sections[s].inputs.length;i++){
                        if($scope.newItem.libraryComponent.sections[s].inputs[i].alias === key){
                            $scope.newItem.libraryComponent.sections[s].inputs[i].userValue = true;
                            console.log("--override default value for: " + key);
                        }
                    }
                }
            }
        }
        
        
        var response = {};
        response.newItem = $scope.newItem;
        response.libraryId = $scope.view.libraryId;
        $modalInstance.close(response);      
    };
    
    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
  };
  */
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
				console.log("saved!");
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
  
}])//Template Page Controller
.controller('reportsController', ['$scope', '$modal','$ngPouch',function($scope, $modal, $ngPouch) {
    $scope.status = 'Loading';
    $scope.showStatus = true;
           
    //----------CRUD OPERATIONS----------//
        
    //GET items and watch tags    
	$ngPouch.mapCollection("reports/all").then(function(results){
		$scope.items = results.docs; 
		//all set, lets get rolling, let the other stuff come in as it may
		$scope.showStatus = false; 
		$scope.loaded = true;
	});
	
    var tag = function(item){return item.tag;};
    $scope.$watch('[items]', function () { 
        $scope.tags = _.map(_.uniq($scope.items,tag),tag);
        
    }, true);
    
    //UPDATE ITEM
    
    $scope.updateItem = function(id){
        var item = _.findWhere($scope.items, {_id:id});
        $scope.addNewDialogOpen(item);
    };
    
    //DELETE item
    $scope.deleteItem = function(id){
      var item = _.findWhere($scope.items, {_id:id});
      var response = confirm('Are you sure you want to delete ' + item.name + '?');   
      if (response) {
         $scope.status = 'Saving...';
         $scope.showStatus = true; 
         item.remove().then(function(){
            $scope.status = 'Saved!';
            $scope.showStatus = true;
         });        
       }
    };
  
  //VIEW OPERATIONS      
  $scope.setTag = function(tag){
      $scope.selectedTag = tag;
  };
  
  //Modal Controls
  $scope.addNewDialogOpen = function (itemToUpdate) {

    var modalInstance = $modal.open({
      templateUrl: 'AddNew-Content.html',
      controller: ModalInstanceCtrl,
      resolve: {
        tags: function () {
          return $scope.tags;
        },
        item: function(){
            return itemToUpdate;
        }
      }
    });

    modalInstance.result.then(function (newItem) {
        $scope.status = 'Saving...';
        $scope.showStatus = true;       
            
        if(newItem._id === undefined){//if new  
            console.log('NEW!');     
			var now = new Date();
			newItem.created = now.toISOString();
			newItem.updated = now.toISOString();
			       
            $ngPouch.db.post(newItem).then(function(data) {
                $scope.status = 'Saved!';
                $scope.showStatus = true;
            }, function() { 
                $scope.status = 'Error :(';
                $scope.showStatus = true;
            }); 
        } 
        else{
            console.log('update!');
			console.log(newItem);
            newItem.save().then(function() {            
                $scope.status = 'Saved!';
                $scope.showStatus = true;
            }, function() {
                $scope.status = 'Error :(';
                $scope.showStatus = true;
            }); 
        }
    });
  };

  var ModalInstanceCtrl = function ($scope, $modalInstance, tags, item) {
      
      $scope.tags = tags;//set tags for use in dropdown
      $scope.newItem = {};
      if(item === undefined){//if new item, configure defaults
          item = {};//instantiate return object
		  item.type = 'report';//REPORT tag
          item.triggers = [];//instatiate triggers array
		  
          console.log('new item');
          $scope.mode = 'Create New Report';
      }
      else{//else configure scope for editing
          $scope.newItem.name = item.name;
		  $scope.newItem.tag = item.tag;
          console.log('existing');
          $scope.mode = 'Edit Report - ' + item.name;
      }
      
      $scope.ok = function () {
        item.name = $scope.newItem.name;
        item.tag = $scope.newItem.tag;
      
        $modalInstance.close(item);
      };
      $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
      };
    };
}])//Reports Controller
//-----reportPageController
.controller('reportPageController', ['$scope', '$modal','$routeParams','$q','$ngPouch',function($scope, $modal, $routeParams, $q, $ngPouch) {
    
    $scope.status = 'Loading';
    $scope.showStatus = true;
    
    $scope.triggerOptions = {
        axis:'y',
        disabled: true
    };        
    
    //----------CRUD OPERATIONS----------//
     var reportId = $routeParams.reportId;
     
	 var promises = [];
	 
    //GET Component for page display
    promises.push($ngPouch.docFromId(reportId));
    //GET library for page display
    promises.push($ngPouch.mapCollection('libraries/all'));
    promises.push($ngPouch.mapCollection('componentSchemas/all'));
	
	$q.all(promises).then(function(results){
		$scope.report = results[0];//report
		$scope.libraries = results[1].docs;//libraries
		//for use later, in modal
		$scope.libraries.push({
			name:"--No Component--",
			_id:null
		});
		$scope.components = results[2].docs;//componentSchemas
		$scope.showStatus = false;
	}); 
    
    //SAVE ITEM    
    $scope.saveReport = function(){
        $scope.status = 'Saving';
        $scope.showStatus = true;
        $scope.report.save().then(function(report) {
            $scope.status = 'Saved!';
        }, 
        function() {
            $scope.status = 'Error';
        });
    };
    
    //DELETE item
    $scope.deleteTrigger = function(){      
      var response = confirm('Are you sure you want to delete ' + $scope.selectedTrigger.name + '?');   
      if (response) {
        $scope.status = 'Saving...';
        $scope.showStatus = true; 
        //remove from view
        for (var i=0;i<$scope.report.triggers.length;i++){
            $scope.report.triggers = _.without($scope.report.triggers, $scope.selectedTrigger);            
        }
        delete $scope.selectedTrigger;
        $scope.saveReport();
      }
    };
	
	//CONFIGURE ACE
	var langTools = ace.require("ace/ext/language_tools");
	console.log(langTools);
	var autoCompletes = [];
    var codeCompleter = {
        getCompletions: function(editor, session, pos, prefix, callback) {
			if (prefix.length === 0) { callback(null, []); return; }
            callback(null, autoCompletes);
			return;
        }
     };
	 var aceEditor;
	 /*
	$scope.aceLoaded = function(_editor){
	    // Editor part
		console.log('loaded');
		
		aceEditor = _editor;
		aceEditor.setOptions({
            enableBasicAutocompletion: true
        });
		
		aceEditor.completers = [codeCompleter];
		
		aceEditor.commands.on("afterExec", function(e){				 
		     if (e.command.name == "insertstring"&&/^[\D.]$/.test(e.args)) { 
				 var pos = e.editor.getCursorPosition();
				 var range = {
					 start:{
						 row:pos.row,
						 column:0
					 },
					 end:{
						 row:pos.row,
						 column:pos.column - 1
					 }
				 };
				 var text = e.editor.session.getTextRange(range);
				 
				 var lastIndexOfOpen = text.lastIndexOf("{{");
				 
				 if(lastIndexOfOpen != -1){
				     var fromBracketsToCursor = text.substr(lastIndexOfOpen);
					 if(fromBracketsToCursor.indexOf("}}") == -1){
						 if((fromBracketsToCursor.match(/[']/g) || []).length % 2 != 1 &&  (fromBracketsToCursor.match(/["]/g) || []).length % 2 != 1){
							 //even number of either kind of quotes
							 //so we know we're NOT entering a string (all quotes are closed)- lets autocomplete
							 aceEditor.execCommand("startAutocomplete");
							 return;
						 }
					 }					 
				 }
				 aceEditor.execCommand("endAutocomplete");
		     }
				
		});
	};
	*/
    //VIEW OPERATIONS
	$scope.setTrigger = function(trigger){
		console.log(trigger);
		//reset autocompletes
		/*autoCompletes = [];
		var component = _.findWhere($scope.components, {_id:trigger.schemaId});
		for(var s = 0;s < component.sections.length; s++){
			var section = component.sections[s];
			for(var i = 0; i < section.inputs.length; i++){
				var input = section.inputs[i];
				autoCompletes.push({
					name:input.name,
					value:input.alias,
					score:300,
					meta:"Input Alias"
				});
			}
		}*/
		$scope.selectedTrigger = trigger;//set active trigger for  view
	};
  
  //Modal Controls 
  $scope.addNewDialogOpen = function (trigger) {
    var modalInstance = $modal.open({
      templateUrl: 'AddNew-Content.html',
      controller: ModalInstanceCtrl,
      resolve: {
        libraries: function () {
          return $scope.libraries;
        },
        components: function () {
          return $scope.components;
        },
        trigger:function(){
            return trigger;
        }
      }
    });

    modalInstance.result.then(function (newItem) {
        $scope.status = 'Saving...';
        $scope.showStatus = true;       
        console.log('NEW!');
        console.log(newItem);
        //set defaults for new trigger
        if(!trigger){
            $scope.report.triggers.push(newItem);
        }
        //Save component back to server
        $scope.saveReport();
    });
  };

  var ModalInstanceCtrl = function ($scope, $modalInstance, $sanitize, libraries, components, trigger) {
    
	  //set up libraries, components, etc.
    $scope.libraries = libraries;
	
	
	for(var i = 0; i < $scope.libraries.length; i++){
		var library = $scope.libraries[i];
		library.components = _.where(components, {libraryId: library._id});
	}
	$scope.library = $scope.libraries[0];
	
	
    $scope.newItem = {};
    $scope.view = {};
    
    if(trigger){
        if(trigger.schemaIds){
			var first = _.findWhere(components, {_id:trigger.schemaIds[0]});
			$scope.library = _.findWhere(libraries, {_id:first.libraryId});
            $scope.view.components = trigger.schemaIds;
        }       
        $scope.newItem = trigger;
    }  
    
    
    console.log('new trigger');
    
    $scope.mode = 'Add New Trigger';
          
    $scope.ok = function () {   
        
        if($scope.view.components && $scope.view.components.length > 0){			
            $scope.newItem.schemaIds = $scope.view.components;
			console.log($scope.newItem.schemaIds);
        }   
		if(!$scope.newItem.condition){
			$scope.newItem.condition = true;
		}
       $modalInstance.close($scope.newItem);
    };
    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
  };
  
  
 
}])
.controller('loginController', ['$scope', '$location','$modal', '$routeParams','$user', function($scope, $location, $modal, $routeParams, user) {
             
    $scope.user = {};
    $scope.login = function(){
      $scope.status = 'go';  
      user.logIn($scope.user).then(function(){
		  console.log("logged in");
          $location.path('/home').replace();
	  }, function(){
          //TODO add error handling
          $scope.status = 'error';
      });  
    };
    
    //Modal Controls 
  $scope.signUpDialogOpen = function () {
    var modalInstance = $modal.open({
      templateUrl: 'signUp-content.html',
      controller: ModalInstanceCtrl,
      resolve:{
          userId: function(){
              return $routeParams.userId;
          },
          groupId:function(){
              return $routeParams.groupId;
          }          
      }
    });
  };

  var ModalInstanceCtrl = function ($scope, $modalInstance, UserService, $http, userId, groupId) {
      console.log('userid: ' + userId);
      console.log('groupId: ' + groupId);
      
        $scope.user = {};
        $scope.group = {};
        
      if(userId){//if we have a user id, configure scope for inactive user.
        $http.get('../api/index.php/' + groupId + '/users/' + userId, {headers: {'USER-TOKEN': userId}}).success(function(user){
           if(user._id){
               $scope.user = user;
               $scope.user.groups = [];
               $scope.user.groups.push({id: groupId});
           }
        })
        .error(function(){
            alert('error activating your account!');
        });

        $scope.ok = function () {            
          UserService.activate($scope.user).then(function(){//success
              $modalInstance.dismiss('cancel');
          }, function(){//error

          });
        };
      }else{//if no user id, configure scope for new user.

        $scope.ok = function () {  
          var request = {};
          request.user = $scope.user;
          request.group = $scope.group;

          UserService.signUp(request).then(function(){//success
              $modalInstance.dismiss('cancel');
          }, function(){//error

          });
        };
      }
      
      
    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
  };
  
  //for activating users - open dialog
  if($routeParams.userId && $routeParams.groupId){
      $scope.signUpDialogOpen();
  }
  
  
        
}])
.controller('settingsController', ['$scope', '$modal', '$ngPouch', '$user',function($scope, $modal,$ngPouch, $user) {
     
     $scope.group = UserService.info.activeGroup;
     
     if(UserService.info.activeGroup.role === 0){//admin actions
         console.log('running admin actions');
         
         $scope.loadUsers = function(){
            $scope.status = 'Loading...';
            $scope.showStatus = true;
            
            $ngPouch.all('users').getList().then(function(users){
               $scope.users = users;
               $scope.showStatus = false;
           });
         };
         $scope.loadUsers();
        
        $scope.removeUser = function(user){
            var name = user.displayName ? user.displayName : user.username;
            
            var result = confirm("Are you sure you want to remove " + name + "?");
            if(result){
               $scope.status = 'Saving...';
               $scope.showStatus = true;
               
               $ngPouch.one('removeuser', user._id.$id).remove().then(function(){
                console.log(user);
                console.log($scope.users);
                $scope.users = _.without($scope.users, user);
                console.log($scope.users);
                $scope.showStatus = false;
               });
               
               
            }
        };
        
        $scope.updateUserRole = function(user){            
            //confirm with the user if they want to change their own role
            if(UserService.info.displayName === user.displayName){
                var result = confirm('Are you sure you want to change your role?');
                if(!result){
                    user.role = 0;
                    return;
                }
            }            
            //if this action would result in no admins, then this is a no go.            
            var admins = _.where($scope.users, {role: 0});
            if(admins.length < 1){
                alert('Action not allowed.  At least one user MUST have an administrative role.');
                user.role = 0;
                return;
            }            
            var data = {"role": user.role};
            $ngPouch.one('userrole', user._id.$id).customPOST(data).then(function(response){
                console.log(response);
            });
        };
        
        $scope.inviteNewUsers = function(){
            var modalInstance = $modal.open({
               templateUrl: 'invite-Content.html',
               controller: ModalInstanceCtrl
            });
            
            modalInstance.result.then(function(){
                $scope.loadUsers(); 
            });
        };
        
        $scope.saveGroup = function(){
            
        };
     }else{
         $scope.showStatus = false;        
     }
     
     //normal user actions
     $scope.createNewGroup = function(){
         var modalInstance = $modal.open({
               templateUrl: 'newGroup-Content.html',
               controller: newGroupModal
            });
            
            modalInstance.result.then(function(group){
                $scope.status = 'Saving...';
                $scope.showStatus = true;
                
                UserService.createNewGroup(group.name).then(function(){
                    $scope.showStatus = false;
                },function(){//error handling
                    $scope.showStatus = false;
                    alert('Error creating group!');
                });  
            });
     };
     
     //modal controllers
     var ModalInstanceCtrl = function ($scope, $modalInstance, $ngPouch) { 
         
      $scope.users = [{role: 3}];
      
      $scope.addNewUser = function(){
        $scope.users.push({role:3});  
      };   
      
      $scope.removeUser = function (user){
          $scope.users = _.without($scope.users, user);
      };
      
      $scope.ok = function () {  
          if($scope.users.length < 1){
              alert('No users provided!');
              return;
          }
          var toSend = [];
          
          for(var i = 0; i < $scope.users.length; i++){
              var user = $scope.users[i];
              if(user.email && user.role){
                  toSend.push(user);
              }
          }
          
          $ngPouch.one('invite').customPOST(toSend).then(function(response){              
              $modalInstance.close();
          });          
      };
      $scope.cancel = function () {
         $modalInstance.dismiss('cancel');
      };
  };
  
  var newGroupModal = function ($scope, $modalInstance) {
      $scope.group = {};
      $scope.ok = function () {            
         $modalInstance.close($scope.group);
      };
      $scope.cancel = function () {
         $modalInstance.dismiss('cancel');
      };
  };
     
}])
.controller('homeController', ['$scope',function($scope) {
}]);