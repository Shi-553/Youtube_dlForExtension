


//browser.storage.local.clear();
let isPopupOpen = false, switchProgressFlag = false;
//ポップアップのスクリプトから
browser.runtime.onMessage.addListener(async (e) => {
    //console.log(e);


    if (e.isStopDownloadAll) {
        for (let p of Object.keys(ports.download)) {
            ports.download[p].port.disconnect();
        }
        const all = await browser.notifications.getAll();
        for (let key of Object.keys(all))
            browser.notifications.clear(key);
        return;
    }

    if (e.isUpdateTabListener) {
        UpdateTabListener();
        return;
    }
    if (e.isGetJson) {
        GetJson(e.url, e.outputOption, e.isCacheRefresh);
        return;
    }

    if (e.isOpen) {
        isPopupOpen = true;
        browser.runtime.sendMessage({
            message: "Progress",
            progresss: progresss,
            switchProgressFlag: switchProgressFlag
        });
        GetJson();
        return;
    }

    if (e.isClose) {
        isPopupOpen = false;
        switchProgressFlag = e.switchProgressFlag;
        browser.storage.local.set({
            selectedPreset: e.savedPreset
        });
        return;
    }

    if (e.isSelectDirectory) {
        return await SelectDirectoryAsync(e);
    }

    if (e.downloadDirectory == null) {
        e.downloadDirectory = await SelectDirectoryAsync(e);
        if (e.downloadDirectory == null)
            return;
    }
    Download(e);
});
const GetSelectedPreset = async (option) => {
    const s = (option.preset != null && option.selectedPreset != null) ? option.preset[option.selectedPreset] : null;
    if (s == null) {
        await browser.storage.local.set({
            preset: {
                Default: { filename: "", output: "", option: "" }
            },
            selectedPreset: "Default"
        });
        return { filename: "", output: "", option: "" };
    }
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
const UpdateBrowserAction = (sw, tabId) => {
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


const GetJson = async (url = null, outputOption = null, isCacheRefresh = false) => {
    const r = await Promise.all([browser.storage.local.get(), browser.tabs.query({ currentWindow: true, active: true })]);
    const option = r[0];
    const activeTab = r[1][0];
    const selectedPreset = await GetSelectedPreset(option);
    let outputOptionNow = selectedPreset != null ? selectedPreset.filename + " " + selectedPreset.output : "";
    if (url == null)
        url = activeTab.url;

    if (outputOption == null)
        outputOption = outputOptionNow;

    outputOption = outputOption.replace(/\s*$/, " ");
    outputOptionNow = outputOptionNow.replace(/\s*$/, " ");
    let isF = false;
    if (/ -F /.test(outputOption)) {
        outputOption = outputOption.replace(/ -F /, " ");
        outputOptionNow = outputOptionNow.replace(/ -F /, " ");
        isF = true;
    }
    //console.log(cache)
    //console.log(outputOption)

    //キャッシュクリア
    if (isCacheRefresh) {
        cache[url] = null;
        for (let p of Object.keys(ports.getJson)) {
            ports.getJson[p].port.disconnect();
        }
    }
    //json取得中
    if (cache[url] === "Getting") {
        if (isPopupOpen) {
            browser.runtime.sendMessage("Getting");
        }
        //console.log("wait url");
        return;
    }
    //jsonないとき、リフレッシュ時じゃなければネイティブ(jsonファイル)から探してみる
    if (cache[url] == null && !isCacheRefresh) {
        const cachedJson = await SendNativePromise("GetJsonFromCache", { url: url });
        //console.log(cachedJson)
        if (cachedJson != null) {
            cache[url] = { json: cachedJson };
            //console.log("yes cache");
        }
    }
    const t = (await browser.tabs.query({ currentWindow: true, active: true }))[0];
    //jsonがあるとき
    if (cache[url] != null && cache[url] != "NotFound") {
        //オプションのjson取得中
        if (cache[url][outputOption] === "Getting") {
            if (outputOptionNow == outputOption && activeTab.id == t.id && activeTab.url == t.url) {
                if (isPopupOpen) {
                    browser.runtime.sendMessage("Getting");
                }
            }
            //console.log("wait option");
            return;
        }
        //オプションのjsonはないとき
        if (cache[url][outputOption] == null) {
            if (outputOptionNow == outputOption && activeTab.id == t.id && activeTab.url == t.url) {
                if (isPopupOpen) {
                    browser.runtime.sendMessage("Getting");
                }
            }
            //console.log("Yes url");
            cache[url][outputOption] = "Getting";

            SendNative("To_Youtube_dl", {
                isCacheRefresh: false,
                isF: isF,
                command: `youtube-dl --no-playlist -j ${outputOption} --load-info-json "<JSONPATH>"`,
                option: outputOption,
                callback: ReceiveGetJson,
                url: url,
                tabId: activeTab.id,
                json: cache[url].json
            });
            return;
        }
        //オプションのjsonもある
        //console.log("hit");
        if (outputOptionNow == outputOption && activeTab.id == t.id && activeTab.url == t.url) {
            UpdateBrowserAction(true, activeTab.id);
            // console.log(cache);
            if (isPopupOpen) {
                browser.runtime.sendMessage(cache[url][outputOption].json);
            }
        }
        return;
    }

    if (outputOptionNow == outputOption && t.url == url && t.id == activeTab.id) {
        if (isPopupOpen) {
            browser.runtime.sendMessage(cache[url] == "NotFound" ? "GettingAgain" : "Getting");
        }
    }
    //jsonがないとき
    //console.log("No C");
    cache[url] = "Getting";
    //console.log(url);
    const message = {
        isCacheRefresh: true,
        isF: isF,
        command: `youtube-dl --no-playlist -j  ${outputOption} "${url}"`,
        url: url,
        option: outputOption,
        tabId: activeTab.id,
        callback: ReceiveGetJson
    };
    //console.log(message);
    SendNative("To_Youtube_dl", message)
}

const cache = {};
const ReceiveGetJson = async (res, port) => {
    // console.log(res);

    if (res.status == "error") {
        console.log(res);
        return;
    }
    if (res.status != "finished")
        return;

    const r = await Promise.all([browser.storage.local.get(), browser.tabs.query({ currentWindow: true, active: true })]);
    const option = r[0];
    const activeTab = r[1][0];

    const selectedPreset = await GetSelectedPreset(option);
    let outputOption = selectedPreset != null ? selectedPreset.filename + " " + selectedPreset.output : "";

    outputOption = outputOption.replace(/\s*$/, " ");
    let isF = false;
    if (/ -F /.test(outputOption)) {
        outputOption = outputOption.replace(/ -F /, " ");
        isF = true;
    }
    if (res.returnJson == null) {
        if (/ERROR:(.+? is not a valid URL.)|(Unsupported URL)/.test(res.stdout)) {
            cache[res.url] = "NotFound";
            if (res.option == outputOption && activeTab.url == res.url && activeTab.id == res.tabId) {
                if (isPopupOpen) {
                    browser.runtime.sendMessage("NotFound");
                }
            }
        }
        return;
    }

    const message = res.returnJson;
    message.option = res.option;
    message.isF = res.isF;
    if (cache[res.url] == "Getting" || cache[res.url] == "NotFound")
        cache[res.url] = { json: message };
    cache[res.url][res.option] = { json: message };
    //console.log(res.option);

    //console.log(`${res.option}==${outputOption} , ${activeTab.url}==${res.url}`)
    if (res.option == outputOption && activeTab.url == res.url && activeTab.id == res.tabId) {
        UpdateBrowserAction(true, activeTab.id);
        if (isPopupOpen) {
            browser.runtime.sendMessage(message);
        }
    }

    //他のオプションの詳細を
    for (let key of Object.keys(option.preset)) {
        if (cache[res.url][option.preset[key].filename + " " + option.preset[key].output] == null) {
            GetJson(res.url, option.preset[key].filename + " " + option.preset[key].output);
        }
    }

    port.disconnect();
}
//ダウンロード
const Download = async e => {
    const option = await browser.storage.local.get();

    const selectedPreset = await GetSelectedPreset(option);
    let filenameOption = "";
    const downloadOption = selectedPreset != null ? selectedPreset.option : "";
    let outputOption = selectedPreset != null ? selectedPreset.output : "";
    const selectFormat = e.selectFormat != null ? e.selectFormat : "";

    filenameOption = e.json._filename;

    outputOption = " " + outputOption + " ";
    if (/ -F /.test(outputOption)) {
        outputOption = outputOption.replace(/ -F /, " ");
    }
    //<FILENAME>
    const code = `"youtube-dl" --no-playlist ${selectFormat} ${filenameOption} ${outputOption} ${downloadOption} --newline --load-info-json "<JSONPATH>"`;/* "${e.url}"*/

    if (option.isOverwrite == undefined)
        option.isOverwrite = null;
    //ffmpegは\\\\区切り
    const message = {
        isCacheRefresh: false,
        command: code,
        dir: e.downloadDirectory.replace(/\\+/g, "\\\\"),
        isOverwrite: option.isOverwrite,
        url: e.json.webpage_url
    };

    SendNative("To_Youtube_dl", {
        isCacheRefresh: false,
        j: true,
        callback: ReceiveDownload,
        command: `youtube-dl --no-playlist -j ${outputOption} --load-info-json "<JSONPATH>"`,
        url: e.json.webpage_url,
        json: e.json,
        nextMessage: message
    });
}
const progresss = {};
const downloadMatchReg = /^\[download\]\s+(.+?)\s+of\s+(.+?)\s+at\s+(.+?)\s+ETA\s+(.+)$/;
const ReceiveDownload = async (res, port) => {
    console.log(res);
    if (res.j != null && res.j == true) {
        if (res.status != "finished")
            return;
        res.nextMessage.callback = ReceiveDownload;
        res.nextMessage.json = res.returnJson;

        SendNative("To_Youtube_dl", res.nextMessage);
        return;
    }
    if (res.status == "Progress" && downloadMatchReg.test(res.stdout)) {
        //console.log(res.stdout);
        const matchs = res.stdout.match(downloadMatchReg);
        progresss[res.command] = {
            name: res.json._filename,
            percent: matchs[1],
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
    //console.log(res);
    if (res.status == "error") {
        console.error(res);
        return;
    }
    const option = await browser.storage.local.get();
    // console.log(res);
    //エクスプローラーをだすには\\区切り\\${res.name}
    res.dir = res.dir.replace(/\\+/g, "\\").replace(/\/+/g, "\\");
    let filePath = `${res.dir}\\${res.json._filename}`.replace(/\\+/g, "\\");


    if (res.status == "AskOverwrite") {
        NoticeToDownloadStatus(false, "Do you want to overwrite it?", filePath);
    }
    if (res.status == "DoesNotExistDirectory") {
        NoticeToDownloadStatus(false, "Does not exist directory", res.dir);
    }
    if (res.status == "NotOverwritten") {
        NoticeToDownloadStatus(true, "Did not overwrite", `${filePath}\n is already exists.`);
    }
    if (res.status == "Overwritten") {
        NoticeToDownloadStatus(true, "Overwritten", `${filePath}`);
    }

    if (res.status == "started" && !option.isDisableHealthyNotification) {
        NoticeToDownloadStatus(false, "Started download", filePath)
    }

    if (res.status == "finished" && res.isOverwrite != "Yes") {

        if (res.returncode == 0) {
            NoticeToDownloadStatus(true, "Successful download", filePath);
        }

        else if (res.returncode == 1) {
            NoticeToDownloadStatus(true, "Worning download", filePath);
        }

        if (res.returncode != 0 && res.returncode != 1) {
            NoticeToDownloadStatus(true, "Failed download", filePath);
        }

    }

    //通知だす
    function NoticeToDownloadStatus(showExplorerLink, title, message) {
        notificationIds["to_Youtube_dlStatus" + res.url] = {};
        const item = notificationIds["to_Youtube_dlStatus" + res.url];
        item.showExplorerLink = showExplorerLink;
        item.filePath = filePath;
        item.dir = res.dir;
        // console.log(item);
        browser.notifications.create("to_Youtube_dlStatus" + res.url, {
            type: "basic",
            iconUrl: "image/icon_enable64.png",
            title: title,
            message: message
        });
    }
}
const notificationIds = {};

//通知クリックでディレクトリかファイル開く
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
    if (item == null || !item.showExplorerLink)
        return;

    const option = await browser.storage.local.get();

    /*  if (option.isOpenDirectoryAlways == null)
         option.isOpenDirectoryAlways = true; */

    const message = {
        path: item.dir,
        isSelect: false,
        callback: ReceiveShowDirectory
    };


    // console.log(message);
    SendNative("DirectoryManager", message);
    delete notificationIds[id];
});

const ReceiveShowDirectory = (res, port) => {
    //  console.log(res);
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
            return resolve(res.dir.replace(/\//g, "\\\\"));
        }
        resolve(null);

    });
}

const ports = {
    download: {}, getJson: {}
};
//ネイティブにメッセージを送る。前に同じコールバックのメッセージがあったらそのポートの接続切っておくおく
const SendNative = (toSendName, message) => {
    if (message == null)
        message = {};


    try {
        const port = browser.runtime.connectNative("Youtube_dlForExtension");

        if (message.callback != null) {
            message.callbackString = message.callback.name.toString();

            if (message.callbackString == "ReceiveDownload") {
                if (ports["download"][message.command] != null)
                    ports["download"][message.command].port.disconnect();

                ports["download"][message.command] = { port: port, message: message };
                port.onMessage.addListener(res => ports["download"][message.command].message.callback(res, port));

            } else if (message.callbackString == "ReceiveGetJson") {
                if (ports["getJson"][message.command] != null)
                    ports["getJson"][message.command].port.disconnect();

                ports["getJson"][message.command] = { port: port, message: message };
                port.onMessage.addListener(res => ports["getJson"][message.command].message.callback(res, port));

            } else {
                if (ports[message.callbackString] != null) {
                    ports[message.callbackString].port.disconnect();
                }
                ports[message.callbackString] = { port: port, message: message };
                port.onMessage.addListener(res => ports[message.callbackString].message.callback(res, port));
            }
        }

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
    if (message == null)
        message = {};
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

UpdateBrowserAction(false, null);
//タブ切り替え時
browser.tabs.onActivated.addListener(async info => {
    const url = (await browser.tabs.get(info.tabId)).url;
    if (url == null)
        return;
    const c = cache[url];
    UpdateBrowserAction(c != null && c != "NotFound" && c != "Getting", info.tabId);

});
//タブ更新時
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.active)
        UpdateBrowserAction(false, tab.id);

}, {
        properties: ["status"]
    });

//自動読み込みリスナーを再設定
const UpdateTabListener = async () => {
    const option = await browser.storage.local.get();
    const listener = (e, changeInfo, tab) => {
        GetJson(tab.url);
    };
    if (browser.tabs.onUpdated.hasListener(listener))
        browser.tabs.onUpdated.removeListener(listener);

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
    //youtube-dl アップデート
     await SendNativePromise("UpdateYoutube_dl");
    try {


        const res = await SendNativePromise("GetVersion");
        //console.log(res);
        const latestVersion = "1.2.0";
        if (res.version != latestVersion) {
            await SendNativePromise("Update");
        }
    } catch (e) {
        if (/Native application tried to send a message/.test(e)) {
            browser.notifications.create("UpdateYoutube_dlForExtension", {
                type: "basic",
                iconUrl: "image/icon_enable64.png",
                title: "There is a native program update!",
                message: "You can update it automatically from now on.\n\n                     Click here!"
            });
        }
    }
})()