
(async () => {

    const option = await browser.storage.local.get();


        const img = document.createElement("img");
        img.style.position = "fixed";
        img.style.top = 0;
        img.style.left = 0;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.zIndex = "-1";
    document.body.appendChild(img);

    if (option.backgroundImageFile != null) {


        img.style.backgroundBlendMode = "screen";

        img.style.backgroundSize = "cover";
        img.style.backgroundImage = `url('${URL.createObjectURL(option.backgroundImageFile)}')`;
    } else {

        img.style.backgroundColor="rgba(220, 220, 220, 1)";
    }
})()