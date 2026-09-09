/*
	Copyright (c) 2024 Francois Dechery

	This program is free software: you can redistribute it and/or modify it under the 
	terms of the GNU General Public License as published by the Free Software Foundation, 
	either version 2 of the License, or (at your option) any later version.

	This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; 
	without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 
	See the GNU General Public License for more details.

	You should have received a copy of the GNU General Public License along with this program. 
	If not, see <https://www.gnu.org/licenses/>. 
 */
// toh_util.js
//
//	Icons, URL parameters, cookies, logging and small shared helpers.

// Icons ######################################################################################################################

// Render a Lucide icon from the sprite inlined at the top of index.html.
// 'spec' is a sprite name, optionally followed by extra CSS classes:
//    tohIcon('download')            -> <svg class="toh-ico">…</svg>
//    tohIcon('triangle-alert error') -> <svg class="toh-ico error">…</svg>
function tohIcon(spec){
	const [name, ...extra]=String(spec).trim().split(/\s+/);
	const cls=['toh-ico', ...extra].join(' ');
	return '<svg class="'+cls+'" aria-hidden="true"><use href="#i-'+name+'"></use></svg>';
}

// Point an already rendered icon at another sprite symbol -------------------
function tohSetIcon($svg, name){
	$svg.find('use').attr('href','#i-'+name);
}


// URL safety #################################################################################################################

