
(async () => {

    const option = await browser.storage.local.get();

    if (option.backgroundImageFile != null) {
        const html = document.getElementsByTagName("html")[0];
        html.style.background = "none";

        html.style.backgroundBlendMode = "screen";
        //console.log(option.backgroundImageFile);
        html.style.backgroundImage = `url('${URL.createObjectURL (option.backgroundImageFile)}')`;
        html.style.backgroundColor = "rgba(255, 255, 255,0.5)";
    }
})()