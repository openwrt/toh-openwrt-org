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
// toh_pages.js
//
//	Manufacturer and chipset pages - the data grouped by one field.

// Manufacturer / chipset pages ###############################################################################################
// Both are the same shape - group the data by one field, then describe the
// group - so they share a renderer and differ only in what they measure.

const toh_facets={
	brand:  {param:'brand',   field:'brand', title:'Manufacturer', related:{field:'target', label:'Targets'}},
	chipset:{param:'chipset', field:'cpu',   title:'Chipset',      related:{field:'brand',  label:'Manufacturers'}},
	target: {param:'target',  field:'target',title:'Target',       related:{field:'brand',  label:'Manufacturers'}},
};

let toh_facet_open=null;			// {type, value} while a facet page is showing
let toh_facet_pending=null;			// read from the URL before the table exists
let toh_stats_open=false;			// the statistics page is showing

// How a device stands with regard to OpenWrt releases -----------------------
function tohSupportState(row){
	const v=String(row.supportedcurrentrel === null || row.supportedcurrentrel === undefined ? '' : row.supportedcurrentrel).trim().toLowerCase();
	if(v === '' || v === '-' || v === '?'){
		return 'unknown';
	}
	if(v === 'eol'){
		return 'eol';
	}
	if(v === 'snapshot'){
		return 'snapshot';
	}
	return 'supported';
}

function tohFacetRows(type, value){
	const f=toh_facets[type];
	return tohRows().filter(d => String(d[f.field]) === String(value));
}

// Count values of a field, most common first -------------------------------
function tohCountBy(rows, field){
	const counts={};
	rows.forEach(r => {
		let v=r[field];
		if(Array.isArray(v)){ v=v[0]; }
		if(v === null || v === undefined || v === '' || v === '-'){ return; }
		counts[v]=(counts[v]||0)+1;
	});
	return Object.entries(counts).sort((a,b) => b[1]-a[1]);
}

