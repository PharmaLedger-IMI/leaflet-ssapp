System.register([],(function(e){"use strict";return{execute:function(){var t=e("KEYBOARD_DID_OPEN","ionKeyboardDidShow");var r=e("KEYBOARD_DID_CLOSE","ionKeyboardDidHide");var i=150;var n={};var a={};var o=false;var s=e("resetKeyboardAssist",(function(){n={};a={};o=false}));var u=e("startKeyboardAssist",(function(e){d(e);if(!e.visualViewport){return}a=b(e.visualViewport);e.visualViewport.onresize=function(){y(e);if(c()||h(e)){f(e)}else if(p(e)){v(e)}}}));var d=function(e){e.addEventListener("keyboardDidShow",(function(t){return f(e,t)}));e.addEventListener("keyboardDidHide",(function(){return v(e)}))};var f=e("setKeyboardOpen",(function(e,t){g(e,t);o=true}));var v=e("setKeyboardClose",(function(e){l(e);o=false}));var c=e("keyboardDidOpen",(function(){var e=(n.height-a.height)*a.scale;return!o&&n.width===a.width&&e>i}));var h=e("keyboardDidResize",(function(e){return o&&!p(e)}));var p=e("keyboardDidClose",(function(e){return o&&a.height===e.innerHeight}));var g=function(e,r){var i=r?r.keyboardHeight:e.innerHeight-a.height;var n=new CustomEvent(t,{detail:{keyboardHeight:i}});e.dispatchEvent(n)};var l=function(e){var t=new CustomEvent(r);e.dispatchEvent(t)};var y=e("trackViewportChanges",(function(e){n=Object.assign({},a);a=b(e.visualViewport)}));var b=e("copyVisualViewport",(function(e){return{width:Math.round(e.width),height:Math.round(e.height),offsetTop:e.offsetTop,offsetLeft:e.offsetLeft,pageTop:e.pageTop,pageLeft:e.pageLeft,scale:e.scale}}))}}}));