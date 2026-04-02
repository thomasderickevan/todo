const WORD_LIST=["apple","bridge","candle","desert","eagle","forest","galaxy","honey","island","jungle","knight","lemon","mountain","nebula","ocean","planet","quartz","river","shadow","tiger","umbrella","valley","winter","xray","yellow","zebra","autumn","blossom","canyon","dawn","echo","falcon","glacier","harvest","iceberg","jade","kite","lagoon","meadow","night","oasis","pebble","quiver","reef","storm","thunder","umbra","vortex","willow","xenon"];
const KEYS={account:"accountProfile",entries:"vaultEntries",config:"vaultMasterConfig",ui:"uiPreferences",session:"vaultSession"};
const DRIVE_PREFIX="endeavor-shield-gen-vault";
const RECOVERY_SCRIPT_URL="https://script.google.com/macros/s/AKfycby9FZ8yzL4o2sZIMG4J1xTdXSvuilKPYz2kfSwD29hFMvk9HqzRof7FmzkCk4lcjzSy9Q/exec";
const state={shieldMode:"password",generatedValue:"",vaultEntries:[],vaultMasterConfig:null,accountProfile:null,isUnlocked:false,masterPin:"",currentVaultKey:"",uiTab:"vault",activeOrigin:"",activeHost:"",searchQuery:"",theme:"sunrise",syncStatusText:"Vault stays local until you sign in and sync.",resetStatusText:"Reset codes are sent through your Google Apps Script recovery endpoint after sync registers this vault.",vaultMetaText:"Vault key is loaded locally.",authenticatorStatusText:"Unlock the vault to use saved authenticator entries.",otpViewerEntryId:"",otpViewerSecret:"",otpTickHandle:null};
const elements={};

document.addEventListener("DOMContentLoaded",async()=>{cacheElements();bindEvents();await hydrateState();renderAll();});

function cacheElements(){["accountStatusPill","accountSyncBadge","accountEmailInput","syncStatusText","signInBtn","signOutBtn","syncVaultBtn","restoreVaultBtn","accountProfileCard","accountProfileImage","accountWelcomeText","accountProfileEmail","themeSelect","generatedValue","passwordLength","wordCount","optUppercase","optLowercase","optNumbers","optSymbols","optCapitalize","separatorSelect","strengthPill","vaultList","serviceNameInput","usernameInput","siteInput","entryPasswordInput","totpSecretInput","manualTotpBtn","manualTotpSecondaryBtn","passwordControls","passphraseControls","importVaultInput","shieldSetupView","shieldUnlockView","shieldUnlockedView","setupPinInput","setupPinConfirmInput","unlockPinInput","activeSiteLabel","siteVaultList","vaultSearchInput","vaultStateBadge","vaultMetaText","showResetBtn","resetEmailInput","resetCodeInput","resetNewPinInput","resetConfirmPinInput","requestResetBtn","completeResetBtn","resetStatusText","authenticatorList","authenticatorCountBadge","authenticatorStatusText","scanQrSecondaryBtn","otpViewerCard","otpViewerTitle","otpViewerSubtitle","otpViewerBadge","otpRingProgress","otpSecondsRemaining","otpViewerCode","copyOtpViewerBtn","closeOtpViewerBtn"].forEach((id)=>{elements[id]=document.getElementById(id);});}

function bindEvents(){
  document.querySelectorAll(".tab-button").forEach((button)=>button.addEventListener("click",()=>switchTab(button.dataset.tab)));
  document.querySelectorAll(".mode-button").forEach((button)=>button.addEventListener("click",()=>switchShieldMode(button.dataset.mode)));
  document.querySelectorAll("[data-theme-swatch]").forEach((button)=>button.addEventListener("click",()=>setTheme(button.dataset.themeSwatch)));
  elements.themeSelect.addEventListener("change",()=>setTheme(elements.themeSelect.value));
  ["passwordLength","wordCount","optUppercase","optLowercase","optNumbers","optSymbols","optCapitalize","separatorSelect"].forEach((id)=>{elements[id].addEventListener("input",handleGeneratorChange);elements[id].addEventListener("change",handleGeneratorChange);});
  elements.vaultSearchInput.addEventListener("input",()=>{state.searchQuery=elements.vaultSearchInput.value.trim().toLowerCase();renderVaultLists();});
  elements.signInBtn.addEventListener("click",signInWithGoogle);
  elements.signOutBtn.addEventListener("click",signOutGoogle);
  elements.syncVaultBtn.addEventListener("click",runTask(syncVaultToDrive));
  elements.restoreVaultBtn.addEventListener("click",runTask(restoreVaultFromDrive));
  document.getElementById("createVaultBtn").addEventListener("click",runTask(createVault));
  document.getElementById("unlockVaultBtn").addEventListener("click",runTask(unlockVault));
  document.getElementById("lockVaultBtn").addEventListener("click",lockVault);
  elements.showResetBtn.addEventListener("click",()=>switchTab("cloud"));
  elements.requestResetBtn.addEventListener("click",runTask(requestPinResetCode));
  elements.completeResetBtn.addEventListener("click",runTask(completePinReset));
  document.getElementById("regenerateBtn").addEventListener("click",()=>{regenerateSecret();renderGenerator();});
  document.getElementById("copyGeneratedBtn").addEventListener("click",copyGeneratedSecret);
  document.getElementById("fillGeneratedBtn").addEventListener("click",fillGeneratedSecret);
  document.getElementById("scanQrBtn").addEventListener("click",runTask(scanQrFromActivePage));
  elements.manualTotpBtn?.addEventListener("click",promptForManualTotpSecret);
  elements.scanQrSecondaryBtn.addEventListener("click",runTask(scanQrFromActivePage));
  elements.manualTotpSecondaryBtn?.addEventListener("click",promptForManualTotpSecret);
  elements.copyOtpViewerBtn?.addEventListener("click",()=>navigator.clipboard.writeText((elements.otpViewerCode?.textContent||"").replace(/\s+/g,"")));
  elements.closeOtpViewerBtn?.addEventListener("click",hideOtpViewer);
  document.getElementById("saveVaultBtn").addEventListener("click",saveLogin);
  document.getElementById("exportVaultBtn").addEventListener("click",exportVault);
  elements.importVaultInput.addEventListener("change",importVault);
  bindEnterSubmit(["setupPinInput","setupPinConfirmInput"],runTask(createVault));
  bindEnterSubmit(["unlockPinInput"],runTask(unlockVault));
  bindEnterSubmit(["resetCodeInput","resetNewPinInput","resetConfirmPinInput"],()=>runTask(completePinReset)());
  chrome.storage.onChanged.addListener((changes,areaName)=>{if(areaName!=="local")return;if(changes[KEYS.entries]){state.vaultEntries=changes[KEYS.entries].newValue||[];renderVaultLists();renderAuthenticatorList();}if(changes[KEYS.config]){state.vaultMasterConfig=changes[KEYS.config].newValue||null;renderShield();renderAuthenticatorList();}if(changes[KEYS.account]){state.accountProfile=changes[KEYS.account].newValue||null;renderAccount();}if(changes[KEYS.ui]){const prefs=changes[KEYS.ui].newValue||{};state.theme=prefs.theme||state.theme;state.uiTab=prefs.activeTab||state.uiTab;renderTheme();renderTabs();}});
}

