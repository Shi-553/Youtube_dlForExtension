
let switchProgressFlag = false;

window.addEventListener("DOMContentLoaded", async () => {

    const ul = document.getElementById("list");
    let item = null, progresss = null;
    //�o�b�N�O���E���h����
    browser.runtime.onMessage.addListener(e => {
        //console.log(e);
        if (e.message == "Progress") {
            progresss = e.progresss;
            if (e.switchProgressFlag != null)
                switchProgressFlag = e.switchProgressFlag;

            if (switchProgressFlag)
                SetProgress();
            return;
        }
        item = e;

        if (!switchProgressFlag)
            SetItem();
    });
    //to�I�v�V�����N���b�N
    document.getElementById("toOption").addEventListener("click", () => {
        browser.runtime.openOptionsPage();
    });

    const SetItem = async () => {
        if (item == null)
            return;

        ul.textContent = "";

        const message = document.getElementById("message") || document.createElement("div");
        message.className = "message";
        message.id = "message";

        if (item === "Getting") {
            message.textContent = "Getting now...";
            ul.appendChild(message);
            return;
        }
        if (item === "GettingAgain") {
            message.textContent = "Getting again now...";
            ul.appendChild(message);
            return;
        }
        if (item === "NotFound") {
            message.textContent = "Not found.";
            ul.appendChild(message);
            return;
        }
        const option = await browser.storage.local.get();
        const s = (option.preset != null && option.selectedPreset != null) ? option.preset[option.selectedPreset] : null;
        s.output = " " + s.output + " ";

        const newItem = document.createElement("li");
        newItem.style.width = "360px";
        newItem.className = "item";

        const revert = document.createElement("input");
        revert.className = "revert";
        revert.type = "button";
        revert.value = "Revert to Filename option";
        newItem.appendChild(revert);


        const labelAddO = document.createElement("label");
        newItem.appendChild(labelAddO);
        labelAddO.style.cursor = "pointer";

        const addO = document.createElement("input");
        addO.className = "addO";
        addO.type = "checkbox";
        addO.checked = true;
        labelAddO.appendChild(addO);

        const textAddO = document.createElement("span");
        textAddO.style.fontSize = "90%";
        textAddO.textContent = "Add '-o'";
        labelAddO.appendChild(textAddO);
        //

        const filename = document.createElement("textarea");
        filename.className = "filename";
        filename.textContent = item._filename;
        newItem.appendChild(filename);

        const detail = document.createElement("span");
        detail.className = "detail";
        newItem.appendChild(detail);

        const download = document.createElement("input");
        download.className = "download";
        download.type = "button";

        //console.log(progresss);
        //console.log(item);
        if (progresss != null && progresss[item.webpage_url + item.key] != null && (progresss[item.webpage_url + item.key].isDownloading == "Download" || progresss[item.webpage_url + item.key].isDownloading == "Wait")) {
            download.value = "Downloading...";
        } else {
            download.value = "Main/Select/Sub";
        }
        detail.appendChild(download);

        const size = item.width != null ? document.createElement("span") : null;
        if (size != null) {
            size.className = "size";
            size.textContent = item.width + "x" + item.height;
            detail.appendChild(size);
        }
        const fps = item.fps != null ? document.createElement("span") : null;
        if (fps != null) {
            fps.className = "fps";
            fps.textContent = item.fps + "fps";
            detail.appendChild(fps);
        }
        const abr = item.abr != null ? document.createElement("span") : null;
        if (abr != null) {
            abr.className = "abr";
            abr.textContent = item.abr + "kbps";
            detail.appendChild(abr);
        }

        if (/ -F /.test(s.output)) {
            const selectFormat = document.createElement("div");
            selectFormat.className = "selectFormat";
            selectFormat.textContent = "-f ";
            newItem.appendChild(selectFormat);

            const inputSelectFormat = document.createElement("input");
            inputSelectFormat.className = "inputSelectFormat";
            inputSelectFormat.type = "text";
            inputSelectFormat.placeholder = "video ID + audio ID";
            inputSelectFormat.style.width = "60%";
            selectFormat.appendChild(inputSelectFormat);

            const textVideo = document.createElement("div");
            textVideo.textContent = "Video";
            textVideo.style.fontSize = "90%";
            newItem.appendChild(textVideo);

            const formatsVideo = document.createElement("ul");
            formatsVideo.className = "formatsVideo";
            newItem.appendChild(formatsVideo);

            const textAudio = document.createElement("div");
            textAudio.textContent = "Audio";
            textAudio.style.fontSize = "90%";
            newItem.appendChild(textAudio);

            const formatsAudio = document.createElement("ul");
            formatsAudio.className = "formatsAudio";
            newItem.appendChild(formatsAudio);

            const textOthers = document.createElement("div");
            textOthers.textContent = "Others";
            textOthers.style.fontSize = "90%";
            newItem.appendChild(textOthers);

            const formatsOthers = document.createElement("ul");
            formatsOthers.className = "formatsOthers";
            newItem.appendChild(formatsOthers);

            for (let f of item.formats) {
                const format = document.createElement("li");
                format.className = "format";
                newItem.appendChild(format);

                const idF = document.createElement("input");
                idF.type = "button";
                idF.className = "format_id";
                idF.value = f.format_id;
                format.appendChild(idF);

                const extF = document.createElement("span");
                extF.className = "ext";
                extF.textContent = f.ext;
                format.appendChild(extF);

                const sizeF = f.width != null ? document.createElement("span") : null;
                if (sizeF != null) {
                    sizeF.className = "size";
                    sizeF.textContent = f.width + "x" + f.height;
                    format.appendChild(sizeF);
                }
                const fpsF = f.fps != null ? document.createElement("span") : null;
                if (fpsF != null) {
                    fpsF.className = "fps";
                    fpsF.textContent = f.fps + "fps";
                    format.appendChild(fpsF);
                }
                const abrF = f.abr != null ? document.createElement("span") : null;
                if (abrF != null) {
                    abrF.className = "abr";
                    abrF.textContent = f.abr + "kbps";
                    format.appendChild(abrF);
                }

                if (sizeF != null && fpsF != null && abrF == null) {
                    idF.className += " video";
                    formatsVideo.appendChild(format);
                }
                else if (sizeF == null && fpsF == null && abrF != null) {
                    formatsAudio.appendChild(format);
                }
                else {
                    formatsOthers.appendChild(format);
                }
            }
        }
        ul.appendChild(newItem);


        filename.style.border = "1.5px solid blue";
        filename.addEventListener("change", e => item._filename = e.target.value);
        console.log(progresss[item.webpage_url + item.key]);
        if (progresss == null || progresss[item.webpage_url + item.key] == null || progresss[item.webpage_url + item.key].isDownloading != "Download" || progresss[item.webpage_url + item.key].isDownloading != "Wait") {
            download.addEventListener("contextmenu", e => e.preventDefault());
            download.addEventListener("mousedown", Download);
        }

        revert.addEventListener("click", () => {
            ul.getElementsByClassName("addO")[0].checked = false;
            filename.style.border = "";
            filename.value = item.option??"";
            item._filename = item.option??"";
        });
        const format_ids = ul.getElementsByClassName("format_id");
        for (let format_id of format_ids) {
            format_id.addEventListener("click", e => { ul.getElementsByClassName("inputSelectFormat")[0].value += ((format_id.classList.contains("video")) ? (format_id.value + "+") : format_id.value); });
        }

        addO.addEventListener("change", () => {
            if (addO.checked) {
                filename.style.border = "1.5px solid blue";
            } else {
                filename.style.border = "";
            }
        })
    }

    const SetProgress = () => {
        ul.textContent = "";
        let keys;
        if (progresss == null || (keys = Object.keys(progresss)).length == 0) {
            const message = document.createElement("div");
            message.className = "message";
            message.textContent = "Not Downloaded.";
            ul.appendChild(message);
            return;
        }
        //console.log(progresss);
        for (var key of keys) {
            const p = progresss[key];
            //console.log(p);

            const newItem = document.createElement("li");
            newItem.className = "item";
            newItem.style.width = "400px";
            ul.appendChild(newItem);


            const textDir = document.createElement("output");
            textDir.style.fontSize = "80%";
            textDir.style.flexBasis = "5px";
            textDir.style.wordWrap = "break-word";
            textDir.value = p.messageToSend?.dir + "\\" ?? "";
            newItem.appendChild(textDir);
            newItem.appendChild(document.createElement("br"));



            const textName = document.createElement("output");
            textName.style.fontSize = "90%";
            textName.value = p.json._filename;
            newItem.appendChild(textName);

            const flexBoxParent = document.createElement("div");
            flexBoxParent.style.display = "flex";
            newItem.appendChild(flexBoxParent);

            const progress = document.createElement("progress");
            progress.max = 100;
            progress.value = p.percent != null ? p.percent : 0;
            progress.style.width = "80%";
            flexBoxParent.appendChild(progress);

            const toggle = document.createElement("input");
            toggle.value = (p.isDownloading == "Download" || p.isDownloading == "Wait") ? "Stop" : "Download";
            toggle.type = "button";
            flexBoxParent.appendChild(toggle);
            toggle.addEventListener("click", () => {
                if (p.isDownloading == "Download" || p.isDownloading == "Wait") {
                    browser.runtime.sendMessage({ stopDownload: true, progress: p });
                } else {
                    browser.runtime.sendMessage({ restartDownload: true, progress: p });
                }
            });

            const textInfo = document.createElement("div");
            textInfo.style.fontSize = "90%";
            newItem.appendChild(textInfo);
            if (p.isDownloading == "Download") {
                textInfo.textContent = `${p.percent}% of ${p.size} at ${p.speed} ETA ${p.ETA}`;
            } else {
                textInfo.textContent = p.isDownloading;

            }
        }
    }


    const Download = async (e) => {
        const inputSelectFormat = ul.getElementsByClassName("inputSelectFormat")[0];

        const selectFormat = inputSelectFormat != null ? inputSelectFormat.value : null;//inputSelectFormat.valueがnullならキャンセル
        if (selectFormat == "") {
            browser.runtime.sendMessage({
                noticeDownloadStatus: true,
                res: item,
                showExplorerLink: false,
                title: "No format selected",
                message: item._filename
            });
            return;
        }
        const option = await browser.storage.local.get();
        const filename = ul.getElementsByClassName("filename")[0].value;

        item.downloadFilename = ul.getElementsByClassName("addO")[0].checked ? "-o \"" + filename + "\"" : filename;
        const download = document.getElementsByClassName("download")[0];
        download.value = "Downloading...";
        download.removeEventListener("mousedown", Download);

        if (option.mainDownloadDirectory == null || option.subDownloadDirectory == null) {
            const userName = await browser.runtime.sendMessage({ isGetUserPofile: true });
            if (option.mainDownloadDirectory == null)
                option.mainDownloadDirectory = userName+"\\Downloads";
            if (option.subDownloadDirectory == null)
                option.subDownloadDirectory = userName+"\\Videos";
        }
        try {
            // console.log(url)
            if (e.which != 2) {
                browser.runtime.sendMessage({
                    isDownload: true,
                    json: item,
                    selectFormat: selectFormat,
                    downloadDirectory: (e.which == 1 ? option.mainDownloadDirectory : option.subDownloadDirectory)
                });
                return;
            }
            browser.runtime.sendMessage({
                isDownload: true,
                json: item,
                selectFormat: selectFormat,
                initialDir: option.mainDownloadDirectory
            });
        } catch (err) {
            console.error(err);
            console.error(e);
        }
    }


    const option = await browser.storage.local.get();
    option.selectedPreset = option.selectedPreset != null ? option.selectedPreset : "Default";
    let savePreset = option.selectedPreset;
    const selectPreset = document.getElementById("selectPreset");
    const saveSelectedPreset = document.getElementById("saveSelectedPreset");

    const AddSelectOption = (key) => {
        const o = document.createElement("option");
        o.textContent = key;
        o.value = key;
        selectPreset.add(o);
    }

    if (option.preset != null) {
        for (let key of Object.keys(option.preset)) {
            AddSelectOption(key);
        }
        const e = selectPreset.querySelector(`[value = '${option.selectedPreset}']`);
        if (e != null)
            e.selected = true;
    } else {
        await browser.storage.local.set({
            preset: {
                Default: { filename: "", output: "", option: "", isShareJson: true }
            },
            selectedPreset: "Default"
        });
        option.preset = {
            Default: { filename: "", output: "", option: "", isShareJson: true }
        };
        option.selectedPreset = "Default";
        AddSelectOption("Default");
    }

    const GetJson = (isCacheRefresh) => {
        const url = item != null ? item.webpage_url : null;

        const message = {
            isGetJson: true,
            url: url,
            key: selectPreset.value,
            isCacheRefresh: isCacheRefresh
        };
        browser.runtime.sendMessage(message);
    }

    //�v���Z�b�g�`�F���W
    selectPreset.addEventListener("change", async () => {
        option.selectedPreset = selectPreset.value;
        browser.storage.local.set({
            selectedPreset: option.selectedPreset
        });
        GetJson(false);
    });
    //�Z�[�u�v���Z�b�g�N���b�N
    saveSelectedPreset.addEventListener("click", () => {
        savePreset = option.selectedPreset;
    });
    //�X�g�b�v�I�[���_�E�����[�h�N���b�N
    document.getElementById("stopDownload").addEventListener("click", () => {
        browser.runtime.sendMessage({ isStopDownloadAll: true });
    });
    //�L���b�V���N���A�[�N���b�N
    document.getElementById("cacheRefresh").addEventListener("click", () => {
        GetJson(true);
        ul.innerHTML = "";
    });
    document.getElementById("switch").addEventListener("click", () => {
        ul.textContent = "";
        switchProgressFlag = !switchProgressFlag;
        browser.runtime.sendMessage({ switchProgressFlag: switchProgressFlag });

        if (switchProgressFlag) {
            SetProgress();
        } else {
            SetItem();
        }
    });
    //�A�����[�h
    window.onunload = () => {
        browser.runtime.sendMessage({ isClose: true, selectedPreset: savePreset });
    }

    browser.runtime.sendMessage({ isOpen: true });
});
