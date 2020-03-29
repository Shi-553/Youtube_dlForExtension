//browser.storage.local.clear();
let isPopupOpen = false, switchProgressFlag = false;
let userPofile;
//ポップアップのスクリプトから
browser.runtime.onMessage.addListener(async (e) => {
    //console.log(e);

    if (e.noticeDownloadStatus != null) {
        NoticeDownloadStatus(e.res, e.showExplorerLink, e.title, e.message);
    }

    if (e.isStopDownloadAll) {
        const reDownloadStr = ReceiveDownload.name.toString();
        for (let key of Object.keys(ports[reDownloadStr])) {
            console.log("StopDownload " + key);
            ports[reDownloadStr][key].port.disconnect();
            SendNativePromise("RemoveJson", ports[reDownloadStr][key].message);

        }
        waitProgress = [];
        let stopDownloadStr = "";
        for (let key of Object.keys(progresss)) {
            if (progresss[key].isDownloading == "Download" || progresss[key].isDownloading == "Wait") {
                progresss[key].isDownloading = "Stop";
                stopDownloadStr += progresss[key].filePath + "\n";
            }
        }

        const all = await browser.notifications.getAll();
        for (let key of Object.keys(all))
            browser.notifications.clear(key);

        browser.runtime.sendMessage({
            message: "Progress",
            progresss: progresss,
            switchProgressFlag: switchProgressFlag
        });
        UpdateBadgeText();
        browser.notifications.create("stopDownloadAll", {
            type: "basic",
            iconUrl: "image/icon_enable64.png",
            title: "Stop Download All",
            message: stopDownloadStr
        });

    }

    if (e.restartDownload) {
        const canDownload = await CanDownload(e.progress.domain);
        progresss[e.progress.url + e.progress.key].isDownloading = canDownload ? "Download" : "Wait";
        if (canDownload) {
            e.progress.messageToSend.messageToSend = JSON.parse(JSON.stringify(e.progress.messageToSend));
            SendNative("To_Youtube_dl", ReceiveDownload, e.progress.messageToSend);
        } else {
            waitProgress.push(progresss[e.progress.url + e.progress.key]);
        }
        browser.runtime.sendMessage({
            message: "Progress",
            progresss: progresss,
            switchProgressFlag: switchProgressFlag
        });
        UpdateBadgeText();

    }

    if (e.stopDownload) {
        //console.log(e);
        //console.log(ports);
        waitProgress = waitProgress.filter(p => p != progresss[e.progress.url + e.progress.key]);

        const p = ports[ReceiveDownload.name.toString()][e.progress.url + e.progress.key];
        if (p) {
            p.port.disconnect();
        }
        progresss[e.progress.url + e.progress.key].isDownloading = "Stop";
        e.progress.filePath += ".part";
        NoticeDownloadStatus(e.progress, true, "Stop Download", e.progress.json._filename);
        browser.runtime.sendMessage({
            message: "Progress",
            progresss: progresss,
            switchProgressFlag: switchProgressFlag
        });
        UpdateBadgeText();
        SendNativePromise("RemoveJson", e.progress.messageToSend);

        if (waitProgress.length != 0) {
            const waitingProgres = waitProgress.shift();
            waitingProgres.isDownloading = "Download";

            waitingProgres.messageToSend.messageToSend = JSON.parse(JSON.stringify(waitingProgres.messageToSend));
            SendNative("To_Youtube_dl", ReceiveDownload, waitingProgres.messageToSend);
            console.log(progresss);//こっちまでかわるか？

        }
    }

    if (e.isUpdateTabListener) {
        UpdateTabListener();

    }

    if (e.changePresetValue) {
        for (let url of Object.keys(cache)) {
            if (e.isShareJson) {
                for (let key of Object.keys(cache[url])) {
                    if (ports[ReceiveGetJson.name.toString()][url + key] != null)
                        ports[ReceiveGetJson.name.toString()][url + key].port.disconnect();
                }
                cache[url].json = null;

            } else {
                if (ports[ReceiveGetJson.name.toString()][url + e.key] != null)
                    ports[ReceiveGetJson.name.toString()][url + e.key].port.disconnect();
            }
            cache[url]["options"][e.key] = null;
        }
    }

    if (e.isGetJson) {
        GetJson(null, e.url, e.key, e.isCacheRefresh);

    }

    if (e.isGetUserPofile) {
        if (userPofile == null)
            userPofile = await SendNativePromise("GetUserPofile");
        return userPofile;

    }

    if (e.switchProgressFlag != null) {
        switchProgressFlag = e.switchProgressFlag;

    }

    if (e.isOpen) {
        isPopupOpen = true;
        //console.log(progresss);
        browser.runtime.sendMessage({
            message: "Progress",
            progresss: progresss,
            switchProgressFlag: switchProgressFlag
        });
        GetJson();

    }

    if (e.isClose) {
        isPopupOpen = false;
        browser.storage.local.set({
            selectedPreset: e.selectedPreset
        });

    }

    if (e.isSelectDirectory) {
        return await SelectDirectoryAsync(e);
    }

    if (e.isSelectPath) {
        return await SelectPathAsync(e);
    }

    if (e.isDownload) {
        if (e.downloadDirectory == null) {
            e.downloadDirectory = await SelectDirectoryAsync(e);
            if (e.downloadDirectory == null)
                return;
        }
        Download(e);
    }
});
const GetPreset = (option, key = null) => {
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
const UpdateBrowserActionIcon = (sw, tabId) => {
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

const UpdateBadgeText = () => {
    let count = 0;
    for (let key of Object.keys(progresss)) {
        if (progresss[key].isDownloading == "Download")
            count++;
    }
    browser.browserAction.setBadgeText({ text: count != 0 ? count.toString() : "" });
}

const GetJson = async (tabId = null, url = null, key = null, isCacheRefresh = false) => {
    const r = await Promise.all([browser.storage.local.get(), browser.tabs.query({ currentWindow: true, active: true })]);
    //今のタブ
    let activeTab = r[1][0];

    const option = r[0];
    //console.log(option);
    const selectedPreset = GetPreset(option);

    const selectedKey = selectedPreset.key;

    if (url == null)
        url = activeTab.url;
    if (tabId == null)
        tabId = activeTab.id;
    if (key == null)
        key = selectedKey;

    const tabUrl = (await browser.tabs.get(tabId).catch(() => { return {}; })).url;

    const preset = GetPreset(option, key);
    if (preset.isShareJson == null)
        preset.isShareJson = true;
    let outputOption = preset.filename + " " + preset.output + " ";
    //console.log(preset);
    // -F オプションがあるときそれがあることを記憶しておく（ずらっと出すため）
    let isF = false;
    if (/ -F /.test(outputOption)) {
        outputOption = outputOption.replace(/ -F /, " ");
        isF = true;
    }

    if (cache[url] == null) {
        cache[url] = {};
    }

    if (cache[url]["options"] == null) {
        cache[url]["options"] = {};
    }
    //console.log(cache)
    //console.log(outputOption)
    //console.log(key)

    //キャッシュクリア
    if (isCacheRefresh) {
        if (tabUrl == url) {
            UpdateBrowserActionIcon(false, tabId);
        }
        cache[url] = { "options": {} };
        const str = ReceiveGetJson.name.toString();
        for (let p of Object.keys(ports[str])) {
            if (p == tabId) {
                for (let p2 of Object.keys(ports[str][p])) {
                    console.log("CacheRefresh " + p + " " + p2);
                    ports[str][p][p2].port.disconnect();
                }
            }
        }
    }
    //json取得中のとき何もしない
    if ((cache[url].json === "Getting" && preset.isShareJson) || cache[url]["options"][key] === "Getting") {
        if (selectedKey == key && activeTab.id == tabId && activeTab.url == url && isPopupOpen) {
            browser.runtime.sendMessage("Getting");
        }
        console.log("Getting");
        return;
    }

    //jsonなかったとき
    if ((cache[url].json == "NotFound" && preset.isShareJson) || cache[url]["options"][key] == "NotFound") {
        if (selectedKey == key && activeTab.id == tabId && activeTab.url == url && isPopupOpen) {
            browser.runtime.sendMessage("NotFound");
        }
        console.log("NotFound");
        return;
    }

    //jsonないとき、リフレッシュ時じゃない、かつシェアOKのときネイティブ(jsonファイル)から探してみる
    //if (cache[url].json == null && !isCacheRefresh && preset.isShareJson) {
    //    cache[url].json = "Getting";
    //    const cachedJson = await SendNativePromise("GetJsonFromCache", { url: url });
    //    //console.log(cachedJson)
    //    if (cachedJson != null) {
    //        cache[url].json = cachedJson;
    //        console.log("yes cache");
    //    } else {
    //        cache[url].json = null;
    //    }
    //    activeTab = (await browser.tabs.query({ currentWindow: true, active: true }))[0];
    //}

    //そのオプションのjsonがまるまるあるとき
    if (cache[url]["options"][key] != null) {
        console.log("Hit Cache");

        if (tabUrl == url) {
            UpdateBrowserActionIcon(true, tabId);
        }
        if (isPopupOpen && selectedKey == key && activeTab.id == tabId && activeTab.url == url) {
            // console.log(cache);
            const item = cache[url]["options"][key];
            item.tabId = tabId;
            item.key = key;
            item.isF = isF;
            browser.runtime.sendMessage(item);
        }

        if (tabUrl != url)
            return;

        for (let k of Object.keys(option.preset)) {
            if (k == key) {
                continue;
            }
            if (cache[url]["options"][k] == null) {
                console.log("getjson other option hit: " + k);

                if (await GetJson(tabId, url, k)) {
                    const p = GetPreset(option, k);
                    if (p.isShareJson != null && !p.isShareJson)
                        await Sleep(1000);
                }
            }
        }
        return;
    }
    //jsonがあるときでシェアOKなとき
    //オプションのjsonはとってないとき
    if (cache[url].json != null && preset.isShareJson) {
        if (isPopupOpen && selectedKey == key && activeTab.id == tabId && activeTab.url == url) {
            browser.runtime.sendMessage("Getting");
        }
        //console.log(cache);
        console.log("Yes json");
        cache[url]["options"][key] = "Getting";

        SendNative("To_Youtube_dl", ReceiveGetJson, {
            isCacheRefresh: isCacheRefresh,
            isF: isF,
            command: `youtube-dl --no-playlist -j ${outputOption} --load-info-json "<JSONPATH>"`,
            key: key,
            url: url,
            tabId: tabId,
            json: cache[url].json
        });
        return;
    }

    if (isPopupOpen && selectedKey == key && url == url && tabId == activeTab.id) {
        browser.runtime.sendMessage("Getting");
    }
    //jsonがないとき
    console.log("No Cache");
    if (preset.isShareJson) {
        cache[url].json = "Getting";
    }
    cache[url]["options"][key] = "Getting";
    //console.log(url);

    const message = {
        isCacheRefresh: isCacheRefresh,
        isF: isF,
        command: `youtube-dl --no-playlist -j  ${outputOption} "${url}"`,
        url: url,
        key: key,
        tabId: tabId
    };
    //console.log(message);
    SendNative("To_Youtube_dl", ReceiveGetJson, message);
    return true;
}

const cache = {};
const ReceiveGetJson = async (res, port) => {
    //console.log(res);

    if (res.status == "error") {
        console.error(res);
        return;
    }
    if (res.status != "finished")
        return;

    const r = await Promise.all([browser.storage.local.get(), browser.tabs.query({ currentWindow: true, active: true })]);
    const option = r[0];
    const activeTab = r[1][0];

    const selectedPreset = GetPreset(option);
    const key = selectedPreset.key;
    const preset = GetPreset(option, key);
    if (preset.isShareJson == null) {
        preset.isShareJson = true;
    }
    //console.log(key);
    //console.log(preset);

    const urll = (await browser.tabs.get(res.tabId).catch(() => { return {}; })).url;

    if (urll == res.url) {
        UpdateBrowserActionIcon(res.returnJson != null, res.tabId);
    }
    if (res.returnJson == null) {
        console.log("NotFound");

        if (cache[res.url].json == "Getting" && preset.isShareJson)
            cache[res.url].json = "NotFound";

        //console.log(cache);
        cache[res.url]["options"][res.key] = "NotFound";
        // if (/ERROR:(.+? is not a valid URL.)|(Unsupported URL)/.test(res.stdout)) {
        if (isPopupOpen && res.key == key && activeTab.url == res.url && activeTab.id == res.tabId) {
            browser.runtime.sendMessage("NotFound");
        }
        // }
    } else {
        console.log("Success");

        const message = res.returnJson;
        message.key = res.key;
        message.tabId = res.tabId;
        message.isF = res.isF;

        if (cache[res.url].json == "Getting" && preset.isShareJson) {
            cache[res.url].json = message;
        }
        cache[res.url]["options"][res.key] = message;

        //console.log(res.key);
        if (res.key == key && activeTab.url == res.url && activeTab.id == res.tabId) {
            if (isPopupOpen) {
                browser.runtime.sendMessage(message);
            }
        }
    }
    //console.log(cache);

    if (urll == res.url) {
        //他のオプションの詳細を
        for (let k of Object.keys(option.preset)) {
            if (k == res.key) {
                continue;
            }
            if (cache[res.url]["options"][k] == null) {
                console.log("getjson other option finish: " + k);

                if (await GetJson(res.tabId, res.url, k)) {
                    const p = GetPreset(option, k);
                    if (p.isShareJson != null && !p.isShareJson)
                        await Sleep(1000);
                }
            }
        }
    }

    if (port != null) {
        //port.disconnect();
    }
}

//ダウンロード
const Download = async e => {
    const r = await Promise.all([browser.storage.local.get(), browser.tabs.query({ currentWindow: true, active: true })]);
    //今のタブ
    let activeTab = r[1][0];

    const option = r[0];
    const selectedPreset = GetPreset(option);

    const selectedKey = selectedPreset.key;

    if (e.json.webpage_url == null)
        e.json.webpage_url = activeTab.url;
    if (e.tabId == null)
        e.tabId = activeTab.id;
    if (e.key == null)
        e.key = selectedKey;

    const preset = GetPreset(option, e.key);

    let outputOption = preset.output;


    outputOption = " " + outputOption + " ";
    if (/ -F /.test(outputOption)) {
        outputOption = outputOption.replace(/ -F /, " ");
    }

    //<FILENAME>
    const code = `youtube-dl --no-playlist ${e.selectFormat != null ? "-f " + e.selectFormat : ""} ${e.json.downloadFilename} ${outputOption} ${selectedPreset.option} --newline --load-info-json "<JSONPATH>"`;/* "${e.url}"*/
    if (option.overwrite == undefined)
        option.overwrite = null;
    //ffmpegは\\\\区切り
    const messageToSend = {
        isCacheRefresh: true,
        command: code,
        dir: e.downloadDirectory,//.replace(/\\+/g, "\\\\"),
        overwrite: option.overwrite,
        url: e.json.webpage_url,
        key: e.key,
        tabId: e.tabId,
        usePopen: true,
        webpage_url: e.json.webpage_url
    };


    SendNative("To_Youtube_dl", ReceiveDownloadPrepare, {
        isCacheRefresh: true,
        dir: e.downloadDirectory,//.replace(/\\+/g, "\\\\"),
        command: `youtube-dl --no-playlist -j ${outputOption} --load-info-json "<JSONPATH>"`,
        url: e.json.webpage_url,
        domain: e.json.webpage_url.split('/')[2],
        json: e.json,
        messageToSend: messageToSend,
        key: e.key,
        tabId: e.tabId,
        webpage_url: e.json.webpage_url
    });
}
const CanDownload = async (domain) => {
    const option = await browser.storage.local.get();

    let downloadingCount = 0;
    for (let key of Object.keys(progresss)) {
        if (progresss[key].isDownloading == "Download" && ((option.howToCount == null || option.howToCount == "Count all in bulk") || domain == progresss[key].domain))
            downloadingCount++;
    }

    if (option.simultaneous == null)
        option.simultaneous = 2;

    let canDownload = true;

    //console.log(downloadingCount);
    if (option.simultaneous <= downloadingCount)
        canDownload = false;

    return canDownload;
}

const ReceiveDownloadPrepare = async (res, port) => {
    //console.log(res);
    if (res.status != "finished")
        return;
    let json = res.returnJson;
    if (json == null)
        json = res.json;
    if (json == null)
        json = { _filename: "" };
    NoticeDownloadStatus(res, false, "Prepare Download", json._filename);


    res.messageToSend.json = res.returnJson;
    res.messageToSend.domain = res.domain;

    //エクスプローラーをだすには\\区切り\\${res.name}
    res.messageToSend.dir = res.dir.replace(/\\+/g, "\\").replace(/\/+/g, "\\");
    res.messageToSend.filePath = `${res.dir}\\${res.returnJson._filename}`.replace(/\\+/g, "\\");
    const canDownload = await CanDownload(res.domain);
    //console.log(canDownload);

    progresss[res.webpage_url + res.messageToSend.key] = {
        url: res.webpage_url,
        webpage_url: res.webpage_url,
        key: res.messageToSend.key,
        isDownloading: canDownload ? "Download" : "Wait",
        json: res.returnJson,
        domain: res.domain,
        messageToSend: res.messageToSend
    };

    if (isPopupOpen) {
        browser.runtime.sendMessage({
            message: "Progress",
            progresss: progresss,
            switchProgressFlag: switchProgressFlag
        });
    }
    UpdateBadgeText();
    if (canDownload) {
        res.messageToSend.messageToSend = JSON.parse(JSON.stringify(res.messageToSend));
        //console.log(res);
        SendNative("To_Youtube_dl", ReceiveDownload, res.messageToSend);
    } else {
        waitProgress.push(progresss[res.webpage_url + res.messageToSend.key]);
    }
}
const progresss = {};
let waitProgress = [];
const downloadMatchReg = /^\[download\]\s+(.+?)%\s+of\s+(.+?)\s+at\s+(.+?)\s+ETA\s+(.+)$/;

const ReceiveDownload = async (res, port) => {
    if (res.status != "Progress") {
        //console.log(res);
    }
    if (res.status == "error") {
        console.error(res);
        return;
    }


    if (res.status == "Progress" && downloadMatchReg.test(res.stdout)) {
        console.log(res.stdout);
        const matchs = res.stdout.match(downloadMatchReg);

        progresss[res.webpage_url + res.key] = {
            url: res.webpage_url,
            key: res.key,
            filePath: res.filePath,
            messageToSend: res.messageToSend,
            json: res.json,
            isDownloading: "Download",
            domain: res.domain,
            percent: parseFloat(matchs[1]),
            size: matchs[2],
            speed: matchs[3],
            ETA: matchs[4]
        };
        if (isPopupOpen) {
            browser.runtime.sendMessage({
                message: "Progress",
                progresss: progresss
            });
        }
        return;
    }
    const option = await browser.storage.local.get();
    //console.log(res);


    if (res.status == "finished") {
        if (res.returncode == 1) {

            if (option.isAutoRetry == null || option.isAutoRetry) {
                const parcent = progresss[res.webpage_url + res.key] != null ? progresss[res.webpage_url + res.key].parcent : 0;
                if (res.prevParcent == null)
                    res.prevParcent = 0;

                if (res.prevParcent < parcent) {
                    res.messageToSend.prevParcent = parcent;

                    res.messageToSend.messageToSend = JSON.parse(JSON.stringify(res.messageToSend));
                    SendNative("To_Youtube_dl", ReceiveDownload, res.messageToSend);
                    NoticeDownloadStatus(res, false, "Worning download.\nAuto retry.", res.json._filename);
                } else {
                    NoticeDownloadStatus(res, true, "Worning download.\nThe download is not progressing at all, so i will exit.", res.json._filename);
                    progresss[res.webpage_url + res.key].isDownloading = "Worning";
                }
                UpdateBadgeText();
                return;
            } else {
                progresss[res.webpage_url + res.key].isDownloading = "Worning";
            }
        }
        if (res.returncode == 0) {
            progresss[res.webpage_url + res.key].isDownloading = "Finish";
        }
        if (waitProgress.length != 0) {
            const waitingProgres = waitProgress.shift();
            waitingProgres.isDownloading = "Download";

            waitingProgres.messageToSend.messageToSend = JSON.parse(JSON.stringify(waitingProgres.messageToSend));
            SendNative("To_Youtube_dl", ReceiveDownload, waitingProgres.messageToSend);
            console.log(progresss);//こっちまでかわるか？

        }
        console.log("endDownloading");
        UpdateBadgeText();
    }


    if (res.status == "AskOverwrite") {
        NoticeDownloadStatus(res, false, "Do you want to overwrite it?", res.filePath);
    }
    if (res.status == "DoesNotExistDirectory") {
        NoticeDownloadStatus(res, false, "Does not exist directory", res.dir);
    }
    if (res.status == "NotOverwritten") {
        NoticeDownloadStatus(res, true, "Did not overwrite", `${res.filePath}\n is already exists.`);
        progresss[res.webpage_url + res.key].isDownloading = "Finish";
        UpdateBadgeText();
    }
    if (res.status == "Overwritten") {
        NoticeDownloadStatus(res, true, "Overwritten", `${res.filePath}`);
    }

    if (res.status == "started" && (option.isDisableHealthyNotification == null || !option.isDisableHealthyNotification) && res.prevParcent == null) {
        NoticeDownloadStatus(res, false, "Started download", res.filePath)
    }

    if (res.status == "finished" && res.overwrite != "Yes") {

        if (res.returncode == 0) {
            NoticeDownloadStatus(res, true, "Successful download", res.filePath);
        }

        else if (res.returncode == 1) {
            NoticeDownloadStatus(res, true, "Worning download", res.filePath);
        }

        if (res.returncode != 0 && res.returncode != 1) {
            NoticeDownloadStatus(res, true, "Failed download", res.filePath);
        }

    }

}
//通知だす
function NoticeDownloadStatus(res, showExplorerLink, title, message) {
    if (res.webpage_url == null) {
        res.webpage_url = res.url;
        console.log("No webpage_url");
    }
    notificationIds["to_Youtube_dlStatus" + res.webpage_url + res.key] = {};
    const item = notificationIds["to_Youtube_dlStatus" + res.webpage_url + res.key];
    item.showExplorerLink = showExplorerLink;
    if (showExplorerLink)
        item.filePath = res.filePath;
    item.dir = res.dir;
    item.key = res.key;
    item.tabId = res.tabId;
    item.url = res.webpage_url;
    //console.log(item);
    browser.notifications.create("to_Youtube_dlStatus" + res.webpage_url + res.key, {
        type: "basic",
        iconUrl: "image/icon_enable64.png",
        title: title,
        message: message
    });
}

const notificationIds = {};

//通知クリックでディレクトリ開く
browser.notifications.onClicked.addListener(async id => {
    // console.log(id)
    if (id == "UpdateYoutube_dlForExtension") {
        browser.tabs.create({
            active: true,
            url: "https://drive.google.com/drive/u/1/folders/1Z2t8F5grpS4x_o54yuQMIJ01YrI16YBm"
        });
        return;
    }
    const item = notificationIds[id];
    //console.log(notificationIds);
    //console.log(id);
    if (item == null || !item.showExplorerLink)
        return;

    //const option = await browser.storage.local.get();

    /*  if (option.isOpenDirectoryAlways == null)
         option.isOpenDirectoryAlways = true; */

    const message = {
        path: item.filePath,
        isSelect: true,
        key: item.key,
        tabId: item.tabId,
        url: item.url
    };


    //console.log(message);
    SendNative("DirectoryManager", ReceiveShowDirectory, message);
    delete notificationIds[id];
});

const ReceiveShowDirectory = (res, port) => {
    console.log(res);
}

//ディレクトリ選択画面を出す プロミス
const SelectDirectoryAsync = (e) => {
    return new Promise(async resolve => {
        const message = {
            initialDir: e.initialDir
        };
        // console.log(message);
        const res = await SendNativePromise("DirectoryManager", message);
        if (res.status == "success") {
            return resolve(res.dir/*.replace(/\//g, "\\\\")*/);
        }
        resolve(null);

    });
}
const SelectPathAsync = (e) => {
    return new Promise(async resolve => {
        const message = {
            initialDir: e.initialDir
        };
        // console.log(message);
        const res = await SendNativePromise("PathManager", message);
        if (res.status == "success") {
            return resolve(res.path/*.replace(/\//g, "\\\\")*/);
        }
        resolve(null);

    });
}

const ports = {
    ReceiveDownload: {}, ReceiveGetJson: {}
};
//ネイティブにメッセージを送る。前に同じコールバックのメッセージがあったらそのポートの接続切っておくおく
const SendNative = (toSendName, callback, message) => {
    if (message.url == null || message.key == null) {
        console.error(message);
        return;
    }

    const callbackString = callback.name.toString();

    try {
        const port = browser.runtime.connectNative("Youtube_dlForExtension");

        if (ports[callbackString] == null)
            ports[callbackString] = {};

        if (ports[callbackString][message.url + message.key] != null)
            ports[callbackString][message.url + message.key].port.disconnect();

        ports[callbackString][message.url + message.key] = { port: port, message: message };

        const listener = res => {
            callback(res, port);
        };
        port.onMessage.addListener(listener);
        //port.onDisconnect.addListener(res => { console.log(res); });

        //console.log(message);
        port.postMessage({
            name: toSendName,
            value: message
        });
        // console.log(ports);
    } catch (e) {
        //console.log(e);
        browser.notifications.create({
            type: "basic",
            iconUrl: "image/icon_enable64.png",
            title: "Failed communicate",
            message: "Couldn't communicate native application"
        });
    }
}

//プロミス版 await で繋げられるが複数回返せない
const SendNativePromise = (toSendName, message) => {
    try {
        return browser.runtime.sendNativeMessage("Youtube_dlForExtension",
            {
                name: toSendName,
                value: message
            });

    } catch (e) {
        browser.notifications.create({
            type: "basic",
            iconUrl: "image/icon_enable64.png",
            title: "Failed communicate",
            message: "Couldn't communicate native application"
        });
    }
}

UpdateBrowserActionIcon(false, null);

const Sleep = (waitMMSeconds) => {
    return new Promise(resolve => setTimeout(resolve, waitMMSeconds));
}

let getjsonInterval = false;
let listener = null;
//自動読み込みリスナーを再設定
const UpdateTabListener = async () => {
    const option = await browser.storage.local.get();

    if (listener != null && browser.tabs.onUpdated.hasListener(listener))
        browser.tabs.onUpdated.removeListener(listener);

    listener = async (tabId, changeInfo, tab) => {
        if (changeInfo.url != null) {
            console.log(changeInfo);
            while (getjsonInterval)
                await Sleep(1000);

            getjsonInterval = true;
            console.log("listener");
            await GetJson(tab.id, tab.url);
            await Sleep(1000);
            getjsonInterval = false;
        }
    };

    if (option.urls == [])
        return;

    if (option.urls == null)
        option.urls = ["<all_urls>"];

    browser.tabs.onUpdated.addListener(listener, {
        urls: option.urls,
        properties: ["status"]
    });
}

UpdateTabListener();



(async () => {

    try {
        //バージョン確認
        const res = await SendNativePromise("GetVersion", {});

        const latestVersion = "1.3.0";
        //最新バージョンじゃなかったら更新
        if (res.version != latestVersion) {
            console.log(await SendNativePromise("Update"));

            console.log("Native programs update " + latestVersion + " to " + res.version);
        } else {
            console.log("Native programs is the Latest version! " + latestVersion);
        }
    } catch (e) {
        browser.notifications.create("UpdateYoutube_dlForExtension", {
            type: "basic",
            iconUrl: "image/icon_enable64.png",
            title: "Couldn't communicate native application",
            message: "You are misconfiguring\n or need an update.\n Click here."
        });

    }

    try {
        //youtube-dlの設定
        console.log(await SendNativePromise("UpdateYoutube_dl"));
    } catch (e) {

        console.log(e);
    }
})()