// Is this something we are willing to put in an href?
// Escaping a URL and vetting its scheme are different questions: tohAttr() does
// its job perfectly on "javascript:alert(1)" and still leaves a link that runs.
// Kept deliberately permissive about scheme-less values - relative paths and
// "#" are the failure placeholders this codebase already uses, and neither can
// execute. Anything that names a scheme has to name http or https.
function tohSafeUrl(v){
	if(Array.isArray(v)){
		v=v[0];						// wikideviurl is an array on some rows
	}
	let s=String(v == null ? '' : v).trim();
	if(s === '' || s === '#'){
		return s;
	}
	// Some wiki cells hold two URLs in one string ("https://a,https://b"). An
	// href can only be one, and the joined pair 404s, so keep the first.
	const joined=s.search(/,\s*(?:https?|ftps?):\/\//i);
	if(joined > -1){
		s=s.slice(0, joined).trim();
	}
	const scheme=s.match(/^([a-z][a-z0-9+.\-]*):/i);
	if(!scheme){
		return s;					// relative, a fragment, or a bare search term
	}
	// ftp is in the list because 16 D-Link stock-firmware links in the live
	// dataset use it; checked against all 24,046 links the table can emit, this
	// rejects none of them. What it does reject is javascript:, data: and
	// vbscript:, none of which appear and any of which would execute.
	return /^(https?|ftps?)$/i.test(scheme[1]) ? s : '';
}


// Scheduling #################################################################################################################

// Run something once the browser has nothing more urgent to do.
// Used for work that is worth doing but must not sit in the same task as the
// first paint - counting 43 features across 3,000 rows froze the boot reveal
// for over a second on a mid-range phone.
function tohWhenIdle(fn){
	if(typeof requestIdleCallback === 'function'){
		requestIdleCallback(fn, {timeout: 2000});		// Safari < 17 has none
	}
	else{
		setTimeout(fn, 1);
	}
}


// Row access #################################################################################################################

// The rows as Tabulator holds them.
// tabuTable.getData() routes through the accessor module and deep-clones all
// 3,000-odd rows on every call - 45ms here, over a second on a phone - and the
// counting, faceting and details paths call it on every click. Nothing in this
// codebase mutates a row, so hand out the live objects and keep them.
let toh_rows_cache=[];
function tohRows(){
	if(toh_rows_cache.length === 0 && typeof tabuTable !== 'undefined' && tabuTable){
		toh_rows_cache=tabuTable.getRows().map(r => r.getData());
	}
	return toh_rows_cache;
}

// Called whenever the data set itself changes, not when it is filtered.
function tohRowsInvalidate(){
	toh_rows_cache=[];
	toh_rows_by_id=null;
}

// deviceid -> row, for the lookups that only want one device.
let toh_rows_by_id=null;
function tohRowById(id){
	if(!toh_rows_by_id){
		toh_rows_by_id=new Map(tohRows().map(r => [r.deviceid, r]));
	}
	return toh_rows_by_id.get(id) || null;
}


// URL functions ##############################################################################################################

// Get Url parameter -----------------------------------------------
function getUrlParameter(name) {
	name = name.replace(/\[/, '\\[').replace(/[\]]/, '\\]');
	var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
	var results = regex.exec(location.search);
	return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Get Url parameter or default value -----------------------------
function getUrlParameterOrDefault(name, defaultValue='') {
	var value = getUrlParameter(name);
	return value !== '' ? value : defaultValue;
}

// update the browser Url (without reloading the page) ------------
function updateBrowserUrl(newURL) {
	const state = {}; // State object
	const title = ''; // Title (ignored by most browsers)
	history.replaceState(state, title, newURL);
}

// get the currently checked features ---------------
function getCheckedFeatures(){
	var checked=[];
	$('.toh-filters-list INPUT').each(function(i){
		if($(this).is(':checked')){
			checked.push($(this).attr('data-key'));
		}
	});
	return checked;
}

// get the currently checked columns ---------------
function getCheckedColumns(){
	var checked=[];
	$('.toh-col-column INPUT').each(function(i){
		if($(this).is(':checked')){
			checked.push($(this).attr('data-key'));
		}
	});
	// myLogObj(checked,'checked');
	return checked;
}

// build, then update the browser Url  ------------------------------
// Which named view is in force. The DOM marker for it is set inside a
// setTimeout, so the URL was being built before it existed and fell back to
// listing every column by name. Declared here, in the first file loaded,
// because this is where it is read: putting it in toh_views.js meant an
// earlier file referenced a binding a later one owned, which throws the moment
// the two are out of step.
let toh_current_view=null;

// Has the visitor said which columns they want ----------------------------
// Set by anything that picks columns deliberately - a preset button, a single
// checkbox, ?view= or ?columns= in the URL. Until then the columns are only
// this viewport's default, and crossing the breakpoint may replace them.
let toh_view_chosen=false;

// Which view to open with -------------------------------------------------
// The desktop preset on a tablet is two screens of horizontal scrolling before
// the first number worth reading, so a narrow viewport starts on a narrower
// preset.
function tohDefaultView(){
	if(window.matchMedia && window.matchMedia('(max-width: '+toh_prefs.narrow_max_width+'px)').matches){
		return toh_prefs.def_view_narrow;
	}
	return toh_prefs.def_view;
}

// Follow the viewport across the breakpoint -------------------------------
// Only while the columns are still this viewport's default: once the visitor
// has chosen any view, resizing must not throw that away. Without this the
// preset only ever appeared on a reload, which makes it look broken to anyone
// who tests it by dragging the window narrower.
function tohApplyViewportView(){
	if(toh_view_chosen){
		return;
	}
	const want=tohDefaultView();
	if(want !== toh_current_view){
		myLogStr('Viewport crossed the breakpoint, switching view to: '+want);
		applyColumnPreset(want);
	}
}

// Which named preset, if any, these columns are ---------------------------
function matchColumnPreset(shown){
	const want=[...shown].sort().join('|');
	for(const key in toh_colPresets){
		if([...toh_colPresets[key]].sort().join('|') === want){
			return key;
		}
	}
	return null;
}

function buildBrowserUrl(and_update=true){
	myLogFunc();
	var url=window.location.pathname;
	var params=[];
	var tmp_list;
	var tmp_preset;

	// make features
	tmp_preset=$('#toh-filters-presets A.toh-selected').attr('data-key');
	if(tmp_preset !=undefined){
		params.push(toh_prefs.p_filter+'='+tmp_preset);
	}
	else{
		tmp_list= getCheckedFeatures();
		if(tmp_list.length>0){
			params.push( toh_prefs.p_features+'='+tmp_list.join(",") );
		}
	}

	// make colums
	// Not what the highlighted preset button says: toh_current_view is the one
	// place that knows, being set by applyColumnPreset() and cleared the moment a
	// column is ticked by hand. matchColumnPreset() then only has to catch a
	// hand-picked set that happens to land back on a preset - otherwise a link
	// carries two dozen column names that only say "the defaults", which is most
	// of the length of every URL anyone shares.
	tmp_list= getCheckedColumns();
	const named=toh_current_view || matchColumnPreset(tmp_list);
	if(named === tohDefaultView()){
		// whatever this viewport would have opened with needs no parameter, so a
		// link shared from a tablet does not force the tablet preset on the
		// desktop that receives it
	}
	else if(named){
		params.push(toh_prefs.p_view+'='+named);
	}
	else if(tmp_list.length>0){
		params.push( toh_prefs.p_columns+'='+tmp_list.join(",") );
	}

	// compared devices, so a comparison can be linked to
	if(toh_compare.length > 0){
		params.push('compare=' + toh_compare.join(','));
	}

	// the open device, so a details popup can be linked to. toh_device_pending
	// covers the gap on load, where SetDefaults() runs before tohDeviceApply():
	// a parameter this function does not know about is destroyed by the next
	// rewrite, which is how ?device= used to be lost a second after boot.
	const dev=toh_device_open || toh_device_pending;
	if(dev){
		params.push('device=' + encodeURIComponent(dev));
	}

	// The hero search. It narrows the table as hard as any feature does, and a
	// link that omits it reopens on a different set - 57 devices on the sender's
	// screen, 3,015 on the recipient's - while still being rewritten on every
	// change, so the omission was invisible.
	// Read the filter, not the input: the box and the header filter can be set
	// independently (a statistics bar sets one without touching the other), and
	// the filter is what actually decides the rows.
	let search='';
	try {
		const hf=(tabuTable.getHeaderFilters() || []).find(f => f.field === 'model');
		if(hf && typeof hf.value === 'string'){
			search=hf.value.trim();
		}
	} catch(e) { search=''; }
	if(search !== ''){
		params.push('search=' + encodeURIComponent(search));
	}

	// ... and the numeric thresholds from Advanced Search, for the same reason
	if(typeof toh_adv_nums !== 'undefined'){
		Object.keys(toh_adv_nums).forEach(k => {
			if(toh_adv_nums[k]){
				params.push(k + '=' + encodeURIComponent(toh_adv_nums[k]));
			}
		});
	}

	// the manufacturer / chipset / target page currently open
	if(toh_facet_open){
		params.push(toh_facets[toh_facet_open.type].param + '=' + encodeURIComponent(toh_facet_open.value));
	}
	else if(toh_stats_open){
		params.push('stats=1');
	}

	if(and_update){
		// no trailing "?" on a page with nothing to say
		url +=params.length ? '?' + params.join('&') : '';
		updateBrowserUrl(url);
	}
	//myLogStr('URL: '+url);
	return url + (params.length ? '?' + params.join('&') : '');
}


// Cookie functions ###########################################################################################################

// save a cookie ---------------------------------------------------
function saveCookie(c_name, content, do_delete=false, type='json'){
	myLogFunc();
	var c_path=toh_prefs.cook_path;
	if(c_path==''){
		c_path=window.location.pathname;
	}
	var c_content=content;
	if(type=='json'){
		c_content=JSON.stringify(content);
	}
	var dur=toh_prefs.cook_duration;
	if(do_delete){
		dur=0;
	}
	// SameSite=Lax: these hold nothing sensitive, but a cookie with no policy is
	// sent on cross-site requests for no reason and browsers increasingly warn.
	document.cookie = toh_prefs.cook_prefix + c_name + "=" + encodeURIComponent(c_content)
		+ "; max-age="+dur+"; path="+c_path+"; SameSite=Lax";
}

// extract a cookie from the list---------------------------------------------------
function _extractCookie(name) {
	myLogFunc();
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2) return parts.pop().split(';').shift();
  }

// load a cookie ---------------------------------------------------
function loadCookie(c_name, type='json'){
	myLogFunc('loadCookie name: '+c_name);
	var cookie=_extractCookie(toh_prefs.cook_prefix + c_name);
	myLogStr('result: '+cookie);

	if(cookie){
		var c_content=decodeURIComponent(cookie);
		if(type=='json'){
			// A truncated or hand-edited cookie must not throw: this runs inside
			// the boot callback, so an exception here leaves the visitor on the
			// spinner for as long as the cookie lives. Drop it and carry on.
			try {
				return JSON.parse(c_content);
			}
			catch(e){
				myLogStr('discarding corrupt cookie '+c_name+': '+e.message, 1);
				saveCookie(c_name, false, true);
				return false;
			}
		}
		else{
			return c_content;
		}
	}
	else{
		return false;
	}
}

// Load All Preset Cookies -----------------------------
function loadPresetCookies(type){ //'features' or 'columns'
	myLogFunc('loadCookie name: '+type);
	var c_value;

	for (let i = 1; i <= toh_prefs.cook_preset_count; i++) {
		c_value=loadCookie(toh_prefs['cook_name_'+type]+i);
		myLogStr('p'+i+' / '+c_value,4);
		if(typeof(toh_cookies[type]) !='object'){
			myLogStr('create type:'+type,4);
			toh_cookies[type]={};
		}
		if(c_value !=undefined || c_value==''){
			myLogStr('save: '+c_value,4);
			toh_cookies[type][i]=c_value;
		}
		else{
			myLogStr('create index: '+i,4);
			toh_cookies[type][i]={};
		}		
	}
	myLogObj(toh_cookies,'result',4);
}

// Store User Preset in Cookie -----------------------------
function storePresetCookie(type, number=0, name='user'){ // type= 'features' or 'columns'
	myLogFunc('storePresetCookie: '+type+', '+number+', '+name);
	if(name==''){
		name=number;
	}
	var preset={
		name: name,
		list: []
	};
	if(type=='features'){
		preset.list=getCheckedFeatures();
		saveCookie(toh_prefs.cook_name_features+number, preset);
		toh_cookies[type][number]=preset;
	}
	else if(type=='columns'){
		preset.list=getCheckedColumns();
		saveCookie(toh_prefs.cook_name_columns+number, preset);
		toh_cookies[type][number]=preset;
	}
	myLogObj(preset.list,'preset.list',4);
}

// Delete User Preset Cookie --------------------------
function deletePresetCookie(type, number){
	if(type=='features'){
		saveCookie(toh_prefs.cook_name_features+number, false,true);
	}
	else if(type=='columns'){
		saveCookie(toh_prefs.cook_name_columns+number, false,true);
	}
}

// Build User Preset Menu -----------------------------
function buildUserPresets(type){// type= 'features' or 'columns'
	myLogFunc('buildUserPresets: '+type);
	var sel='';
	var name='';
	var html='';
	if(type=='features'){
		sel="#toh-filters-upresets .toh-upresets-content";
	}
	else if(type=='columns'){
		sel="#toh-cols-upresets .toh-upresets-content";
	}
	else{
		return false;
	}
	for (let i = 1; i <= toh_prefs.cook_preset_count; i++) {
		myLogStr('pr'+i,4);
		var myclass='';
		if(typeof(toh_cookies[type][i])=='object'){
			if(typeof(toh_cookies[type][i].name) =='string'){
				name=toh_cookies[type][i].name;
				myclass="toh-used";
			}
			else{
				name=i;
			}
		}
		else{
			name=+i;
		}
		// The name is the visitor's own text out of their own cookie. Unescaped it
		// put live markup in the button, and - because a quote closed the title
		// attribute early - every saved slot silently lost the tooltip that is the
		// only place the Alt-click-to-delete convention is documented.
		const tip=myclass ? 'Load "'+name+'" - Alt-click to delete it' : 'Empty slot - click to save the current selection here';
		html +='<a href="#" class="toh-upreset-but '+myclass+'" data-key="'+i+'" data-type="'+type+'" title="'+tohAttr(tip)+'">'+tohAttr(name)+'</a>';
	}
	$(sel).html(html);
}

// Appy a User Preset -----------------------------------------------
function applyUserPreset(type,num){
	myLogFunc();
	var preset=toh_cookies[type][num];
	if(preset==false){
		myLogStr('empty preset: '+type+'/'+num,1);
	}
	if(type=='features'){
		setPresetSelectedClass(type,'custom');
		clearAllFeatures();
		checkAllFeatures(false);
	}
	else if(type=='columns'){
		setPresetSelectedClass(type,'custom');
		showAllColumns(false);
		checkAllColumns(false);
	}
	else{
		return false;
	}
	$.each(preset.list,function(i,key){
		if(type=='features'){
			checkFeatureAndClearPreset(key,true);
		}
		else if(type=='columns'){
			applyColumCol(key,true);
		}
		else{
			return false;
		}
	});
	if(type=='features'){
		applyCheckedFeatures();
	}
}

// Load Cookies and Build User Preset menu -----------------------------
function loadCookiesAndBuildUserPresets(){
	loadPresetCookies('features');
	loadPresetCookies('columns');
	buildUserPresets('features');
	buildUserPresets('columns');
	// not the help link itself: it opens the hint panel on hover, and a native
	// tooltip on top of that is two explanations fighting over the same pointer
	$(".toh-upresets-title A").not('.toh-upresets-help').prop('title',toh_prefs.tooltip_upreset);
}


// Log functions ##############################################################################################################

// custom log String -----------------------------------------------------
function myLogStr(line=null, level=2, is_title=false) { // levels: 1=info, 2=debug, 3=verbose, 4=full

	if(level > toh_debug_level){
		return;
	}
	const pad_lenght=80;
	const p='-';
	if(is_title){
		line =p+p+" "+ line + " ";
		line =line.padEnd(pad_lenght,p);
	}
	else{
		line= " - "+line;
	}

	console.log(line);
}
// custom log Function -----------------------------------------------------
function myLogFunc(custom_title=null,level=3){
	if(level > toh_debug_level){
		return;
	}
	if(custom_title==null){
		//custom_title= arguments.callee.caller.name;
		custom_title=getCallerName();
	}
	myLogStr(custom_title,level,true);
}
// custom log Object -------------------------------------------------------
function myLogObj(obj,desc='',level=3) {
	if(level > toh_debug_level){
		return;
	}
	if(desc.length>0){
		desc=desc + ": ";
	}

	console.log(" * "+desc+": ",obj);
}
// get the Calling func name
function getCallerName() {
	try {
		throw new Error();
	} catch (e) {
		const stack = e.stack.split('\n');
		// The caller is typically the third item in the stack
		const callerLine = stack[2];
		//myLogObj(callerLine,'Stack');
		// Extract the function name using regex
		const match = callerLine.match(/(at)?\s*([^@]+)/);
		//myLogStr('found: '+match[2]);
		return match ? match[2] : 'anonymous';
	}
  }


// Misc functions #############################################################################################################

async function FetchReleases() {
	try {
		const versionData = await $.ajax({
			url: toh_urls.firm_versions,
			method: 'GET'
		});
		const cur_url = toh_urls.firm_releases.replace('VERSION', versionData.stable_version);

		const releaseData = await $.ajax({
			url: cur_url,
			method: 'GET'
		});

		toh_firmwares = releaseData.profiles;
		// indexed once: GetFirmwareSelectUrl runs for every Download cell of
		// every render, and scanning ~2000 profiles each time added up
		toh_firmwares_index = new Set(toh_firmwares.map(p => p.id + '|' + p.target));
		toh_firmwares_fetched =true;
		toh_stable_version = versionData.stable_version;	// so a cell can name it
	} 
	catch (error) {
		myLogObj(error,'Error fetching releases', 1);
	}
}

function GetFirmwareSelectUrl(id, target) {
	if(toh_firmwares_index.has(id + '|' + target)){
		return toh_urls.firm_select + '?target='+ target + "&id=" + id;
	}
	return false;
}

// Position the Image Preview div -------------------------------
function positionPreview($link, $container) {
	var linkOffset = $link.offset();
	var linkWidth = $link.outerWidth();
	var linkHeight = $link.outerHeight();
	var containerWidth = $container.outerWidth();
	var containerHeight = $container.outerHeight();
	var windowWidth = $(window).width();
	var windowHeight = $(window).height();
	var scrollTop = $('BODY').scrollTop();

	var left = linkOffset.left + linkWidth + 10; // 10px to the right of the link
	var top = linkOffset.top + scrollTop;

	// Check if the preview would go off the right edge of the window
	if (left + containerWidth > windowWidth) {
		left = linkOffset.left - containerWidth - 10; // 10px to the left of the link
	}

	// Check if the preview would go off the bottom of the viewport
	if (top + containerHeight > scrollTop + windowHeight) {
		top = Math.max(scrollTop, top + linkHeight - containerHeight);
	}

	// Ensure the preview doesn't go above the top of the viewport
	top = Math.max(scrollTop, top);

	$container.css({
		left: left,
		top: top
	});
}



var loading_is_running	= false;
var loading_last_time 		= 0;
const loading_duration	= 400;
// Show Loading --------------------------------------------------------
function showLoading(){
	myLogFunc();
	if(!loading_is_running){
		loading_is_running	=true;
		loading_last_time	= Date.now();
		ChangeFavicon('anim');
		$('#toh-header-loading').show();
		$('BODY').addClass('toh-loading');
	}
}
// Hide Loading --------------------------------------------------------
function hideLoading() {
	myLogFunc();
	if(loading_is_running){
		const timeSinceShow = Date.now() - loading_last_time;
		if (timeSinceShow < loading_duration) {
			setTimeout(hideLoading, loading_duration - timeSinceShow);
		}
		else {
			ChangeFavicon('trans');
			$('#toh-header-loading').hide();
			$('BODY').removeClass('toh-loading');
			loading_is_running = false;
		}
	}
}

// Change the favicon  --------------------------------------------------
function ChangeFavicon(type){
	//myLogStr('START fav='+type,1);
	var el=$('link[rel=icon]');
	
	var icon='static/img/favicon_trans.png';
	if(type=='anim'){
		icon='static/img/favicon_anim.gif';
	}

	if(el.attr('href') == icon ){
		//myLogStr('fav ALREADY set',1);
		return;
	}
	el.prop('href',icon);
	return;

	// el.remove(); // Remove the old favicon
	// el = $('<link>', {
	// 	rel: 'icon',
	// 	href: icon
	// });
	// $('head').append(el);
	// el[0].offsetHeight; 

	// Force browser favicon repaint
	// document.title = document.title + ' '; // Trigger tab repaint
	// setTimeout(() => document.title = document.title.trim(), 50); // Reset title
}


// Set default Filters & View -------------------------------------------
function SetDefaults(){
	myLogFunc();

	//show presets
	if(toh_prefs.def_show_filters){
		$(".toh-filters-but-toggle").trigger('click');
	}

	//show views
	if(toh_prefs.def_show_views){
		$(".toh-cols-but-toggle").trigger('click');
	}

	var tmp_value;
	var tmp_arr;
		
	//columns or columns preset
	tmp_value=getUrlParameter(toh_prefs.p_columns);
	if(tmp_value == ''){
		// set preset
		const asked=getUrlParameter(toh_prefs.p_view);
		tmp_value=getUrlParameterOrDefault(toh_prefs.p_view, tohDefaultView());
		if(getColumnSet(tmp_value).length == 0){
			tmp_value=tohDefaultView();
		}
		applyColumnPreset(tmp_value);
		if(asked != '' && getColumnSet(asked).length > 0){
			// a link that names a view has chosen one; only the fallback is ours
			toh_view_chosen=true;
		}
	}
	else{
		tmp_arr=tmp_value.split(',').filter(k => tabuTable.getColumn(k));
		if(tmp_arr.length === 0){
			// ?columns= naming nothing real left a completely blank table and then
			// erased the evidence from the URL. ?view=nosuchview already falls back.
			myLogStr('No usable column in ?columns=, falling back to the default view', 1);
			applyColumnPreset(tohDefaultView());
		}
		else{
			$.each(tmp_arr,function(i,key){
				applyColumCol(key,true);
			});
		}
	}
		
	//features or filter preset
	tmp_value=getUrlParameter(toh_prefs.p_features);
	if(tmp_value == ''){
		myLogStr('Set Filter Preset',4);
		// set preset
		tmp_value=getUrlParameterOrDefault(toh_prefs.p_filter, toh_prefs.def_filter);
		applyFilterPreset(tmp_value);
		//myLogStr('DONE',4);
	}
	else{
		myLogStr('Set Filter Features',4);
		tmp_arr=tmp_value.split(',');
		$.each(tmp_arr,function(i,key){
			checkFeatureAndClearPreset(key,true);
		});
		applyCheckedFeatures();
	}

	// the thresholds a shared link carries, before the search so the count the
	// summary shows is right the first time
	if(typeof toh_adv_nums !== 'undefined' && typeof toh_advsearch_nums !== 'undefined'){
		toh_advsearch_nums.forEach(n => {
			const v=parseInt(getUrlParameter(n.key), 10);
			if(!isNaN(v)){
				toh_adv_nums[n.key]=v;
				toh_extra_filters.push({field:n.field, type:n.type || '>=', value:v});
			}
		});
		if(toh_extra_filters.length){
			applyCheckedFeatures();
		}
	}

	// and the hero search
	tmp_value=getUrlParameter('search');
	if(tmp_value !== ''){
		$('.toh-search-input').val(tmp_value);
		const field=$('.toh-search-input').attr('data-field');
		if(field){
			tabuTable.setHeaderFilterValue(field, tmp_value);
		}
	}

	//myLogStr('SetDefaults URL',4);
	buildBrowserUrl();
	toh_table_inited=true;
}

// Display filtered / total count ------------------------------------------
function UpdateCountRows(){
	var html='';
	let selected	=tabuTable.getDataCount("active");
	let total		=tabuTable.getDataCount();
	if(selected < total){
		html='<b>'+selected+"</b> / ";
	}
	html +="<i>"+total+"</i>";
	$('.toh-count-rows-full').html(html);
	
	//$('.toh-count-rows').html(selected);
	$('#toh-bot-buttons OPTION[value=all]').html(total + " total");
	$('#toh-bot-buttons OPTION[value=active]').html(selected + " filtered");
	tohUpdateSummary();
}

// The sticky summary row --------------------------------------------------
// Says what is currently narrowing the table, for the visitor who has scrolled
// past the hero and can no longer see any of it. Called from anywhere the
// answer changes: the row counter, the filter rail, and the two searches.
function tohUpdateSummary(){
	if(typeof tabuTable === 'undefined' || !tabuTable){
		return;
	}
	let chips='';

	// the hero search box. A value typed into the Brand column's own header
	// filter is not shown here, the same as every other column's header filter.
	['model'].forEach(field => {
		const val=$('#toh-search-input-'+field).val();
		if(!val){
			return;
		}
		chips +='<span class="toh-summary-chip">'
			+ '<span class="toh-summary-chip-key">' + (field === 'model' ? 'Device' : 'Brand') + '</span>'
			+ '<span class="toh-summary-chip-val">' + tohAttr(val) + '</span>'
			+ '<a href="#" class="toh-summary-chip-drop" data-field="' + field + '" '
			+ 'title="Drop this search" aria-label="Drop this search">' + tohIcon('x') + '</a>'
			+ '</span>';
	});

	// the feature filters, as one chip: naming twelve of them would fill the row
	const feats=getCheckedFeatures().length;
	if(feats > 0){
		chips +='<a href="#" class="toh-summary-chip toh-summary-chip-filters" '
			+ 'title="Show the filters">'
			+ tohIcon('filter')
			+ '<span class="toh-summary-chip-val">' + feats + (feats === 1 ? ' filter' : ' filters') + '</span>'
			+ '</a>';
	}

	$('#toh-summary-chips').html(chips);

	const selected	=tabuTable.getDataCount("active");
	const total		=tabuTable.getDataCount();
	$('#toh-summary-count').html(selected < total
		? '<b>' + selected.toLocaleString('en-US') + '</b> of ' + total.toLocaleString('en-US')
		: '<b>' + total.toLocaleString('en-US') + '</b> devices');

	// nothing to clear when nothing is set
	$('#toh-summary-clear').toggleClass('toh-hidden', chips === '');
}

// Display filtered / total count ------------------------------------------
function UpdateCountCols(){
	var html='';
	let selected	=tabuTable.getColumns().filter(col => col.isVisible()).length;
	let total		=tabuTable.getColumns().length;
	if(selected < total){
		html='<b>'+selected+"</b> / ";
	}
	html +="<i>"+total+"</i>";
	$('.toh-count-cols-full').html(html);
	//$('.toh-count-cols').html(selected);
}

// Fill the four figures in the page header --------------------------------
// 'data' is the raw toh.json payload: rows are arrays indexed by data.columns.
function UpdatePageStats(data){
	myLogFunc();
	const rows=data.entries;
	const col =(name) => data.columns.indexOf(name);

	const i_brand	=col('brand');
	const i_target	=col('target');
	const i_release	=col('supportedcurrentrel');

	// a value that is missing, '-' or '?' means "we don't know", not "none"
	const known=(v) => typeof v === 'string' && v.length > 0 && v !== '-' && v !== '?';

	const brands	=new Set();
	const targets	=new Set();
	let   supported	=0;

	rows.forEach(function(row){
		if(i_brand  > -1 && known(row[i_brand]))	{brands.add(row[i_brand]);}
		if(i_target > -1 && known(row[i_target]))	{targets.add(row[i_target]);}
		// 'EOL' means the device dropped off the supported releases
		if(i_release > -1 && known(row[i_release]) && row[i_release] !== 'EOL'){supported++;}
	});

	const num=(n) => n.toLocaleString('en-US');
	$('#toh-stat-devices').text(num(rows.length));
	$('#toh-stat-supported').text(num(supported));
	$('#toh-stat-targets').text(num(targets.size));
	$('#toh-stat-brands').text(num(brands.size));
}

// jquery shake effect -----------------------------------------------------
// Nudge an element sideways to say "that did nothing".
// Only a statically positioned element gets position:relative - forcing it on
// the fixed compare tray would tear it out of the viewport and leave it there.
$.fn.shake = function(interval = 100, distance = 10, times = 3) {
	return this.each(function(){
		const $el=$(this);
		const rest=$el.css('position') === 'static' ? 0 : parseFloat($el.css('left')) || 0;
		if($el.css('position') === 'static'){
			$el.css('position', 'relative');
		}
		for (let i = 0; i < times + 1; i++) {
			$el.animate({left: rest + (i % 2 == 0 ? distance : distance * -1)}, interval);
		}
		$el.animate({left: rest}, interval);
	});
};


/*
//create indexed object  ---------------------------------------
function createIndexedObject(arrayOfObjects, key) {
	return arrayOfObjects.reduce((acc, obj) => {
		if (obj.hasOwnProperty(key)) {
			acc[obj[key]] = obj;
		}
		return acc;
	}, {});
}
*/
// get Vitual Columns ------------------------------------------------------
function getVirtualColumns() {
	return Object.entries(toh_colStyles)
		// VIRT_edit is not a column at all now: editing the wiki page is offered
		// inside a device's details, not as a frozen icon on every row
		.filter(([key]) => key.startsWith("VIRT_") && key !== 'VIRT_edit')
		.map(([f, value]) => ({
			field: f,			// needed to allow col.getDefinition() to work
			visible: false,     // Hodden by default
			...value            // Spread existing properties
		}));
}

// Load the markdown renderer, once, only when something needs it ------------
// snarkdown used to be a render-blocking script in <head> on every visit, for
// a changelog that only renders on the dev branch.
function tohLoadSnarkdown(){
	if(window.snarkdown){
		return Promise.resolve();
	}
	if(!window.__tohSnarkdown){
		window.__tohSnarkdown=new Promise(function(res, rej){
			const s=document.createElement('script');
			s.src='static/js/snarkdown.umd.js';
			s.onload=res;
			s.onerror=rej;
			document.head.appendChild(s);
		});
	}
	return window.__tohSnarkdown;
}

// --Fetch and Display the Changelog ----------------------------------------------------------------
function FetchAndPrintChangelog(){
	Promise.all([fetch('CHANGELOG.md').then(response => response.text()), tohLoadSnarkdown()])
    .then(results => {
        const data = results[0];
        const lines = data.split('\n');
        const result = [];
        let currentObject = null;
        
        // Process each line
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Check for subtitle
            if (line.startsWith('##')) {
                if (currentObject) {
                    result.push(currentObject);
                }
                currentObject = {
                    title: line.substring(2).trim(), // Remove '##' and trim
                    list: ''
                };
            }
            // Check for bullet points if we have a current object
            else if (currentObject && line.startsWith('*')) {
                currentObject.list += (currentObject.list ? '\n' : '') + line;
            }
        }
        
        // Push the last object if it exists
        if (currentObject) {
            result.push(currentObject);
        }
        
        if (result.length > 0) {
    	    // Insert the first result 
			$('#toh-changelog-latest').html('<div class="toh-changelog-release"><h5>' + result[0].title + ' <span class="badge">v'+ toh_app.version +'</span></h5>' + snarkdown(result[0].list)) +'</div>';

			// then the others results
			var html='';
			for (let i = 1; i < result.length; i++) {
				html +='<div class="toh-changelog-release"><h5>' + result[i].title + '</h5>' + snarkdown(result[i].list) +'</div>';
            }
			$('#toh-changelog-previous').html(html);

			$("#toh-changelog").show();

        }
    })
    .catch(error => myLogStr('Cannot load CHANGELOG! Error: '+ error));
}


