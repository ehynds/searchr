// this is the boot loader, necessary to avoid race conditions.
// this file loads in 3rd party plugins/libs that must exist before
// modules are loaded.  it also loads in our main app, which is defined
// as a module.  once our 3rd party dependencies are in, the app is kicked off.
 
require(
	[ "app", "scripts/vendor/jquery.pubsub.js", "scripts/vendor/jquery.tmpl.js" ],
	function( app ){
		app();
	}
);