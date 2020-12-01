
const myscript =  {
    PostMessage : async (port, message = {}, option = {}) => {
        if (port == null) {
            //console.error("port null");
            return;
        }

        //console.log(message, option);

        if (option.usePromise) {
            option.id = JSON.stringify(message);

            return new Promise(r => {
                const callback = e => {
                    if (e.id == option.id) {
                        port.onMessage.removeListener(callback);
                        r(e.body);
                    }
                }
                port.onMessage.addListener(callback);
                port.postMessage({ id: option.id, body: message, name: port.name });
            });

        } else {
            port.postMessage({ id: option.id, body: message, name: port.name });
        }
    },


    Sleep : (waitMilliseconds) => {
        return new Promise(resolve => setTimeout(resolve, waitMilliseconds));
    },

    UpdateBrowserActionIcon : (sw, tabId) => {
        const enables = {
            16: "image/icon_enable16.png",
            32: "image/icon_enable32.png",
            64: "image/icon_enable64.png"
        };
        const disables = {
            16: "image/icon_disable16.png",
            32: "image/icon_disable32.png",
            64: "image/icon_disable64.png"
        };
        //console.log(sw + "!!!");
        if (sw) {
            if (tabId == null)
                browser.browserAction.setIcon({ path: enables });
            else
                browser.browserAction.setIcon({ path: enables, tabId: tabId });
        } else {
            if (tabId == null)
                browser.browserAction.setIcon({ path: disables });
            else
                browser.browserAction.setIcon({ path: disables, tabId: tabId });
        }
    },

    UpdateBadgeText : (str) => {
        if (str == null || str == "0")
            str = "";
        browser.browserAction.setBadgeText({ text: str });
    },

    GetPreset : (option, key) => {
        if (key == null)
            key = option.selectedPreset;

        const s = (option.preset != null && option.selectedPreset != null) ? option.preset[key] : null;
        if (s == null) {
            browser.storage.local.set({
                preset: {
                    Default: { filename: "", output: "", option: "", isShareJson: true }
                },
                selectedPreset: "Default"
            });
            return { filename: "", output: "", option: "", key: "Default", isShareJson: true };
        }
        s.key = key;
        return s;
    }
}