// Scroll the page back to the top -------------------------------------------
// BODY is the scroll container (see toh.css), so window.scrollTo does nothing.
function tohScrollTop(){
	document.body.scrollTop=0;
	document.documentElement.scrollTop=0;
	window.scrollTo(0,0);
}


// Image lightbox and table sizing ############################################################################################
// Carried over from feature/modernize-ui when the two branches met.

// Every picture a cell's image link stands for --------------------
// The icon carries the whole set, so the lightbox can page through it.
function imagesOfLink($link){
	var list=$link.attr('data-images');
	if(list){
		return list.split(' ').filter(function(url){ return url.length > 0; });
	}
	return [$link.attr('href')];
}

// Open the Image Lightbox --------------------------------------
// Takes the whole set of pictures a device has, so the arrows can page
// through them without going back to the table.
function OpenImageLightbox(urls, index) {
	if(typeof urls == 'string'){
		urls=[urls];
	}
	if(!Array.isArray(urls) || urls.length == 0){
		return;
	}
	CloseImageLightbox();

	var current=index > 0 ? index : 0;
	var many=urls.length > 1;
	var token=0;	// tells a slow image that the arrows have moved on without it

	var $box = $(
		'<div id="toh-image-lightbox">' +
			'<div class="toh-lightbox-border">' +
				'<div class="toh-lightbox-head">' +
					'<a class="toh-lightbox-source" target="_blank" rel="noopener" title="Open the image in a new tab">'+tohIcon('external-link')+' Open original</a>' +
					'<span class="toh-lightbox-counter"></span>' +
					'<div class="toh-lightbox-close" title="Close (Esc)">'+tohIcon('circle-x')+'</div>' +
				'</div>' +
				'<div class="toh-lightbox-body">' +
					'<button type="button" class="toh-lightbox-nav toh-lightbox-prev" title="Previous picture">'+tohIcon('chevron-left')+'</button>' +
					'<div class="toh-lightbox-content"></div>' +
					'<button type="button" class="toh-lightbox-nav toh-lightbox-next" title="Next picture">'+tohIcon('chevron-right')+'</button>' +
				'</div>' +
			'</div>' +
		'</div>'
	);
	if(!many){
		$box.find('.toh-lightbox-nav').remove();
	}

	function showImage(wanted){
		current=(wanted + urls.length) % urls.length;	// the arrows wrap around
		var url=urls[current];
		var mine=++token;

		$box.find('.toh-lightbox-source').attr('href', url);
		$box.find('.toh-lightbox-counter').text(many ? (current + 1) + ' / ' + urls.length : '');
		$box.find('.toh-lightbox-content').html(tohIcon('loader-circle toh-ico-spin toh-ico-2x'));

		var $img = $('<img>', {alt: 'Device Image'});
		$img.on('load', function() {
			if(mine != token){
				return;
			}
			$box.find('.toh-lightbox-content').empty().append($img);
		});
		$img.on('error', function() {
			if(mine != token){
				return;
			}
			// The wiki sits behind an anti-bot challenge that images embedded from
			// another page cannot answer, so they are served an HTML page instead.
			// Opening the image as a normal navigation does pass the challenge.
			var $err = $('<div class="toh-lightbox-error"></div>');
			$err.append('<div>'+tohIcon('triangle-alert')+' This image could not be loaded from the wiki.</div>');
			$err.append($('<a target="_blank" rel="noopener">Open it directly on openwrt.org</a>').attr('href', url));
			$box.find('.toh-lightbox-content').empty().append($err);
		});
		$img.attr('src', url);
	}

	$box.find('.toh-lightbox-prev').on('click', function(e) {
		e.stopPropagation();
		showImage(current - 1);
	});
	$box.find('.toh-lightbox-next').on('click', function(e) {
		e.stopPropagation();
		showImage(current + 1);
	});

	// close on backdrop click, but not when clicking the image itself
	$box.on('click', function(e) {
		if(e.target === this || $(e.target).closest('.toh-lightbox-close').length){
			CloseImageLightbox();
		}
	});
	$(document).on('keydown.tohlightbox', function(e) {
		if(e.keyCode == 27){	//esc
			CloseImageLightbox();
		}
		else if(many && e.keyCode == 37){	//left
			showImage(current - 1);
		}
		else if(many && e.keyCode == 39){	//right
			showImage(current + 1);
		}
	});

	$('BODY').append($box);
	showImage(current);
}

