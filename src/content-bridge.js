// Isolated-world half of the JavaScript identity spoof. content-main.js runs in the page's world
// and cannot read chrome.storage, so this script looks up the profile for the current hostname and
// hands it over as a serialised DOM event. Both scripts start at document_start in no guaranteed
// order, so the exchange works whichever one runs first.
(async () => {
  const EVENT_READY = "chromium-mask:ready";
  const EVENT_PROFILE = "chromium-mask:profile";

  try {
    const { spoofingState } = await chrome.storage.local.get("spoofingState");
    const key = spoofingState?.hostProfiles?.[location.hostname];
    const profile = key && spoofingState.profiles?.[key];
    if (!profile) return;

    const send = () => document.dispatchEvent(new CustomEvent(EVENT_PROFILE, { detail: JSON.stringify(profile) }));
    document.addEventListener(EVENT_READY, send);
    send();
  } catch (ex) {
    console.debug("Chromium Mask: could not load profile", ex);
  }
})();
