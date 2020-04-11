
const myscript = {};
(() => {
    myscript.PostMessage = async (port, message = null, id = null) => {
        const isNewId = id == null;

        if (port == null) {
            console.error("port null");
            return;
        }
        if (id == null) {
            const idStr = (await browser.storage.local.get("messageId")).messageId;

            if (idStr != null) {
                id = parseInt(idStr);
                id++;
            }
            if (idStr == null || 100 < id) {
                id = 0;
            }
            await browser.storage.local.set({ messageId: id });
        }
        if (message == null) {
            message = {};
        }
        console.log(message, id, isNewId);
        return new Promise(r => {
            const callback = e => {
                if (e.id == id) {
                    port.onMessage.removeListener(callback);
                    r(e.body);
                }
            }
            port.onMessage.addListener(callback);
            port.postMessage({ id: id, body: message, name: port.name });
        });
    }


    myscript.Sleep = (waitMilliseconds) => {
        return new Promise(resolve => setTimeout(resolve, waitMilliseconds));
    }

    myscript.UpdateBrowserActionIcon = (sw, tabId) => {
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
    }

    myscript.UpdateBadgeText = (str) => {
        if (str == null || str == "0")
            str = "";
        browser.browserAction.setBadgeText({ text: str });
    }

    myscript.GetPreset = (option, key) => {
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
})()