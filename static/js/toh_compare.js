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
// toh_compare.js
//
//	Side-by-side device comparison.

// Compare ####################################################################################################################

let toh_compare=[];					// deviceids picked for comparison, in pick order
let toh_compare_restoring=false;	// suppresses the history push while replaying a URL
const toh_compare_max=4;			// more than this and the columns stop being readable

// The rows of the comparison, in the order they are shown. 'diff' marks the
// fields worth highlighting when they differ - free text like the power supply
// string differs on almost every device, so highlighting it says nothing.
const toh_compare_rows=[
	// not 'supportedcurrentrel': the card header already carries the release
	// badge. 'supportedsincecommit' renders the clickable commit the install
	// notes point at ("see git-commit"), which the matrix had no way to reach.
	{group:'Overview',	fields:['devicetype','availability','supportedsincerel','supportedsincecommit','target','subtarget','packagearchitecture'], diff:true},
	{group:'CPU',		fields:['cpu','cpucores','cpumhz'], diff:true},
	{group:'Memory',	fields:['rammb','flashmb'], diff:true},
	{group:'Wireless',	fields:['wlan24ghz','wlan50ghz','wlan60ghz','wlanhardware','detachableantennas'], diff:true},
	{group:'Network',	fields:['ethernet100mports','ethernet1gports','ethernet2_5gports','ethernet5gports','ethernet10gports','sfp_ports','sfp_plus_ports','vlan','modem'], diff:true},
	{group:'Ports',		fields:['usbports','sataports','audioports','videoports','phoneports','serial','jtag','gpios'], diff:true},
	{group:'Other',		fields:['bootloader','installationmethods','recoverymethods','powersupply','outdoor','unsupported_functions'], diff:false},
];


// Compare functions ##########################################################################################################

function tohCompareHas(id){
	return toh_compare.indexOf(id) > -1;
}

// Is a pick refused right now? ---------------------------------------------
// One place for the limit, because the rule was written out inline in the
// checkbox formatter and again in the sync loop, and the phone cards were
// written without knowing about either - which is how they ended up offering a
// button that silently did nothing.
function tohCompareBlocked(id){
	return !tohCompareHas(id) && toh_compare.length >= toh_compare_max;
}

// ... and what to tell the visitor about it --------------------------------
// On a phone there is no hover and no cursor, so the reason has to be in the
// accessible name rather than only in a tooltip.
function tohCompareLabel(id){
	if(tohCompareBlocked(id)){
		return 'Already comparing ' + toh_compare_max + ' devices - remove one first';
	}
	return tohCompareHas(id) ? 'Remove from the comparison' : 'Pick this device to compare';
}

// Add / remove a device. Returns false when the pick was refused. -----------
function tohCompareToggle(id, wanted){
	if(!id){
		return false;
	}
	const at=toh_compare.indexOf(id);
	if(wanted && at === -1){
		if(toh_compare.length >= toh_compare_max){
			return false;
		}
		toh_compare.push(id);
	}
	else if(!wanted && at > -1){
		toh_compare.splice(at,1);
	}
	tohCompareSync();
	return true;
}

function tohCompareClear(){
	toh_compare=[];
	tohCompareSync();
	tohCloseCompare();
}

// Reflect the current selection into the checkboxes, the tray and the URL ---
function tohCompareSync(){
	myLogFunc();
	$('#toh-table .toh-compare-check').each(function(){
		const on=tohCompareHas($(this).attr('data-id'));
		$(this).prop('checked', on);
		// a full tray must not look clickable on the rows that are not in it
		const id=$(this).attr('data-id');
		$(this).prop('disabled', tohCompareBlocked(id))
			.attr('title', tohCompareLabel(id))
			.attr('aria-label', tohCompareLabel(id));
	});
	tohCardsSyncToggles();			// and the same picks on the phone cards

	const n=toh_compare.length;
	$('#toh-compare-count').text(n);
	$('#toh-compare-tray').toggleClass('toh-hidden', n === 0);
	$('body').toggleClass('toh-tray-open', n > 0);		// makes room under the tray
	tohFitTray();
	$('#toh-compare-open').prop('disabled', n < 2);

	// the chips naming what is currently picked
	let chips='';
	toh_compare.forEach(id => {
		const row=tohCompareRowData(id);
		const name=row ? (row.brand + ' ' + row.model) : id;
		chips +='<span class="toh-compare-chip">' + tohAttr(name)
			+ '<a href="#" class="toh-compare-drop" data-id="' + tohAttr(id) + '" title="Remove">' + tohIcon('x') + '</a></span>';
	});
	$('#toh-compare-chips').html(chips);

	buildBrowserUrl();
	if($('#toh-compare-panel').is(':visible')){
		tohBuildCompare();				// keep an open comparison in step
	}
}

