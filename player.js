(function(){
const TRACK_TYPE_MP3 = "mp3";
const TRACK_TYPE_YOUTUBE = "ytb";

let aplaynum = 0;
let player;
let audio = new Audio();
let arlist = [];
let playflg = 0;
let playerReady = false;
let uiReady = false;
let youtubeApiRequested = false;

document.addEventListener("DOMContentLoaded", function(){
	injectYplayerStyles();
	initializeYplayer();
});

function injectYplayerStyles(){
	const styleTag = document.createElement("style");
	document.head.appendChild(styleTag);
	styleTag.textContent = `
@charset "utf-8";

#yplayer-wrap {
	box-sizing:border-box;
	background-color:#fff;
	color:#333;
	padding:20px;
	position:fixed;
	bottom:20px;
	left:-100%;
	overflow:hidden;
	border-radius:0px 10px 10px 0px;
	box-shadow:rgba(0, 0, 0, 0.4) 0px 2px 10px 0px;
	transition:.4s;
}
#yplayer-wrap * {
	box-sizing:border-box;
	line-height:1;
}
#yplayer-wrap a {
	color:#999;
}
#yplayer-title {
	width:100%;
	margin:0px auto;
	padding:10px 50px 10px 0px;
}
#yplayer-inner {
	display:flex;
	gap:20px;
	max-width:800px;
	margin:10px auto 0;
}
#yplayer-footer {
	width:100%;
	margin:0px auto;
	padding:10px 0px;
	text-align:right;
}
#yplayer-content {
	width:420px;
	display:table-cell;
	vertical-align:top;
	background-color:#000;
	position:relative;
}
#yplayer-tracklist-wrap {
	width:300px;
	display:table-cell;
	vertical-align:top;
	overflow:hidden;
}
#yplayer-youtube-wrap {
	padding-top:56%;
	position:relative;
	display:none;
}
#yplayer-youtube {
	display:block;
	position:absolute;
	width:100%;
	height:100%;
	top:0;
	left:0;
}
#yplayer-audio-wrap {
	display:none;
	position:absolute;
	bottom:0px;
	left:0px;
	width:100%;
}
#yplayer-audio {
	display:block;
}
#yplayer-tracklist {
	height:235px;
	overflow-y:auto;
	width:100%;
}
#yplayer-tracklist a {
	display:block;
	text-decoration:none;
	white-space:nowrap;
	padding:6px 5px;
	overflow:hidden;
	font-size:12px;
	text-overflow:ellipsis;
	max-width:320px;
}
#yplayer-tracklist a.active {
	color:#333;
}
#yplayer-tracklist a.error {
	color:#f00;
}
#yplayer-audio {
	width:100%;
}
a#yplayer-closebtn {
	position:absolute;
	display:block;
	right:0px;
	top:0px;
	background-color:rgba(0,0,0,.1);
	width:40px;
	height:25px;
}
a#yplayer-openbtn {
	position:fixed;
	display:block;
	left:0;
	bottom:20px;
	background-color:#fff;
	width:20px;
	height:40px;
	border-radius:0px 10px 10px 0px;
	transition:.4s;
	box-shadow:rgba(0, 0, 0, 0.4) 0px 2px 10px 0px;
	transition:.4s;
}

@media screen and (max-width:768px){
	#yplayer-wrap {
		top:50px;
		bottom:auto;
		width:100%;
		padding:0px;
		border-radius:0px;
	}
	#yplayer-title {
		width:100%;
		margin:0px;
		padding:10px 50px 10px 10px;
	}
	#yplayer-footer {
		width:100%;
		margin:0px;
		padding:10px;
	}
	#yplayer-inner,
	#yplayer-content,
	#yplayer-tracklist-wrap {
		display:block;
		width:100%;
	}
	#yplayer-tracklist-wrap {
		width:100%;
	}
	#yplayer-tracklist a {
		width:100%;
		max-width:100%;
	}
}
	`;
}

function initializeYplayer(){
	document.body.style.position = "relative";

	const elements = buildYplayerDom();
	audio = elements.audioElement;

	tagreload();
	uiReady = true;
	mstart();

	// YouTube is optional. MP3-only pages can work without loading the iframe API.
	if(hasYouTubeTracks()){
		requestYouTubeIframeAPI();
	}

	audio.addEventListener("ended", playNextTrack);
}

function buildYplayerDom(){
	const wrap = createElement("div", {"id":"yplayer-wrap"});
	const openButton = createElement("a", {"href":"#", "id":"yplayer-openbtn", "class":"yplayer-open"});
	const title = createElement("div", {"id":"yplayer-title"}, "\u00a0");
	const inner = createElement("div", {"id":"yplayer-inner"});
	const footer = createElement("div", {"id":"yplayer-footer"});
	const closeButton = createElement("a", {"href":"#", "id":"yplayer-closebtn", "class":"yplayer-close"});
	const content = createElement("div", {"id":"yplayer-content"});
	const tracklistWrap = createElement("div", {"id":"yplayer-tracklist-wrap"});
	const tracklist = createElement("div", {"id":"yplayer-tracklist"});
	const youtubeWrap = createElement("div", {"id":"yplayer-youtube-wrap"});
	const youtube = createElement("div", {"id":"yplayer-youtube"});
	const audioWrap = createElement("div", {"id":"yplayer-audio-wrap"});
	const audioElement = createElement("audio", {"id":"yplayer-audio", "controls":"controls"});

	audioElement.appendChild(createElement("p", null, "HTML5 audio not supported"));

	document.body.appendChild(wrap);
	document.body.appendChild(openButton);
	wrap.appendChild(title);
	wrap.appendChild(inner);
	wrap.appendChild(footer);
	wrap.appendChild(closeButton);
	inner.appendChild(content);
	inner.appendChild(tracklistWrap);
	tracklistWrap.appendChild(tracklist);
	content.appendChild(youtubeWrap);
	youtubeWrap.appendChild(youtube);
	content.appendChild(audioWrap);
	audioWrap.appendChild(audioElement);

	return {
		audioElement: audioElement
	};
}

function createElement(tagName, attrs, text){
	const element = document.createElement(tagName);
	if(attrs){
		Object.keys(attrs).forEach(function(name){
			element.setAttribute(name, attrs[name]);
		});
	}
	if(text !== undefined){
		element.textContent = text;
	}
	return element;
}

function tagreload(){
	arlist = collectPlayableTracks();
	renderTracklist();
}

function collectPlayableTracks(){
	const tracks = [];

	Array.prototype.forEach.call(document.querySelectorAll("a[href]"), function(anchor){
		const track = parseTrackFromAnchor(anchor, tracks.length);
		if(!track){
			return;
		}

		anchor.classList.add("yplayer");
		anchor.setAttribute("data-yplaynum", track.yplaynum);
		tracks.push(track);
	});

	return tracks;
}

function parseTrackFromAnchor(anchor, index){
	const pathh = anchor.getAttribute("href") || "";
	const title = anchor.getAttribute("data-title") || anchor.textContent || "notitle";
	const dataimg = anchor.getAttribute("data-img");

	if(isMp3Link(pathh)){
		return createTrack(index, TRACK_TYPE_MP3, title, pathh, dataimg);
	}

	const videoId = getYouTubeVideoId(pathh);
	if(videoId){
		return createTrack(index, TRACK_TYPE_YOUTUBE, title, videoId, dataimg);
	}

	return null;
}

function createTrack(index, type, title, path, image){
	return {
		"yplaynum": index,
		"m": type,
		"title": title,
		"path": path,
		"img": image
	};
}

function renderTracklist(){
	const tracklist = document.getElementById("yplayer-tracklist");
	if(!tracklist){
		return;
	}

	tracklist.textContent = "";

	for(let i = 0; i < arlist.length; ++i){
		const trackNumber = i + 1;
		const link = createElement("a", {"href":"#", "class":"yplayer", "data-yplaynum":i}, trackNumber + ". " + arlist[i].title);
		tracklist.appendChild(link);
	}
}

function isMp3Link(href){
	return /\.mp3(?:[?#].*)?$/i.test(href);
}

function getYouTubeVideoId(pathh){
	try {
		const url = new URL(pathh, window.location.href);
		if(url.hostname === "youtu.be"){
			return url.pathname.replace(/^\/+/, "").split("/")[0] || "";
		}
		if(url.hostname === "www.youtube.com" || url.hostname === "youtube.com"){
			return url.searchParams.get("v") || "";
		}
	} catch(error) {
		return "";
	}
	return "";
}

function hasYouTubeTracks(){
	return arlist.some(function(item){
		return item.m === TRACK_TYPE_YOUTUBE;
	});
}

function requestYouTubeIframeAPI(){
	if(youtubeApiRequested){
		return;
	}
	youtubeApiRequested = true;

	const tag = document.createElement("script");
	tag.src = "https://www.youtube.com/iframe_api";
	const iframePlayerApiScriptTag = document.getElementsByTagName("script")[0];
	iframePlayerApiScriptTag.parentNode.insertBefore(tag, iframePlayerApiScriptTag);
}

function onYouTubeIframeAPIReady(){
	createYouTubePlayer();
}

function createYouTubePlayer(){
	if(player || !uiReady || !hasYouTubeTracks() || typeof YT === "undefined" || !YT.Player){
		return;
	}

	player = new YT.Player("yplayer-youtube",{
		playerVars: {
			"rel": 0,
			"autoplay": 0,
			"loop": 0,
			"disablekb": 1,
			"egm": 0,
			"autohide": 0,
			"start": 0,
			"showinfo": 0,
			"iv_load_policy": 3,
			"cc_load_policy": 0,
			"color": "white",
			"theme": "black",
			"controls": 1
		},
		events: {
			"onReady": onPlayerReady,
			"onStateChange": onPlayerStateChange,
			"onError": onPlayerError
		}
	});
}

function onPlayerReady(event){
	playerReady = true;

	// If the user clicked a YouTube track before the API was ready, start it now.
	if(playflg && arlist[aplaynum] && arlist[aplaynum].m === TRACK_TYPE_YOUTUBE){
		player.loadVideoById({"videoId":arlist[aplaynum].path});
	}
}

function onPlayerStateChange(event){
	if(event.data === YT.PlayerState.ENDED){
		playNextTrackOrStop();
	}
}

function onPlayerError(event){
	const activeLink = document.querySelector("#yplayer-tracklist a[data-yplaynum='" + aplaynum + "']");
	if(activeLink){
		activeLink.classList.add("error");
	}
	playNextTrackOrStop();
}

function mstart(){
	if(mstart.started){
		return;
	}
	mstart.started = true;

	document.addEventListener("click", handleDocumentClick);
}

function handleDocumentClick(event){
	const playerLink = event.target.closest("a.yplayer");
	if(playerLink){
		event.preventDefault();
		playSelectedTrack(playerLink);
		return;
	}

	const closeLink = event.target.closest("a.yplayer-close");
	if(closeLink){
		event.preventDefault();
		yplayerhide();
		return;
	}

	const openLink = event.target.closest("a.yplayer-open");
	if(openLink){
		event.preventDefault();
		yplayershow();
	}
}

function playSelectedTrack(playerLink){
	if(playflg){
		mstop();
	}

	aplaynum = Number(playerLink.getAttribute("data-yplaynum"));
	yplayerplay(arlist[aplaynum]);
}

function playNextTrack(){
	audio.pause();
	aplaynum++;
	if(!arlist[aplaynum]){
		aplaynum = 0;
	}
	yplayerplay(arlist[aplaynum]);
}

function playNextTrackOrStop(){
	aplaynum++;
	if(!arlist[aplaynum]){
		aplaynum = 0;
		mstop();
		return;
	}
	yplayerplay(arlist[aplaynum]);
}

function mstop(){
	audio.pause();
	if(player && typeof player.stopVideo === "function"){
		player.stopVideo();
	}
}

function yplayerplay(aplaydata){
	if(!aplaydata){
		return;
	}

	updateTrackDisplay(aplaydata);

	if(aplaydata.m === TRACK_TYPE_YOUTUBE){
		playYouTubeTrack(aplaydata);
	}
	else if(aplaydata.m === TRACK_TYPE_MP3){
		playMp3Track(aplaydata);
	}

	yplayershow();
	renderFooter(aplaydata);
	playflg = 1;
}

function updateTrackDisplay(aplaydata){
	const title = document.getElementById("yplayer-title");
	const activeLink = document.querySelector("#yplayer-tracklist a.active");
	const nextActiveLink = document.querySelector("#yplayer-tracklist a[data-yplaynum='" + aplaydata.yplaynum + "']");

	if(title){
		title.textContent = aplaydata.title;
	}
	if(activeLink){
		activeLink.classList.remove("active");
	}
	if(nextActiveLink){
		nextActiveLink.classList.add("active");
	}
}

function playYouTubeTrack(aplaydata){
	const youtubeWrap = document.getElementById("yplayer-youtube-wrap");
	const audioWrap = document.getElementById("yplayer-audio-wrap");

	youtubeWrap.style.display = "block";
	audioWrap.style.display = "none";

	if(playerReady && player && typeof player.loadVideoById === "function"){
		player.loadVideoById({"videoId":aplaydata.path});
	}
}

function playMp3Track(aplaydata){
	const youtubeWrap = document.getElementById("yplayer-youtube-wrap");
	const audioWrap = document.getElementById("yplayer-audio-wrap");

	youtubeWrap.style.display = "none";
	audioWrap.style.display = "block";
	audio.src = aplaydata.path;
	audio.play();
}

function renderFooter(aplaydata){
	const footer = document.getElementById("yplayer-footer");
	if(!footer){
		return;
	}

	footer.textContent = "";
	if(aplaydata.img){
		footer.appendChild(createElement("img", {"src":aplaydata.img}));
	}
	else{
		footer.appendChild(createElement("a", {"href":"https://webs.unc.jp/"}, "Yplayer"));
	}
}

function yplayershow(){
	const wrap = document.getElementById("yplayer-wrap");
	const openButton = document.getElementById("yplayer-openbtn");
	if(wrap){
		wrap.style.left = "0";
	}
	if(openButton){
		openButton.style.display = "none";
	}
}

function yplayerhide(){
	const wrap = document.getElementById("yplayer-wrap");
	const openButton = document.getElementById("yplayer-openbtn");
	if(wrap){
		wrap.style.left = "-100%";
	}
	if(openButton){
		openButton.style.display = "";
	}
}

// YouTube iframe API calls this function by name from the global scope.
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
})();
