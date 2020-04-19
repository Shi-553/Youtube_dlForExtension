(async () => {

    let optionsPort, popupPort;
    let isPopupOpen = false;

    const PostInitializing = m => {
        if (m.name == "options") {
            myscript.PostMessage(optionsPort, "Init", { id: m.id });
        }
        if (m.name == "popup") {
            myscript.PostMessage(popupPort, "Init", { id: m.id });
        }
    }
    const ConnectPostInitializing = p => {
        //console.log(p);
        p.onMessage.addListener(PostInitializing);

        if (p.name == "options") {
            optionsPort = p;
            optionsPort.onDisconnect.addListener(() => optionsPort = null);
        }
        if (p.name == "popup") {
            popupPort = p;
            popupPort.onDisconnect.addListener(() => { isPopupOpen = false; popupPort = null; });
        }
    }

    browser.runtime.onConnect.addListener(ConnectPostInitializing);

    //プロミス版 await で繋げられるが複数回返せない
    const SendNativePromise = async (toSendName, message, isSuppressEror = false) => {
        try {
            const res = await browser.runtime.sendNativeMessage("Youtube_dlForExtension",
                {
                    name: toSendName,
                    value: message
                });
            if (res.status == "error") {
                console.error(res);
            } else {
                return res;
            }

        } catch (e) {
            console.error(e);
            if (isSuppressEror) {
                return null;
            }
            browser.notifications.create({
                type: "basic",
                iconUrl: "image/icon_enable64.png",
                title: "Failed communicate",
                message: "Couldn't communicate native application"
            });
        }
    }



    //バージョン確認
    const getVersionRes = await SendNativePromise("GetVersion", {}, true);
    if (getVersionRes == null) {
        browser.notifications.create("UpdateYoutube_dlForExtension", {
            type: "basic",
            iconUrl: "image/icon_enable64.png",
            title: "Couldn't communicate native application",
            message: "You are misconfiguring\n or need an update.\n Click here."
        });
        return;
    }
    const nowNativeVersion = getVersionRes.version;

    const versionApiEndPoint = 'https://script.google.com/macros/s/AKfycby2jLOP78bcRSHdGbKHdgKJe-QrZTUiN2rFPOF53pnvhxHqGrVr/exec';
    const extensionVersion = browser.runtime.getManifest().version;

    const versionRes = await fetch(`${versionApiEndPoint}?extensionVersion=${extensionVersion}`);
    const nativeVersionApiData = await versionRes.text();
    console.log(nativeVersionApiData);

    //最新バージョンじゃなかったら更新
    if (nowNativeVersion != nativeVersionApiData) {
        console.log(nowNativeVersion);

        const updateRes = await SendNativePromise("Update", {}, true);
        await myscript.Sleep(3000);

        //ちゃんと更新されたか確認
        let getAfterVersionRes = null, i = 0;
        if (updateRes != null) {
            while (i < 5) {
                getAfterVersionRes = await SendNativePromise("GetVersion", {}, true);
                if (getAfterVersionRes != null)
                    break;
                await myscript.Sleep(1000);
                i++;
            }
        }
        console.log(getAfterVersionRes.version);
        if (updateRes == null || getAfterVersionRes == null || nowNativeVersion == getAfterVersionRes.version) {
            browser.notifications.create("FailUpdateYoutube_dlForExtension", {
                type: "basic",
                iconUrl: "image/icon_enable64.png",
                title: "Failed to communicate with updater",
                message: "Sorry.\nUpdater has a bug and\nneed for update again.\nClick..."
            });
        } else {
            browser.notifications.create("UpdateYoutube_dlForExtension", {
                type: "basic",
                iconUrl: "image/icon_enable64.png",
                title: "Native programs update ",
                message: nowNativeVersion + " to " + getAfterVersionRes.version
            });
        }
    } else {
        console.log("Native programs is the Latest version! " + nativeVersionApiData);
    }


    const rs = await Promise.all([browser.storage.local.get(), SendNativePromise("GetUserProfile", {}, true)]);

    const option = rs[0];
    const userProfile = rs[1];

    browser.storage.local.set({
        switchItemProgressFlag: false
    });

    if (option.preset == null) {
        browser.storage.local.set({
            preset: {
                Default: { filename: "", output: "", option: "", isShareJson: true }
            },
            selectedPreset: "Default"
        });
    }

    if (option.simultaneous == null) {
        browser.storage.local.set({
            simultaneous: 2
        });
    }

    if (option.urls == null) {
        browser.storage.local.set({
            urls: ["<all_urls>"]
        });
    }

    if (option.isAutoRetry == null) {
        browser.storage.local.set({
            isAutoRetry: true
        });
    }

    if (option.howToCount == null) {
        browser.storage.local.set({
            howToCount: "Count all in bulk"
        });
    }
    if (userProfile != null) {
        if (option.mainDownloadDirectory == null) {
            browser.storage.local.set({
                mainDownloadDirectory: userProfile + "\\Downloads"
            });
        }
        if (option.subDownloadDirectory == null) {
            browser.storage.local.set({
                subDownloadDirectory: userProfile + "\\Videos"
            });
        }
    }
    if (option.overwrite == null) {
        browser.storage.local.set({
            overwrite: "Show dialog to select"
        });
    }
    if (option.isDisableHealthyNotification == null) {
        browser.storage.local.set({
            isDisableHealthyNotification: false
        });
    }
    if (option.isYoutube_dlAutoUpdate == null) {
        browser.storage.local.set({
            isYoutube_dlAutoUpdate: false
        });
    }
    if (option.isYoutube_dlAutoUpdate == null) {
        browser.storage.local.set({
            isYoutube_dlAutoUpdate: false
        });
    }
    if (option.youtube_dlUpdateCommand == null) {
        browser.storage.local.set({
            youtube_dlUpdateCommand: "python -m pip install -U youtube-dl --user"
        });
    }

    //youtube-dlの更新
    if (option.isYoutube_dlAutoUpdate) {
        const r = await SendNativePromise("UpdateYoutube_dl", { youtube_dlUpdateCommand: option.youtube_dlUpdateCommand }, true);
        console.log(r);

        if (/Updated youtube-dl/.test(r.stdout)) {
            browser.notifications.create("UpdateYoutube_dl", {
                type: "basic",
                iconUrl: "image/icon_enable64.png",
                title: "Youtube-dl update.",
                message: ""
            });
        }
    }



    const optionsOnMessage = async (e) => {
        //console.log(e);
        const m = e.body, id = e.id;

        if (m.isUpdateTabListener) {
            UpdateTabListener();

        }

        if (m.changePresetValue) {
            for (let url of Object.keys(cache)) {
                if (m.isShareJson) {
                    for (let key of Object.keys(cache[url])) {
                        if (ports[ReceiveGetJson.name.toString()][url + key] != null)
                            ports[ReceiveGetJson.name.toString()][url + key].port.disconnect();
                    }
                    cache[url].json = null;

                } else {
                    if (ports[ReceiveGetJson.name.toString()][url + m.key] != null)
                        ports[ReceiveGetJson.name.toString()][url + m.key].port.disconnect();
                }
                cache[url]["options"][m.key] = null;
            }
        }


        if (m.isGetUserProfile) {
            myscript.PostMessage(optionsPort, userProfile, { id: id });
        }

        if (m.isSelectDirectory) {
            myscript.PostMessage(optionsPort, await SelectDirectoryAsync(m.initialDir), { id: id });
        }

        if (m.isGetInitStatus) {
            myscript.PostMessage(optionsPort, "EndInit", { id: id });
        }

    }
    const popupOnMessage = async (e) => {
        //console.log(e);
        const m = e.body, id = e.id;

        if (m.noticeDownloadStatus != null) {
            NoticeDownloadStatus(m.res, m.showExplorerLink, m.title, m.message);
        }

        if (m.isStopDownloadAll) {
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

            SendProccess(id)

            myscript.UpdateBadgeText(GetDownloadProgressCount().toString());
            browser.notifications.create("stopDownloadAll", {
                type: "basic",
                iconUrl: "image/icon_enable64.png",
                title: "Stop Download All",
                message: stopDownloadStr
            });

        }

        if (m.restartDownload) {
            const canDownload = await CanDownload(m.progress.domain);
            progresss[m.progress.url + m.progress.key].isDownloading = canDownload ? "Download" : "Wait";
            if (canDownload) {
                m.progress.messageToSend.messageToSend = JSON.parse(JSON.stringify(m.progress.messageToSend));
                SendNative("To_Youtube_dl", ReceiveDownload, m.progress.messageToSend);
            } else {
                waitProgress.push(progresss[m.progress.url + m.progress.key]);
            }
            SendProccess(id);
            myscript.UpdateBadgeText(GetDownloadProgressCount().toString());

        }

        if (m.stopDownload) {
            //console.log(e);
            //console.log(ports);
            waitProgress = waitProgress.filter(p => p != progresss[m.progress.url + m.progress.key]);

            const p = ports[ReceiveDownload.name.toString()][m.progress.url + m.progress.key];
            if (p) {
                p.port.disconnect();
            }
            progresss[m.progress.url + m.progress.key].isDownloading = "Stop";
            m.progress.filePath += ".part";
            NoticeDownloadStatus(m.progress, true, "Stop Download", m.progress.json._filename);
            SendProccess(id);
            myscript.UpdateBadgeText(GetDownloadProgressCount().toString());
            SendNativePromise("RemoveJson", m.progress.messageToSend);

            if (waitProgress.length != 0) {
                const waitingProgres = waitProgress.shift();
                waitingProgres.isDownloading = "Download";

                waitingProgres.messageToSend.messageToSend = JSON.parse(JSON.stringify(waitingProgres.messageToSend));
                SendNative("To_Youtube_dl", ReceiveDownload, waitingProgres.messageToSend);

            }
        }

        if (m.isGetJson) {
            GetJson(null, m.url, m.key, m.isCacheRefresh);

        }

        if (m.isGetUserProfile) {
            myscript.PostMessage(popupPort, userProfile, { id: id });

        }


        if (m.isOpen) {
            isPopupOpen = true;
            //console.log(progresss);
            SendProccess(id);
            GetJson();

        }


        if (m.isDownload) {
            DownloadPrepare(m);
        }

        if (m.isGetInitStatus) {
            myscript.PostMessage(popupPort, "EndInit", { id: id });
        }
    }

    browser.runtime.onConnect.removeListener(ConnectPostInitializing);

    browser.runtime.onConnect.addListener(p => {
        if (p.name == "options") {
            optionsPort = p;
            optionsPort.onDisconnect.addListener(() => optionsPort = null);

            optionsPort.onMessage.addListener(optionsOnMessage);
        }
        if (p.name == "popup") {
            popupPort = p;
            popupPort.onDisconnect.addListener(() => { isPopupOpen = false; popupPort = null; });

            popupPort.onMessage.addListener(popupOnMessage);
        }
    });


    if (optionsPort != null) {
        optionsPort.onMessage.removeListener(PostInitializing);
        optionsPort.onMessage.addListener(optionsOnMessage);

        myscript.PostMessage(optionsPort, "EndInit");
    }


    if (popupPort != null) {
        popupPort.onMessage.removeListener(PostInitializing);
        popupPort.onMessage.addListener(popupOnMessage);

        myscript.PostMessage(popupPort, "EndInit");
    }



    const GetJson = async (tabId = null, url = null, key = null, isCacheRefresh = false) => {
        const r = await Promise.all([browser.storage.local.get(), browser.tabs.query({ currentWindow: true, active: true })]);
        //今のタブ
        let activeTab = r[1][0];

        const option = r[0];
        //console.log(option);
        const selectedPreset = myscript.GetPreset(option, option.temporarySelectedPreset);

        const selectedKey = selectedPreset.key;

        if (url == null)
            url = activeTab.url;
        if (tabId == null)
            tabId = activeTab.id;
        if (key == null)
            key = selectedKey;

        const tabUrl = (await browser.tabs.get(tabId).catch(() => { return {}; })).url;

        const preset = myscript.GetPreset(option, key);
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
                myscript.UpdateBrowserActionIcon(false, tabId);
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
            if (!isPopupOpen)
                return;
            if (selectedKey == key && activeTab.id == tabId && activeTab.url == url) {
                myscript.PostMessage(popupPort, { item: "Getting" });
            }
            console.log("Getting");
            return;
        }

        //jsonなかったとき
        if ((cache[url].json == "NotFound" && preset.isShareJson) || cache[url]["options"][key] == "NotFound") {
            if (!isPopupOpen)
                return;
            if (selectedKey == key && activeTab.id == tabId && activeTab.url == url) {
                myscript.PostMessage(popupPort, { item: "NotFound" });
            }
            console.log("NotFound");
            return;
        }

        //そのオプションのjsonがまるまるあるとき
        if (cache[url]["options"][key] != null) {
            console.log("Hit Cache");

            if (tabUrl == url) {
                myscript.UpdateBrowserActionIcon(true, tabId);
            }
            console.log(selectedKey);
            if (isPopupOpen && selectedKey == key && activeTab.id == tabId && activeTab.url == url) {
                // console.log(cache);
                const item = cache[url]["options"][key];
                item.tabId = tabId;
                item.key = key;
                item.isF = isF;
                myscript.PostMessage(popupPort, { item: item });
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
                        const p = myscript.GetPreset(option, k);
                        if (p.isShareJson != null && !p.isShareJson)
                            await myscript.Sleep(1000);
                    }
                }
            }
            return;
        }
        //jsonがあるときでシェアOKなとき
        //オプションのjsonはとってないとき
        if (cache[url].json != null && preset.isShareJson) {
            if (isPopupOpen && selectedKey == key && activeTab.id == tabId && activeTab.url == url) {
                myscript.PostMessage(popupPort, { item: "Getting" });
            }
            //console.log(cache);
            console.log("Yes json");
            cache[url]["options"][key] = "Getting";

            SendNative("To_Youtube_dl", ReceiveGetJson, {
                isF: isF,
                command: `youtube-dl --no-playlist -j --load-info-json "<JSONPATH>" ${outputOption}`,
                key: key,
                url: url,
                tabId: tabId,
                json: cache[url].json
            });
            return;
        }

        if (isPopupOpen && selectedKey == key && url == url && tabId == activeTab.id) {
            myscript.PostMessage(popupPort, { item: "Getting" });
        }
        //jsonがないとき
        console.log("No Cache");
        if (preset.isShareJson) {
            cache[url].json = "Getting";
        }
        cache[url]["options"][key] = "Getting";
        //console.log(url);

        const message = {
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

        if (res.status != "finished")
            return;

        const r = await Promise.all([browser.storage.local.get(), browser.tabs.query({ currentWindow: true, active: true })]);
        const option = r[0];
        const activeTab = r[1][0];

        const selectedPreset = myscript.GetPreset(option, option.temporarySelectedPreset);
        const key = selectedPreset.key;
        const preset = myscript.GetPreset(option, key);

        if (preset.isShareJson == null) {
            preset.isShareJson = true;
        }

        console.log(key);
        //console.log(preset);

        const urll = (await browser.tabs.get(res.tabId).catch(() => { return {}; })).url;

        if (urll == res.url) {
            myscript.UpdateBrowserActionIcon(res.returnJson != null, res.tabId);
        }
        if (res.returnJson == null) {
            console.log("NotFound");

            if (cache[res.url].json == "Getting" && preset.isShareJson)
                cache[res.url].json = "NotFound";

            //console.log(cache);
            cache[res.url]["options"][res.key] = "NotFound";
            // if (/ERROR:(.+? is not a valid URL.)|(Unsupported URL)/.test(res.stdout)) {
            if (isPopupOpen && res.key == key && activeTab.url == res.url && activeTab.id == res.tabId) {
                myscript.PostMessage(popupPort, { item: "NotFound" });
            }
            // }
        } else {
            console.log("Success");

            const item = res.returnJson;
            item.key = res.key;
            item.tabId = res.tabId;
            item.isF = res.isF;
            item.url = res.url;

            if (cache[res.url].json == "Getting" && preset.isShareJson) {
                cache[res.url].json = item;
            }
            cache[res.url]["options"][res.key] = item;

            if (res.key == key && activeTab.url == res.url && activeTab.id == res.tabId) {
                if (isPopupOpen) {
                    myscript.PostMessage(popupPort, { item: item });
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
                        const p = myscript.GetPreset(option, k);
                        if (p.isShareJson != null && !p.isShareJson)
                            await myscript.Sleep(1000);
                    }
                }
            }
        }

    }

    //ファイル名を確定させる
    const DownloadPrepare = async e => {
        const r = await Promise.all([browser.storage.local.get(), browser.tabs.query({ currentWindow: true, active: true })]);
        //今のタブ
        let activeTab = r[1][0];

        const option = r[0];
        const selectedPreset = myscript.GetPreset(option, option.temporarySelectedPreset);

        const selectedKey = selectedPreset.key;

        if (e.url == null)
            e.url = activeTab.url;
        if (e.tabId == null)
            e.tabId = activeTab.id;
        if (e.key == null)
            e.key = selectedKey;

        const preset = myscript.GetPreset(option, e.key);

        let outputOption = preset.output;

        if (e.json.isF) {
            outputOption = " " + outputOption + " ";
            outputOption = outputOption.replace(/ -F /, " ");

        }
        //console.log(e);
        //console.log(option);
        let dir = "";
        switch (e.which) {
            case 1:
                dir = option.mainDownloadDirectory;
                break;
            case 2:
                dir = await SelectDirectoryAsync(option.mainDownloadDirectory);

                if (dir == "") {
                    NoticeDownloadStatus(e, false, "Cancel download.", e.filename);
                    return;
                }
                break;
            case 3:
                dir = option.subDownloadDirectory;
        }


        const code = `youtube-dl --no-playlist --load-info-json "<JSONPATH>" ${e.selectFormat != null ? "-f " + e.selectFormat : ""} ${e.filename} ${outputOption} ${selectedPreset.option} --newline`;


        const messageToSend = {
            command: code,
            dir: dir,
            overwrite: option.overwrite,
            url: e.url,
            key: e.key,
            domain: e.url.split('/')[2],
            tabId: e.tabId,
            usePopen: true
        };


        SendNative("To_Youtube_dl", ReceiveDownloadPrepare, {
            dir: dir,//.replace(/\\+/g, "\\\\"),
            command: `youtube-dl --no-playlist -j --load-info-json "<JSONPATH>" ${outputOption}`,
            url: e.url,
            domain: e.url.split('/')[2],
            json: e.json,
            messageToSend: messageToSend,
            key: e.key,
            tabId: e.tabId
        });
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

        res.messageToSend.dir = res.dir;
        res.messageToSend.filePath = `${res.dir}\\${res.returnJson._filename}`;

        const canDownload = await CanDownload(res.domain);
        //console.log(canDownload);

        progresss[res.url + res.messageToSend.key] = {
            url: res.url,
            key: res.key,
            isDownloading: canDownload ? "Download" : "Wait",
            json: res.returnJson,
            domain: res.domain,
            messageToSend: res.messageToSend
        };

        if (isPopupOpen) {
            SendProccess()
        }
        myscript.UpdateBadgeText(GetDownloadProgressCount().toString());

        if (canDownload) {
            res.messageToSend.messageToSend = JSON.parse(JSON.stringify(res.messageToSend));
            //console.log(res);
            SendNative("To_Youtube_dl", ReceiveDownload, res.messageToSend);
        } else {
            waitProgress.push(progresss[res.url + res.key]);
        }
    }

    const progresss = {};
    let waitProgress = [];

    const GetDownloadProgressCount = () => {
        let count = 0;
        for (let key of Object.keys(progresss)) {
            if (progresss[key].isDownloading == "Download")
                count++;
        }
        return count;
    }
    const CanDownload = async (domain) => {
        const option = await browser.storage.local.get();

        let downloadingCount = 0;
        for (let key of Object.keys(progresss)) {
            if (progresss[key].isDownloading == "Download" && (option.howToCount == "Count all in bulk" || domain == progresss[key].domain))
                downloadingCount++;
        }


        let canDownload = true;

        //console.log(downloadingCount);
        if (option.simultaneous <= downloadingCount)
            canDownload = false;

        return canDownload;
    }

    const downloadMatchReg = /^\[download\]\s+(.+?)%\s+of\s+(.+?)\s+at\s+(.+?)\s+ETA\s+(.+)$/;

    const ReceiveDownload = async (res, port) => {
        //console.log(res);
        if (res.status != "Progress") {
        }


        if (res.status == "Progress" && downloadMatchReg.test(res.stdout)) {
            //console.log(res.stdout);
            const matchs = res.stdout.match(downloadMatchReg);

            progresss[res.url + res.key] = {
                url: res.url,
                key: res.key,
                filePath: res.filePath,
                messageToSend: res.messageToSend,
                json: res.json,
                domain: res.domain,
                isDownloading: "Download",
                percent: parseFloat(matchs[1]),
                size: matchs[2],
                speed: matchs[3],
                ETA: matchs[4]
            };
            if (isPopupOpen) {
                SendProccess();
            }
            return;
        }

        const option = await browser.storage.local.get();

        if (res.status == "finished") {
            if (res.returncode == 1) {

                if (option.isAutoRetry) {
                    const percent = progresss[res.url + res.key] != null ? progresss[res.url + res.key].percent : 0;

                    if (res.prevPercent == null)
                        res.prevPercent = 0;

                    console.log(res.prevPercent);
                    console.log(percent);

                    if (res.prevPercent < percent) {
                        res.messageToSend.prevPercent = percent;

                        res.messageToSend.messageToSend = JSON.parse(JSON.stringify(res.messageToSend));
                        SendNative("To_Youtube_dl", ReceiveDownload, res.messageToSend);
                        NoticeDownloadStatus(res, false, "Worning download.\nAuto retry.", res.json._filename);

                    } else {
                        NoticeDownloadStatus(res, true, "Worning download.\nThe download is not progressing at all, so i will exit.", res.json._filename);
                        progresss[res.url + res.key].isDownloading = "Worning";

                    }
                    myscript.UpdateBadgeText(GetDownloadProgressCount().toString());

                    return;

                } else {
                    progresss[res.url + res.key].isDownloading = "Worning";
                }
            }

            else if (res.returncode == 0) {
                progresss[res.url + res.key].isDownloading = "Finish";
            } else {
                progresss[res.url + res.key].isDownloading = "Failed";
            }


            if (waitProgress.length != 0) {
                const waitingProgres = waitProgress.shift();
                waitingProgres.isDownloading = "Download";

                waitingProgres.messageToSend.messageToSend = JSON.parse(JSON.stringify(waitingProgres.messageToSend));
                SendNative("To_Youtube_dl", ReceiveDownload, waitingProgres.messageToSend);

            }
            console.log("endDownloading");
            if (isPopupOpen) {
                SendProccess();
            }
        }

        if (res.status == "AskOverwrite") {
            NoticeDownloadStatus(res, false, "Do you want to overwrite it?", res.filePath);
        }
        if (res.status == "DoesNotExistDirectory") {
            NoticeDownloadStatus(res, false, "Does not exist directory", res.dir);
        }
        if (res.status == "NotOverwritten") {
            NoticeDownloadStatus(res, true, "Did not overwrite", `${res.filePath}\n is already exists.`);
            progresss[res.url + res.key].isDownloading = "Finish";
        }
        if (res.status == "Overwritten") {
            NoticeDownloadStatus(res, true, "Overwritten", res.filePath);
        }

        if (res.status == "started" && !option.isDisableHealthyNotification && res.prevPercent == null) {
            NoticeDownloadStatus(res, false, "Started download", res.filePath)
        }

        if (res.status == "finished" && res.overwrite != "Yes") {

            if (res.returncode == 0) {
                NoticeDownloadStatus(res, true, "Successful download", res.filePath);
            }

            else if (res.returncode == 1) {
                NoticeDownloadStatus(res, true, "Worning download", res.stdout);
            }

            if (res.returncode != 0 && res.returncode != 1) {
                NoticeDownloadStatus(res, true, "Failed download", res.stdout);
            }

        }

        myscript.UpdateBadgeText(GetDownloadProgressCount().toString());

    }

    const SendProccess = (id = null) => {

        myscript.PostMessage(popupPort, { progresss: progresss }, { id: id });
    }

    //通知だす
    function NoticeDownloadStatus(res, showExplorerLink, title, message) {
        notificationIds["to_Youtube_dlStatus" + res.url + res.key] = {};
        const notificationItem = notificationIds["to_Youtube_dlStatus" + res.url + res.key];
        notificationItem.showExplorerLink = showExplorerLink;
        if (showExplorerLink)
            notificationItem.filePath = res.filePath;
        notificationItem.dir = res.dir;
        notificationItem.key = res.key;
        notificationItem.tabId = res.tabId;
        notificationItem.url = res.url;
        //console.log(item);
        browser.notifications.create("to_Youtube_dlStatus" + res.url + res.key, {
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
        if (id == "FailUpdateYoutube_dlForExtension") {
            browser.tabs.create({
                active: true,
                url: "https://drive.google.com/drive/u/1/folders/1Z2t8F5grpS4x_o54yuQMIJ01YrI16YBm"
            });
            return;
        }
        const notificationItem = notificationIds[id];
        //console.log(notificationIds);
        //console.log(id);
        if (notificationItem == null || !notificationItem.showExplorerLink)
            return;

        const message = {
            path: notificationItem.filePath,
            isSelect: true,
            key: notificationItem.key,
            tabId: notificationItem.tabId,
            url: notificationItem.url
        };


        //console.log(message);
        SendNative("DirectoryManager", ReceiveShowDirectory, message);
        delete notificationIds[id];
    });

    const ReceiveShowDirectory = (res, port) => {
        console.log(res);
    }




    //ディレクトリ選択画面を出す プロミス
    const SelectDirectoryAsync = (initialDir) => {
        return new Promise(async resolve => {
            const message = {
                initialDir: initialDir
            };
            // console.log(message);
            const res = await SendNativePromise("DirectoryManager", message);
            if (res.status == "success") {
                return resolve(res.dir);
            }
            resolve("");

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
                if (res.status == "error") {
                    console.error(res);
                } else {
                    callback(res, port);
                }
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
            console.error(e);
            browser.notifications.create({
                type: "basic",
                iconUrl: "image/icon_enable64.png",
                title: "Failed communicate",
                message: "Couldn't communicate native application"
            });
        }
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
                    await myscript.Sleep(1000);

                getjsonInterval = true;
                console.log("listener");
                await GetJson(tab.id, tab.url);
                await myscript.Sleep(1000);
                getjsonInterval = false;
            }
        };

        if (option.urls == [])
            return;


        browser.tabs.onUpdated.addListener(listener, {
            urls: option.urls,
            properties: ["status"]
        });
    }

    UpdateTabListener();


})()