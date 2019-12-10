/*
 *browser.storage.local.get()={
 * mainDownloadDirectory:string,
 * subDownloadDirectory:string,
 * isDisableHealthyNotification:bool,
 * presets:{
 *  string:string
 *  }
 * }
 * */

const setMainDownloadDirectory = document.getElementById("setMainDownloadDirectory"),
    setSubDownloadDirectory = document.getElementById("setSubDownloadDirectory"),
    setDisableHealthyNotification = document.getElementById("setDisableHealthyNotification"),
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
    preview = document.getElementById("preview");


const changeSelectPreset = async option => {
    if (option == null)
        option = await browser.storage.local.get();
    selectedPreset.value = selectPreset.value;
    if (option.preset[selectedPreset.value] == null)
        option.preset[selectedPreset.value] = {};
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
        setDisableHealthyNotification.checked = option.isDisableHealthyNotification;

    if (option.isOverwrite)
        setOverwrite.value = option.isOverwrite;

    setBackgroundImage.style.opacity = 0;
    if (option.backgroundImageFile != null)
        preview.textContent=option.backgroundImageFile.name;

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
                Default: { filename: "", output: "", option: "" }
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

const mainDownloadDirectoryUpdate=() => {
    if (setMainDownloadDirectory.value == "")
        setMainDownloadDirectory.value = "<USERPROFILE>\\\\Downloads";
    setMainDownloadDirectory.value = setMainDownloadDirectory.value.replace(/\\+/g, "\\\\");
    browser.storage.local.set({ mainDownloadDirectory: setMainDownloadDirectory.value });
}
setMainDownloadDirectory.addEventListener("change", mainDownloadDirectoryUpdate);

document.getElementById("selectMainDirectory").addEventListener("click", async () => {
    const dir = await browser.runtime.sendMessage({ isSelectDirectory: true, initialDir: setMainDownloadDirectory.value });
    if (dir != null) {
        setMainDownloadDirectory.value = dir;
        mainDownloadDirectoryUpdate();
    }
});
const subDownloadDirectoryUpdate= () => {
    if (setSubDownloadDirectory.value == "")
        setSubDownloadDirectory.value = "<USERPROFILE>\\\\Videos";
    setSubDownloadDirectory.value = setSubDownloadDirectory.value.replace(/\\+/g, "\\\\");
    browser.storage.local.set({ subDownloadDirectory: setSubDownloadDirectory.value });
}

setSubDownloadDirectory.addEventListener("change", subDownloadDirectoryUpdate);

document.getElementById("selectSubDirectory").addEventListener("click", async () => {
    const dir = await browser.runtime.sendMessage({ isSelectDirectory: true, initialDir: setSubDownloadDirectory.value });
    if (dir != null) {
        setSubDownloadDirectory.value = dir;
        subDownloadDirectoryUpdate();
    }
});

const SaveBackgroundImage =async (file) => {
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
setBackgroundImage.addEventListener("change",()=> SaveBackgroundImage(setBackgroundImage.files[0]),false);
setBackgroundImage.addEventListener("dragenter", e => {
    e.stopPropagation();
    e.preventDefault();
}, false);
setBackgroundImage.addEventListener("dragover", e => {
    e.stopPropagation();
    e.preventDefault();
}, false);
setBackgroundImage.addEventListener("drop", e => SaveBackgroundImage(e.dataTransfer.files[0]), false);

setDisableHealthyNotification.addEventListener("change", () => {
    browser.storage.local.set({ isDisableHealthyNotification: setDisableHealthyNotification.checked });
});


setUrls.addEventListener("change", async () => {
    await browser.storage.local.set({ urls: setUrls.value.split(",") });
    browser.runtime.sendMessage({
        isUpdateTabListener: true
    });
});

setOverwrite.addEventListener("change", () => {
    const isOverwrite = setOverwrite.value == "Show dialog to select" ? null : setOverwrite.value;
    browser.storage.local.set({ isOverwrite: isOverwrite });
});

selectPreset.addEventListener("change", () => changeSelectPreset());
selectPreset.addEventListener("focus", () => changeSelectPreset());

savePreset.addEventListener("click", async () => {
    const option = await browser.storage.local.get();

    addOption.textContent = setFilenameOption.value + " " + setOutputOption.value + " " + setAddOption.value;
    if (option.preset[selectedPreset.value] == null)
        option.preset[selectedPreset.value] = {};
    option.preset[selectedPreset.value].option = setAddOption.value;
    option.preset[selectedPreset.value].output = setOutputOption.value;
    option.preset[selectedPreset.value].filename = setFilenameOption.value;
    selectPreset.textContent = null;

    for (let key of Object.keys(option.preset)) {
        const o = document.createElement("option");
        o.value = key;
        o.textContent = key;
        if (key == selectedPreset.value)
            o.selected = true;
        selectPreset.appendChild(o);
    }
    browser.storage.local.set({
        preset: option.preset,
        selectedPreset: selectedPreset.value
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

