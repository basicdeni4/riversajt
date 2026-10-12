import {DEADLINE,SEASON_END,sarajevoToday,daysBetween,defaultVisit,createPlan,prettyDate,weekday,emailHref,calendarFile} from './planner.js';
const $=id=>document.getElementById(id);
const content={
  sales:{kicker:'ODABIR ZIMSKOG SETA',title:'Dobra priprema počinje pravom gumom.',copy:'Trebate nove zimske gume? Krenite od dimenzije koju propisuje proizvođač vašeg vozila, a s Riverom provjerite ponudu i dostupnost prije dolaska.',list:['Dimenziju gume, npr. 205/55 R16','Marku i model vozila','Pitanje o cijeni i dostupnom setu'],cta:'Dodaj prodaju u moj plan',label:'ŠTA PRIPREMITI'},
  fitting:{kicker:'SEZONSKA ZAMJENA',title:'Vaš zimski set. Spreman za cestu.',copy:'Već imate zimske gume? Dogovorite dolazak za sezonsku zamjenu. Prije dolaska provjerite stanje seta i s Riverom potvrdite šta je potrebno za ugradnju.',list:['Vlastiti set zimskih guma','Informaciju jesu li gume na felgama','Dogovor o ugradnji i balansiranju'],cta:'Dodaj ugradnju u moj plan',label:'ZA JEDNOSTAVNIJI DOLAZAK'},
  hotel:{kicker:'HOTEL ZA LJETNE GUME',title:'Ljetni set odmara do svoje sezone.',copy:'Nakon sezonske zamjene dogovorite čuvanje ljetnih guma u Riverovom hotelu za gume. Prije dolaska provjerite raspoloživost, cijenu i uslove za vaš set.',list:['Broj i dimenzije guma za čuvanje','Informaciju jesu li gume na felgama','Dogovor o cijeni i periodu čuvanja'],cta:'Dodaj hotel u moj plan',label:'ŠTA PITATI RIVER'}
};
let activeService='sales',plan=null;
const tabs=[...document.querySelectorAll('[data-service]')];
function selectService(key){
  activeService=key;
  tabs.forEach(tab=>{const selected=tab.dataset.service===key;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});
  $('service-panel').setAttribute('aria-labelledby',`tab-${key}`);
  const c=content[key];
  $('service-kicker').textContent=c.kicker;$('service-title').textContent=c.title;$('service-copy').textContent=c.copy;$('service-aside-label').textContent=c.label;
  $('service-plan').replaceChildren(document.createTextNode(c.cta+' '));const arrow=document.createElement('span');arrow.setAttribute('aria-hidden','true');arrow.textContent='↗';$('service-plan').append(arrow);
  $('service-list').replaceChildren(...c.list.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
}
tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>selectService(tab.dataset.service));
  tab.addEventListener('keydown',event=>{let i;if(event.key==='ArrowRight')i=(index+1)%tabs.length;else if(event.key==='ArrowLeft')i=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')i=0;else if(event.key==='End')i=tabs.length-1;else return;event.preventDefault();selectService(tabs[i].dataset.service);tabs[i].focus();});
});
function updateCountdown(){const today=sarajevoToday();const left=daysBetween(today,DEADLINE);$('countdown').textContent=left>0?`Do 1. novembra: ${left} ${left===1?'dan':'dana'}`:today<=SEASON_END?'Zimska sezona je u toku':'Sezona 2026/27 je završena';return today;}
const dateInput=$('visit-date');
let today=updateCountdown();dateInput.min=today;dateInput.max=SEASON_END;dateInput.value=defaultVisit(today);
function renderPlan(){
  today=updateCountdown();dateInput.min=today;
  const candidate=createPlan({date:dateInput.value,today,tires:document.querySelector('input[name="tires"]:checked').value,hotel:$('hotel').checked,flexible:$('flexible').checked});
  $('date-error').hidden=!candidate.error;dateInput.setAttribute('aria-invalid',candidate.error?'true':'false');
  if(candidate.error){$('date-error').textContent=candidate.error;$('plan-result').hidden=true;plan=null;return false;}
  $('plan-result').hidden=false;plan=candidate;$('save-status').textContent='';
  $('result-status').textContent={early:'RANIJA PRIPREMA',mid:'JOŠ IMA VREMENA',late:'BLIZU ROKA',season:'ZIMSKA SEZONA'}[plan.band];$('result-status').dataset.level=plan.band;
  $('result-date').textContent=prettyDate(plan.date);
  const lead=plan.lead>0?`${plan.lead} ${plan.lead===1?'dan':'dana'} prije roka`:plan.lead===0?'Rok za zimsku opremu':'Period obavezne zimske opreme';
  $('result-sub').textContent=`${weekday(plan.date)} · ${lead}`;$('result-reason').textContent=plan.reason;
  ['early','mid','late','season'].forEach(b=>$(`band-${b}`).classList.toggle('active',b===plan.band));
  $('plan-steps').replaceChildren(...plan.steps.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
  $('email-plan').href=emailHref(plan);return true;
}
$('planner-form').addEventListener('submit',e=>{e.preventDefault();renderPlan();});
$('planner-form').addEventListener('change',renderPlan);
$('service-plan').addEventListener('click',()=>{if(activeService==='hotel')$('hotel').checked=true;else document.querySelector(`input[name="tires"][value="${activeService==='sales'?'new':'own'}"]`).checked=true;renderPlan();});
$('save-reminder').addEventListener('click',()=>{
  if(!renderPlan()||!plan)return;
  const blob=new Blob([calendarFile(plan)],{type:'text/calendar;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`river-podsjetnik-${plan.date}.ics`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);$('save-status').textContent='Podsjetnik je preuzet. Termin još treba potvrditi s Riverom.';
});
renderPlan();