// Find a device's row by its id --------------------------------------------
function tohCompareRowData(id){
	// indexed by deviceid, so this does not walk 3,000 rows per lookup;
	// the map holds every row, filtered out or not
	return tohRowById(id);
}

// The checkbox in the table -------------------------------------------------
function FormatterCompare(cell, formatterParams, onRendered) {
	const id=cell.getRow().getData().deviceid;
	if(!id){
		return '';
	}
	const on=tohCompareHas(id);
	return '<input type="checkbox" class="toh-compare-check" data-id="' + tohAttr(id) + '"'
		+ (on ? ' checked' : '') + (tohCompareBlocked(id) ? ' disabled' : '')
		+ ' title="' + tohCompareLabel(id) + '" aria-label="' + tohCompareLabel(id) + '">';
}

// Render one field for the comparison --------------------------------------
// Reuses the column's own formatter so badges and icons look like the table.
function tohCompareCell(field, data){
	const col=getMyColumnDefinition(field);
	if(!col){
		return '';
	}
	const value=data[field];
	let column=null;
	try { column=tabuTable.getColumn(field); } catch(e) {}
	const formatter=(column ? column.getDefinition().formatter : col.formatter) || null;

	let out=value;
	if(typeof formatter === 'function'){
		const params=col.formatterParams ? JSON.parse(JSON.stringify(col.formatterParams)) : undefined;
		out=formatter({
			getValue: () => value,
			getField: () => field,
			getRow: () => ({getData: () => data}),
			getColumn: () => column,
			getElement: () => document.createElement('div'),
		}, params);
	}
	const isHtml=typeof formatter === 'function';
	out=out instanceof Node ? out.outerHTML : (out === null || out === undefined ? '' : String(out));
	if(out === '' || out === 'null' || out === '-'){
		return '<span class="toh-compare-none">&mdash;</span>';
	}
	// A formatter returns markup we built, a bare field value is raw wiki text.
	// The contract that makes this safe is that every formatter escapes its own
	// source values - FormatterCleanWords, FormatterCleanEmpty, FormatterArray
	// and FormatterLink each did not, and each was a way into this innerHTML.
	// A new formatter that interpolates a cell value without tohAttr() reopens it.
	return isHtml ? out : tohAttr(out);
}

// Does this cell hold nothing? ---------------------------------------------
// "", "-", null, [] and ["-"] are all the wiki's ways of writing "not filled in".
function tohCompareEmpty(v){
	if(Array.isArray(v)){
		return v.every(x => tohCompareEmpty(x));
	}
	return v === null || v === undefined || String(v).trim() === '' || String(v).trim() === '-';
}

// Are these values all the same? -------------------------------------------
function tohCompareSame(values){
	// every flavour of empty counts as the same nothing, so a null against a
	// ["-"] is not reported as a difference between two devices that both lack it
	if(values.every(v => tohCompareEmpty(v))){
		return true;
	}
	const norm=values.map(v => JSON.stringify(v === undefined ? null : v));
	return norm.every(v => v === norm[0]);
}

// The first real photo a device has, or null ------------------------------
// Mirrors FormatterImages: skip the shared placeholder drawing, build the media
// URL for a wiki filename, pass an absolute URL through.
function tohDeviceImageUrl(data){
	const arr=data.picture;
	if(!Array.isArray(arr)){
		return null;
	}
	for(const v of arr){
		if(v === null || v === undefined || v === '' || isGenerigImage(v)){
			continue;
		}
		return String(v).match(/^http/) ? v : toh_urls.media + String(v).replace(/:/g,'/');
	}
	return null;
}

