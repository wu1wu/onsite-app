// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js
angular.module('starter', 
[
	'ionic', 
	'starter.controllers',
	'starter.directives',
	'starter.services',
	'corner-pocket',
	'autocomplete'
])

.run(function($ionicPlatform, $ngPouch) {
  $ionicPlatform.ready(function() {
    if(window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
	//disable native scrolling
	if(cordova){
		cordova.plugins.Keyboard.disableScroll(true);
	}
	
	
    //assign default server
    if(!localStorage.server){
            localStorage.server = 'http://base.onsitedatacollection.com/';
    }
  });  
})
.config(function($stateProvider, $urlRouterProvider, $compileProvider) {
  $stateProvider
  
    .state('login', {
    	url:'/login',
		templateUrl: 'templates/login.html',
		controller:'loginController'
    })

    .state('app', {
      url: "/app",
      abstract: true,
      templateUrl: "templates/menu.html",
      controller: 'AppCtrl',
	  resolve:{factory: 'routeAuth'}
    })

    .state('app.projects', {
      url: "/projects",
      views: {
        'menuContent' :{
          templateUrl: "templates/projects.html",
          controller:'projectsController'
        }
      }
    })
    
    .state('app.projectPage', {
      url: "/project/:projectId",
      views: {
        'menuContent' :{
          templateUrl: "templates/projectPage.html",
          controller:'projectPageController'
        }
      }
    })
    
    .state('app.templates', {
      url: "/templates",
      views: {
        'menuContent' :{
          templateUrl: "templates/templates.html",
          controller: 'templatePageController'
        }
      }
    })
	/*
    .state('app.single', {
      url: "/template/:projectId",
      views: {
        'menuContent' :{
          templateUrl: "templates/playlist.html",
          controller: 'PlaylistCtrl'
        }
      }
    })*/;
  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/login');
  /*
  PouchDB.destroy('test', function(err, info) { });
  
  PouchDB.destroy('onsite', function(err, info) { });
   */
  
});

