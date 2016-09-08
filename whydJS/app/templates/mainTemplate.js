/**
 * mainTemplate templates
 * server-side functions that are commonly used to render openwhyd pages
 * @author adrienjoly, whyd
 **/

var fs = require('fs');
var util = require("util");
var snip = require("../snip.js");
var uiSnippets = snip;
var templateLoader = require('../templates/templateLoader.js');
var config = require("../models/config.js");
var mongodb = require("../models/mongodb.js");
var render = {urlPrefix:""};

var includeSuffix = "?" + config.version;
var fbLikeUrl = 'http://www.facebook.com/openwhyd'; // 'http://openwhyd.org';

var youtubeKeyApi, playemFile;
var fbId;
if (config.urlPrefix.indexOf("openwhyd.org") >0) {
	console.log('- Production - ');
	fbId = "169250156435902";
	playemFile = "min";
}else if(config.urlPrefix.indexOf("whyd.fr") >0){
	console.log('- Test - ');
	fbId = "1059973490696893";
	playemFile = "all";
}else{
	console.log('- Local - ');
	fbId = "118010211606360";
	playemFile = "all";
};


console.log("[mainTemplate] today is week #", snip.getWeekNumber(new Date()));

var playerHtmlCode = fs.readFileSync("app/templates/whydPlayer.html", "utf8");

exports.defaultPageMeta = {
	img: config.urlPrefix + "/images/logo-black-square-smaller.png",
	desc: "The place for music lovers. Collect and share the tracks you love."
};


function makeMetaHead(options) {
	var options = options || {};
	var appUrl = options.pageUrl && ("whyd://app?href=" + snip.addSlashes(options.pageUrl.replace("https:", "http:").replace(config.urlPrefix, "")));
	var pageImg = uiSnippets.htmlEntities(options.pageImage || exports.defaultPageMeta.img);
	var pageDesc = uiSnippets.htmlEntities(options.pageDesc || exports.defaultPageMeta.desc);
	var meta = [
		'<meta name="google-site-verification" content="mmqzgEU1bjTfJ__nW6zioi7O9vuur1SyYfW44DH6ozg" />',
		'<meta name="apple-itunes-app" content="app-id=874380201' + (appUrl ? ', app-argument=' + appUrl : '') + '">',
		'<link rel="image_src" href="' + pageImg + '"/>',
		'<meta property="og:image" content="' + pageImg + '" />',
		'<meta property="og:description" content="' + pageDesc + '" />',
		'<meta property="fb:app_id" content="' + fbId + '" />',
		'<meta property="fb:admins" content="510739408" />',
		'<meta property="og:type" content="' + uiSnippets.htmlEntities(options.pageType || "website") + '" />'
	];
	if (options.pageTitle)
		meta.push('<meta property="og:title" content="'+uiSnippets.htmlEntities(options.ogTitle || options.pageTitle)+'" />');
	if (options.pageUrl)
		meta.push('<meta property="og:url" content="'+uiSnippets.htmlEntities(options.pageUrl)+'" />');
	return meta;
}

var htmlHeading = [
	'<!DOCTYPE html>',
	'<html>',
	'  <head prefix="og: http://ogp.me/ns# fb: http://ogp.me/ns/fb# whydapp: http://ogp.me/ns/fb/whydapp#">', // music: http://ogp.me/ns/music# video: http://ogp.me/ns/video# website: http://ogp.me/ns/website#
	'    <meta charset="utf-8" />'
];

exports.makeAnalyticsHeading = function(user) {
	// only render opengraph preferences (in order to avoid rendering a date object for nextEmail/nextEN)
	var userPrefs = {};
	for (var i in (user || {}).pref)
		if (i.indexOf("og") == 0)
			userPrefs[i] = user.pref[i];
	return [
		'<script>',
		'  window.user = ' + (!user ? '{}' : util.inspect({
				id: user.id,
				name: uiSnippets.htmlEntities(user.name),
				fbId: user.fbId,
				handle: uiSnippets.htmlEntities(user.handle),
				pref: userPrefs,
				lastFm: user.lastFm
			})) + ';',
		'  window.playTrack = window.playTrack || function(){};', // prevent videos from playing in another tab, until whydPlayer is loaded
		'</script>',
		'<script src="/js/whydtr.js' + includeSuffix + '"></script>'
	];
}

exports.analyticsHeading = exports.makeAnalyticsHeading().join('\n');

