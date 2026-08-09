const fs = require("fs");
const path = require("path");
const https = require("https");
const { execFileSync } = require("child_process");

const ROOT = __dirname;
const BIN = path.join(ROOT, "bin");

if (!fs.existsSync(BIN)) {
    fs.mkdirSync(BIN, { recursive: true });
}

const isWindows = process.platform === "win32";

const ytDlpName = isWindows
    ? "yt-dlp.exe"
    : "yt-dlp";

const ytDlpPath = path.join(BIN, ytDlpName);


// =====================================================
// TÉLÉCHARGER UN FICHIER
// =====================================================

function download(url, destination) {

    return new Promise((resolve, reject) => {

        console.log("[SETUP] Téléchargement :");
        console.log(url);

        const file = fs.createWriteStream(destination);

        https.get(url, response => {

            // Redirection GitHub
            if (
                response.statusCode >= 300 &&
                response.statusCode < 400 &&
                response.headers.location
            ) {

                file.close();

                try {
                    fs.unlinkSync(destination);
                } catch {}

                download(
                    response.headers.location,
                    destination
                )
                .then(resolve)
                .catch(reject);

                return;
            }

            if (response.statusCode !== 200) {

                file.close();

                try {
                    fs.unlinkSync(destination);
                } catch {}

                reject(
                    new Error(
                        "HTTP " +
                        response.statusCode
                    )
                );

                return;
            }

            response.pipe(file);

            file.on(
                "finish",
                () => {

                    file.close();

                    resolve();

                }
            );

        }).on(
            "error",
            error => {

                file.close();

                try {
                    fs.unlinkSync(destination);
                } catch {}

                reject(error);

            }
        );

    });

}


// =====================================================
// YT-DLP
// =====================================================

async function installYTDLP() {

    if (fs.existsSync(ytDlpPath)) {

        console.log(
            "[SETUP] yt-dlp existe déjà."
        );

        return;

    }


    const url = isWindows
        ? "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
        : "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";


    await download(
        url,
        ytDlpPath
    );


    if (!isWindows) {

        fs.chmodSync(
            ytDlpPath,
            0o755
        );

    }


    console.log(
        "[SETUP] yt-dlp installé :",
        ytDlpPath
    );


    // Vérification
    try {

        const version =
            execFileSync(
                ytDlpPath,
                ["--version"],
                {
                    encoding: "utf8"
                }
            );

        console.log(
            "[SETUP] yt-dlp version :",
            version.trim()
        );

    } catch (error) {

        console.error(
            "[SETUP] yt-dlp ne fonctionne pas."
        );

        console.error(
            error.message
        );

        process.exit(1);

    }

}


// =====================================================
// START
// =====================================================

installYTDLP()
    .then(() => {

        console.log("");
        console.log(
            "======================================"
        );
        console.log(
            "        SETUP TERMINÉ"
        );
        console.log(
            "======================================"
        );
        console.log("");

    })
    .catch(error => {

        console.error(
            "[SETUP ERROR]",
            error.message
        );

        process.exit(1);

    });