#SIPML Angular Service

Angular SIPML service. Facilitate a bridge between [https://github.com/DoubangoTelecom/sipml5](https://github.com/DoubangoTelecom/sipml5) and Angular.  

##Usage

Add sm.sipml.js to your application and include sm.sipml as a module dependency.
```javascript
angular.module('app', ['sm.sipml']);
``` 

Within your controller, include sipml as a dependency. You can then use the following to initialise a connection.
```javascript
sipml.init(loginDetails).then(() => {
    sipml.onSipSessionCallConnected(() => {
        
    });
    sipml.onSipSessionCallConnecting(() => {
        
    });
    sipml.onSipSessionCallDeclined(() => {
        
    });
    sipml.onSipSessionCallIncoming((number) => {
        
    });
    sipml.onSipSessionCallRinging(() => {
        
    });
    sipml.onSipSessionCallTerminated(() => {
        
    });
});
``` 