exports.renderHtmlFrame = function (body, head) {
	return htmlHeading.join("") + (head || "") + "</head><body><div id='fb-root'></div>" + body + "</body></html>";
}

exports.renderWhydFrame = function (html, params) {
	params = params || {};
	params.css = params.css || [];
	params.js = params.js || [];

	if (!params.nocss)
		params.css.unshift('common.css');

	if (params.request && !params.pageUrl)
		params.pageUrl = params.request.url;

	if (params.pageUrl && params.pageUrl.indexOf("/") == 0)
		params.pageUrl = config.urlPrefix + params.pageUrl;

	params.head = params.head || makeMetaHead(params);

	var out = htmlHeading.concat(params.head || []).concat([
		'    <meta http-equiv="CACHE-CONTROL" content="NO-CACHE" />',
		'    <meta http-equiv="Pragma" content="no-cache" />',
		'    <meta http-equiv="expires" content="0" />',
	//	'    <meta name="ROBOTS" content="NONE" />',
		'    <link href="'+render.urlPrefix+'/favicon.ico" rel="shortcut icon" type="image/x-icon" />',
		'    <link href="'+render.urlPrefix+'/favicon.png" rel="icon" type="image/png" />',
		"    <link href='//fonts.googleapis.com/css?family=Varela+Round' rel='stylesheet' type='text/css'>",
		"    <link href='//fonts.googleapis.com/css?family=Varela' rel='stylesheet' type='text/css'>",
		'    <link rel="search" type="application/opensearchdescription+xml" title="Whyd" href="'+config.urlPrefix+'/html/opensearch.xml">', // http://www.gravitywell.co.uk/blog/post/allow-google-chrome-and-other-browsers-to-search-your-site-directly-from-the-address-bar
		'    <link rel="chrome-webstore-item" href="https://chrome.google.com/webstore/detail/foohaghobcolamikniehcnnijdjehfjk">' // https://developers.google.com/chrome/web-store/docs/inline_installation?hl=fr
	]).concat(exports.makeAnalyticsHeading(params.loggedUser));

	if (params.title)
		out.push('    <title>' + uiSnippets.htmlEntities(params.title) + '</title>');

	for (var i in params.css)
		out.push('    <link href="'+render.urlPrefix+'/css/'+params.css[i]+includeSuffix+'" rel="stylesheet" type="text/css" />');

	out.push(
	//	'    <script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js"></script>',
	//	'    <script type="text/javascript" src="'+render.urlPrefix+'/js/jquery-1.8.2.min.js"></script>',
		'    <script src="//code.jquery.com/jquery-1.10.2.min.js"></script>',
		'    <script src="//code.jquery.com/jquery-migrate-1.2.1.js"></script>',
		'    <script type="text/javascript" src="'+render.urlPrefix+'/js/jquery.history.js"></script>',
	//	'    <script src="/js/soundmanager2.js"></script>',
		'    <script src="/js/soundmanager2-nodebug-jsmin.js"></script>',
		'    <script>soundManager.setup({url: "/swf/", flashVersion: 9, onready: function() {soundManager.isReady=true;}});</script>'
	);

	var jsIncludes = [];
	for (var i in params.js) {
		var src = params.js[i].indexOf("//") > -1 ? params.js[i] : render.urlPrefix+'/js/'+params.js[i]+includeSuffix;
		jsIncludes.push('    <script src="'+src+'" type="text/javascript" charset="utf-8"></script>');
	}

	if(!params.loggedUser || !params.loggedUser.id)
		params.bodyClass = (params.bodyClass || '') + ' visitor';


	out = out.concat([
		'  </head>',
		'  <body class="'+(params.bodyClass || '')+'">',
		'   <div id="fb-root"></div>',
			html,
			"<script>", // for all openwhyd pages, including playlist embed

			'var DEEZER_APP_ID = 190482;',
			'var DEEZER_CHANNEL_URL = window.location.href.substr(0, window.location.href.indexOf("/", 10)) + "/html/channel.html";',
			'var SOUNDCLOUD_CLIENT_ID = "eb257e698774349c22b0b727df0238ad";',
			'var YOUTUBE_API_KEY = "AIzaSyADm2ekf-_KONB3cSGm1fnuPSXx3br4fvI";',	
			'var JAMENDO_CLIENT_ID = "2c9a11b9";',
			"</script>",
			// TODO: move credentials to makeAnalyticsHeading()
			jsIncludes.join('\n'),
		'  </body>',
		'</html>'
	]);

	return out.join("\n");
}
exports.renderHeader = function(user, content, params) {
	var uid = user ? user.id : null;
	var content = content || [
		'  <div id="headCenter">',
		'   <a id="logo" alt="OpenWhyd" target="_top" class="homeLink" href="/">',
		// '     <img id="logo" src="'+render.urlPrefix+'/images/logo-s.png" />',
		'   </a>',
		(uid ? '<div id="notifIcon">0</div><div id="notifPanel"></div>' : ''),
		'  </div>',
	].concat(uid ? [
		'  <div id="navbar">',
		'   <a target="_top" id="tabStream" href="/">Stream</a>',
		'   <a target="_top" id="tabHot" href="/hot">Hot Tracks</a>',
//		'   <a target="_top" id="tabProfile" href="/u/'+user.id+'">Profile</a>',
	//	'   <a target="_top" id="tabDiscover" href="/discover/users">Discover</a>',
		'  </div>',
		'  <div id="searchBar">',
		'   <div class="searchForm" id="searchForm">', //<form id="searchForm" method="get" action="'+render.urlPrefix+'/search">',
		'    <input name="q" class="q search-input" id="q" type="text" value="' + uiSnippets.htmlEntities(params.q) + '" placeholder="Search for a song, artist, genre, etc" autocomplete="off" />',
	//	'    <input type="button" id="searchClear" />',
		'   </div>', //</form>',
		'   <div class="searchResults" id="searchResults"></div>',
		'  </div>',
		'  <div id="navLinks">',

		'   <div id="loginDiv">',
		'    <a href="/u/'+user.id+'" >',
		'     <div class="image" style="background-image:url('+(user.img || '/img/u/'+user.id)+');"></div>',
		'			<strong class="username">'+user.name + '</strong>',
	//	'      <img src="/img/u/'+user.id+'" />', // /images/icon-userconfig-menu.png
		'    </a>',
		'    <div class="puce">',
		'      <div class="submenu">',
		'        <a href="/u/'+user.id+'/playlists">Playlists</a>', //  class="no-ajaxy"
		'        <a href="/u/'+user.id+'/likes">Likes</a>',
		'      </div>',
		'    </div>',
		'   </div>',

		'   <div id="settingsDiv">',
		'	  <div class="btn"></div> ',
		'     <span class="puce"></span>',
		'	  <div class="submenu">',
		'      <a href="/invite">Invite friends</a>', 
		'      <a href="/button">Install "Add Track" button</a>',
		'      <a href="/settings">Settings</a>',
		'      <a href="/login?action=logout" class="no-ajaxy">Logout</a>', //javascript:logout()
		'     </div>',
		'   </div>', 
		'  </div>'
	] : [
		'  <div id="searchBar">',
		'  <h1>The community of music lovers</h1>',
		'	 <p>Collect and share the best music in the world</p>',
		'   <div class="searchForm" id="searchForm">', //<form id="searchForm" method="get" action="'+render.urlPrefix+'/search">',
		'    <input name="q" class="q search-input" id="q" type="text" value="' + uiSnippets.htmlEntities(params.q) + '" placeholder="Search for a song, artist, genre, etc" autocomplete="off" />',
		//	'    <input type="button" id="searchClear" />',
		'   </div>', //</form>',
		'   <div class="searchResults" id="searchResults"></div>',
		'  </div>',
		'  <div id="logBox">',
		'   <a id="get-app" href="https://itunes.apple.com/fr/app/whyd-everyones-music-playlist/id874380201" target="_black">Get App</a>',
		'   <a id="signin" href="/login">Login</a>',
		'   <a id="signup" onclick="login();">Sign up</a>',
		'  </div>'
	]);
	return [ '<div id="header"><div class="container">' ]
		.concat(content)
		.concat([ '</div></div>' ])
		.join("\n");
}