function tohCompareDevLink(url, icon, label){
	// Escaping is not enough on its own: tohAttr() does its job perfectly on
	// "javascript:..." and still leaves a link that runs. These two fields come
	// straight from the wiki, which does no URL validation at all - one row's
	// wikideviurl in the live data is a sentence with a bracket in it.
	url=tohSafeUrl(url);
	if(!url){
		return '';
	}
	return "<a class='toh-compare-devlink' href='" + tohAttr(url) + "' target='_blank' rel='noopener'"
		+ " title='" + tohAttr(label) + "' aria-label='" + tohAttr(label) + "'>" + tohIcon(icon) + "</a>";
}

// One device's column header, as a card ------------------------------------
// The name is a button that opens the full details (the same sheet the phone
// cards use), so a comparison is not a dead end; the photo, support badge and
// forum / wiki links give the column the context the bare "brand / model" text
// never had.
function tohCompareDevCardHtml(d, is_ref){
	const img=tohDeviceImageUrl(d);
	const badge=FormatterRelease({getValue: () => d.supportedcurrentrel, getRow: () => ({getData: () => d})});
	const links=tohCompareDevLink(d.owrt_forum_topic_url, 'user', 'Forum thread')
		+ tohCompareDevLink(d.wikideviurl, 'book-open', 'Wiki page');

	return "<button type='button' class='toh-compare-card js-compare-details' data-id='" + tohAttr(d.deviceid) + "'"
			+ " title='Open full details'>"
			+ "<span class='toh-compare-thumb" + (img ? "" : " is-generic") + "'>" + tohIcon('image')
				+ (img ? "<img class='toh-compare-img' loading='lazy' alt='' src='" + tohAttr(img) + "'>" : "")
			+ "</span>"
			+ "<span class='toh-compare-brand'>" + tohAttr(d.brand || '') + "</span>"
			+ "<span class='toh-compare-model'>" + tohAttr(d.model || '')
				// 657 of 3,015 devices share brand+model with another row, and
				// comparing revisions is what this feature is for - without the
				// version three columns read identically and nothing in the matrix
				// says which is which
				+ (tohCompareEmpty(d.version) ? '' : " <span class='toh-compare-ver'>"
					+ tohAttr(tohArrayText(d.version)) + "</span>")
			+ "</span>"
		+ "</button>"
		+ "<div class='toh-compare-badge'>" + badge + "</div>"
		+ (is_ref ? "<span class='toh-compare-reftag'>Reference</span>" : "")
		+ (links ? "<div class='toh-compare-devlinks'>" + links + "</div>" : "");
}

// Build the comparison matrix ----------------------------------------------
function tohBuildCompare(){
	myLogFunc();
	const devices=toh_compare.map(tohCompareRowData).filter(Boolean);
	if(devices.length < 2){
		$('#toh-compare-body').html('<p class="toh-compare-empty">Pick at least two devices to compare.</p>');
		return;
	}

	const by_ref=$('#toh-compare-ref').is(':checked');
	const diff_only=$('#toh-compare-diffonly').is(':checked');

	let html='<table class="toh-compare-table"><thead><tr><th class="toh-compare-rowhead"></th>';
	devices.forEach((d,i) => {
		const is_ref=by_ref && i === 0;
		html +='<th class="toh-compare-devhead' + (is_ref ? ' is-ref' : '') + '">'
			+ tohCompareDevCardHtml(d, is_ref)
			+ '</th>';
	});
	html +='</tr></thead><tbody>';

	toh_compare_rows.forEach(section => {
		let rows='';
		section.fields.forEach(field => {
			const col=getMyColumnDefinition(field);
			if(!col){
				return;
			}
			const raw=devices.map(d => d[field]);
			// a row where nobody has a value tells you nothing.
			// The wiki writes an unfilled field as ["-"] as often as it writes "-",
			// and the scalar-only test let those rows through - drawn as two
			// em-dashes and counted as a difference against a plain null.
			if(raw.every(v => tohCompareEmpty(v))){
				return;
			}
			const differs=section.diff && !tohCompareSame(raw);
			if(diff_only && !differs){
				return;					// "only rows that differ"
			}
			rows +='<tr' + (differs ? ' class="is-diff"' : (section.diff ? '' : ' class="is-nodiff"')) + '>'
				+ '<th class="toh-compare-rowhead">' + (col.headerTooltip || col.title) + '</th>';
			const first=JSON.stringify(raw[0] === undefined ? null : raw[0]);
			devices.forEach((d,i) => {
				// in reference mode every cell is judged against the first device,
				// rather than only flagging that the row differs somewhere
				let cls='';
				if(by_ref && section.diff){
					if(i === 0){
						cls=' class="is-ref"';
					}
					else if(JSON.stringify(raw[i] === undefined ? null : raw[i]) !== first){
						cls=' class="is-off-ref"';
					}
				}
				rows +='<td' + cls + '>' + tohCompareCell(field, d) + '</td>';
			});
			rows +='</tr>';
		});
		if(rows){
			html +='<tr class="toh-compare-section"><th class="toh-compare-rowhead">' + section.group + '</th>'
				+ '<td colspan="' + devices.length + '"></td></tr>' + rows;
		}
	});

	html +='</tbody></table>';
	$('#toh-compare-body').html(html);

	// openwrt.org blocks hotlinking, so a thumbnail may 404: fall back to the
	// placeholder icon behind it. error does not bubble, so bind per image
	// rather than delegate.
	$('#toh-compare-body img.toh-compare-img').on('error', function(){
		$(this).closest('.toh-compare-thumb').addClass('is-generic');
	});

	const diffs=$('#toh-compare-body tr.is-diff').length;
	// only the rows that can ever be marked: the "Other" group is deliberately
	// undiffed, so counting it made the denominator promise comparisons that
	// were never going to happen ("8 of 26" where 21 was the real ceiling)
	const total=$('#toh-compare-body tbody tr').not('.toh-compare-section').not('.is-nodiff').length;
	$('#toh-compare-diffcount').text(diffs);
	$('#toh-compare-rowcount').text(total);
	if(diff_only && diffs === 0){
		$('#toh-compare-body').html('<p class="toh-compare-empty">These devices match on every compared field.</p>');
	}
}

