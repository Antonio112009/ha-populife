var e=globalThis,t=e.ShadowRoot&&(e.ShadyCSS===void 0||e.ShadyCSS.nativeShadow)&&`adoptedStyleSheets`in Document.prototype&&`replace`in CSSStyleSheet.prototype,n=Symbol(),r=/* @__PURE__ */ new WeakMap,i=class{constructor(e,t,r){if(this._$cssResult$=!0,r!==n)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,n=this.t;if(t&&e===void 0){let t=n!==void 0&&n.length===1;t&&(e=r.get(n)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),t&&r.set(n,e))}return e}toString(){return this.cssText}},a=e=>new i(typeof e==`string`?e:e+``,void 0,n),o=(e,...t)=>new i(e.length===1?e[0]:t.reduce((t,n,r)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if(typeof e==`number`)return e;throw Error(`Value passed to 'css' function must be a 'css' function result: `+e+`. Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.`)})(n)+e[r+1],e[0]),e,n),s=(n,r)=>{if(t)n.adoptedStyleSheets=r.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let t of r){let r=document.createElement(`style`),i=e.litNonce;i!==void 0&&r.setAttribute(`nonce`,i),r.textContent=t.cssText,n.appendChild(r)}},c=t?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t=``;for(let n of e.cssRules)t+=n.cssText;return a(t)})(e):e,{is:l,defineProperty:u,getOwnPropertyDescriptor:d,getOwnPropertyNames:f,getOwnPropertySymbols:ee,getPrototypeOf:te}=Object,p=globalThis,m=p.trustedTypes,ne=m?m.emptyScript:``,re=p.reactiveElementPolyfillSupport,h=(e,t)=>e,g={toAttribute(e,t){switch(t){case Boolean:e=e?ne:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,t){let n=e;switch(t){case Boolean:n=e!==null;break;case Number:n=e===null?null:Number(e);break;case Object:case Array:try{n=JSON.parse(e)}catch{n=null}}return n}},_=(e,t)=>!l(e,t),v={attribute:!0,type:String,converter:g,reflect:!1,useDefault:!1,hasChanged:_};Symbol.metadata??=Symbol(`metadata`),p.litPropertyMetadata??=/* @__PURE__ */ new WeakMap;var y=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=v){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let n=Symbol(),r=this.getPropertyDescriptor(e,n,t);r!==void 0&&u(this.prototype,e,r)}}static getPropertyDescriptor(e,t,n){let{get:r,set:i}=d(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:r,set(t){let a=r?.call(this);i?.call(this,t),this.requestUpdate(e,a,n)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??v}static _$Ei(){if(this.hasOwnProperty(h(`elementProperties`)))return;let e=te(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(h(`finalized`)))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(h(`properties`))){let e=this.properties,t=[...f(e),...ee(e)];for(let n of t)this.createProperty(n,e[n])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[e,n]of t)this.elementProperties.set(e,n)}this._$Eh=/* @__PURE__ */ new Map;for(let[e,t]of this.elementProperties){let n=this._$Eu(e,t);n!==void 0&&this._$Eh.set(n,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let n=new Set(e.flat(1/0).reverse());for(let e of n)t.unshift(c(e))}else e!==void 0&&t.push(c(e));return t}static _$Eu(e,t){let n=t.attribute;return!1===n?void 0:typeof n==`string`?n:typeof e==`string`?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=/* @__PURE__ */ new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=/* @__PURE__ */ new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=/* @__PURE__ */ new Map,t=this.constructor.elementProperties;for(let n of t.keys())this.hasOwnProperty(n)&&(e.set(n,this[n]),delete this[n]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return s(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,n){this._$AK(e,n)}_$ET(e,t){let n=this.constructor.elementProperties.get(e),r=this.constructor._$Eu(e,n);if(r!==void 0&&!0===n.reflect){let i=(n.converter?.toAttribute===void 0?g:n.converter).toAttribute(t,n.type);this._$Em=e,i==null?this.removeAttribute(r):this.setAttribute(r,i),this._$Em=null}}_$AK(e,t){let n=this.constructor,r=n._$Eh.get(e);if(r!==void 0&&this._$Em!==r){let e=n.getPropertyOptions(r),i=typeof e.converter==`function`?{fromAttribute:e.converter}:e.converter?.fromAttribute===void 0?g:e.converter;this._$Em=r;let a=i.fromAttribute(t,e.type);this[r]=a??this._$Ej?.get(r)??a,this._$Em=null}}requestUpdate(e,t,n,r=!1,i){if(e!==void 0){let a=this.constructor;if(!1===r&&(i=this[e]),n??=a.getPropertyOptions(e),!((n.hasChanged??_)(i,t)||n.useDefault&&n.reflect&&i===this._$Ej?.get(e)&&!this.hasAttribute(a._$Eu(e,n))))return;this.C(e,t,n)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:n,reflect:r,wrapped:i},a){n&&!(this._$Ej??=/* @__PURE__ */ new Map).has(e)&&(this._$Ej.set(e,a??t??this[e]),!0!==i||a!==void 0)||(this._$AL.has(e)||(this.hasUpdated||n||(t=void 0),this._$AL.set(e,t)),!0===r&&this._$Em!==e&&(this._$Eq??=/* @__PURE__ */ new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}let e=this.constructor.elementProperties;if(e.size>0)for(let[t,n]of e){let{wrapped:e}=n,r=this[t];!0!==e||this._$AL.has(t)||r===void 0||this.C(t,void 0,n,r)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=/* @__PURE__ */ new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}};y.elementStyles=[],y.shadowRootOptions={mode:`open`},y[h(`elementProperties`)]=/* @__PURE__ */ new Map,y[h(`finalized`)]=/* @__PURE__ */ new Map,re?.({ReactiveElement:y}),(p.reactiveElementVersions??=[]).push(`2.1.2`);var b=globalThis,ie=e=>e,x=b.trustedTypes,ae=x?x.createPolicy(`lit-html`,{createHTML:e=>e}):void 0,oe=`$lit$`,S=`lit$${Math.random().toFixed(9).slice(2)}$`,C=`?`+S,se=`<${C}>`,w=document,T=()=>w.createComment(``),E=e=>e===null||typeof e!=`object`&&typeof e!=`function`,D=Array.isArray,ce=e=>D(e)||typeof e?.[Symbol.iterator]==`function`,O=`[ 	
\f\r]`,k=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,le=/-->/g,ue=/>/g,A=RegExp(`>|${O}(?:([^\\s"'>=/]+)(${O}*=${O}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,`g`),de=/'/g,fe=/"/g,j=/^(?:script|style|textarea|title)$/i,M=(e=>(t,...n)=>({_$litType$:e,strings:t,values:n}))(1),N=Symbol.for(`lit-noChange`),P=Symbol.for(`lit-nothing`),F=/* @__PURE__ */ new WeakMap,I=w.createTreeWalker(w,129);function L(e,t){if(!D(e)||!e.hasOwnProperty(`raw`))throw Error(`invalid template strings array`);return ae===void 0?t:ae.createHTML(t)}var pe=(e,t)=>{let n=e.length-1,r=[],i,a=t===2?`<svg>`:t===3?`<math>`:``,o=k;for(let t=0;t<n;t++){let n=e[t],s,c,l=-1,u=0;for(;u<n.length&&(o.lastIndex=u,c=o.exec(n),c!==null);)u=o.lastIndex,o===k?c[1]===`!--`?o=le:c[1]===void 0?c[2]===void 0?c[3]!==void 0&&(o=A):(j.test(c[2])&&(i=RegExp(`</`+c[2],`g`)),o=A):o=ue:o===A?c[0]===`>`?(o=i??k,l=-1):c[1]===void 0?l=-2:(l=o.lastIndex-c[2].length,s=c[1],o=c[3]===void 0?A:c[3]===`"`?fe:de):o===fe||o===de?o=A:o===le||o===ue?o=k:(o=A,i=void 0);let d=o===A&&e[t+1].startsWith(`/>`)?` `:``;a+=o===k?n+se:l>=0?(r.push(s),n.slice(0,l)+oe+n.slice(l)+S+d):n+S+(l===-2?t:d)}return[L(e,a+(e[n]||`<?>`)+(t===2?`</svg>`:t===3?`</math>`:``)),r]},R=class e{constructor({strings:t,_$litType$:n},r){let i;this.parts=[];let a=0,o=0,s=t.length-1,c=this.parts,[l,u]=pe(t,n);if(this.el=e.createElement(l,r),I.currentNode=this.el.content,n===2||n===3){let e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;(i=I.nextNode())!==null&&c.length<s;){if(i.nodeType===1){if(i.hasAttributes())for(let e of i.getAttributeNames())if(e.endsWith(oe)){let t=u[o++],n=i.getAttribute(e).split(S),r=/([.?@])?(.*)/.exec(t);c.push({type:1,index:a,name:r[2],strings:n,ctor:r[1]===`.`?he:r[1]===`?`?ge:r[1]===`@`?_e:V}),i.removeAttribute(e)}else e.startsWith(S)&&(c.push({type:6,index:a}),i.removeAttribute(e));if(j.test(i.tagName)){let e=i.textContent.split(S),t=e.length-1;if(t>0){i.textContent=x?x.emptyScript:``;for(let n=0;n<t;n++)i.append(e[n],T()),I.nextNode(),c.push({type:2,index:++a});i.append(e[t],T())}}}else if(i.nodeType===8){if(i.data===C)c.push({type:2,index:a});else{let e=-1;for(;(e=i.data.indexOf(S,e+1))!==-1;)c.push({type:7,index:a}),e+=S.length-1}}a++}}static createElement(e,t){let n=w.createElement(`template`);return n.innerHTML=e,n}};function z(e,t,n=e,r){if(t===N)return t;let i=r===void 0?n._$Cl:n._$Co?.[r],a=E(t)?void 0:t._$litDirective$;return i?.constructor!==a&&(i?._$AO?.(!1),a===void 0?i=void 0:(i=new a(e),i._$AT(e,n,r)),r===void 0?n._$Cl=i:(n._$Co??=[])[r]=i),i!==void 0&&(t=z(e,i._$AS(e,t.values),i,r)),t}var me=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:n}=this._$AD,r=(e?.creationScope??w).importNode(t,!0);I.currentNode=r;let i=I.nextNode(),a=0,o=0,s=n[0];for(;s!==void 0;){if(a===s.index){let t;s.type===2?t=new B(i,i.nextSibling,this,e):s.type===1?t=new s.ctor(i,s.name,s.strings,this,e):s.type===6&&(t=new ve(i,this,e)),this._$AV.push(t),s=n[++o]}a!==s?.index&&(i=I.nextNode(),a++)}return I.currentNode=w,r}p(e){let t=0;for(let n of this._$AV)n!==void 0&&(n.strings===void 0?n._$AI(e[t]):(n._$AI(e,n,t),t+=n.strings.length-2)),t++}},B=class e{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,n,r){this.type=2,this._$AH=P,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=n,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=z(this,e,t),E(e)?e===P||e==null||e===``?(this._$AH!==P&&this._$AR(),this._$AH=P):e!==this._$AH&&e!==N&&this._(e):e._$litType$===void 0?e.nodeType===void 0?ce(e)?this.k(e):this._(e):this.T(e):this.$(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==P&&E(this._$AH)?this._$AA.nextSibling.data=e:this.T(w.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:n}=e,r=typeof n==`number`?this._$AC(e):(n.el===void 0&&(n.el=R.createElement(L(n.h,n.h[0]),this.options)),n);if(this._$AH?._$AD===r)this._$AH.p(t);else{let e=new me(r,this),n=e.u(this.options);e.p(t),this.T(n),this._$AH=e}}_$AC(e){let t=F.get(e.strings);return t===void 0&&F.set(e.strings,t=new R(e)),t}k(t){D(this._$AH)||(this._$AH=[],this._$AR());let n=this._$AH,r,i=0;for(let a of t)i===n.length?n.push(r=new e(this.O(T()),this.O(T()),this,this.options)):r=n[i],r._$AI(a),i++;i<n.length&&(this._$AR(r&&r._$AB.nextSibling,i),n.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let t=ie(e).nextSibling;ie(e).remove(),e=t}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},V=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,n,r,i){this.type=1,this._$AH=P,this._$AN=void 0,this.element=e,this.name=t,this._$AM=r,this.options=i,n.length>2||n[0]!==``||n[1]!==``?(this._$AH=Array(n.length-1).fill(/* @__PURE__ */ new String),this.strings=n):this._$AH=P}_$AI(e,t=this,n,r){let i=this.strings,a=!1;if(i===void 0)e=z(this,e,t,0),a=!E(e)||e!==this._$AH&&e!==N,a&&(this._$AH=e);else{let r=e,o,s;for(e=i[0],o=0;o<i.length-1;o++)s=z(this,r[n+o],t,o),s===N&&(s=this._$AH[o]),a||=!E(s)||s!==this._$AH[o],s===P?e=P:e!==P&&(e+=(s??``)+i[o+1]),this._$AH[o]=s}a&&!r&&this.j(e)}j(e){e===P?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??``)}},he=class extends V{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===P?void 0:e}},ge=class extends V{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==P)}},_e=class extends V{constructor(e,t,n,r,i){super(e,t,n,r,i),this.type=5}_$AI(e,t=this){if((e=z(this,e,t,0)??P)===N)return;let n=this._$AH,r=e===P&&n!==P||e.capture!==n.capture||e.once!==n.once||e.passive!==n.passive,i=e!==P&&(n===P||r);r&&this.element.removeEventListener(this.name,this,n),i&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH==`function`?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},ve=class{constructor(e,t,n){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=n}get _$AU(){return this._$AM._$AU}_$AI(e){z(this,e)}},ye=b.litHtmlPolyfillSupport;ye?.(R,B),(b.litHtmlVersions??=[]).push(`3.3.3`);var be=(e,t,n)=>{let r=n?.renderBefore??t,i=r._$litPart$;if(i===void 0){let e=n?.renderBefore??null;r._$litPart$=i=new B(t.insertBefore(T(),e),e,void 0,n??{})}return i._$AI(e),i},H=globalThis,U=class extends y{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=be(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return N}};U._$litElement$=!0,U.finalized=!0,H.litElementHydrateSupport?.({LitElement:U});var xe=H.litElementPolyfillSupport;xe?.({LitElement:U}),(H.litElementVersions??=[]).push(`4.2.2`);var W={title:`Safe`,loading:`Loading…`,no_safes:`No Populife safe is set up yet.`,no_access:`You may not operate this safe. An admin can allow you under Settings → Devices & services → Populife → Configure.`,locked:`Locked`,unlocked:`Unlocked`,locking:`Locking…`,unlocking:`Unlocking…`,unknown:`Unknown`,unavailable:`Out of range`,lock:`Lock`,unlock:`Unlock`,confirm_unlock:`Unlock {name}?`,confirm_unlock_text:`The safe opens right away.`,cancel:`Cancel`,battery:`Battery`,signal:`Signal`,clock:`Clock`,clock_ok:`In sync`,clock_off:`{seconds} s off`,sync_clock:`Sync clock`,refresh:`Refresh`,last_unlock:`Last opened`,last_unlock_by:`by {user}`,never:`Not yet`,passcodes:`Passcodes`,passcodes_admin_only:`Managing passcodes needs the safe's admin key. Use Reconfigure to add it.`,add_passcode:`Add passcode`,no_passcodes:`No passcodes yet.`,unnamed:`Unnamed`,permanent:`Permanent`,temporary:`Temporary`,status_active:`Active`,status_upcoming:`Starts {when}`,status_expired:`Expired`,status_permanent:`Always`,until:`until {when}`,show_code:`Show code`,hide_code:`Hide code`,copy:`Copy`,copied:`Copied`,share:`Share`,share_text:`Your code for {safe}: {code}{window}`,share_window:` (valid {start} to {end})`,delete:`Delete`,confirm_delete:`Delete {name}'s passcode?`,confirm_delete_text:`It stops opening the safe right away.`,not_on_safe:`Not reported by the safe`,name:`Name`,name_hint:`Who it is for, e.g. Mom, or Guest this weekend`,code:`Code`,generate:`Generate`,type:`Type`,valid_from:`Valid from`,valid_until:`Valid until`,add:`Add`,adding:`Adding…`,added:`Passcode for {name} added`,error_empty:`Enter a code or generate one.`,error_digits:`Use digits only.`,error_length:`Use 4 to 9 digits.`,error_conflict:`Clashes with another code: one starts with the other.`,error_missing_end:`Pick when the code stops working.`,error_end_before_start:`The end must be after the start.`,clock_note:`The safe's clock is synced before a temporary code is written.`,activity:`Activity`,activity_empty:`Nothing in the last 7 days.`,filter_all:`All`,filter_unlocks:`Openings`,filter_failed:`Failed`,filter_alarms:`Alarms`,method_app:`App`,method_keypad:`Keypad`,method_fingerprint:`Fingerprint`,method_card:`Card`,method_key:`Mechanical key`,method_gateway:`Gateway`,method_remote:`Remote`,method_failed:`Failed attempt`,method_alarm:`Alarm`,method_other:`Other`,action_unlock:`Opened`,action_lock:`Locked`,action_other:`Event`,fingerprints:`Fingerprints`,fingerprints_note:`Fingerprints are enrolled at the safe itself; the sensor has to scan the finger.`,no_fingerprints:`No fingerprints enrolled.`,slot:`Slot {slot}`,failed:`Failed: {error}`},Se={en:W,ru:{title:`Сейф`,loading:`Загрузка…`,no_safes:`Сейф Populife ещё не настроен.`,no_access:`Вам нельзя управлять этим сейфом. Администратор может разрешить это в Настройки → Устройства и службы → Populife → Настроить.`,locked:`Заперт`,unlocked:`Открыт`,locking:`Запирается…`,unlocking:`Открывается…`,unknown:`Неизвестно`,unavailable:`Вне зоны`,lock:`Запереть`,unlock:`Открыть`,confirm_unlock:`Открыть {name}?`,confirm_unlock_text:`Сейф откроется сразу.`,cancel:`Отмена`,battery:`Батарея`,signal:`Сигнал`,clock:`Часы`,clock_ok:`Точно`,clock_off:`сбиты на {seconds} с`,sync_clock:`Синхронизировать`,refresh:`Обновить`,last_unlock:`Последнее открытие`,last_unlock_by:`{user}`,never:`Ещё не открывали`,passcodes:`Коды`,passcodes_admin_only:`Для управления кодами нужен admin-ключ сейфа. Добавьте его через «Перенастроить».`,add_passcode:`Добавить код`,no_passcodes:`Кодов пока нет.`,unnamed:`Без имени`,permanent:`Постоянный`,temporary:`Временный`,status_active:`Действует`,status_upcoming:`С {when}`,status_expired:`Истёк`,status_permanent:`Всегда`,until:`до {when}`,show_code:`Показать код`,hide_code:`Скрыть код`,copy:`Копировать`,copied:`Скопировано`,share:`Поделиться`,share_text:`Ваш код для {safe}: {code}{window}`,share_window:` (действует с {start} до {end})`,delete:`Удалить`,confirm_delete:`Удалить код «{name}»?`,confirm_delete_text:`Он сразу перестанет открывать сейф.`,not_on_safe:`Сейф его не сообщил`,name:`Имя`,name_hint:`Для кого код, например «Мама» или «Гость на выходные»`,code:`Код`,generate:`Сгенерировать`,type:`Тип`,valid_from:`Действует с`,valid_until:`Действует до`,add:`Добавить`,adding:`Добавляю…`,added:`Код «{name}» добавлен`,error_empty:`Введите код или сгенерируйте.`,error_digits:`Только цифры.`,error_length:`От 4 до 9 цифр.`,error_conflict:`Пересекается с другим кодом: один начинается с другого.`,error_missing_end:`Укажите, когда код перестанет работать.`,error_end_before_start:`Конец должен быть позже начала.`,clock_note:`Перед записью временного кода часы сейфа синхронизируются.`,activity:`Журнал`,activity_empty:`За последние 7 дней ничего не было.`,filter_all:`Все`,filter_unlocks:`Открытия`,filter_failed:`Неудачные`,filter_alarms:`Тревоги`,method_app:`Приложение`,method_keypad:`Клавиатура`,method_fingerprint:`Отпечаток`,method_card:`Карта`,method_key:`Ключ`,method_gateway:`Шлюз`,method_remote:`Пульт`,method_failed:`Неудачная попытка`,method_alarm:`Тревога`,method_other:`Другое`,action_unlock:`Открыт`,action_lock:`Заперт`,action_other:`Событие`,fingerprints:`Отпечатки`,fingerprints_note:`Отпечатки записываются только у сейфа: датчик должен отсканировать палец.`,no_fingerprints:`Отпечатков нет.`,slot:`Слот {slot}`,failed:`Ошибка: {error}`}};function G(e){let t=Se[e.split(`-`)[0]??`en`]??W;return(e,n)=>t[e].replace(/\{(\w+)\}/g,(e,t)=>n&&t in n?String(n[t]):e)}function K(e){let t=`method_${e}`;return t in W?t:`method_other`}function Ce(e){let t=`action_${e}`;return t in W?t:`action_other`}var q=o`
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
`,we=class extends U{constructor(...e){super(...e),this.resolve=null}static{this.properties={heading:{},text:{},confirmLabel:{attribute:!1},cancelLabel:{attribute:!1},danger:{type:Boolean}}}ask(){return this.shadowRoot?.querySelector(`dialog`)?.showModal(),new Promise(e=>{this.resolve=e})}close(e){this.shadowRoot?.querySelector(`dialog`)?.close(),this.resolve?.(e),this.resolve=null}render(){return M`
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
    `}static{this.styles=[q,o`
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
    `]}};customElements.get(`populife-confirm`)||customElements.define(`populife-confirm`,we);function Te(e,t){for(let n of t)if(n!==e&&(e.startsWith(n)||n.startsWith(e)))return n;return null}function Ee(e,t){return e===``?`empty`:/^\d+$/.test(e)?e.length<4||e.length>9?`length`:Te(e,t)===null?null:`conflict`:`digits`}function De(e,t){return t===``?`missing_end`:e!==``&&new Date(t)<=new Date(e)?`end_before_start`:null}function Oe(e,t){return e.end===null?`permanent`:new Date(e.end)<=t?`expired`:e.start!==null&&new Date(e.start)>t?`upcoming`:`active`}function ke(e){return`•`.repeat(Math.max(e.length-2,0))+e.slice(-2)}function Ae(e){let t=e=>String(e).padStart(2,`0`);return`${e.getFullYear()}-${t(e.getMonth()+1)}-${t(e.getDate())}T${t(e.getHours())}:${t(e.getMinutes())}`}function je(e){let t=new Date(e);t.setSeconds(0,0);let n=new Date(t.getTime()+864e5);return{start:Ae(t),end:Ae(n)}}var J={app:`mdi:cellphone-key`,keypad:`mdi:dialpad`,fingerprint:`mdi:fingerprint`,card:`mdi:card-account-details-outline`,key:`mdi:key-variant`,gateway:`mdi:router-wireless`,remote:`mdi:remote`,failed:`mdi:alert-circle-outline`,alarm:`mdi:alarm-light-outline`,other:`mdi:information-outline`};function Me(e,t){switch(t){case`all`:return!0;case`unlocks`:return e.action===`unlock`;case`failed`:return e.method===`failed`;case`alarms`:return e.method===`alarm`}}var Y=e=>typeof e==`string`?e:null;function Ne(e,t){let n=[],r={};for(let i of e[t]??[]){i.a&&(r=i.a);let e=Y(r.event_type),t=Date.parse(i.s);e===null||Number.isNaN(t)||n.push({when:new Date(Y(r.time)??t),method:e,action:Y(r.action)??`other`,user:Y(r.user),credential:Y(r.credential)})}return n.sort((e,t)=>t.when.getTime()-e.when.getTime())}function Pe(e,t,n){let r=Math.round((e.getTime()-t.getTime())/1e3),i=new Intl.RelativeTimeFormat(n,{numeric:`auto`});for(let[e,t]of[[`day`,86400],[`hour`,3600],[`minute`,60]])if(Math.abs(r)>=t)return i.format(Math.round(r/t),e);return i.format(r,`second`)}function X(e,t){return new Intl.DateTimeFormat(t,{dateStyle:`medium`,timeStyle:`short`}).format(typeof e==`string`?new Date(e):e)}var Fe=class extends U{static{this.properties={hass:{attribute:!1},safe:{attribute:!1},knownCodes:{attribute:!1},_name:{state:!0},_code:{state:!0},_temporary:{state:!0},_start:{state:!0},_end:{state:!0},_busy:{state:!0},_touched:{state:!0}}}constructor(){super(),this.onSubmit=null,this.knownCodes=[],this.reset()}reset(){let e=je(/* @__PURE__ */ new Date);this._name=``,this._code=``,this._temporary=!1,this._start=e.start,this._end=e.end,this._busy=!1,this._touched=!1}open(){this.reset(),this.shadowRoot?.querySelector(`dialog`)?.showModal()}close(){this.shadowRoot?.querySelector(`dialog`)?.close()}get t(){return G(this.hass.locale?.language??this.hass.language)}get codeProblem(){let e=Ee(this._code,this.knownCodes);return e===null?null:`error_${e}`}get windowProblem(){if(!this._temporary)return null;let e=De(this._start,this._end);return e===null?null:`error_${e}`}async generate(){let{code:e}=await this.hass.callWS({type:`populife/generate`,entry_id:this.safe.entry_id});this._code=e}async submit(e){if(e.preventDefault(),this._touched=!0,this.codeProblem===null&&this.windowProblem===null&&this.onSubmit!==null){this._busy=!0;try{await this.onSubmit({name:this._name.trim(),code:this._code,start:this._temporary?this._start:null,end:this._temporary?this._end:null}),this.close()}finally{this._busy=!1}}}render(){let e=this.t,t=this._touched||this._code!==``?this.codeProblem:null,n=this._touched?this.windowProblem:null;return M`
      <dialog aria-labelledby="heading">
        <form @submit=${e=>void this.submit(e)}>
          <h2 id="heading">${e(`add_passcode`)}</h2>
          <label>
            ${e(`name`)}
            <input
              .value=${this._name}
              placeholder=${e(`name_hint`)}
              maxlength="60"
              autocomplete="off"
              @input=${e=>this._name=e.target.value}
            />
          </label>
          <label>
            ${e(`code`)}
            <div class="row">
              <input
                class="code"
                inputmode="numeric"
                autocomplete="off"
                maxlength="9"
                .value=${this._code}
                aria-invalid=${t!==null}
                @input=${e=>this._code=e.target.value.trim()}
              />
              <button type="button" @click=${()=>void this.generate()}>
                <ha-icon icon="mdi:dice-multiple"></ha-icon>${e(`generate`)}
              </button>
            </div>
            ${t?M`<span class="error">${e(t)}</span>`:P}
          </label>
          <div class="segmented" role="radiogroup" aria-label=${e(`type`)}>
            <button
              type="button"
              role="radio"
              aria-checked=${!this._temporary}
              class=${this._temporary?``:`selected`}
              @click=${()=>this._temporary=!1}
            >
              <ha-icon icon="mdi:infinity"></ha-icon>${e(`permanent`)}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked=${this._temporary}
              class=${this._temporary?`selected`:``}
              @click=${()=>this._temporary=!0}
            >
              <ha-icon icon="mdi:timer-sand"></ha-icon>${e(`temporary`)}
            </button>
          </div>
          ${this._temporary?M`
                  <div class="window">
                    <label>
                      ${e(`valid_from`)}
                      <input
                        type="datetime-local"
                        .value=${this._start}
                        @input=${e=>this._start=e.target.value}
                      />
                    </label>
                    <label>
                      ${e(`valid_until`)}
                      <input
                        type="datetime-local"
                        .value=${this._end}
                        aria-invalid=${n!==null}
                        @input=${e=>this._end=e.target.value}
                      />
                    </label>
                  </div>
                  ${n?M`<span class="error">${e(n)}</span>`:P}
                  <p class="muted small">${e(`clock_note`)}</p>
                `:P}
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
      </dialog>
    `}static{this.styles=[q,o`
      dialog {
        background: var(--card-background-color, #fff);
        border: none;
        border-radius: var(--ha-dialog-border-radius, 24px);
        color: var(--primary-text-color);
        box-sizing: border-box;
        max-height: calc(100dvh - 32px);
        max-width: calc(100vw - 32px);
        overflow-y: auto;
        padding: 24px;
        width: 440px;
      }
      dialog::backdrop {
        background: rgb(0 0 0 / 0.45);
      }
      form {
        display: grid;
        gap: 16px;
      }
      .row {
        display: flex;
        gap: 8px;
      }
      .code {
        font-family: var(--ha-font-family-code, monospace);
        font-size: 1.2rem;
        letter-spacing: 0.2em;
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
      .segmented button.selected {
        background: color-mix(in srgb, var(--primary-color) 18%, transparent);
        color: var(--primary-color);
        font-weight: 500;
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
      .actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
    `]}};customElements.get(`populife-passcode-dialog`)||customElements.define(`populife-passcode-dialog`,Fe);var Ie=[`all`,`unlocks`,`failed`,`alarms`],Le=class extends U{static{this.properties={hass:{attribute:!1},safe:{attribute:!1},narrow:{type:Boolean},_list:{state:!0},_operations:{state:!0},_filter:{state:!0},_revealed:{state:!0},_busy:{state:!0},_confirm:{state:!0}}}constructor(){super(),this.watched=``,this._list=null,this._operations=null,this._filter=`all`,this._revealed=/* @__PURE__ */ new Set,this._busy=null,this._confirm={heading:``,text:``,label:``,danger:!1}}get t(){return G(this.hass.locale?.language??this.hass.language)}get language(){return this.hass.locale?.language??this.hass.language}entity(e){let t=this.safe.entities[e];return t?this.hass.states[t]:void 0}willUpdate(e){e.has(`safe`)&&(this._list=null,this._operations=null,this.watched=``)}updated(e){if(!e.has(`hass`)&&!e.has(`safe`))return;let t=[this.entity(`passcodes`),this.entity(`operation`)].map(e=>e?.last_updated??``).join(`|`);t!==this.watched&&(this.watched=t,this.loadPasscodes(),this.loadActivity())}async loadPasscodes(){if(this.safe.can_operate)try{this._list=await this.hass.callWS({type:`populife/passcodes`,entry_id:this.safe.entry_id})}catch(e){this.toast(this.t(`failed`,{error:Q(e)}))}}async loadActivity(){let e=this.safe.entities.operation;if(!e){this._operations=[];return}let t=/* @__PURE__ */ new Date(Date.now()-6048e5);try{let n=await this.hass.callWS({type:`history/history_during_period`,start_time:t.toISOString(),entity_ids:[e],minimal_response:!1,no_attributes:!1,significant_changes_only:!1});this._operations=Ne(n,e)}catch{this._operations=[]}}toast(e){this.dispatchEvent(new CustomEvent(`hass-notification`,{detail:{message:e},bubbles:!0,composed:!0}))}async run(e,t){this._busy=e;try{return await t(),!0}catch(e){return this.toast(this.t(`failed`,{error:Q(e)})),!1}finally{this._busy=null}}async confirm(e,t,n,r){this._confirm={heading:e,text:t,label:n,danger:r},await this.updateComplete;let i=this.shadowRoot?.querySelector(`populife-confirm`);return i?i.ask():!1}async toggleLock(e){let t=this.safe.entities.lock;if(!t)return;let n=this.t;(!e||await this.confirm(n(`confirm_unlock`,{name:this.safe.title}),n(`confirm_unlock_text`),n(`unlock`),!1))&&await this.run(`lock`,()=>this.hass.callService(`lock`,e?`unlock`:`lock`,{entity_id:t}))}press(e){let t=this.safe.entities[e];return this.run(e,()=>this.hass.callService(`button`,`press`,{entity_id:t}))}async addPasscode(e){let t={entity_id:this.safe.entities.lock,code:e.code};e.name&&(t.name=e.name),e.end&&(t.end=e.end,e.start&&(t.start=e.start));try{await this.hass.callService(`populife`,`add_passcode`,t)}catch(e){throw this.toast(this.t(`failed`,{error:Q(e)})),e}this.toast(this.t(`added`,{name:e.name||this.t(`unnamed`)})),await this.loadPasscodes()}async deletePasscode(e){let t=this.t,n=e.name??t(`unnamed`);await this.confirm(t(`confirm_delete`,{name:n}),t(`confirm_delete_text`),t(`delete`),!0)&&await this.run(`delete:${e.code}`,()=>this.hass.callService(`populife`,`delete_passcode`,{entity_id:this.safe.entities.lock,code:e.code}))&&await this.loadPasscodes()}shareText(e){let t=this.t,n=e.end===null?``:t(`share_window`,{start:e.start?X(e.start,this.language):`—`,end:X(e.end,this.language)});return t(`share_text`,{safe:this.safe.title,code:e.code,window:n})}async share(e){let t=this.shareText(e);if(`share`in navigator)try{await navigator.share({text:t});return}catch{}await this.copy(t)}async copy(e){await navigator.clipboard.writeText(e),this.toast(this.t(`copied`))}toggleReveal(e){let t=new Set(this._revealed);t.delete(e)||t.add(e),this._revealed=t}render(){return M`
      <div class="layout ${this.narrow?`narrow`:``}">
        ${this.renderStatus()}
        ${this.safe.can_operate?M`${this.renderPasscodes()} ${this.renderActivity()} ${this.renderFingerprints()}`:M`<div class="card wide muted">${this.t(`no_access`)}</div>`}
      </div>
      <populife-passcode-dialog
        .hass=${this.hass}
        .safe=${this.safe}
        .knownCodes=${this._list?.passcodes.map(e=>e.code)??[]}
        .onSubmit=${e=>this.addPasscode(e)}
      ></populife-passcode-dialog>
      <populife-confirm
        .heading=${this._confirm.heading}
        .text=${this._confirm.text}
        .confirmLabel=${this._confirm.label}
        .cancelLabel=${this.t(`cancel`)}
        ?danger=${this._confirm.danger}
      ></populife-confirm>
    `}renderStatus(){let e=this.t,t=this.entity(`lock`)?.state??`unavailable`,n=t===`locked`,r=t===`locking`||t===`unlocking`,i=t!==`unavailable`,a=e(t===`locked`||t===`unlocked`||t===`locking`||t===`unlocking`?t:i?`unknown`:`unavailable`),o=this.entity(`battery`)?.state,s=this.entity(`signal`)?.state,c=Number(this.entity(`clock_drift`)?.state),l=this.entity(`last_unlock`)?.state,u=this.entity(`last_unlocked_by`)?.state,d=this.entity(`last_unlock_method`)?.state,f=l!==void 0&&!Number.isNaN(Date.parse(l));return M`
      <section class="card wide status ${n?`is-locked`:`is-open`}">
        <div class="lock-icon">
          <ha-icon
            icon=${n?`mdi:lock`:i?`mdi:lock-open-variant`:`mdi:lock-question`}
          ></ha-icon>
        </div>
        <div class="status-main">
          <h2>${this.safe.title}</h2>
          <div class="state">${a}</div>
          <div class="muted small">
            ${e(`last_unlock`)}:
            ${f?M`${Pe(new Date(l),/* @__PURE__ */ new Date,this.language)}
                  ${u&&u!==`unknown`?e(`last_unlock_by`,{user:u}):P}
                  ${d&&d in J?M`· ${e(K(d))}`:P}`:e(`never`)}
          </div>
        </div>
        <div class="status-actions">
          ${this.safe.can_operate?M`<button
                  class="primary big"
                  ?disabled=${!i||r||this._busy===`lock`}
                  @click=${()=>void this.toggleLock(n)}
                >
                  <ha-icon icon=${n?`mdi:lock-open-variant`:`mdi:lock`}></ha-icon>
                  ${e(n?`unlock`:`lock`)}
                </button>`:P}
        </div>
        <div class="metrics">
          ${Z(`mdi:battery`,e(`battery`),o===void 0?`—`:`${o}%`)}
          ${Z(`mdi:bluetooth`,e(`signal`),s&&s!==`unknown`?`${s} dBm`:`—`)}
          ${Z(`mdi:clock-outline`,e(`clock`),Number.isNaN(c)?`—`:Math.abs(c)<60?e(`clock_ok`):e(`clock_off`,{seconds:Math.round(c)}))}
          <div class="metric-actions">
            ${this.safe.can_operate&&this.safe.entities.sync_clock&&Math.abs(c)>=60?M`<button
                    ?disabled=${this._busy!==null}
                    @click=${()=>void this.press(`sync_clock`)}
                  >
                    <ha-icon icon="mdi:clock-check-outline"></ha-icon>${e(`sync_clock`)}
                  </button>`:P}
            ${this.safe.can_operate&&this.safe.entities.refresh?M`<button
                    class="icon"
                    title=${e(`refresh`)}
                    aria-label=${e(`refresh`)}
                    ?disabled=${this._busy!==null}
                    @click=${()=>void this.press(`refresh`)}
                  >
                    <ha-icon icon="mdi:refresh"></ha-icon>
                  </button>`:P}
          </div>
        </div>
      </section>
    `}renderPasscodes(){let e=this.t;if(!this.safe.admin_key)return M`<section class="card">
        <div class="card-header"><h2>${e(`passcodes`)}</h2></div>
        <p class="muted">${e(`passcodes_admin_only`)}</p>
      </section>`;let t=this._list?.passcodes,n=/* @__PURE__ */ new Date;return M`
      <section class="card passcodes">
        <div class="card-header">
          <h2>${e(`passcodes`)}</h2>
          <button
            class="primary"
            @click=${()=>{this.shadowRoot?.querySelector(`populife-passcode-dialog`)?.open()}}
          >
            <ha-icon icon="mdi:plus"></ha-icon>${e(`add_passcode`)}
          </button>
        </div>
        ${t===void 0?M`<p class="muted">${e(`loading`)}</p>`:t.length===0?M`<p class="muted">${e(`no_passcodes`)}</p>`:M`<ul class="list">
                  ${t.map(t=>{let r=Oe(t,n),i=this._revealed.has(t.code);return M`<li class="passcode ${r}">
                      <ha-icon
                        class="lead"
                        icon=${t.end===null?`mdi:account-key-outline`:`mdi:timer-sand`}
                      ></ha-icon>
                      <div class="grow">
                        <div class="name">${t.name??e(`unnamed`)}</div>
                        <div class="small muted">
                          <span class="code"
                            >${i?t.code:ke(t.code)}</span
                          >
                          ${this.statusChip(t,r)}
                          ${t.on_safe?P:M`<span class="chip neutral">${e(`not_on_safe`)}</span>`}
                        </div>
                      </div>
                      <div class="row-actions">
                        <button
                          class="icon"
                          title=${e(i?`hide_code`:`show_code`)}
                          aria-label=${e(i?`hide_code`:`show_code`)}
                          @click=${()=>{this.toggleReveal(t.code)}}
                        >
                          <ha-icon
                            icon=${i?`mdi:eye-off-outline`:`mdi:eye-outline`}
                          ></ha-icon>
                        </button>
                        <button
                          class="icon"
                          title=${e(`share`)}
                          aria-label=${e(`share`)}
                          @click=${()=>void this.share(t)}
                        >
                          <ha-icon icon="mdi:share-variant-outline"></ha-icon>
                        </button>
                        <button
                          class="icon delete"
                          title=${e(`delete`)}
                          aria-label=${e(`delete`)}
                          ?disabled=${this._busy===`delete:${t.code}`}
                          @click=${()=>void this.deletePasscode(t)}
                        >
                          <ha-icon icon="mdi:delete-outline"></ha-icon>
                        </button>
                      </div>
                    </li>`})}
                </ul>`}
      </section>
    `}statusChip(e,t){let n=this.t;switch(t){case`permanent`:return M`<span class="chip neutral">${n(`status_permanent`)}</span>`;case`expired`:return M`<span class="chip bad">${n(`status_expired`)}</span>`;case`upcoming`:return M`<span class="chip warn"
          >${n(`status_upcoming`,{when:X(e.start??``,this.language)})}</span
        >`;case`active`:return M`<span class="chip ok"
          >${n(`status_active`)} ·
          ${n(`until`,{when:X(e.end??``,this.language)})}</span
        >`}}renderActivity(){let e=this.t,t=(this._operations??[]).filter(e=>Me(e,this._filter));return M`
      <section class="card activity">
        <div class="card-header">
          <h2>${e(`activity`)}</h2>
          <div class="filters" role="tablist">
            ${Ie.map(t=>M`<button
                  role="tab"
                  aria-selected=${this._filter===t}
                  class=${this._filter===t?`selected`:``}
                  @click=${()=>this._filter=t}
                >
                  ${e(`filter_${t}`)}
                </button>`)}
          </div>
        </div>
        ${this._operations===null?M`<p class="muted">${e(`loading`)}</p>`:t.length===0?M`<p class="muted">${e(`activity_empty`)}</p>`:M`<ul class="list timeline">
                  ${t.map(t=>M`<li class=${t.method}>
                        <ha-icon
                          class="lead"
                          icon=${J[t.method]??J.other}
                        ></ha-icon>
                        <div class="grow">
                          <div>
                            ${t.method===`failed`||t.method===`alarm`?e(K(t.method)):M`${e(Ce(t.action))}${t.user?M` · <b>${t.user}</b>`:P}`}
                          </div>
                          ${t.method===`failed`||t.method===`alarm`?P:M`<div class="small muted">
                                  ${e(K(t.method))}${t.credential?` #${t.credential}`:``}
                                </div>`}
                        </div>
                        <time
                          class="small muted"
                          datetime=${t.when.toISOString()}
                          title=${X(t.when,this.language)}
                        >
                          ${Pe(t.when,/* @__PURE__ */ new Date,this.language)}
                        </time>
                      </li>`)}
                </ul>`}
      </section>
    `}renderFingerprints(){let e=this.t;if(!this.safe.admin_key)return P;let t=this._list?.fingerprints??[];return M`
      <section class="card fingerprints">
        <div class="card-header"><h2>${e(`fingerprints`)}</h2></div>
        ${t.length===0?M`<p class="muted">${e(`no_fingerprints`)}</p>`:M`<ul class="list">
                ${t.map(t=>M`<li>
                      <ha-icon class="lead" icon="mdi:fingerprint"></ha-icon>
                      <div class="grow">${e(`slot`,{slot:t.slot})}</div>
                      <span class="small muted"
                        >${t.end?e(`until`,{when:X(t.end,this.language)}):e(`status_permanent`)}</span
                      >
                    </li>`)}
              </ul>`}
        <p class="muted small">${e(`fingerprints_note`)}</p>
      </section>
    `}static{this.styles=[q,o`
      .layout {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin: 0 auto;
        max-width: 1100px;
        padding: 16px;
      }
      .layout.narrow {
        grid-template-columns: minmax(0, 1fr);
        padding: 8px;
      }
      .wide {
        grid-column: 1 / -1;
      }
      .status {
        align-items: center;
        display: grid;
        gap: 12px 16px;
        grid-template-areas: "icon main actions" "metrics metrics metrics";
        grid-template-columns: auto 1fr auto;
      }
      .narrow .status {
        grid-template-areas: "icon main" "actions actions" "metrics metrics";
        grid-template-columns: auto 1fr;
      }
      .lock-icon {
        align-items: center;
        background: color-mix(in srgb, var(--state-color) 15%, transparent);
        border-radius: 50%;
        color: var(--state-color);
        display: flex;
        grid-area: icon;
        height: 64px;
        justify-content: center;
        width: 64px;
      }
      .lock-icon ha-icon {
        --mdc-icon-size: 34px;
      }
      .is-locked {
        --state-color: var(--state-lock-locked-color, var(--success-color, #43a047));
      }
      .is-open {
        --state-color: var(--state-lock-unlocked-color, var(--error-color, #db4437));
      }
      .status-main {
        display: grid;
        gap: 2px;
        grid-area: main;
      }
      .state {
        color: var(--state-color);
        font-size: 1.6rem;
        font-weight: 500;
      }
      .status-actions {
        grid-area: actions;
      }
      .big {
        font-size: 1.05rem;
        justify-content: center;
        min-height: 48px;
        min-width: 160px;
        width: 100%;
      }
      .metrics {
        align-items: center;
        border-top: 1px solid var(--divider-color);
        display: flex;
        flex-wrap: wrap;
        gap: 12px 28px;
        grid-area: metrics;
        padding-top: 12px;
      }
      .metric {
        align-items: center;
        display: flex;
        gap: 8px;
      }
      .metric .value {
        font-weight: 500;
      }
      .metric-actions {
        display: flex;
        gap: 8px;
        margin-left: auto;
      }
      .list {
        display: grid;
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .list li {
        align-items: center;
        border-top: 1px solid var(--divider-color);
        display: flex;
        gap: 12px;
        min-height: 56px;
        padding: 6px 0;
      }
      .list li:first-child {
        border-top: none;
      }
      .lead {
        color: var(--secondary-text-color);
        flex: none;
      }
      .grow {
        display: grid;
        flex: 1;
        gap: 2px;
        /* A grid track is otherwise as wide as its longest unbreakable line. */
        grid-template-columns: minmax(0, 1fr);
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
      .grow .chip {
        max-width: 100%;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .narrow .row-actions button.icon {
        min-height: 36px;
        min-width: 36px;
      }
      .activity .card-header {
        flex-wrap: wrap;
      }
      .code {
        font-family: var(--ha-font-family-code, monospace);
        letter-spacing: 0.15em;
      }
      .passcode.expired .name,
      .passcode.expired .code {
        opacity: 0.55;
      }
      .row-actions {
        display: flex;
        flex: none;
      }
      .delete:hover:not([disabled]) {
        color: var(--error-color);
      }
      .filters {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      .filters button {
        font-size: 0.8rem;
        min-height: 28px;
        padding: 0 10px;
      }
      .filters button.selected {
        background: color-mix(in srgb, var(--primary-color) 18%, transparent);
        border-color: transparent;
        color: var(--primary-color);
      }
      .timeline .failed .lead,
      .timeline .alarm .lead {
        color: var(--error-color);
      }
      .timeline time {
        flex: none;
      }
    `]}};function Z(e,t,n){return M`<div class="metric">
    <ha-icon icon=${e}></ha-icon>
    <span class="muted">${t}</span>
    <span class="value">${n}</span>
  </div>`}function Q(e){return typeof e==`object`&&e&&`message`in e?String(e.message):String(e)}customElements.get(`populife-safe`)||customElements.define(`populife-safe`,Le);var $=class extends U{static{this.properties={hass:{attribute:!1},narrow:{type:Boolean},_safes:{state:!0},_selected:{state:!0}}}constructor(){super(),this.narrow=!1,this._safes=null,this._selected=null}willUpdate(e){e.has(`hass`)&&this._safes===null&&this.hass&&this.loadSafes(this.hass)}async loadSafes(e){this._safes=[];let{safes:t}=await e.callWS({type:`populife/safes`});this._safes=t,this._selected=t[0]?.entry_id??null}render(){if(!this.hass)return P;let e=G(this.hass.locale?.language??this.hass.language),t=this._safes??[],n=t.find(e=>e.entry_id===this._selected);return M`
      <header class="toolbar">
        <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
        <div class="title">${e(`title`)}</div>
        ${t.length>1?M`<select
                aria-label=${e(`title`)}
                @change=${e=>this._selected=e.target.value}
              >
                ${t.map(e=>M`<option value=${e.entry_id} ?selected=${e.entry_id===this._selected}>
                      ${e.title}
                    </option>`)}
              </select>`:P}
      </header>
      <main>
        ${this._safes===null?M`<p class="message muted">${e(`loading`)}</p>`:n===void 0?M`<p class="message muted">${e(`no_safes`)}</p>`:M`<populife-safe
                  .hass=${this.hass}
                  .safe=${n}
                  ?narrow=${this.narrow}
                ></populife-safe>`}
      </main>
    `}static{this.styles=[q,o`
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
    `]}};customElements.get(`populife-panel`)||customElements.define(`populife-panel`,$);export{$ as PopulifePanel};