// Open a manufacturer or chipset page --------------------------------------
function tohOpenFacet(type, value, push=true){
	const f=toh_facets[type];
	if(!f || !value){
		return;
	}
	const rows=tohFacetRows(type, value);
	if(rows.length === 0){
		return;
	}
	toh_facet_open={type:type, value:value};
	toh_stats_open=false;			// or going back to statistics would not redraw

	const states={supported:0, snapshot:0, eol:0, unknown:0};
	rows.forEach(r => states[tohSupportState(r)]++);

	let html='';

	// headline -------------------------------------------------------------
	html +='<div class="toh-facet-title">'
		+ '<span class="toh-facet-kind">' + tohAttr(f.title) + '</span>'
		+ '<h2>' + tohAttr(value) + '</h2>'
		+ '<p class="toh-facet-count"><b>' + rows.length.toLocaleString('en-US') + '</b> devices</p>'
		+ '</div>';

	// what we can say about the group itself -------------------------------
	let facts=[];
	if(type === 'target'){
		const subs=tohCountBy(rows,'subtarget');
		const arch=tohCountBy(rows,'packagearchitecture');
		const cpus=tohCountBy(rows,'cpu');
		if(arch.length){
			facts.push(['Architecture', arch[0][0]]);
		}
		facts.push(['Subtargets', String(subs.length)]);
		facts.push(['Distinct chipsets', String(cpus.length)]);
		facts.push(['On a current release', String(states.supported)]);
	}
	else if(type === 'chipset'){
		const arch=tohCountBy(rows,'packagearchitecture');
		const mhz=rows.map(r => parseInt(r.cpumhz,10)).filter(n => !isNaN(n) && n > 0);
		const since=rows.map(r => r.supportedsincerel).filter(v => v && v !== '-').sort();
		if(arch.length){
			facts.push(['Architecture', arch[0][0]]);
		}
		if(mhz.length){
			const lo=Math.min(...mhz), hi=Math.max(...mhz);
			facts.push(['Clock', lo === hi ? lo + ' MHz' : lo + '–' + hi + ' MHz']);
		}
		if(since.length){
			facts.push(['First supported', 'OpenWrt ' + since[0]]);
		}
		facts.push(['Still on a release', states.supported > 0 ? 'Yes, ' + states.supported + ' devices' : 'No']);
	}
	else {
		const targets=tohCountBy(rows,'target');
		facts.push(['On a current release', String(states.supported)]);
		facts.push(['Snapshot only', String(states.snapshot)]);
		facts.push(['End of life', String(states.eol)]);
		facts.push(['Targets', String(targets.length)]);
	}
	html +='<div class="toh-facet-facts">';
	facts.forEach(([k,v]) => {
		// v is device data (packagearchitecture, a release name); k is a literal
		html +='<div class="toh-fact"><span class="toh-fact-label">' + k + '</span><span class="toh-fact-value">' + tohAttr(v) + '</span></div>';
	});
	html +='</div>';

	// support breakdown ----------------------------------------------------
	html +='<div class="toh-facet-block"><h3>Support status</h3>' + tohSupportBar(states, rows.length) + '</div>';

	// the related dimension, as links to the other kind of page ------------
	const rel=tohCountBy(rows, f.related.field);
	if(rel.length){
		// Which facet page shows this related field. Derived rather than hard
		// coded: it used to test `type === 'chipset'`, so the brand page's Targets
		// and the target page's Manufacturers rendered as dead spans even though
		// both have a page of their own.
		const other=Object.keys(toh_facets).find(k => toh_facets[k].field === f.related.field) || null;
		// the device list below says "Show all N" when it truncates; this list
		// used to cut at 24 and say nothing, so a target with 185 manufacturers
		// looked like it had 24
		const shown=rel.slice(0,24);
		html +='<div class="toh-facet-block"><h3>' + f.related.label
			+ (rel.length > shown.length
				? ' <span class="toh-facet-kind">' + shown.length + ' of ' + rel.length + '</span>'
				: '')
			+ '</h3><div class="toh-facet-chips">';
		shown.forEach(([k,n]) => {
			// k is a brand or target from the dataset: escaped in data-value below,
			// so it has to be escaped here too or the visible chip renders markup
			const inner='<span>' + tohAttr(k) + '</span><b>' + n + '</b>';
			html += other
				? '<a href="#" class="toh-facet-chip js-toh-facet" data-type="' + other + '" data-value="' + tohAttr(k) + '">' + inner + '</a>'
				: '<span class="toh-facet-chip">' + inner + '</span>';
		});
		html +='</div></div>';
	}

	// the devices themselves -----------------------------------------------
	html +='<div class="toh-facet-block"><h3>Devices</h3>' + tohFacetDeviceList(rows, type) + '</div>';

	$('#toh-facet-body').html(html);
	$('#toh-facet-panel').removeClass('toh-hidden');
	tohSetPanelHidden('#toh-facet-panel', false);
	$('#toh-main, #toh-hero, #toh-compare-panel').addClass('toh-hidden');
	$('body').removeClass('toh-sidebar-open');
	tohScrollTop();
	tohFacetUrl(push);
}