async function hydrateState(){
  const sessionStore=getSessionStorageArea();
  const [stored,storedSession]=await Promise.all([
    chrome.storage.local.get([KEYS.entries,KEYS.config,KEYS.account,KEYS.ui]),
    sessionStore.get([KEYS.session])
  ]);
  state.vaultEntries=stored[KEYS.entries]||[];
  state.vaultMasterConfig=stored[KEYS.config]||null;
  state.accountProfile=stored[KEYS.account]||null;
  state.theme=stored[KEYS.ui]?.theme||state.theme;
  state.uiTab=stored[KEYS.ui]?.activeTab||state.uiTab;
  restoreVaultSession(storedSession[KEYS.session]||null);
  const pageTab=await getActiveTab();
  setActiveSiteInfo(pageTab?.url||"");
  elements.siteInput.value=state.activeOrigin;
  elements.resetEmailInput.value=state.accountProfile?.email||"";
  regenerateSecret();
}

function renderAll(){renderTheme();renderTabs();renderAccount();renderShield();renderAuthenticatorList();renderOtpViewer();}
function renderAccount(){
  const signedIn=Boolean(state.accountProfile?.email);
  elements.accountStatusPill.textContent=signedIn?"Google connected":"Signed out";
  elements.accountSyncBadge.textContent=signedIn?"Drive ready":"Local only";
  elements.accountEmailInput.value=state.accountProfile?.email||"";
  elements.accountProfileCard.classList.toggle("hidden",!signedIn);
  elements.accountProfileImage.src=state.accountProfile?.picture||"brand-icon.png";
  elements.accountWelcomeText.textContent=signedIn?`Welcome, ${state.accountProfile?.name||"there"}`:"Welcome";
  elements.accountProfileEmail.textContent=state.accountProfile?.email||"No Google account connected";
  elements.syncStatusText.textContent=state.syncStatusText;
  elements.resetStatusText.textContent=state.resetStatusText;
  elements.signInBtn.classList.toggle("hidden",signedIn);
  elements.signOutBtn.classList.toggle("hidden",!signedIn);
  elements.syncVaultBtn.disabled=!signedIn;
  elements.restoreVaultBtn.disabled=!signedIn;
}
function renderTheme(){document.body.dataset.theme=state.theme;elements.themeSelect.value=state.theme;document.querySelectorAll("[data-theme-swatch]").forEach((button)=>button.classList.toggle("active",button.dataset.themeSwatch===state.theme));}
function renderTabs(){document.querySelectorAll(".tab-button").forEach((button)=>button.classList.toggle("active",button.dataset.tab===state.uiTab));document.querySelectorAll(".tab-panel").forEach((panel)=>panel.classList.toggle("active",panel.id===`${state.uiTab}Tab`));}
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
function renderAuthenticatorList(){
  const authenticatorEntries=state.vaultEntries.filter((entry)=>entry.encryptedTotpSecret);
  elements.authenticatorCountBadge.textContent=`${authenticatorEntries.length} saved`;
  if(!state.isUnlocked){hideOtpViewer();elements.authenticatorList.className="list-block empty";elements.authenticatorList.textContent="Unlock the vault to view authenticator entries.";elements.authenticatorStatusText.textContent="Unlock the vault to use saved authenticator entries.";return;}
  elements.authenticatorStatusText.textContent=authenticatorEntries.length?"Copy one-time codes from your saved entries.":"Scan a QR code or save a TOTP secret on a vault entry.";
  if(!authenticatorEntries.length){hideOtpViewer();elements.authenticatorList.className="list-block empty";elements.authenticatorList.textContent="No authenticator entries saved yet.";return;}
  elements.authenticatorList.className="list-block";elements.authenticatorList.innerHTML="";
  for(const entry of authenticatorEntries){const wrapper=document.createElement("article");wrapper.className="vault-entry";wrapper.innerHTML=`<div class="entry-header"><div><div class="entry-service">${escapeHtml(entry.serviceName)}</div><div class="entry-meta">${escapeHtml(entry.username||"No username")}</div></div><span class="site-badge">Authenticator</span></div><div class="entry-actions spread"><button class="ghost-button" data-action="view-otp" data-id="${entry.id}">View code</button><button class="ghost-button" data-action="fill-otp" data-id="${entry.id}">Fill code</button><button class="ghost-button" data-action="copy-otp" data-id="${entry.id}">Copy code</button><button class="ghost-button" data-action="copy-secret" data-id="${entry.id}">Copy secret</button></div>`;wrapper.querySelectorAll("button").forEach((button)=>button.addEventListener("click",async()=>{const{action,id}=button.dataset;if(action==="view-otp")await showOtpViewer(id);if(action==="fill-otp")await fillEntryOtp(id);if(action==="copy-otp")await copyEntryOtp(id);if(action==="copy-secret")await copyEntryTotpSecret(id);}));elements.authenticatorList.appendChild(wrapper);}
}
function renderOtpViewer(){
  if(!elements.otpViewerCard||!elements.otpViewerTitle||!elements.otpViewerSubtitle||!elements.otpSecondsRemaining||!elements.otpViewerCode||!elements.otpRingProgress)return;
  const activeEntry=state.vaultEntries.find((entry)=>entry.id===state.otpViewerEntryId);
  if(!state.otpViewerSecret||!activeEntry||!state.isUnlocked){elements.otpViewerCard.classList.add("hidden");return;}
  elements.otpViewerCard.classList.remove("hidden");
  elements.otpViewerTitle.textContent=activeEntry.serviceName||"Authenticator code";
  elements.otpViewerSubtitle.textContent=activeEntry.username||"Current 6-digit code";
  const secondsRemaining=30-(Math.floor(Date.now()/1000)%30);
  elements.otpSecondsRemaining.textContent=String(secondsRemaining);
  elements.otpViewerCode.textContent=formatOtpCode(generateTotpCode(state.otpViewerSecret));
  const radius=52;
  const circumference=2*Math.PI*radius;
  const progress=secondsRemaining/30;
  elements.otpRingProgress.style.strokeDasharray=String(circumference);
  elements.otpRingProgress.style.strokeDashoffset=String(circumference*(1-progress));
}
function renderGenerator(){
  elements.generatedValue.value=state.generatedValue;
  elements.passwordControls.classList.toggle("hidden",state.shieldMode!=="password");
  elements.passphraseControls.classList.toggle("hidden",state.shieldMode!=="passphrase");
  elements.strengthPill.textContent=computeStrengthLabel();
}