// Close the Image Lightbox -------------------------------------
function CloseImageLightbox() {
	$(document).off('keydown.tohlightbox');
	$('#toh-image-lightbox').remove();
}

// the height a row really renders at, which wrapping or a zoomed page can push
// past the configured one
function getTableRowHeight(){
	const row = document.querySelector('#toh-table .tabulator-row');
	const measured = row ? row.getBoundingClientRect().height : 0;
	return Math.max(measured, tabulatorOptions.rowHeight);
}

// the content height #toh-table-container needs to show 'size' rows in full
function getTableHeight(size){
	const rows = parseInt(size, 10);
	if(! rows){		// 'true' means "every row": tabulator sizes itself then
		return null;
	}
	const holder	= document.querySelector('#toh-table .tabulator-tableholder');
	const $header	= $('#toh-table .tabulator-header');
	const $footer	= $('#toh-table .tabulator-footer');
	if(! holder || ! $header.length || ! $footer.length){
		return null;	// table not built yet, the CSS default still applies
	}
	// zero where the platform draws overlay scrollbars, ~15px where it does not
	const h_scroll	= holder.offsetHeight - holder.clientHeight;
	// 1px of slack so sub-pixel rounding cannot eat into the last row
	const wanted	= Math.ceil($header.outerHeight() + $footer.outerHeight() + h_scroll + (getTableRowHeight() * rows)) + 1;

	// A full page of rows can be taller than the window, which pushes the
	// pagination and everything under it off the screen. Past what the viewport
	// can show, the rows scroll inside the table instead.
	// measured, not read from --appbar-h: once the summary row is showing that
	// variable holds a calc() expression, which getPropertyValue hands back
	// unresolved and parseInt turns into NaN
	const h_appbar	= $('#toh-appbar').outerHeight() || 48;
	const h_toolbar	= $('#toh-toolbar').outerHeight() || 0;
	const h_avail	= Math.max(toh_table_min_height, window.innerHeight - h_appbar - h_toolbar - 48);

	return Math.min(wanted, Math.ceil(h_avail));
}

