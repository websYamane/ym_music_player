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
let waveformAudioContext = null;
let waveformAnimationId = 0;
let waveformCurrentPath = "";
let waveformCurrentPeaks = null;
let waveformCache = {};
let waveformCacheKeys = [];
const MAX_WAVEFORM_CACHE_SIZE = 30;
let waveformRealtimeHistory = [];
let waveformRealtimeLastTime = 0;
let errorTrackKeys = new Set();

document.addEventListener("DOMContentLoaded", function(){
	injectYplayerStyles();
	initializeYplayer();
});

function injectYplayerStyles(){
	const styleTag = document.createElement("style");
	document.head.appendChild(styleTag);
	styleTag.textContent = `
@charset "utf-8";

:root {
	--yplayer-color-surface:rgba(255,255,255,.8);
	--yplayer-color-text:#333;
	--yplayer-color-link:#999;
	--yplayer-color-player-bg:#000;
	--yplayer-color-error:#f00;
	--yplayer-color-control-bg:rgba(0,0,0,.1);
	--yplayer-shadow:rgba(0, 0, 0, 0.2) 0 0 1em 0;
	--yplayer-open-shadow:rgba(0, 0, 0, 0.2) 0 0 calc(10 / 16 * 1em);
}

.yplayer:before {
	content:"";
	display:inline-block;
	width:.6em;
	height:.8em;
	background-color:var(--yplayer-color-text);
	clip-path:polygon(0% 0%, 100% 50%, 0% 100%);
	margin-right:.5em;
}
#yplayer-wrap {
	font:inherit;
	font-size:16px;
	line-height:1.5;
	max-width:940px;
	box-sizing:border-box;
	background-color:var(--yplayer-color-surface);
	backdrop-filter: blur(1em);
	color:var(--yplayer-color-text);
	padding:calc(20 / 16 * 1em);
	position:fixed;
	bottom:calc(20 / 16 * 1em);
	left:-100%;
	overflow:hidden;
	border-radius:0 calc(10 / 16 * 1em) calc(10 / 16 * 1em) 0;
	box-shadow:var(--yplayer-shadow);
	transition:.3s;
}
#yplayer-wrap * {
	box-sizing:border-box;
	color:inherit;
}
#yplayer-wrap a {
	color:var(--yplayer-color-link);
}
#yplayer-title {
	width:100%;
	margin:0 auto;
	padding:calc(10 / 16 * 1em) calc(50 / 16 * 1em) calc(10 / 16 * 1em) 0;
}
#yplayer-inner {
	display:flex;
	gap:calc(16 / 16 * 1em);
	margin:calc(10 / 16 * 1em) auto 0;
}
#yplayer-footer {
	width:100%;
	margin:0 auto;
	padding:calc(10 / 16 * 1em) 0px;
	text-align:right;
}
#yplayer-footer img {
	display:inline-block;
	width:calc(60 / 16 * 1em);
}
#yplayer-content {
	width:calc(560 / 16 * 1em);
	vertical-align:top;
	position:relative;
	min-width:0;
}
#yplayer-tracklist-wrap {
	flex:1;
	min-width:0;
}
#yplayer-youtube-wrap {
	padding-top:56.25%;
	position:relative;
	display:none;
}
#yplayer-youtube {
	display:block;
	position:absolute;
	width:100%;
	height:100%;
	left:0;
	top:0;
}
#yplayer-audio-wrap {
	display:none;
	padding-top:56.25%;
	position:relative;
	width:100%;
}
#yplayer-waveform {
	position:absolute;
	left:0;
	top:0;
	bottom:calc(3em + (8 / 16 * 1em));
	width:100%;
	overflow:hidden;
	border-radius:calc(6 / 16 * 1em);
	background:linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.02)), var(--yplayer-color-player-bg);
}
#yplayer-waveform:before,
#yplayer-waveform:after {
	content:"";
	position:absolute;
	left:0;
	right:0;
	pointer-events:none;
}
#yplayer-waveform:before {
	top:50%;
	height:1px;
	background:rgba(255,255,255,.18);
	z-index:1;
}
#yplayer-waveform:after {
	inset:0;
	background:linear-gradient(90deg, rgba(0,0,0,.35), transparent 18%, transparent 82%, rgba(0,0,0,.35));
	z-index:2;
}
#yplayer-waveform-canvas {
	position:absolute;
	inset:0;
	display:block;
	width:100%;
	height:100%;
}
#yplayer-audio {
	display:block;
	position:absolute;
	left:0;
	bottom:0;
	width:100%;
	height:3em;
}
#yplayer-tracklist {
	height:calc(315 / 16 * 1em);
	overflow-y:auto;
	width:100%;
}
#yplayer-tracklist a {
	position:relative;
	display:block;
	text-decoration:none;
	white-space:nowrap;
	padding:calc(2 / 13 * 1em) 0;
	overflow:hidden;
	font-size:calc(13 / 16 * 1em);
	width:100%;
}
#yplayer-tracklist a .yplayer-track-title {
	display:inline-block;
	max-width:100%;
	overflow:hidden;
	text-overflow:ellipsis;
	vertical-align:top;
	will-change:transform;
}
#yplayer-tracklist a:hover {
	color:var(--yplayer-color-text);
}
#yplayer-tracklist a.active {
	color:var(--yplayer-color-text);
}
#yplayer-tracklist a.active.is-scrolling .yplayer-track-title {
	max-width:none;
	overflow:visible;
	animation:yplayer-track-title-scroll var(--yplayer-track-scroll-duration, 10s) linear infinite;
	min-width:100%;
}
#yplayer-tracklist a.active.is-scrolling:hover .yplayer-track-title {
	animation-play-state:paused;
}
#yplayer-tracklist a.error {
	color:var(--yplayer-color-error);
}
#yplayer-tracklist .yplayer:before {
	display:none;
}
#yplayer-audio {
	width:100%;
}
@keyframes yplayer-track-title-scroll {
	0% {
		transform:translateX(0);
		opacity:0;
	}
	3% {
		opacity:1;
	}
	90% {
		opacity:1;
	}
	100% {
		transform:translateX(calc(var(--yplayer-track-scroll-distance, 0px) * -1));
		opacity:0;
	}
}
#yplayer-closebtn {
	position:absolute;
	display:block;
	right:0;
	top:0;
	background-color:var(--yplayer-color-control-bg);
	width:calc(50 / 16 * 1em);
	height:calc(30 / 16 * 1em);
	border-radius:0 0 0 calc(10 / 16 * 1em);
}
#yplayer-openbtn {
	position:fixed;
	display:block;
	left:0;
	bottom:calc(20 / 16 * 1em);
	background-color:var(--yplayer-color-surface);
	border-radius:0 calc(10 / 16 * 1em) calc(10 / 16 * 1em) 0;
	transition:.4s;
	box-shadow:var(--yplayer-open-shadow);
	padding:1em;
	transition:.4s;
}
#yplayer-openbtn:before {
	content:"";
	display:block;
	width:calc(16 / 16 * 1em);
	height:calc(18 / 16 * 1em);
	background-color:var(--yplayer-color-text);
	clip-path:polygon(0% 0%, 100% 50%, 0% 100%);
}
@media screen and (max-width:940px){
	#yplayer-wrap {
		font-size:calc(16 / 940 * 100vw);
		width:100%;
	}
}
@media screen and (max-width:750px){
	#yplayer-wrap {
		font-size:calc(32 / 750 * 100vw);
		bottom:0;
		width:100%;
		border-radius:0;
	}
	#yplayer-title {
		width:100%;
		margin:0;
		padding:0 calc(50 / 16 * 1em) 0 0;
	}
	#yplayer-footer {
		width:100%;
		margin:0;
		padding:calc(10 / 16 * 1em);
	}
	#yplayer-inner,
	#yplayer-content,
	#yplayer-tracklist-wrap {
		display:block;
		width:100%;
	}
	#yplayer-tracklist-wrap {
		width:100%;
		margin-top:1em;
	}
	#yplayer-tracklist {
		height:10em;
	}
	#yplayer-tracklist a {
		width:100%;
		max-width:100%;
	}
}
	`;
}

