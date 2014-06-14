'use strict';

/* Directives */


angular.module('starter.directives', [])
  .directive('focus', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attr) {
            scope.$watch(attr.focus, function (n, o) {
                if (n !== 0 && n) {
                    element[0].focus();
                    element[0].select();
                }
            });
        }
    };
})
.directive('ngEnter', function () {
    return function (scope, element, attrs) {
		var notOpen = false;
		
		element.bind("keyup", function(event){
			var dropdown = element.next('.dropdown-menu');
			if(dropdown[0]){
				notOpen = $(dropdown[0]).css("display") === 'none';	
			}else{
				notOpen = false;
			}
		});
		
        element.bind("keydown", function (event) {		
            if(event.which === 13 && notOpen) {
                scope.$apply(function (){
                    scope.$eval(attrs.ngEnter);
                });

                event.preventDefault();
            }
        });
    };
})
.directive('onsiteInputs', function($parse) {
    return {
      restrict: 'E',
      scope: {
        component: '=component',
		project: '=project',
		save: '&saveComponent'
      },
      templateUrl: 'templates/inputs.html',
	  controller: function($scope){
		  //console.log("directive scope");
		  //console.log($scope);
		//set up view object for misc. view states  
		$scope.view = {};
		
		//VIEW OPERATIONS  
	  	$scope.onInputFocus = function(value){
	  		$scope.view.activeInputValue = value;
	  	};
	
	  	$scope.onInputBlur = function(value, input){
	  		if($scope.view.activeInputValue !== value){
	  			input.userValue = true;
	  			$scope.digestValues();
	  			$scope.save();

	  		}else{
	  			//$scope.setStatus({status:"Saved!"});
	  		}
	  		$scope.view.activeInputValue = null;
	  	};
	
	  	$scope.onInputChange = function(value){
	  		if($scope.view.activeInputValue !== value){
	  			//$scope.setStatus({status:"Unsaved"});
	  		}else{
	  			//$scope.setStatus({status:"Saved!"});
	  		}
	  	}
		
		$scope.$watch('component', function(newValue, oldValue){
			if(newValue === oldValue){return;}
			
			if(newValue){
				$scope.digestValues();
			}
		});
		
		//INPUT ENGINE
	    $scope.digestValues = function(restoreDefaults){
      
	      for(var i = 0;i < $scope.component.schema.sections.length; i++){
          
	            var hiddenInputs = 0;
	            var section = $scope.component.schema.sections[i];
	            section.view = {};
          
	            _.each(section.inputs, function(input){
	              var timer = new Date();  
	              console.log('----------' + input.name + "----------"); 
	              //console.log(input);
	              input.view = {};
            
	              //create the new scope for the inputs
	              var inputScope = {};
	              inputScope = $.extend({}, $scope.project.values, $scope.component.values);
            
	              //view controls  - check if hidden then go to next in loop        
	              if(input.hidden){               
	                  //console.log("--testing hide--");
	                  //console.log(input.hidden);
	                  if($parse(input.hidden)(inputScope)){
	                      input.view.isHidden = true;
	                      //console.log("hide!");
	                      hiddenInputs += 1;
	                      return;
	                  }else{
	                      input.view.isHidden = false;
	                      //console.log("show!");                    
	                  }
                
	              }
            
	              //if restoring defaults, set userValue to false, will recalculate default values
	              if(restoreDefaults){
	                  input.userValue = false;
	              }
            
	              var placeholder = {};
            
	              //need values for a dropdown
	              if(input.lookupTableId && input.lookupTableId !== "None"){//input has a lookup table, lets calculate the values    
	                  var inputOptions = [];  
	                  //console.log($scope.project.libraries[libraryIndex].activeComponent);
	                  if(input.lookupTableId === 'Custom'){//based on lookuptable
                    
	                      for(var y = 0; y < input.lookupTable.optionCells.length; y++){
	                          for(var x = 0; x < input.lookupTable.optionCells[y].length; x++){
	                              var Xpression = input.lookupTable.xConditions[x];
                            
	                              //console.log(Xpression);
                            
	                              if($parse(Xpression)(inputScope)){
	                                  //console.log("Evaluated as true: " + Xpression);
	                                  var Ypression = input.lookupTable.yConditions[y];
                                
	                                  if($parse(Ypression)(inputScope)){
	                                      //console.log("Evaluated as true: " + Ypression);
	                                      inputOptions.push(input.lookupTable.optionCells[y][x]);
	                                  }
	                              }
	                          }
	                      }
	                  }
                
	                  //console.log(inputOptions);
	                  input.view.options = [];                
                
	                  if(inputOptions.length === 1 && !input.userValue){                    
	                      placeholder.inputValue = $parse(inputOptions[0])(inputScope);                    
	                  }
                
	                  if(inputOptions.length > 1){
	                      for(var i = 0;i < inputOptions.length; i++){
	                          input.view.options.push($parse(inputOptions[i])(inputScope));
	                      }
	                  }               
                        
	              } //end lookup table options    
            
	              //lookuptable through default value
            
	              if(!input.userValue && input.defaultValue){//if the default value hasn't been overrided, calculate new value
	                  if(input.defaultValue.indexOf(";") === -1){                      
	                      var expression = angular.copy(input.defaultValue);
                    
	                      placeholder.inputValue = $parse(expression)(inputScope);
	                      //console.log("--reassigning to default value--");
	                      //console.log(placeholder.inputValue);
	                  }
	              }
				  
	              if(input.defaultValue){//set up dropdown options
	                  if(input.defaultValue.indexOf(";") !== -1){    
	                      var inputOptions = input.defaultValue.split(";");                
	                      //console.log(inputOptions);
	                      input.view.options = []; 
						  
						  //set first value as default             
	                      if(!input.userValue){     
							  console.log("setting first value");               
	                          placeholder.inputValue = $parse(inputOptions[0])(inputScope);           
							  console.log("set first value");         
	                      }
						  
	                      if(inputOptions.length > 1){
	                          for(var i = 0;i < inputOptions.length; i++){
	                              input.view.options.push($parse(inputOptions[i])(inputScope));
	                          }
	                      }
	                  }
	              }
            
            
	              if(placeholder.inputValue !== undefined){//if a new value should be assigned
	                  //console.log("reassigning value")
			  //if not not a number (ie a number), then set it as such
			  if(!isNaN(placeholder.inputValue))
				  placeholder.inputValue = Number(placeholder.inputValue);
			  };

	                  if($scope.component.schema.type === 'Descriptive'){
	                      $scope.project.values[input.alias] = placeholder.inputValue;//if descriptive library, add it to the project values
	                  }else{
	                      $scope.component.values[input.alias] = placeholder.inputValue;//if component, add it to component values
	                  }
	              }
            
	              var endTime = new Date();
	              var elapsed = endTime.getTime() - timer.getTime();
	              //console.log("Timer: " + elapsed);
				  //console.log("---Component---");
				  //console.log($scope.component);
				  //console.log("---Project---");
				  //console.log($scope.project);
				  
	          });
	          if(section.inputs.length === hiddenInputs){
				  section.view.isHidden = true;
			  }
	        }//for loop
	    };//function
	  }
    };
})

