var e=globalThis,t=e.ShadowRoot&&(e.ShadyCSS===void 0||e.ShadyCSS.nativeShadow)&&`adoptedStyleSheets`in Document.prototype&&`replace`in CSSStyleSheet.prototype,n=Symbol(),r=/* @__PURE__ */ new WeakMap,i=class{constructor(e,t,r){if(this._$cssResult$=!0,r!==n)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,n=this.t;if(t&&e===void 0){let t=n!==void 0&&n.length===1;t&&(e=r.get(n)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),t&&r.set(n,e))}return e}toString(){return this.cssText}},a=e=>new i(typeof e==`string`?e:e+``,void 0,n),o=(e,...t)=>new i(e.length===1?e[0]:t.reduce((t,n,r)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if(typeof e==`number`)return e;throw Error(`Value passed to 'css' function must be a 'css' function result: `+e+`. Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.`)})(n)+e[r+1],e[0]),e,n),s=(n,r)=>{if(t)n.adoptedStyleSheets=r.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let t of r){let r=document.createElement(`style`),i=e.litNonce;i!==void 0&&r.setAttribute(`nonce`,i),r.textContent=t.cssText,n.appendChild(r)}},c=t?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t=``;for(let n of e.cssRules)t+=n.cssText;return a(t)})(e):e,{is:l,defineProperty:u,getOwnPropertyDescriptor:d,getOwnPropertyNames:ee,getOwnPropertySymbols:te,getPrototypeOf:ne}=Object,f=globalThis,re=f.trustedTypes,ie=re?re.emptyScript:``,ae=f.reactiveElementPolyfillSupport,p=(e,t)=>e,m={toAttribute(e,t){switch(t){case Boolean:e=e?ie:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,t){let n=e;switch(t){case Boolean:n=e!==null;break;case Number:n=e===null?null:Number(e);break;case Object:case Array:try{n=JSON.parse(e)}catch{n=null}}return n}},oe=(e,t)=>!l(e,t),se={attribute:!0,type:String,converter:m,reflect:!1,useDefault:!1,hasChanged:oe};Symbol.metadata??=Symbol(`metadata`),f.litPropertyMetadata??=/* @__PURE__ */ new WeakMap;var h=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=se){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let n=Symbol(),r=this.getPropertyDescriptor(e,n,t);r!==void 0&&u(this.prototype,e,r)}}static getPropertyDescriptor(e,t,n){let{get:r,set:i}=d(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:r,set(t){let a=r?.call(this);i?.call(this,t),this.requestUpdate(e,a,n)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??se}static _$Ei(){if(this.hasOwnProperty(p(`elementProperties`)))return;let e=ne(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(p(`finalized`)))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(p(`properties`))){let e=this.properties,t=[...ee(e),...te(e)];for(let n of t)this.createProperty(n,e[n])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[e,n]of t)this.elementProperties.set(e,n)}this._$Eh=/* @__PURE__ */ new Map;for(let[e,t]of this.elementProperties){let n=this._$Eu(e,t);n!==void 0&&this._$Eh.set(n,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let n=new Set(e.flat(1/0).reverse());for(let e of n)t.unshift(c(e))}else e!==void 0&&t.push(c(e));return t}static _$Eu(e,t){let n=t.attribute;return!1===n?void 0:typeof n==`string`?n:typeof e==`string`?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=/* @__PURE__ */ new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=/* @__PURE__ */ new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=/* @__PURE__ */ new Map,t=this.constructor.elementProperties;for(let n of t.keys())this.hasOwnProperty(n)&&(e.set(n,this[n]),delete this[n]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return s(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,n){this._$AK(e,n)}_$ET(e,t){let n=this.constructor.elementProperties.get(e),r=this.constructor._$Eu(e,n);if(r!==void 0&&!0===n.reflect){let i=(n.converter?.toAttribute===void 0?m:n.converter).toAttribute(t,n.type);this._$Em=e,i==null?this.removeAttribute(r):this.setAttribute(r,i),this._$Em=null}}_$AK(e,t){let n=this.constructor,r=n._$Eh.get(e);if(r!==void 0&&this._$Em!==r){let e=n.getPropertyOptions(r),i=typeof e.converter==`function`?{fromAttribute:e.converter}:e.converter?.fromAttribute===void 0?m:e.converter;this._$Em=r;let a=i.fromAttribute(t,e.type);this[r]=a??this._$Ej?.get(r)??a,this._$Em=null}}requestUpdate(e,t,n,r=!1,i){if(e!==void 0){let a=this.constructor;if(!1===r&&(i=this[e]),n??=a.getPropertyOptions(e),!((n.hasChanged??oe)(i,t)||n.useDefault&&n.reflect&&i===this._$Ej?.get(e)&&!this.hasAttribute(a._$Eu(e,n))))return;this.C(e,t,n)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:n,reflect:r,wrapped:i},a){n&&!(this._$Ej??=/* @__PURE__ */ new Map).has(e)&&(this._$Ej.set(e,a??t??this[e]),!0!==i||a!==void 0)||(this._$AL.has(e)||(this.hasUpdated||n||(t=void 0),this._$AL.set(e,t)),!0===r&&this._$Em!==e&&(this._$Eq??=/* @__PURE__ */ new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}let e=this.constructor.elementProperties;if(e.size>0)for(let[t,n]of e){let{wrapped:e}=n,r=this[t];!0!==e||this._$AL.has(t)||r===void 0||this.C(t,void 0,n,r)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=/* @__PURE__ */ new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}};h.elementStyles=[],h.shadowRootOptions={mode:`open`},h[p(`elementProperties`)]=/* @__PURE__ */ new Map,h[p(`finalized`)]=/* @__PURE__ */ new Map,ae?.({ReactiveElement:h}),(f.reactiveElementVersions??=[]).push(`2.1.2`);var g=globalThis,ce=e=>e,_=g.trustedTypes,v=_?_.createPolicy(`lit-html`,{createHTML:e=>e}):void 0,y=`$lit$`,b=`lit$${Math.random().toFixed(9).slice(2)}$`,le=`?`+b,ue=`<${le}>`,x=document,S=()=>x.createComment(``),C=e=>e===null||typeof e!=`object`&&typeof e!=`function`,w=Array.isArray,de=e=>w(e)||typeof e?.[Symbol.iterator]==`function`,T=`[ 	
\f\r]`,E=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,fe=/-->/g,pe=/>/g,D=RegExp(`>|${T}(?:([^\\s"'>=/]+)(${T}*=${T}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,`g`),me=/'/g,O=/"/g,k=/^(?:script|style|textarea|title)$/i,A=e=>(t,...n)=>({_$litType$:e,strings:t,values:n}),j=A(1),he=A(2),M=Symbol.for(`lit-noChange`),N=Symbol.for(`lit-nothing`),P=/* @__PURE__ */ new WeakMap,F=x.createTreeWalker(x,129);function ge(e,t){if(!w(e)||!e.hasOwnProperty(`raw`))throw Error(`invalid template strings array`);return v===void 0?t:v.createHTML(t)}var _e=(e,t)=>{let n=e.length-1,r=[],i,a=t===2?`<svg>`:t===3?`<math>`:``,o=E;for(let t=0;t<n;t++){let n=e[t],s,c,l=-1,u=0;for(;u<n.length&&(o.lastIndex=u,c=o.exec(n),c!==null);)u=o.lastIndex,o===E?c[1]===`!--`?o=fe:c[1]===void 0?c[2]===void 0?c[3]!==void 0&&(o=D):(k.test(c[2])&&(i=RegExp(`</`+c[2],`g`)),o=D):o=pe:o===D?c[0]===`>`?(o=i??E,l=-1):c[1]===void 0?l=-2:(l=o.lastIndex-c[2].length,s=c[1],o=c[3]===void 0?D:c[3]===`"`?O:me):o===O||o===me?o=D:o===fe||o===pe?o=E:(o=D,i=void 0);let d=o===D&&e[t+1].startsWith(`/>`)?` `:``;a+=o===E?n+ue:l>=0?(r.push(s),n.slice(0,l)+y+n.slice(l)+b+d):n+b+(l===-2?t:d)}return[ge(e,a+(e[n]||`<?>`)+(t===2?`</svg>`:t===3?`</math>`:``)),r]},I=class e{constructor({strings:t,_$litType$:n},r){let i;this.parts=[];let a=0,o=0,s=t.length-1,c=this.parts,[l,u]=_e(t,n);if(this.el=e.createElement(l,r),F.currentNode=this.el.content,n===2||n===3){let e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;(i=F.nextNode())!==null&&c.length<s;){if(i.nodeType===1){if(i.hasAttributes())for(let e of i.getAttributeNames())if(e.endsWith(y)){let t=u[o++],n=i.getAttribute(e).split(b),r=/([.?@])?(.*)/.exec(t);c.push({type:1,index:a,name:r[2],strings:n,ctor:r[1]===`.`?ye:r[1]===`?`?be:r[1]===`@`?xe:z}),i.removeAttribute(e)}else e.startsWith(b)&&(c.push({type:6,index:a}),i.removeAttribute(e));if(k.test(i.tagName)){let e=i.textContent.split(b),t=e.length-1;if(t>0){i.textContent=_?_.emptyScript:``;for(let n=0;n<t;n++)i.append(e[n],S()),F.nextNode(),c.push({type:2,index:++a});i.append(e[t],S())}}}else if(i.nodeType===8){if(i.data===le)c.push({type:2,index:a});else{let e=-1;for(;(e=i.data.indexOf(b,e+1))!==-1;)c.push({type:7,index:a}),e+=b.length-1}}a++}}static createElement(e,t){let n=x.createElement(`template`);return n.innerHTML=e,n}};function L(e,t,n=e,r){if(t===M)return t;let i=r===void 0?n._$Cl:n._$Co?.[r],a=C(t)?void 0:t._$litDirective$;return i?.constructor!==a&&(i?._$AO?.(!1),a===void 0?i=void 0:(i=new a(e),i._$AT(e,n,r)),r===void 0?n._$Cl=i:(n._$Co??=[])[r]=i),i!==void 0&&(t=L(e,i._$AS(e,t.values),i,r)),t}var ve=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:n}=this._$AD,r=(e?.creationScope??x).importNode(t,!0);F.currentNode=r;let i=F.nextNode(),a=0,o=0,s=n[0];for(;s!==void 0;){if(a===s.index){let t;s.type===2?t=new R(i,i.nextSibling,this,e):s.type===1?t=new s.ctor(i,s.name,s.strings,this,e):s.type===6&&(t=new Se(i,this,e)),this._$AV.push(t),s=n[++o]}a!==s?.index&&(i=F.nextNode(),a++)}return F.currentNode=x,r}p(e){let t=0;for(let n of this._$AV)n!==void 0&&(n.strings===void 0?n._$AI(e[t]):(n._$AI(e,n,t),t+=n.strings.length-2)),t++}},R=class e{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,n,r){this.type=2,this._$AH=N,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=n,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=L(this,e,t),C(e)?e===N||e==null||e===``?(this._$AH!==N&&this._$AR(),this._$AH=N):e!==this._$AH&&e!==M&&this._(e):e._$litType$===void 0?e.nodeType===void 0?de(e)?this.k(e):this._(e):this.T(e):this.$(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==N&&C(this._$AH)?this._$AA.nextSibling.data=e:this.T(x.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:n}=e,r=typeof n==`number`?this._$AC(e):(n.el===void 0&&(n.el=I.createElement(ge(n.h,n.h[0]),this.options)),n);if(this._$AH?._$AD===r)this._$AH.p(t);else{let e=new ve(r,this),n=e.u(this.options);e.p(t),this.T(n),this._$AH=e}}_$AC(e){let t=P.get(e.strings);return t===void 0&&P.set(e.strings,t=new I(e)),t}k(t){w(this._$AH)||(this._$AH=[],this._$AR());let n=this._$AH,r,i=0;for(let a of t)i===n.length?n.push(r=new e(this.O(S()),this.O(S()),this,this.options)):r=n[i],r._$AI(a),i++;i<n.length&&(this._$AR(r&&r._$AB.nextSibling,i),n.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let t=ce(e).nextSibling;ce(e).remove(),e=t}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},z=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,n,r,i){this.type=1,this._$AH=N,this._$AN=void 0,this.element=e,this.name=t,this._$AM=r,this.options=i,n.length>2||n[0]!==``||n[1]!==``?(this._$AH=Array(n.length-1).fill(/* @__PURE__ */ new String),this.strings=n):this._$AH=N}_$AI(e,t=this,n,r){let i=this.strings,a=!1;if(i===void 0)e=L(this,e,t,0),a=!C(e)||e!==this._$AH&&e!==M,a&&(this._$AH=e);else{let r=e,o,s;for(e=i[0],o=0;o<i.length-1;o++)s=L(this,r[n+o],t,o),s===M&&(s=this._$AH[o]),a||=!C(s)||s!==this._$AH[o],s===N?e=N:e!==N&&(e+=(s??``)+i[o+1]),this._$AH[o]=s}a&&!r&&this.j(e)}j(e){e===N?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??``)}},ye=class extends z{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===N?void 0:e}},be=class extends z{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==N)}},xe=class extends z{constructor(e,t,n,r,i){super(e,t,n,r,i),this.type=5}_$AI(e,t=this){if((e=L(this,e,t,0)??N)===M)return;let n=this._$AH,r=e===N&&n!==N||e.capture!==n.capture||e.once!==n.once||e.passive!==n.passive,i=e!==N&&(n===N||r);r&&this.element.removeEventListener(this.name,this,n),i&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH==`function`?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},Se=class{constructor(e,t,n){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=n}get _$AU(){return this._$AM._$AU}_$AI(e){L(this,e)}},Ce=g.litHtmlPolyfillSupport;Ce?.(I,R),(g.litHtmlVersions??=[]).push(`3.3.3`);var we=(e,t,n)=>{let r=n?.renderBefore??t,i=r._$litPart$;if(i===void 0){let e=n?.renderBefore??null;r._$litPart$=i=new R(t.insertBefore(S(),e),e,void 0,n??{})}return i._$AI(e),i},B=globalThis,V=class extends h{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=we(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return M}};V._$litElement$=!0,V.finalized=!0,B.litElementHydrateSupport?.({LitElement:V});var Te=B.litElementPolyfillSupport;Te?.({LitElement:V}),(B.litElementVersions??=[]).push(`4.2.2`);var H={title:`Safe`,loading:`Loading…`,no_safes:`No Populife safe is set up yet.`,no_access:`You may not operate this safe. An admin can allow you under Settings → Devices & services → Populife → Configure.`,locked:`Locked`,unlocked:`Unlocked`,locking:`Locking…`,unlocking:`Unlocking…`,unknown:`Unknown`,unavailable:`Out of range`,lock:`Lock`,unlock:`Unlock`,confirm_unlock:`Unlock {name}?`,confirm_unlock_text:`The safe opens right away.`,cancel:`Cancel`,battery:`Battery`,signal:`Signal`,clock:`Clock`,clock_ok:`In sync`,clock_off:`{seconds} s off`,sync_clock:`Sync clock`,refresh:`Refresh`,last_unlock:`Last opened`,last_unlock_by:`by {user}`,never:`Not yet`,passcodes:`Passcodes`,passcodes_admin_only:`Managing passcodes needs the safe's admin key. Use Reconfigure to add it.`,add_passcode:`Add passcode`,no_passcodes:`No passcodes yet.`,unnamed:`Unnamed`,permanent:`Permanent`,temporary:`Temporary`,status_active:`Active`,status_upcoming:`Starts {when}`,status_expired:`Expired`,status_permanent:`Always`,until:`until {when}`,show_code:`Show code`,hide_code:`Hide code`,copy:`Copy`,copied:`Copied`,share:`Share`,share_text:`Your code for {safe}: {code}{window}`,share_window:` (valid {start} to {end})`,delete:`Delete`,confirm_delete:`Delete {name}'s passcode?`,confirm_delete_text:`It stops opening the safe right away.`,not_on_safe:`Not reported by the safe`,name:`Name`,name_hint:`Who it is for, e.g. Mom, or Guest this weekend`,code:`Code`,generate:`Generate`,type:`Type`,valid_from:`Valid from`,valid_until:`Valid until`,add:`Add`,adding:`Adding…`,added:`Passcode for {name} added`,error_empty:`Enter a code or generate one.`,error_digits:`Use digits only.`,error_length:`Use 4 to 9 digits.`,error_conflict:`Clashes with another code: one starts with the other.`,error_missing_end:`Pick when the code stops working.`,error_end_before_start:`The end must be after the start.`,clock_note:`The safe's clock is synced before a temporary code is written.`,activity:`Activity`,activity_empty:`Nothing in the last 7 days.`,filter_all:`All`,filter_unlocks:`Openings`,filter_failed:`Failed`,filter_alarms:`Alarms`,method_app:`App`,method_keypad:`Keypad`,method_fingerprint:`Fingerprint`,method_card:`Card`,method_key:`Mechanical key`,method_gateway:`Gateway`,method_remote:`Remote`,method_failed:`Failed attempt`,method_alarm:`Alarm`,method_other:`Other`,action_unlock:`Opened`,action_lock:`Locked`,action_other:`Event`,fingerprints:`Fingerprints`,fingerprints_note:`Fingerprints are enrolled at the safe itself; the sensor has to scan the finger.`,no_fingerprints:`No fingerprints enrolled.`,hold_to_unlock:`Hold to unlock`,tap_to_lock:`Tap to lock`,via_ha:`via Home Assistant`,signal_excellent:`Excellent signal`,signal_good:`Good signal`,signal_weak:`Weak signal`,auto_lock_after:`Auto-locks after {seconds} s`,auto_lock_off:`Auto-lock off`,preset_24h:`24 hours`,preset_today:`Today`,preset_weekend:`This weekend`,preset_week:`A week`,preset_custom:`Custom`,summary_permanent:`{who} can open the safe with {code} at any time.`,summary_temporary:`{who} can open the safe with {code} from {start} to {end}.`,whoever:`Whoever has it`,new_code:`New code`,success:`Passcode added`,done:`Done`,used:`used {when}`,today:`Today`,yesterday:`Yesterday`,ends:`ends {when}`,starts:`starts {when}`,auto_lock:`Auto-lock`,off:`Off`,seconds:`{seconds} s`,signal_short_excellent:`Excellent`,signal_short_good:`Good`,signal_short_weak:`Weak`,clock_drift_short:`{seconds} s off`,week_summary:`Last 7 days`,hold_hint_open:`The safe is open`,slot:`Slot {slot}`,failed:`Failed: {error}`},Ee={en:H,ru:{title:`Сейф`,loading:`Загрузка…`,no_safes:`Сейф Populife ещё не настроен.`,no_access:`Вам нельзя управлять этим сейфом. Администратор может разрешить это в Настройки → Устройства и службы → Populife → Настроить.`,locked:`Заперт`,unlocked:`Открыт`,locking:`Запирается…`,unlocking:`Открывается…`,unknown:`Неизвестно`,unavailable:`Вне зоны`,lock:`Запереть`,unlock:`Открыть`,confirm_unlock:`Открыть {name}?`,confirm_unlock_text:`Сейф откроется сразу.`,cancel:`Отмена`,battery:`Батарея`,signal:`Сигнал`,clock:`Часы`,clock_ok:`Точно`,clock_off:`сбиты на {seconds} с`,sync_clock:`Синхронизировать`,refresh:`Обновить`,last_unlock:`Последнее открытие`,last_unlock_by:`{user}`,never:`Ещё не открывали`,passcodes:`Коды`,passcodes_admin_only:`Для управления кодами нужен admin-ключ сейфа. Добавьте его через «Перенастроить».`,add_passcode:`Добавить код`,no_passcodes:`Кодов пока нет.`,unnamed:`Без имени`,permanent:`Постоянный`,temporary:`Временный`,status_active:`Действует`,status_upcoming:`С {when}`,status_expired:`Истёк`,status_permanent:`Всегда`,until:`до {when}`,show_code:`Показать код`,hide_code:`Скрыть код`,copy:`Копировать`,copied:`Скопировано`,share:`Поделиться`,share_text:`Ваш код для {safe}: {code}{window}`,share_window:` (действует с {start} до {end})`,delete:`Удалить`,confirm_delete:`Удалить код «{name}»?`,confirm_delete_text:`Он сразу перестанет открывать сейф.`,not_on_safe:`Сейф его не сообщил`,name:`Имя`,name_hint:`Для кого код, например «Мама» или «Гость на выходные»`,code:`Код`,generate:`Сгенерировать`,type:`Тип`,valid_from:`Действует с`,valid_until:`Действует до`,add:`Добавить`,adding:`Добавляю…`,added:`Код «{name}» добавлен`,error_empty:`Введите код или сгенерируйте.`,error_digits:`Только цифры.`,error_length:`От 4 до 9 цифр.`,error_conflict:`Пересекается с другим кодом: один начинается с другого.`,error_missing_end:`Укажите, когда код перестанет работать.`,error_end_before_start:`Конец должен быть позже начала.`,clock_note:`Перед записью временного кода часы сейфа синхронизируются.`,activity:`Журнал`,activity_empty:`За последние 7 дней ничего не было.`,filter_all:`Все`,filter_unlocks:`Открытия`,filter_failed:`Неудачные`,filter_alarms:`Тревоги`,method_app:`Приложение`,method_keypad:`Клавиатура`,method_fingerprint:`Отпечаток`,method_card:`Карта`,method_key:`Ключ`,method_gateway:`Шлюз`,method_remote:`Пульт`,method_failed:`Неудачная попытка`,method_alarm:`Тревога`,method_other:`Другое`,action_unlock:`Открыт`,action_lock:`Заперт`,action_other:`Событие`,fingerprints:`Отпечатки`,fingerprints_note:`Отпечатки записываются только у сейфа: датчик должен отсканировать палец.`,no_fingerprints:`Отпечатков нет.`,hold_to_unlock:`Удерживайте, чтобы открыть`,tap_to_lock:`Нажмите, чтобы запереть`,via_ha:`через Home Assistant`,signal_excellent:`Отличный сигнал`,signal_good:`Хороший сигнал`,signal_weak:`Слабый сигнал`,auto_lock_after:`Автоблокировка через {seconds} с`,auto_lock_off:`Автоблокировка выкл.`,preset_24h:`24 часа`,preset_today:`Сегодня`,preset_weekend:`Выходные`,preset_week:`Неделя`,preset_custom:`Своё`,summary_permanent:`{who} сможет открывать сейф кодом {code} в любое время.`,summary_temporary:`{who} сможет открывать сейф кодом {code} с {start} до {end}.`,whoever:`Тот, у кого есть код`,new_code:`Другой код`,success:`Код добавлен`,done:`Готово`,used:`использован {when}`,today:`Сегодня`,yesterday:`Вчера`,ends:`закончится {when}`,starts:`начнётся {when}`,auto_lock:`Автоблокировка`,off:`Выкл.`,seconds:`{seconds} с`,signal_short_excellent:`Отличный`,signal_short_good:`Хороший`,signal_short_weak:`Слабый`,clock_drift_short:`сбиты на {seconds} с`,week_summary:`За 7 дней`,hold_hint_open:`Сейф открыт`,slot:`Слот {slot}`,failed:`Ошибка: {error}`}};function U(e){let t=Ee[e.split(`-`)[0]??`en`]??H;return(e,n)=>t[e].replace(/\{(\w+)\}/g,(e,t)=>n&&t in n?String(n[t]):e)}function W(e){let t=`method_${e}`;return t in H?t:`method_other`}function De(e){let t=`action_${e}`;return t in H?t:`action_other`}var G=o`
  :host {
    color: var(--primary-text-color);
    font-family: var(--ha-font-family-body, var(--paper-font-body1_-_font-family, sans-serif));
  }
  .card {
    background: var(--ha-card-background, var(--card-background-color, #fff));
    border-radius: var(--ha-card-border-radius, 12px);
    border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color));
    box-shadow: var(--ha-card-box-shadow, none);
    padding: 16px;
  }
  h2 {
    font-size: 1.15rem;
    font-weight: 500;
    margin: 0;
  }
  .card-header {
    align-items: center;
    display: flex;
    gap: 8px;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .muted {
    color: var(--secondary-text-color);
  }
  .small {
    font-size: 0.85rem;
  }
  button {
    align-items: center;
    background: none;
    border: 1px solid var(--divider-color);
    border-radius: 18px;
    color: var(--primary-text-color);
    cursor: pointer;
    display: inline-flex;
    font: inherit;
    gap: 6px;
    min-height: 36px;
    padding: 0 14px;
  }
  button:hover:not([disabled]) {
    background: color-mix(in srgb, var(--primary-color) 10%, transparent);
  }
  button:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }
  button[disabled] {
    cursor: default;
    opacity: 0.5;
  }
  button.primary {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: var(--text-primary-color, #fff);
  }
  button.primary:hover:not([disabled]) {
    background: color-mix(in srgb, var(--primary-color) 85%, black);
  }
  button.danger {
    border-color: var(--error-color);
    color: var(--error-color);
  }
  button.icon {
    border: none;
    border-radius: 50%;
    justify-content: center;
    min-height: 40px;
    min-width: 40px;
    padding: 0;
  }
  ha-icon {
    --mdc-icon-size: 20px;
  }
  input,
  select {
    background: var(--input-fill-color, var(--secondary-background-color));
    border: 1px solid var(--input-idle-line-color, var(--divider-color));
    border-radius: 8px;
    box-sizing: border-box;
    color: var(--primary-text-color);
    font: inherit;
    min-height: 40px;
    padding: 0 12px;
    width: 100%;
  }
  input:focus,
  select:focus {
    border-color: var(--primary-color);
    outline: none;
  }
  label {
    display: grid;
    font-size: 0.85rem;
    gap: 4px;
  }
  .chip {
    border-radius: 12px;
    display: inline-flex;
    font-size: 0.78rem;
    gap: 4px;
    padding: 2px 8px;
    white-space: nowrap;
  }
  .chip.ok {
    background: color-mix(in srgb, var(--success-color, #43a047) 18%, transparent);
    color: var(--success-color, #43a047);
  }
  .chip.warn {
    background: color-mix(in srgb, var(--warning-color, #ffa600) 18%, transparent);
    color: var(--warning-color, #ffa600);
  }
  .chip.bad {
    background: color-mix(in srgb, var(--error-color, #db4437) 15%, transparent);
    color: var(--error-color, #db4437);
  }
  .chip.neutral {
    background: var(--secondary-background-color);
    color: var(--secondary-text-color);
  }
  .error {
    color: var(--error-color);
    font-size: 0.8rem;
  }
`,Oe=class extends V{constructor(...e){super(...e),this.resolve=null}static{this.properties={heading:{},text:{},confirmLabel:{attribute:!1},cancelLabel:{attribute:!1},danger:{type:Boolean}}}ask(){return this.shadowRoot?.querySelector(`dialog`)?.showModal(),new Promise(e=>{this.resolve=e})}close(e){this.shadowRoot?.querySelector(`dialog`)?.close(),this.resolve?.(e),this.resolve=null}render(){return j`
      <dialog
        aria-labelledby="heading"
        @cancel=${e=>{e.preventDefault(),this.close(!1)}}
      >
        <h2 id="heading">${this.heading}</h2>
        <p class="muted">${this.text}</p>
        <div class="actions">
          <button
            @click=${()=>{this.close(!1)}}
          >
            ${this.cancelLabel}
          </button>
          <button
            class=${this.danger?`danger`:`primary`}
            @click=${()=>{this.close(!0)}}
          >
            ${this.confirmLabel}
          </button>
        </div>
      </dialog>
    `}static{this.styles=[G,o`
      dialog {
        background: var(--card-background-color, #fff);
        border: none;
        border-radius: var(--ha-dialog-border-radius, 24px);
        color: var(--primary-text-color);
        max-width: min(420px, calc(100vw - 32px));
        padding: 24px;
      }
      dialog::backdrop {
        background: rgb(0 0 0 / 0.45);
      }
      .actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 16px;
      }
    `]}};customElements.get(`populife-confirm`)||customElements.define(`populife-confirm`,Oe);var K=52,ke=2*Math.PI*K,Ae=class extends V{static{this.properties={icon:{},label:{},hint:{},hold:{type:Boolean},duration:{type:Number},disabled:{type:Boolean,reflect:!0},busy:{type:Boolean},_progress:{state:!0}}}constructor(){super(),this.started=null,this.frame=null,this.icon=``,this.label=``,this.hint=``,this.hold=!1,this.duration=1e3,this.disabled=!1,this.busy=!1,this._progress=0}disconnectedCallback(){super.disconnectedCallback(),this.cancel()}start(e){if(this.disabled||this.busy||this.started!==null)return;if(e.preventDefault(),!this.hold){this.fire();return}this.started=performance.now();let t=e=>{this.started!==null&&(this._progress=Math.min((e-this.started)/this.duration,1),this._progress>=1?(this.started=null,this.fire(),this.resetSoon()):this.frame=requestAnimationFrame(t))};this.frame=requestAnimationFrame(t)}cancel(){this.frame!==null&&cancelAnimationFrame(this.frame),this.frame=null,this.started!==null&&(this.started=null,this._progress=0)}resetSoon(){setTimeout(()=>this._progress=0,400)}fire(){this.dispatchEvent(new CustomEvent(`activate`,{bubbles:!0,composed:!0}))}onKeyDown(e){(e.key===` `||e.key===`Enter`)&&!e.repeat&&this.start(e)}onKeyUp(e){(e.key===` `||e.key===`Enter`)&&this.cancel()}render(){let e=ke*(1-this._progress);return j`
      <button
        aria-label=${this.hint?`${this.label}: ${this.hint}`:this.label}
        ?disabled=${this.disabled}
        aria-busy=${this.busy}
        @pointerdown=${e=>{this.start(e)}}
        @pointerup=${()=>{this.cancel()}}
        @pointerleave=${()=>{this.cancel()}}
        @pointercancel=${()=>{this.cancel()}}
        @keydown=${e=>{this.onKeyDown(e)}}
        @keyup=${e=>{this.onKeyUp(e)}}
        @contextmenu=${e=>{e.preventDefault()}}
      >
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle class="track" cx="60" cy="60" r=${K}></circle>
          ${this.hold?he`<circle
                class="ring"
                cx="60"
                cy="60"
                r=${K}
                stroke-dasharray=${ke}
                stroke-dashoffset=${e}
              ></circle>`:N}
        </svg>
        <span class="face">
          <ha-icon icon=${this.busy?`mdi:dots-horizontal`:this.icon}></ha-icon>
          <span class="label">${this.label}</span>
        </span>
      </button>
      ${this.hint?j`<div class="hint">${this.hint}</div>`:N}
    `}static{this.styles=o`
    :host {
      --hold-color: var(--primary-color);
      align-items: center;
      display: inline-flex;
      flex-direction: column;
      gap: 6px;
      user-select: none;
      -webkit-user-select: none;
    }
    button {
      background: none;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      height: 112px;
      padding: 0;
      position: relative;
      touch-action: none;
      width: 112px;
      -webkit-tap-highlight-color: transparent;
    }
    button:focus-visible {
      outline: 2px solid var(--hold-color);
      outline-offset: 4px;
    }
    button[disabled] {
      cursor: default;
      opacity: 0.45;
    }
    svg {
      inset: 0;
      position: absolute;
      transform: rotate(-90deg);
    }
    circle {
      fill: none;
      stroke-width: 6;
    }
    .track {
      stroke: color-mix(in srgb, var(--hold-color) 22%, transparent);
    }
    .ring {
      stroke: var(--hold-color);
      stroke-linecap: round;
    }
    .face {
      align-items: center;
      background: linear-gradient(
        145deg,
        color-mix(in srgb, var(--hold-color) 75%, #fff) 0%,
        var(--hold-color) 55%,
        color-mix(in srgb, var(--hold-color) 85%, #000) 100%
      );
      border-radius: 50%;
      box-shadow: 0 6px 18px color-mix(in srgb, var(--hold-color) 40%, transparent);
      color: var(--text-primary-color, #fff);
      display: flex;
      flex-direction: column;
      gap: 2px;
      inset: 10px;
      justify-content: center;
      position: absolute;
      transition:
        transform 0.15s ease,
        box-shadow 0.15s ease;
    }
    button:hover:not([disabled]) .face {
      box-shadow: 0 8px 24px color-mix(in srgb, var(--hold-color) 50%, transparent);
    }
    button:active:not([disabled]) .face {
      transform: scale(0.96);
    }
    .face ha-icon {
      --mdc-icon-size: 30px;
    }
    .label {
      font: inherit;
      font-size: 0.85rem;
      font-weight: 500;
    }
    .hint {
      color: var(--secondary-text-color);
      font-size: 0.75rem;
      text-align: center;
    }
  `}};customElements.get(`populife-hold-button`)||customElements.define(`populife-hold-button`,Ae);function je(e,t){for(let n of t)if(n!==e&&(e.startsWith(n)||n.startsWith(e)))return n;return null}function Me(e,t){return e===``?`empty`:/^\d+$/.test(e)?e.length<4||e.length>9?`length`:je(e,t)===null?null:`conflict`:`digits`}function Ne(e,t){return t===``?`missing_end`:e!==``&&new Date(t)<=new Date(e)?`end_before_start`:null}function Pe(e,t){return e.end===null?`permanent`:new Date(e.end)<=t?`expired`:e.start!==null&&new Date(e.start)>t?`upcoming`:`active`}function Fe(e){return`•`.repeat(Math.max(e.length-2,0))+e.slice(-2)}function Ie(e){let t=e=>String(e).padStart(2,`0`);return`${e.getFullYear()}-${t(e.getMonth()+1)}-${t(e.getDate())}T${t(e.getHours())}:${t(e.getMinutes())}`}var q={app:`mdi:cellphone-key`,keypad:`mdi:dialpad`,fingerprint:`mdi:fingerprint`,card:`mdi:card-account-details-outline`,key:`mdi:key-variant`,gateway:`mdi:router-wireless`,remote:`mdi:remote`,failed:`mdi:alert-circle-outline`,alarm:`mdi:alarm-light-outline`,other:`mdi:information-outline`};function J(e,t){switch(t){case`all`:return!0;case`unlocks`:return e.action===`unlock`;case`failed`:return e.method===`failed`;case`alarms`:return e.method===`alarm`}}var Y=e=>typeof e==`string`?e:null;function Le(e,t){let n=[],r={};for(let i of e[t]??[]){i.a&&(r=i.a);let e=Y(r.event_type),t=Date.parse(i.s);e===null||Number.isNaN(t)||n.push({when:new Date(Y(r.time)??t),method:e,action:Y(r.action)??`other`,user:Y(r.user),credential:Y(r.credential),via:Y(r.via)})}return n.sort((e,t)=>t.when.getTime()-e.when.getTime())}function X(e,t,n){let r=Math.round((e.getTime()-t.getTime())/1e3),i=new Intl.RelativeTimeFormat(n,{numeric:`auto`});for(let[e,t]of[[`day`,86400],[`hour`,3600],[`minute`,60]])if(Math.abs(r)>=t)return i.format(Math.round(r/t),e);return i.format(r,`second`)}function Z(e,t){return new Intl.DateTimeFormat(t,{dateStyle:`medium`,timeStyle:`short`}).format(typeof e==`string`?new Date(e):e)}var Re=[`24h`,`today`,`weekend`,`week`,`custom`];function ze(e,t){let n=new Date(t);n.setSeconds(0,0);let r=new Date(n);switch(e){case`custom`:return null;case`24h`:r.setDate(r.getDate()+1);break;case`today`:r.setHours(23,59,0,0);break;case`week`:r.setDate(r.getDate()+7);break;case`weekend`:{let e=n.getDay(),t=e===6?0:e===0?-1:6-e;e!==6&&e!==0&&(n.setDate(n.getDate()+t),n.setHours(0,0,0,0)),r.setTime(n.getTime()),r.setDate(r.getDate()+ +(n.getDay()===6)),r.setHours(23,59,0,0);break}}return{start:Ie(n),end:Ie(r)}}function Be(e){return e<20?`bad`:e<40?`warn`:`ok`}function Ve(e){return e>=-65?`excellent`:e>=-80?`good`:`weak`}function He(e,t){if(e===null)return null;let n=t.find(t=>t.user===e&&t.action===`unlock`&&t.method===`keypad`);return n?n.when:null}function Ue(e){let t=e.trim().split(/\s+/).filter(Boolean);return(t.length>1?[t[0],t[1]]:[e.trim()]).map(e=>e?Array.from(e)[0]:``).join(``).toUpperCase().slice(0,2)}function We(e){let t=0;for(let n of e)t=(t*31+(n.codePointAt(0)??0))%360;return t}function Ge(e,t){if(e.end===null)return null;let n=new Date(e.end).getTime(),r=e.start?new Date(e.start).getTime():n;return n<=r?+(t.getTime()>=n):Math.min(Math.max((t.getTime()-r)/(n-r),0),1)}function Ke(e){let t=[];for(let n of e){let e=new Date(n.when);e.setHours(0,0,0,0);let r=e.toISOString(),i=t.at(-1);i?.key===r?i.operations.push(n):t.push({key:r,day:e,operations:[n]})}return t}function qe(e,t){let n=new Date(t);n.setHours(0,0,0,0);let r=Math.round((n.getTime()-e.getTime())/864e5);return r===0?`today`:r===1?`yesterday`:null}function Je(e){return{all:e.length,unlocks:e.filter(e=>J(e,`unlocks`)).length,failed:e.filter(e=>J(e,`failed`)).length,alarms:e.filter(e=>J(e,`alarms`)).length}}var Ye=class extends V{static{this.properties={hass:{attribute:!1},safe:{attribute:!1},knownCodes:{attribute:!1},_name:{state:!0},_code:{state:!0},_temporary:{state:!0},_preset:{state:!0},_start:{state:!0},_end:{state:!0},_busy:{state:!0},_touched:{state:!0},_added:{state:!0}}}constructor(){super(),this.onSubmit=null,this.onShare=null,this.knownCodes=[],this.reset()}reset(){this._name=``,this._code=``,this._temporary=!1,this.applyPreset(`24h`),this._busy=!1,this._touched=!1,this._added=null}applyPreset(e){this._preset=e;let t=ze(e,/* @__PURE__ */ new Date);t&&(this._start=t.start,this._end=t.end)}open(){this.reset(),this.shadowRoot?.querySelector(`dialog`)?.showModal(),this.generate(),this.updateComplete.then(()=>{this.shadowRoot?.querySelector(`#name`)?.focus()})}close(){this.shadowRoot?.querySelector(`dialog`)?.close()}get language(){return this.hass.locale?.language??this.hass.language}get t(){return U(this.language)}get codeProblem(){let e=Me(this._code,this.knownCodes);return e===null?null:`error_${e}`}get windowProblem(){if(!this._temporary)return null;let e=Ne(this._start,this._end);return e===null?null:`error_${e}`}async generate(){let{code:e}=await this.hass.callWS({type:`populife/generate`,entry_id:this.safe.entry_id});this._code=e}draft(){return{name:this._name.trim(),code:this._code,start:this._temporary?this._start:null,end:this._temporary?this._end:null}}async submit(e){if(e.preventDefault(),this._touched=!0,this.codeProblem!==null||this.windowProblem!==null||this.onSubmit===null)return;this._busy=!0;let t=this.draft();try{await this.onSubmit(t),this._added=t}catch{}finally{this._busy=!1}}summary(e){let t=this.t,n=e.name||t(`whoever`),r=(n,r)=>{let[i=``,a=``]=t(n,{...r,code:`\0`}).split(`\0`);return j`${i}<b class="mono">${e.code}</b>${a}`};return e.end===null?r(`summary_permanent`,{who:n}):r(`summary_temporary`,{who:n,start:Z(e.start??/* @__PURE__ */ new Date,this.language),end:Z(e.end,this.language)})}render(){return j`<dialog aria-labelledby="heading">
      ${this._added?this.renderAdded(this._added):this.renderForm()}
    </dialog>`}renderForm(){let e=this.t,t=this._touched||this._code!==``?this.codeProblem:null,n=this._touched?this.windowProblem:null;return j`
      <form @submit=${e=>void this.submit(e)}>
        <h2 id="heading">${e(`add_passcode`)}</h2>
        <label>
          ${e(`name`)}
          <input
            id="name"
            .value=${this._name}
            placeholder=${e(`name_hint`)}
            maxlength="60"
            autocomplete="off"
            @input=${e=>this._name=e.target.value}
          />
        </label>
        <label>
          ${e(`code`)}
          <div class="code-row">
            <input
              class="code"
              inputmode="numeric"
              autocomplete="off"
              maxlength="9"
              .value=${this._code}
              aria-invalid=${t!==null}
              @input=${e=>this._code=e.target.value.trim()}
            />
            <button
              type="button"
              class="icon"
              title=${e(`new_code`)}
              aria-label=${e(`new_code`)}
              @click=${()=>void this.generate()}
            >
              <ha-icon icon="mdi:dice-multiple"></ha-icon>
            </button>
          </div>
          ${t?j`<span class="error">${e(t)}</span>`:N}
        </label>
        <div class="segmented" role="radiogroup" aria-label=${e(`type`)}>
          ${[!1,!0].map(t=>j`<button
                type="button"
                role="radio"
                aria-checked=${this._temporary===t}
                class=${this._temporary===t?`selected`:``}
                @click=${()=>this._temporary=t}
              >
                <ha-icon icon=${t?`mdi:timer-sand`:`mdi:infinity`}></ha-icon>
                ${e(t?`temporary`:`permanent`)}
              </button>`)}
        </div>
        ${this._temporary?this.renderWindow(n):N}
        ${t===null&&this.windowProblem===null&&this._code?j`<p class="summary">${this.summary(this.draft())}</p>`:N}
        <div class="actions">
          <button
            type="button"
            @click=${()=>{this.close()}}
          >
            ${e(`cancel`)}
          </button>
          <button type="submit" class="primary" ?disabled=${this._busy}>
            ${this._busy?e(`adding`):e(`add`)}
          </button>
        </div>
      </form>
    `}renderWindow(e){let t=this.t;return j`
      <div class="presets" role="radiogroup">
        ${Re.map(e=>j`<button
              type="button"
              role="radio"
              aria-checked=${this._preset===e}
              class=${this._preset===e?`selected`:``}
              @click=${()=>{this.applyPreset(e)}}
            >
              ${t(`preset_${e}`)}
            </button>`)}
      </div>
      ${this._preset===`custom`?j`<div class="window">
              <label>
                ${t(`valid_from`)}
                <input
                  type="datetime-local"
                  .value=${this._start}
                  @input=${e=>this._start=e.target.value}
                />
              </label>
              <label>
                ${t(`valid_until`)}
                <input
                  type="datetime-local"
                  .value=${this._end}
                  aria-invalid=${e!==null}
                  @input=${e=>this._end=e.target.value}
                />
              </label>
            </div>`:N}
      ${e?j`<span class="error">${t(e)}</span>`:N}
      <p class="muted small">${t(`clock_note`)}</p>
    `}renderAdded(e){let t=this.t;return j`
      <div class="added">
        <div class="tick"><ha-icon icon="mdi:check"></ha-icon></div>
        <h2 id="heading">${t(`success`)}</h2>
        <div class="big-code mono">${e.code}</div>
        <p class="summary">${this.summary(e)}</p>
        <div class="share">
          <button @click=${()=>void this.onShare?.(e,!1)}>
            <ha-icon icon="mdi:content-copy"></ha-icon>${t(`copy`)}
          </button>
          <button @click=${()=>void this.onShare?.(e,!0)}>
            <ha-icon icon="mdi:share-variant-outline"></ha-icon>${t(`share`)}
          </button>
        </div>
        <div class="actions">
          <button
            class="primary"
            @click=${()=>{this.close()}}
          >
            ${t(`done`)}
          </button>
        </div>
      </div>
    `}static{this.styles=[G,o`
      dialog {
        background: var(--card-background-color, #fff);
        border: none;
        border-radius: var(--ha-dialog-border-radius, 24px);
        box-sizing: border-box;
        color: var(--primary-text-color);
        max-height: calc(100dvh - 32px);
        max-width: calc(100vw - 32px);
        overflow-y: auto;
        padding: 24px;
        width: 460px;
      }
      dialog::backdrop {
        background: rgb(0 0 0 / 0.45);
      }
      form,
      .added {
        display: grid;
        gap: 16px;
      }
      .mono {
        font-family: var(--ha-font-family-code, monospace);
      }
      .code-row {
        display: flex;
        gap: 8px;
      }
      .code {
        font-family: var(--ha-font-family-code, monospace);
        font-size: 1.6rem;
        letter-spacing: 0.3em;
        min-height: 52px;
        text-align: center;
      }
      .code-row button.icon {
        border: 1px solid var(--divider-color);
        border-radius: 12px;
        min-height: 52px;
        min-width: 52px;
      }
      .segmented {
        border: 1px solid var(--divider-color);
        border-radius: 20px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        overflow: hidden;
      }
      .segmented button {
        border: none;
        border-radius: 0;
        justify-content: center;
      }
      .segmented button.selected,
      .presets button.selected {
        background: color-mix(in srgb, var(--primary-color) 18%, transparent);
        border-color: transparent;
        color: var(--primary-color);
        font-weight: 500;
      }
      .presets {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .presets button {
        font-size: 0.85rem;
        min-height: 32px;
        padding: 0 12px;
      }
      .window {
        display: grid;
        gap: 12px;
        grid-template-columns: 1fr 1fr;
      }
      @media (max-width: 480px) {
        .window {
          grid-template-columns: 1fr;
        }
      }
      [aria-invalid="true"] {
        border-color: var(--error-color);
      }
      .summary {
        background: color-mix(in srgb, var(--primary-color) 8%, transparent);
        border-radius: 12px;
        line-height: 1.4;
        margin: 0;
        padding: 10px 12px;
      }
      .actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      .added {
        justify-items: center;
        text-align: center;
      }
      .added .actions {
        justify-self: stretch;
      }
      .tick {
        align-items: center;
        background: color-mix(in srgb, var(--success-color, #43a047) 18%, transparent);
        border-radius: 50%;
        color: var(--success-color, #43a047);
        display: flex;
        height: 56px;
        justify-content: center;
        width: 56px;
      }
      .tick ha-icon {
        --mdc-icon-size: 32px;
      }
      .big-code {
        font-size: 2.4rem;
        font-weight: 500;
        letter-spacing: 0.25em;
      }
      .share {
        display: flex;
        gap: 8px;
      }
    `]}};customElements.get(`populife-passcode-dialog`)||customElements.define(`populife-passcode-dialog`,Ye);var Xe=[`all`,`unlocks`,`failed`,`alarms`],Ze=class extends V{static{this.properties={hass:{attribute:!1},safe:{attribute:!1},narrow:{type:Boolean},_list:{state:!0},_operations:{state:!0},_filter:{state:!0},_revealed:{state:!0},_busy:{state:!0},_confirm:{state:!0}}}constructor(){super(),this.watched=``,this._list=null,this._operations=null,this._filter=`all`,this._revealed=/* @__PURE__ */ new Set,this._busy=null,this._confirm={heading:``,text:``,label:``,danger:!1}}get t(){return U(this.hass.locale?.language??this.hass.language)}get language(){return this.hass.locale?.language??this.hass.language}entity(e){let t=this.safe.entities[e];return t?this.hass.states[t]:void 0}willUpdate(e){e.has(`safe`)&&(this._list=null,this._operations=null,this.watched=``)}updated(e){if(!e.has(`hass`)&&!e.has(`safe`))return;let t=[this.entity(`passcodes`),this.entity(`operation`)].map(e=>e?.last_updated??``).join(`|`);t!==this.watched&&(this.watched=t,this.loadPasscodes(),this.loadActivity())}async loadPasscodes(){if(this.safe.can_operate)try{this._list=await this.hass.callWS({type:`populife/passcodes`,entry_id:this.safe.entry_id})}catch(e){this.toast(this.t(`failed`,{error:$(e)}))}}async loadActivity(){let e=this.safe.entities.operation;if(!e){this._operations=[];return}let t=/* @__PURE__ */ new Date(Date.now()-6048e5);try{let n=await this.hass.callWS({type:`history/history_during_period`,start_time:t.toISOString(),entity_ids:[e],minimal_response:!1,no_attributes:!1,significant_changes_only:!1});this._operations=Le(n,e)}catch{this._operations=[]}}toast(e){this.dispatchEvent(new CustomEvent(`hass-notification`,{detail:{message:e},bubbles:!0,composed:!0}))}async run(e,t){this._busy=e;try{return await t(),!0}catch(e){return this.toast(this.t(`failed`,{error:$(e)})),!1}finally{this._busy=null}}async confirm(e,t,n,r){this._confirm={heading:e,text:t,label:n,danger:r},await this.updateComplete;let i=this.shadowRoot?.querySelector(`populife-confirm`);return i?i.ask():!1}async setLocked(e){let t=this.safe.entities.lock;t&&await this.run(`lock`,()=>this.hass.callService(`lock`,e?`lock`:`unlock`,{entity_id:t}))}press(e){let t=this.safe.entities[e];return this.run(e,()=>this.hass.callService(`button`,`press`,{entity_id:t}))}async addPasscode(e){let t={entity_id:this.safe.entities.lock,code:e.code};e.name&&(t.name=e.name),e.end&&(t.end=e.end,e.start&&(t.start=e.start));try{await this.hass.callService(`populife`,`add_passcode`,t)}catch(e){throw this.toast(this.t(`failed`,{error:$(e)})),e}await this.loadPasscodes()}async deletePasscode(e){let t=this.t,n=e.name??t(`unnamed`);await this.confirm(t(`confirm_delete`,{name:n}),t(`confirm_delete_text`),t(`delete`),!0)&&await this.run(`delete:${e.code}`,()=>this.hass.callService(`populife`,`delete_passcode`,{entity_id:this.safe.entities.lock,code:e.code}))&&await this.loadPasscodes()}shareText(e){let t=this.t,n=e.end===null?``:t(`share_window`,{start:e.start?Z(e.start,this.language):`—`,end:Z(e.end,this.language)});return t(`share_text`,{safe:this.safe.title,code:e.code,window:n})}async share(e){let t=this.shareText(e);if(`share`in navigator)try{await navigator.share({text:t});return}catch{}await this.copy(t)}async copy(e){await navigator.clipboard.writeText(e),this.toast(this.t(`copied`))}toggleReveal(e){let t=new Set(this._revealed);t.delete(e)||t.add(e),this._revealed=t}render(){return j`
      <div class="layout ${this.narrow?`narrow`:``}">
        ${this.renderHero()}
        ${this.safe.can_operate?j`${this.renderPasscodes()} ${this.renderActivity()} ${this.renderFingerprints()}`:j`<div class="card wide empty">
                <ha-icon icon="mdi:shield-lock-outline"></ha-icon>
                <p>${this.t(`no_access`)}</p>
              </div>`}
      </div>
      <populife-passcode-dialog
        .hass=${this.hass}
        .safe=${this.safe}
        .knownCodes=${this._list?.passcodes.map(e=>e.code)??[]}
        .onSubmit=${e=>this.addPasscode(e)}
        .onShare=${(e,t)=>{let n={...e,name:e.name||null,type:null,on_safe:!0};return t?this.share(n):this.copy(this.shareText(n))}}
      ></populife-passcode-dialog>
      <populife-confirm
        .heading=${this._confirm.heading}
        .text=${this._confirm.text}
        .confirmLabel=${this._confirm.label}
        .cancelLabel=${this.t(`cancel`)}
        ?danger=${this._confirm.danger}
      ></populife-confirm>
    `}renderHero(){let e=this.t,t=this.entity(`lock`)?.state??`unavailable`,n=t===`locked`,r=t===`locking`||t===`unlocking`,i=t!==`unavailable`,a=n?`locked`:i?`open`:`gone`,o=e(t===`locked`||t===`unlocked`||t===`locking`||t===`unlocking`?t:i?`unknown`:`unavailable`);return j`
      <section class="card wide hero tone-${a}">
        <div class="hero-main">
          <div class="hero-badge">
            <ha-icon
              icon=${n?`mdi:lock`:i?`mdi:lock-open-variant`:`mdi:lock-question`}
            ></ha-icon>
          </div>
          <div class="hero-text">
            <div class="eyebrow">
              <span>${this.safe.title}</span>
              ${this.safe.can_operate&&this.safe.entities.refresh?j`<button
                      class="icon ghost"
                      title=${e(`refresh`)}
                      aria-label=${e(`refresh`)}
                      ?disabled=${this._busy!==null}
                      @click=${()=>void this.press(`refresh`)}
                    >
                      <ha-icon icon="mdi:refresh"></ha-icon>
                    </button>`:N}
            </div>
            <div class="state">${o}</div>
            <div class="last">${this.renderLastOpened()}</div>
          </div>
          ${this.safe.can_operate?j`<populife-hold-button
                  class="action ${n?``:`attention`}"
                  icon=${n?`mdi:lock-open-variant`:`mdi:lock`}
                  label=${e(n?`unlock`:`lock`)}
                  hint=${e(n?`hold_to_unlock`:`tap_to_lock`)}
                  ?hold=${n}
                  ?disabled=${!i||r}
                  ?busy=${this._busy===`lock`||r}
                  @activate=${()=>void this.setLocked(!n)}
                ></populife-hold-button>`:N}
        </div>
        <div class="stats">${this.renderStats()}</div>
      </section>
    `}renderLastOpened(){let e=this.t,t=this.entity(`last_unlock`)?.state;if(t===void 0||Number.isNaN(Date.parse(t)))return j`${e(`last_unlock`)}: ${e(`never`)}`;let n=this.entity(`last_unlocked_by`)?.state,r=this.entity(`last_unlock_method`)?.state,i=n&&n!==`unknown`&&n!==`unavailable`?n:null,a=r&&r in q?e(r===`app`&&i?`via_ha`:W(r)):null;return j`
      <ha-icon icon="mdi:history"></ha-icon>
      <span>${X(new Date(t),/* @__PURE__ */ new Date,this.language)}</span>
      ${i?j`${Q(i,`xs`)}<b>${i}</b>`:N}
      ${a?j`<span class="dot">·</span><span>${a}</span>`:N}
    `}renderStats(){let e=this.t,t=[],n=Number(this.entity(`battery`)?.state);if(!Number.isNaN(n)){let r=Be(n);t.push(j`<div class="stat ${r}">
          <div class="stat-icon">
            <ha-icon
              icon=${r===`bad`?`mdi:battery-alert-variant-outline`:`mdi:battery-high`}
            ></ha-icon>
          </div>
          <div class="stat-body">
            <div class="stat-label">${e(`battery`)}</div>
            <div class="stat-value">${n}%</div>
            <div class="meter">
              <span style="width:${Math.min(Math.max(n,0),100)}%"></span>
            </div>
          </div>
        </div>`)}let r=Number(this.entity(`signal`)?.state);if(!Number.isNaN(r)){let n=Ve(r),i=n===`excellent`?3:n===`good`?2:1;t.push(j`<div class="stat ${n===`weak`?`warn`:`info`}" title=${`${r} dBm`}>
          <div class="stat-icon"><ha-icon icon="mdi:bluetooth"></ha-icon></div>
          <div class="stat-body">
            <div class="stat-label">${e(`signal`)}</div>
            <div class="stat-value">${e(`signal_short_${n}`)}</div>
            <div class="bars" aria-hidden="true">
              ${[1,2,3].map(e=>j`<span class=${e<=i?`on`:``}></span>`)}
            </div>
          </div>
        </div>`)}let i=Number(this.entity(`clock_drift`)?.state);if(!Number.isNaN(i)){let n=Math.abs(i)>=60;t.push(j`<div class="stat ${n?`warn`:`info`}">
          <div class="stat-icon"><ha-icon icon="mdi:clock-outline"></ha-icon></div>
          <div class="stat-body">
            <div class="stat-label">${e(`clock`)}</div>
            <div class="stat-value">
              ${n?e(`clock_drift_short`,{seconds:Math.round(i)}):e(`clock_ok`)}
            </div>
            ${n&&this.safe.can_operate&&this.safe.entities.sync_clock?j`<button
                    class="link"
                    ?disabled=${this._busy!==null}
                    @click=${()=>void this.press(`sync_clock`)}
                  >
                    ${e(`sync_clock`)}
                  </button>`:N}
          </div>
        </div>`)}let a=Number(this.entity(`auto_lock`)?.state);return Number.isNaN(a)||t.push(j`<div class="stat info">
          <div class="stat-icon"><ha-icon icon="mdi:timer-lock-outline"></ha-icon></div>
          <div class="stat-body">
            <div class="stat-label">${e(`auto_lock`)}</div>
            <div class="stat-value">
              ${a>0?e(`seconds`,{seconds:a}):e(`off`)}
            </div>
          </div>
        </div>`),t}renderPasscodes(){let e=this.t;if(!this.safe.admin_key)return j`<section class="card">
        <div class="card-header"><h2>${e(`passcodes`)}</h2></div>
        <div class="empty inline">
          <ha-icon icon="mdi:key-alert-outline"></ha-icon>
          <p>${e(`passcodes_admin_only`)}</p>
        </div>
      </section>`;let t=this._list?.passcodes,n=/* @__PURE__ */ new Date;return j`
      <section class="card passcodes">
        <div class="card-header">
          <h2>
            ${e(`passcodes`)}
            ${t?.length?j`<span class="count">${t.length}</span>`:N}
          </h2>
          <button
            class="primary"
            @click=${()=>{this.shadowRoot?.querySelector(`populife-passcode-dialog`)?.open()}}
          >
            <ha-icon icon="mdi:plus"></ha-icon>${e(`add_passcode`)}
          </button>
        </div>
        ${t===void 0?j`<p class="muted">${e(`loading`)}</p>`:t.length===0?j`<div class="empty inline">
                  <ha-icon icon="mdi:dialpad"></ha-icon>
                  <p>${e(`no_passcodes`)}</p>
                </div>`:j`<ul class="list">
                  ${t.map(e=>this.renderPasscode(e,n))}
                </ul>`}
      </section>
    `}renderPasscode(e,t){let n=this.t,r=Pe(e,t),i=this._revealed.has(e.code),a=r===`active`?Ge(e,t):null;return j`<li class="passcode ${r}">
      ${e.name?Q(e.name):j`<div class="avatar unnamed"><ha-icon icon="mdi:dialpad"></ha-icon></div>`}
      <div class="grow">
        <div class="name-row">
          <span class="name">${e.name??n(`unnamed`)}</span>
          ${this.statusChip(e,r)}
        </div>
        <div class="small muted">
          <span class="code">${i?e.code:Fe(e.code)}</span>
          ${e.on_safe?N:j`<span class="chip neutral">${n(`not_on_safe`)}</span>`}
          ${this.renderLastUsed(e)}
        </div>
        ${a===null?N:j`<div class="timeleft" title=${Z(e.end??``,this.language)}>
                <div class="meter"><span style="width:${(1-a)*100}%"></span></div>
                <span class="small muted">
                  ${n(`ends`,{when:X(new Date(e.end??``),t,this.language)})}
                </span>
              </div>`}
      </div>
      <div class="row-actions">
        <button
          class="icon"
          title=${n(i?`hide_code`:`show_code`)}
          aria-label=${n(i?`hide_code`:`show_code`)}
          @click=${()=>{this.toggleReveal(e.code)}}
        >
          <ha-icon icon=${i?`mdi:eye-off-outline`:`mdi:eye-outline`}></ha-icon>
        </button>
        <button
          class="icon"
          title=${n(`share`)}
          aria-label=${n(`share`)}
          @click=${()=>void this.share(e)}
        >
          <ha-icon icon="mdi:share-variant-outline"></ha-icon>
        </button>
        <button
          class="icon delete"
          title=${n(`delete`)}
          aria-label=${n(`delete`)}
          ?disabled=${this._busy===`delete:${e.code}`}
          @click=${()=>void this.deletePasscode(e)}
        >
          <ha-icon icon="mdi:delete-outline"></ha-icon>
        </button>
      </div>
    </li>`}renderLastUsed(e){let t=He(e.name,this._operations??[]);return t?j`<span class="used"
          >${this.t(`used`,{when:X(t,/* @__PURE__ */ new Date,this.language)})}</span
        >`:N}statusChip(e,t){let n=this.t;switch(t){case`permanent`:return j`<span class="chip neutral">${n(`status_permanent`)}</span>`;case`expired`:return j`<span class="chip bad">${n(`status_expired`)}</span>`;case`upcoming`:return j`<span class="chip warn"
          >${n(`starts`,{when:X(new Date(e.start??``),/* @__PURE__ */ new Date,this.language)})}</span
        >`;case`active`:return j`<span class="chip ok">${n(`status_active`)}</span>`}}renderActivity(){let e=this.t,t=this._operations??[],n=Je(t),r=t.filter(e=>J(e,this._filter)),i=/* @__PURE__ */ new Date;return j`
      <section class="card activity">
        <div class="card-header">
          <h2>${e(`activity`)}</h2>
          <span class="small muted">${e(`week_summary`)}</span>
        </div>
        <div class="filters" role="tablist">
          ${Xe.map(t=>j`<button
                role="tab"
                aria-selected=${this._filter===t}
                class="filter ${t} ${this._filter===t?`selected`:``} ${(t===`failed`||t===`alarms`)&&n[t]>0?`hot`:``}"
                @click=${()=>this._filter=t}
              >
                <span class="filter-count">${n[t]}</span>
                <span class="filter-label">${e(`filter_${t}`)}</span>
              </button>`)}
        </div>
        ${this._operations===null?j`<p class="muted">${e(`loading`)}</p>`:r.length===0?j`<div class="empty inline">
                  <ha-icon icon="mdi:calendar-check-outline"></ha-icon>
                  <p>${e(`activity_empty`)}</p>
                </div>`:Ke(r).map(t=>j`<div class="day">
                      <div class="day-label">
                        ${(()=>{let n=qe(t.day,i);return n?e(n):new Intl.DateTimeFormat(this.language,{weekday:`long`,day:`numeric`,month:`long`}).format(t.day)})()}
                      </div>
                      <ul class="timeline">
                        ${t.operations.map(e=>this.renderOperation(e))}
                      </ul>
                    </div>`)}
      </section>
    `}renderOperation(e){let t=this.t,n=e.method===`failed`||e.method===`alarm`,r=new Intl.DateTimeFormat(this.language,{timeStyle:`short`}).format(e.when),i=[n?null:t(W(e.method))+(e.credential?` #${e.credential}`:``),e.via===`home_assistant`?t(`via_ha`):null,r].filter(Boolean);return j`<li class="op m-${e.method} ${n?`alert`:``}">
      <div class="op-icon">
        <ha-icon icon=${q[e.method]??q.other}></ha-icon>
      </div>
      <div class="grow">
        <div class="op-title">${t(n?W(e.method):De(e.action))}</div>
        <div class="small muted">${i.join(` · `)}</div>
      </div>
      ${e.user?j`<div class="who">${Q(e.user,`sm`)}<span>${e.user}</span></div>`:N}
    </li>`}renderFingerprints(){let e=this.t;if(!this.safe.admin_key)return N;let t=this._list?.fingerprints??[];return j`
      <section class="card fingerprints">
        <div class="card-header">
          <h2>
            ${e(`fingerprints`)}
            ${t.length?j`<span class="count">${t.length}</span>`:N}
          </h2>
        </div>
        ${t.length===0?j`<div class="empty inline">
                <ha-icon icon="mdi:fingerprint-off"></ha-icon>
                <p>${e(`no_fingerprints`)}</p>
              </div>`:j`<ul class="fp-grid">
                ${t.map(t=>j`<li>
                      <ha-icon icon="mdi:fingerprint"></ha-icon>
                      <div>
                        <div class="name">${e(`slot`,{slot:t.slot})}</div>
                        <div class="small muted">
                          ${t.end?e(`until`,{when:Z(t.end,this.language)}):e(`status_permanent`)}
                        </div>
                      </div>
                    </li>`)}
              </ul>`}
        <p class="muted small note">
          <ha-icon icon="mdi:information-outline"></ha-icon>${e(`fingerprints_note`)}
        </p>
      </section>
    `}static{this.styles=[G,o`
      :host {
        --m-app: #009688;
        --m-keypad: #3f51b5;
        --m-fingerprint: #9c27b0;
        --m-card: #ff9800;
        --m-key: #795548;
        --m-gateway: #607d8b;
        --m-remote: #00bcd4;
        --m-failed: var(--error-color, #db4437);
        --m-alarm: var(--error-color, #db4437);
        --m-other: var(--secondary-text-color);
        --radius: var(--ha-card-border-radius, 16px);
      }
      .layout {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin: 0 auto;
        max-width: 1120px;
        padding: 16px;
      }
      .layout.narrow {
        grid-template-columns: minmax(0, 1fr);
        padding: 8px;
      }
      .wide {
        grid-column: 1 / -1;
      }
      .card {
        animation: rise 0.35s ease both;
        border-radius: var(--radius);
      }
      @keyframes rise {
        from {
          opacity: 0;
          transform: translateY(6px);
        }
      }
      h2 {
        align-items: center;
        display: flex;
        gap: 8px;
      }
      .count {
        background: var(--secondary-background-color);
        border-radius: 10px;
        color: var(--secondary-text-color);
        font-size: 0.75rem;
        font-weight: 500;
        padding: 1px 8px;
      }

      /* Hero */
      .hero {
        --tone: var(--secondary-text-color);
        background:
          radial-gradient(
            120% 140% at 0% 0%,
            color-mix(in srgb, var(--tone) 16%, transparent) 0%,
            transparent 55%
          ),
          var(--ha-card-background, var(--card-background-color, #fff));
        overflow: hidden;
        padding: 20px;
      }
      .tone-locked {
        --tone: var(--state-lock-locked-color, var(--success-color, #43a047));
      }
      .tone-open {
        --tone: var(--state-lock-unlocked-color, var(--error-color, #db4437));
      }
      .tone-gone {
        --tone: var(--disabled-text-color, var(--secondary-text-color));
      }
      .hero-main {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 16px 20px;
      }
      .hero-badge {
        align-items: center;
        background: color-mix(in srgb, var(--tone) 18%, transparent);
        border-radius: 22px;
        color: var(--tone);
        display: flex;
        flex: none;
        height: 72px;
        justify-content: center;
        width: 72px;
      }
      .hero-badge ha-icon {
        --mdc-icon-size: 40px;
      }
      .hero-text {
        display: grid;
        flex: 1 1 240px;
        gap: 4px;
        min-width: 0;
      }
      .eyebrow {
        align-items: center;
        color: var(--secondary-text-color);
        display: flex;
        font-size: 0.8rem;
        font-weight: 500;
        gap: 4px;
        justify-content: space-between;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .eyebrow span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .ghost {
        color: var(--secondary-text-color);
        min-height: 32px;
        min-width: 32px;
      }
      .state {
        color: var(--tone);
        font-size: clamp(1.8rem, 4vw, 2.6rem);
        font-weight: 600;
        letter-spacing: -0.02em;
        line-height: 1.1;
      }
      .last {
        align-items: center;
        color: var(--secondary-text-color);
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .last ha-icon {
        --mdc-icon-size: 16px;
      }
      .last b {
        color: var(--primary-text-color);
        font-weight: 500;
      }
      .dot {
        opacity: 0.6;
      }
      .action {
        --hold-color: var(--primary-color);
        margin: 0 auto;
      }
      .action.attention {
        --hold-color: var(--tone);
        animation: pulse 2.2s ease-in-out infinite;
        border-radius: 50%;
      }
      @keyframes pulse {
        50% {
          filter: drop-shadow(0 0 12px color-mix(in srgb, var(--tone) 55%, transparent));
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .card,
        .action.attention {
          animation: none;
        }
      }
      .stats {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        margin-top: 18px;
      }
      .stat {
        --c: var(--primary-color);
        align-items: center;
        background: color-mix(
          in srgb,
          var(--c) 9%,
          var(--ha-card-background, var(--card-background-color, #fff))
        );
        border: 1px solid color-mix(in srgb, var(--c) 14%, transparent);
        border-radius: 16px;
        display: flex;
        gap: 12px;
        padding: 12px 14px;
      }
      .stat.ok {
        --c: var(--success-color, #43a047);
      }
      .stat.warn {
        --c: var(--warning-color, #ffa600);
      }
      .stat.bad {
        --c: var(--error-color, #db4437);
      }
      .stat-icon {
        align-items: center;
        background: color-mix(in srgb, var(--c) 20%, transparent);
        border-radius: 50%;
        color: color-mix(in srgb, var(--c) 65%, var(--primary-text-color));
        display: flex;
        flex: none;
        height: 36px;
        justify-content: center;
        width: 36px;
      }
      .stat-body {
        display: grid;
        gap: 2px;
        min-width: 0;
      }
      .stat-label {
        color: var(--secondary-text-color);
        font-size: 0.72rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .stat-value {
        font-size: 1.05rem;
        font-weight: 600;
      }
      .meter {
        background: color-mix(in srgb, var(--c, var(--primary-color)) 18%, transparent);
        border-radius: 3px;
        height: 4px;
        overflow: hidden;
        width: 100%;
      }
      .meter span {
        background: var(--c, var(--primary-color));
        border-radius: 3px;
        display: block;
        height: 100%;
      }
      .bars {
        align-items: flex-end;
        display: flex;
        gap: 2px;
        height: 10px;
      }
      .bars span {
        background: color-mix(in srgb, var(--c) 25%, transparent);
        border-radius: 1px;
        width: 4px;
      }
      .bars span:nth-child(1) {
        height: 4px;
      }
      .bars span:nth-child(2) {
        height: 7px;
      }
      .bars span:nth-child(3) {
        height: 10px;
      }
      .bars span.on {
        background: var(--c);
      }
      button.link {
        border: none;
        color: var(--c);
        font-size: 0.8rem;
        font-weight: 600;
        justify-content: flex-start;
        min-height: 0;
        padding: 0;
      }
      button.link:hover:not([disabled]) {
        background: none;
        text-decoration: underline;
      }

      /* Lists */
      .list {
        display: grid;
        gap: 4px;
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .list li {
        align-items: center;
        border-radius: 12px;
        display: flex;
        gap: 12px;
        min-height: 60px;
        padding: 8px;
        transition: background 0.15s ease;
      }
      .list li:hover {
        background: color-mix(in srgb, var(--primary-text-color) 4%, transparent);
      }
      .grow {
        display: grid;
        flex: 1;
        gap: 3px;
        grid-template-columns: minmax(0, 1fr);
        min-width: 0;
      }
      .name-row {
        align-items: center;
        display: flex;
        gap: 8px;
        min-width: 0;
      }
      .name {
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .grow .small {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .chip {
        flex: none;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .code {
        background: var(--secondary-background-color);
        border-radius: 6px;
        color: var(--primary-text-color);
        font-family: var(--ha-font-family-code, monospace);
        letter-spacing: 0.15em;
        padding: 1px 6px;
      }
      .passcode.expired .name,
      .passcode.expired .code,
      .passcode.expired .avatar {
        opacity: 0.5;
      }
      .timeleft {
        align-items: center;
        display: flex;
        gap: 8px;
        margin-top: 2px;
      }
      .timeleft .meter {
        --c: var(--success-color, #43a047);
        flex: 0 1 120px;
      }
      .row-actions {
        display: flex;
        flex: none;
      }
      .narrow .row-actions button.icon {
        min-height: 36px;
        min-width: 36px;
      }
      .delete:hover:not([disabled]) {
        color: var(--error-color);
      }
      .used {
        color: var(--secondary-text-color);
      }

      /* Avatars */
      .avatar {
        align-items: center;
        background: hsl(var(--hue) 70% 50% / 0.2);
        border-radius: 50%;
        /* Mixed with the text colour, so it reads on light and dark themes alike. */
        color: color-mix(in srgb, hsl(var(--hue) 65% 48%) 70%, var(--primary-text-color));
        display: flex;
        flex: none;
        font-size: 0.9rem;
        font-weight: 600;
        height: 40px;
        justify-content: center;
        width: 40px;
      }
      .avatar.unnamed {
        background: var(--secondary-background-color);
        color: var(--secondary-text-color);
      }
      .avatar.sm {
        font-size: 0.7rem;
        height: 24px;
        width: 24px;
      }
      .avatar.xs {
        font-size: 0.6rem;
        height: 18px;
        width: 18px;
      }

      /* Activity */
      .filters {
        display: grid;
        gap: 8px;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        margin-bottom: 8px;
      }
      .filter {
        --c: var(--primary-color);
        align-items: flex-start;
        border: 1px solid var(--divider-color);
        border-radius: 14px;
        flex-direction: column;
        transition:
          background 0.15s ease,
          border-color 0.15s ease;
        gap: 0;
        justify-content: center;
        min-height: 56px;
        padding: 6px 12px;
      }
      .filter.failed,
      .filter.alarms {
        --c: var(--error-color, #db4437);
      }
      .filter-count {
        font-size: 1.3rem;
        font-weight: 600;
        line-height: 1.2;
      }
      .filter-label {
        color: var(--secondary-text-color);
        text-align: start;
        font-size: 0.75rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        width: 100%;
      }
      .filter.selected {
        background: color-mix(in srgb, var(--c) 12%, transparent);
        border-color: color-mix(in srgb, var(--c) 45%, transparent);
      }
      .filter.hot .filter-count,
      .filter.selected .filter-count {
        color: var(--c);
      }
      .day-label {
        color: var(--secondary-text-color);
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.05em;
        margin: 14px 0 4px 4px;
        text-transform: uppercase;
      }
      .timeline {
        list-style: none;
        margin: 0;
        padding: 0;
        position: relative;
      }
      .timeline::before {
        background: var(--divider-color);
        bottom: 24px;
        content: "";
        left: 21px;
        position: absolute;
        top: 24px;
        width: 2px;
      }
      .op {
        align-items: center;
        border-radius: 12px;
        display: flex;
        gap: 12px;
        padding: 6px 4px;
        position: relative;
      }
      .op-icon {
        --c: var(--m-other);
        align-items: center;
        background: color-mix(in srgb, var(--c) 16%, var(--card-background-color, #fff));
        border: 2px solid var(--card-background-color, #fff);
        border-radius: 50%;
        color: var(--c);
        display: flex;
        flex: none;
        height: 36px;
        justify-content: center;
        width: 36px;
        z-index: 1;
      }
      .m-app .op-icon {
        --c: var(--m-app);
      }
      .m-keypad .op-icon {
        --c: var(--m-keypad);
      }
      .m-fingerprint .op-icon {
        --c: var(--m-fingerprint);
      }
      .m-card .op-icon {
        --c: var(--m-card);
      }
      .m-key .op-icon {
        --c: var(--m-key);
      }
      .m-gateway .op-icon {
        --c: var(--m-gateway);
      }
      .m-remote .op-icon {
        --c: var(--m-remote);
      }
      .m-failed .op-icon,
      .m-alarm .op-icon {
        --c: var(--m-failed);
      }
      .op.alert .op-title {
        color: var(--error-color);
      }
      .op-title {
        font-weight: 500;
      }
      .who {
        align-items: center;
        background: var(--secondary-background-color);
        border-radius: 14px;
        display: flex;
        flex: none;
        font-size: 0.8rem;
        font-weight: 500;
        gap: 6px;
        max-width: 45%;
        padding: 3px 10px 3px 3px;
      }
      .who span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* Fingerprints */
      .fp-grid {
        display: grid;
        gap: 8px;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .fp-grid li {
        align-items: center;
        background: color-mix(
          in srgb,
          var(--m-fingerprint) 8%,
          var(--ha-card-background, var(--card-background-color, #fff))
        );
        border: 1px solid color-mix(in srgb, var(--m-fingerprint) 16%, transparent);
        border-radius: 16px;
        display: flex;
        gap: 10px;
        padding: 10px 12px;
      }
      .fp-grid ha-icon {
        color: color-mix(in srgb, var(--m-fingerprint) 65%, var(--primary-text-color));
      }
      .note {
        align-items: flex-start;
        display: flex;
        gap: 6px;
        margin-bottom: 0;
      }
      .note ha-icon {
        --mdc-icon-size: 16px;
        flex: none;
      }

      /* Empty states */
      .empty {
        align-items: center;
        color: var(--secondary-text-color);
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 24px;
        text-align: center;
      }
      .empty ha-icon {
        --mdc-icon-size: 40px;
        opacity: 0.5;
      }
      .empty p {
        margin: 0;
        max-width: 420px;
      }
      .empty.inline {
        padding: 16px 8px;
      }
    `]}};function Q(e,t=``){return j`<div class="avatar ${t}" style="--hue:${We(e)}" aria-hidden="true">
    ${Ue(e)}
  </div>`}function $(e){return typeof e==`object`&&e&&`message`in e?String(e.message):String(e)}customElements.get(`populife-safe`)||customElements.define(`populife-safe`,Ze);var Qe=class extends V{static{this.properties={hass:{attribute:!1},narrow:{type:Boolean},_safes:{state:!0},_selected:{state:!0}}}constructor(){super(),this.narrow=!1,this._safes=null,this._selected=null}willUpdate(e){e.has(`hass`)&&this._safes===null&&this.hass&&this.loadSafes(this.hass)}async loadSafes(e){this._safes=[];let{safes:t}=await e.callWS({type:`populife/safes`});this._safes=t,this._selected=t[0]?.entry_id??null}render(){if(!this.hass)return N;let e=U(this.hass.locale?.language??this.hass.language),t=this._safes??[],n=t.find(e=>e.entry_id===this._selected);return j`
      <header class="toolbar">
        <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
        <div class="title">${e(`title`)}</div>
        ${t.length>1?j`<select
                aria-label=${e(`title`)}
                @change=${e=>this._selected=e.target.value}
              >
                ${t.map(e=>j`<option value=${e.entry_id} ?selected=${e.entry_id===this._selected}>
                      ${e.title}
                    </option>`)}
              </select>`:N}
      </header>
      <main>
        ${this._safes===null?j`<p class="message muted">${e(`loading`)}</p>`:n===void 0?j`<p class="message muted">${e(`no_safes`)}</p>`:j`<populife-safe
                  .hass=${this.hass}
                  .safe=${n}
                  ?narrow=${this.narrow}
                ></populife-safe>`}
      </main>
    `}static{this.styles=[G,o`
      :host {
        background: var(--primary-background-color);
        display: block;
        min-height: 100vh;
      }
      .toolbar {
        align-items: center;
        background: var(--app-header-background-color, var(--primary-color));
        color: var(--app-header-text-color, var(--text-primary-color, #fff));
        display: flex;
        gap: 8px;
        height: var(--header-height, 56px);
        padding: 0 12px;
        position: sticky;
        top: 0;
        z-index: 2;
      }
      .title {
        flex: 1;
        font-size: 1.25rem;
        margin-left: 8px;
      }
      .toolbar select {
        background: transparent;
        border-color: currentColor;
        color: inherit;
        max-width: 50%;
        width: auto;
      }
      .message {
        padding: 32px;
        text-align: center;
      }
    `]}};customElements.get(`populife-panel`)||customElements.define(`populife-panel`,Qe);export{Qe as PopulifePanel};