exports.renderWhydPage = function (params) {
	var params = params || {};

	params.title = (params.pageTitle ? params.pageTitle + ' - ' : '') + "openwhyd";

	params.js = (params.noDefaultJs ? [] : [
		"jquery.avgrund.js",
		"jquery.tipsy.js", // replaces tooltip.js
		"quickSearch.js",
	//	"md5.js",

		"jquery.iframe-post-form.min.js",
		"jquery.placeholder.min.js",
		"underscore-min.js", // for jquery.mentionsInput.js
		"jquery.elastic.js", // for jquery.mentionsInput.js
		"jquery.mentionsInput.js",
		"ui.js",
		"whyd.js", // topicBrowser.js
	//	"ContentEmbed.js", // definitely replaced by playemjs, at last! :-)
		"swfobject.js",
	]).concat([
		"playem-" + playemFile + ".js",
	]).concat([
		"playem-youtube-iframe-patch.js",
		"whydPlayer.js",
	//	"postBox.js", // search and modal functions were moved to whyd.js
		"dndUpload.js",
		"WhydImgUpload.js"
	//	"ajaxUpload.js"
	]).concat(params.js || []).concat(params.noDefaultJs ? [] : ["facebook.js"]);

	params.css = [
		"browse.css",
	//	"postBox.css", // loaded on demand
		"tipsy.css",
		"userProfileV2.css",
		"userPlaylistV2.css",
		"dlgEditProfileCover.css"
	].concat(params.css || []);

	var user = params.loggedUser || {};
	console.log("connected user:", user.name, user.id);

	if (user && user.id == "4d94501d1f78ac091dbc9b4d") // adrien
		params.js.push("adrien.js");

	// other recognized params: bodyClass, head, content, sidebar

	var uid = (user || {}).id;

	var out = [
		'<!--[if lt IE 8]>',
		'<div class="topWarning">Warning: your web browser is not supported by OpenWhyd. Please upgrade to a modern browser.</div>',
		'<![endif]-->',
	//	'<a id="feedbackLink" href="mailto:contact@openwhyd.org?subject=[proto-support]&body=Please%20enter%20your%20feedback%20here">Send feedback</a>',
	//	'<a id="feedbackLink" href="#" onclick="UserVoice.Popin.show(uservoiceOptions); return false;">&nbsp;</a>',
		exports.renderHeader(user, params.whydHeaderContent, params),
		'<div id="contentPane">',
/*
!uid ?	'  <div id="inviteBanner">' : '',
!uid ?	'   <p>Keep, Play & Share every track in one place</p>' : '',
			// Collect and share tracks you love
			// Collect music you love from all over the web
			// Add your tracks into the stream, for the world to hear
			// Collect and share every track in one place
			// Collect and share tracks you love
			// Keep, Play and Share every track in one place
!uid ?	(
			config.landingStream ?
			'   <a id="askInviteLink" class="btnAdd" href="/signup">Sign up</a>' :
			'   <a id="askInviteLink" class="btnAdd" href="/">Ask for an invite</a>'
		) : '',
!uid ?	'   <a id="loginBtn" class="grayButton" href="/login">Log In</a>' : '',
!uid ?	'   <img src="/images/landing/note-illu.png">' : '',
!uid ?	'  </div>' : '',
*/
		'  <div id="mainPanel">',
			params.content || '',
		'  </div>',
		'</div>',
		playerHtmlCode,
		params.footer || exports.footer,
		exports.olark,
		params.endOfBody || "",
	//	'<script src="'+render.urlPrefix+'/js/uservoice.js"></script>'
	];

	return this.renderWhydFrame(out.join("\n"), params);
}