function debounce(func, wait){
	let timeout;
	return function(){
		const context = this;
		const args = arguments;
		clearTimeout(timeout);
		timeout = setTimeout(function(){
			func.apply(context, args);
		}, wait);
	};
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

	audio.addEventListener("ended", function(){
		advanceToNextTrack(true);
	});
	audio.addEventListener("play", function(){
		setAudioWaveformPlaying(true);
	});
	audio.addEventListener("pause", function(){
		setAudioWaveformPlaying(false);
	});
	audio.addEventListener("seeked", drawAudioWaveform);
	window.addEventListener("resize", debounce(drawAudioWaveform, 150));
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
	const waveform = createWaveformElement();
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
	audioWrap.appendChild(waveform);
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

function createWaveformElement(){
	const waveform = createElement("div", {"id":"yplayer-waveform", "aria-hidden":"true"});
	const canvas = createElement("canvas", {"id":"yplayer-waveform-canvas"});

	waveform.appendChild(canvas);
	return waveform;
}

function tagreload(){
	const currentTrack = (playflg && arlist[aplaynum]) ? arlist[aplaynum] : null;

	arlist = collectPlayableTracks();

	if (currentTrack) {
		let newIndex = -1;
		for (let i = 0; i < arlist.length; ++i) {
			if (arlist[i].path === currentTrack.path && arlist[i].m === currentTrack.m) {
				newIndex = i;
				break;
			}
		}
		aplaynum = newIndex;
	}

	renderTracklist();

	const wrap = document.getElementById("yplayer-wrap");
	const openButton = document.getElementById("yplayer-openbtn");
	if(arlist.length === 0 && !playflg){
		if(wrap){
			wrap.style.display = "none";
		}
		if(openButton){
			openButton.style.display = "none";
		}
	} else {
		if(wrap){
			wrap.style.display = "";
		}
		if(openButton){
			if(wrap && (wrap.style.left === "0" || wrap.style.left === "0px")){
				openButton.style.display = "none";
			} else {
				openButton.style.display = "";
			}
		}
	}
}

function collectPlayableTracks(){
	const tracks = [];

	document.querySelectorAll("a[href]").forEach(function(anchor){
		const track = parseTrackFromAnchor(anchor, tracks.length);
		if(!track){
			return;
		}

		anchor.classList.add("yplayer");
		anchor.setAttribute("data-yplaynum", track.yplaynum);
		anchor.classList.toggle("error", errorTrackKeys.has(trackErrorKey(track)));
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
		const isActive = (playflg && i === aplaynum);
		const isError = errorTrackKeys.has(trackErrorKey(arlist[i]));
		const link = createElement("a", {
			"href": "#",
			"class": "yplayer" + (isActive ? " active" : "") + (isError ? " error" : ""),
			"data-yplaynum": i
		});
		link.appendChild(createElement("span", {"class":"yplayer-track-title"}, trackNumber + ". " + arlist[i].title));
		tracklist.appendChild(link);
		if(isActive){
			updateTrackTitleScroll(link);
		}
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

	if(typeof YT !== "undefined" && YT.Player){
		createYouTubePlayer();
		return;
	}

	const scripts = document.getElementsByTagName("script");
	for(let i = 0; i < scripts.length; i++){
		if(scripts[i].src === "https://www.youtube.com/iframe_api"){
			return;
		}
	}

	const tag = document.createElement("script");
	tag.src = "https://www.youtube.com/iframe_api";
	const iframePlayerApiScriptTag = document.getElementsByTagName("script")[0];
	if(iframePlayerApiScriptTag && iframePlayerApiScriptTag.parentNode){
		iframePlayerApiScriptTag.parentNode.insertBefore(tag, iframePlayerApiScriptTag);
	} else {
		document.head.appendChild(tag);
	}
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
		advanceToNextTrack(true);
	}
}

function onPlayerError(event){
	markTrackAsError(aplaynum);
	advanceToNextTrack(false);
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

function advanceToNextTrack(loop){
	aplaynum++;
	if(!arlist[aplaynum]){
		aplaynum = 0;
		if(!loop){
			mstop();
			return;
		}
	}
	yplayerplay(arlist[aplaynum]);
}

function mstop(){
	audio.pause();
	setAudioWaveformPlaying(false);
	if(player && typeof player.stopVideo === "function"){
		player.stopVideo();
	}
}

function trackErrorKey(track){
	return track ? track.m + "|" + track.path : "";
}

function markTrackAsError(index){
	const track = arlist[index];
	if(track){
		errorTrackKeys.add(trackErrorKey(track));
	}

	const tracklistLink = document.querySelector("#yplayer-tracklist a[data-yplaynum='" + index + "']");
	if(tracklistLink){
		tracklistLink.classList.add("error");
	}
	const pageLink = document.querySelector("a.yplayer[data-yplaynum='" + index + "']");
	if(pageLink){
		pageLink.classList.add("error");
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
		resetTrackTitleScroll(activeLink);
	}
	if(nextActiveLink){
		nextActiveLink.classList.add("active");
		updateTrackTitleScroll(nextActiveLink);
	}
}

function updateTrackTitleScroll(link){
	resetTrackTitleScroll(link);

	window.requestAnimationFrame(function(){
		const title = link.querySelector(".yplayer-track-title");
		if(!title || !link.classList.contains("active")){
			return;
		}

		title.style.maxWidth = "none";
		title.style.overflow = "visible";
		const overflow = title.scrollWidth - link.clientWidth;
		title.style.maxWidth = "";
		title.style.overflow = "";
		if(overflow <= 1){
			return;
		}

		const distance = overflow + 24;
		const duration = Math.max(8, distance / 22);
		link.style.setProperty("--yplayer-track-scroll-distance", distance + "px");
		link.style.setProperty("--yplayer-track-scroll-duration", duration + "s");
		link.classList.add("is-scrolling");
	});
}

function resetTrackTitleScroll(link){
	if(!link){
		return;
	}
	link.classList.remove("is-scrolling");
	link.style.removeProperty("--yplayer-track-scroll-distance");
	link.style.removeProperty("--yplayer-track-scroll-duration");
}

function playYouTubeTrack(aplaydata){
	const youtubeWrap = document.getElementById("yplayer-youtube-wrap");
	const audioWrap = document.getElementById("yplayer-audio-wrap");

	youtubeWrap.style.display = "block";
	audioWrap.style.display = "none";
	setAudioWaveformPlaying(false);
	resetAudioWaveform();

	if(playerReady && player && typeof player.loadVideoById === "function"){
		player.loadVideoById({"videoId":aplaydata.path});
	}
}

function playMp3Track(aplaydata){
	const youtubeWrap = document.getElementById("yplayer-youtube-wrap");
	const audioWrap = document.getElementById("yplayer-audio-wrap");

	youtubeWrap.style.display = "none";
	audioWrap.style.display = "block";
	prepareAudioWaveform(aplaydata.path);
	audio.src = aplaydata.path;
	audio.play();
}

function setAudioWaveformPlaying(isPlaying){
	const audioWrap = document.getElementById("yplayer-audio-wrap");
	if(!audioWrap){
		return;
	}
	audioWrap.classList.toggle("is-playing", isPlaying);
	if(isPlaying){
		startWaveformAnimation();
	}
	else{
		stopWaveformAnimation();
		drawAudioWaveform();
	}
}

function prepareAudioWaveform(path){
	waveformCurrentPath = path;
	waveformCurrentPeaks = null;
	resetRealtimeWaveformHistory();
	drawAudioWaveform();

	loadAudioWaveform(path).then(function(waveform){
		if(waveformCurrentPath !== path){
			return;
		}
		waveformCurrentPeaks = waveform;
		drawAudioWaveform();
		if(!audio.paused){
			startWaveformAnimation();
		}
	}).catch(function(error){
		if(waveformCurrentPath !== path){
			return;
		}
		waveformCurrentPeaks = null;
		drawAudioWaveform();
		markTrackAsError(aplaynum);
		if(window.console && typeof window.console.warn === "function"){
			window.console.warn("Could not load audio waveform.", error);
		}
	});
}

function resetAudioWaveform(){
	waveformCurrentPath = "";
	waveformCurrentPeaks = null;
	resetRealtimeWaveformHistory();
	stopWaveformAnimation();
	drawAudioWaveform();
}

function resetRealtimeWaveformHistory(){
	waveformRealtimeHistory = [];
	waveformRealtimeLastTime = 0;
}

function loadAudioWaveform(path){
	if(waveformCache[path]){
		return Promise.resolve(waveformCache[path]);
	}

	return fetch(path).then(function(response){
		if(!response.ok){
			throw new Error("Waveform fetch failed: " + response.status);
		}
		return response.arrayBuffer();
	}).then(function(arrayBuffer){
		return decodeAudioArrayBuffer(arrayBuffer);
	}).then(function(audioBuffer){
		const waveform = buildAudioWaveform(audioBuffer);
		waveformCache[path] = waveform;
		waveformCacheKeys.push(path);
		if(waveformCacheKeys.length > MAX_WAVEFORM_CACHE_SIZE){
			const oldestPath = waveformCacheKeys.shift();
			delete waveformCache[oldestPath];
		}
		return waveform;
	});
}

function decodeAudioArrayBuffer(arrayBuffer){
	const context = getWaveformAudioContext();

	return new Promise(function(resolve, reject){
		const decodeResult = context.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
		if(decodeResult && typeof decodeResult.then === "function"){
			decodeResult.then(resolve, reject);
		}
	});
}

function getWaveformAudioContext(){
	if(waveformAudioContext){
		return waveformAudioContext;
	}

	const AudioContextClass = window.AudioContext || window.webkitAudioContext;
	if(!AudioContextClass){
		throw new Error("AudioContext is not supported.");
	}

	waveformAudioContext = new AudioContextClass();
	return waveformAudioContext;
}

function buildAudioWaveform(audioBuffer){
	const barsPerSecond = 18;
	const peakCount = Math.max(1, Math.ceil(audioBuffer.duration * barsPerSecond));
	const realtimeBarsPerSecond = 60;
	const realtimePeakCount = Math.max(1, Math.ceil(audioBuffer.duration * realtimeBarsPerSecond));
	const peaks = buildAudioPeaks(audioBuffer, peakCount);
	const realtimePeaks = buildAudioPeaks(audioBuffer, realtimePeakCount);

	normalizePeaks(peaks);
	normalizePeaks(realtimePeaks);
	return {
		duration: audioBuffer.duration,
		barsPerSecond: barsPerSecond,
		peaks: peaks,
		realtimeBarsPerSecond: realtimeBarsPerSecond,
		realtimePeaks: realtimePeaks
	};
}

function buildAudioPeaks(audioBuffer, peakCount){
	const peaks = new Float32Array(peakCount);

	for(let channelIndex = 0; channelIndex < audioBuffer.numberOfChannels; ++channelIndex){
		const channelData = audioBuffer.getChannelData(channelIndex);
		for(let peakIndex = 0; peakIndex < peakCount; ++peakIndex){
			const start = Math.floor(peakIndex * channelData.length / peakCount);
			const end = Math.max(start + 1, Math.floor((peakIndex + 1) * channelData.length / peakCount));
			let peak = 0;

			for(let sampleIndex = start; sampleIndex < end; ++sampleIndex){
				const sample = Math.abs(channelData[sampleIndex]);
				if(sample > peak){
					peak = sample;
				}
			}

			if(peak > peaks[peakIndex]){
				peaks[peakIndex] = peak;
			}
		}
	}

	return peaks;
}

function normalizePeaks(peaks){
	let maxPeak = 0;
	for(let i = 0; i < peaks.length; ++i){
		if(peaks[i] > maxPeak){
			maxPeak = peaks[i];
		}
	}

	if(!maxPeak){
		return;
	}

	for(let i = 0; i < peaks.length; ++i){
		peaks[i] = peaks[i] / maxPeak;
	}
}

function startWaveformAnimation(){
	if(waveformAnimationId){
		return;
	}

	function tick(){
		drawAudioWaveform();
		if(!audio.paused && waveformCurrentPeaks){
			waveformAnimationId = window.requestAnimationFrame(tick);
		}
		else{
			waveformAnimationId = 0;
		}
	}

	waveformAnimationId = window.requestAnimationFrame(tick);
}

function stopWaveformAnimation(){
	if(!waveformAnimationId){
		return;
	}
	window.cancelAnimationFrame(waveformAnimationId);
	waveformAnimationId = 0;
}

function drawAudioWaveform(){
	const canvas = document.getElementById("yplayer-waveform-canvas");
	if(!canvas){
		return;
	}

	const context = canvas.getContext("2d");
	const size = resizeWaveformCanvas(canvas);
	context.clearRect(0, 0, size.width, size.height);

	if(!waveformCurrentPeaks){
		drawWaveformIdle(context, size);
	}
	else{
		drawWaveformPeaks(context, size, waveformCurrentPeaks);
	}

	drawRealtimeWaveform(context, size);
}

function resizeWaveformCanvas(canvas){
	const rect = canvas.getBoundingClientRect();
	const ratio = window.devicePixelRatio || 1;
	const width = Math.max(1, Math.round(rect.width * ratio));
	const height = Math.max(1, Math.round(rect.height * ratio));

	if(canvas.width !== width || canvas.height !== height){
		canvas.width = width;
		canvas.height = height;
	}

	return {
		width: width,
		height: height,
		ratio: ratio
	};
}

function drawWaveformIdle(context, size){
	const centerY = size.height / 2;
	context.strokeStyle = "rgba(255,255,255,.24)";
	context.lineWidth = Math.max(1, size.ratio);
	context.beginPath();
	context.moveTo(0, centerY);
	context.lineTo(size.width, centerY);
	context.stroke();
}

function drawWaveformPeaks(context, size, waveform){
	const peaks = waveform.peaks;
	const ratio = size.ratio;
	const barWidth = Math.max(2, Math.round(3 * ratio));
	const barGap = Math.max(2, Math.round(3 * ratio));
	const barStep = barWidth + barGap;
	const pixelsPerSecond = waveform.barsPerSecond * barStep;
	const scrollPixels = audio.currentTime * pixelsPerSecond;
	const firstPeakIndex = Math.floor(scrollPixels / barStep);
	const xOffset = scrollPixels % barStep;
	const centerY = size.height / 2;
	const maxBarHeight = size.height * .82;
	const visibleBars = Math.ceil(size.width / barStep) + 2;

	context.save();
	context.globalAlpha = waveform.realtimePeaks ? .42 : .86;
	context.fillStyle = "rgba(255,255,255,.86)";

	for(let i = 0; i < visibleBars; ++i){
		const peak = peaks[firstPeakIndex + i];
		if(peak === undefined){
			continue;
		}

		const height = Math.max(4 * ratio, peak * maxBarHeight);
		const x = i * barStep - xOffset;
		const y = centerY - height / 2;
		drawRoundedWaveformBar(context, x, y, barWidth, height, barWidth / 2);
	}

	context.restore();
}

function drawRealtimeWaveform(context, size){
	if(!waveformCurrentPeaks || !waveformCurrentPeaks.realtimePeaks){
		return;
	}

	updateRealtimeWaveformHistory();
	if(!waveformRealtimeHistory.length){
		return;
	}

	const ratio = size.ratio;
	const barsPerSecond = 30;
	const barWidth = Math.max(2, Math.round(4 * ratio));
	const barGap = Math.max(2, Math.round(3 * ratio));
	const barStep = barWidth + barGap;
	const now = window.performance.now();
	const elapsed = waveformRealtimeLastTime ? Math.max(0, now - waveformRealtimeLastTime) / 1000 : 0;
	const scrollOffset = Math.min(barStep, elapsed * barsPerSecond * barStep);
	const centerY = size.height / 2;
	const maxBarHeight = size.height * .92;
	const visibleBars = Math.ceil(size.width / barStep) + 2;

	context.save();
	context.fillStyle = "rgba(74, 214, 255, .88)";
	context.shadowColor = "rgba(74, 214, 255, .32)";
	context.shadowBlur = 8 * ratio;

	for(let i = 0; i < visibleBars; ++i){
		const historyIndex = waveformRealtimeHistory.length - 1 - i;
		if(historyIndex < 0){
			break;
		}

		const peak = waveformRealtimeHistory[historyIndex];
		const height = Math.max(4 * ratio, peak * maxBarHeight);
		const x = size.width - ((i + 1) * barStep) - scrollOffset;
		const y = centerY - height / 2;
		drawRoundedWaveformBar(context, x, y, barWidth, height, barWidth / 2);
	}

	context.restore();
}

function updateRealtimeWaveformHistory(){
	if(audio.paused){
		waveformRealtimeLastTime = 0;
		return;
	}

	const barsPerSecond = 30;
	const interval = 1000 / barsPerSecond;
	const now = window.performance.now();

	if(!waveformRealtimeLastTime){
		waveformRealtimeLastTime = now;
		pushRealtimeWaveformPeak(audio.currentTime);
		return;
	}

	let pushes = Math.floor((now - waveformRealtimeLastTime) / interval);
	if(pushes < 1){
		return;
	}
	pushes = Math.min(pushes, 4);

	for(let i = 0; i < pushes; ++i){
		const timeOffset = (pushes - 1 - i) / barsPerSecond;
		pushRealtimeWaveformPeak(Math.max(0, audio.currentTime - timeOffset));
		waveformRealtimeLastTime += interval;
	}
}

function pushRealtimeWaveformPeak(time){
	const peak = getRealtimeWaveformPeakAtTime(time);

	waveformRealtimeHistory.push(Math.min(1, peak * 1.35));
	if(waveformRealtimeHistory.length > 260){
		waveformRealtimeHistory.splice(0, waveformRealtimeHistory.length - 260);
	}
}

function getRealtimeWaveformPeakAtTime(time){
	if(!waveformCurrentPeaks || !waveformCurrentPeaks.realtimePeaks){
		return 0;
	}

	const peaks = waveformCurrentPeaks.realtimePeaks;
	const peakIndex = Math.floor(time * waveformCurrentPeaks.realtimeBarsPerSecond);
	return peaks[peakIndex] || 0;
}

function drawRoundedWaveformBar(context, x, y, width, height, radius){
	const right = x + width;
	const bottom = y + height;
	const safeRadius = Math.min(radius, width / 2, height / 2);

	context.beginPath();
	context.moveTo(x + safeRadius, y);
	context.lineTo(right - safeRadius, y);
	context.quadraticCurveTo(right, y, right, y + safeRadius);
	context.lineTo(right, bottom - safeRadius);
	context.quadraticCurveTo(right, bottom, right - safeRadius, bottom);
	context.lineTo(x + safeRadius, bottom);
	context.quadraticCurveTo(x, bottom, x, bottom - safeRadius);
	context.lineTo(x, y + safeRadius);
	context.quadraticCurveTo(x, y, x + safeRadius, y);
	context.fill();
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
		footer.appendChild(createElement("a", {"href":"https://webs.unc.jp/", "target":"_blank"}, "webs"));
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

// Public API
window.yplayer = {
	reload: tagreload
};

// YouTube iframe API calls this function by name from the global scope.
(function(){
	const previousCallback = window.onYouTubeIframeAPIReady;
	window.onYouTubeIframeAPIReady = function() {
		if(typeof previousCallback === "function"){
			previousCallback();
		}
		onYouTubeIframeAPIReady();
	};
})();
})();