.directive('ioTap', function($ionicGesture){
	return function(scope, element, attrs){
        $ionicGesture.on('tap', function(e){
			//console.log("tapped");
			scope.$apply(function (){
	            scope.$eval(attrs.ioTap);
	        });
        }, element);
		
	};
})
.directive('clearButton', function($parse, $ionicGesture){
	return {
		restrict:'A',
		link:function(scope, element, attrs){
			//clear button template
			var button = angular.element('<a class="button button-small button-icon icon ion-close-round placeholder-icon"></a>');
		
			//find label
			var label = element.closest('label');
			//find button
			var container = element.siblings('.input-accessories');
			
			//append
			//element.after(button);
			console.log(container);
			if(container.length > 0){
				container.append(button);
			}else{
				label.append(button);
			}
			
		
		
			//attach event handler
			var $input = element;
			$ionicGesture.on('tap click', function(e){
				element.focus();
				scope.$apply(function(){
					var model = $input.attr('ng-model');
					//console.log(model);
					if(model){
						//console.log('setting model');
						$parse(model).assign(scope, '');
					}else{
						//console.log('setting val');
						$input.val('');
					}
				});
			}, button);
			
			//match input show/hide
			scope.$watch(attrs.ngHide, function(newVal){
				if(newVal){
					console.log("hiding");
					console.log(button);
					button.hide();
				}else{
					button.show();
				}
			});
		}
	};
})
.directive('hasFocus', function ($ionicGesture) {
    return {
        restrict: 'A',
        link: function (scope, element, attr) {
			
            scope.$watch(attr.hasFocus, function (n, o) {
				if(n === o){
					return;
				}
				
                if (n !== 0 && n) {
					//console.log('setting focus');
                    element.focus();
                    element.select();
                }
            });
        }
    };
})

.directive('dropdown', function($ionicGesture){
	return{
		restrict:'A',
		link:function(scope, element, attrs){
			
			$ionicGesture.on('tap click', function(e){
				
			}, element);
		}
	}
})
;
