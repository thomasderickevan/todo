const WORD_LIST=["apple","bridge","candle","desert","eagle","forest","galaxy","honey","island","jungle","knight","lemon","mountain","nebula","ocean","planet","quartz","river","shadow","tiger","umbrella","valley","winter","xray","yellow","zebra","autumn","blossom","canyon","dawn","echo","falcon","glacier","harvest","iceberg","jade","kite","lagoon","meadow","night","oasis","pebble","quiver","reef","storm","thunder","umbra","vortex","willow","xenon"];
const KEYS={account:"accountProfile",entries:"vaultEntries",config:"vaultMasterConfig"};
const DRIVE_PREFIX="endeavor-shield-gen-vault";
const RECOVERY_API_BASE="https://us-central1-todo-app-24b14.cloudfunctions.net";
const state={shieldMode:"password",generatedValue:"",vaultEntries:[],vaultMasterConfig:null,accountProfile:null,isUnlocked:false,masterPin:"",currentVaultKey:"",activeTab:null,activeOrigin:"",activeHost:"",searchQuery:"",syncStatusText:"Vault stays local until you sign in and sync.",resetStatusText:"Reset codes are sent by the recovery backend after Google sync has registered this vault.",vaultMetaText:"Vault key is loaded locally."};
const elements={};

document.addEventListener("DOMContentLoaded",async()=>{cacheElements();bindEvents();await hydrateState();renderAll();});

function cacheElements(){["accountStatusPill","accountSyncBadge","accountEmailInput","syncStatusText","signInBtn","signOutBtn","syncVaultBtn","restoreVaultBtn","generatedValue","passwordLength","wordCount","optUppercase","optLowercase","optNumbers","optSymbols","optCapitalize","separatorSelect","strengthPill","vaultList","serviceNameInput","usernameInput","siteInput","passwordControls","passphraseControls","importVaultInput","shieldSetupView","shieldUnlockView","shieldUnlockedView","setupPinInput","setupPinConfirmInput","unlockPinInput","activeSiteLabel","siteVaultList","vaultSearchInput","vaultStateBadge","vaultMetaText","showResetBtn","resetPinPanel","resetEmailInput","resetCodeInput","resetNewPinInput","resetConfirmPinInput","requestResetBtn","completeResetBtn","resetStatusText"].forEach((id)=>{elements[id]=document.getElementById(id);});}

function bindEvents(){
  document.querySelectorAll(".mode-button").forEach((button)=>button.addEventListener("click",()=>switchShieldMode(button.dataset.mode)));
  ["passwordLength","wordCount","optUppercase","optLowercase","optNumbers","optSymbols","optCapitalize","separatorSelect"].forEach((id)=>{elements[id].addEventListener("input",handleGeneratorChange);elements[id].addEventListener("change",handleGeneratorChange);});
  elements.vaultSearchInput.addEventListener("input",()=>{state.searchQuery=elements.vaultSearchInput.value.trim().toLowerCase();renderVaultLists();});
  elements.signInBtn.addEventListener("click",signInWithGoogle);
  elements.signOutBtn.addEventListener("click",signOutGoogle);
  elements.syncVaultBtn.addEventListener("click",runTask(syncVaultToDrive));
  elements.restoreVaultBtn.addEventListener("click",runTask(restoreVaultFromDrive));
  document.getElementById("createVaultBtn").addEventListener("click",createVault);
  document.getElementById("unlockVaultBtn").addEventListener("click",unlockVault);
  document.getElementById("lockVaultBtn").addEventListener("click",lockVault);
  elements.showResetBtn.addEventListener("click",()=>elements.resetPinPanel.classList.toggle("hidden"));
  elements.requestResetBtn.addEventListener("click",runTask(requestPinResetCode));
  elements.completeResetBtn.addEventListener("click",runTask(completePinReset));
  document.getElementById("regenerateBtn").addEventListener("click",()=>{regenerateSecret();renderGenerator();});
  document.getElementById("copyGeneratedBtn").addEventListener("click",copyGeneratedSecret);
  document.getElementById("fillGeneratedBtn").addEventListener("click",fillGeneratedSecret);
  document.getElementById("saveVaultBtn").addEventListener("click",saveLogin);
  document.getElementById("exportVaultBtn").addEventListener("click",exportVault);
  elements.importVaultInput.addEventListener("change",importVault);
  chrome.storage.onChanged.addListener((changes,areaName)=>{if(areaName!=="local")return;if(changes[KEYS.entries]){state.vaultEntries=changes[KEYS.entries].newValue||[];renderVaultLists();}if(changes[KEYS.config]){state.vaultMasterConfig=changes[KEYS.config].newValue||null;renderShield();}if(changes[KEYS.account]){state.accountProfile=changes[KEYS.account].newValue||null;renderAccount();}});
}

