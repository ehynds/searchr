define(function(){
	var cache = {};
	
	return {
		store: function( term, key, data ){
			cache[term] = cache[term] || {};
			cache[term][key] = cache[term][key] || [];
			$.extend( cache[term][key], data );
		},
		get: function( term, key ){
			return cache[term] && cache[term][key]
				? cache[term][key]
				: null;
		}
	}
});