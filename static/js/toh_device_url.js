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
// toh_device_url.js
//
//	Gives the open device a URL: ?device=<deviceid>.
//
//	This does not turn the popup into a page - it makes the popup addressable,
//	which is the part people actually wanted: a link you can send, a Back button
//	that closes it, and a reload that puts you back where you were.

let toh_device_open=null;			// deviceid whose popup is showing
let toh_device_pending=null;		// read from the URL before the table exists
let toh_device_restoring=false;		// suppresses the history push while we replay a URL


// Find a device's row, wherever it is -----------------------------------------
// It may be filtered out or on another page, so this clears what is in the way
// rather than silently doing nothing.
function tohFindDeviceRow(id){
	// "active" matters: getRows() with no argument hands back rows the filter
	// has hidden too, and clicking a row that was never rendered does nothing
	const shown=tabuTable.getRows('active').filter(r => r.getData().deviceid === id);
	if(shown.length){
		return shown[0];
	}
	if(!tohRowById(id)){
		return null;				// not in the data at all
	}
	return 'filtered';
}

// Open a device by id --------------------------------------------------------
function tohOpenDevice(id, push=true){
	if(!id || !tabuTable){
		return false;
	}
	// The phone sheet renders from the row data, so it does not need the row on
	// screen - and clearing someone's filters to show a device they can already
	// see would be pure loss. Only the desktop popup needs a rendered cell.
	if(tohCardsActive()){
		const data=tohRowById(id);
		if(!data){
			myLogStr('Device not found: ' + id, 1);
			return false;
		}
		toh_device_restoring=!push;
		tohSheetOpen(id);
		toh_device_restoring=false;
		return true;
	}

	let row=tohFindDeviceRow(id);

	if(row === 'filtered'){
		// The link has to win over whatever filter is set, or a shared URL opens
		// nothing. But this throws away work the visitor did, so it cannot happen
		// in silence: say what was dropped and leave it on screen to undo.
		// Everything that was narrowing the table, not just the rail. The header
		// search is cleared by clearHeaderFilter() below and is exactly the kind
		// of work a visitor notices losing, so it has to be counted here too.
		let dropped=getCheckedFeatures().length + (toh_extra_filters ? toh_extra_filters.length : 0);
		$('#toh-table .tabulator-header-filter INPUT').each(function(){
			if(String($(this).val() || '').trim() !== ''){
				dropped++;
			}
		});
		checkAllFeatures(false);
		setPresetSelectedClass('features','custom');
		tohResetThresholds();
		tabuTable.clearFilter();
		tabuTable.clearHeaderFilter();
		updateFilterGroupState();
		row=tohFindDeviceRow(id);
		if(row && row !== 'filtered' && dropped > 0){
			tohAnnounceFiltersCleared(dropped);
		}
	}
	if(!row || row === 'filtered'){
		myLogStr('Device not found: ' + id, 1);
		return false;
	}

	toh_device_restoring=!push;
	{
		// The row is somewhere in 3,000, not necessarily on the page being shown -
		// the table paginates at 30, so a shared link only ever opened a device
		// that happened to be in the first thirty. Move to its page, let the
		// scroll settle, and only then look the cell up: both steps re-render
		// rows, so an element taken beforehand is one the virtual DOM has since
		// recycled and clicking it does nothing.
		Promise.resolve(tabuTable.setPageToRow(row))
			.catch(() => {})
			.then(() => tabuTable.scrollToRow(row, 'center', false).catch(() => {}))
			// Changing the page schedules a render rather than performing one, so
			// the cell can still be detached when the promises settle. Wait for the
			// element to actually exist rather than guessing at a delay.
			.then(() => new Promise(done => {
				let frames=0;
				(function wait(){
					const cell=row.getCell('model');
					const el=cell ? cell.getElement() : null;
					if(el && el.isConnected){
						done(el);
					}
					else if(++frames > 60){
						done(null);				// about a second; give up quietly
					}
					else{
						requestAnimationFrame(wait);
					}
				})();
			}))
			.then(el => {
				// Tabulator owns the popup and its placement, so ask for it the
				// way a visitor would rather than rebuilding it here. A bare
				// el.click() carries no coordinates and the popup is positioned
				// against the pointer, so aim the event at the cell.
				if(el){
					const box=el.getBoundingClientRect();
					el.dispatchEvent(new MouseEvent('click', {
						bubbles: true,
						cancelable: true,
						view: window,
						clientX: box.left + box.width / 2,
						clientY: box.top + box.height / 2,
					}));
				}
				else{
					myLogStr('Could not reach the row for: ' + id, 1);
				}
				toh_device_restoring=false;
			});
	}
	return true;
}

// Say that a filter set was thrown away to reach this device ----------------
// Nothing else on the page would show it: the rail simply goes blank, and a
// visitor who spent a minute narrowing 3,000 devices deserves to know why.
function tohAnnounceFiltersCleared(n){
	const msg=n + (n === 1 ? ' filter was' : ' filters were')
		+ ' cleared so this device could be shown.';
	$('#toh-fav-status').text(msg);
	myLogStr(msg, 2);
	clearTimeout(tohAnnounceFiltersCleared._t);
	tohAnnounceFiltersCleared._t=setTimeout(function(){
		$('#toh-fav-status').text('');
	}, 8000);
}

// Called when a popup opens or closes ----------------------------------------
// buildBrowserUrl() composes the whole query from state and replaces it, so
// hand-editing location.href here would only survive until the next filter
// change rewrote it. It knows about `device` now; this just picks push vs
// replace, the same shape tohFacetUrl() has.
function tohDeviceUrlSet(id){
	const was=toh_device_open;
	toh_device_open=id || null;
	if(toh_device_restoring || was === toh_device_open){
		return;
	}
	history.pushState({device: toh_device_open}, '', buildBrowserUrl(false));
}

function tohDeviceReadUrl(){
	const id=getUrlParameter('device');
	if(id){
		toh_device_pending=id;
		myLogStr('Device from URL: ' + id, 2);
	}
}

function tohDeviceApply(){
	if(!toh_device_pending){
		return;
	}
	const id=toh_device_pending;
	toh_device_pending=null;
	tohOpenDevice(id, false);
}

// Back and forward -----------------------------------------------------------
function tohDevicePopState(){
	const id=getUrlParameter('device');
	if(id === toh_device_open){
		return;
	}
	if(id){
		tohOpenDevice(id, false);
	}
	else if(toh_device_open){
		tohCloseDevice();
	}
}

// Close whichever of the two renderers is showing the device ------------------
// The phone sheet renders its own copy of the details markup, and its close
// button is display:none down there - so triggering a click on it left Back
// stripping the URL while the sheet stayed open, which reads as the site
// eating the universal dismiss gesture.
function tohCloseDevice(){
	if(tohCardsActive() && !$('#toh-sheet').hasClass('toh-hidden')){
		toh_device_restoring=true;		// tohSheetClose() would push a second entry
		tohSheetClose();
		toh_device_restoring=false;
		toh_device_open=null;
	}
	else{
		$('.toh-details-close').trigger('click');
	}
}