function switchTab(tabId){state.uiTab=tabId;chrome.storage.local.set({[KEYS.ui]:{theme:state.theme,activeTab:state.uiTab}});renderTabs();}
function setTheme(theme){state.theme=theme;chrome.storage.local.set({[KEYS.ui]:{theme:state.theme,activeTab:state.uiTab}});renderTheme();}
function switchShieldMode(mode){state.shieldMode=mode;document.querySelectorAll(".mode-button").forEach((button)=>button.classList.toggle("active",button.dataset.mode===mode));regenerateSecret();renderGenerator();}
function handleGeneratorChange(){regenerateSecret();renderGenerator();}
function setActiveSiteInfo(url){try{const parsed=new URL(url);if(!/^https?:$/.test(parsed.protocol))throw new Error("unsupported");state.activeOrigin=parsed.origin;state.activeHost=parsed.hostname.replace(/^www\./,"");}catch{state.activeOrigin="";state.activeHost="";}}

async function signInWithGoogle(){
  if(getOauthClientId().includes("YOUR_GOOGLE_OAUTH_CLIENT_ID")){window.alert("Set a real OAuth client ID in extension/manifest.json before using Google sign-in.");return;}
  try{const token=await getAccessToken(true);const profile=await fetchGoogleProfile(token);state.accountProfile=profile;state.syncStatusText="Google account connected. Restoring Drive backups...";elements.resetEmailInput.value=profile.email||"";await chrome.storage.local.set({[KEYS.account]:profile});await restoreFromDriveOnSignIn(token);await registerRecoveryProfileIfPossible({token});renderAccount();}catch(error){console.error(error);window.alert("Google sign-in failed. Check the extension OAuth client and try again.");}
}
async function signOutGoogle(){
  state.accountProfile=null;state.syncStatusText="Signed out. Vault data remains local on this device, including your saved authenticator entries.";elements.resetEmailInput.value="";await chrome.storage.local.remove(KEYS.account);renderAccount();
}

async function syncVaultToDrive(){
  ensureSignedIn();
  const token=await getAccessToken(false);
  const content=JSON.stringify({version:2,exportedAt:Date.now(),accountEmail:state.accountProfile?.email||"",vaultMasterConfig:state.vaultMasterConfig,vaultEntries:state.vaultEntries},null,2);
  const authenticatorContent=JSON.stringify({version:1,exportedAt:Date.now(),accountEmail:state.accountProfile?.email||"",authenticatorEntries:getAuthenticatorEntriesForBackup()},null,2);
  await uploadDriveFile(getDriveFileName(),content,token);
  await uploadDriveFile(getDriveAuthenticatorFileName(),authenticatorContent,token);
  await uploadDriveFile(getDriveBackupFileName(),serializeVaultEntriesToCsv(state.vaultEntries),token,"text/csv");
  state.syncStatusText=`Synced vault, authenticator JSON, and CSV backup to Google Drive.`;
  if(state.isUnlocked&&state.currentVaultKey&&state.vaultMasterConfig?.recovery?.recoveryId){
    try{
      await callRecoveryApi("registerRecoveryProfile",{email:state.accountProfile?.email||"",recoveryId:state.vaultMasterConfig.recovery.recoveryId,recoveryVaultKey:state.currentVaultKey},{token});
      state.resetStatusText="Recovery profile registered with Apps Script. Email reset can restore access to the same vault key.";
    }catch(error){
      console.error(error);
      state.resetStatusText="Drive sync succeeded, but Apps Script recovery registration failed. Check the script deployment URL and try sync again.";
    }
  }else if(!state.isUnlocked){
    state.resetStatusText="Drive sync completed. Unlock once before syncing again to register the recovery profile.";
  }
  renderAccount();
}

async function restoreVaultFromDrive(){
  ensureSignedIn();
  const token=await getAccessToken(false);
  const restored=await readDriveBackups(token);
  if(!restored.vaultMasterConfig||!Array.isArray(restored.vaultEntries))throw new Error("Drive backup format is invalid.");
  state.vaultEntries=restored.vaultEntries;state.vaultMasterConfig=restored.vaultMasterConfig;state.isUnlocked=false;state.masterPin="";state.currentVaultKey="";state.syncStatusText="Restored encrypted vault data from Google Drive. Unlock with your PIN or use reset if needed.";
  await clearVaultSession();
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
  await persistVaultSession();
  await chrome.storage.local.set({[KEYS.config]:state.vaultMasterConfig,[KEYS.entries]:state.vaultEntries});
  await registerRecoveryProfileIfPossible();
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
  await persistVaultSession();
  await registerRecoveryProfileIfPossible();
  elements.unlockPinInput.value="";renderAll();
}
async function lockVault(){state.isUnlocked=false;state.masterPin="";state.currentVaultKey="";state.vaultMetaText="Vault key is loaded locally.";hideOtpViewer();await clearVaultSession();renderShield();}

async function migrateLegacyVault(pin){
  if(!await verifyLegacyPin(pin,state.vaultMasterConfig)){window.alert("Incorrect master PIN.");return;}
  const vaultKey=randomBase64(32);
  const migrated=[];
  for(const entry of state.vaultEntries){
    const password=await decryptLegacySecret(entry.encryptedPassword,pin);
    migrated.push({id:entry.id||`vault-${Date.now()}-${Math.random().toString(16).slice(2)}`,serviceName:entry.serviceName||"Untitled",username:entry.username||"",siteOrigin:entry.siteOrigin||"",siteHostname:entry.siteHostname||"",encryptedSecret:await encryptWithVaultKey(password,vaultKey),createdAt:entry.createdAt||Date.now(),updatedAt:entry.updatedAt||Date.now()});
  }
  state.vaultEntries=migrated;state.vaultMasterConfig=await buildVaultMasterConfig(pin,vaultKey);state.isUnlocked=true;state.masterPin=pin;state.currentVaultKey=vaultKey;state.vaultMetaText="Legacy vault migrated to wrapped vault-key storage.";
  await persistVaultSession();
  await chrome.storage.local.set({[KEYS.config]:state.vaultMasterConfig,[KEYS.entries]:state.vaultEntries});
  await registerRecoveryProfileIfPossible();
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
    const otpButton=entry.encryptedTotpSecret?`<button class="ghost-button" data-action="copy-otp" data-id="${entry.id}">Copy code</button>`:"";
    const wrapper=document.createElement("article");wrapper.className="vault-entry";wrapper.innerHTML=`<div class="entry-header"><div><div class="entry-service">${escapeHtml(entry.serviceName)}</div><div class="entry-meta">${escapeHtml(entry.username||"No username")} • ${escapeHtml(entry.siteOrigin||"No site")}</div></div><span class="site-badge">${siteMatches(entry,state.activeHost)?"Match":"Vault"}</span></div><div class="entry-actions spread"><button class="ghost-button" data-action="fill" data-id="${entry.id}">Fill page</button><button class="ghost-button" data-action="copy-user" data-id="${entry.id}">Copy user</button><button class="ghost-button" data-action="copy-pass" data-id="${entry.id}">Copy pass</button>${otpButton}<button class="ghost-button" data-action="delete" data-id="${entry.id}">Delete</button></div>`;
    wrapper.querySelectorAll("button").forEach((button)=>button.addEventListener("click",async()=>{const{action,id}=button.dataset;if(action==="fill")await fillSavedEntry(id);if(action==="copy-user")await copyEntryUsername(id);if(action==="copy-pass")await copyEntryPassword(id);if(action==="copy-otp")await copyEntryOtp(id);if(action==="delete")await deleteEntry(id);}));
    container.appendChild(wrapper);
  }
}