async function hydrateState(){
  const stored=await chrome.storage.local.get([KEYS.entries,KEYS.config,KEYS.account]);
  state.vaultEntries=stored[KEYS.entries]||[];
  state.vaultMasterConfig=stored[KEYS.config]||null;
  state.accountProfile=stored[KEYS.account]||null;
  state.activeTab=await getActiveTab();
  setActiveSiteInfo(state.activeTab?.url||"");
  elements.siteInput.value=state.activeOrigin;
  elements.resetEmailInput.value=state.accountProfile?.email||"";
  regenerateSecret();
}

function renderAll(){renderAccount();renderShield();}
function renderAccount(){
  const signedIn=Boolean(state.accountProfile?.email);
  elements.accountStatusPill.textContent=signedIn?"Google connected":"Signed out";
  elements.accountSyncBadge.textContent=signedIn?"Drive ready":"Local only";
  elements.accountEmailInput.value=state.accountProfile?.email||"";
  elements.syncStatusText.textContent=state.syncStatusText;
  elements.resetStatusText.textContent=state.resetStatusText;
  elements.signInBtn.disabled=signedIn;
  elements.signOutBtn.disabled=!signedIn;
  elements.syncVaultBtn.disabled=!signedIn;
  elements.restoreVaultBtn.disabled=!signedIn;
}
function renderShield(){
  const ready=Boolean(state.vaultMasterConfig);
  elements.shieldSetupView.classList.toggle("hidden",ready);
  elements.shieldUnlockView.classList.toggle("hidden",!ready||state.isUnlocked);
  elements.shieldUnlockedView.classList.toggle("hidden",!ready||!state.isUnlocked);
  if(!ready||!state.isUnlocked)return;
  elements.activeSiteLabel.textContent=state.activeOrigin||"No supported webpage selected";
  elements.vaultStateBadge.textContent=state.activeHost?`Match on ${state.activeHost}`:"Unlocked";
  elements.vaultMetaText.textContent=state.vaultMetaText;
  renderGenerator();
  renderVaultLists();
}
function renderGenerator(){
  elements.generatedValue.value=state.generatedValue;
  elements.passwordControls.classList.toggle("hidden",state.shieldMode!=="password");
  elements.passphraseControls.classList.toggle("hidden",state.shieldMode!=="passphrase");
  elements.strengthPill.textContent=computeStrengthLabel();
}

function switchShieldMode(mode){state.shieldMode=mode;document.querySelectorAll(".mode-button").forEach((button)=>button.classList.toggle("active",button.dataset.mode===mode));regenerateSecret();renderGenerator();}
function handleGeneratorChange(){regenerateSecret();renderGenerator();}
function setActiveSiteInfo(url){try{const parsed=new URL(url);if(!/^https?:$/.test(parsed.protocol))throw new Error("unsupported");state.activeOrigin=parsed.origin;state.activeHost=parsed.hostname.replace(/^www\./,"");}catch{state.activeOrigin="";state.activeHost="";}}