function tohOpenCompare(){
	if(toh_compare.length < 2){
		return;
	}
	tohBuildCompare();
	$('#toh-compare-panel').removeClass('toh-hidden');
	tohSetPanelHidden('#toh-compare-panel', false);
	$('#toh-main, #toh-hero').addClass('toh-hidden');
	// the shortlist strip belongs to the browse view and sits above the panel in
	// the DOM; a body class hides it without touching its own has-collections
	// visibility, which is set elsewhere
	$('body').addClass('toh-compare-open').removeClass('toh-sidebar-open');
	// The facet and statistics pages push an entry so Back closes them; this one
	// did not, so Back walked straight off the site from an open comparison.
	if(!toh_compare_restoring){
		// Marked in the history state, not in the URL: ?compare= describes the
		// tray, which stays filled whether the panel is open or shut, so the URL
		// alone cannot tell Back which of the two it is undoing.
		history.pushState({comparePanel: true}, '', buildBrowserUrl(false));
	}
	tohScrollTop();
}

function tohCloseCompare(){
	$('#toh-compare-panel').addClass('toh-hidden');
	tohSetPanelHidden('#toh-compare-panel', true);
	$('#toh-main, #toh-hero').removeClass('toh-hidden');
	$('body').removeClass('toh-compare-open');
}

// Restore a comparison from the URL ----------------------------------------
// Split in two on purpose: SetDefaults() rewrites the address bar from the
// filter and column state, which would drop a compare= it does not know about.
// So read the parameter before that runs, and apply it once the table exists.
function tohCompareReadUrl(){
	const raw=getUrlParameter('compare');
	if(!raw){
		return;
	}
	// dedupe before truncating: a link listing the same device twice, or four
	// ids that no longer exist, used to eat the whole four-device budget before
	// anything checked whether they were real
	const seen=new Set();
	toh_compare=raw.split(',').map(s => s.trim()).filter(id => {
		if(!id || seen.has(id)){
			return false;
		}
		seen.add(id);
		return true;
	}).slice(0, toh_compare_max);
	myLogStr('Compare from URL: ' + toh_compare.join(', '), 2);
}

// Back and forward ---------------------------------------------------------
// The panel pushes an entry now, so Back has to be able to undo it. Without
// this Back stayed on the page with the comparison still open, which is the
// same dead press the device popup used to have.
function tohComparePopState(){
	const open=!$('#toh-compare-panel').hasClass('toh-hidden');
	const wanted=!!(history.state && history.state.comparePanel);
	if(open === wanted){
		return;
	}
	toh_compare_restoring=true;
	if(open){
		tohCloseCompare();
	}
	else if(toh_compare.length >= 2){
		tohOpenCompare();
	}
	toh_compare_restoring=false;
}