async function copyGeneratedSecret(){if(state.generatedValue)await navigator.clipboard.writeText(state.generatedValue);}
async function fillGeneratedSecret(){const tab=await ensureFillableActiveTab();if(!tab)return;await runFillScript(tab.id,{username:elements.usernameInput.value.trim(),password:state.generatedValue});}
async function saveLogin(){
  if(!state.isUnlocked||!state.currentVaultKey){window.alert("Unlock the vault first.");return;}
  const serviceName=elements.serviceNameInput.value.trim();const username=elements.usernameInput.value.trim();const siteOrigin=normalizeSiteOrigin(elements.siteInput.value.trim()||state.activeOrigin);
  const passwordValue=(elements.entryPasswordInput.value.trim()||state.generatedValue||"").trim();
  if(!serviceName){window.alert("Enter a service name first.");return;}
  if(!siteOrigin){window.alert("Enter a valid site origin first.");return;}
  if(!passwordValue||passwordValue==="Select at least one option"){window.alert("Enter a password or generate one first.");return;}
  const url=new URL(siteOrigin);
  const totpSecret=normalizeTotpSecret(elements.totpSecretInput.value.trim());
  const entry={id:`vault-${Date.now()}`,serviceName,username,siteOrigin,siteHostname:url.hostname.replace(/^www\./,""),encryptedSecret:await encryptWithVaultKey(passwordValue,state.currentVaultKey),createdAt:Date.now(),updatedAt:Date.now()};
  if(!totpSecret){window.alert("Add an authenticator secret before saving this login.");return;}
  entry.encryptedTotpSecret=await encryptWithVaultKey(totpSecret,state.currentVaultKey);
  state.vaultEntries=[entry,...state.vaultEntries];await chrome.storage.local.set({[KEYS.entries]:state.vaultEntries});elements.serviceNameInput.value="";elements.usernameInput.value="";elements.siteInput.value=state.activeOrigin;elements.entryPasswordInput.value="";elements.totpSecretInput.value="";renderVaultLists();await autoSyncVaultIfSignedIn("Saved entry and synced to Drive.");
}
async function scanQrFromActivePage(){
  const tab=await ensureFillableActiveTab();
  if(!tab?.id)throw new Error("Open the page with the QR code first.");
  const [{result}] = await chrome.scripting.executeScript({
    target:{tabId:tab.id},
    func:async()=>{
      const visible=(element)=>{const style=window.getComputedStyle(element);const rect=element.getBoundingClientRect();return style.display!=="none"&&style.visibility!=="hidden"&&rect.width>24&&rect.height>24;};
      if(typeof BarcodeDetector!=="undefined"){
        const detector=new BarcodeDetector({formats:["qr_code"]});
        const candidates=[...document.querySelectorAll("img,canvas,video")].filter(visible);
        for(const element of candidates){
          try{
            const codes=await detector.detect(element);
            const qr=codes.find((item)=>item.rawValue);
            if(qr?.rawValue)return qr.rawValue;
          }catch{}
        }
      }
      const textCandidates=[
        ...document.querySelectorAll("a[href^='otpauth://'], input[value*='otpauth://'], textarea, code, pre, [data-otp], [data-otpauth]")
      ];
      for(const element of textCandidates){
        const raw=element.getAttribute?.("href")||element.getAttribute?.("value")||element.getAttribute?.("data-otp")||element.getAttribute?.("data-otpauth")||element.textContent||"";
        const text=String(raw).trim();
        if(text.includes("otpauth://"))return text;
      }
      const bodyText=document.body?.innerText||"";
      const otpauthMatch=bodyText.match(/otpauth:\/\/[^\s"'<>]+/i);
      if(otpauthMatch)return otpauthMatch[0];
      const secretMatch=bodyText.match(/secret\s*[:=]\s*([A-Z2-7 ]{16,})/i);
      if(secretMatch)return secretMatch[1];
      throw new Error("No QR code or authenticator secret was found on the active page.");
    }
  });
  const secret=parseOtpAuthSecret(result);
  elements.totpSecretInput.value=secret;
  state.uiTab="vault";
  renderTabs();
}
function promptForManualTotpSecret(){
  const entered=window.prompt("Enter the authenticator secret or paste an otpauth:// URL","");
  if(entered===null)return;
  const secret=parseOtpAuthSecret(entered);
  elements.totpSecretInput.value=secret;
  state.uiTab="vault";
  renderTabs();
}
function normalizeSiteOrigin(value){try{const parsed=new URL(value);if(!/^https?:$/.test(parsed.protocol))return"";return parsed.origin;}catch{return"";}}
async function fillSavedEntry(entryId){const entry=state.vaultEntries.find((item)=>item.id===entryId);if(!entry)return;const tab=await ensureFillableActiveTab();if(!tab)return;await runFillScript(tab.id,{username:entry.username||"",password:await decryptEntrySecret(entry)});}
async function copyEntryUsername(entryId){const entry=state.vaultEntries.find((item)=>item.id===entryId);if(entry?.username)await navigator.clipboard.writeText(entry.username);}
async function copyEntryPassword(entryId){const entry=state.vaultEntries.find((item)=>item.id===entryId);if(entry)await navigator.clipboard.writeText(await decryptEntrySecret(entry));}
async function copyEntryOtp(entryId){const entry=state.vaultEntries.find((item)=>item.id===entryId);if(!entry?.encryptedTotpSecret)throw new Error("No authenticator secret saved for this entry.");const secret=await decryptWithVaultKey(entry.encryptedTotpSecret,state.currentVaultKey);await navigator.clipboard.writeText(generateTotpCode(secret));}
async function fillEntryOtp(entryId){const entry=state.vaultEntries.find((item)=>item.id===entryId);if(!entry?.encryptedTotpSecret)throw new Error("No authenticator secret saved for this entry.");const tab=await ensureFillableActiveTab();if(!tab)return;const secret=await decryptWithVaultKey(entry.encryptedTotpSecret,state.currentVaultKey);await runOtpFillScript(tab.id,{code:generateTotpCode(secret)});}
async function copyEntryTotpSecret(entryId){const entry=state.vaultEntries.find((item)=>item.id===entryId);if(!entry?.encryptedTotpSecret)throw new Error("No authenticator secret saved for this entry.");await navigator.clipboard.writeText(await decryptWithVaultKey(entry.encryptedTotpSecret,state.currentVaultKey));}
async function showOtpViewer(entryId){const entry=state.vaultEntries.find((item)=>item.id===entryId);if(!entry?.encryptedTotpSecret)throw new Error("No authenticator secret saved for this entry.");state.otpViewerEntryId=entryId;state.otpViewerSecret=await decryptWithVaultKey(entry.encryptedTotpSecret,state.currentVaultKey);startOtpTicker();renderOtpViewer();}
function hideOtpViewer(){state.otpViewerEntryId="";state.otpViewerSecret="";stopOtpTicker();elements.otpViewerCard?.classList.add("hidden");}
async function deleteEntry(entryId){state.vaultEntries=state.vaultEntries.filter((entry)=>entry.id!==entryId);await chrome.storage.local.set({[KEYS.entries]:state.vaultEntries});await autoSyncVaultIfSignedIn("Deleted entry and synced to Drive.");}
async function exportVault(){const csv=serializeVaultEntriesToCsv(state.vaultEntries);const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download="endeavor-shield-vault.csv";anchor.click();URL.revokeObjectURL(url);}
async function importVault(event){
  const [file]=event.target.files||[];
  if(!file)return;
  try{
    const text=await file.text();
    let entries=[];
    let incomingConfig=null;
    if(file.type.includes('json')||file.name.toLowerCase().endsWith('.json')){
      const parsed=JSON.parse(text);
      entries=Array.isArray(parsed)?parsed:(Array.isArray(parsed.vaultEntries)?parsed.vaultEntries:(Array.isArray(parsed.entries)?parsed.entries:[]));
      incomingConfig=parsed.vaultMasterConfig||parsed.vaultConfig||null;
    }else{
      entries=parseVaultCsv(text);
    }
    if(!Array.isArray(entries)||!entries.length)throw new Error("Import file contains no vault entries.");
    const merged=[...state.vaultEntries];
    for(const entry of entries){
      if(!merged.some((candidate)=>candidate.id===entry.id))merged.push(entry);
    }
    merged.sort((a,b)=>b.updatedAt-a.updatedAt||b.createdAt-a.createdAt);
    state.vaultEntries=merged;
    if(incomingConfig&&incomingConfig.version){
      state.vaultMasterConfig=incomingConfig;
    }
    await chrome.storage.local.set({[KEYS.entries]:state.vaultEntries,[KEYS.config]:state.vaultMasterConfig});
    renderAll();
    await autoSyncVaultIfSignedIn("Imported entries and synced to Drive.");
  }catch(error){
    console.error(error);
    window.alert(`Import failed: ${error?.message||'Invalid file.'}`);
  }finally{
    event.target.value="";
  }
}

async function requestPinResetCode(){
  const email=elements.resetEmailInput.value.trim().toLowerCase();
  if(!email){window.alert("Enter the Google account email that owns this vault.");return;}
  await registerRecoveryProfileIfPossible();
  await callRecoveryApi("requestPinReset",{email});
  state.resetStatusText=`Reset code requested for ${email}. Check the inbox configured by your Apps Script email sender.`;
  renderAccount();
}
async function completePinReset(){
  const email=elements.resetEmailInput.value.trim().toLowerCase(),code=elements.resetCodeInput.value.trim(),newPin=elements.resetNewPinInput.value.trim(),confirm=elements.resetConfirmPinInput.value.trim();
  if(!state.vaultMasterConfig||state.vaultMasterConfig.version!==2){window.alert("Restore the synced vault on this device before resetting the PIN.");return;}
  if(!email||!code){window.alert("Enter the email and reset code first.");return;}
  if(newPin.length<4){window.alert("Use at least 4 characters for the new PIN.");return;}
  if(newPin!==confirm){window.alert("PIN confirmation does not match.");return;}
  const response=await callRecoveryApi("consumePinReset",{email,code});
  if(!response?.recoveryVaultKey)throw new Error("Recovery response did not include a vault key.");
  if(response.recoveryId!==state.vaultMasterConfig.recovery?.recoveryId){window.alert("Recovery profile does not match this local vault backup.");return;}
  state.currentVaultKey=response.recoveryVaultKey;state.vaultMasterConfig=await buildVaultMasterConfig(newPin,response.recoveryVaultKey,response.recoveryId);state.isUnlocked=true;state.masterPin=newPin;state.vaultMetaText="PIN reset completed. The existing vault key was re-wrapped with your new PIN.";state.resetStatusText="PIN reset succeeded. Sync again to refresh the backend recovery profile.";await persistVaultSession();await chrome.storage.local.set({[KEYS.config]:state.vaultMasterConfig});await registerRecoveryProfileIfPossible();elements.resetCodeInput.value="";elements.resetNewPinInput.value="";elements.resetConfirmPinInput.value="";renderAll();
}

async function getActiveTab(){const tabs=await chrome.tabs.query({active:true,currentWindow:true});return tabs[0]||null;}
async function ensureFillableActiveTab(){const tab=await getActiveTab();if(!tab?.id||!tab.url||!/^https?:/.test(tab.url)){window.alert("Open a regular website tab first.");return null;}setActiveSiteInfo(tab.url);return tab;}
async function runFillScript(tabId,credentials){await chrome.scripting.executeScript({target:{tabId},args:[credentials],func:({username,password})=>{const visible=(element)=>{const style=window.getComputedStyle(element);return style.visibility!=="hidden"&&style.display!=="none";};const dispatchInput=(element,value)=>{element.focus();element.value=value;element.dispatchEvent(new Event("input",{bubbles:true}));element.dispatchEvent(new Event("change",{bubbles:true}));};const candidates=[...document.querySelectorAll("input")].filter(visible);const passwordInput=candidates.find((input)=>input.type==="password");const usernameInput=candidates.find((input)=>{const type=(input.type||"text").toLowerCase();const key=`${input.name} ${input.id} ${input.placeholder} ${input.autocomplete}`.toLowerCase();return["text","email","tel"].includes(type)&&/(user|email|login|phone)/.test(key);})||candidates.find((input)=>["text","email","tel"].includes((input.type||"text").toLowerCase()));if(usernameInput&&username)dispatchInput(usernameInput,username);if(passwordInput&&password)dispatchInput(passwordInput,password);}});}
async function runOtpFillScript(tabId,details){await chrome.scripting.executeScript({target:{tabId},args:[details],func:({code})=>{const visible=(element)=>{const style=window.getComputedStyle(element);const rect=element.getBoundingClientRect();return style.visibility!=="hidden"&&style.display!=="none"&&!element.disabled&&!element.readOnly&&rect.width>0&&rect.height>0;};const dispatchInput=(element,value)=>{element.focus();element.value=value;element.dispatchEvent(new Event("input",{bubbles:true}));element.dispatchEvent(new Event("change",{bubbles:true}));};const candidates=[...document.querySelectorAll("input, textarea")].filter(visible);const otpInput=candidates.find((input)=>{const type=(input.type||"text").toLowerCase();const key=`${input.name} ${input.id} ${input.placeholder} ${input.autocomplete} ${input.ariaLabel||""}`.toLowerCase();return["text","tel","number","password"].includes(type)&&/(otp|totp|2fa|mfa|auth|code|verification|one.?time|security)/.test(key);})||candidates.find((input)=>{const autocomplete=(input.autocomplete||"").toLowerCase();return autocomplete==="one-time-code";})||candidates.find((input)=>["text","tel","number"].includes((input.type||"text").toLowerCase()));if(!otpInput)throw new Error("No visible code input was found on the active page.");dispatchInput(otpInput,code);}});}

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

async function getAccessToken(interactive){
  if(!interactive){
    const token=state.accountProfile?.accessToken||"";
    if(!token)throw new Error("Sign in with Google first.");
    return token;
  }
  const redirectUri=chrome.identity.getRedirectURL();
  const authUrl=new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id",getOauthClientId());
  authUrl.searchParams.set("response_type","token");
  authUrl.searchParams.set("redirect_uri",redirectUri);
  authUrl.searchParams.set("prompt","consent");
  authUrl.searchParams.set("scope",[
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/drive.file"
  ].join(" "));
  const responseUrl=await chrome.identity.launchWebAuthFlow({url:authUrl.toString(),interactive:true});
  if(!responseUrl)throw new Error("Google auth flow was cancelled.");
  const hash=new URL(responseUrl).hash.replace(/^#/,"");
  const params=new URLSearchParams(hash);
  const token=params.get("access_token");
  if(!token)throw new Error("Google auth flow did not return an access token.");
  return token;
}
async function fetchGoogleProfile(token){const response=await fetch("https://www.googleapis.com/oauth2/v3/userinfo",{headers:{Authorization:`Bearer ${token}`}});if(!response.ok)throw new Error("Failed to fetch Google profile.");const profile=await response.json();return{email:profile.email||"",name:profile.name||"",picture:profile.picture||"",accessToken:token};}
async function uploadDriveFile(fileName,content,token,mimeType="application/json"){const query=encodeURIComponent(`name='${fileName.replaceAll("'","\\'")}' and trashed=false`);const searchResponse=await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=1`,{headers:{Authorization:`Bearer ${token}`}});if(!searchResponse.ok)throw new Error("Failed to search Google Drive.");const searchResult=await searchResponse.json();const existingFileId=searchResult.files?.[0]?.id;const boundary="-------shieldgenboundary";const body=`\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({name:fileName,mimeType})}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n${content}\r\n--${boundary}--`;const endpoint=existingFileId?`https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`:"https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";const response=await fetch(endpoint,{method:existingFileId?"PATCH":"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":`multipart/related; boundary=${boundary}`},body});if(!response.ok)throw new Error("Failed to upload Google Drive backup.");}
async function downloadDriveFile(fileName,token){const query=encodeURIComponent(`name='${fileName.replaceAll("'","\\'")}' and trashed=false`);const searchResponse=await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=1`,{headers:{Authorization:`Bearer ${token}`}});if(!searchResponse.ok)throw new Error("Failed to search Google Drive.");const searchResult=await searchResponse.json();const fileId=searchResult.files?.[0]?.id;if(!fileId)throw new Error("No Shield Gen vault backup found in Google Drive.");const response=await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,{headers:{Authorization:`Bearer ${token}`}});if(!response.ok)throw new Error("Failed to download Google Drive backup.");return response.text();}
async function readDriveBackups(token){
  const payload=JSON.parse(await downloadDriveFile(getDriveFileName(),token));
  if(!payload||!Array.isArray(payload.vaultEntries)||!payload.vaultMasterConfig)throw new Error("Drive backup format is invalid.");
  let restoredEntries=payload.vaultEntries;
  try{
    const authenticatorPayload=JSON.parse(await downloadDriveFile(getDriveAuthenticatorFileName(),token));
    if(Array.isArray(authenticatorPayload?.authenticatorEntries)&&authenticatorPayload.authenticatorEntries.length){
      restoredEntries=mergeAuthenticatorEntries(restoredEntries,authenticatorPayload.authenticatorEntries);
    }
  }catch(error){
    console.warn("Authenticator backup restore skipped.",error);
  }
  return{vaultEntries:restoredEntries,vaultMasterConfig:payload.vaultMasterConfig};
}
async function callRecoveryApi(action,payload,options={}){
  ensureRecoveryConfigured();
  const headers={"Content-Type":"application/json"};
  if(options.token)headers.Authorization=`Bearer ${options.token}`;
  const response=await fetch(RECOVERY_SCRIPT_URL,{method:"POST",headers,body:JSON.stringify({...payload,action})});
  if(!response.ok)throw new Error(await response.text()||`Recovery API request failed for ${action}`);
  const result=await response.json();
  if(result?.ok===false)throw new Error(result.error||`Recovery API request failed for ${action}`);
  return result;
}
function getDriveFileName(){const safe=(state.accountProfile?.email||"local").replace(/[^a-z0-9._-]/gi,"_").toLowerCase();return`${DRIVE_PREFIX}-${safe}.json`;}
function getDriveAuthenticatorFileName(){const safe=(state.accountProfile?.email||"local").replace(/[^a-z0-9._-]/gi,"_").toLowerCase();return`${DRIVE_PREFIX}-${safe}-authenticators.json`;}
function getDriveBackupFileName(){const safe=(state.accountProfile?.email||"local").replace(/[^a-z0-9._-]/gi,"_").toLowerCase();return`${DRIVE_PREFIX}-${safe}.csv`;}
function getOauthClientId(){return chrome.runtime.getManifest().oauth2?.client_id||"";}
function ensureSignedIn(){if(!state.accountProfile?.email)throw new Error("Sign in with Google first.");}
function ensureRecoveryConfigured(){if(RECOVERY_SCRIPT_URL.includes("PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE"))throw new Error("Configure the Google Apps Script recovery URL in extension/popup.js before using Send code.");}
async function restoreFromDriveOnSignIn(token){
  try{
    const restored=await readDriveBackups(token);
    const mergedEntries=mergeVaultEntries(state.vaultEntries,restored.vaultEntries);
    const nextConfig=state.vaultMasterConfig||restored.vaultMasterConfig||null;
    state.vaultEntries=mergedEntries;
    state.vaultMasterConfig=nextConfig;
    state.syncStatusText="Google account connected. Vault and authenticator backups restored from Drive.";
    await chrome.storage.local.set({[KEYS.entries]:state.vaultEntries,[KEYS.config]:state.vaultMasterConfig});
  }catch(error){
    console.warn("Drive auto-restore skipped.",error);
    state.syncStatusText="Google account connected. No Drive backup was restored yet.";
  }
}
async function registerRecoveryProfileIfPossible(options={}){
  const email=state.accountProfile?.email?.trim().toLowerCase()||"";
  if(!email||!state.isUnlocked||!state.currentVaultKey||!state.vaultMasterConfig?.recovery?.recoveryId)return false;
  await callRecoveryApi("registerRecoveryProfile",{email,recoveryId:state.vaultMasterConfig.recovery.recoveryId,recoveryVaultKey:state.currentVaultKey},options);
  state.resetStatusText="Recovery profile is ready for email-based PIN reset.";
  return true;
}
async function autoSyncVaultIfSignedIn(successText){
  if(!state.accountProfile?.email)return;
  try{
    await syncVaultToDrive();
    if(successText)state.syncStatusText=successText;
    renderAccount();
  }catch(error){
    console.error(error);
    state.syncStatusText="Local save succeeded, but automatic Drive sync failed.";
    renderAccount();
  }
}
function runTask(task){return async()=>{try{await task();}catch(error){console.error(error);window.alert(error?.message||"Request failed.");}};}
function bindEnterSubmit(ids,handler){ids.forEach((id)=>document.getElementById(id)?.addEventListener("keydown",async(event)=>{if(event.key==="Enter"||event.code==="NumpadEnter"){event.preventDefault();await handler();}}));}
function startOtpTicker(){stopOtpTicker();state.otpTickHandle=window.setInterval(renderOtpViewer,1000);}
function stopOtpTicker(){if(state.otpTickHandle){window.clearInterval(state.otpTickHandle);state.otpTickHandle=null;}}
function normalizeTotpSecret(value){return String(value||"").replaceAll(/\s+/g,"").toUpperCase();}
function formatOtpCode(code){return `${code.slice(0,3)} ${code.slice(3)}`;}
function parseOtpAuthSecret(value){const text=String(value||"").trim();if(!text)throw new Error("QR code did not contain any data.");if(text.startsWith("otpauth://")){const url=new URL(text);const secret=url.searchParams.get("secret");if(!secret)throw new Error("Authenticator QR code is missing the secret.");return normalizeTotpSecret(secret);}return normalizeTotpSecret(text);}
function generateTotpCode(secret){const normalized=normalizeTotpSecret(secret);if(!normalized)throw new Error("Authenticator secret is empty.");const key=decodeBase32(normalized);const counter=Math.floor(Date.now()/30000);const buffer=new ArrayBuffer(8);const view=new DataView(buffer);view.setUint32(4,counter,false);const hmac=sha1Hmac(key,new Uint8Array(buffer));const offset=hmac[hmac.length-1]&15;const binary=((hmac[offset]&127)<<24)|((hmac[offset+1]&255)<<16)|((hmac[offset+2]&255)<<8)|(hmac[offset+3]&255);return String(binary%1000000).padStart(6,"0");}
function decodeBase32(value){const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";let bits="";for(const char of value.replaceAll("=","")){const index=alphabet.indexOf(char);if(index===-1)throw new Error("Authenticator secret must be base32.");bits+=index.toString(2).padStart(5,"0");}const bytes=[];for(let i=0;i+8<=bits.length;i+=8)bytes.push(parseInt(bits.slice(i,i+8),2));return Uint8Array.from(bytes);}
function sha1Hmac(keyBytes,messageBytes){const blockSize=64;let key=keyBytes;if(key.length>blockSize)key=sha1Bytes(key);if(key.length<blockSize){const padded=new Uint8Array(blockSize);padded.set(key);key=padded;}const oKeyPad=new Uint8Array(blockSize);const iKeyPad=new Uint8Array(blockSize);for(let i=0;i<blockSize;i+=1){oKeyPad[i]=key[i]^0x5c;iKeyPad[i]=key[i]^0x36;}const inner=new Uint8Array(iKeyPad.length+messageBytes.length);inner.set(iKeyPad);inner.set(messageBytes,iKeyPad.length);const innerHash=sha1Bytes(inner);const outer=new Uint8Array(oKeyPad.length+innerHash.length);outer.set(oKeyPad);outer.set(innerHash,oKeyPad.length);return sha1Bytes(outer);}
function sha1Bytes(bytes){const words=[];for(let i=0;i<bytes.length;i+=1)words[i>>2]|=bytes[i]<<(24-(i%4)*8);const bitLength=bytes.length*8;words[bitLength>>5]|=0x80<<(24-bitLength%32);words[((bitLength+64>>9)<<4)+15]=bitLength;const w=new Array(80);let h0=0x67452301,h1=0xefcdab89,h2=0x98badcfe,h3=0x10325476,h4=0xc3d2e1f0;for(let i=0;i<words.length;i+=16){for(let t=0;t<16;t+=1)w[t]=words[i+t]||0;for(let t=16;t<80;t+=1)w[t]=leftRotate(w[t-3]^w[t-8]^w[t-14]^w[t-16],1);let a=h0,b=h1,c=h2,d=h3,e=h4;for(let t=0;t<80;t+=1){const temp=(leftRotate(a,5)+sha1Ft(t,b,c,d)+e+w[t]+sha1Kt(t))|0;e=d;d=c;c=leftRotate(b,30);b=a;a=temp;}h0=(h0+a)|0;h1=(h1+b)|0;h2=(h2+c)|0;h3=(h3+d)|0;h4=(h4+e)|0;}const out=new Uint8Array(20);[h0,h1,h2,h3,h4].forEach((value,index)=>{out[index*4]=(value>>>24)&255;out[index*4+1]=(value>>>16)&255;out[index*4+2]=(value>>>8)&255;out[index*4+3]=value&255;});return out;}
function leftRotate(value,count){return(value<<count)|(value>>>(32-count));}
function sha1Ft(t,b,c,d){if(t<20)return(b&c)|((~b)&d);if(t<40)return b^c^d;if(t<60)return(b&c)|(b&d)|(c&d);return b^c^d;}
function sha1Kt(t){if(t<20)return 0x5a827999;if(t<40)return 0x6ed9eba1;if(t<60)return 0x8f1bbcdc;return 0xca62c1d6;}
function serializeVaultEntriesToCsv(entries){
  const headers=["id","serviceName","username","siteOrigin","siteHostname","encryptedSecret","encryptedTotpSecret","encryptedPassword","createdAt","updatedAt"];
  const rows=entries.map((entry)=>headers.map((header)=>escapeCsvValue(getCsvFieldValue(entry,header))));
  return [headers.join(","),...rows.map((row)=>row.join(","))].join("\r\n");
}
function getAuthenticatorEntriesForBackup(){return state.vaultEntries.filter((entry)=>entry.encryptedTotpSecret).map((entry)=>({...entry}));}
function mergeVaultEntries(localEntries,remoteEntries){
  const merged=[...localEntries];
  for(const remoteEntry of remoteEntries){
    const existingIndex=merged.findIndex((entry)=>entry.id===remoteEntry.id);
    if(existingIndex===-1){
      merged.push(remoteEntry);
      continue;
    }
    const localUpdated=Number(merged[existingIndex].updatedAt||0);
    const remoteUpdated=Number(remoteEntry.updatedAt||0);
    if(remoteUpdated>=localUpdated){
      merged[existingIndex]={...merged[existingIndex],...remoteEntry};
    }
  }
  return merged.sort((a,b)=>b.updatedAt-a.updatedAt||b.createdAt-a.createdAt);
}
function mergeAuthenticatorEntries(vaultEntries,authenticatorEntries){
  const merged=[...vaultEntries];
  for(const authEntry of authenticatorEntries){
    const existingIndex=merged.findIndex((entry)=>entry.id===authEntry.id);
    if(existingIndex===-1){
      merged.push(authEntry);
      continue;
    }
    if(authEntry.encryptedTotpSecret){
      merged[existingIndex]={...merged[existingIndex],encryptedTotpSecret:authEntry.encryptedTotpSecret,updatedAt:Math.max(Number(merged[existingIndex].updatedAt||0),Number(authEntry.updatedAt||0))};
    }
  }
  return merged.sort((a,b)=>b.updatedAt-a.updatedAt||b.createdAt-a.createdAt);
}
function parseVaultCsv(text){
  const rows=parseCsvRows(text);
  if(rows.length<2)throw new Error("CSV file is empty.");
  const headers=rows[0].map((header)=>String(header||"").trim());
  const required=["id","serviceName","username","siteOrigin","siteHostname","createdAt","updatedAt"];
  for(const name of required){if(!headers.includes(name))throw new Error(`CSV is missing required column: ${name}`);}
  const entries=[];
  for(let index=1;index<rows.length;index+=1){
    const row=rows[index];
    if(!row.some((cell)=>String(cell||"").trim()))continue;
    const entry={};
    headers.forEach((header,headerIndex)=>{entry[header]=row[headerIndex]??"";});
    entries.push(normalizeImportedCsvEntry(entry,index+1));
  }
  return entries;
}
function normalizeImportedCsvEntry(entry,rowNumber){
  const encryptedSecret=parseOptionalJson(entry.encryptedSecret,`encryptedSecret at row ${rowNumber}`);
  const encryptedTotpSecret=parseOptionalJson(entry.encryptedTotpSecret,`encryptedTotpSecret at row ${rowNumber}`);
  const normalized={
    id:String(entry.id||"").trim(),
    serviceName:String(entry.serviceName||"").trim(),
    username:String(entry.username||"").trim(),
    siteOrigin:String(entry.siteOrigin||"").trim(),
    siteHostname:String(entry.siteHostname||"").trim(),
    createdAt:Number(entry.createdAt||Date.now()),
    updatedAt:Number(entry.updatedAt||entry.createdAt||Date.now())
  };
  if(!normalized.id||!normalized.serviceName)throw new Error(`CSV row ${rowNumber} is missing id or serviceName.`);
  if(!Number.isFinite(normalized.createdAt)||!Number.isFinite(normalized.updatedAt))throw new Error(`CSV row ${rowNumber} has invalid createdAt or updatedAt.`);
  if(encryptedSecret)normalized.encryptedSecret=encryptedSecret;
  if(encryptedTotpSecret)normalized.encryptedTotpSecret=encryptedTotpSecret;
  const legacyEncryptedPassword=String(entry.encryptedPassword||"").trim();
  if(legacyEncryptedPassword)normalized.encryptedPassword=legacyEncryptedPassword;
  if(!normalized.encryptedSecret&&!normalized.encryptedPassword)throw new Error(`CSV row ${rowNumber} has no encrypted secret payload.`);
  return normalized;
}
function getCsvFieldValue(entry,header){
  if(header==="encryptedSecret")return entry.encryptedSecret?JSON.stringify(entry.encryptedSecret):"";
  if(header==="encryptedTotpSecret")return entry.encryptedTotpSecret?JSON.stringify(entry.encryptedTotpSecret):"";
  if(header==="encryptedPassword")return entry.encryptedPassword||"";
  return entry[header]??"";
}
function escapeCsvValue(value){
  const stringValue=String(value??"");
  if(/[",\r\n]/.test(stringValue))return`"${stringValue.replaceAll('"','""')}"`;
  return stringValue;
}
function parseCsvRows(text){
  const rows=[];let row=[];let cell="";let inQuotes=false;
  for(let i=0;i<text.length;i+=1){
    const char=text[i];
    const next=text[i+1];
    if(inQuotes){
      if(char==='"'&&next==='"'){cell+='"';i+=1;continue;}
      if(char==='"'){inQuotes=false;continue;}
      cell+=char;continue;
    }
    if(char==='"'){inQuotes=true;continue;}
    if(char===","){row.push(cell);cell="";continue;}
    if(char==="\n"){row.push(cell);rows.push(row);row=[];cell="";continue;}
    if(char==="\r")continue;
    cell+=char;
  }
  if(cell.length||row.length){row.push(cell);rows.push(row);}
  return rows;
}
function parseOptionalJson(value,label){
  const text=String(value||"").trim();
  if(!text)return null;
  try{return JSON.parse(text);}catch{throw new Error(`Invalid JSON in ${label}.`);}
}
function getSessionStorageArea(){return chrome.storage.session||chrome.storage.local;}
function getConfigSessionKey(config){return config?.recovery?.recoveryId||config?.wrappedVaultKey?.cipher||config?.hash||"";}
function restoreVaultSession(session){if(!session||!state.vaultMasterConfig)return;const expectedKey=getConfigSessionKey(state.vaultMasterConfig);if(!session.isUnlocked||!session.currentVaultKey||session.configKey!==expectedKey)return;state.isUnlocked=true;state.currentVaultKey=session.currentVaultKey;state.vaultMetaText="Vault key restored from this browser session.";}
async function persistVaultSession(){if(!state.isUnlocked||!state.currentVaultKey||!state.vaultMasterConfig)return;await getSessionStorageArea().set({[KEYS.session]:{isUnlocked:true,currentVaultKey:state.currentVaultKey,configKey:getConfigSessionKey(state.vaultMasterConfig)}});}
async function clearVaultSession(){await getSessionStorageArea().remove(KEYS.session);}
function randomBase64(length){return arrayBufferToBase64(crypto.getRandomValues(new Uint8Array(length)).buffer);}
function randomId(){return Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);}
function arrayBufferToBase64(buffer){return btoa(String.fromCharCode(...new Uint8Array(buffer)));}
function base64ToArrayBuffer(value){const binary=atob(value);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i+=1)bytes[i]=binary.charCodeAt(i);return bytes.buffer;}
function escapeHtml(value){return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");}