async function signInWithGoogle(){
  if(getOauthClientId().includes("YOUR_GOOGLE_OAUTH_CLIENT_ID")){window.alert("Set a real OAuth client ID in extension/manifest.json before using Google sign-in.");return;}
  try{const token=await getAccessToken(true);const profile=await fetchGoogleProfile(token);state.accountProfile=profile;state.syncStatusText="Google account connected. You can sync the vault and register recovery.";elements.resetEmailInput.value=profile.email||"";await chrome.storage.local.set({[KEYS.account]:profile});renderAccount();}catch(error){console.error(error);window.alert("Google sign-in failed. Check the extension OAuth client and try again.");}
}
async function signOutGoogle(){
  const token=await getAccessToken(false).catch(()=>null);
  if(token){try{await chrome.identity.removeCachedAuthToken({token});}catch{}}
  state.accountProfile=null;state.syncStatusText="Signed out. Vault data remains local on this device.";elements.resetEmailInput.value="";await chrome.storage.local.remove(KEYS.account);renderAccount();
}

async function syncVaultToDrive(){
  ensureSignedIn();
  const token=await getAccessToken(true);
  const content=JSON.stringify({version:2,exportedAt:Date.now(),accountEmail:state.accountProfile?.email||"",vaultMasterConfig:state.vaultMasterConfig,vaultEntries:state.vaultEntries},null,2);
  await uploadDriveFile(getDriveFileName(),content,token);
  state.syncStatusText=`Synced to Google Drive as ${getDriveFileName()}.`;
  if(state.isUnlocked&&state.currentVaultKey&&state.vaultMasterConfig?.recovery?.recoveryId){
    try{
      await callRecoveryApi("/register-recovery-profile",{recoveryId:state.vaultMasterConfig.recovery.recoveryId,recoveryVaultKey:state.currentVaultKey},{token});
      state.resetStatusText="Recovery profile registered. Email reset can restore access to the same vault key.";
    }catch(error){
      console.error(error);
      state.resetStatusText="Drive sync succeeded, but recovery registration failed. Check the backend deployment and try sync again.";
    }
  }else if(!state.isUnlocked){
    state.resetStatusText="Drive sync completed. Unlock once before syncing again to register the recovery profile.";
  }
  renderAccount();
}

async function restoreVaultFromDrive(){
  ensureSignedIn();
  const token=await getAccessToken(true);
  const payload=JSON.parse(await downloadDriveFile(getDriveFileName(),token));
  if(!payload||!Array.isArray(payload.vaultEntries)||!payload.vaultMasterConfig)throw new Error("Drive backup format is invalid.");
  state.vaultEntries=payload.vaultEntries;state.vaultMasterConfig=payload.vaultMasterConfig;state.isUnlocked=false;state.masterPin="";state.currentVaultKey="";state.syncStatusText="Restored encrypted vault data from Google Drive. Unlock with your PIN or use reset if needed.";
  await chrome.storage.local.set({[KEYS.entries]:state.vaultEntries,[KEYS.config]:state.vaultMasterConfig});
  renderAll();
}

async function createVault(){
  const pin=elements.setupPinInput.value.trim();const confirm=elements.setupPinConfirmInput.value.trim();
  if(pin.length<4){window.alert("Use at least 4 characters for the master PIN.");return;}
  if(pin!==confirm){window.alert("PIN confirmation does not match.");return;}
  const vaultKey=randomBase64(32);
  state.vaultMasterConfig=await buildVaultMasterConfig(pin,vaultKey);
  state.isUnlocked=true;state.masterPin=pin;state.currentVaultKey=vaultKey;state.vaultEntries=[];state.vaultMetaText="Vault created with a wrapped vault key. Sync while signed in to enable email reset.";
  await chrome.storage.local.set({[KEYS.config]:state.vaultMasterConfig,[KEYS.entries]:state.vaultEntries});
  elements.setupPinInput.value="";elements.setupPinConfirmInput.value="";renderAll();
}

async function unlockVault(){
  const pin=elements.unlockPinInput.value.trim();if(!pin||!state.vaultMasterConfig)return;
  if(state.vaultMasterConfig.version===2){
    if(!await verifyPin(pin,state.vaultMasterConfig.pinVerifier)){window.alert("Incorrect master PIN.");return;}
    state.currentVaultKey=await unwrapVaultKey(pin,state.vaultMasterConfig.wrappedVaultKey);
    state.isUnlocked=true;state.masterPin=pin;state.vaultMetaText="Vault key unwrapped locally.";
  }else{
    await migrateLegacyVault(pin);
  }
  elements.unlockPinInput.value="";renderAll();
}
function lockVault(){state.isUnlocked=false;state.masterPin="";state.currentVaultKey="";state.vaultMetaText="Vault key is loaded locally.";renderShield();}

