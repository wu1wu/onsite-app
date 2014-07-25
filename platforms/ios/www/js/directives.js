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
	  			$scope.component.state[input.alias].userValue = true;
	  			$scope.digestValues();
	  			$scope.save();

	  		}else{
	  			//$scope.setStatus({status:"Saved!"});
	  		}
	  		$scope.view.activeInputValue = null;
	  	};
	
	  	$scope.onInputChange = function(input){
			console.log("setting user value");
			$scope.component.state[input.alias].userValue = true;
			$scope.digestValues();
			$scope.save();
	  	};
		
		$scope.$watch('component', function(newValue, oldValue){
			if(newValue === oldValue){return;}
			
			if(newValue){
				$scope.digestValues();
			}
		});
		
		//INPUT ENGINE
	    $scope.digestValues = function(restoreDefaults){
			
			//initialize state object if not already present
		  if(!$scope.component.state){
			  $scope.component.state = {};
		  }
      
	      for(var i = 0; i < $scope.component.schema.sections.length; i++){
          
	            var hiddenInputs = 0;
	            var section = $scope.component.schema.sections[i];
	            section.view = {};
          
	            _.each(section.inputs, function(input){
	              var timer = new Date();  
	              console.log('----------' + input.name + "----------"); 
				  
		          //create the new scope for the inputs - NEEDS to refresh for each input.
		          var inputScope = {};
				  inputScope = $.extend({}, $scope.project.values, $scope.component.values);
				  console.log(inputScope);
		
  				  //initialize input state if necessary
  				  if(!$scope.component.state[input.alias]){
  					$scope.component.state[input.alias] = {};
  				  }
  			 	  var inputState = $scope.component.state[input.alias];
				  console.log(inputState);
				  
	              //view controls  - check if hidden then go to next in loop        
	              if(input.hidden){   
					  console.log(input.hidden);
					  console.log($parse(input.hidden)(inputScope));            
	                  if($parse(input.hidden)(inputScope)){
						  inputState.isHidden = true;
	                      hiddenInputs += 1;
	                      return;
	                  }else{
	                       inputState.isHidden = false;              
	                  }
	              }else{
					  inputState.isHidden = false;
	              }
            
	              //if restoring defaults, set userValue to false, will recalculate default values
	              if(restoreDefaults){
	                  inputState.userValue = false;
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
					  //initialize input state options
	                  inputState.options = [];                
                
	                  if(inputOptions.length === 1 && !inputState.userValue){     
						  //if just one, set this to the input value      
						  console.log("184 - " + $parse(inputOptions[0])(inputScope));          
	                      placeholder.inputValue = $parse(inputOptions[0])(inputScope);                    
	                  }
                
	                  if(inputOptions.length > 1){
	                      for(var i = 0;i < inputOptions.length; i++){
	                          inputState.options.push($parse(inputOptions[i])(inputScope));
	                      }
						  //when more than one, set the first matching option to the input value
						  console.log("184 - " + inputState.options[0]); 
						  placeholder.inputValue = inputState.options[0];
	                  }              
	              } //end lookup table options    
            
	              //check default value
	              if(!inputState.userValue && input.defaultValue){
					  //if the default value hasn't been overrided and this is not supposed to be a dropdown list, calculate new value
	                  if(input.defaultValue.indexOf(";") === -1){                      
	                      var expression = angular.copy(input.defaultValue);
						  console.log("193 - " + $parse(expression)(inputScope)); 
                          placeholder.inputValue = $parse(expression)(inputScope);

	                  }
	              }
				  
				  //set up dropdown options from default value list
	              if(input.defaultValue){
	                  if(input.defaultValue.indexOf(";") !== -1){    
	                      var inputOptions = input.defaultValue.split(";");                
	                      //console.log(inputOptions);
	                      inputState.options = []; 
						  
						  //set first value as default             
	                      if(!inputState.userValue){  
							  console.log("207 - " + $parse(inputOptions[0])(inputScope));                 
	                          placeholder.inputValue = $parse(inputOptions[0])(inputScope);                 
	                      }
						  
	                      if(inputOptions.length > 1){
	                          for(var i = 0;i < inputOptions.length; i++){
	                              inputState.options.push($parse(inputOptions[i])(inputScope));
	                          }
	                      }
	                  }
	              }
            
            	  console.log(placeholder);
	              if(placeholder.inputValue !== undefined){//if a new value should be assigned
					  //if not not a number (ie a number), then set it as such
					  if(!isNaN(placeholder.inputValue)){
						  placeholder.inputValue = Number(placeholder.inputValue);
					  }else if(Object.prototype.toString.call(placeholder.inputValue) === '[object Date]'){//catch date objects and convert to ISO string format
					  	  placeholder.inputValue = placeholder.inputValue.toISOString();
					  }

	                  if($scope.component.schema.type === 'Descriptive'){
	                      $scope.project.values[input.alias] = placeholder.inputValue;//if descriptive library, add it to the project values
	                  }else{
	                      $scope.component.values[input.alias] = placeholder.inputValue;//if component, add it to component values
	                  }
	              }
            
	              var endTime = new Date();
	              var elapsed = endTime.getTime() - timer.getTime();
	              console.log("Timer: " + elapsed);
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
			
			//append if called for
			console.log("clearButton: " + scope.$eval(attrs.clearButton));
			if(scope.$eval(attrs.clearButton) || scope.$eval(attrs.clearButton) === undefined){
				if(container.length > 0){
					container.append(button);
				}else{
					label.append(button);
				}	
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
			if(attrs.ngHide){
				scope.$watch(attrs.ngHide, function(newVal){
					if(newVal){
						console.log("hiding");
						button.hide();
					}else{
						button.show();
					}
				});
			}
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
.directive('advanceOnChange', function(){
	return {
		restrict: 'A',
		link:function(scope, element, attrs){
			$(element[0]).on("change",function(){
				console.log("changed!");
				var address = attrs.index.split(".");
				console.log("focussing on:");
				var nextInput = parseInt(address[1]) + 1;
				var nextAddress = address[0] + "." + nextInput;
				var nextElement = $("[data-index='"+nextAddress+"']:not(.ng-hide)");
				if(nextElement.length == 1){
					nextElement.focus();
					console.log("one");
					console.log(nextElement);
				}else{
					var section = parseInt(address[0]) + 1;
					nextAddress = section + ".0";
					nextElement = $("[data-index='"+nextAddress+"']");
					console.log("next section");
					console.log(nextElement);
					nextElement.focus();
				}
			});
		}
	};
})
.directive('autocomplete', function($ionicGesture){
  var index = -1;
  return {
    restrict: 'E',
    scope: {
      searchParam: '=ngModel',
      suggestions: '=data',
      onType: '=onType'
    },
    controller: function($scope, $element, $attrs){
      $scope.searchParam;

      // with the searchFilter the suggestions get filtered
      $scope.searchFilter;

      // the index of the suggestions that's currently selected
      $scope.selectedIndex = -1;

      // set new index
      $scope.setIndex = function(i){
        $scope.selectedIndex = parseInt(i);
		console.log("set selected index: " + i);
      }

      this.setIndex = function(i){
        $scope.setIndex(i);
        $scope.$apply();
      }

      $scope.getIndex = function(i){
        return $scope.selectedIndex;
      }

      // watches if the parameter filter should be changed
      var watching = true;

      // autocompleting drop down on/off
      $scope.completing = false;

	  //input DOM element
	  var $input = $($element[0]).find('input');

      // starts autocompleting on typing in something
      $scope.$watch('searchParam', function(newValue, oldValue){
        if (oldValue === newValue) {
          return;
        }

        if(watching && $scope.searchParam && $input.is(":focus")) {
          $scope.completing = true;
          $scope.searchFilter = $scope.searchParam;
          $scope.selectedIndex = -1;
        }
		else if(!$scope.searchParam){
			$scope.searchFilter = '';
		}

        // function thats passed to on-type attribute gets executed
        if($scope.onType)
          $scope.onType($scope.searchParam);
      });

      // for hovering over suggestions
      this.preSelect = function(suggestion){

        watching = false;

        // this line determines if it is shown 
        // in the input field before it's selected:
        //$scope.searchParam = suggestion;

        $scope.$apply();
        watching = true;

      }

      $scope.preSelect = this.preSelect;

      this.preSelectOff = function(){
        watching = true;
      }

      $scope.preSelectOff = this.preSelectOff;

      // selecting a suggestion with RIGHT ARROW or ENTER
      $scope.select = function(suggestion){
        if(suggestion){
          $scope.searchParam = suggestion;
          $scope.searchFilter = suggestion;
        }
        watching = false;
        $scope.completing = false;
        $scope.setIndex(-1);
      }


    },
    link: function(scope, element, attrs){
	  var $input = $(element[0]).find('input');
      var attr = '';

      // Default atts
      scope.attrs = {
        "placeholder": "start typing...",
        "class": "",
        "id": "",
        "inputclass": "",
        "inputid": ""
      };

      for (var a in attrs) {
        attr = a.replace('attr', '').toLowerCase();
        // add attribute overriding defaults
        // and preventing duplication
        if (a.indexOf('attr') === 0) {
          scope.attrs[attr] = attrs[a];
        }
      }

      if(attrs["clickActivation"]=="true"){		


        $input.on('focus', function(e){
            scope.completing = true;
            scope.$apply();
        });
      }

      var key = {left: 37, up: 38, right: 39, down: 40 , enter: 13, esc: 27};

      document.addEventListener("keydown", function(e){
        var keycode = e.keyCode || e.which;

        switch (keycode){
          case key.esc:
            // disable suggestions on escape
            scope.select();
            scope.setIndex(-1);
            scope.$apply();
            e.preventDefault();
        }
      }, true);
      
      $input.on("blur", function(e){
        // disable suggestions on blur
        // we do a timeout to prevent hiding it before a click event is registered
		
        console.log('blur');
		var index = scope.getIndex();
        scope.select(angular.element(element.find('li')[index]).text());
        scope.setIndex(-1);
        scope.$apply();
      });

      element[0].addEventListener("keydown",function (e){
        var keycode = e.keyCode || e.which;

        var l = angular.element(this).find('li').length;

        // implementation of the up and down movement in the list of suggestions
        switch (keycode){
          case key.up:    
 
            index = scope.getIndex()-1;
            if(index<-1){
              index = l-1;
            } else if (index >= l ){
              index = -1;
              scope.setIndex(index);
              scope.preSelectOff();
              break;
            }
            scope.setIndex(index);

            if(index!==-1)
              scope.preSelect(angular.element(angular.element(this).find('li')[index]).text());

            scope.$apply();

            break;
          case key.down:
            index = scope.getIndex()+1;
            if(index<-1){
              index = l-1;
            } else if (index >= l ){
              index = -1;
              scope.setIndex(index);
              scope.preSelectOff();
              scope.$apply();
              break;
            }
            scope.setIndex(index);
            
            if(index!==-1)
              scope.preSelect(angular.element(angular.element(this).find('li')[index]).text());

            break;
          case key.left:    
            break;
          case key.right:  
          case key.enter:  

            index = scope.getIndex();
            // scope.preSelectOff();
            if(index !== -1)
              scope.select(angular.element(angular.element(this).find('li')[index]).text());
            scope.setIndex(-1);     
            scope.$apply();

            break;
          case key.esc:
            // disable suggestions on escape
            scope.select();
            scope.setIndex(-1);
            scope.$apply();
            e.preventDefault();
            break;
          default:
            return;
        }

        if(scope.getIndex()!==-1 || keycode == key.enter)
          e.preventDefault();
      });
    },
    template: '<div class="autocomplete {{attrs.class}}" id="{{attrs.id}}">'+
                '<input type="text" tabindex="101" ng-model="searchParam" placeholder="{{attrs.placeholder}}" class="{{attrs.inputclass}}" id="{{attrs.inputid}}" clear-button/>' +
				'<div class="arrow" ng-show="(completing && filteredList.length > 0)">▲</div>' + 
                '<ul ng-show="(completing && filteredList.length > 0)" class=\'card list\'>' +
                  '<li suggestion ng-repeat="suggestion in filteredList = (suggestions | filter:searchFilter | orderBy:\'toString()\') track by $index"'+
                  'index="{{$index}}" val="{{suggestion}}" ng-class="{active: '+
                  '($index == selectedIndex)}" io-tap="select(suggestion)" '+
                  'ng-bind-html="suggestion | highlight:searchParam" class="item">'+
                  '</li>'+
                '</ul>'+
              '</div>'
    // templateUrl: 'script/ac_template.html'
  }
})
.filter('highlight', function ($sce) {

  return function (input, searchParam) {

    if (searchParam) {
      var words = searchParam.split(/\ /).join('|'),
          exp = new RegExp("(" + words + ")", "gi");

      if (words.length) {
        input = $sce.trustAsHtml(input.replace(exp, "<span class=\"highlight\">$1</span>")); 
      }
    }

    return input;

  }

})
.directive('suggestion', function(){
  return {
    restrict: 'A',
    require: '^autocomplete', // ^look for controller on parents element
    link: function(scope, element, attrs, autoCtrl){
      element.bind('mouseenter', function() {
        autoCtrl.preSelect(attrs['val']);
        autoCtrl.setIndex(attrs['index']);
      });

      element.bind('mouseleave', function() {
        autoCtrl.preSelectOff();
      });
    }
  }
});
