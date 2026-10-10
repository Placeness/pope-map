const $ = selector => document.querySelector(selector);
const h = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const state = {data:null,people:new Map(),eras:new Map(),map:null,panel:null,selectedIndex:null,group:null,fromList:false,listScroll:0,query:'',tourActive:false,tourVisited:false,tourIndex:0,timelineBuilt:false};
const panel = $('#content-panel'), stage = $('#main-content'), status = $('#app-status');
const mobileQuery = matchMedia('(max-width:760px)');
const mobile = () => mobileQuery.matches;
const currentPeriod = () => state.selectedIndex === null ? null : state.data.pontificates[state.selectedIndex];
const currentPerson = () => state.people.get(currentPeriod()?.personId);
const eraFor = person => state.eras.get(person?.eraId) || {};
const dot = person => `<span class="era-dot" style="--era:${h(eraFor(person).color || '#E8B04B')}" aria-hidden="true"></span>`;
const placeText = person => {
  const place = person.birthplace || {};
  if (place.precision === 'unknown') return 'Birthplace unknown';
  const country = place.country && !String(place.label).includes(place.country) ? `, ${place.country}` : '';
  const approximate = place.precision === 'region' && !/approximate/i.test(place.label) ? ' (approximate region)' : '';
  return `${place.label || 'Birthplace unknown'}${country}${approximate}`;
};
const paragraphs = text => String(text || '').split(/\n\s*\n/).filter(Boolean).map(part => `<p>${h(part)}</p>`).join('');
const safeHref = value => /^(https?:\/\/|\.\/|assets\/)/.test(String(value || '')) ? h(value) : '#';
function announce(message) {status.textContent = message;status.hidden = !message;}
function panelTop(action='map',label='Back to map') {
  return `<div class="panel-top"><button type="button" class="panel-back" data-action="${action}"><span aria-hidden="true">←</span> ${label}</button><button type="button" class="icon-button" data-action="close-panel" aria-label="Close panel and return to map" title="Back to map">×</button></div>`;
}
function renderShell() {
  const isOpen = Boolean(state.panel);
  stage.classList.toggle('has-panel',isOpen);stage.classList.toggle('is-touring',state.tourActive);
  panel.hidden = !isOpen;$('#welcome-card').hidden = isOpen || state.selectedIndex !== null;
  synchronizeMapAccessibility();
  document.querySelectorAll('.primary-nav .nav-button').forEach(button => {
    const active = button.dataset.action === (state.panel === 'list' ? 'list' : state.panel === 'overview' ? 'overview' : 'map');
    button.classList.toggle('is-active',active);button.setAttribute('aria-current',active ? 'page' : 'false');
  });
  $('.header-tour').innerHTML = `<span aria-hidden="true">→</span> ${state.tourVisited ? 'Continue tour' : 'Take the pope tour'}`;
  state.map?.setPanelOpen(isOpen);renderSelectionCard();renderTour();
}
function synchronizeMapAccessibility() {
  const covered = Boolean(state.panel) && mobile();
  const map = $('#map'), toolbar = $('.map-toolbar');
  const moveFocus = covered && (map.contains(document.activeElement) || toolbar.contains(document.activeElement));
  map.inert = covered;
  toolbar.inert = covered;
  if (moveFocus) panel.querySelector('.panel-back')?.focus({preventScroll:true});
}
function synchronizeProfileNavigation() {
  if (state.panel !== 'profile') return;
  const previousScroll = panel.scrollTop;
  const back = panel.querySelector('.panel-top .panel-back');
  const desktopList = state.fromList && !mobile();
  if (back) {
    back.dataset.action = desktopList ? 'back-list' : 'map';
    back.innerHTML = `<span aria-hidden="true">←</span> ${desktopList ? 'Back to list' : 'Back to map'}`;
  }
  let secondary = panel.querySelector('.mobile-back-list');
  const showSecondary = state.fromList && mobile();
  if (showSecondary && !secondary) {
    secondary = document.createElement('button');
    secondary.type = 'button';
    secondary.className = 'text-button mobile-back-list';
    secondary.dataset.action = 'back-list';
    secondary.textContent = '← Back to list';
    panel.querySelector('.panel-body')?.prepend(secondary);
  }
  if (secondary) {
    const moveFocus = !showSecondary && secondary.contains(document.activeElement);
    secondary.hidden = !showSecondary;
    if (moveFocus) back?.focus({preventScroll:true});
  }
  panel.scrollTop = previousScroll;
}
mobileQuery.addEventListener('change',() => {
  synchronizeProfileNavigation();
  synchronizeMapAccessibility();
});
function focusHeading() {requestAnimationFrame(() => panel.querySelector('h2')?.focus({preventScroll:true}));}
function saveListScroll() {if (state.panel === 'list') state.listScroll = panel.scrollTop;}
function showList({restore=false}={}) {
  saveListScroll();state.panel='list';state.fromList=true;panel.setAttribute('aria-label','List of popes');
  panel.innerHTML = `${panelTop()}<div class="panel-body"><div class="panel-title-row"><h2 tabindex="-1">List of popes</h2><span class="count-pill">${state.data.pontificates.length} pontificates</span></div><div class="drawn-rule" aria-hidden="true"></div><p class="panel-intro">From St Peter to Leo XIV, in the official Vatican order.</p><div class="search-wrap"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10" cy="10" r="6"></circle><path d="m15 15 5 5"></path></svg><input id="pope-search" class="search-input" type="search" placeholder="Search a name or birthplace" aria-label="Search popes by name or birthplace" value="${h(state.query)}"></div><ol id="list-entries" class="pope-list"></ol><p id="list-empty" class="empty-state" hidden>No popes match this search.</p></div>`;
  renderListEntries();renderShell();panel.scrollTop=restore ? state.listScroll : 0;if (!restore) focusHeading();
}
function renderListEntries() {
  const query=state.query.trim().toLocaleLowerCase();
  const rows=state.data.pontificates.map((period,index)=>({period,index,person:state.people.get(period.personId)})).filter(({person,period})=>!query || `${person.name} ${(person.alternateNames||[]).join(' ')} ${placeText(person)} ${period.dates}`.toLocaleLowerCase().includes(query));
  $('#list-entries').innerHTML=rows.map(({period,index,person})=>`<li><button type="button" class="pope-row${state.selectedIndex===index?' is-selected':''}" data-action="select-period" data-index="${index}" ${state.selectedIndex===index?'aria-current="true"':''}><span class="pope-row-number">${period.order}</span><span class="pope-row-main">${dot(person)}<span><span class="pope-row-name">${h(person.name)}</span><span class="pope-row-place">${h(placeText(person))}</span></span></span><span class="pope-row-dates">${h(period.dates)}</span></button></li>`).join('');
  $('#list-empty').hidden=rows.length!==0;
}
function renderGroupChooser(person) {
  if (!state.group || state.group.peopleIds.length<2) return '';
  const people=state.group.peopleIds.map(id=>state.people.get(id)).filter(Boolean).sort((a,b)=>a.firstOrder-b.firstOrder);
  const index=people.findIndex(item=>item.id===person.id);if(index<0)return '';
  const label=state.group.regional?`Approximate origin region · ${state.group.label}`:state.group.kind==='shared'?`Shared birthplace · ${state.group.label}`:state.group.label==='Popes in this area'?'Popes in this area · nearby birthplaces':`Popes in this area · ${state.group.label}`;
  return `<section class="group-chooser" aria-label="Location chooser"><p class="group-label">${h(label)}</p><div class="group-navigation">${dot(person)}<span class="group-current">${h(person.name)}</span><span class="group-count">${index+1}/${people.length}</span><button type="button" class="group-arrow" data-action="group-previous" aria-label="Previous pope in this location" ${index===0?'disabled':''}>‹</button><button type="button" class="group-arrow" data-action="group-next" aria-label="Next pope in this location" ${index===people.length-1?'disabled':''}>›</button></div><details class="group-menu"><summary>Choose from all ${people.length} popes</summary><div class="group-people">${people.map(item=>`<button type="button" class="group-person${item.id===person.id?' is-selected':''}" data-action="group-select" data-person="${h(item.id)}">${dot(item)}<span>${h(item.name)}<span>${h(placeText(item))}</span></span></button>`).join('')}</div></details></section>`;
}
function expandable(label,content){return content?`<details class="expandable"><summary>${h(label)}</summary>${content}</details>`:'';}
function renderProfile() {
  const period=currentPeriod(),person=currentPerson();if(!person)return;
  const era=eraFor(person),periods=state.data.pontificates.map((item,index)=>({...item,index})).filter(item=>item.personId===person.id);
  const statusLabel=['saint','blessed'].includes(person.saintStatus?.status)?`<span class="saint-badge">${h(person.saintStatus.label || (person.saintStatus.status==='saint'?'Saint':'Blessed'))}</span>`:'';
  const birth=person.birthplace||{},locationNote=birth.precision==='unknown'?'His birthplace is unknown. The map keeps its current view.':birth.uncertainty||'';
  const portrait=person.portrait?.src?`<img class="profile-portrait" src="${safeHref(person.portrait.src)}" alt="${h(person.portrait.alt||person.name)}">${person.portrait.credit?`<p class="portrait-credit">${h(person.portrait.credit)}</p>`:''}`:'';
  const repeatPeriods=periods.length>1?`<section class="profile-periods" aria-label="Pontificate periods"><span class="profile-periods-title">One pope, ${periods.length} pontificate entries</span>${periods.map(item=>`<button type="button" class="period-button${item.index===state.selectedIndex?' is-active':''}" data-action="select-period" data-index="${item.index}"><span>Vatican sequence ${item.order} · ${h(item.dates)}</span>${item.index===state.selectedIndex?'<span class="active-label">Active period</span>':''}</button>`).join('')}</section>`:'';
  const claimants=(period.antipopeIds||[]).map(id=>state.data.antipopes.find(item=>item.id===id)).filter(Boolean);
  const antipopeContent=claimants.length?`<img class="expanded-art" src="./assets/artwork/antipopes.webp" alt="Illustration of two competing papal chairs"><p>An antipope is a claimant to the papal office who is not recognized in the official sequence. Disputes could involve rival elections, political powers, and competing claims to authority.</p>${claimants.map(claimant=>{const relationship=(claimant.relationships||[]).find(item=>item.pontificateId===period.id);return `<div class="antipope-record"><h4>${h(claimant.name)}</h4><p class="antipope-dates">${h(claimant.claimDates)}</p>${paragraphs(claimant.summary)}${relationship?.note&&String(relationship.note).trim()!==String(claimant.summary||'').trim()?paragraphs(relationship.note):''}${claimant.biography&&claimant.biography!==claimant.summary?paragraphs(claimant.biography):''}</div>`;}).join('')}`:'';
  const biography=person.biography&&person.biography!==person.summary?paragraphs(person.biography):'';
  const actions=person.actions?.length?`<ul>${person.actions.map(action=>`<li>${h(typeof action==='string'?action:action.text)}</li>`).join('')}</ul>`:'';
  const context=person.context?`<img class="expanded-art" src="./assets/artwork/st-peters-square.webp" alt="Hand-drawn illustration of St Peter’s Square">${paragraphs(person.context)}`:'';
  const dateLabel=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''))?new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}):value;
  const recognitionDates=[];
  if(person.saintStatus?.recognitionDate)recognitionDates.push(`${person.saintStatus.status==='saint'?'Canonized':'Beatified'}: ${dateLabel(person.saintStatus.recognitionDate)}.`);
  if(person.saintStatus?.beatificationDate&&person.saintStatus.beatificationDate!==person.saintStatus.recognitionDate)recognitionDates.push(`Beatified: ${dateLabel(person.saintStatus.beatificationDate)}.`);
  const recognition=['saint','blessed'].includes(person.saintStatus?.status)?paragraphs(person.saintStatus.recognition)+(recognitionDates.length?`<p>${recognitionDates.map(h).join('<br>')}</p>`:''):'';
  const backToList=state.fromList&&!mobile();panel.setAttribute('aria-label',`${person.name} profile`);
  panel.innerHTML=`${panelTop(backToList?'back-list':'map',backToList?'Back to list':'Back to map')}<article class="panel-body">${state.fromList&&mobile()?'<button type="button" class="text-button mobile-back-list" data-action="back-list">← Back to list</button>':''}${renderGroupChooser(person)}<div class="profile-era">${dot(person)}${h(era.label||'')}</div><div class="profile-heading"><h2 tabindex="-1">${h(person.name)}</h2>${statusLabel}</div><div class="drawn-rule" aria-hidden="true"></div><p class="profile-dates">${h(period.dates)}${periods.length>1?` <span class="active-label">· Active period ${period.order}</span>`:''}</p>${portrait}<div class="profile-facts"><div><span class="fact-label">Birthplace</span><span class="fact-value">${h(placeText(person))}</span>${birth.historicalName?`<span class="fact-historical">${h(birth.historicalName)}</span>`:''}</div><div><span class="fact-label">Born</span><span class="fact-value">${h(person.birthDate?.label||'Unknown')}</span></div></div>${locationNote?`<p class="location-note">${h(locationNote)}</p>`:''}<p class="profile-summary">${h(person.summary||'')}</p>${repeatPeriods}${expandable('His life and papacy',biography)}${expandable('Actions and teachings',actions)}${expandable('The world around his papacy',context)}${expandable(claimants.length===1?'A disputed papal claim':'Disputed papal claims',antipopeContent)}${expandable('Recognition in the Church',recognition)}</article>`;
}
function selectPeriod(index,{group=null,fromList=false,focus=true,move=true}={}) {
  index=Number(index);if(!Number.isInteger(index)||index<0||index>=state.data.pontificates.length)return;
  saveListScroll();state.selectedIndex=index;if(state.tourActive)state.tourIndex=index;state.group=group;state.fromList=fromList;state.panel='profile';
  renderProfile();state.map?.select(currentPerson().id,{panelOpen:true,move});renderShell();panel.scrollTop=0;if(focus)focusHeading();
}
function selectPerson(id,{group=null,focus=true}={}) {
  const index=currentPerson()?.id===id?state.selectedIndex:state.data.pontificates.findIndex(period=>period.personId===id);selectPeriod(index,{group,focus});
}
function selectGroup(group) {
  const peopleIds=[...new Set(group.peopleIds)].filter(id=>state.people.has(id)).sort((a,b)=>state.people.get(a).firstOrder-state.people.get(b).firstOrder);
  if(peopleIds.length)selectPerson(peopleIds[0],{group:{...group,peopleIds}});
}
function moveWithinGroup(direction){if(!state.group)return;const index=state.group.peopleIds.indexOf(currentPerson()?.id),id=state.group.peopleIds[index+direction];if(id){selectPerson(id,{group:state.group,focus:false});requestAnimationFrame(()=>panel.querySelector(`[data-action="${direction<0?'group-previous':'group-next'}"]:not(:disabled)`)?.focus({preventScroll:true}));}}
function showMap(){saveListScroll();state.panel=null;renderShell();$('#map').focus({preventScroll:true});}
function showOverview() {
  saveListScroll();state.panel='overview';const overview=state.data.overview;panel.setAttribute('aria-label','What is a pope?');
  panel.innerHTML=`${panelTop()}<article class="panel-body"><div class="overview-top"><div><h2 tabindex="-1">What is a pope?</h2><div class="drawn-rule" aria-hidden="true"></div></div><img class="overview-chair" src="./assets/artwork/chair-of-peter.webp" alt="The Chair of St Peter, illustrated with crossed keys"></div><p class="overview-introduction">${h(overview.introduction)}</p>${expandable('How is a pope chosen?',`<img class="expanded-art" src="./assets/artwork/white-smoke.webp" alt="White smoke over the Sistine Chapel after a papal election">${paragraphs(overview.succession)}`)}${expandable('Why are some popes saints?',`<img class="expanded-art" src="./assets/artwork/st-gregory.webp" alt="Hand-drawn illustration of Saint Gregory the Great">${paragraphs(overview.saints)}${paragraphs(overview.canonization)}`)}<p class="overview-small-note">The map follows the official Vatican sequence. Its five historical eras are broad groupings for this journey, with each pope assigned to one period.</p><button class="button button-gold overview-tour" type="button" data-action="restart-tour">Begin with St Peter <span aria-hidden="true">→</span></button></article>`;
  renderShell();panel.scrollTop=0;focusHeading();
}
function renderSelectionCard() {
  const card=$('#selection-card'),person=currentPerson();card.hidden=!person||Boolean(state.panel);if(!person)return;
  card.innerHTML=`<span class="selection-card-label">Your place in the story</span><button type="button" data-action="open-selected">${dot(person)} ${h(person.name)} <span aria-hidden="true">→</span></button><span class="selection-card-place">${h(placeText(person))}</span>${state.tourVisited&&!state.tourActive?'<div class="selection-card-continue"><button type="button" data-action="continue-tour">Continue tour →</button><button type="button" data-action="restart-tour">Restart tour ↺</button></div>':''}`;
}
function startTour(restart=false){const index=restart||!state.tourVisited?0:state.tourIndex;state.tourActive=true;state.tourVisited=true;selectPeriod(index);}
function renderTour() {
  const rail=$('#tour-rail');rail.hidden=!state.tourActive;if(!state.tourActive)return;
  if(!state.timelineBuilt) {
    rail.innerHTML=`<div class="timeline-hover-preview" id="timeline-hover-preview" hidden></div><div class="tour-controls"><div class="tour-progress"><strong>Vatican sequence</strong><span class="tour-counter" id="tour-counter"></span></div><div class="tour-buttons"><button type="button" class="tour-nav" data-action="tour-previous" id="tour-previous">← Previous</button><select class="tour-mobile-select" id="tour-jump" aria-label="Jump to a pontificate">${state.data.pontificates.map((period,index)=>`<option value="${index}">${period.order}. ${h(state.people.get(period.personId).name)} · ${h(period.dates)}</option>`).join('')}</select><button type="button" class="tour-nav tour-next" data-action="tour-next" id="tour-next">Next →</button><button type="button" class="tour-exit" data-action="exit-tour">Exit tour</button></div></div><div class="timeline-scroll" id="timeline-scroll">${state.data.eras.map(era=>`<section class="timeline-era" style="--era:${h(era.color)}" aria-label="${h(era.label)}"><span class="timeline-era-label">${h(era.label)}</span><div class="timeline-stops">${state.data.pontificates.map((period,index)=>({period,index,person:state.people.get(period.personId)})).filter(item=>item.person.eraId===era.id).map(({period,index,person})=>`<button type="button" class="timeline-stop" data-action="timeline-select" data-index="${index}" aria-label="${period.order}. ${h(person.name)}, ${h(period.dates)}" title="${h(person.name)} · ${h(period.dates)}"></button>`).join('')}</div></section>`).join('')}</div>`;
    state.timelineBuilt=true;
  }
  const selected=state.data.pontificates[state.tourIndex];$('#tour-counter').textContent=`${selected.order} of ${state.data.pontificates.length} · ${state.people.get(selected.personId).name}`;
  $('#tour-previous').disabled=state.tourIndex===0;$('#tour-next').disabled=state.tourIndex===state.data.pontificates.length-1;$('#tour-jump').value=String(state.tourIndex);
  rail.querySelectorAll('.timeline-stop').forEach(button=>{const active=Number(button.dataset.index)===state.tourIndex;button.classList.toggle('is-selected',active);button.setAttribute('aria-current',active?'step':'false');});
  requestAnimationFrame(()=>{const stop=rail.querySelector('.timeline-stop.is-selected'),scroller=$('#timeline-scroll');if(!stop)return;const left=stop.getBoundingClientRect().left-scroller.getBoundingClientRect().left+scroller.scrollLeft;if(left<scroller.scrollLeft+20||left>scroller.scrollLeft+scroller.clientWidth-30)scroller.scrollTo({left:Math.max(0,left-scroller.clientWidth/2),behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});});
}
function previewTimeline(button) {
  const preview=$('#timeline-hover-preview');if(!preview||!button||mobile())return;
  const period=state.data.pontificates[Number(button.dataset.index)];if(!period)return;
  preview.innerHTML=`<strong>${h(state.people.get(period.personId).name)}</strong><span>${h(period.dates)}</span>`;
  const rail=$('#tour-rail'),position=button.getBoundingClientRect().left-rail.getBoundingClientRect().left;preview.style.left=`${Math.max(12,Math.min(position-60,rail.clientWidth-210))}px`;preview.hidden=false;
}
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button)return;const action=button.dataset.action;
  if(action==='resources'){$('#resources-dialog').showModal();return;}if(action==='close-resources'){$('#resources-dialog').close();return;}if(!state.data)return;
  switch(action){
    case'map':case'close-panel':showMap();break;
    case'list':showList();break;
    case'back-list':showList({restore:true});break;
    case'overview':showOverview();break;
    case'select-period':selectPeriod(button.dataset.index,{fromList:state.panel==='list'||state.fromList,group:state.panel==='profile'?state.group:null});break;
    case'open-selected':selectPeriod(state.selectedIndex,{group:state.group});break;
    case'group-select':selectPerson(button.dataset.person,{group:state.group});break;
    case'group-previous':moveWithinGroup(-1);break;
    case'group-next':moveWithinGroup(1);break;
    case'tour':case'continue-tour':startTour();break;
    case'restart-tour':startTour(true);break;
    case'tour-previous':selectPeriod(state.tourIndex-1,{focus:false});break;
    case'tour-next':selectPeriod(state.tourIndex+1,{focus:false});break;
    case'timeline-select':selectPeriod(button.dataset.index,{focus:false});break;
    case'exit-tour':state.tourActive=false;showMap();break;
    case'reset-map':state.map?.reset();break;
    case'world-map':state.map?.reset('world');break;
    case'zoom-in':state.map?.zoomBy(1.35);break;
    case'zoom-out':state.map?.zoomBy(1/1.35);break;
  }
});
document.addEventListener('input',event=>{if(event.target.id==='pope-search'){state.query=event.target.value;renderListEntries();}});
document.addEventListener('change',event=>{if(event.target.id==='tour-jump')selectPeriod(event.target.value,{focus:false});});
document.addEventListener('pointerover',event=>{const button=event.target.closest('.timeline-stop');if(button)previewTimeline(button);});
document.addEventListener('focusin',event=>{const button=event.target.closest('.timeline-stop');if(button)previewTimeline(button);});
document.addEventListener('pointerout',event=>{if(event.target.closest('.timeline-stop')&&!event.relatedTarget?.closest('.timeline-stop')){const preview=$('#timeline-hover-preview');if(preview)preview.hidden=true;}});
document.addEventListener('focusout',event=>{if(event.target.closest('.timeline-stop')){const preview=$('#timeline-hover-preview');if(preview)preview.hidden=true;}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('#resources-dialog').open&&state.panel)showMap();});
$('#resources-dialog').addEventListener('click',event=>{if(event.target===$('#resources-dialog')){const bounds=event.target.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)event.target.close();}});
async function initialize(){
  try{
    const response=await fetch('./data/popes.json');if(!response.ok)throw new Error('The papal records could not be loaded.');state.data=await response.json();
    state.data.pontificates.sort((a,b)=>a.order-b.order);state.people=new Map(state.data.people.map(person=>[person.id,person]));state.eras=new Map(state.data.eras.map(era=>[era.id,era]));
    $('#legend-items').innerHTML=state.data.eras.map(era=>`<span class="legend-item"><span class="era-dot" style="--era:${h(era.color)}" aria-hidden="true"></span>${h(era.label)}</span>`).join('');
    $('#resource-links').innerHTML=state.data.resources.map(resource=>`<a class="resource-link" href="${safeHref(resource.url)}" target="_blank" rel="noopener noreferrer"><strong>${h(resource.label)} <span aria-hidden="true">→</span></strong><small>${h(resource.description)}</small></a>`).join('');
    try{const{createMap}=await import('./map.js');state.map=createMap($('#map'),{people:state.data.people,eras:state.data.eras,onSelectGroup:selectGroup,onSelectPerson:selectPerson});announce('');}
    catch(error){$('#map').innerHTML='<div class="map-fallback"><h2>The map is unavailable</h2><p>You can explore every pope through the list and manual tour.</p><button type="button" class="button button-gold" data-action="list">Open the list of popes →</button></div>';announce('Map unavailable. The list, profiles, and tour remain available.');console.error(error);}
    renderShell();
  }catch(error){announce('The papal records could not be loaded. Please refresh to try again.');$('#welcome-card').innerHTML='<h1>A place in history.</h1><p>The papal records could not be loaded. Please refresh this page, or browse the official roster.</p><a href="https://www.vatican.va/content/vatican/en/holy-father.html">Visit the Vatican roster →</a>';console.error(error);}
}
initialize();
