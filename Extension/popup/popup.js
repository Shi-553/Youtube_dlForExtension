
    let switchProgressFlag = false;
browser.runtime.sendMessage({ isOpen: true });

window.addEventListener("load", async () => {

    const ul = document.getElementById("list");
    let item=null, progresss=null;
    //�o�b�N�O���E���h����
    browser.runtime.onMessage.addListener(e => {
        if (e.message === "Progress") {
            progresss = e.progresss;
            if (e.switchProgressFlag != null)
                switchProgressFlag = e.switchProgressFlag;

            if (switchProgressFlag)
                SetProgress();
            return;
        }
        item = e;
        //console.log(e);
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

        const message = document.createElement("div");
        message.className = "message";

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

        ul.textContent = "";
        const newItem = document.createElement("li");
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
        download.value = "Main/Select/Sub";
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
        const abr = item.abr != null ? document.createElement("span") :null;
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

                const extF = document.createElement("span") ;
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

        const downloads = ul.getElementsByClassName("download");
        for (let download of downloads) {
            download.addEventListener("contextmenu", e => e.preventDefault());
            download.addEventListener("mousedown", Download);
        }

        revert.addEventListener("click", () => {
            ul.getElementsByClassName("addO")[0].checked = false;
            filename.style.border = "";
            filename.value = item.option;
            item._filename = item.option;
        });
        const format_ids = ul.getElementsByClassName("format_id");
        for (let format_id of format_ids) {
            format_id.addEventListener("click", e => { ul.getElementsByClassName("inputSelectFormat")[0].value += ((format_id.classList.contains("video")) ? (format_id.value + "+") : format_id.value); });
        }

        addO.addEventListener("change", () => {
            if (addO.checked) {
                filename.style.border = "1.5px solid blue";
            }else{
                filename.style.border = "";
            }
        })
    }

    const Download = async (e) => {
        const option = await browser.storage.local.get();
        const filename = ul.getElementsByClassName("filename")[0].value;

        item._filename = ul.getElementsByClassName("addO")[0].checked ? "-o \"" + filename + "\"" : filename;
        if (option.mainDownloadDirectory == null)
            option.mainDownloadDirectory = "<USERPROFILE>\\\\Downloads";
        if (option.subDownloadDirectory == null)
            option.subDownloadDirectory = "<USERPROFILE>\\\\Videos";

        const inputSelectFormat = ul.getElementsByClassName("inputSelectFormat")[0];

        const selectFormat = inputSelectFormat != null ? " -f " + inputSelectFormat.value + "" : null;
        try {
            // console.log(url)
            if (e.which != 2) {
                browser.runtime.sendMessage({
                    json: item,
                    selectFormat: selectFormat,
                    downloadDirectory: (e.which == 1 ? option.mainDownloadDirectory : option.subDownloadDirectory)
                });
                return;
            }
            browser.runtime.sendMessage({
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
    const selectPreset = document.getElementById("selectPreset");
    const saveSelectedPreset = document.getElementById("saveSelectedPreset");

    const AddSelectOption = (key) => {
        const o = document.createElement("option");
        o.textContent = key;
        o.value = key;
        selectPreset.add(o);
    }

    const changeSelectPreset = () => {
        option.selectedPreset = selectPreset.value;
        return browser.storage.local.set({
            selectedPreset: selectPreset.value
        });
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
                Default: { filename: "", output: "", option: "" }
            },
            selectedPreset: "Default"
        });
        option.preset = {
            Default: { filename: "", output: "", option: "" }
        };
        option.selectedPreset = "Default";
        AddSelectOption("Default");
    }

    const GetJson = (isCacheRefresh) => {
        const url = item != null ? item.webpage_url : null;

        const message = {
            isGetJson: true,
            url: url,
            outputOption: option.preset[selectPreset.value].filename + " " + option.preset[selectPreset.value].output,
            isCacheRefresh: isCacheRefresh
        };
        browser.runtime.sendMessage(message);
    }

    let savedPreset = option.selectedPreset != null ? option.selectedPreset : "Default";
    //�v���Z�b�g�`�F���W
    selectPreset.addEventListener("change", async () => {
        await changeSelectPreset();
        GetJson(false);
    });
    //�Z�[�u�v���Z�b�g�N���b�N
    saveSelectedPreset.addEventListener("click", () => { changeSelectPreset(); savedPreset = selectPreset.value; });
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
        if (!switchProgressFlag) {
            switchProgressFlag = true;
            SetProgress();
        } else {
            switchProgressFlag = false;
            SetItem();
        }
    });
    const SetProgress = () => {
        ul.textContent = "";
        const keys =Object.keys(progresss);
        if (progresss == null || keys.length==0) {
            const message = document.createElement("div");
            message.className = "message";
            message.textContent = "Not Downloaded.";
            ul.appendChild(message);
            return;
        }
        //console.log(keys);
        for (var key of keys) {
            const p = progresss[key];

            const newItem = document.createElement("li");
            newItem.className = "item";
            ul.appendChild(newItem);

            const textName = document.createElement("div");
            // textName.style.fontSize = "90%";
            textName.textContent = p.name;
            newItem.appendChild(textName);

            const textInfo = document.createElement("div");
            // textName.style.fontSize = "90%";
            textInfo.textContent = `${p.percent} of ${p.size} at ${p.speed} ETA ${p.ETA}`;
            newItem.appendChild(textInfo);
        }
    }
    //�A�����[�h
    window.onunload = () => {
        if (savedPreset != null)
            browser.runtime.sendMessage({ isClose: true, savedPreset: savedPreset, switchProgressFlag: switchProgressFlag });
    }
});