// SUPPORTED PARAMETERS
/*
var params = {
	request: request, // => pageUrl => meta og:url element
	loggedUser: loggedUser,
	pageUrl:
	pageType:
	pageDesc:
	pageImage: "<url>", // => og:image meta property
	ogTitle: (og: only)
	whydHeaderContent: ['<div id="headCenter">...</div>'], // contents of #header
	pageTitle: "",
	js: [],
	css: [],
	content: "coucou",
	footer: "",
};
*/

// MINIMAL EXAMPLE OF USE: /admin/testMainTemplate.js

exports.makeWhydPageFromFile = function(path, params){
	params = params || {};
	params.content = fs.readFileSync(path, "utf8");
	return exports.renderWhydPage(params);
}

exports.makeWhydPageRendererFromFile = function(path){
	var content = fs.readFileSync(path, "utf8");
	return function(params){
		params = params || {};
		params.content = content;
		return exports.renderWhydPage(params);
	};
}

exports.renderAsyncWhydPageFromTemplateFile = function(templateFilePath, templateParams, whydPageParams, cb, forceReload){
	templateLoader.loadTemplate(templateFilePath, function(template){
		whydPageParams = whydPageParams || {};
		whydPageParams.content = template.render(templateParams);
		cb(exports.renderWhydPage(whydPageParams));
	}, forceReload);
}
