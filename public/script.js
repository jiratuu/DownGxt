const urlInput =
    document.getElementById("urlInput");

const analyzeBtn =
    document.getElementById("analyzeBtn");

const analyzeText =
    document.getElementById("analyzeText");

const clearBtn =
    document.getElementById("clearBtn");

const errorBox =
    document.getElementById("error");

const loading =
    document.getElementById("loading");

const loadingText =
    document.getElementById("loadingText");

const result =
    document.getElementById("result");

const thumbnail =
    document.getElementById("thumbnail");

const title =
    document.getElementById("title");

const uploader =
    document.getElementById("uploader");

const duration =
    document.getElementById("duration");

const downloadBtn =
    document.getElementById("downloadBtn");

const downloadText =
    document.getElementById("downloadText");

const quality =
    document.getElementById("quality");

const qualityContainer =
    document.getElementById("qualityContainer");


let currentUrl = "";

let selectedFormat = "mp4";


/* ==========================================
   ERREURS
========================================== */

function showError(message) {

    errorBox.textContent = message;

    errorBox.classList.add("visible");

}

function hideError() {

    errorBox.textContent = "";

    errorBox.classList.remove("visible");

}


/* ==========================================
   DUREE
========================================== */

function formatDuration(seconds) {

    if (!seconds) {
        return "00:00";
    }

    seconds =
        Math.floor(
            Number(seconds)
        );


    const hours =
        Math.floor(
            seconds / 3600
        );


    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );


    const secs =
        seconds % 60;


    if (hours > 0) {

        return (
            hours +
            ":" +
            String(minutes).padStart(2, "0") +
            ":" +
            String(secs).padStart(2, "0")
        );

    }


    return (
        minutes +
        ":" +
        String(secs).padStart(2, "0")
    );

}


/* ==========================================
   ANALYSE
========================================== */

async function analyzeVideo() {

    const url =
        urlInput.value.trim();


    hideError();

    result.classList.add(
        "hidden"
    );


    if (!url) {

        showError(
            "Colle un lien YouTube pour commencer."
        );

        return;
    }


    if (
        !url.includes("youtube.com") &&
        !url.includes("youtu.be")
    ) {

        showError(
            "Ce lien ne semble pas être un lien YouTube."
        );

        return;
    }


    currentUrl = url;


    analyzeBtn.disabled = true;

    analyzeText.textContent =
        "Analyse...";


    loading.classList.remove(
        "hidden"
    );


    loadingText.textContent =
        "Récupération des informations...";


    try {

        const response =
            await fetch(
                "/api/info",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        url: url
                    })
                }
            );


        const text =
            await response.text();


        let data;


        try {

            data =
                JSON.parse(text);

        } catch {

            throw new Error(
                text ||
                "Réponse invalide du serveur."
            );

        }


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Impossible d'analyser la vidéo."
            );

        }


        loadingText.textContent =
            "Vidéo trouvée.";


        thumbnail.src =
            data.thumbnail || "";


        title.textContent =
            data.title ||
            "Vidéo sans titre";


        uploader.textContent =
            data.uploader ||
            "Chaîne inconnue";


        duration.textContent =
            formatDuration(
                data.duration
            );


        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    180
                )
        );


        loading.classList.add(
            "hidden"
        );


        result.classList.remove(
            "hidden"
        );


        setTimeout(
            function() {

                result.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest"
                });

            },
            100
        );


    } catch (error) {

        console.error(
            "[DownGxt]",
            error
        );


        loading.classList.add(
            "hidden"
        );


        showError(
            error.message
        );

    } finally {

        analyzeBtn.disabled = false;

        analyzeText.textContent =
            "Analyser";

    }

}


/* ==========================================
   BOUTON ANALYSER
========================================== */

analyzeBtn.addEventListener(
    "click",
    analyzeVideo
);


/* ==========================================
   ENTREE
========================================== */

urlInput.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key === "Enter"
        ) {

            analyzeVideo();

        }

    }
);


/* ==========================================
   EFFACER
========================================== */

clearBtn.addEventListener(
    "click",
    function() {

        urlInput.value = "";

        currentUrl = "";

        result.classList.add(
            "hidden"
        );

        loading.classList.add(
            "hidden"
        );

        hideError();

        urlInput.focus();

    }
);


/* ==========================================
   FORMATS
========================================== */

document
    .querySelectorAll(".format-option")
    .forEach(
        function(button) {

            button.addEventListener(
                "click",
                function() {

                    document
                        .querySelectorAll(
                            ".format-option"
                        )
                        .forEach(
                            function(item) {

                                item.classList.remove(
                                    "active"
                                );

                            }
                        );


                    button.classList.add(
                        "active"
                    );


                    selectedFormat =
                        button.dataset.format;


                    if (
                        selectedFormat === "mp3"
                    ) {

                        qualityContainer.style.display =
                            "none";

                    } else {

                        qualityContainer.style.display =
                            "block";

                    }

                }
            );

        }
    );


/* ==========================================
   TELECHARGEMENT
========================================== */

downloadBtn.addEventListener(
    "click",
    downloadVideo
);


async function downloadVideo() {

    if (!currentUrl) {

        showError(
            "Analyse une vidéo avant de la télécharger."
        );

        return;
    }


    hideError();


    downloadBtn.disabled = true;

    downloadText.textContent =
        "Préparation...";


    try {

        const params =
            new URLSearchParams();


        params.set(
            "url",
            currentUrl
        );


        params.set(
            "format",
            selectedFormat
        );


        params.set(
            "quality",
            quality.value
        );


        const response =
            await fetch(
                "/api/download?" +
                params.toString()
            );


        if (!response.ok) {

            const message =
                await response.text();


            throw new Error(
                message ||
                "Le téléchargement a échoué."
            );

        }


        downloadText.textContent =
            "Téléchargement...";


        const blob =
            await response.blob();


        const blobUrl =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href =
            blobUrl;


        link.download =
            selectedFormat === "mp3"
                ? "DownGxt-Audio.mp3"
                : "DownGxt-Video.mp4";


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        setTimeout(
            function() {

                URL.revokeObjectURL(
                    blobUrl
                );

            },
            1000
        );


        downloadText.textContent =
            "Téléchargé";


        setTimeout(
            function() {

                downloadText.textContent =
                    "Télécharger";

            },
            1800
        );


    } catch (error) {

        console.error(
            "[DownGxt Download]",
            error
        );


        showError(
            error.message
        );


        downloadText.textContent =
            "Télécharger";

    } finally {

        downloadBtn.disabled = false;

    }

}


/* ==========================================
   INITIALISATION
========================================== */

console.log(
    "[DownGxt] Interface chargée."
);