async function migrateLegacyVault(pin){
  if(!await verifyLegacyPin(pin,state.vaultMasterConfig)){window.alert("Incorrect master PIN.");return;}
  const vaultKey=randomBase64(32);
  const migrated=[];
  for(const entry of state.vaultEntries){
    const password=await decryptLegacySecret(entry.encryptedPassword,pin);
    migrated.push({id:entry.id||`vault-${Date.now()}-${Math.random().toString(16).slice(2)}`,serviceName:entry.serviceName||"Untitled",username:entry.username||"",siteOrigin:entry.siteOrigin||"",siteHostname:entry.siteHostname||"",encryptedSecret:await encryptWithVaultKey(password,vaultKey),createdAt:entry.createdAt||Date.now(),updatedAt:entry.updatedAt||Date.now()});
  }
  state.vaultEntries=migrated;state.vaultMasterConfig=await buildVaultMasterConfig(pin,vaultKey);state.isUnlocked=true;state.masterPin=pin;state.currentVaultKey=vaultKey;state.vaultMetaText="Legacy vault migrated to wrapped vault-key storage.";
  await chrome.storage.local.set({[KEYS.config]:state.vaultMasterConfig,[KEYS.entries]:state.vaultEntries});
}

function regenerateSecret(){state.generatedValue=state.shieldMode==="password"?generateRandomPassword():generatePassphrase();}
function generateRandomPassword(){const pools=[];if(elements.optUppercase.checked)pools.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");if(elements.optLowercase.checked)pools.push("abcdefghijklmnopqrstuvwxyz");if(elements.optNumbers.checked)pools.push("0123456789");if(elements.optSymbols.checked)pools.push("!@#$%^&*()_+~`|}{[]:;?><,./-=");const characters=pools.join("");if(!characters)return"Select at least one option";const length=Number(elements.passwordLength.value);const bytes=crypto.getRandomValues(new Uint32Array(length));let password="";for(let i=0;i<length;i+=1)password+=characters[bytes[i]%characters.length];return password;}
function generatePassphrase(){const count=Number(elements.wordCount.value);const separator=elements.separatorSelect.value;const capitalize=elements.optCapitalize.checked;const bytes=crypto.getRandomValues(new Uint32Array(count));const words=[];for(let i=0;i<count;i+=1){let word=WORD_LIST[bytes[i]%WORD_LIST.length];if(capitalize)word=`${word[0].toUpperCase()}${word.slice(1)}`;words.push(word);}return words.join(separator);}
function computeStrengthLabel(){const value=state.generatedValue;if(!value||value==="Select at least one option")return"Invalid";let score=0;if(value.length>=12)score+=1;if(value.length>=16)score+=1;if(/[A-Z]/.test(value))score+=1;if(/[0-9]/.test(value))score+=1;if(/[^A-Za-z0-9 ]/.test(value))score+=1;if(state.shieldMode==="passphrase")score+=1;if(score<=2)return"Weak";if(score<=4)return"Strong";return"Very strong";}

function getFilteredEntries(){const entries=[...state.vaultEntries].sort((a,b)=>b.updatedAt-a.updatedAt||b.createdAt-a.createdAt);if(!state.searchQuery)return entries;return entries.filter((entry)=>`${entry.serviceName} ${entry.username} ${entry.siteOrigin} ${entry.siteHostname}`.toLowerCase().includes(state.searchQuery));}
function getSiteMatches(entries){if(!state.activeHost)return[];return entries.filter((entry)=>siteMatches(entry,state.activeHost));}
function siteMatches(entry,activeHost){if(!entry.siteHostname)return false;return activeHost===entry.siteHostname||activeHost.endsWith(`.${entry.siteHostname}`)||entry.siteHostname.endsWith(`.${activeHost}`);}
function renderVaultLists(){const filtered=getFilteredEntries();renderEntryList(elements.siteVaultList,getSiteMatches(filtered),"No saved logins match this site yet.");renderEntryList(elements.vaultList,filtered,"No vault entries yet.");}
function renderEntryList(container,entries,emptyText){
  if(!entries.length){container.className="list-block empty";container.textContent=emptyText;return;}
  container.className="list-block";container.innerHTML="";
  for(const entry of entries){
    const wrapper=document.createElement("article");wrapper.className="vault-entry";wrapper.innerHTML=`<div class="entry-header"><div><div class="entry-service">${escapeHtml(entry.serviceName)}</div><div class="entry-meta">${escapeHtml(entry.username||"No username")} • ${escapeHtml(entry.siteOrigin||"No site")}</div></div><span class="site-badge">${siteMatches(entry,state.activeHost)?"Match":"Vault"}</span></div><div class="entry-actions spread"><button class="ghost-button" data-action="fill" data-id="${entry.id}">Fill</button><button class="ghost-button" data-action="copy-user" data-id="${entry.id}">Copy user</button><button class="ghost-button" data-action="copy-pass" data-id="${entry.id}">Copy pass</button><button class="ghost-button" data-action="delete" data-id="${entry.id}">Delete</button></div>`;
    wrapper.querySelectorAll("button").forEach((button)=>button.addEventListener("click",async()=>{const{action,id}=button.dataset;if(action==="fill")await fillSavedEntry(id);if(action==="copy-user")await copyEntryUsername(id);if(action==="copy-pass")await copyEntryPassword(id);if(action==="delete")await deleteEntry(id);}));
    container.appendChild(wrapper);
  }
}

async function copyGeneratedSecret(){if(state.generatedValue)await navigator.clipboard.writeText(state.generatedValue);}
async function fillGeneratedSecret(){const tab=await ensureFillableActiveTab();if(!tab)return;await runFillScript(tab.id,{username:elements.usernameInput.value.trim(),password:state.generatedValue});}
async function saveLogin(){
  if(!state.isUnlocked||!state.currentVaultKey){window.alert("Unlock the vault first.");return;}
  const serviceName=elements.serviceNameInput.value.trim();const username=elements.usernameInput.value.trim();const siteOrigin=normalizeSiteOrigin(elements.siteInput.value.trim()||state.activeOrigin);
  if(!serviceName){window.alert("Enter a service name first.");return;}
  if(!siteOrigin){window.alert("Enter a valid site origin first.");return;}
  if(!state.generatedValue||state.generatedValue==="Select at least one option"){window.alert("Generate a valid password first.");return;}
  const url=new URL(siteOrigin);
  const entry={id:`vault-${Date.now()}`,serviceName,username,siteOrigin,siteHostname:url.hostname.replace(/^www\./,""),encryptedSecret:await encryptWithVaultKey(state.generatedValue,state.currentVaultKey),createdAt:Date.now(),updatedAt:Date.now()};
  state.vaultEntries=[entry,...state.vaultEntries];await chrome.storage.local.set({[KEYS.entries]:state.vaultEntries});elements.serviceNameInput.value="";elements.usernameInput.value="";elements.siteInput.value=state.activeOrigin;renderVaultLists();
}
function normalizeSiteOrigin(value){try{const parsed=new URL(value);if(!/^https?:$/.test(parsed.protocol))return"";return parsed.origin;}catch{return"";}}
async function fillSavedEntry(entryId){const entry=state.vaultEntries.find((item)=>item.id===entryId);if(!entry)return;const tab=await ensureFillableActiveTab();if(!tab)return;await runFillScript(tab.id,{username:entry.username||"",password:await decryptEntrySecret(entry)});}
async function copyEntryUsername(entryId){const entry=state.vaultEntries.find((item)=>item.id===entryId);if(entry?.username)await navigator.clipboard.writeText(entry.username);}
async function copyEntryPassword(entryId){const entry=state.vaultEntries.find((item)=>item.id===entryId);if(entry)await navigator.clipboard.writeText(await decryptEntrySecret(entry));}
async function deleteEntry(entryId){state.vaultEntries=state.vaultEntries.filter((entry)=>entry.id!==entryId);await chrome.storage.local.set({[KEYS.entries]:state.vaultEntries});}
async function exportVault(){const blob=new Blob([JSON.stringify({version:2,accountEmail:state.accountProfile?.email||"",vaultEntries:state.vaultEntries,vaultMasterConfig:state.vaultMasterConfig},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download="endeavor-shield-vault.json";anchor.click();URL.revokeObjectURL(url);}
async function importVault(event){const[file]=event.target.files||[];if(!file)return;const payload=JSON.parse(await file.text());const importedEntries=Array.isArray(payload)?payload:payload.vaultEntries;const importedMasterConfig=Array.isArray(payload)?null:payload.vaultMasterConfig;if(!Array.isArray(importedEntries)){window.alert("Invalid vault export.");return;}if(!state.vaultMasterConfig&&importedMasterConfig)state.vaultMasterConfig=importedMasterConfig;const merged=[...state.vaultEntries];for(const entry of importedEntries){if(!merged.some((candidate)=>candidate.id===entry.id))merged.push(entry);}merged.sort((a,b)=>b.updatedAt-a.updatedAt||b.createdAt-a.createdAt);state.vaultEntries=merged;await chrome.storage.local.set({[KEYS.entries]:state.vaultEntries,[KEYS.config]:state.vaultMasterConfig});event.target.value="";renderAll();}

async function requestPinResetCode(){const email=elements.resetEmailInput.value.trim().toLowerCase();if(!email){window.alert("Enter the Google account email that owns this vault.");return;}await callRecoveryApi("/request-pin-reset",{email});state.resetStatusText=`Reset code requested for ${email}. Check the inbox configured by the recovery backend.`;renderAccount();}
async function completePinReset(){
  const email=elements.resetEmailInput.value.trim().toLowerCase(),code=elements.resetCodeInput.value.trim(),newPin=elements.resetNewPinInput.value.trim(),confirm=elements.resetConfirmPinInput.value.trim();
  if(!state.vaultMasterConfig||state.vaultMasterConfig.version!==2){window.alert("Restore the synced vault on this device before resetting the PIN.");return;}
  if(!email||!code){window.alert("Enter the email and reset code first.");return;}
  if(newPin.length<4){window.alert("Use at least 4 characters for the new PIN.");return;}
  if(newPin!==confirm){window.alert("PIN confirmation does not match.");return;}
  const response=await callRecoveryApi("/consume-pin-reset",{email,code});
  if(!response?.recoveryVaultKey)throw new Error("Recovery response did not include a vault key.");
  if(response.recoveryId!==state.vaultMasterConfig.recovery?.recoveryId){window.alert("Recovery profile does not match this local vault backup.");return;}
  state.currentVaultKey=response.recoveryVaultKey;state.vaultMasterConfig=await buildVaultMasterConfig(newPin,response.recoveryVaultKey,response.recoveryId);state.isUnlocked=true;state.masterPin=newPin;state.vaultMetaText="PIN reset completed. The existing vault key was re-wrapped with your new PIN.";state.resetStatusText="PIN reset succeeded. Sync again to refresh the backend recovery profile.";await chrome.storage.local.set({[KEYS.config]:state.vaultMasterConfig});elements.resetCodeInput.value="";elements.resetNewPinInput.value="";elements.resetConfirmPinInput.value="";renderAll();
}

async function getActiveTab(){const tabs=await chrome.tabs.query({active:true,currentWindow:true});return tabs[0]||null;}
async function ensureFillableActiveTab(){state.activeTab=await getActiveTab();if(!state.activeTab?.id||!state.activeTab.url||!/^https?:/.test(state.activeTab.url)){window.alert("Open a regular website tab first.");return null;}setActiveSiteInfo(state.activeTab.url);return state.activeTab;}
async function runFillScript(tabId,credentials){await chrome.scripting.executeScript({target:{tabId},args:[credentials],func:({username,password})=>{const visible=(element)=>{const style=window.getComputedStyle(element);return style.visibility!=="hidden"&&style.display!=="none";};const dispatchInput=(element,value)=>{element.focus();element.value=value;element.dispatchEvent(new Event("input",{bubbles:true}));element.dispatchEvent(new Event("change",{bubbles:true}));};const candidates=[...document.querySelectorAll("input")].filter(visible);const passwordInput=candidates.find((input)=>input.type==="password");const usernameInput=candidates.find((input)=>{const type=(input.type||"text").toLowerCase();const key=`${input.name} ${input.id} ${input.placeholder} ${input.autocomplete}`.toLowerCase();return["text","email","tel"].includes(type)&&/(user|email|login|phone)/.test(key);})||candidates.find((input)=>["text","email","tel"].includes((input.type||"text").toLowerCase()));if(usernameInput&&username)dispatchInput(usernameInput,username);if(passwordInput&&password)dispatchInput(passwordInput,password);}});}

async function buildVaultMasterConfig(pin,vaultKey,recoveryId=randomId()){return{version:2,createdAt:Date.now(),updatedAt:Date.now(),pinVerifier:await createPinVerifier(pin),wrappedVaultKey:await wrapVaultKey(pin,vaultKey),recovery:{recoveryId}};}
async function createPinVerifier(pin){const salt=crypto.getRandomValues(new Uint8Array(16));const hashBuffer=await deriveHash(pin,salt);return{salt:arrayBufferToBase64(salt.buffer),hash:arrayBufferToBase64(hashBuffer),iterations:100000,algorithm:"PBKDF2-SHA-256"};}
async function verifyPin(pin,verifier){const salt=new Uint8Array(base64ToArrayBuffer(verifier.salt));const hashBuffer=await deriveHash(pin,salt,verifier.iterations||100000);return arrayBufferToBase64(hashBuffer)===verifier.hash;}
async function verifyLegacyPin(pin,legacyConfig){const salt=new Uint8Array(base64ToArrayBuffer(legacyConfig.salt));const hashBuffer=await deriveHash(pin,salt,legacyConfig.iterations||100000);return arrayBufferToBase64(hashBuffer)===legacyConfig.hash;}
async function wrapVaultKey(pin,vaultKey){const salt=crypto.getRandomValues(new Uint8Array(16));const iv=crypto.getRandomValues(new Uint8Array(12));const key=await deriveKey(pin,salt,100000);const cipherBuffer=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,base64ToArrayBuffer(vaultKey));return{salt:arrayBufferToBase64(salt.buffer),iv:arrayBufferToBase64(iv.buffer),cipher:arrayBufferToBase64(cipherBuffer),iterations:100000};}
async function unwrapVaultKey(pin,wrapped){const salt=new Uint8Array(base64ToArrayBuffer(wrapped.salt));const iv=new Uint8Array(base64ToArrayBuffer(wrapped.iv));const key=await deriveKey(pin,salt,wrapped.iterations||100000);const plainBuffer=await crypto.subtle.decrypt({name:"AES-GCM",iv},key,base64ToArrayBuffer(wrapped.cipher));return arrayBufferToBase64(plainBuffer);}
async function encryptWithVaultKey(secret,vaultKey){const iv=crypto.getRandomValues(new Uint8Array(12));const key=await importVaultCryptoKey(vaultKey);const cipherBuffer=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(secret));return{iv:arrayBufferToBase64(iv.buffer),cipher:arrayBufferToBase64(cipherBuffer)};}
async function decryptWithVaultKey(bundle,vaultKey){const iv=new Uint8Array(base64ToArrayBuffer(bundle.iv));const key=await importVaultCryptoKey(vaultKey);const plainBuffer=await crypto.subtle.decrypt({name:"AES-GCM",iv},key,base64ToArrayBuffer(bundle.cipher));return new TextDecoder().decode(plainBuffer);}
async function decryptEntrySecret(entry){if(entry.encryptedSecret)return decryptWithVaultKey(entry.encryptedSecret,state.currentVaultKey);if(entry.encryptedPassword)return decryptLegacySecret(entry.encryptedPassword,state.masterPin);throw new Error("Entry format is not supported.");}
async function decryptLegacySecret(payload,pin){const parsed=typeof payload==="string"?JSON.parse(payload):payload;const key=await deriveKey(pin,new Uint8Array(base64ToArrayBuffer(parsed.salt)),parsed.iterations||100000);const plainBuffer=await crypto.subtle.decrypt({name:"AES-GCM",iv:new Uint8Array(base64ToArrayBuffer(parsed.iv))},key,base64ToArrayBuffer(parsed.cipher));return new TextDecoder().decode(plainBuffer);}
async function importVaultCryptoKey(vaultKey){return crypto.subtle.importKey("raw",base64ToArrayBuffer(vaultKey),{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);}
async function deriveKey(pin,salt,iterations=100000){const keyMaterial=await crypto.subtle.importKey("raw",new TextEncoder().encode(pin),"PBKDF2",false,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations,hash:"SHA-256"},keyMaterial,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);}
async function deriveHash(pin,salt,iterations=100000){const keyMaterial=await crypto.subtle.importKey("raw",new TextEncoder().encode(pin),"PBKDF2",false,["deriveBits"]);return crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations,hash:"SHA-256"},keyMaterial,256);}