// resizes the container unless it already fits, so calling this from a render
// event cannot loop
function setTableHeight(size){
	const wanted = getTableHeight(size);
	if(wanted === null){
		return;
	}
	const $container = $('#toh-table-container');
	// Every measurement first, then every write. Measuring the header and footer
	// after setting the container height forced a second synchronous layout on
	// each call, and this runs on load, on every resize and on every page-size
	// change - three times in a row during boot alone.
	const current = $container.height();
	if(Math.abs(current - wanted) < 1){
		return;
	}
	const head = $('#toh-table .tabulator-header').outerHeight();
	const foot = $('#toh-table .tabulator-footer').outerHeight();
	// only scroll the rows when the page of them did not fit the window
	const full = Math.ceil(head + foot + (getTableRowHeight() * parseInt(size, 10)));

	myLogStr('Table Set height: ' + wanted + ' (was ' + current + ')', 2);
	$container.height(wanted);
	$('#toh-table .tabulator-tableholder').css('overflow-y', wanted < full ? 'auto' : 'hidden');
}

// Keep the ARIA state on a panel in step with its visibility ---------------
// A panel that says aria-hidden while it is on screen is read as absent.
// Focus follows the panel ---------------------------------------------------
// Every panel goes through here, so this is the one place that has to get it
// right: opening one moves focus into it, closing one hands focus back to
// whatever opened it, and Tab cannot wander into the page behind. Without this
// a keyboard visitor opened Advanced Search and went on tabbing through the
// table underneath, and #toh-sheet promised aria-modal it did not honour.
let toh_panel_opener=null;
let toh_panel_open_sel=null;