function tohCompareApply(){
	if(toh_compare.length === 0){
		return;
	}
	// drop ids that are not in the data at all, rather than showing blank columns
	toh_compare=toh_compare.filter(id => tohCompareRowData(id) !== null);
	tohCompareSync();
	if(toh_compare.length >= 2){
		toh_compare_restoring=true;		// the URL is already what it should be
		tohOpenCompare();
		toh_compare_restoring=false;
	}
}


// Similar devices ############################################################################################################
// A plain weighted count of what two devices share. No benchmarks are involved
// and none are implied: this says "these look alike on paper", not "this one is
// better".

const toh_similar_weights=[
	{label:'target',	weight:3, same:(a,b) => a.target && a.target === b.target},
	{label:'chipset',	weight:3, same:(a,b) => a.cpu && a.cpu === b.cpu},
	{label:'RAM',		weight:1, same:(a,b) => a.rammb && String(a.rammb) === String(b.rammb)},
	{label:'flash',		weight:1, same:(a,b) => a.flashmb && JSON.stringify(a.flashmb) === JSON.stringify(b.flashmb)},
	// Both of these need the same "a has one at all" guard the four above carry.
	// Without it two devices that BOTH lack Wi-Fi scored a match for having
	// nothing in common: a board with no radio and no gigabit port was offered
	// neighbours at "42% - shares RAM, Wi-Fi, ethernet" on the strength of two
	// absences. 46.6% of suggestions credited at least one shared nothing.
	{label:'Wi-Fi',		weight:2, same:(a,b) => (!tohCompareEmpty(a.wlan24ghz) || !tohCompareEmpty(a.wlan50ghz))
		&& String(a.wlan24ghz||'')+'|'+String(a.wlan50ghz||'') === String(b.wlan24ghz||'')+'|'+String(b.wlan50ghz||'')},
	{label:'ethernet',	weight:2, same:(a,b) => (!tohCompareEmpty(a.ethernet1gports) || !tohCompareEmpty(a.ethernet2_5gports))
		&& String(a.ethernet1gports||'')+'|'+String(a.ethernet2_5gports||'') === String(b.ethernet1gports||'')+'|'+String(b.ethernet2_5gports||'')},
];

const toh_similar_max=toh_similar_weights.reduce((n,w) => n + w.weight, 0);

function tohSimilarDevices(device, limit=5){
	const rows=tohRows();
	const scored=[];

	rows.forEach(other => {
		if(other.deviceid === device.deviceid){
			return;
		}
		let score=0;
		const shared=[];
		toh_similar_weights.forEach(w => {
			if(w.same(device, other)){
				score +=w.weight;
				shared.push(w.label);
			}
		});
		if(score > 0){
			scored.push({row:other, score:score, shared:shared});
		}
	});

	scored.sort((a,b) => b.score - a.score || String(a.row.model).localeCompare(String(b.row.model)));
	return scored.slice(0, limit);
}

// Rendered into the details popup ------------------------------------------
function tohSimilarHtml(device){
	const list=tohSimilarDevices(device);
	if(list.length === 0){
		return '';
	}
	let html="<div class='toh-details-group'>\n<div class='toh-details-title'>Similar devices</div>\n<table class='toh-details-table'>";
	list.forEach(item => {
		const pct=Math.round(100 * item.score / toh_similar_max);
		html +='<tr><td class="toh-details-key toh-similar-score" title="Shares its ' + item.shared.join(', ') + '">' + pct + '%</td>'
			+ '<td class="toh-details-value toh-similar-name">'
			+ '<a href="' + tohAttr(_maketHwDataUrl(item.row.deviceid)) + '" target="_blank" rel="noopener">'
			+ tohAttr((item.row.brand || '') + ' ' + (item.row.model || '')) + '</a>'
			+ '<span class="toh-similar-shared">' + item.shared.join(' &middot; ') + '</span>'
			+ '</td></tr>';
	});
	html +="</table>\n</div>";
	return html;
}


// Reserve exactly the tray's height under the page -------------------------
// Measured, because the tray grows a line taller once the chips wrap.
function tohFitTray(){
	const tray=document.getElementById('toh-compare-tray');
	const open=document.body.classList.contains('toh-tray-open');
	document.documentElement.style.setProperty('--tray-h', open && tray ? tray.offsetHeight + 'px' : '0px');
}
