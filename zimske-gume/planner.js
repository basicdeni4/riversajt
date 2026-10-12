export const DEADLINE='2026-11-01';
export const SEASON_END='2027-04-01';
export function sarajevoToday(now=new Date()){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Sarajevo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const get=type=>parts.find(p=>p.type===type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function parseDate(iso){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso??''))return null;
  const date=new Date(`${iso}T12:00:00Z`);
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===iso?date:null;
}
export function addDays(iso,days){const d=parseDate(iso);if(!d)throw new Error('Invalid date');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function daysBetween(from,to){return Math.round((parseDate(to)-parseDate(from))/86400000);}
export function nextWorkday(iso){return parseDate(iso).getUTCDay()===0?addDays(iso,1):iso;}
export function seasonBand(date){return date<='2026-10-18'?'early':date<='2026-10-25'?'mid':date<DEADLINE?'late':'season';}
export function defaultVisit(today){return nextWorkday(today>SEASON_END?today:addDays(today,Math.min(3,Math.max(0,daysBetween(today,SEASON_END)))));}
export function createPlan({date,today,tires='new',hotel=false,flexible=true}){
  if(!parseDate(date)||!parseDate(today))return {error:'Izaberite važeći datum dolaska.'};
  if(today>SEASON_END)return {error:'Kampanja 2026/27 je završena. Za narednu sezonu kontaktirajte River.'};
  if(date<today)return {error:'Izaberite današnji ili neki naredni datum.'};
  if(date>SEASON_END)return {error:'Ovaj planer je za sezonu 2026/27, do 1. aprila 2027.'};
  if(!['new','own'].includes(tires))return {error:'Izaberite trebate li nove gume ili zamjenu.'};
  let target=date;
  if(flexible&&date>'2026-10-18'&&today<DEADLINE){
    let early=nextWorkday([addDays(today,2),'2026-10-18'].sort().at(-1));
    if(early>=DEADLINE)early=nextWorkday(today);
    if(early<DEADLINE&&early<target)target=early;
  }
  let sundayAdjusted=false;
  if(parseDate(target).getUTCDay()===0){
    const previous=addDays(target,-1);
    if(flexible&&previous>=today){target=previous;sundayAdjusted=true;}
    else if(addDays(target,1)<=SEASON_END){target=addDays(target,1);sundayAdjusted=true;}
  }
  const band=seasonBand(target),lead=daysBetween(target,DEADLINE);
  let reason={early:'Raniji dolazak ostavlja više prostora za provjeru ponude i pripremu vozila.',mid:'Još ima vremena za pripremu prije roka. Dogovorite dolazak i provjerite dostupnost unaprijed.',late:'Završna sedmica pred rok može biti opterećena. Nazovite River što prije da dogovorite dolazak.',season:'Period obavezne zimske opreme je počeo. Provjerite opremu prije vožnje i kontaktirajte River za dolazak.'}[band];
  if(target<date&&!sundayAdjusted&&['early','mid'].includes(band))reason='Možete doći ranije: predložili smo datum prije vašeg odabira kako biste ostavili više prostora za pripremu.';
  if(sundayAdjusted)reason+=' Umjesto nedjelje predložen je radni dan; dostupnost potvrdite s Riverom.';
  const steps=tires==='new'?['Provjerite dimenziju i dostupnost zimskih guma.','Dogovorite kupovinu i ugradnju s Riverom.']:['Pripremite svoj zimski set i provjerite njegovo stanje.','Dogovorite sezonsku zamjenu s Riverom.'];
  if(hotel)steps.push('Pitajte za cijenu i uslove hotela za ljetne gume.');
  const services=tires==='new'?'Prodaja zimskih guma i ugradnja':'Ugradnja vlastitog zimskog seta';
  return {date:target,selectedDate:date,band,lead,reason,steps,services,hotel:!!hotel,shifted:target!==date};
}
export function prettyDate(date){const d=parseDate(date);const months=['januar','februar','mart','april','maj','juni','juli','august','septembar','oktobar','novembar','decembar'];return `${d.getUTCDate()}. ${months[d.getUTCMonth()]}`;}
export function weekday(date){return ['Nedjelja','Ponedjeljak','Utorak','Srijeda','Četvrtak','Petak','Subota'][parseDate(date).getUTCDay()];}
export function emailHref(plan){const body=`Poštovani,\n\nŽelim provjeriti mogućnost dolaska ${prettyDate(plan.date)} ${plan.date.slice(0,4)}.\nUsluge: ${plan.services}${plan.hotel?' + hotel za ljetne gume':''}.\n\nMolim informaciju o raspoloživosti termina, cijeni i uslovima.\nVozilo i dimenzija guma: [upišite]\n\nHvala.`;return `mailto:river.vraca@gmail.com?subject=${encodeURIComponent('Upit za zimske gume — River')}&body=${encodeURIComponent(body)}`;}
export function calendarFile(plan,now=new Date()){
  const esc=text=>text.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//River Sarajevo//Zimski planer//BS','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:river-plan-${plan.date}-${now.getTime()}@riversarajevo.com`,`DTSTAMP:${now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART;VALUE=DATE:${plan.date.replace(/-/g,'')}`,`DTEND;VALUE=DATE:${addDays(plan.date,1).replace(/-/g,'')}`,'STATUS:TENTATIVE',`SUMMARY:${esc('Podsjetnik: potvrditi dolazak u River')}`,`DESCRIPTION:${esc(`${plan.services}${plan.hotel?' + hotel za ljetne gume':''}. Lični podsjetnik, nije rezervacija. Nazvati 061 564 192 za potvrdu termina.`)}`,`LOCATION:${esc('River Auto-centar, Pavla Lukača 2, Sarajevo')}`,'TRANSP:TRANSPARENT','END:VEVENT','END:VCALENDAR'];
  const encoder=new TextEncoder();
  return lines.map(line=>{let segments=[],segment='';for(const char of line){if(encoder.encode(segment+char).length>73){segments.push(segment);segment=' '+char;}else segment+=char;}segments.push(segment);return segments.join('\r\n');}).join('\r\n')+'\r\n';
}