// Escape a value for use in an HTML attribute -------------------------------
function tohAttr(v){
	// & first so the entities below are not re-escaped. The single quote matters
	// as much as the double: attributes in this codebase are written with either,
	// and a value carrying the other kind would otherwise break out of them.
	return String(v)
		.replace(/&/g,'&amp;')
		.replace(/"/g,'&quot;')
		.replace(/'/g,'&#39;')
		.replace(/</g,'&lt;')
		.replace(/>/g,'&gt;');
}

// Stacked bar of the four support states ------------------------------------
function tohSupportBar(states, total){
	const parts=[
		['supported','On a current release',states.supported],
		['snapshot','Snapshot only',states.snapshot],
		['eol','End of life',states.eol],
		['unknown','Unknown',states.unknown],
	].filter(p => p[2] > 0);

	let bar='<div class="toh-supportbar">';
	parts.forEach(([k,label,n]) => {
		bar +='<span class="toh-supportbar-part is-' + k + '" style="width:' + (100*n/total) + '%" title="' + label + ': ' + n + '"></span>';
	});
	bar +='</div><div class="toh-supportbar-legend">';
	parts.forEach(([k,label,n]) => {
		bar +='<span class="toh-legend is-' + k + '"><i></i>' + label + ' <b>' + n + '</b></span>';
	});
	bar +='</div>';
	return bar;
}

// Compact device table on a facet page --------------------------------------
function tohFacetDeviceList(rows, type){
	// newest first where we can tell, so "latest devices" is at the top
	const sorted=rows.slice().sort((a,b) => {
		const ya=String(a.availability||'').match(/\d{4}/);
		const yb=String(b.availability||'').match(/\d{4}/);
		const na=ya?parseInt(ya[0],10):0, nb=yb?parseInt(yb[0],10):0;
		if(na !== nb){ return nb-na; }
		return String(a.model).localeCompare(String(b.model));
	});

	let html='<table class="toh-facet-table"><thead><tr>'
		+ (type === 'chipset' ? '<th>Brand</th>' : '')
		+ '<th>Model</th><th>Target</th><th>RAM</th><th>Flash</th><th>Release</th><th></th>'
		+ '</tr></thead><tbody>';

	// values like "128NAND" or "microSD" already carry their own unit
	// tohArrayText is the same rule the table cell and the phone card use.
	// The local copy this replaces joined with ", " and dropped the unit
	// entirely on multi-part values - ["16","microSD"] printed "16, microSD"
	// here and "16 MB + microSD" everywhere else, on 994 of 3,029 rows.
	const withMb=(v) => {
		if(v === null || v === undefined || v === '' || v === '-'){ return ''; }
		return tohArrayText(v, 'MB');
	};

	sorted.forEach((d,i) => {
		html +='<tr' + (i >= 25 ? ' class="toh-facet-more-row"' : '') + '>'
			+ (type === 'chipset' ? '<td>' + tohAttr(d.brand||'') + '</td>' : '')
			+ '<td class="toh-facet-model">' + tohAttr(d.model||'') + '</td>'
			+ '<td>' + tohAttr(d.target||'') + '</td>'
			+ '<td>' + tohAttr(withMb(d.rammb)) + '</td>'
			+ '<td>' + tohAttr(withMb(d.flashmb)) + '</td>'
			+ '<td>' + FormatterRelease({getValue:() => d.supportedcurrentrel,
					getRow: () => ({getData: () => d})}) + '</td>'
			+ '<td class="toh-facet-go"><a href="' + tohAttr(_maketHwDataUrl(d.deviceid)) + '" target="_blank" rel="noopener" title="Hardware data page">'
			+ tohIcon('external-link') + '</a></td>'
			+ '</tr>';
	});
	html +='</tbody></table>';

	if(sorted.length > 25){
		html +='<a href="#" class="toh-facet-showall">Show all ' + sorted.length + ' devices</a>';
	}
	return html;
}

function tohCloseFacet(){
	toh_facet_open=null;
	toh_stats_open=false;
	$('#toh-facet-panel').addClass('toh-hidden');
	tohSetPanelHidden('#toh-facet-panel', true);
	$('#toh-main, #toh-hero').removeClass('toh-hidden');
	tohFacetUrl(false);
}

// Keep the address bar in step so a facet page can be linked to ------------
// Filter changes replace the URL - you do not want a history entry per
// checkbox - but opening one of these pages is a navigation, so it pushes.
function tohFacetUrl(push){
	const url=buildBrowserUrl(false);
	if(push){
		history.pushState({}, '', url);
	}
	else{
		history.replaceState({}, '', url);
	}
}

function tohFacetReadUrl(){
	// "stats=0" is a request NOT to open it; a bare truthiness test on the string
	// opened the page anyway
	const wanted=getUrlParameter('stats');
	if(wanted !== '' && wanted !== '0' && wanted !== 'false'){
		return {type:'stats', value:'1'};
	}
	for(const type in toh_facets){
		const v=getUrlParameter(toh_facets[type].param);
		if(v){
			return {type:type, value:v};
		}
	}
	return null;
}

// Back and forward between the table, the statistics and the pages ---------
function tohViewPopState(){
	const want=tohFacetReadUrl();
	if(!want){
		if(toh_facet_open || toh_stats_open){
			tohCloseFacet();
		}
		return;
	}
	if(want.type === 'stats'){
		if(!toh_stats_open){ tohOpenStats(false); }
		return;
	}
	if(!toh_facet_open || toh_facet_open.value !== want.value || toh_facet_open.type !== want.type){
		tohOpenFacet(want.type, want.value, false);
	}
}


// Statistics page ############################################################################################################
// Everything here is a group-by over the loaded data. Nothing is stored and
// nothing is estimated.

function tohStatTop(rows, field, n=6){
	return tohCountBy(rows, field).slice(0, n);
}

// 'go' says what a bar should do when clicked: open one of the pages, or
// filter the table by that column.
function tohStatBars(pairs, total, go){
	if(pairs.length === 0){
		return '<p class="toh-compare-empty">No data.</p>';
	}
	const top=pairs[0][1];
	let html='<div class="toh-statbars">';
	pairs.forEach(([label,n]) => {
		const inner='<span class="toh-statbar-label" title="' + tohAttr(label) + '">' + tohAttr(label) + '</span>'
			+ '<span class="toh-statbar-track"><span class="toh-statbar-fill" style="width:' + (100*n/top) + '%"></span></span>'
			+ '<span class="toh-statbar-value">' + n.toLocaleString('en-US') + '</span>';
		if(go && go.facet){
			html +='<a href="#" class="toh-statbar js-toh-facet" data-type="' + go.facet + '" data-value="' + tohAttr(label) + '">' + inner + '</a>';
		}
		else if(go && go.field){
			html +='<a href="#" class="toh-statbar js-toh-column" data-field="' + go.field + '" data-value="' + tohAttr(label) + '">' + inner + '</a>';
		}
		else {
			html +='<div class="toh-statbar">' + inner + '</div>';
		}
	});
	html +='</div>';
	return html;
}

function tohOpenStats(push=true){
	const rows=tohRows();
	const states={supported:0, snapshot:0, eol:0, unknown:0};
	rows.forEach(r => states[tohSupportState(r)]++);

	const brands=tohCountBy(rows,'brand');
	const targets=tohCountBy(rows,'target');
	const cpus=tohCountBy(rows,'cpu');

	let html='<div class="toh-facet-title">'
		+ '<span class="toh-facet-kind">Database</span>'
		+ '<h2>Statistics</h2>'
		+ '<p class="toh-facet-count">Everything below is counted from the ' + rows.length.toLocaleString('en-US') + ' devices currently loaded.</p>'
		+ '</div>';

	// the same cards as the page header, so the two do not look like different
	// kinds of number
	const cards=[
		['router', '', rows.length, 'Devices'],
		['circle-check', 'is-ok', states.supported, 'On a current release'],
		['layers', '', targets.length, 'Targets'],
		['factory', '', brands.length, 'Manufacturers'],
	];
	html +='<div id="toh-stats" class="toh-stats-inline">';
	cards.forEach(([icon,cls,n,label]) => {
		html +='<div class="toh-stat">'
			+ '<span class="toh-stat-icon ' + cls + '">' + tohIcon(icon) + '</span>'
			+ '<span class="toh-stat-body"><span class="toh-stat-value">' + n.toLocaleString('en-US') + '</span>'
			+ '<span class="toh-stat-label">' + label + '</span></span>'
			+ '</div>';
	});
	html +='</div>';

	html +='<div class="toh-facet-block"><h3>Support status</h3>' + tohSupportBar(states, rows.length) + '</div>';

	html +='<div class="toh-stats-grid">';
	html +='<div class="toh-facet-block"><h3>Most common chipsets</h3>' + tohStatBars(tohStatTop(rows,'cpu',8), rows.length, {facet:'chipset'}) + '</div>';
	html +='<div class="toh-facet-block"><h3>Largest manufacturers</h3>' + tohStatBars(tohStatTop(rows,'brand',8), rows.length, {facet:'brand'}) + '</div>';
	html +='<div class="toh-facet-block"><h3>Most common targets</h3>' + tohStatBars(tohStatTop(rows,'target',8), rows.length, {facet:'target'}) + '</div>';
	html +='<div class="toh-facet-block"><h3>RAM</h3>' + tohStatBars(tohStatTop(rows,'rammb',8), rows.length, {field:'rammb'}) + '</div>';
	// the raw grouping key reads "128NAND"; tohArrayText spells it the way every
	// other surface does ("128 MB NAND")
	const flashTop=tohStatTop(rows,'flashmb',8).map(([label,n]) => [tohArrayText(label,'MB'), n]);
	html +='<div class="toh-facet-block"><h3>Flash</h3>' + tohStatBars(flashTop, rows.length, {field:'flashmb'}) + '</div>';
	html +='<div class="toh-facet-block"><h3>Device types</h3>' + tohStatBars(tohStatTop(rows,'devicetype',8), rows.length, {field:'devicetype'}) + '</div>';
	html +='</div>';

	$('#toh-facet-body').html(html);
	toh_facet_open=null;
	toh_stats_open=true;
	$('#toh-facet-panel').removeClass('toh-hidden');
	tohSetPanelHidden('#toh-facet-panel', false);
	$('#toh-main, #toh-hero, #toh-compare-panel, #toh-adv-panel').addClass('toh-hidden');
	tohScrollTop();
	// tohOpenFacet() calls this unconditionally; statistics only did so on a
	// push, which left a restored ?stats=1 depending on an unrelated Tabulator
	// handler happening to rewrite the URL a moment later.
	tohFacetUrl(push);
}