async function getAccessToken(interactive){const result=await chrome.identity.getAuthToken({interactive});return typeof result==="string"?result:(result?.token||"");}
async function fetchGoogleProfile(token){const response=await fetch("https://www.googleapis.com/oauth2/v3/userinfo",{headers:{Authorization:`Bearer ${token}`}});if(!response.ok)throw new Error("Failed to fetch Google profile.");const profile=await response.json();return{email:profile.email||"",name:profile.name||"",picture:profile.picture||""};}
async function uploadDriveFile(fileName,content,token){const query=encodeURIComponent(`name='${fileName.replaceAll("'","\\'")}' and trashed=false`);const searchResponse=await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=1`,{headers:{Authorization:`Bearer ${token}`}});if(!searchResponse.ok)throw new Error("Failed to search Google Drive.");const searchResult=await searchResponse.json();const existingFileId=searchResult.files?.[0]?.id;const boundary="-------shieldgenboundary";const body=`\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({name:fileName,mimeType:"application/json"})}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;const endpoint=existingFileId?`https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`:"https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";const response=await fetch(endpoint,{method:existingFileId?"PATCH":"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":`multipart/related; boundary=${boundary}`},body});if(!response.ok)throw new Error("Failed to upload Google Drive backup.");}
async function downloadDriveFile(fileName,token){const query=encodeURIComponent(`name='${fileName.replaceAll("'","\\'")}' and trashed=false`);const searchResponse=await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=1`,{headers:{Authorization:`Bearer ${token}`}});if(!searchResponse.ok)throw new Error("Failed to search Google Drive.");const searchResult=await searchResponse.json();const fileId=searchResult.files?.[0]?.id;if(!fileId)throw new Error("No Shield Gen vault backup found in Google Drive.");const response=await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,{headers:{Authorization:`Bearer ${token}`}});if(!response.ok)throw new Error("Failed to download Google Drive backup.");return response.text();}
async function callRecoveryApi(path,payload,options={}){const headers={"Content-Type":"application/json"};if(options.token)headers.Authorization=`Bearer ${options.token}`;const response=await fetch(`${RECOVERY_API_BASE}${path}`,{method:"POST",headers,body:JSON.stringify(payload)});if(!response.ok)throw new Error(await response.text()||`Recovery API request failed for ${path}`);return response.json();}
function getDriveFileName(){const safe=(state.accountProfile?.email||"local").replace(/[^a-z0-9._-]/gi,"_").toLowerCase();return`${DRIVE_PREFIX}-${safe}.json`;}
function getOauthClientId(){return chrome.runtime.getManifest().oauth2?.client_id||"";}
function ensureSignedIn(){if(!state.accountProfile?.email)throw new Error("Sign in with Google first.");}
function runTask(task){return async()=>{try{await task();}catch(error){console.error(error);window.alert(error?.message||"Request failed.");}};}
function randomBase64(length){return arrayBufferToBase64(crypto.getRandomValues(new Uint8Array(length)).buffer);}
function randomId(){return Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);}
function arrayBufferToBase64(buffer){return btoa(String.fromCharCode(...new Uint8Array(buffer)));}
function base64ToArrayBuffer(value){const binary=atob(value);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i+=1)bytes[i]=binary.charCodeAt(i);return bytes.buffer;}
function escapeHtml(value){return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");}