const TOH_FOCUSABLE='a[href], button:not([disabled]), input:not([disabled]), '
	+ 'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function tohPanelFocusables(sel){
	return $(sel).find(TOH_FOCUSABLE).filter(':visible').toArray();
}

function tohSetPanelHidden(sel, hidden){
	$(sel).attr('aria-hidden', hidden ? 'true' : 'false');

	if(!hidden){
		toh_panel_opener=document.activeElement;
		toh_panel_open_sel=sel;
		const panel=$(sel)[0];
		if(panel){
			if(!panel.hasAttribute('tabindex')){
				panel.setAttribute('tabindex','-1');	// somewhere to land if it holds no control
			}
			// after the caller has written the panel's markup
			setTimeout(function(){
				const first=tohPanelFocusables(sel)[0];
				(first || panel).focus();
			}, 0);
		}
	}
	else if(toh_panel_open_sel === sel){
		toh_panel_open_sel=null;
		const back=toh_panel_opener;
		toh_panel_opener=null;
		if(back && back.isConnected && typeof back.focus === 'function'){
			back.focus();
		}
	}
}

// Keep Tab inside the open panel
$(document).on('keydown', function(e){
	if(e.key !== 'Tab' || !toh_panel_open_sel){
		return;
	}
	const panel=$(toh_panel_open_sel)[0];
	const items=tohPanelFocusables(toh_panel_open_sel);
	if(!panel || !items.length){
		return;
	}
	const first=items[0];
	const last=items[items.length - 1];
	const inside=panel.contains(document.activeElement);
	if(e.shiftKey && (document.activeElement === first || !inside)){
		e.preventDefault();
		last.focus();
	}
	else if(!e.shiftKey && (document.activeElement === last || !inside)){
		e.preventDefault();
		first.focus();
	}
});


// Close whatever panel is covering the table --------------------------------
function tohBackToTable(){
	if(typeof tohCloseCompare === 'function'){ tohCloseCompare(); }
	if(typeof tohCloseFacet === 'function'){ tohCloseFacet(); }
	if(typeof tohCloseAdvSearch === 'function'){ tohCloseAdvSearch(); }
	if(typeof tohCloseWizard === 'function'){ tohCloseWizard(); }
}
