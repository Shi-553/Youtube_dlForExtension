
(async () => {
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


    myscript.UpdateBrowserActionIcon(false, null);



    let optionsPort, popupPort;

    const ConnectPostInitializing = p => {
        console.log(p);
        p.onMessage.addListener(PostInitializing);

        if (p.name == "options") {
            optionsPort = p;
            optionsPort.onDisconnect.addListener(() => optionsPort = null);
        }
        if (p.name == "popup") {
            popupPort = p;
            popupPort.onDisconnect.addListener(() => popupPort = null);
        }
    }
    const PostInitializing = m => {
        if (m.name == "options") {
            myscript.PostMessage(optionsPort, "Init", m.id);
        }
        if (m.name == "popup") {
            myscript.PostMessage(popupPort, "Init", m.id);
        }
    }

    browser.runtime.onConnect.addListener(ConnectPostInitializing);



    //バージョン確認
    const res = await SendNativePromise("GetVersion", {}, true);
    if (res == null) {
        browser.notifications.create("UpdateYoutube_dlForExtension", {
            type: "basic",
            iconUrl: "image/icon_enable64.png",
            title: "Couldn't communicate native application",
            message: "You are misconfiguring\n or need an update.\n Click here."
        });
        return;
    }

    const latestVersion = "1.5";
    //最新バージョンじゃなかったら更新
    if (res.version != latestVersion) {
        if (await SendNativePromise("Update", {}, true) == null) {
            browser.notifications.create("FailUpdateYoutube_dlForExtension", {
                type: "basic",
                iconUrl: "image/icon_enable64.png",
                title: "Failed to communicate with updater",
                message: "Sorry.\nUpdater has a bug and\nneed for update again."
            });
        } else {
            await myscript.Sleep(3000);
            browser.notifications.create("UpdateYoutube_dlForExtension", {
                type: "basic",
                iconUrl: "image/icon_enable64.png",
                title: "Native programs update ",
                message: res.version + " to " + latestVersion
            });
        }
    } else {
        console.log("Native programs is the Latest version! " + latestVersion);
    }


    //youtube-dlの設定
    let r = null, i = 0;
    while (i < 5) {
        r = await SendNativePromise("UpdateYoutube_dl", {}, true);
        if (r != null)
            break;
        await myscript.Sleep(1000);
        i++;
    }
    console.log(r, i);
    if (/Updated youtube-dl/.test(r.stdout)) {
        browser.notifications.create("UpdateYoutube_dl", {
            type: "basic",
            iconUrl: "image/icon_enable64.png",
            title: "Youtube-dl update.",
            message: ""
        });
    }


    let isPopupOpen = false, switchProgressFlag = false;
    let userProfile;

    const optionsOnMessage = async (e) => {
        console.log(e);
        const m = e.message, id = e.id;

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
            if (userProfile == null)
                userProfile = await SendNativePromise("GetUserProfile");


            myscript.PostMessage(optionsPort, userProfile, id);

        }

        if (m.isSelectDirectory) {
            myscript.PostMessage(optionsPort, await SelectDirectoryAsync(m), id);
        }

        if (m.isGetInitStatus) {
            myscript.PostMessage(optionsPort, "EndInit", id);
        }

    }
    const popupOnMessage = async (e) => {
        console.log(e);
        const m = e.message, id = e.id;

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
            if (userProfile == null)
                userProfile = await SendNativePromise("GetUserProfile");

            myscript.PostMessage(popupPort, userProfile, id);

        }

        if (m.switchProgressFlag != null) {
            switchProgressFlag = m.switchProgressFlag;

        }

        if (m.isOpen) {
            isPopupOpen = true;
            //console.log(progresss);
            SendProccess(id);
            GetJson();

        }

        if (m.isClose) {
            isPopupOpen = false;
            browser.storage.local.set({
                selectedPreset: m.selectedPreset
            });

        }

        if (m.isSelectPath) {
            myscript.PostMessage(popupPort, await SelectPathAsync(m), id);
        }

        if (m.isDownload) {
            if (m.downloadDirectory == null) {
                m.downloadDirectory = await SelectDirectoryAsync(m);
                if (m.downloadDirectory == "")
                    return;
            }
            Download(m);
        }

        if (m.isGetInitStatus) {
            myscript.PostMessage(popupPort, "EndInit", id);
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
            popupPort.onDisconnect.addListener(() => popupPort = null);

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
        const selectedPreset = myscript.GetPreset(option);

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
                popupPort.postMessage("Getting");
            }
            myscript.PostMessage(popupPort, "Getting");
            return;
        }

        //jsonなかったとき
        if ((cache[url].json == "NotFound" && preset.isShareJson) || cache[url]["options"][key] == "NotFound") {
            if (!isPopupOpen)
                return;
            if (selectedKey == key && activeTab.id == tabId && activeTab.url == url) {
                myscript.PostMessage(popupPort, "NotFound");
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
                myscript.UpdateBrowserActionIcon(true, tabId);
            }
            if (isPopupOpen && selectedKey == key && activeTab.id == tabId && activeTab.url == url) {
                // console.log(cache);
                const item = cache[url]["options"][key];
                item.tabId = tabId;
                item.key = key;
                item.isF = isF;
                myscript.PostMessage(popupPort, item);
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
                myscript.PostMessage(popupPort, "Getting");
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
            myscript.PostMessage(popupPort, "Getting");
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

        if (res.status != "finished")
            return;

        const r = await Promise.all([browser.storage.local.get(), browser.tabs.query({ currentWindow: true, active: true })]);
        const option = r[0];
        const activeTab = r[1][0];

        const selectedPreset = myscript.GetPreset(option);
        const key = selectedPreset.key;
        const preset = myscript.GetPreset(option, key);
        if (preset.isShareJson == null) {
            preset.isShareJson = true;
        }
        //console.log(key);
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
                myscript.PostMessage(popupPort, "NotFound");
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
                    myscript.PostMessage(popupPort, message);
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
        const selectedPreset = myscript.GetPreset(option);

        const selectedKey = selectedPreset.key;

        if (e.json.webpage_url == null)
            e.json.webpage_url = activeTab.url;
        if (e.tabId == null)
            e.tabId = activeTab.id;
        if (e.key == null)
            e.key = selectedKey;

        const preset = myscript.GetPreset(option, e.key);

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
            SendProccess(id)
        }
        myscript.UpdateBadgeText(GetDownloadProgressCount().toString());
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
    const GetDownloadProgressCount = ()=>{
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

    const downloadMatchReg = /^\[download\]\s+(.+?)%\s+of\s+(.+?)\s+at\s+(.+?)\s+ETA\s+(.+)$/;

    const ReceiveDownload = async (res, port) => {
        if (res.status != "Progress") {
            //console.log(res);
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
                SendProccess();
            }
            return;
        }
        const option = await browser.storage.local.get();
        //console.log(res);


        if (res.status == "finished") {
            if (res.returncode == 1) {

                if (option.isAutoRetry == null || option.isAutoRetry) {
                    const percent = progresss[res.webpage_url + res.key] != null ? progresss[res.webpage_url + res.key].percent : 0;
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
                        progresss[res.webpage_url + res.key].isDownloading = "Worning";
                    }
                    myscript.UpdateBadgeText(GetDownloadProgressCount().toString());
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
            myscript.UpdateBadgeText(GetDownloadProgressCount().toString());
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
            myscript.UpdateBadgeText(GetDownloadProgressCount().toString());
        }
        if (res.status == "Overwritten") {
            NoticeDownloadStatus(res, true, "Overwritten", `${res.filePath}`);
        }

        if (res.status == "started" && (option.isDisableHealthyNotification == null || !option.isDisableHealthyNotification) && res.prevPercent == null) {
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
    const SendProccess = (id = null) => {
        const message = {
            message: "Progress",
            progresss: progresss,
            switchProgressFlag: switchProgressFlag
        };

        myscript.PostMessage(popupPort, message, id);
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
        if (id == "FailUpdateYoutube_dlForExtension") {
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
            resolve("");

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

        if (option.urls == null)
            option.urls = ["<all_urls>"];

        browser.tabs.onUpdated.addListener(listener, {
            urls: option.urls,
            properties: ["status"]
        });
    }

    UpdateTabListener();


})()
