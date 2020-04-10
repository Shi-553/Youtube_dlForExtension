const main = () => {
    const setMainDownloadDirectory = document.getElementById("setMainDownloadDirectory"),
        setSubDownloadDirectory = document.getElementById("setSubDownloadDirectory"),
        setIsDisableHealthyNotification = document.getElementById("setIsDisableHealthyNotification"),
        addOption = document.getElementById("addOption"),
        selectPreset = document.getElementById("selectPreset"),
        selectedPreset = document.getElementById("selectedPreset"),
        savePreset = document.getElementById("savePreset"),
        deletePreset = document.getElementById("deletePreset"),
        setAddOption = document.getElementById("setAddOption"),
        setUrls = document.getElementById("setUrls"),
        setOutputOption = document.getElementById("setOutputOption"),
        setFilenameOption = document.getElementById("setFilenameOption"),
        setOverwrite = document.getElementById("setOverwrite"),
        setBackgroundImage = document.getElementById("setBackgroundImage"),
        resetBackgroundImage = document.getElementById("resetBackgroundImage"),
        preview = document.getElementById("preview"),
        setSimultaneous = document.getElementById("setSimultaneous"),
        setHowToCount = document.getElementById("setHowToCount"),
        setIsAutoRetry = document.getElementById("setIsAutoRetry"),
        setIsShareJson = document.getElementById("setIsShareJson");


    const changeSelectPreset = async option => {
        if (option == null)
            option = await browser.storage.local.get();
        selectedPreset.value = selectPreset.value;
        if (option.preset[selectedPreset.value] == null)
            option.preset[selectedPreset.value] = {};
        setIsShareJson.checked = option.preset[selectPreset.value].isShareJson != null ? option.preset[selectPreset.value].isShareJson : true;
        setAddOption.value = option.preset[selectPreset.value].option;
        setOutputOption.value = option.preset[selectPreset.value].output;
        setFilenameOption.value = option.preset[selectPreset.value].filename;
        addOption.textContent = setFilenameOption.value + " " + setOutputOption.value + " " + setAddOption.value;
        browser.storage.local.set({
            selectedPreset: selectPreset.value
        });
    }
    (async () => {
        const option = await browser.storage.local.get();
        //console.log(option);

        if (option.mainDownloadDirectory != null)
            setMainDownloadDirectory.value = option.mainDownloadDirectory;

        if (option.subDownloadDirectory != null)
            setSubDownloadDirectory.value = option.subDownloadDirectory;

        if (option.isDisableHealthyNotification != null)
            setIsDisableHealthyNotification.checked = option.isDisableHealthyNotification;

        if (option.overwrite != null)
            setOverwrite.value = option.overwrite;

        if (option.simultaneous != null)
            setSimultaneous.value = option.simultaneous.toString();

        if (option.howToCount != null)
            setHowToCount.value = option.howToCount;

        if (option.isAutoRetry != null)
            setIsAutoRetry.checked = option.isAutoRetry;

        setBackgroundImage.style.opacity = 0;
        if (option.backgroundImageFile != null)
            preview.textContent = option.backgroundImageFile.name;

        if (option.setUrls != null)
            setUrls.value = option.setUrls;
        // console.log(option)
        if (option.selectedPreset != null && option.preset != null && option.preset.Default != null && option.preset[option.selectedPreset].output != null && option.preset[option.selectedPreset].option != null) {
            for (let key of Object.keys(option.preset)) {
                AddSelectOption(key);
            }
            const e = selectPreset.querySelector(`[value = '${option.selectedPreset}']`);
            if (e != null)
                e.selected = true;
            changeSelectPreset(option);

        } else {
            browser.storage.local.set({
                preset: {
                    Default: { filename: "", output: "", option: "", isShareJson: true }
                },
                selectedPreset: "Default"
            });
            AddSelectOption("Default");
        }
    })();
    const AddSelectOption = (key) => {
        const o = document.createElement("option");
        o.textContent = key;
        o.value = key;
        selectPreset.add(o);
    }

    (async() => {
        const userProfile = await myscript.PostMessage(port, { isGetUserProfile: true });
        if (userProfile == null)
            return;


        if (setMainDownloadDirectory.value == "")
            setMainDownloadDirectory.value = userProfile + "\\Downloads";
        if (setSubDownloadDirectory.value == "")
            setSubDownloadDirectory.value = userProfile + "\\Videos";


        const mainDownloadDirectoryUpdate = () => {
            if (setMainDownloadDirectory.value == "")
                setMainDownloadDirectory.value = userProfile + "\\Downloads";
            browser.storage.local.set({ mainDownloadDirectory: setMainDownloadDirectory.value });
        }

        setMainDownloadDirectory.addEventListener("change", mainDownloadDirectoryUpdate);

        document.getElementById("selectMainDirectory").addEventListener("click", async () => {
            const e = await myscript.PostMessage(port, { isSelectDirectory: true, initialDir: setMainDownloadDirectory.value });

            if (e.selectDirectory == null)
                return;


            if (e.selectDirectory != null) {
                setMainDownloadDirectory.value = e.selectDirectory;
                mainDownloadDirectoryUpdate();
            }

        });


        const subDownloadDirectoryUpdate = () => {
            if (setSubDownloadDirectory.value == "")
                setSubDownloadDirectory.value = userProfile + "\\Videos";
            browser.storage.local.set({ subDownloadDirectory: setSubDownloadDirectory.value });
        }

        setSubDownloadDirectory.addEventListener("change", subDownloadDirectoryUpdate);

        document.getElementById("selectSubDirectory").addEventListener("click", async () => {
            const e = await myscript.PostMessage(port, { isSelectDirectory: true, initialDir: setSubDownloadDirectory.value });

                if (e.selectDirectory == null)
                    return;

                if (e.selectDirectory != null) {
                    setSubDownloadDirectory.value = e.selectDirectory;
                    subDownloadDirectoryUpdate();
                }
        });
    })()

    const SaveBackgroundImage = async (file) => {
        //console.log(file);
        if (file == null)
            return;
        preview.textContent = file.name;
        await browser.storage.local.set({ backgroundImageFile: file });

    }
    resetBackgroundImage.addEventListener("click", async () => {
        preview.textContent = "";
        await browser.storage.local.set({ backgroundImageFile: null });
    });
    setBackgroundImage.addEventListener("change", () => SaveBackgroundImage(setBackgroundImage.files[0]), false);
    setBackgroundImage.addEventListener("dragenter", e => {
        e.stopPropagation();
        e.preventDefault();
    }, false);
    setBackgroundImage.addEventListener("dragover", e => {
        e.stopPropagation();
        e.preventDefault();
    }, false);
    setBackgroundImage.addEventListener("drop", e => SaveBackgroundImage(e.dataTransfer.files[0]), false);

    setIsDisableHealthyNotification.addEventListener("change", () => {
        browser.storage.local.set({ isDisableHealthyNotification: setIsDisableHealthyNotification.checked });
    });


    setUrls.addEventListener("change", async () => {
        await browser.storage.local.set({ urls: setUrls.value.split(",") });
        port.postMessage({
            isUpdateTabListener: true
        });
    });

    setOverwrite.addEventListener("change", () => {
        const overwrite = setOverwrite.value == "Show dialog to select" ? null : setOverwrite.value;
        browser.storage.local.set({ overwrite: overwrite });
    });

    setHowToCount.addEventListener("change", () => {
        browser.storage.local.set({ howToCount: setHowToCount.value });
    });

    setIsAutoRetry.addEventListener("change", () => {
        browser.storage.local.set({ isAutoRetry: setIsAutoRetry.checked });
    });

    setSimultaneous.addEventListener("change", () => {
        if (setSimultaneous.value == "")
            setSimultaneous.value = 2;
        browser.storage.local.set({ simultaneous: parseInt(setSimultaneous.value) });
    });

    selectPreset.addEventListener("change", () => changeSelectPreset());
    selectPreset.addEventListener("focus", () => changeSelectPreset());

    savePreset.addEventListener("click", async () => {
        const option = await browser.storage.local.get();

        addOption.textContent = setFilenameOption.value + " " + setOutputOption.value + " " + setAddOption.value;
        const selectedKey = selectedPreset.value;
        if (option.preset[selectedKey] == null)
            option.preset[selectedKey] = {};

        if (option.preset[selectedKey].isShareJson != setIsShareJson.checked ||
            option.preset[selectedKey].option != setAddOption.value ||
            option.preset[selectedKey].output != setOutputOption.value ||
            option.preset[selectedKey].filename != setFilenameOption.value) {
            port.postMessage({ changePresetValue: true, key: selectedKey, isShareJson: setIsShareJson.checked });
        }

        option.preset[selectedKey].isShareJson = setIsShareJson.checked;
        option.preset[selectedKey].option = setAddOption.value;
        option.preset[selectedKey].output = setOutputOption.value;
        option.preset[selectedKey].filename = setFilenameOption.value;
        selectPreset.textContent = null;

        for (let key of Object.keys(option.preset)) {
            const o = document.createElement("option");
            o.value = key;
            o.textContent = key;
            if (key == selectedKey)
                o.selected = true;
            selectPreset.appendChild(o);
        }
        browser.storage.local.set({
            preset: option.preset,
            selectedPreset: selectedKey
        });
    });

    //�v���Z�b�g�����{�^��
    deletePreset.addEventListener("click", async () => {
        const option = await browser.storage.local.get();
        //�f�t�H���g���������Ƃ��Ă���l�𖳂��ɂ��ĕۑ�
        if (selectedPreset.value == "Default") {
            option.preset[selectedPreset.value].option = "";
            option.preset[selectedPreset.value].output = "";
            option.preset[selectedPreset.value].filename = "";
            await browser.storage.local.set({
                preset: option.preset,
                selectedPreset: selectedPreset.value
            });
            changeSelectPreset(option);
            return;
        }
        if (!option.preset.hasOwnProperty(selectedPreset.value))
            return;

        delete option.preset[selectedPreset.value];
        selectPreset.removeChild(selectPreset.querySelector(`[value = '${selectedPreset.value}']`));
        selectPreset.querySelector("[value = 'Default']").selected = true;
        await browser.storage.local.set({
            preset: option.preset,
            selectedPreset: selectedPreset.value
        });
        changeSelectPreset(option);
    });
}

const port = browser.runtime.connect("Youtube_dlForExtension@SHi", { name: "options" });

window.addEventListener("DOMContentLoaded", async () => {
    const onMessage = e => {
        if (e.message == "Init") {
            document.getElementById("message").textContent = "Initializing...";
            document.getElementById("main").style.display = "None";

        } else {
            document.getElementById("message").textContent = "";
            document.getElementById("main").style.display = "block";

            port.onMessage.removeListener(onMessage);
            main();

        }

    }
    port.onMessage.addListener(onMessage);
    myscript.PostMessage(port, { isGetInitStatus: true });
});